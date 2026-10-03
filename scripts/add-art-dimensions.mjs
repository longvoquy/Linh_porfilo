import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "content", "art-portfolio");

/** Cloudinary answers `fl_getinfo` with the original's pixel size as JSON. */
async function sourceSize(src) {
  const infoUrl = src.replace("/upload/f_auto,q_auto/", "/upload/fl_getinfo/");
  if (infoUrl === src) throw new Error(`Not a Cloudinary f_auto,q_auto URL: ${src}`);
  const res = await fetch(infoUrl);
  if (!res.ok) throw new Error(`${res.status} for ${infoUrl}`);
  const { input } = await res.json();
  return { width: input.width, height: input.height };
}

for (const file of (await readdir(DIR)).filter((f) => f.endsWith(".json"))) {
  const filePath = path.join(DIR, file);
  const item = JSON.parse(await readFile(filePath, "utf8"));
  const image = item.media.find((m) => m.type === "image" && m.src);
  if (!image) continue;
  Object.assign(image, await sourceSize(image.src));
  await writeFile(filePath, JSON.stringify(item, null, 2) + "\n");
  console.log(file, `${image.width}x${image.height}`);
}
