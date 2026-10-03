import type { Placement } from "../roomLayout.ts";

/**
 * Walking the hall on foot. `yaw` turns about the vertical axis (positive is to
 * the left, as in three.js), so at yaw 0 the visitor faces -z, toward the
 * entrance wall; `pitch` is up (positive) or down. The eye height is fixed.
 */
export type WalkState = { x: number; z: number; yaw: number; pitch: number };

/** `forward` and `right` run from -1 to 1 (a key held is 1). */
export type WalkInput = { forward: number; right: number; run: boolean };

export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Metres per second. */
export const WALK_SPEED = 2.2;
export const RUN_FACTOR = 1.8;
/** Radians of turn per pixel of mouse travel. */
export const LOOK_SENSITIVITY = 0.0022;
/** Just short of straight up or down, so the view never flips over. */
export const MAX_PITCH = 1.2;
/** How close the visitor may stand to a wall. */
export const WALL_MARGIN = 0.6;

/** The floor the visitor may stand on: the hall, less a margin from every wall. */
export function hallBounds(width: number, length: number, margin: number = WALL_MARGIN): Bounds {
  return {
    minX: -width / 2 + margin,
    maxX: width / 2 - margin,
    minZ: margin,
    maxZ: length - margin,
  };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Turns the view by a mouse movement in pixels: right turns right, down looks down. */
export function lookBy(
  state: WalkState,
  dx: number,
  dy: number,
  sensitivity: number = LOOK_SENSITIVITY,
): WalkState {
  return {
    ...state,
    yaw: state.yaw - dx * sensitivity,
    pitch: clamp(state.pitch - dy * sensitivity, -MAX_PITCH, MAX_PITCH),
  };
}

/** Moves for `dt` seconds along the direction faced, stopping at the walls. */
export function stepWalk(state: WalkState, input: WalkInput, dt: number, bounds: Bounds): WalkState {
  const magnitude = Math.hypot(input.forward, input.right);
  if (magnitude < 1e-4) return state;

  // Diagonals are no faster than straight lines; partial input (easing) stays partial.
  const scale = 1 / Math.max(1, magnitude);
  const forward = input.forward * scale;
  const right = input.right * scale;
  const distance = WALK_SPEED * (input.run ? RUN_FACTOR : 1) * dt;
  const sin = Math.sin(state.yaw);
  const cos = Math.cos(state.yaw);

  return {
    ...state,
    x: clamp(state.x + (-sin * forward + cos * right) * distance, bounds.minX, bounds.maxX),
    z: clamp(state.z + (-cos * forward - sin * right) * distance, bounds.minZ, bounds.maxZ),
  };
}

/**
 * The painting the visitor is looking at: the one most squarely in view that is
 * within `maxDistance` and no more than about 35 degrees off the line of sight
 * (`minDot` is the cosine of that angle). Its index, or null.
 */
export function facingPainting(
  state: WalkState,
  placements: Placement[],
  maxDistance = 6,
  minDot = 0.82,
): number | null {
  const faceX = -Math.sin(state.yaw);
  const faceZ = -Math.cos(state.yaw);
  let best: number | null = null;
  let bestDot = minDot;

  for (const p of placements) {
    const dx = p.position[0] - state.x;
    const dz = p.position[2] - state.z;
    const distance = Math.hypot(dx, dz);
    if (distance === 0 || distance > maxDistance) continue;
    const dot = (dx * faceX + dz * faceZ) / distance;
    if (dot > bestDot) {
      best = p.index;
      bestDot = dot;
    }
  }
  return best;
}
