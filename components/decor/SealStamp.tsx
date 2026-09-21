/**
 * Triện — a carved seal impression. The glyph block is decorative rather than
 * literal script, so it carries no meaning to mistranslate; it is marked
 * `aria-hidden` for that reason.
 */
export function SealStamp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className} fill="none">
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="6"
        stroke="var(--vermilion)"
        strokeWidth="4"
        opacity="0.92"
      />
      <g fill="var(--vermilion)" opacity="0.92">
        {/* Two carved columns, as on a name seal. */}
        <rect x="12" y="13" width="17" height="4" rx="1" />
        <rect x="12" y="21" width="17" height="4" rx="1" />
        <rect x="12" y="29" width="4" height="22" rx="1" />
        <rect x="12" y="47" width="17" height="4" rx="1" />
        <rect x="25" y="29" width="4" height="14" rx="1" />

        <rect x="35" y="13" width="17" height="4" rx="1" />
        <rect x="41" y="13" width="4" height="38" rx="1" />
        <rect x="35" y="30" width="17" height="4" rx="1" />
        <rect x="35" y="47" width="17" height="4" rx="1" />
      </g>
    </svg>
  );
}
