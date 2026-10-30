import { CanvasTexture, SRGBColorSpace } from "three";

/** Plain hex for three.js. Keep in step with `--cream`, `--ivory`, `--navy`, `--gold`, `--gold-lit` in app/globals.css. */
export const HALL_COLORS = {
  cream: "#f6efe3",
  ivory: "#fffdf8",
  navy: "#14213d",
  gold: "#b8935a",
  goldLit: "#c9a45c",
} as const;

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  draw(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Wood planks running along the canvas' y axis, with a little deterministic variation. */
export function createFloorTexture(): CanvasTexture {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const planks = 8;
    const plankWidth = w / planks;
    for (let i = 0; i < planks; i++) {
      const shade = 0.86 + (((i * 37) % 11) / 11) * 0.24;
      ctx.fillStyle = `rgb(${Math.round(150 * shade)},${Math.round(104 * shade)},${Math.round(66 * shade)})`;
      ctx.fillRect(i * plankWidth, 0, plankWidth, h);
      // One cross-seam per plank, at a different height each time.
      const seam = h * (((i * 53) % 7) / 7);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(i * plankWidth, seam, plankWidth, 2);
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let i = 0; i <= planks; i++) ctx.fillRect(i * plankWidth - 1, 0, 2, h);
  });
}

/** A soft warm pool of light, for blending additively onto the wall behind a painting. */
export function createGlowTexture(): CanvasTexture {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(255,226,160,0.55)");
    gradient.addColorStop(1, "rgba(255,226,160,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * The exhibition's name as a long banner for the end walls: gold lettering on
 * navy, a double gold rule, and a diamond between the name and its tagline.
 */
export function createBannerTexture(name: string, tagline: string, width = 2048, height = 168): CanvasTexture {
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = HALL_COLORS.navy;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = HALL_COLORS.goldLit;
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.textBaseline = "middle";
    const y = h / 2 + 4;
    const gap = 44;
    const diamond = 14;
    const nameFont = `700 88px ${PLAQUE_FONT}`;
    const taglineFont = `italic 600 62px ${PLAQUE_FONT}`;
    ctx.font = nameFont;
    const nameWidth = ctx.measureText(name.toUpperCase()).width;
    ctx.font = taglineFont;
    const taglineWidth = ctx.measureText(tagline).width;
    const total = nameWidth + gap * 2 + diamond * 2 + taglineWidth;
    let x = (w - total) / 2;

    ctx.textAlign = "left";
    ctx.fillStyle = HALL_COLORS.goldLit;
    ctx.font = nameFont;
    ctx.fillText(name.toUpperCase().normalize("NFC"), x, y);
    x += nameWidth + gap;

    ctx.beginPath();
    ctx.moveTo(x + diamond, y - diamond);
    ctx.lineTo(x + diamond * 2, y);
    ctx.lineTo(x + diamond, y + diamond);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    x += diamond * 2 + gap;

    ctx.fillStyle = HALL_COLORS.cream;
    ctx.font = taglineFont;
    ctx.fillText(tagline.normalize("NFC"), x, y);
  });
}

type PlaqueLine = { text: string; size: number; color: string };

/**
 * Serif stack for plaque text. Not Georgia: it lacks some precomposed
 * Vietnamese letters (ế, ể…) and draws their accents detached. Times New Roman
 * covers them on Windows and macOS; Noto Serif on Android and Linux.
 */
const PLAQUE_FONT = '"Times New Roman", "Noto Serif", serif';

/** A flat plaque with centred lines of serif text — the painting labels. */
export function createPlaqueTexture(
  lines: PlaqueLine[],
  background: string,
  width = 1024,
  height = 256,
): CanvasTexture {
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = HALL_COLORS.gold;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const total = lines.reduce((sum, line) => sum + line.size * 1.3, 0);
    let y = (h - total) / 2;
    for (const line of lines) {
      y += (line.size * 1.3) / 2;
      ctx.fillStyle = line.color;
      ctx.font = `600 ${line.size}px ${PLAQUE_FONT}`;
      ctx.fillText(line.text.normalize("NFC"), w / 2, y, w - 80);
      y += (line.size * 1.3) / 2;
    }
  });
}
