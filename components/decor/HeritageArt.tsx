/**
 * Background line art, drawn as strokes rather than fills so it reads as a
 * pen-and-ink etching and stays light behind the page. Both pieces are
 * decorative: `aria-hidden`, no pointer events, and they hide below `md`
 * where the column is too narrow for them to be anything but noise.
 */

const ink = {
  stroke: "currentColor",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Tam quan gate: a three-bay temple gate under a tiled roof, with trees. */
export function TempleEtching({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 190" aria-hidden className={className} {...ink}>
      <g strokeWidth="1.1">
        {/* Upper tier. The eave sags between the corners and flicks up at the
            đao tips, which is what makes the roof read as Vietnamese. */}
        <path d="M96 30h48" />
        <path d="M96 30 64 64M144 30l32 34" />
        <path d="M40 50q10 12 24 14 56 12 112 0 14-2 24-14" />
        <path d="M74 52q46 9 92 0" />
        {/* Ridge ornament */}
        <path d="M112 30q8-9 16 0" />

        {/* Upper storey, tying the two roofs together */}
        <path d="M80 66v16M160 66v16" />

        {/* Lower tier */}
        <path d="M76 82h88" />
        <path d="M76 82 40 118M164 82l36 36" />
        <path d="M12 102q12 14 28 16 80 16 160 0 16-2 28-16" />
        <path d="M54 102q66 11 132 0" />

        {/* Three bays of the gate */}
        <path d="M46 122v54M90 122v54M150 122v54M194 122v54" />
        <path d="M90 158q30-30 60 0" />
        <path d="M54 164q14-18 28 0M158 164q14-18 28 0" />
        {/* Plinth */}
        <path d="M40 176h160" />
        <path d="M32 182h176" />
      </g>

      {/* Trees */}
      <g strokeWidth="1">
        <path d="M19 176v-30" />
        <path d="M4 148q2-10 10-10 2-10 11-9 9 1 10 10 8 1 7 9z" />
        <path d="M19 160l-8-7M19 152l7-6" />
        <path d="M221 176v-26" />
        <path d="M208 152q2-9 9-9 2-9 10-8 8 1 9 9 7 1 6 8z" />
        <path d="M221 162l-7-6M221 156l6-5" />
      </g>

      {/* Clouds */}
      <g strokeWidth="0.9" opacity="0.7">
        <path d="M6 36q8-9 18-4 4-10 14-6 8 3 7 10" />
        <path d="M196 26q9-8 18-2 5-9 14-4 7 4 6 11" />
      </g>
    </svg>
  );
}

/** Lotus: two blooms, a bud and pads, as a pen sketch. */
export function LotusSketch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 180" aria-hidden className={className} {...ink}>
      <g strokeWidth="1.1">
        {/* Open bloom */}
        <path d="M86 96q-4-30 14-46 18 16 14 46" />
        <path d="M86 96q-20-20-16-42 22 8 30 34" />
        <path d="M114 96q20-20 16-42-22 8-30 34" />
        <path d="M86 96q-26-8-34-28 24-4 40 16" />
        <path d="M114 96q26-8 34-28-24-4-40 16" />
        <path d="M84 96q16 10 32 0" />
        {/* Stem */}
        <path d="M100 100v56" />

        {/* Second bloom, smaller */}
        <path d="M160 128q-3-20 10-31 13 11 10 31" />
        <path d="M160 128q-14-13-11-28 15 5 20 23" />
        <path d="M180 128q14-13 11-28-15 5-20 23" />
        <path d="M158 128q11 7 22 0" />
        <path d="M170 131v32" />

        {/* Bud */}
        <path d="M48 140q-7-18 3-30 11 11 5 30" />
        <path d="M50 140q4 4 8 0" />
        <path d="M53 142v22" />
      </g>

      {/* Pads */}
      <g strokeWidth="1">
        <path d="M18 158q18-14 40-2-18 13-40 2Z" />
        <path d="M30 157l6-9" />
        <path d="M118 166q22-15 46-2-22 14-46 2Z" />
        <path d="M132 165l7-10" />
        {/* Water */}
        <path d="M8 172q30 6 60 0t60 0 60 0 24 0" opacity="0.6" />
      </g>
    </svg>
  );
}
