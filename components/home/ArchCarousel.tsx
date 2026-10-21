"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
} from "framer-motion";
import { getAllSections } from "@/lib/getContent";
import type { SectionMeta } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { archBase, archOpacity, wrapIndex, wrapOffset } from "./carouselMath";
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
/** Pointer travel (px) before a press becomes a drag — and stops being a click. */
const CLICK_SLOP = 6;
/** One step of the wheel is the first neighbour's sideways offset: 88% of an arch's width. */
const STEP_WIDTH_RATIO = 0.88;

type Props = {
  activeIndex: number;
  onChange: (index: number) => void;
  /** A plain click on the active arch: open its section (Home animates the way in). */
  onEnter: (href: string) => void;
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

type ArchProps = {
  section: SectionMeta;
  index: number;
  /** Wheel position in steps, fractional while dragging. */
  pos: MotionValue<number>;
  active: boolean;
  label: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>, index: number, active: boolean) => void;
};

/**
 * One arch. Its place on the ring is derived from the wheel position, so a drag
 * can hold it anywhere between two stops and a release only has to animate that
 * one number.
 */
function Arch({ section, index, pos, active, label, onClick }: ArchProps) {
  const count = sections.length;
  const Icon = sectionIcons[section.key];
  const offset = useTransform(pos, (p) => wrapOffset(index, p, count));
  const x = useTransform(offset, (o) => `${archBase(o, STEP_DEG, ARC_A, ARC_B).x}%`);
  const y = useTransform(offset, (o) => `${archBase(o, STEP_DEG, ARC_A, ARC_B).y}%`);
  const rotate = useTransform(offset, (o) => -o * TILT_DEG);
  // Largest at the front, easing down to the neighbour's size one step out.
  const scale = useTransform(offset, (o) => {
    const distance = Math.abs(o);
    const neighbour = 1 - SHRINK;
    return distance < 1
      ? ACTIVE_SCALE - distance * (ACTIVE_SCALE - neighbour)
      : 1 - distance * SHRINK;
  });
  const opacity = useTransform(offset, (o) => archOpacity(o, count));
  const zIndex = useTransform(offset, (o) => Math.round(10 - Math.abs(o)));

  return (
    <motion.div
      // Everything pivots on the base, so the lean and the emphasis turn and
      // shrink the arch in place instead of sliding its base off the ring.
      style={{ x, y, rotate, scale, opacity, zIndex, transformOrigin: "50% 100%" }}
      className="absolute bottom-2 left-1/2 -ml-16 w-32 md:-ml-18 md:w-36"
    >
      <Link
        href={`/${section.key}`}
        draggable={false}
        aria-current={active ? "true" : undefined}
        onClick={(event) => onClick(event, index, active)}
        className={`flex h-44 flex-col items-center justify-center gap-3 rounded-t-[999px] rounded-b-2xl border px-2 pb-5 pt-6 text-center backdrop-blur-md transition-colors ${
          active
            ? "border-gold bg-navy text-gold shadow-gold-glow"
            : "border-gold/40 bg-ivory/60 text-navy shadow-arch hover:border-gold hover:bg-ivory/80"
        }`}
      >
        <Icon className="h-10 w-10 text-gold" />
        <span className="font-heading text-base font-semibold leading-tight">{label}</span>
      </Link>
    </motion.div>
  );
}

type DragState = { startX: number; startPos: number; stepPx: number; pointerId: number; moving: boolean };

