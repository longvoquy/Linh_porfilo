import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hatProfile } from "./hatGeometry.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

describe("hatProfile", () => {
  const radius = 1.7;
  const height = 1.25;
  const points = hatProfile(radius, height, 48);

  it("has segments + 1 points", () => assert.equal(points.length, 49));

  it("runs from the rim (bottom) to the apex (top)", () => {
    close(points[0].r, radius);
    close(points[0].y, -height / 2);
    close(points[points.length - 1].r, 0);
    close(points[points.length - 1].y, height / 2);
  });

  it("narrows and rises monotonically", () => {
    for (let i = 1; i < points.length; i++) {
      assert.ok(points[i].r < points[i - 1].r, `r not decreasing at ${i}`);
      assert.ok(points[i].y > points[i - 1].y, `y not increasing at ${i}`);
    }
  });

  it("is a straight cone by default", () => {
    for (const { r, y } of points) close(y, height / 2 - (r / radius) * height);
  });

  it("sweeps the sides out below a flare of 1", () => {
    const flared = hatProfile(radius, height, 48, 0.85);
    const slope = (p: typeof flared, a: number, b: number) =>
      Math.abs(p[b].y - p[a].y) / Math.abs(p[b].r - p[a].r);
    assert.ok(slope(flared, 46, 47) > slope(flared, 0, 1));
  });
});
