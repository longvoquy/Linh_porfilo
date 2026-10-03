import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { layoutPaintings } from "../roomLayout.ts";
import {
  MAX_PITCH,
  RUN_FACTOR,
  WALK_SPEED,
  facingPainting,
  hallBounds,
  lookBy,
  stepWalk,
  type WalkInput,
  type WalkState,
} from "./walkMath.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

const BOUNDS = hallBounds(8, 50, 0.6);
const START: WalkState = { x: 0, z: 10, yaw: 0, pitch: 0 };
const STILL: WalkInput = { forward: 0, right: 0, run: false };

describe("hallBounds", () => {
  it("keeps the margin from every wall", () => {
    assert.deepEqual(BOUNDS, { minX: -3.4, maxX: 3.4, minZ: 0.6, maxZ: 49.4 });
  });
});

describe("lookBy", () => {
  it("turns right when the mouse moves right", () => {
    assert.ok(lookBy(START, 100, 0).yaw < START.yaw);
  });
  it("turns left when the mouse moves left", () => {
    assert.ok(lookBy(START, -100, 0).yaw > START.yaw);
  });
  it("looks down when the mouse moves down, up when it moves up", () => {
    assert.ok(lookBy(START, 0, 100).pitch < 0);
    assert.ok(lookBy(START, 0, -100).pitch > 0);
  });
  it("never looks past straight up or down", () => {
    close(lookBy(START, 0, 1e6).pitch, -MAX_PITCH);
    close(lookBy(START, 0, -1e6).pitch, MAX_PITCH);
  });
  it("leaves the position alone", () => {
    const next = lookBy(START, 50, 50);
    assert.equal(next.x, START.x);
    assert.equal(next.z, START.z);
  });
});

describe("stepWalk", () => {
  it("does nothing without input", () => {
    assert.deepEqual(stepWalk(START, STILL, 1, BOUNDS), START);
  });
  it("walks forward along -z when facing yaw 0", () => {
    const next = stepWalk(START, { ...STILL, forward: 1 }, 1, BOUNDS);
    close(next.x, 0);
    close(next.z, START.z - WALK_SPEED);
  });
  it("walks backward", () => {
    const next = stepWalk(START, { ...STILL, forward: -1 }, 1, BOUNDS);
    close(next.z, START.z + WALK_SPEED);
  });
  it("strafes right along +x at yaw 0", () => {
    // Half a second keeps the step inside the side walls.
    const next = stepWalk(START, { ...STILL, right: 1 }, 0.5, BOUNDS);
    close(next.x, WALK_SPEED * 0.5);
    close(next.z, START.z);
  });
  it("walks toward where it faces after turning left 90 degrees", () => {
    const next = stepWalk({ ...START, yaw: Math.PI / 2 }, { ...STILL, forward: 1 }, 0.5, BOUNDS);
    close(next.x, -WALK_SPEED * 0.5);
    close(next.z, START.z);
  });
  it("does not go faster diagonally", () => {
    const next = stepWalk(START, { ...STILL, forward: 1, right: 1 }, 1, BOUNDS);
    close(Math.hypot(next.x - START.x, next.z - START.z), WALK_SPEED);
  });
  it("runs faster", () => {
    const next = stepWalk(START, { forward: 1, right: 0, run: true }, 1, BOUNDS);
    close(START.z - next.z, WALK_SPEED * RUN_FACTOR);
  });
  it("covers distance in proportion to the time step", () => {
    const next = stepWalk(START, { ...STILL, forward: 1 }, 0.5, BOUNDS);
    close(START.z - next.z, WALK_SPEED * 0.5);
  });
  it("stops at the walls", () => {
    const right = stepWalk({ ...START, x: 3.3 }, { ...STILL, right: 1 }, 1, BOUNDS);
    close(right.x, BOUNDS.maxX);
    const entrance = stepWalk({ ...START, z: 1 }, { ...STILL, forward: 1 }, 1, BOUNDS);
    close(entrance.z, BOUNDS.minZ);
    const far = stepWalk({ ...START, z: 49 }, { ...STILL, forward: -1 }, 1, BOUNDS);
    close(far.z, BOUNDS.maxZ);
  });
  it("keeps the view direction", () => {
    const next = stepWalk({ ...START, yaw: 1, pitch: 0.3 }, { ...STILL, forward: 1 }, 1, BOUNDS);
    assert.equal(next.yaw, 1);
    assert.equal(next.pitch, 0.3);
  });
});

describe("facingPainting", () => {
  const placements = layoutPaintings([1.41, 0.71, 1.26]);
  // Painting 0 hangs on the left wall at z = 7; painting 1 on the right wall at z = 12.

  it("finds the painting straight ahead", () => {
    const at = { x: 0, z: 7, yaw: Math.PI / 2, pitch: 0 };
    assert.equal(facingPainting(at, placements), 0);
  });
  it("finds a painting on the right wall when facing it", () => {
    const at = { x: 0, z: 12, yaw: -Math.PI / 2, pitch: 0 };
    assert.equal(facingPainting(at, placements), 1);
  });
  it("is null when looking down the hall with the paintings behind", () => {
    assert.equal(facingPainting({ x: 0, z: 7, yaw: 0, pitch: 0 }, placements), null);
  });
  it("is null when facing away from the wall", () => {
    assert.equal(facingPainting({ x: 0, z: 7, yaw: -Math.PI / 2, pitch: 0 }, placements), null);
  });
  it("is null when too far away", () => {
    assert.equal(facingPainting({ x: 0, z: 30, yaw: Math.PI / 2, pitch: 0 }, placements), null);
  });
  it("is null when the painting is well off to the side of the view", () => {
    const at = { x: 0, z: 10.5, yaw: Math.PI / 2 + 0.9, pitch: 0 };
    assert.equal(facingPainting(at, placements), null);
  });
  it("picks the one more squarely in view", () => {
    // Paintings 0 and 2 hang on the same wall, 5 either side of z = 12; turned slightly toward 2.
    const at = { x: 0, z: 12, yaw: Math.PI / 2 + 0.4, pitch: 0 };
    assert.equal(facingPainting(at, placements, 12), 2);
  });
});
