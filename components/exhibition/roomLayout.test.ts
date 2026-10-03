import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HALL, MAX_PAINTING, fitPainting, hallLength, layoutPaintings } from "./roomLayout.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

const ASPECTS = [1.26, 0.75, 1.41, 0.71, 1.41, 1.41, 1.41, 0.71];

describe("fitPainting", () => {
  it("fits a landscape painting by height", () => {
    const { width, height } = fitPainting(1.41);
    close(height, MAX_PAINTING.height);
    close(width / height, 1.41);
    assert.ok(width <= MAX_PAINTING.width);
  });
  it("fits a portrait painting by height", () => {
    const { width, height } = fitPainting(0.71);
    close(height, MAX_PAINTING.height);
    close(width / height, 0.71);
  });
  it("caps a very wide painting by width", () => {
    const { width, height } = fitPainting(3);
    close(width, MAX_PAINTING.width);
    close(width / height, 3);
  });
});

describe("layoutPaintings", () => {
  const placements = layoutPaintings(ASPECTS);

  it("places one painting per aspect, indexed in order", () => {
    assert.equal(placements.length, 8);
    placements.forEach((p, i) => assert.equal(p.index, i));
  });
  it("alternates left and right walls, starting left", () => {
    placements.forEach((p, i) => assert.equal(p.side, i % 2 === 0 ? "left" : "right"));
  });
  it("hangs on the wall of its side, at a growing distance down the hall", () => {
    placements.forEach((p, i) => {
      const [x, y, z] = p.position;
      assert.equal(Math.sign(x), p.side === "left" ? -1 : 1);
      assert.ok(Math.abs(x) < HALL.width / 2);
      close(y, HALL.paintingY);
      close(z, HALL.firstPaintingZ + i * HALL.spacing);
    });
  });
  it("faces into the hall", () => {
    for (const p of placements) {
      const normalX = Math.sin(p.rotationY);
      assert.ok(p.side === "left" ? normalX > 0.99 : normalX < -0.99);
    }
  });
  it("keeps each painting's aspect ratio", () => {
    placements.forEach((p, i) => close(p.width / p.height, ASPECTS[i]));
  });
  it("never overlaps paintings on the same wall", () => {
    for (const a of placements) {
      for (const b of placements) {
        if (a === b || a.side !== b.side) continue;
        const gap = Math.abs(a.position[2] - b.position[2]) - (a.width + b.width) / 2;
        assert.ok(gap > 0.5, `${a.index} and ${b.index} are ${gap} apart`);
      }
    }
  });
});

describe("hallLength", () => {
  it("runs past the last painting by the end margin", () => {
    close(hallLength(8), HALL.firstPaintingZ + 7 * HALL.spacing + HALL.endMargin);
  });
  it("is still a room when empty", () => {
    close(hallLength(0), HALL.firstPaintingZ + HALL.endMargin);
  });
});
