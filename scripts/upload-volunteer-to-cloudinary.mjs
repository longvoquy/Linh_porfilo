/**
 * Uploads the local Volunteer & Philanthropy files to Cloudinary.
 *
 *   node scripts/upload-volunteer-to-cloudinary.mjs
 *
 * Unlike Awards & Honors, this local folder is flat — all files for every
 * volunteer activity sit directly in "data/Volunteer & Philanthropy/" with no
 * per-activity subfolders. Files are routed to a Cloudinary chapter folder by
 * filename prefix (see `splitVolunteerSlug`), the same technique used for the
 * VEO/Owlypia split in the Awards uploader.
 *
 * Layout produced — folder = chapter, files inside = that chapter's gallery:
 *
 *   portfolio/volunteer/<slug>/               photos, discovered by the site
 *   portfolio/volunteer/<slug>/certificates/  PDFs, excluded from the gallery
 *
 * Photos larger than Cloudinary's 10 MB upload limit are downscaled with
 * `sharp` before uploading (max 3000px on the long edge, JPEG q85) — comfortably
 * under the limit and still far above the 1600px the lightbox ever requests.
 * Originals on disk are never modified.
 */
import { readdir, readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "..", "data", "Volunteer & Philanthropy");
const CLOUDINARY_ROOT = "portfolio/volunteer";

/** Cloudinary upload limit on this account/plan; see upload-awards-to-cloudinary.mjs. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const RESIZE_MAX_DIMENSION = 3000;
const RESIZE_QUALITY = 85;

/**
 * Every file lives directly in SOURCE_DIR, so slug assignment is per-file by
 * filename prefix rather than per-subfolder.
 */
function splitVolunteerSlug(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.startsWith("thiện nguyện vĩnh thanh") || lower.startsWith("cert_trẻ mồ côi")) return "vinh-thanh";
  if (lower.startsWith("cert quyên góp")) return "muc-hoa-nguyet-hoa";
  return null;
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const DOC_EXTS = new Set([".pdf"]);

async function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  const content = await readFile(envPath, "utf-8").catch(() => "");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Returns a path to upload from: the original file if it's already under the
 * limit, or a resized JPEG written to `tmpDir` otherwise. Resizing only
 * shrinks (`withoutEnlargement`), so a small photo passes through untouched.
 */
async function preparePhoto(filePath, originalBytes, tmpDir) {
  if (originalBytes <= MAX_UPLOAD_BYTES) return { path: filePath, resized: false };

  const outPath = path.join(tmpDir, `${path.basename(filePath, path.extname(filePath))}.jpg`);
  await sharp(filePath)
    .resize({ width: RESIZE_MAX_DIMENSION, height: RESIZE_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: RESIZE_QUALITY })
    .toFile(outPath);
  return { path: outPath, resized: true };
}

async function upload(filePath, folder, publicId, isImage) {
  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    overwrite: true,
    // Certificates go up as `raw` — see upload-awards-to-cloudinary.mjs for why.
    resource_type: isImage ? "image" : "raw",
  });
}

async function main() {
  await loadEnv();

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("Missing Cloudinary credentials in .env — aborting.");
    process.exitCode = 1;
    return;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  const certsOnly = process.argv.includes("--certs-only");

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true }).catch(() => null);
  if (!entries) {
    console.error(`Local folder not found: ${SOURCE_DIR}`);
    process.exitCode = 1;
    return;
  }

  const tmpDir = await mkdtemp(path.join(tmpdir(), "volunteer-upload-"));
  const certificates = [];
  const failures = [];
  let imageCount = 0;
  let resizedCount = 0;

  try {
    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      const isImage = IMAGE_EXTS.has(ext);
      const isDoc = DOC_EXTS.has(ext);
      if (!isImage && !isDoc) continue;
      if (isImage && certsOnly) continue;

      const slug = splitVolunteerSlug(entry.name);
      if (!slug) {
        console.warn(`  ${entry.name} ... SKIPPED (doesn't match a known chapter by filename)`);
        continue;
      }

      const folder = isImage ? `${CLOUDINARY_ROOT}/${slug}` : `${CLOUDINARY_ROOT}/${slug}/certificates`;
      const publicId = slugify(path.basename(entry.name, ext)) + (isImage ? "" : ext);
      const filePath = path.join(SOURCE_DIR, entry.name);

      let uploadPath = filePath;
      if (isImage) {
        const originalBytes = (await readFile(filePath)).byteLength;
        const prepared = await preparePhoto(filePath, originalBytes, tmpDir);
        uploadPath = prepared.path;
        if (prepared.resized) resizedCount += 1;
      }

      process.stdout.write(`  ${entry.name} -> ${folder}/${publicId}${uploadPath !== filePath ? " (resized)" : ""} ... `);
      try {
        const result = await upload(uploadPath, folder, publicId, isImage);
        console.log("OK");
        if (isImage) imageCount += 1;
        else certificates.push({ slug, name: entry.name, url: result.secure_url });
      } catch (err) {
        const message = err?.message || String(err);
        console.log("FAILED");
        failures.push({ chapter: slug, file: entry.name, message });
      }
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }

  console.log(`\n--- Done: ${imageCount} gallery image(s) uploaded (${resizedCount} resized) ---`);

  if (certificates.length > 0) {
    console.log("\nCertificate URLs (paste into the chapter's media[] as type \"pdf\"):");
    for (const c of certificates) {
      console.log(`  [${c.slug}] ${c.name}\n    ${c.url}`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  [${f.chapter}] ${f.file}: ${f.message}`);
  }
}

main();
