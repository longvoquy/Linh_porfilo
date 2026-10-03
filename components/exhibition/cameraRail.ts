import type { Placement, Vec3 } from "./roomLayout.ts";

export type Pose = { position: Vec3; target: Vec3 };

/** Eye height of the visitor. */
export const EYE_Y = 1.6;
export const VERTICAL_FOV = 50;
/** The close-up stands this fraction of the full-view distance from the painting. */
export const CLOSE_UP_FACTOR = 0.55;

/** Breathing room around a painting when fitting it to the view (1 = edge to edge). */
const FIT_MARGIN = 1.3;
const MIN_DISTANCE = 2.6;
/** The hall is 8 wide; keep the camera inside it when a narrow screen needs to stand far back. */
const MAX_DISTANCE = 7.5;

/** At the entrance, looking down the hall at the plaque on the entrance wall (z = 0). */
export const INTRO_POSE: Pose = { position: [0, EYE_Y, 4.5], target: [0, 2.1, 0] };

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

/** Stand `distance` in front of the painting, at eye height, looking at its centre. */
export function paintingPose(p: Placement, distance: number): Pose {
  const normalX = Math.sin(p.rotationY);
  const normalZ = Math.cos(p.rotationY);
  const [x, y, z] = p.position;
  return {
    position: [x + normalX * distance, EYE_Y, z + normalZ * distance],
    target: [x, y, z],
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
  const distance = fitDistance(p.width, p.height, viewportAspect) * (closeUp ? CLOSE_UP_FACTOR : 1);
  return paintingPose(p, distance);
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
