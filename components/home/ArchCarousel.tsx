"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getAllSections, getPublishedItems } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ringOffset, wrapIndex } from "./carouselMath";
import { sectionIcons } from "./sectionIcons";

const sections = getAllSections();

/** Horizontal gap between arches, as a % of one arch's width. */
const SPACING = 108;
/** Vertical lift per offset², as a % of one arch's height — bends the row into an arc. */
const LIFT = 3.5;
const TILT_DEG = 5;
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
          className="relative mx-2 h-60 flex-1 touch-pan-y overflow-x-clip md:h-72"
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
                  rotate: offset * TILT_DEG,
                  scale: 1 - distance * 0.07,
                  opacity: distance === 3 ? 0.45 : 1,
                }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 30 }}
                style={{ zIndex: 10 - distance }}
                className="absolute bottom-2 left-1/2 -ml-14 w-28 md:-ml-16 md:w-32"
              >
                <Link
                  href={`/${section.key}`}
                  draggable={false}
                  aria-current={active ? "true" : undefined}
                  onClick={(event) => handleArchClick(event, index, active)}
                  className={`flex h-44 flex-col items-center justify-end gap-2 rounded-t-[999px] rounded-b-2xl border px-2 pb-5 pt-10 text-center transition-colors md:h-48 ${
                    active
                      ? "border-gold bg-navy text-gold shadow-[0_0_28px_rgba(201,164,92,0.55)]"
                      : "border-gold/40 bg-cream/80 text-navy hover:border-gold"
                  }`}
                >
                  <Icon className="h-8 w-8 text-gold" />
                  <span className="font-heading text-base font-semibold leading-tight">
                    {localize(section.label)}
                  </span>
                  {!hasContent && (
                    <span className="text-[9px] uppercase tracking-widest opacity-60">
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
