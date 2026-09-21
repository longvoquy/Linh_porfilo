"use client";

import { useState } from "react";
import Link from "next/link";
import { LanguageToggle } from "@/components/nav/LanguageToggle";
import { getAllSections } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ArchCarousel } from "./ArchCarousel";
import { wrapIndex, yawForIndex } from "./carouselMath";
import { HatStage } from "./HatStage";

const sections = getAllSections();
/** The wheel opens on this section. */
const INITIAL_SECTION = "research";

export function HomeLanding() {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, sections.findIndex((section) => section.key === INITIAL_SECTION)),
  );
  const count = sections.length;

  return (
    <main className="relative min-h-svh overflow-hidden bg-cream text-navy">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.75),transparent_60%)]"
      />

      {/* The navbar is hidden on Home, so the language control lives here instead. */}
      <div className="absolute right-5 top-5 z-30">
        <LanguageToggle />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 px-6 pt-20 md:grid-cols-[1fr_1.5fr_1fr] md:items-center md:pt-14 lg:max-w-352 lg:grid-cols-[1fr_2.5fr_1fr] lg:gap-4 lg:pt-10">
        <div>
          <p className="font-heading text-xl italic">{t("home.hello")}</p>
          <h1 className="mt-2 text-5xl font-semibold leading-[1.05] md:text-6xl">
            <span className="block">{t("home.welcome")}</span>
            <span className="block text-gold">{t("home.journey")}</span>
          </h1>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-navy/70">{t("home.body")}</p>
          <Link
            href={`/${sections[activeIndex].key}`}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-medium text-cream shadow-lg transition hover:bg-navy/90"
          >
            {t("home.start")}
            <span aria-hidden className="text-gold">
              ✦
            </span>
          </Link>
        </div>

        <HatStage
          yaw={yawForIndex(activeIndex, count)}
          count={count}
          onSpin={() => setActiveIndex((index) => wrapIndex(index + 1, count))}
          onSelect={setActiveIndex}
        />

        <blockquote className="hidden font-heading text-3xl italic leading-relaxed text-gold-ink md:block">
          “{t("home.quote")}”
        </blockquote>
      </div>

      <ArchCarousel activeIndex={activeIndex} onChange={setActiveIndex} />

      <p className="mt-2 pb-8 text-center text-[11px] uppercase tracking-[0.28em] text-navy/70">
        {t("home.hatHint")}
      </p>
    </main>
  );
}
