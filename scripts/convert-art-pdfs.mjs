import { readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "..", "data", "Art Portfolio");
const OUTPUT_DIR = path.join(SOURCE_DIR, "converted");
const DENSITY_SCALE = 200 / 72; // ~200 DPI (pdf.js default viewport is 72 DPI)

// Some source PDFs don't carry a correct /Rotate flag, so pdf.js renders
// them sideways. Degrees are clockwise, applied after rendering.
const ROTATION_OVERRIDES = {
  "Tranh 5 - Cố đô hoài niệm": -90,
  "Tranh 9 - Góc phố bình yên": -90,
};

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

async function convertPdf(filePath, baseName) {
  const data = new Uint8Array(await (await import("node:fs/promises")).readFile(filePath));
  const loadingTask = pdfjsLib.getDocument({
    data,
    canvasFactory: new NodeCanvasFactory(),
  });
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: DENSITY_SCALE });

  const canvasFactory = new NodeCanvasFactory();
  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

  await page.render({
    canvasContext: canvasAndContext.context,
    viewport,
    canvasFactory,
  }).promise;

  const pngBuffer = canvasAndContext.canvas.toBuffer("image/png");

  const jpgPath = path.join(OUTPUT_DIR, `${baseName}.jpg`);
  let pipeline = sharp(pngBuffer);
  if (ROTATION_OVERRIDES[baseName]) {
    pipeline = pipeline.rotate(ROTATION_OVERRIDES[baseName]);
  }
  await pipeline.jpeg({ quality: 90 }).toFile(jpgPath);

  page.cleanup();

  return { jpgPath };
}

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const pdfFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"));

  if (pdfFiles.length === 0) {
    console.log("No PDF files found in", SOURCE_DIR);
    return;
  }

  for (const entry of pdfFiles) {
    const baseName = path.basename(entry.name, path.extname(entry.name));
    const jpgOut = path.join(OUTPUT_DIR, `${baseName}.jpg`);

    if (existsSync(jpgOut)) {
      console.log(`SKIP (already converted): ${entry.name}`);
      continue;
    }

    const filePath = path.join(SOURCE_DIR, entry.name);
    process.stdout.write(`Converting: ${entry.name} ... `);
    try {
      const { jpgPath } = await convertPdf(filePath, baseName);
      console.log(`OK\n  -> ${jpgPath}`);
    } catch (err) {
      console.log("FAILED");
      console.error(err);
    }
  }
}

main();
