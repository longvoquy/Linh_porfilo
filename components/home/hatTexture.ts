import { CanvasTexture, SRGBColorSpace } from "three";

// three.js needs plain hex, so these mirror the palette in app/globals.css:
// --navy, and --gold-lit (gold as lit metal, brighter than the flat --gold).
export const HAT_NAVY = "#14213d";
export const HAT_GOLD = "#c9a45c";

/**
 * Unrolled hat surface. The lathe's UVs put the apex on the top row and the rim
 * on the bottom row, so 5:1 keeps the pattern roughly undistorted.
 */
const WIDTH = 2560;
const HEIGHT = 512;

/**
 * The painted panel, already unrolled from its wedge into a rectangle by
 * scripts/prepare-decor.mjs. Four of them go round: the artwork opens 69.8°
 * flat and this cone unrolls to 290°, so four is the count that leaves the
 * painting nearest its own proportions — it is stretched by 4% and no more.
 */
const PANEL_SRC = "/decor/hat-panel.webp";
const PANELS = 4;
/**
 * Quarter turns and the wheel's seven stops do not line up, so at some stops a
 * seam faces the viewer. This phase, in panel widths, is the one that puts a
 * panel's middle at the front for the section the page opens on — the third of
 * seven, so the front sits 2/7 of a turn round, which is 0.36 of a panel past
 * the nearest seam.
 */
const PANEL_SHIFT = 0.36;

/** Fractions of the height (0 = apex, 1 = rim) where the woven hoops sit. */
const HOOP_START = 0.1;
const HOOP_END = 0.86;
const HOOP_STEP = 0.055;

/**
 * The bare weave, which is what the hat wears until the panels load — and what
 * it keeps if they never do.
 */
function drawWeave(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = HAT_GOLD;
  ctx.fillStyle = HAT_GOLD;

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

/**
 * Draws the whole surface. `panel` is optional because it arrives over the
 * network: the hat is drawn once without it and redrawn when it lands.
 */
export function drawHatPattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  panel?: CanvasImageSource | null,
): void {
  ctx.fillStyle = HAT_NAVY;
  ctx.fillRect(0, 0, width, height);

  if (!panel) {
    drawWeave(ctx, width, height);
    return;
  }

  // One copy either side of the run, so the panel straddling the seam at u = 0
  // has its other half there rather than a gap.
  const panelWidth = width / PANELS;
  for (let i = -1; i <= PANELS; i++) {
    ctx.drawImage(panel, (i + PANEL_SHIFT) * panelWidth, 0, panelWidth, height);
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

  const panel = new Image();
  panel.src = PANEL_SRC;
  panel
    .decode()
    .then(() => {
      drawHatPattern(ctx, WIDTH, HEIGHT, panel);
      texture.needsUpdate = true;
    })
    .catch(() => {});

  return texture;
}
