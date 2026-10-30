"use client";

import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AboutMePage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold text-navy sm:text-5xl">{t("nav.about")}</h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-navy/70 sm:text-lg">{t("about.intro")}</p>
    </main>
  );
}
