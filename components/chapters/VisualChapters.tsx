"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Chapter as ChapterData, LocalizedString } from "@/lib/types";
import { ComingSoon } from "@/components/ComingSoon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { DictionaryKey } from "@/lib/i18n/useTranslation";
import { Chapter } from "./Chapter";
import { ChapterLightbox } from "./ChapterLightbox";

type Props = {
  chapters: ChapterData[];
  /** Section label from content/sections.ts, localized here. */
  label: LocalizedString;
  /**
   * i18n key for this section's editorial intro paragraph (e.g.
   * "awards.intro" vs "volunteer.intro") — each section owns its own copy,
   * this component just looks it up.
   */
  introKey: DictionaryKey;
};

/** Which chapter is open in the lightbox, and at which image. */
type Viewing = { chapterIndex: number; imageIndex: number };

/**
 * Client root for a section's visual-chapter page (Awards, Volunteer, ...).
 * Receives one section's fully-resolved chapters from the server (no
 * Cloudinary code reaches the browser) and owns the only interactive state on
 * the page: which image is open fullscreen. Purely presentational — it has no
 * idea which section it's rendering beyond the label/intro/chapters it was
 * handed, so it can never mix data across sections.
 */
export function VisualChapters({ chapters, label, introKey }: Props) {
  const { localize, t } = useTranslation();
  const [viewing, setViewing] = useState<Viewing | null>(null);

  if (chapters.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="mb-10 text-3xl font-semibold text-navy">{localize(label)}</h1>
        <ComingSoon />
      </main>
    );
  }

  const active = viewing ? chapters[viewing.chapterIndex] : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <header className="mb-16 sm:mb-24">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold-ink">
          {chapters.length} {t("chapters.count")}
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-navy sm:text-5xl">{localize(label)}</h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-navy/70 sm:text-lg">{t(introKey)}</p>
      </header>

      <div>
        {chapters.map((chapter, i) => (
          // The hairline rule and the gap between chapters come from one place,
          // so spacing stays even; the first chapter gets neither.
          <div
            key={chapter.item.slug}
            className="mt-20 border-t border-gold/25 pt-20 first:mt-0 first:border-t-0 first:pt-0 sm:mt-32 sm:pt-32"
          >
            <Chapter
              chapter={chapter}
              index={i}
              onOpenImage={(imageIndex) => setViewing({ chapterIndex: i, imageIndex })}
            />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {active && viewing && (
          <ChapterLightbox
            images={active.images}
            index={viewing.imageIndex}
            title={localize(active.item.title)}
            onIndexChange={(imageIndex) => setViewing({ ...viewing, imageIndex })}
            onClose={() => setViewing(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
