/** Wraps `index` into `[0, count)`, including negative values. */
export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/**
 * Signed distance of `index` from `active` on a ring of `count` items, in
 * `[-floor(count / 2), floor(count / 2)]`. Negative is to the left.
 */
export function ringOffset(index: number, active: number, count: number): number {
  const half = Math.floor(count / 2);
  const offset = wrapIndex(index - active, count);
  return offset > half ? offset - count : offset;
}

/** Shortest signed rotation from `from` to `to`, in radians, in `(-π, π]`. */
export function shortestAngle(from: number, to: number): number {
  const full = Math.PI * 2;
  let diff = (to - from) % full;
  if (diff > Math.PI) diff -= full;
  if (diff <= -Math.PI) diff += full;
  return diff;
}

/** Hat yaw that puts item `index` of `count` at the front. */
export function yawForIndex(index: number, count: number): number {
  return (index / count) * Math.PI * 2;
}

/** Item nearest the front for a given hat yaw (any number of turns) — the inverse of `yawForIndex`. */
export function indexForYaw(yaw: number, count: number): number {
  return wrapIndex(Math.round((yaw / (Math.PI * 2)) * count), count);
}
