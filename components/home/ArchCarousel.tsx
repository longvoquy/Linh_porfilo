"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getAllSections, getPublishedItems } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ringOffset, wrapIndex } from "./carouselMath";
import { sectionIcons } from "./sectionIcons";

const sections = getAllSections();

/** Centre-to-centre distance between arches, as a % of one arch's width (<100 = they overlap slightly). */
const SPACING = 88;
/** Vertical lift per offset², as a % of one arch's height — the row sags in the middle like a bowl. */
const LIFT = 3.5;
/** Lean per step from the active arch. Tops lean toward the centre, following the ring. */
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
      className="relative mx-auto w-full max-w-5xl px-4"
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
            const Icon = sectionIcons[section.key];
            const hasContent = getPublishedItems(section.key).length > 0;

            return (
              <motion.div
                key={section.key}
                initial={false}
                animate={{
                  x: `${offset * SPACING}%`,
                  y: `${-offset * offset * LIFT}%`,
                  rotate: -offset * TILT_DEG,
                  scale: active ? ACTIVE_SCALE : 1 - distance * SHRINK,
                }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 30 }}
                style={{ zIndex: 10 - distance }}
                className="absolute bottom-2 left-1/2 -ml-16 w-32 md:-ml-18 md:w-36"
              >
                <Link
                  href={`/${section.key}`}
                  draggable={false}
                  aria-current={active ? "true" : undefined}
                  onClick={(event) => handleArchClick(event, index, active)}
                  className={`flex h-44 flex-col items-center justify-center gap-3 rounded-t-[999px] rounded-b-2xl border px-2 pb-5 pt-6 text-center transition-colors ${
                    active
                      ? "border-gold bg-navy text-gold shadow-gold-glow"
                      : "border-gold/50 bg-ivory/75 text-navy shadow-arch hover:border-gold hover:bg-ivory"
                  }`}
                >
                  <Icon className="h-10 w-10 text-gold" />
                  <span className="font-heading text-base font-semibold leading-tight">
                    {localize(section.label)}
                  </span>
                  {!hasContent && (
                    <span className="text-[10px] uppercase tracking-widest opacity-70">
                      {t("comingSoon.title")}
                    </span>
                  )}
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
