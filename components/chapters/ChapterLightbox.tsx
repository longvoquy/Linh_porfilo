"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ChapterImage } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Props = {
  images: ChapterImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Localized chapter title, shown as context in the corner. */
  title: string;
};

/**
 * Fullscreen image viewer for a visual chapter. Shared across every section
 * that uses the chapter gallery (Awards, Volunteer, ...) — receives its
 * images and title as plain props, so it has no idea which section it's
 * showing. Follows the overlay patterns already used by ActivityDetail (fixed
 * backdrop, AnimatePresence, click-out to close) but with minimal chrome and
 * prev/next navigation, since this views a gallery rather than an item's
 * metadata.
 */
export function ChapterLightbox({ images, index, onIndexChange, onClose, title }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Element that had focus before opening, so we can restore it on close.
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const count = images.length;
  const image = images[index];

  const goNext = useCallback(() => onIndexChange((index + 1) % count), [index, count, onIndexChange]);
  const goPrev = useCallback(() => onIndexChange((index - 1 + count) % count), [index, count, onIndexChange]);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => restoreFocusRef.current?.focus?.();
  }, []);

  // Lock background scroll while open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goNext, goPrev]);

  if (!image) return null;

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="fixed inset-0 z-60 flex flex-col bg-navy/95 outline-none backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-4 text-cream/75 sm:px-6">
        {/* min-w-0 is required for `truncate` to work inside a flex row — without
            it the item won't shrink below its content size, and the sibling
            (counter/close) gets squeezed and wraps instead. */}
        <span className="min-w-0 flex-1 truncate pr-4 text-[11px] uppercase tracking-[0.28em]">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-4">
          {count > 1 && (
            <span className="text-xs tabular-nums text-gold">
              {index + 1} / {count}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="-m-2 p-2 text-sm font-medium text-cream/75 transition hover:text-gold"
          >
            {t("activity.close")}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-6">
        <motion.img
          key={image.id}
          src={image.full}
          alt=""
          width={image.width}
          height={image.height}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      {count > 1 && (
        <>
          <LightboxArrow side="left" label={t("chapters.previousImage")} onClick={goPrev} />
          <LightboxArrow side="right" label={t("chapters.nextImage")} onClick={goNext} />
        </>
      )}
    </motion.div>
  );
}

function LightboxArrow({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-cream/10 text-2xl leading-none text-cream/80 transition hover:bg-cream/20 hover:text-gold ${
        side === "left" ? "left-3 sm:left-6" : "right-3 sm:right-6"
      }`}
    >
      <span aria-hidden="true">{side === "left" ? "‹" : "›"}</span>
    </button>
  );
}
