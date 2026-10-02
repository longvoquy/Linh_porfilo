"use client";

import { BrandMark } from "@/components/decor/BrandMark";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Full-page cover while the 3D hat loads, so the first thing seen is the whole
 * page arriving at once rather than a placeholder hat swapping for the real
 * one. It is in the server HTML, so it is up before anything else paints, and
 * fades out rather than unmounting.
 *
 * The visible text is the same in both languages: the saved language is only
 * read after hydration, and a caption flipping EN → VI mid-load would jar.
 */
export function PageLoader({ visible }: { visible: boolean }) {
  const { t } = useTranslation();

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-cream transition-[opacity,visibility] duration-700 ${
        visible ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,255,255,0.8),transparent_60%)]"
      />

      <BrandMark className="relative h-20 w-22 text-gold-ink animate-loader-float" />

      <p className="relative mt-5 font-heading text-3xl font-semibold text-navy">Vũ Khánh Linh</p>
      <p className="relative mt-1 text-[11px] uppercase tracking-[0.32em] text-navy/60">Portfolio</p>

      {/* A thread with a bead of gold running along it. */}
      <div aria-hidden className="relative mt-7 h-px w-40 overflow-hidden bg-gold/30">
        <div className="h-full w-1/3 bg-gold-ink animate-loader-sweep" />
      </div>

      <p role="status" className="sr-only">
        {visible ? t("home.loading") : ""}
      </p>
    </div>
  );
}
