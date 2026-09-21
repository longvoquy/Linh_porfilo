// Left side of the hat, apex → rim. The sides are straight, like the 3D cone;
// hoops follow them, so each one is an arc between the two sides at that height.
const APEX = { x: 200, y: 40 };
const RIM = { x: 32, y: 240 };

function sideAt(t: number) {
  return { x: APEX.x + (RIM.x - APEX.x) * t, y: APEX.y + (RIM.y - APEX.y) * t };
}

const HOOPS = [0.22, 0.38, 0.54, 0.7, 0.86].map((t) => {
  const { x, y } = sideAt(t);
  const half = 200 - x;
  return `M${x} ${y} Q200 ${y + half * 0.31} ${400 - x} ${y}`;
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
        d={`M${APEX.x} ${APEX.y} L${RIM.x} ${RIM.y} Q200 292 ${400 - RIM.x} ${RIM.y} Z`}
        fill="url(#hat-fallback-body)"
      />
      <path d={HOOPS.join(" ")} stroke="#c9a45c" strokeWidth="1.6" opacity="0.6" fill="none" />
      <path d="M32 240 Q200 292 368 240" stroke="#c9a45c" strokeWidth="3" fill="none" />
    </svg>
  );
}
