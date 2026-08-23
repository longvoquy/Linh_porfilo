/**
 * Uploads the local Leadership folders to Cloudinary.
 *
 *   node scripts/upload-leadership-to-cloudinary.mjs
 *
 * "Soccer Varsity" and "Sunrise Project" map 1:1 to a chapter, like the simple
 * folders in upload-awards-to-cloudinary.mjs. "Nguyen Sieu Student Council"
 * holds files for two separate chapters (a music/drama night organizing
 * committee and a spring festival day), so it is split per-file by filename
 * instead — the same technique as the VEO/Owlypia split, applied to one named
 * folder rather than a whole flat directory.
 *
 * "Youngbiz Fest" is empty and is intentionally never referenced below.
 *
 * Layout produced — folder = chapter, files inside = that chapter's gallery:
 *
 *   portfolio/leadership/<slug>/               photos, discovered by the site
 *   portfolio/leadership/<slug>/certificates/  PDFs, excluded from the gallery
 *
 * No file here exceeds Cloudinary's 10 MB upload limit, so unlike the Volunteer
 * uploader this script has no sharp/resize step.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "..", "data", "Leadership");
const CLOUDINARY_ROOT = "portfolio/leadership";

/** Local folder name -> Cloudinary slug, for folders that map 1:1 to a chapter. */
const LEADERSHIP_FOLDERS = {
  "Soccer Varsity": "soccer-varsity",
  "Sunrise Project": "sunrise-project",
};

/** The one local folder whose files belong to two different chapters. */
const STUDENT_COUNCIL_FOLDER = "Nguyen Sieu Student Council";

/** Files that intentionally never get uploaded, with the reason why. */
const SKIP_FILES = new Map([
  // The gallery is images-only for now, matching the Awards uploader.
  ["Bóng đá 2.mp4", "video, gallery is images-only"],
]);

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
 * Routes one Student Council file to its chapter.
 *
 * Matching runs on the *slugified* name rather than the raw Vietnamese one:
 * slugify() strips diacritics to plain ASCII, so this can't be broken by the
 * filesystem handing back NFC- vs NFD-normalised filenames (macOS and Windows
 * differ here), which a literal "HĐHS_Ngày hội..." comparison would be.
 *
 * Returns null for a file that matches neither chapter, so the caller can warn
 * rather than silently uploading it somewhere wrong.
 */
function splitStudentCouncilSlug(fileName) {
  const slug = slugify(path.basename(fileName, path.extname(fileName)));
  if (slug.startsWith("hdhs-ban-to-chuc-dem-nhac-kich")) return "student-council-dem-nhac-kich";
  if (slug.startsWith("hdhs-ngay-hoi-am-ap-mua-xuan")) return "student-council-ngay-hoi-am-ap-mua-xuan";
  return null;
}

/**
 * Photos go up as `image` so they can be transformed/resized on delivery;
 * documents as `raw`. See upload-awards-to-cloudinary.mjs for why raw is
 * required for PDFs on this account.
 */
async function upload(filePath, folder, publicId, isImage) {
  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    overwrite: true,
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

  // `--certs-only` re-uploads just the documents, so fixing a certificate does
  // not mean pushing every photo again.
  const certsOnly = process.argv.includes("--certs-only");

  const certificates = [];
  const failures = [];
  let imageCount = 0;

  // The split folder has no single slug, so it isn't in LEADERSHIP_FOLDERS —
  // but its files still need visiting.
  const localFolders = new Set([...Object.keys(LEADERSHIP_FOLDERS), STUDENT_COUNCIL_FOLDER]);

  for (const localName of localFolders) {
    const dir = path.join(SOURCE_DIR, localName);
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => null);
    if (!entries) {
      console.warn(`! Local folder not found, skipping: ${localName}`);
      continue;
    }

    console.log(`\n=== ${localName} ===`);

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const skipReason = SKIP_FILES.get(entry.name);
      if (skipReason) {
        console.log(`  ${entry.name} ... SKIPPED (${skipReason})`);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      const isImage = IMAGE_EXTS.has(ext);
      const isDoc = DOC_EXTS.has(ext);
      if (!isImage && !isDoc) continue;

      if (isImage && certsOnly) continue;

      const slug =
        localName === STUDENT_COUNCIL_FOLDER
          ? splitStudentCouncilSlug(entry.name)
          : LEADERSHIP_FOLDERS[localName];
      if (!slug) {
        console.warn(`  ${entry.name} ... SKIPPED (matches neither Student Council chapter)`);
        continue;
      }

      const folder = isImage
        ? `${CLOUDINARY_ROOT}/${slug}`
        : `${CLOUDINARY_ROOT}/${slug}/certificates`;
      // Raw assets keep their extension as part of the public_id.
      const publicId = slugify(path.basename(entry.name, ext)) + (isImage ? "" : ext);
      const filePath = path.join(dir, entry.name);

      process.stdout.write(`  ${entry.name} -> ${folder}/${publicId} ... `);
      try {
        const result = await upload(filePath, folder, publicId, isImage);
        console.log("OK");
        if (isImage) imageCount += 1;
        else certificates.push({ slug, name: entry.name, url: result.secure_url });
      } catch (err) {
        const message = err?.message || String(err);
        console.log("FAILED");
        failures.push({ chapter: slug, file: entry.name, message });
      }
    }
  }

  console.log(`\n--- Done: ${imageCount} gallery image(s) uploaded ---`);

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
