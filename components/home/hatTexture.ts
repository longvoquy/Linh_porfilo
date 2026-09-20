import { CanvasTexture, SRGBColorSpace } from "three";

export const HAT_NAVY = "#14213d";
export const HAT_GOLD = "#c9a45c";

/**
 * Unrolled hat surface. The cone's UVs put the apex on the top row and the rim
 * on the bottom row, so 5:1 keeps the pattern roughly undistorted. This file is
 * the only place to touch when the detailed ornament arrives.
 */
const WIDTH = 2560;
const HEIGHT = 512;
const PANELS = 12;

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
  ctx.fill();
}

export function drawHatPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = HAT_NAVY;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = HAT_GOLD;
  ctx.fillStyle = HAT_GOLD;
  const panelWidth = width / PANELS;

  // Ribs. i = 0 and i = PANELS are the same rib split across the wrap seam.
  ctx.lineWidth = 7;
  for (let i = 0; i <= PANELS; i++) {
    const x = i * panelWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Double bands at mid-height and near the rim.
  ctx.lineWidth = 4;
  for (const fraction of [0.6, 0.64, 0.9, 0.94]) {
    ctx.beginPath();
    ctx.moveTo(0, height * fraction);
    ctx.lineTo(width, height * fraction);
    ctx.stroke();
  }

  // Diamonds in each panel. The panel narrows toward the apex, so the vertical
  // radius scales with the height fraction to look square on the cone.
  const rx = panelWidth * 0.2;
  for (const fraction of [0.3, 0.77]) {
    for (let i = 0; i < PANELS; i++) {
      diamond(ctx, (i + 0.5) * panelWidth, height * fraction, rx, rx * fraction);
    }
  }

  // Small squares between the rim bands.
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
