"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ActivityGrid } from "@/components/activity/ActivityGrid";
import type { ActivityItem, Chapter as ChapterData, LocalizedString } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Chapter } from "./Chapter";
import { ChapterLightbox } from "./ChapterLightbox";

type Props = {
  /** The exhibition chapter(s): an ordinary visual chapter, resolved on the server. */
  chapters: ChapterData[];
  /** The paintings, shown as a grid under the exhibition. */
  paintings: ActivityItem[];
  label: LocalizedString;
  /** The paintings hung in a 3D gallery, deployed separately from this site. */
  exhibitionUrl: string;
};

/**
 * The Arts page: "01 / Exhibition" is a visual chapter (text and photos from its
 * Cloudinary folder), "02 / Art Portfolio" is the paintings grid with its own
 * title and intro. Owns the lightbox state for the exhibition photos.
 */
export function ArtsView({ chapters, paintings, label, exhibitionUrl }: Props) {
  const { localize, t } = useTranslation();
  const [viewing, setViewing] = useState<{ chapterIndex: number; imageIndex: number } | null>(null);
  const active = viewing ? chapters[viewing.chapterIndex] : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <header className="mb-16 sm:mb-24">
        <h1 className="text-4xl font-semibold text-navy sm:text-5xl">{localize(label)}</h1>
      </header>

      {chapters.map((chapter, i) => (
        <div key={chapter.item.slug} className="mb-20 sm:mb-32">
          <Chapter chapter={chapter} index={i} onOpenImage={(imageIndex) => setViewing({ chapterIndex: i, imageIndex })} />
        </div>
      ))}

      <section
        aria-labelledby="art-portfolio-title"
        className={chapters.length > 0 ? "border-t border-gold/25 pt-20 sm:pt-32" : ""}
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold-ink">
          {String(chapters.length + 1).padStart(2, "0")} <span className="px-1">/</span> {t("art.portfolio")}
        </p>
        <h2 id="art-portfolio-title" className="mt-3 text-2xl font-semibold text-navy sm:text-3xl">
          {t("art.title")}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy/70">{t("art.intro")}</p>
        <a
          href={exhibitionUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-10 mt-5 inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-1.5 text-sm text-gold-ink transition hover:border-navy hover:bg-navy hover:text-cream"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
          </svg>
          {t("art.exhibition")}
        </a>
        <ActivityGrid items={paintings} />
      </section>

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
