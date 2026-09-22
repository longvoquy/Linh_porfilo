/**
 * Turns the heritage etchings in asset/ into ink-only, transparent WebPs for
 * the Home page corners. Run with: node scripts/prepare-decor.mjs
 *
 * The sources are fully opaque scans on parchment, and that parchment is a
 * different tone from the page's cream, so used as-is they would sit on the
 * page as two visible rectangles. Instead, each pixel's darkness against the
 * paper becomes its alpha and the colour becomes a single sepia ink: the lines
 * and washes survive, the paper disappears, and the page shows through.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "decor");

/** Dark sepia, close to the darkest lines in both sources. */
const INK = { r: 74, g: 58, b: 38 };
/** Darkness below this fraction of the paper-to-ink range is paper grain, dropped. */
const GRAIN_FLOOR = 0.07;
const MAX_WIDTH = 900;
/**
 * Paper tone is estimated per block rather than once for the whole scan: aged
 * paper darkens toward its edges and carries stains, and one global tone
 * turns that vignette into a faint frame around the art.
 */
const BLOCK = 48;
const PAPER_PERCENTILE = 0.95;
/** Clearly-drawn pixels a row or column needs before the crop keeps it. */
const MIN_INK = 6;

/**
 * `fade` names the edges that face into the page. The page corner hides the
 * other two, but any line cut off by an inward edge would end in a hard seam,
 * so those edges fade to nothing over `fadeFraction` of the image.
 */
const JOBS = [
  {
    source: "One Pillar Pagoda..png",
    output: "one-pillar-pagoda.webp",
    fade: { right: 0.2 },
  },
  {
    source: "lotus.png",
    output: "lotus.webp",
    fade: {},
  },
];

function percentile(histogram, total, p) {
  const target = total * p;
  let seen = 0;
  for (let v = 0; v < histogram.length; v++) {
    seen += histogram[v];
    if (seen >= target) return v;
  }
  return histogram.length - 1;
}

const smoothstep = (t) => t * t * (3 - 2 * t);

/**
 * Local paper tone at every pixel: the bright percentile of each block, grown
 * by one block in every direction so a block crowded with ink borrows its
 * neighbours' paper, then bilinearly interpolated so the estimate has no seams.
 */
function paperMap(lum, width, height) {
  const bw = Math.ceil(width / BLOCK);
  const bh = Math.ceil(height / BLOCK);
  const raw = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const values = [];
      for (let y = by * BLOCK; y < Math.min(height, (by + 1) * BLOCK); y++) {
        for (let x = bx * BLOCK; x < Math.min(width, (bx + 1) * BLOCK); x++) {
          values.push(lum[y * width + x]);
        }
      }
      values.sort((a, b) => a - b);
      raw[by * bw + bx] = values[Math.floor((values.length - 1) * PAPER_PERCENTILE)];
    }
  }

  const grown = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = Math.min(bw - 1, Math.max(0, bx + dx));
          const y = Math.min(bh - 1, Math.max(0, by + dy));
          m = Math.max(m, raw[y * bw + x]);
        }
      }
      grown[by * bw + bx] = m;
    }
  }

  const map = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(bh - 1, Math.max(0, (y + 0.5) / BLOCK - 0.5));
    const y0 = Math.floor(gy);
    const y1 = Math.min(bh - 1, y0 + 1);
    const fy = gy - y0;
    for (let x = 0; x < width; x++) {
      const gx = Math.min(bw - 1, Math.max(0, (x + 0.5) / BLOCK - 0.5));
      const x0 = Math.floor(gx);
      const x1 = Math.min(bw - 1, x0 + 1);
      const fx = gx - x0;
      const top = grown[y0 * bw + x0] * (1 - fx) + grown[y0 * bw + x1] * fx;
      const bottom = grown[y1 * bw + x0] * (1 - fx) + grown[y1 * bw + x1] * fx;
      map[y * width + x] = top * (1 - fy) + bottom * fy;
    }
  }
  return map;
}

/** 0 at the edge, 1 once `fraction` of the way in. */
function edgeFade(x, y, width, height, fade) {
  let k = 1;
  const ramp = (distance, fraction) => Math.min(1, distance / fraction);
  if (fade.left) k *= smoothstep(ramp(x / width, fade.left));
  if (fade.right) k *= smoothstep(ramp((width - 1 - x) / width, fade.right));
  if (fade.top) k *= smoothstep(ramp(y / height, fade.top));
  if (fade.bottom) k *= smoothstep(ramp((height - 1 - y) / height, fade.bottom));
  return k;
}

async function prepare({ source, output, fade }) {
  const { data, info } = await sharp(path.join(ROOT, "asset", source))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const pixels = width * height;

  // Luminance, and its histogram to find the paper and ink tones robustly.
  const lum = new Float32Array(pixels);
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < pixels; i++) {
    const o = i * 4;
    const l = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    lum[i] = l;
    histogram[Math.round(l)]++;
  }
  const paper = percentile(histogram, pixels, 0.98);
  const ink = percentile(histogram, pixels, 0.01);
  const localPaper = paperMap(lum, width, height);

  const out = Buffer.alloc(pixels * 4);
  const rowInk = new Uint32Array(height);
  const colInk = new Uint32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const p = localPaper[i];
      let t = (p - lum[i]) / Math.max(1, p - ink);
      t = Math.max(0, Math.min(1, (t - GRAIN_FLOOR) / (1 - GRAIN_FLOOR)));
      const alpha = Math.round(255 * t * edgeFade(x, y, width, height, fade));
      const o = i * 4;
      out[o] = INK.r;
      out[o + 1] = INK.g;
      out[o + 2] = INK.b;
      out[o + 3] = alpha;
      if (alpha > 24) {
        rowInk[y]++;
        colInk[x]++;
      }
    }
  }

  // Trim empty paper so the element's box hugs the drawing. A row or column
  // only counts once it holds a few clearly-drawn pixels: a lone speck of dust
  // at the top of the scan would otherwise hold the whole margin open.
  const first = (counts) => counts.findIndex((n) => n >= MIN_INK);
  const last = (counts) => counts.length - 1 - [...counts].reverse().findIndex((n) => n >= MIN_INK);
  const crop = {
    left: first(colInk),
    top: first(rowInk),
    width: last(colInk) - first(colInk) + 1,
    height: last(rowInk) - first(rowInk) + 1,
  };
  const file = path.join(OUT_DIR, output);
  const result = await sharp(out, { raw: { width, height, channels: 4 } })
    .extract(crop)
    .resize({ width: Math.min(MAX_WIDTH, crop.width) })
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(file);

  console.log(
    `${output}: paper ${paper}, ink ${ink}, cropped to ${crop.width}×${crop.height}, ` +
      `saved ${result.width}×${result.height} (${Math.round(result.size / 1024)} KB)`,
  );
}

await mkdir(OUT_DIR, { recursive: true });
for (const job of JOBS) await prepare(job);
