"use client";

import { useEffect } from "react";
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

const pillClass =
  "pointer-events-auto absolute left-4 top-4 rounded-full border border-gold/40 bg-ivory/95 px-4 py-2 text-sm text-navy shadow hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink";

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

      {walk ? (
        <button type="button" onClick={onExitWalk} className={pillClass}>
          {t("exhibition.walkExit")}
        </button>
      ) : (
        canWalk && (
          <button type="button" onClick={onEnterWalk} className={pillClass}>
            {t("exhibition.walk")}
          </button>
        )
      )}

      <div className="pointer-events-auto absolute right-4 top-4">
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
              <button
                type="button"
                aria-pressed={closeUp}
                onClick={onToggleCloseUp}
                className="mt-4 rounded-full border border-navy/30 px-4 py-1.5 text-sm hover:bg-navy hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
              >
                {closeUp ? t("exhibition.stepBack") : t("exhibition.closer")}
              </button>
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
