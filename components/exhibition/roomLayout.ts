export type Vec3 = [number, number, number];

/**
 * The hall runs along +z from the entrance wall at z = 0. Paintings hang on the
 * left (x < 0) and right (x > 0) walls, alternating, each facing into the hall.
 */
export const HALL = {
  width: 8,
  height: 4.4,
  /** z of the first painting, measured from the entrance wall. */
  firstPaintingZ: 7,
  /** Distance down the hall between consecutive paintings (they alternate walls). */
  spacing: 5,
  /** Distance from the last painting to the far wall. */
  endMargin: 6,
  /** Height of a painting's centre. */
  paintingY: 1.7,
  /** Gap between the wall and a painting's centre plane; frames are 0.1 deep, so they touch the wall. */
  wallInset: 0.05,
} as const;

/** Largest box a painting may occupy; the painting is fitted inside it, keeping its aspect ratio. */
export const MAX_PAINTING = { width: 2.8, height: 1.9 } as const;

export type Placement = {
  index: number;
  side: "left" | "right";
  position: Vec3;
  /** Rotation about Y so the painting's front (+z) faces into the hall. */
  rotationY: number;
  width: number;
  height: number;
};

export function fitPainting(
  aspect: number,
  max: { width: number; height: number } = MAX_PAINTING,
): { width: number; height: number } {
  const width = Math.min(max.width, max.height * aspect);
  return { width, height: width / aspect };
}

/** Places paintings in order, given each one's width / height. */
export function layoutPaintings(aspects: number[]): Placement[] {
  return aspects.map((aspect, index) => {
    const side = index % 2 === 0 ? "left" : "right";
    const sign = side === "left" ? -1 : 1;
    const { width, height } = fitPainting(aspect);
    return {
      index,
      side,
      position: [
        sign * (HALL.width / 2 - HALL.wallInset),
        HALL.paintingY,
        HALL.firstPaintingZ + index * HALL.spacing,
      ],
      rotationY: (-sign * Math.PI) / 2,
      width,
      height,
    };
  });
}

export function hallLength(count: number): number {
  const lastPaintingZ = HALL.firstPaintingZ + Math.max(0, count - 1) * HALL.spacing;
  return lastPaintingZ + HALL.endMargin;
}
