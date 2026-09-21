"use client";

import { ComingSoon } from "@/components/ComingSoon";
import { useTranslation } from "@/lib/i18n/useTranslation";

/** Placeholder route so the nav link resolves; swap `ComingSoon` for real content. */
export default function AboutMePage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="mb-10 text-3xl font-semibold text-navy">{t("nav.about")}</h1>
      <ComingSoon />
    </main>
  );
}
