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

/**
 * The hat's painted surface, drawn as a disc seen from straight above: the
 * centre of the disc is the point of the hat and its edge is the rim.
 *
 * The hat's texture is a plain rectangle wrapped round the cone, so the disc is
 * read in polar coordinates about its own centre and written out square — one
 * column per angle round the hat, one row per step down from the point. Wrapped
 * this way the hat seen from above is the artwork exactly; on the surface
 * itself the pattern is drawn out by a quarter, because the slope from point to
 * rim is that much longer than the radius it covers.
 */
const DISC = { source: "test2.png", output: "hat-disc.webp" };
const TEXTURE = { width: 2560, height: 512 }; // matches components/home/hatTexture.ts

/** Alpha at or below this is cut-out background. */
const CUT = 16;
/** Luminance above this is the paper the plate was rendered on. */
const PAPER = 200;

/**
 * Which pixels belong to the plate. Some sources come with their background
 * removed and some still sit on paper, so both are treated the same way: the
 * background is whatever the border can reach without crossing the plate. Gold
 * inside the plate is bright enough to pass for paper, and this is what saves
 * it — nothing reaches it from outside.
 */
function plateMask(data, width, height) {
  const outside = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    const i = y * width + x;
    if (outside[i]) return;
    const o = i * 4;
    const lum = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    if (data[o + 3] > CUT && lum <= PAPER) return;
    outside[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  return outside;
}

/** Bilinear sample, weighted by alpha so the transparent outside cannot bleed in. */
function sample(data, width, height, x, y, out) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (const [dx, dy, w] of [
    [0, 0, (1 - fx) * (1 - fy)],
    [1, 0, fx * (1 - fy)],
    [0, 1, (1 - fx) * fy],
    [1, 1, fx * fy],
  ]) {
    const sx = Math.min(width - 1, Math.max(0, x0 + dx));
    const sy = Math.min(height - 1, Math.max(0, y0 + dy));
    const o = (sy * width + sx) * 4;
    const alpha = data[o + 3] / 255;
    r += data[o] * alpha * w;
    g += data[o + 1] * alpha * w;
    b += data[o + 2] * alpha * w;
    a += alpha * w;
  }
  out[3] = Math.round(a * 255);
  const k = a > 0 ? 1 / a : 0;
  out[0] = Math.round(r * k);
  out[1] = Math.round(g * k);
  out[2] = Math.round(b * k);
}

const median = (values) => [...values].sort((a, b) => a - b)[values.length >> 1];

async function prepareDisc({ source, output }) {
  const { data, info } = await sharp(path.join(ROOT, "asset", source))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const outside = plateMask(data, width, height);
  // Cut the paper away, so sampling near an edge blends towards nothing.
  for (let i = 0; i < width * height; i++) if (outside[i]) data[i * 4 + 3] = 0;
  const inside = (x, y) => !outside[y * width + x];

  // Centre of the disc, from the box the painting sits in.
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!inside(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const centre = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

  const outW = TEXTURE.width;
  const outH = TEXTURE.height;
  const far = Math.hypot(width, height);
  const ray = (i) => {
    // The full turn, one column at a time. Column 0 points up the artwork.
    const angle = (((i + 0.5) / outW) * 2 - 1) * Math.PI;
    return { dx: -Math.sin(angle), dy: -Math.cos(angle) };
  };

  /**
   * Where the painting starts and ends along each ray. A disc drawn by hand is
   * never exactly round, and reading its own edge per ray is what keeps the
   * border sitting on the hat's rim the whole way round rather than wandering.
   */
  const start = new Float64Array(outW);
  const reach = new Float64Array(outW);
  for (let i = 0; i < outW; i++) {
    const { dx, dy } = ray(i);
    for (let r = far; r > 0; r -= 0.5) {
      const x = Math.round(centre.x + dx * r);
      const y = Math.round(centre.y + dy * r);
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (inside(x, y)) {
        reach[i] = r;
        break;
      }
    }
    for (let r = 0; r < reach[i]; r += 0.5) {
      const x = Math.round(centre.x + dx * r);
      const y = Math.round(centre.y + dy * r);
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if (inside(x, y)) {
        start[i] = r;
        break;
      }
    }
  }
  // A ray that grazes a notch in the edge, or that meets the centre rosette a
  // little late, would otherwise stretch its own column against its neighbours.
  const floor = median(reach) * 0.95;
  const ceiling = median(start) * 1.5 + 2;
  for (let i = 0; i < outW; i++) {
    reach[i] = Math.max(reach[i], floor);
    start[i] = Math.min(start[i], ceiling);
  }

  const out = Buffer.alloc(outW * outH * 4);
  const pixel = new Uint8Array(4);
  for (let i = 0; i < outW; i++) {
    const { dx, dy } = ray(i);
    for (let j = 0; j < outH; j++) {
      // Down the column: the painted band, from the point of the hat to the
      // rim, stopping a hair short of the edge — the last pixels of the disc
      // are half-transparent and would fringe the rim.
      const r = start[i] + ((j + 0.5) / outH) * (reach[i] * 0.995 - start[i]);
      sample(data, width, height, centre.x + dx * r, centre.y + dy * r, pixel);
      out.set(pixel, (j * outW + i) * 4);
    }
  }

  const result = await sharp(out, { raw: { width: outW, height: outH, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 90 })
    .toFile(path.join(OUT_DIR, output));

  console.log(
    `${output}: disc ${(maxX - minX + 1)}×${(maxY - minY + 1)} at ` +
      `${centre.x.toFixed(0)},${centre.y.toFixed(0)}, paint from ${median(start).toFixed(0)} to ` +
      `${median(reach).toFixed(0)}px, saved ${result.width}×${result.height} ` +
      `(${Math.round(result.size / 1024)} KB)`,
  );
}

await mkdir(OUT_DIR, { recursive: true });
for (const job of JOBS) await prepare(job);
await prepareDisc(DISC);
