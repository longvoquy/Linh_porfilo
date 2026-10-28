"use client";

import { ActivityGrid } from "@/components/activity/ActivityGrid";
import { getSectionItems, getSectionMeta } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";

const meta = getSectionMeta("art-portfolio")!;
const items = getSectionItems("art-portfolio");

/** The paintings hung in a 3D gallery, deployed separately from this site. */
const EXHIBITION_URL = "https://linh-exhibition.vercel.app";

export default function ArtPortfolioPage() {
  const { localize, t } = useTranslation();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">{localize(meta.label)}</h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-navy/70 sm:text-lg">{t("art.intro")}</p>
      <a
        href={EXHIBITION_URL}
        target="_blank"
        rel="noreferrer"
        className="mb-10 mt-4 inline-flex items-center gap-2 rounded-full border border-gold/40 px-4 py-1.5 text-sm text-gold-ink transition hover:border-navy hover:bg-navy hover:text-cream"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1 M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
        </svg>
        {t("art.exhibition")}
      </a>
      <ActivityGrid items={items} />
    </main>
  );
}
