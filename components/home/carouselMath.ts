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

/**
 * Where an arch's base sits on the ring, `offset` steps from the active one.
 *
 * The ring is the front of an ellipse seen at an angle, like the hat's brim:
 * semi-axes `a` and `b`, with the active arch at its lowest point. Returned as
 * CSS translate percentages of the arch's own box — `x` of its width, `y` of
 * its height, negative being up — so the ring scales with the arches.
 *
 * Every base therefore lies on one curve by construction, rather than on a
 * lift and a tilt tuned separately, which is what stopped them lining up.
 */
export function archBase(
  offset: number,
  stepDeg: number,
  a: number,
  b: number,
): { x: number; y: number } {
  const t = offset * stepDeg * (Math.PI / 180);
  return { x: a * Math.sin(t), y: -b * (1 - Math.cos(t)) };
}
