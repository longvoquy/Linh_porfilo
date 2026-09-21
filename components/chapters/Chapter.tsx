"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Chapter as ChapterData } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ChapterGallery } from "./ChapterGallery";

type Props = {
  chapter: ChapterData;
  /** Zero-based position; displayed as a padded "01 /" chapter number. */
  index: number;
  onOpenImage: (imageIndex: number) => void;
};

/**
 * One ActivityItem presented as a visual chapter: an editorial header (number,
 * title, category, year) followed by its gallery. Deliberately card-less —
 * chapters are separated by whitespace and a hairline rule rather than boxed
 * containers. Shared by every section that uses the chapter gallery; which
 * item this renders is entirely decided by the caller (`VisualChapters`),
 * which in turn only ever holds one section's chapters.
 */
export function Chapter({ chapter, index, onOpenImage }: Props) {
  const { localize, t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const { item } = chapter;

  const certificate = item.media.find((m) => m.type === "pdf");
  const number = String(index + 1).padStart(2, "0");
  // Prefixed with the section so two sections can never collide on this id,
  // even though slugs are already unique per content file today.
  const headingId = `chapter-${item.section}-${item.slug}`;

  return (
    <motion.section
      initial={reduceMotion ? undefined : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="scroll-mt-24"
      aria-labelledby={headingId}
    >
      <header className="mb-6 sm:mb-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold-ink">
          {number} <span className="px-1">/</span> {item.org ? localize(item.org) : localize(item.title)}
        </p>
        <h2 id={headingId} className="mt-3 text-2xl font-semibold text-navy sm:text-3xl">
          {localize(item.title)}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-navy/70">
          {item.tier && <span className="font-medium text-navy">{localize(item.tier)}</span>}
          {item.tier && item.date && <span aria-hidden="true">·</span>}
          {item.date && <span>{item.date}</span>}
        </div>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy/70">{localize(item.caption)}</p>
        {certificate?.src && (
          <a
            href={certificate.src}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-medium text-gold-ink underline underline-offset-4 transition hover:text-navy"
          >
            {t("activity.viewCertificate")}
          </a>
        )}
      </header>

      <ChapterGallery
        images={chapter.images}
        chapterIndex={index}
        onOpen={onOpenImage}
        title={localize(item.title)}
      />
    </motion.section>
  );
}
