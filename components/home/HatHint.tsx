"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * The hand-drawn annotation under the hero: a pointing hand, a curved arrow
 * sweeping toward the hat, and the hint itself. The hint is real text rather
 * than part of the drawing so it translates and can be read aloud; the drawing
 * beside it is decorative.
 */
export function HatHint({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={`flex items-start gap-3 ${className ?? ""}`}>
      <svg viewBox="0 0 34 40" aria-hidden className="mt-0.5 h-9 w-8 shrink-0 text-navy/70" fill="none">
        {/* Click burst */}
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
          <path d="M6 5 3 1M13 3l1-3M1 12l-4-1" transform="translate(4 3)" />
        </g>
        {/* Pointing hand */}
        <g stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none">
          <path d="M13 36V22l-4 3q-3-3 0-6l6-6V9a2.5 2.5 0 0 1 5 0v6" />
          <path d="M18 17a2 2 0 0 1 4 0v3" />
          <path d="M22 19a2 2 0 0 1 4 0v4" />
          <path d="M26 21a2 2 0 0 1 4 0v8q0 7-7 7h-6" />
        </g>
      </svg>

      <p className="max-w-[15rem] font-heading text-sm italic leading-snug text-navy/70">
        {t("home.hatHint")}
      </p>

      {/* Curved arrow sweeping up toward the hat; only where there is room for it. */}
      <svg
        viewBox="0 0 90 60"
        aria-hidden
        className="mt-1 hidden h-12 w-20 shrink-0 text-gold lg:block"
        fill="none"
      >
        <path
          d="M2 52q30 6 54-14"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="1 5"
        />
        <path
          d="M56 38 48 40l4 7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="rotate(-46 52 40)"
        />
      </svg>
    </div>
  );
}
