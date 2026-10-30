/**
 * A thin gold rule with a small woven-lotus knot at its centre — the divider
 * under the exhibition's name. Decorative; inherits its colour from `currentColor`.
 */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 20" aria-hidden className={className} fill="none" stroke="currentColor">
      <path d="M0 10h96" strokeWidth="0.8" opacity="0.7" />
      <path d="M144 10h96" strokeWidth="0.8" opacity="0.7" />
      <path d="M100 10h4M136 10h4" strokeWidth="0.8" />
      {/* Lotus: a centre petal, two flanking petals and two outer ones. */}
      <g strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
        <path d="M120 3c3 3.2 3 9.8 0 14-3-4.2-3-10.8 0-14Z" />
        <path d="M120 17c-1-5.4-5.2-8.6-9.8-8.6 .4 4.6 4.4 8 9.8 8.6Z" />
        <path d="M120 17c1-5.4 5.2-8.6 9.8-8.6-.4 4.6-4.4 8-9.8 8.6Z" />
        <path d="M111 15.6c-2.2-.6-4.4-2.4-5.4-5 2.4-.2 4.4.6 5.4 2.2" opacity="0.7" />
        <path d="M129 15.6c2.2-.6 4.4-2.4 5.4-5-2.4-.2-4.4.6-5.4 2.2" opacity="0.7" />
      </g>
    </svg>
  );
}
