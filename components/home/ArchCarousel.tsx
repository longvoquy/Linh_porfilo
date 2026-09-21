"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getAllSections } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { archBase, ringOffset, wrapIndex } from "./carouselMath";
import { sectionIcons } from "./sectionIcons";

const sections = getAllSections();

/**
 * The arches stand on a ring that echoes the hat's brim: the front of an
 * ellipse, with `archBase` placing every base on it. Measured off the
 * reference art, whose ring fits a circle of radius ~986px through the arch
 * bases — it predicted the active arch's base to within a pixel — giving an
 * outermost arch 25.2° around, three 8.4° steps.
 *
 * The lift was the thing that was wrong before: 3.5%·offset² only reached 31%
 * of an arch's height at the edge where the ring wants 47%, so the row read as
 * a flat line rather than a curve.
 *
 * A and B are the ellipse's semi-axes, as percentages of an arch's width and
 * height: A puts the first neighbour 88% of a width sideways, B lifts the
 * outermost 47% of a height.
 */
const STEP_DEG = 8.4;
const ARC_A = 602;
const ARC_B = 494;
/**
 * Lean per step. Deliberately far short of the 25.2° a fully radial arch would
 * take: the reference keeps its arches close to upright, as objects standing
 * on a ring in perspective would be, and only hints at the splay.
 */
const TILT_DEG = 3.2;
/** Each step away from the active arch is this much smaller; the active one is a touch larger. */
const SHRINK = 0.05;
const ACTIVE_SCALE = 1.04;
const SWIPE_THRESHOLD = 40;

type Props = {
  activeIndex: number;
  onChange: (index: number) => void;
};

function ArrowButton({
  direction,
  label,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="z-20 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy text-gold shadow-md transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-5 w-5"
      >
        <path d={direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

export function ArchCarousel({ activeIndex, onChange }: Props) {
  const { localize, t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // Both wheel rotation and emphasis run on the same spring, so an arch never
  // swings into place ahead of its own scale.
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 30 };
  const dragged = useRef(false);
  const count = sections.length;

  const go = (delta: number) => onChange(wrapIndex(activeIndex + delta, count));

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
  };

  // Every arch is a real link. Non-active ones just bring themselves to the
  // front on a plain click; modified clicks (new tab, etc.) keep native behaviour.
  const handleArchClick = (event: MouseEvent<HTMLAnchorElement>, index: number, active: boolean) => {
    if (dragged.current) {
      event.preventDefault();
      return;
    }
    if (active || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onChange(index);
  };

  return (
    <section
      aria-label={t("carousel.label")}
      onKeyDown={handleKeyDown}
      className="relative mx-auto w-full max-w-6xl px-4"
    >
      <div className="flex items-center">
        <ArrowButton direction="prev" label={t("carousel.previous")} onClick={() => go(-1)} />

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragStart={() => {
            dragged.current = true;
          }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE_THRESHOLD) go(1);
            else if (info.offset.x > SWIPE_THRESHOLD) go(-1);
            // Let the click that follows a drag pass first, then re-enable clicks.
            window.setTimeout(() => {
              dragged.current = false;
            }, 0);
          }}
          className="relative mx-2 h-60 flex-1 touch-pan-y overflow-x-clip"
        >
          {sections.map((section, index) => {
            const offset = ringOffset(index, activeIndex, count);
            const active = offset === 0;
            const distance = Math.abs(offset);
            const base = archBase(offset, STEP_DEG, ARC_A, ARC_B);
            const Icon = sectionIcons[section.key];

            return (
              <motion.div
                key={section.key}
                initial={false}
                animate={{
                  x: `${base.x}%`,
                  y: `${base.y}%`,
                  rotate: -offset * TILT_DEG,
                  scale: active ? ACTIVE_SCALE : 1 - distance * SHRINK,
                }}
                transition={spring}
                // Everything pivots on the base, so the lean and the emphasis
                // turn and shrink the arch in place instead of sliding its
                // base off the ring.
                style={{ zIndex: 10 - distance, transformOrigin: "50% 100%" }}
                className="absolute bottom-2 left-1/2 -ml-16 w-32 md:-ml-18 md:w-36"
              >
                <Link
                  href={`/${section.key}`}
                  draggable={false}
                  aria-current={active ? "true" : undefined}
                  onClick={(event) => handleArchClick(event, index, active)}
                  className={`flex h-44 flex-col items-center justify-center gap-3 rounded-t-[999px] rounded-b-2xl border px-2 pb-5 pt-6 text-center backdrop-blur-md transition-colors ${
                    active
                      ? "border-gold bg-navy text-gold shadow-gold-glow"
                      : "border-gold/40 bg-ivory/60 text-navy shadow-arch hover:border-gold hover:bg-ivory/80"
                  }`}
                >
                  <Icon className="h-10 w-10 text-gold" />
                  <span className="font-heading text-base font-semibold leading-tight">
                    {localize(section.label)}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <ArrowButton direction="next" label={t("carousel.next")} onClick={() => go(1)} />
      </div>
    </section>
  );
}
