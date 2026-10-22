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
/** A video taller than it is wide (a phone clip) is shown at a fixed height instead of full column width. */
function isPortrait(media: { width?: number; height?: number }): boolean {
  return media.width !== undefined && media.height !== undefined && media.height > media.width;
}

export function Chapter({ chapter, index, onOpenImage }: Props) {
  const { localize, t } = useTranslation();
  const { item } = chapter;

  const documents = item.media.filter((m) => m.type === "pdf" && m.src);
  // YouTube clips are linked from the content file; Cloudinary clips arrive on `chapter.videos`.
  const youtube = item.media.filter((m) => m.type === "video" && m.externalUrl);
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
        viewport={{ once: true, amount: "some", margin: "0px 0px -80px 0px" }}
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
          {item.links && item.links.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {item.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-1.5 text-sm text-gold-ink transition hover:border-navy hover:bg-navy hover:text-cream"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
                    </svg>
                    {localize(link.label)}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {/* Every document (certificate, paper, report, EN/VI copy) is a labelled pill, even when there is just one. */}
          {documents.length > 0 && (
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
          featureSide={item.gallery?.featureSide}
        />

        {(chapter.videos.length > 0 || youtube.length > 0) && (
          <div className={chapter.images.length > 0 ? "mt-10 sm:mt-14" : ""}>
            <p className="text-center text-[11px] uppercase tracking-[0.28em] text-navy/50">{t("chapters.videos")}</p>
            {/* One clip per row, centred and as large as the column allows; a phone clip is held to a narrower width. */}
            <div className="mt-5 flex flex-col items-center gap-6 sm:gap-8">
              {youtube.map((video, i) => (
                <div key={video.externalUrl} className={`w-full overflow-hidden rounded-2xl bg-navy ${isPortrait(video) ? "max-w-sm" : "max-w-4xl"}`}>
                  <iframe
                    src={video.externalUrl}
                    title={video.alt ? localize(video.alt) : `${localize(item.title)} — video ${i + 1}`}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    style={{ aspectRatio: `${video.width ?? 16} / ${video.height ?? 9}` }}
                    className="block w-full border-0"
                  />
                </div>
              ))}
              {chapter.videos.map((video, i) => (
                <div key={video.id} className={`w-full overflow-hidden rounded-2xl bg-navy ${isPortrait(video) ? "max-w-sm" : "max-w-4xl"}`}>
                  <video
                    controls
                    controlsList="nodownload"
                    onContextMenu={(event) => event.preventDefault()}
                    playsInline
                    preload="none"
                    poster={video.poster}
                    src={video.src}
                    aria-label={`${localize(item.title)} — video ${youtube.length + i + 1}`}
                    style={{ aspectRatio: `${video.width} / ${video.height}` }}
                    className="block max-h-[80vh] w-full bg-navy object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.section>
    </MotionConfig>
  );
}
