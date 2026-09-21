export type ProfilePoint = { r: number; y: number };

/**
 * Side profile of the hat, ordered from the rim (bottom) to the apex (top), for
 * `LatheGeometry`. The apex is at `y = height / 2` and the rim at `-height / 2`.
 *
 * A nón lá is a straight cone, which is the default. `flare` below 1 keeps the
 * apex sharp and sweeps the sides out instead, which reads as a spike.
 */
export function hatProfile(
  radius: number,
  height: number,
  segments: number,
  flare = 1,
): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = 1 - i / segments; // 1 at the rim, 0 at the apex
    points.push({ r: radius * t, y: height / 2 - height * t ** flare });
  }
  return points;
}
