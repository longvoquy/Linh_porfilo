import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "..", "data2.0", "4. Art Portfolio");
const CLOUDINARY_FOLDER = "portfolio/art";

// Two HEIC photos whose names differ only by accents, so slugs are explicit.
const FILES = [
  { file: "Tranh ngoi ve tai lop hoc.HEIC", publicId: "tranh-10-ngoi-ve-tai-lop-hoc-1" },
  { file: "Tranh ngồi vẽ tại lớp học.HEIC", publicId: "tranh-11-ngoi-ve-tai-lop-hoc-2" },
];

const env = await readFile(path.join(__dirname, "..", ".env"), "utf-8").catch(() => "");
for (const line of env.split("\n")) {
  const t = line.trim();
  const eq = t.indexOf("=");
  if (!t || t.startsWith("#") || eq === -1) continue;
  const k = t.slice(0, eq).trim();
  if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

for (const { file, publicId } of FILES) {
  const r = await cloudinary.uploader.upload(path.join(SOURCE_DIR, file), {
    folder: CLOUDINARY_FOLDER,
    public_id: publicId,
    overwrite: true,
    resource_type: "image",
    format: "jpg",
  });
  console.log(`${r.public_id} ${r.width}x${r.height} https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/f_auto,q_auto/v${r.version}/${r.public_id}.${r.format}`);
}
