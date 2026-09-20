import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ringOffset, shortestAngle, wrapIndex, yawForIndex } from "./carouselMath.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

describe("wrapIndex", () => {
  it("keeps in-range indices", () => assert.equal(wrapIndex(3, 7), 3));
  it("wraps past the end", () => assert.equal(wrapIndex(7, 7), 0));
  it("wraps below zero", () => assert.equal(wrapIndex(-1, 7), 6));
  it("wraps far below zero", () => assert.equal(wrapIndex(-15, 7), 6));
});

describe("ringOffset (count 7)", () => {
  it("is 0 for the active index", () => assert.equal(ringOffset(2, 2, 7), 0));
  it("is +1 / -1 for neighbours", () => {
    assert.equal(ringOffset(3, 2, 7), 1);
    assert.equal(ringOffset(1, 2, 7), -1);
  });
  it("wraps at the ends", () => {
    assert.equal(ringOffset(0, 6, 7), 1);
    assert.equal(ringOffset(6, 0, 7), -1);
  });
  it("covers -3..3 exactly once", () => {
    const offsets = Array.from({ length: 7 }, (_, i) => ringOffset(i, 0, 7)).sort((a, b) => a - b);
    assert.deepEqual(offsets, [-3, -2, -1, 0, 1, 2, 3]);
  });
});

describe("shortestAngle", () => {
  it("is 0 for equal angles", () => close(shortestAngle(1, 1), 0));
  it("goes the short way across the 2π seam", () => {
    close(shortestAngle(0, Math.PI * 2 - 0.1), -0.1);
    close(shortestAngle(Math.PI * 2 - 0.1, 0), 0.1);
  });
  it("handles multi-turn inputs", () => close(shortestAngle(0, Math.PI * 4 + 0.3), 0.3));
  it("returns π (not -π) for a half turn", () => close(shortestAngle(0, Math.PI), Math.PI));
});

describe("yawForIndex", () => {
  it("is 0 for the first item", () => close(yawForIndex(0, 7), 0));
  it("advances 2π/count per item", () => close(yawForIndex(1, 7), (Math.PI * 2) / 7));
});