export function ArchCarousel({ activeIndex, onChange, onEnter }: Props) {
  const { localize, t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // The wheel's position, in steps. It follows the pointer while dragging and
  // runs on a spring otherwise, so an arch never swings into place ahead of
  // its own scale.
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 30 };
  const pos = useMotionValue(activeIndex);
  const settling = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<DragState | null>(null);
  const dragged = useRef(false);
  const front = useRef(activeIndex);
  // The section highlighted while a drag is in progress; null the rest of the time.
  const [dragShown, setDragShown] = useState<number | null>(null);
  const shown = dragShown ?? activeIndex;
  const row = useRef<HTMLDivElement>(null);
  const count = sections.length;

  const go = (delta: number) => onChange(wrapIndex(activeIndex + delta, count));

  const settleTo = (target: number) => {
    settling.current?.stop();
    settling.current = animate(pos, target, spring);
  };

  // A new active section from outside the drag (arrows, keys, a click, the
  // hat): turn the wheel there by the short way round.
  useEffect(() => {
    front.current = activeIndex;
    if (drag.current?.moving) return;
    const here = Math.round(pos.get());
    let step = wrapIndex(activeIndex - here, count);
    if (step > count / 2) step -= count;
    if (step !== 0 || pos.get() !== here) settleTo(here + step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  useEffect(() => () => settling.current?.stop(), []);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
  };

  // Drag the wheel: the arches follow the pointer step by step and the
  // highlight moves with them, but the hat stays put until release, when the
  // wheel settles on the nearest section and the hat turns to it as it does for
  // any other change. Capture only starts once the pointer has moved past the
  // slop, so a plain click still reaches its link.
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const arch = row.current?.querySelector("a");
    const width = arch?.getBoundingClientRect().width ?? 140;
    drag.current = {
      startX: event.clientX,
      startPos: pos.get(),
      stepPx: Math.max(60, width * STEP_WIDTH_RATIO),
      pointerId: event.pointerId,
      moving: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.startX;
    if (!state.moving) {
      if (Math.abs(dx) < CLICK_SLOP) return;
      state.moving = true;
      dragged.current = true;
      settling.current?.stop();
      event.currentTarget.setPointerCapture(state.pointerId);
    }
    // Dragging right pulls the left-hand arches toward the front, like a track.
    pos.set(state.startPos - dx / state.stepPx);
    // Only the highlight follows the drag; the hat is told on release.
    const nearest = wrapIndex(Math.round(pos.get()), count);
    if (nearest !== front.current) {
      front.current = nearest;
      setDragShown(nearest);
    }
  };

  const handlePointerEnd = () => {
    const state = drag.current;
    drag.current = null;
    if (!state?.moving) return;
    const target = Math.round(pos.get());
    const nearest = wrapIndex(target, count);
    setDragShown(null);
    if (nearest !== activeIndex) onChange(nearest);
    settleTo(target);
    // Let the click that follows a drag pass first, then re-enable clicks.
    window.setTimeout(() => {
      dragged.current = false;
    }, 0);
  };

  // Every arch is a real link. A plain click on a non-active one brings it to
  // the front; on the active one it opens the section through `onEnter`.
  // Modified clicks (new tab, etc.) keep native behaviour.
  const handleArchClick = (event: MouseEvent<HTMLAnchorElement>, index: number, active: boolean) => {
    if (dragged.current) {
      event.preventDefault();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (active) onEnter(event.currentTarget.getAttribute("href") ?? "/");
    else onChange(index);
  };

  return (
    <section
      aria-label={t("carousel.label")}
      onKeyDown={handleKeyDown}
      className="relative mx-auto w-full max-w-6xl px-4"
    >
      <div className="flex items-center">
        <ArrowButton direction="prev" label={t("carousel.previous")} onClick={() => go(-1)} />

        <div
          ref={row}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="relative mx-2 h-60 flex-1 cursor-grab touch-pan-y select-none overflow-x-clip active:cursor-grabbing"
        >
          {sections.map((section, index) => (
            <Arch
              key={section.key}
              section={section}
              index={index}
              pos={pos}
              active={index === shown}
              label={localize(section.label)}
              onClick={handleArchClick}
            />
          ))}
        </div>

        <ArrowButton direction="next" label={t("carousel.next")} onClick={() => go(1)} />
      </div>
    </section>
  );
}
