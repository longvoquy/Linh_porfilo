"use client";

import Link from "next/link";
import { ActivityGrid } from "@/components/activity/ActivityGrid";
import { getSectionItems, getSectionMeta } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";

const meta = getSectionMeta("art-portfolio")!;
const items = getSectionItems("art-portfolio");

export default function ArtPortfolioPage() {
  const { t, localize } = useTranslation();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-navy">{localize(meta.label)}</h1>
        <Link
          href="/exhibition"
          className="rounded-full bg-navy px-5 py-2 text-sm text-cream hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
        >
          {t("exhibition.visit")}
        </Link>
      </div>
      <ActivityGrid items={items} />
    </main>
  );
}
