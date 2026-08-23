import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "..", "data", "Art Portfolio");
const CONVERTED_DIR = path.join(SOURCE_DIR, "converted");
const CLOUDINARY_FOLDER = "portfolio/art";

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

async function main() {
  await loadEnv();

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const jpgEntries = (await readdir(SOURCE_DIR, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".jpg"))
    .map((e) => path.join(SOURCE_DIR, e.name));

  const convertedJpgEntries = (await readdir(CONVERTED_DIR, { withFileTypes: true }).catch(() => []))
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".jpg"))
    .map((e) => path.join(CONVERTED_DIR, e.name));

  const filesToUpload = [...jpgEntries, ...convertedJpgEntries];

  if (filesToUpload.length === 0) {
    console.log("No files found to upload.");
    return;
  }

  const results = [];

  for (const filePath of filesToUpload) {
    const baseName = path.basename(filePath, path.extname(filePath));
    const publicId = slugify(baseName);
    process.stdout.write(`Uploading: ${path.basename(filePath)} -> ${CLOUDINARY_FOLDER}/${publicId} ... `);
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: CLOUDINARY_FOLDER,
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      });
      console.log("OK");
      results.push(result);
    } catch (err) {
      console.log("FAILED");
      console.error(err.message || err);
    }
  }

  console.log("\n--- Uploaded assets ---");
  for (const r of results) {
    // Versioned f_auto,q_auto URL: safe to paste into content/*.json — the
    // version segment changes on every overwrite, so browsers/CDN can't
    // serve a stale cached image under the same URL.
    const deliveryUrl = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/f_auto,q_auto/v${r.version}/${r.public_id}.${r.format}`;
    console.log(`public_id: ${r.public_id}`);
    console.log(`  format: ${r.format}  size: ${r.width}x${r.height}`);
    console.log(`  url: ${deliveryUrl}`);
  }
}

main();
