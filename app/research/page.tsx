"use client";

import { ActivityGrid } from "@/components/activity/ActivityGrid";
import { getSectionItems, getSectionMeta } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";

const meta = getSectionMeta("research")!;
const items = getSectionItems("research");

export default function ResearchPage() {
  const { localize } = useTranslation();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-10 text-3xl font-semibold text-navy">{localize(meta.label)}</h1>
      <ActivityGrid items={items} />
    </main>
  );
}
