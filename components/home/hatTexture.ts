import { CanvasTexture, SRGBColorSpace } from "three";

// three.js needs plain hex, so these mirror the palette in app/globals.css:
// --navy, and --gold-lit (gold as lit metal, brighter than the flat --gold).
export const HAT_NAVY = "#14213d";
export const HAT_GOLD = "#c9a45c";

/**
 * Unrolled hat surface. The lathe's UVs put the apex on the top row and the rim
 * on the bottom row, so 5:1 keeps the pattern roughly undistorted. This file is
 * the only place to touch when the detailed ornament arrives.
 */
const WIDTH = 2560;
const HEIGHT = 512;
const PANELS = 12;

/** Fractions of the height (0 = apex, 1 = rim) where the woven hoops sit. */
const HOOP_START = 0.1;
const HOOP_END = 0.86;
const HOOP_STEP = 0.055;

/** A diamond with a navy outline, so it cuts cleanly through the hoops behind it. */
function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
  ctx.lineWidth = 10;
  ctx.strokeStyle = HAT_NAVY;
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

export function drawHatPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = HAT_NAVY;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = HAT_GOLD;
  ctx.fillStyle = HAT_GOLD;
  const panelWidth = width / PANELS;

  // Woven strands: very faint, so the surface reads as fibre rather than as spokes.
  ctx.globalAlpha = 0.1;
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= width; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, height * HOOP_START);
    ctx.lineTo(x, height * 0.9);
    ctx.stroke();
  }

  // Bamboo hoops, evenly spaced from apex to brim.
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2.5;
  for (let fraction = HOOP_START; fraction <= HOOP_END + 1e-6; fraction += HOOP_STEP) {
    ctx.beginPath();
    ctx.moveTo(0, height * fraction);
    ctx.lineTo(width, height * fraction);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Staggered diamond rows. The surface narrows toward the apex, so the vertical
  // radius scales with the height fraction to look square on the hat.
  const rx = panelWidth * 0.2;
  for (const [fraction, shift] of [
    [0.3, 0],
    [0.77, 0.5],
  ] as const) {
    for (let i = 0; i < PANELS; i++) {
      diamond(ctx, (i + shift) * panelWidth, height * fraction, rx, rx * fraction);
    }
  }

  // Double bands near the rim, with small squares between them.
  ctx.lineWidth = 4;
  for (const fraction of [0.9, 0.94]) {
    ctx.beginPath();
    ctx.moveTo(0, height * fraction);
    ctx.lineTo(width, height * fraction);
    ctx.stroke();
  }
  for (let x = 12; x < width; x += 28) {
    ctx.fillRect(x, height * 0.92 - 4, 8, 8);
  }
}

export function createHatTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  drawHatPattern(ctx, WIDTH, HEIGHT);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
