/**
 * Brand mark: a nón lá resting on a stand, drawn as line art so it reads at
 * 40px. Matches the 3D hat on Home — straight cone, woven hoops, gold rim.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 44" aria-hidden className={className} fill="none">
      <defs>
        <linearGradient id="brand-hat" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#1f3160" />
          <stop offset="1" stopColor="#0e1830" />
        </linearGradient>
      </defs>
      {/* Stand */}
      <path
        d="M10 36c4.5 3.4 23.5 3.4 28 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path d="M24 28v8" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      {/* Hat body */}
      <path d="M24 5 6 26q18 6 36 0Z" fill="url(#brand-hat)" />
      {/* Woven hoops */}
      <g stroke="#c9a45c" strokeWidth="0.9" opacity="0.75" fill="none">
        <path d="M17.6 12.4q6.4 2.1 12.8 0" />
        <path d="M13.1 17.6q10.9 3.2 21.8 0" />
        <path d="M8.6 22.8q15.4 4.2 30.8 0" />
      </g>
      {/* Gold rim */}
      <path d="M6 26q18 6 36 0" stroke="#b8935a" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
