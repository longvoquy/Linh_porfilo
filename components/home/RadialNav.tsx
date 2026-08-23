"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getAllSections, getPublishedItems } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";

const sections = getAllSections();

/** Distance from the centre to each card, as a % of the square orbit container. */
const ORBIT_RADIUS = 35;
/** The first card sits straight above the core; the rest follow clockwise. */
const START_ANGLE = -90;

/**
 * Offsets from the container centre for the item at `index`, expressed as CSS
 * custom properties so the desktop position stays a pure percentage of the
 * container — it rescales with the viewport, and stays correct for any count.
 */
function orbitOffset(index: number, total: number): CSSProperties {
  const radians = ((START_ANGLE + (index / total) * 360) * Math.PI) / 180;
  return {
    "--x": `${(Math.cos(radians) * ORBIT_RADIUS).toFixed(3)}%`,
    "--y": `${(Math.sin(radians) * ORBIT_RADIUS).toFixed(3)}%`,
  } as CSSProperties;
}

/** Desktop-only absolute placement on the orbit; below `md` the items stack in flow. */
const ORBIT_POSITION =
  "md:absolute md:left-[calc(50%_+_var(--x))] md:top-[calc(50%_+_var(--y))] md:-translate-x-1/2 md:-translate-y-1/2";

export function RadialNav() {
  const { localize, t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const cardVariants = {
    hidden: { opacity: 0, scale: reduceMotion ? 1 : 0.9 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.45, ease: "easeOut" as const },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      // Children are the section cards only — the core runs its own entrance
      // first, and `delayChildren` holds the orbit back until it has landed.
      variants={{ show: { transition: { delayChildren: 0.45, staggerChildren: 0.08 } } }}
      className="relative flex w-full max-w-sm flex-col items-center gap-3 md:block md:aspect-square md:max-w-[min(88vw,calc(100svh-9rem))]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 hidden aspect-square w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/[0.07] md:block"
      />

      {/* Core circle */}
      <div className="w-40 sm:w-48 md:absolute md:left-1/2 md:top-1/2 md:w-[36%] md:-translate-x-1/2 md:-translate-y-1/2">
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          suppressHydrationWarning
          className="flex aspect-square w-full flex-col items-center justify-center rounded-full border border-black/10 bg-white/70 px-6 text-center shadow-[0_24px_70px_-30px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-black/40">
            {t("hero.greeting")}
          </span>
          <span className="mt-2 text-lg font-semibold leading-tight tracking-tight sm:text-xl md:text-2xl">
            Vũ Khánh Linh
          </span>
          <span aria-hidden className="mt-3 h-px w-8 bg-black/15" />
          <span className="mt-3 text-[10px] uppercase tracking-[0.28em] text-black/40">
            {t("home.portfolio")}
          </span>
        </motion.div>
      </div>

      {/* Section cards, evenly distributed around the core */}
      {sections.map((section, index) => {
        const hasContent = getPublishedItems(section.key).length > 0;

        return (
          <div
            key={section.key}
            style={orbitOffset(index, sections.length)}
            className={`w-full md:w-36 lg:w-40 xl:w-44 ${ORBIT_POSITION}`}
          >
            <motion.div
              variants={cardVariants}
              whileHover={reduceMotion ? undefined : { scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              suppressHydrationWarning
            >
              <Link
                href={`/${section.key}`}
                className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/70 p-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)] backdrop-blur-md transition duration-300 hover:border-black/20 hover:bg-white hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.4)] md:flex-col md:items-start md:gap-0"
              >
                <span className="text-[10px] tabular-nums tracking-widest text-black/30">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-sm font-semibold leading-snug md:mt-1.5 md:flex-none">
                  {localize(section.label)}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-black/35 md:mt-2">
                  {hasContent ? "→" : t("comingSoon.title")}
                </span>
              </Link>
            </motion.div>
          </div>
        );
      })}
    </motion.div>
  );
}
