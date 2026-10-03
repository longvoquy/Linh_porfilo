import type { Placement, Vec3 } from "./roomLayout.ts";

export type Pose = { position: Vec3; target: Vec3 };

/** Eye height of the visitor. */
export const EYE_Y = 1.6;
export const VERTICAL_FOV = 50;
/** The close-up stands this fraction of the full-view distance from the painting. */
export const CLOSE_UP_FACTOR = 0.55;

/** Breathing room around a painting when fitting it to the view (1 = edge to edge). */
const FIT_MARGIN = 1.15;
const MIN_DISTANCE = 2.6;
/** The hall is 8 wide; keep the camera inside it when a narrow screen needs to stand far back. */
const MAX_DISTANCE = 7.5;

/** At the entrance, looking down the length of the hall. */
export const INTRO_POSE: Pose = { position: [0, EYE_Y, 1.5], target: [0, 1.7, 14] };

/** How far from a painting the camera must stand for it to fit the viewport. */
export function fitDistance(
  width: number,
  height: number,
  viewportAspect: number,
  vfovDeg: number = VERTICAL_FOV,
): number {
  const tanV = Math.tan((vfovDeg * Math.PI) / 360);
  const tanH = tanV * viewportAspect;
  const needed = FIT_MARGIN * Math.max(height / (2 * tanV), width / (2 * tanH));
  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, needed));
}

/** Stand `distance` in front of the painting, at eye height, looking at its centre (or `focusDrop` below it). */
export function paintingPose(p: Placement, distance: number, focusDrop = 0): Pose {
  const normalX = Math.sin(p.rotationY);
  const normalZ = Math.cos(p.rotationY);
  const [x, y, z] = p.position;
  return {
    position: [x + normalX * distance, EYE_Y, z + normalZ * distance],
    target: [x, y - focusDrop, z],
  };
}

/** Stop 0 is the entrance; stop `i` (1-based) is painting `i - 1`. */
export function poseForStop(
  stop: number,
  placements: Placement[],
  viewportAspect: number,
  closeUp: boolean,
): Pose {
  if (stop <= 0) return INTRO_POSE;
  const p = placements[stop - 1];
  // The full view frames the picture and its label together; the close-up is on the picture alone.
  const distance = fitDistance(p.width, p.fitHeight, viewportAspect);
  return closeUp
    ? paintingPose(p, distance * CLOSE_UP_FACTOR)
    : paintingPose(p, distance, p.focusDrop);
}

/**
 * How far, in world units, the camera may slide across the picture in the
 * close-up (x sideways, y up and down), so that every part of it can be brought
 * into view. On an axis where the picture fits the view the range is zero; where
 * it overflows, the camera can reach its edge, and a little past it (`margin`)
 * to show the frame.
 */
export function closeUpPanRange(
  p: Placement,
  distance: number,
  viewportAspect: number,
  vfovDeg: number = VERTICAL_FOV,
  margin = 0.15,
): { x: number; y: number } {
  const visibleHeight = 2 * distance * Math.tan((vfovDeg * Math.PI) / 360);
  const visibleWidth = visibleHeight * viewportAspect;
  const reach = (size: number, visible: number) => Math.max(0, (size + 2 * margin - visible) / 2);
  return { x: reach(p.width, visibleWidth), y: reach(p.height, visibleHeight) };
}

/** The close-up's pan range for a stop; zero when not in a close-up, or at the entrance. */
export function panRangeForStop(
  stop: number,
  placements: Placement[],
  viewportAspect: number,
  closeUp: boolean,
): { x: number; y: number } {
  if (!closeUp || stop <= 0) return { x: 0, y: 0 };
  const p = placements[stop - 1];
  const distance = fitDistance(p.width, p.fitHeight, viewportAspect) * CLOSE_UP_FACTOR;
  return closeUpPanRange(p, distance, viewportAspect);
}

/** True when `a` and `b` are so close that no further movement would be visible. */
export function isSettled(a: Pose, b: Pose, epsilon = 0.002): boolean {
  return [0, 1, 2].every(
    (i) =>
      Math.abs(a.position[i] - b.position[i]) < epsilon &&
      Math.abs(a.target[i] - b.target[i]) < epsilon,
  );
}

/** Frame-rate independent ease toward `goal`: `rate` is how quickly it closes in (per second). */
export function damp(current: number, goal: number, dt: number, rate: number): number {
  return goal + (current - goal) * Math.exp(-rate * dt);
}

function dampVec(current: Vec3, goal: Vec3, dt: number, rate: number): Vec3 {
  return [
    damp(current[0], goal[0], dt, rate),
    damp(current[1], goal[1], dt, rate),
    damp(current[2], goal[2], dt, rate),
  ];
}

/** Moving the look-at point with the camera is what makes the camera turn smoothly between walls. */
export function dampPose(current: Pose, goal: Pose, dt: number, rate: number): Pose {
  return {
    position: dampVec(current.position, goal.position, dt, rate),
    target: dampVec(current.target, goal.target, dt, rate),
  };
}
