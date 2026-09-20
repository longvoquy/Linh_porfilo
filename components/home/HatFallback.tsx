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
      <ellipse cx="200" cy="282" rx="176" ry="26" fill="#f3e2b8" opacity="0.5" />
      <path d="M200 40 L368 240 Q200 292 32 240 Z" fill="url(#hat-fallback-body)" />
      <path
        d="M200 40 L110 262 M200 40 L155 274 M200 40 L200 279 M200 40 L245 274 M200 40 L290 262"
        stroke="#c9a45c"
        strokeWidth="2"
        opacity="0.7"
        fill="none"
      />
      <path d="M32 240 Q200 292 368 240" stroke="#c9a45c" strokeWidth="4" fill="none" />
      <circle cx="200" cy="38" r="7" fill="#c9a45c" />
    </svg>
  );
}
