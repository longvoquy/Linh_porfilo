// Left side of the hat, apex → rim. The sides are straight, like the 3D cone;
// hoops follow them, so each one is an arc between the two sides at that height.
// The landmarks are measured off the 3D scene's own projection, so the static
// hat and the one that replaces it are the same shape.
const APEX = { x: 200, y: 32 };
const RIM = { x: 18, y: 210 };
/**
 * How far the front of a ring dips below its sides, as a share of its half
 * width. Every circle on the cone is seen at the same angle, so one number
 * serves the rim and every hoop: 0.83 as a quadratic's control offset puts the
 * front of the rim at y 286, where the scene's camera puts it.
 */
const DIP = 0.83;

function sideAt(t: number) {
  return { x: APEX.x + (RIM.x - APEX.x) * t, y: APEX.y + (RIM.y - APEX.y) * t };
}

const ring = (x: number, y: number) => `M${x} ${y} Q200 ${y + (200 - x) * DIP} ${400 - x} ${y}`;

const HOOPS = [0.22, 0.38, 0.54, 0.7, 0.86].map((t) => {
  const { x, y } = sideAt(t);
  return ring(x, y);
});

/** Static hat shown while the 3D scene loads, or when WebGL is unavailable. */
export function HatFallback() {
  return (
    <svg viewBox="0 0 400 320" aria-hidden className="h-full w-full">
      <defs>
        <linearGradient id="hat-fallback-body" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0e1830" />
          <stop offset="0.5" stopColor="#1f3160" />
          <stop offset="1" stopColor="#0e1830" />
        </linearGradient>
      </defs>
      {/* The ground shadow lives in HatStage, so it is shared with the 3D scene. */}
      <path
        d={`M${APEX.x} ${APEX.y} L${RIM.x} ${RIM.y} Q200 ${RIM.y + (200 - RIM.x) * DIP} ${
          400 - RIM.x
        } ${RIM.y} Z`}
        fill="url(#hat-fallback-body)"
      />
      <path d={HOOPS.join(" ")} stroke="#c9a45c" strokeWidth="1.6" opacity="0.6" fill="none" />
      <path d={ring(RIM.x, RIM.y)} stroke="#c9a45c" strokeWidth="3" fill="none" />
    </svg>
  );
}
