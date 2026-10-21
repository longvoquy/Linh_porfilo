"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LanguageToggle } from "@/components/nav/LanguageToggle";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { ExhibitPiece } from "./pieces";

type Props = {
  pieces: ExhibitPiece[];
  /** 0 is the entrance; 1..pieces.length are the paintings. */
  stop: number;
  closeUp: boolean;
  onGo: (stop: number) => void;
  onToggleCloseUp: () => void;
  /** A mouse and keyboard are at hand, so walking is on offer. */
  canWalk: boolean;
  /** While walking: the painting in view (an index into `pieces`, or null), and whether the mouse is captured. */
  walk: { focus: number | null; locked: boolean } | null;
  onEnterWalk: () => void;
  onExitWalk: () => void;
};

const buttonClass =
  "pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-gold/40 bg-ivory/95 text-xl text-navy shadow transition-opacity hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink disabled:cursor-default disabled:opacity-30";

/**
 * Normal / WASD, styled like the language toggle beside it. WASD needs a mouse
 * and keyboard, so elsewhere it stays visible but disabled.
 */
function ModeSwitch({
  walking,
  canWalk,
  onTour,
  onWalk,
}: {
  walking: boolean;
  canWalk: boolean;
  onTour: () => void;
  onWalk: () => void;
}) {
  const { t } = useTranslation();
  const options = [
    { key: "tour", label: t("exhibition.modeNormal"), active: !walking, enabled: true, select: onTour },
    {
      key: "walk",
      label: t("exhibition.modeWalk"),
      active: walking,
      enabled: canWalk,
      select: onWalk,
    },
  ];

  return (
    <div
      role="group"
      aria-label={t("exhibition.mode")}
      className="relative flex items-center rounded-full border border-gold/30 bg-ivory/95 p-1 text-sm font-medium shadow"
    >
      {options.map(({ key, label, active, enabled, select }) => (
        <button
          key={key}
          type="button"
          aria-pressed={active}
          aria-disabled={!enabled}
          title={enabled ? undefined : t("exhibition.modeWalkUnavailable")}
          onClick={() => {
            if (enabled && !active) select();
          }}
          className={`group relative z-10 touch-manipulation px-3 py-2 tracking-wide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink sm:py-1.5 ${
            enabled ? "" : "cursor-not-allowed"
          }`}
        >
          {active && (
            <motion.span
              layoutId="mode-switch-pill"
              className="absolute inset-0 -z-10 rounded-full bg-navy"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span
            className={`transition-colors ${
              active ? "text-cream" : enabled ? "text-navy/70 group-hover:text-navy" : "text-navy/40"
            }`}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * The note that opens beside a painting when the visitor looks closer. It is
 * keyed by painting in the parent, so closing it lasts until the next close-up.
 */
function PaintingNote({ title, text }: { title: string; text: string }) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <motion.aside
      aria-label={t("exhibition.noteLabel")}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      // Waits for the camera to settle on the painting before appearing.
      transition={{ duration: reducedMotion ? 0 : 0.3, delay: reducedMotion ? 0 : 0.5 }}
      className="pointer-events-auto absolute inset-x-4 top-20 rounded-2xl border border-gold/40 bg-ivory/95 p-5 pr-12 text-navy shadow-lg md:inset-x-auto md:right-8 md:top-1/2 md:w-80 md:-translate-y-1/2"
    >
      <button
        type="button"
        aria-label={t("exhibition.noteClose")}
        onClick={() => setOpen(false)}
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-navy/70 hover:bg-navy/10 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
      >
        <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M3 3l10 10M13 3 3 13" />
        </svg>
      </button>
      <p className="text-xs tracking-widest text-gold-ink uppercase">{t("exhibition.noteLabel")}</p>
      <h3 className="font-heading mt-1 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-navy/80">{text}</p>
    </motion.aside>
  );
}

/**
 * Everything the visitor reads or presses. The canvas is decorative; this layer
 * is the accessible one — real buttons, real text, arrow-key navigation.
 */
export function ExhibitionHud({
  pieces,
  stop,
  closeUp,
  onGo,
  onToggleCloseUp,
  canWalk,
  walk,
  onEnterWalk,
  onExitWalk,
}: Props) {
  const { t, localize } = useTranslation();
  const last = pieces.length;
  const piece = walk
    ? walk.focus === null
      ? null
      : pieces[walk.focus]
    : stop > 0
      ? pieces[stop - 1]
      : null;
  const number = walk ? (walk.focus ?? 0) + 1 : stop;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (walk) {
        // Walking owns the arrow keys; once the mouse is released, Esc leaves the mode.
        if (event.key === "Escape" && !walk.locked) onExitWalk();
        return;
      }
      if (event.key === "ArrowRight") onGo(stop + 1);
      else if (event.key === "ArrowLeft") onGo(stop - 1);
      else if (event.key === "Escape" && closeUp) onToggleCloseUp();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop, closeUp, walk, onGo, onToggleCloseUp, onExitWalk]);

  return (
    <div className="pointer-events-none absolute inset-0">
      <h1 className="sr-only">{t("exhibition.title")}</h1>

      <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
        <ModeSwitch walking={walk !== null} canWalk={canWalk} onTour={onExitWalk} onWalk={onEnterWalk} />
        <LanguageToggle />
      </div>

      {walk && !walk.locked && (
        <p className="absolute inset-x-0 top-20 mx-auto w-fit max-w-[90%] rounded-full bg-navy/85 px-5 py-2 text-center text-sm text-cream">
          {t("exhibition.walkResume")}
        </p>
      )}

      {!walk && (
        <>
          <button
            type="button"
            aria-label={t("exhibition.previous")}
            disabled={stop <= 0}
            onClick={() => onGo(stop - 1)}
            className={`${buttonClass} absolute left-3 top-1/2 -translate-y-1/2`}
          >
            <span aria-hidden>‹</span>
          </button>
          <button
            type="button"
            aria-label={t("exhibition.next")}
            disabled={stop >= last}
            onClick={() => onGo(stop + 1)}
            className={`${buttonClass} absolute right-3 top-1/2 -translate-y-1/2`}
          >
            <span aria-hidden>›</span>
          </button>
        </>
      )}

      {closeUp && !walk && piece && (
        <PaintingNote key={piece.slug} title={localize(piece.title)} text={localize(piece.description)} />
      )}

      <section
        key={walk ? `walk-${walk.focus}` : stop}
        aria-live="polite"
        className="pointer-events-auto absolute inset-x-4 bottom-4 rounded-2xl border border-gold/30 bg-ivory/95 p-5 text-navy shadow-lg md:inset-x-auto md:bottom-8 md:left-8 md:max-w-md"
      >
        {piece ? (
          <>
            <p className="text-xs tracking-widest text-gold-ink uppercase">
              {number} / {last}
            </p>
            <h2 className="font-heading mt-1 text-2xl font-semibold">{localize(piece.title)}</h2>
            {piece.date && <p className="text-sm text-gold-ink">{piece.date}</p>}
            <p className="mt-2 text-sm text-navy/80">{localize(piece.caption)}</p>
            {!walk && (
              <>
                <button
                  type="button"
                  aria-pressed={closeUp}
                  onClick={onToggleCloseUp}
                  className="mt-4 rounded-full border border-navy/30 px-4 py-1.5 text-sm hover:bg-navy hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
                >
                  {closeUp ? t("exhibition.stepBack") : t("exhibition.closer")}
                </button>
                {closeUp && <p className="mt-2 text-xs text-navy/70">{t("exhibition.panHint")}</p>}
              </>
            )}
          </>
        ) : walk ? (
          <p className="text-sm text-navy/80">{t("exhibition.walkHint")}</p>
        ) : (
          <>
            <p className="text-xs tracking-widest text-gold-ink uppercase">{t("exhibition.entrance")}</p>
            <p className="font-heading mt-1 text-2xl font-semibold">{t("exhibition.subtitle")}</p>
            <p className="mt-3 text-sm text-navy/80">{t("exhibition.intro")}</p>
            <button
              type="button"
              onClick={() => onGo(1)}
              className="mt-4 rounded-full bg-navy px-5 py-2 text-sm text-cream hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
            >
              {t("exhibition.begin")}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
