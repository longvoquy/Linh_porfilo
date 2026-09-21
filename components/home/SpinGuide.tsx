"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

const ARC = "M14 46C58 10 182 10 226 46";

/**
 * The "click to spin" guide arching over the hat's apex, with an arrow curling
 * down at each end. The label rides the same arc as the arrows, so it stays a
 * single drawn gesture rather than a caption with decoration bolted on.
 */
export function SpinGuide({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <svg viewBox="0 0 240 56" className={className} role="presentation">
      <defs>
        <path id="spin-guide-arc" d={ARC} fill="none" />
      </defs>

      <g
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.75"
      >
        {/* Left arrow, tangent to the arc's start. */}
        <path d="M14 46 8 34M14 46l12-4" />
        {/* Right arrow, mirrored. */}
        <path d="M226 46l6-12M226 46l-12-4" />
      </g>

      <text
        className="fill-current font-sans"
        fontSize="10"
        letterSpacing="3.2"
        textAnchor="middle"
      >
        <textPath href="#spin-guide-arc" startOffset="50%">
          {t("home.spin").toUpperCase()}
        </textPath>
      </text>
    </svg>
  );
}
