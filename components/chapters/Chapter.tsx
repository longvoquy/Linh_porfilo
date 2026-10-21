"use client";

import { MotionConfig, motion } from "framer-motion";
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
  const { item } = chapter;

  const documents = item.media.filter((m) => m.type === "pdf" && m.src);
  const number = String(index + 1).padStart(2, "0");
  // Prefixed with the section so two sections can never collide on this id,
  // even though slugs are already unique per content file today.
  const headingId = `chapter-${item.section}-${item.slug}`;

  return (
    // `reducedMotion="user"` drops the slide for people who ask for less motion
    // (the fade stays). Branching `initial` on `useReducedMotion()` instead made
    // the server markup differ from the client's, a hydration mismatch.
    <MotionConfig reducedMotion="user">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
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
          {documents.length === 1 && (
            <a
              href={documents[0].src}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-medium text-gold-ink underline underline-offset-4 transition hover:text-navy"
            >
              {documents[0].alt ? localize(documents[0].alt) : t("activity.viewCertificate")}
            </a>
          )}
          {/* Several documents (certificates, a paper and its report, EN/VI copies) get a labelled list. */}
          {documents.length > 1 && (
            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-navy/50">{t("activity.documents")}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {documents.map((doc, i) => (
                  <li key={doc.src}>
                    <a
                      href={doc.src}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-1.5 text-sm text-gold-ink transition hover:border-navy hover:bg-navy hover:text-cream"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z M14 3v5h5 M9 13h6 M9 17h4" />
                      </svg>
                      {doc.alt ? localize(doc.alt) : `${t("activity.viewCertificate")} ${i + 1}`}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </header>

        <ChapterGallery
          images={chapter.images}
          chapterIndex={index}
          onOpen={onOpenImage}
          title={localize(item.title)}
        />
      </motion.section>
    </MotionConfig>
  );
}
