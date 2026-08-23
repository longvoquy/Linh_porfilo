/**
 * Uploads the local Awards & Honors folders to Cloudinary.
 *
 *   node scripts/upload-awards-to-cloudinary.mjs
 *
 * Layout produced — folder = award, files inside = that award's gallery:
 *
 *   portfolio/awards/<slug>/               photos, discovered by the site
 *   portfolio/awards/<slug>/certificates/  PDFs, excluded from the gallery
 *
 * The site lists these folders at request time, so re-running this script (or
 * uploading straight from the Cloudinary dashboard) is all that's needed to add
 * images to an award — no URLs are ever pasted into the codebase. Only the few
 * certificate URLs printed at the end go into content/awards/*.json by hand.
 *
 * Videos are skipped: the gallery is images-only for now.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "..", "data", "Awards & Honors");
const CLOUDINARY_ROOT = "portfolio/awards";

/**
 * Local folder name -> Cloudinary slug. Explicit rather than derived, so the
 * slug always matches `cloudinaryFolder` in content/awards/*.json even if a
 * local folder gets renamed.
 */
const AWARD_FOLDERS = {
  "Bebras 2025, 2026": "bebras-2025-2026",
  "Cuộc thi Money maze": "money-maze",
  "Học bổng Nguyễn Siêu": "nguyen-sieu-scholarship",
};

/**
 * "Cuộc thi VEO và Owlypia" holds files for two separate awards (VEO
 * participation, Owlypia medal) that are two separate chapters on the site —
 * so this one local folder maps to slugs per-file rather than 1:1.
 */
function splitAwardSlug(localFolder, fileName) {
  if (localFolder !== "Cuộc thi VEO và Owlypia") return undefined;
  const lower = fileName.toLowerCase();
  if (lower.startsWith("veo")) return "veo";
  if (lower.startsWith("owlypia")) return "owlypia";
  return null; // recognized split folder, but this file doesn't match either award
}

/** Files that intentionally never get uploaded, with the reason why. */
const SKIP_FILES = new Map([
  // 24 MB, over Cloudinary's 10 MB free-plan upload limit. Handle separately if needed.
  ["Cert_Money Maze_The Debate Arena.pdf", "exceeds 10 MB upload limit"],
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
 * Photos go up as `image` so they can be transformed/resized on delivery.
 *
 * Certificates go up as `raw`. Cloudinary blocks delivery of image-type PDFs by
 * default (the "PDF and ZIP files delivery" security restriction returns 401),
 * and raw delivery is not subject to it — so raw is what actually makes a
 * "View certificate" link work without asking the account owner to change
 * security settings. Raw public_ids keep their file extension.
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

  // The split folder isn't in AWARD_FOLDERS (it has no single slug), but its
  // files still need visiting, so read the local directory listing regardless.
  const localFolders = new Set([...Object.keys(AWARD_FOLDERS), "Cuộc thi VEO và Owlypia"]);

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
      if (!isImage && !isDoc) continue; // skips .mp4 and anything else

      if (isImage && certsOnly) continue;

      const slug = splitAwardSlug(localName, entry.name) ?? AWARD_FOLDERS[localName];
      if (slug === null) {
        console.warn(`  ${entry.name} ... SKIPPED (doesn't match veo or owlypia by filename)`);
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
        failures.push({ award: slug, file: entry.name, message });
      }
    }
  }

  console.log(`\n--- Done: ${imageCount} gallery image(s) uploaded ---`);

  if (certificates.length > 0) {
    console.log("\nCertificate URLs (paste into the award's media[] as type \"pdf\"):");
    for (const c of certificates) {
      console.log(`  [${c.slug}] ${c.name}\n    ${c.url}`);
    }
  }

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  [${f.award}] ${f.file}: ${f.message}`);
  }
}

main();
