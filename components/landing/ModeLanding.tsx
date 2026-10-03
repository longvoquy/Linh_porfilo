"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "@/components/decor/Sparkles";
import { useCanWalk } from "@/components/exhibition/walk/useCanWalk";
import { LanguageToggle } from "@/components/nav/LanguageToggle";
import { useTransitionLink } from "@/components/transition/useTransitionLink";
import { useTranslation } from "@/lib/i18n/useTranslation";

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 0c.5 4.3 3.2 7 7.5 7.5v1C11.2 9 8.5 11.7 8 16c-.5-4.3-3.2-7-7.5-7.5v-1C4.8 7 7.5 4.3 8 0Z" />
    </svg>
  );
}

const buttonBase =
  "flex min-w-60 flex-col items-center gap-1.5 rounded-2xl border px-8 py-4 text-center shadow-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink";

/**
 * The first page: two ways into the gallery. Each button runs the same navy
 * disc as moving between pages elsewhere on the site, then opens the exhibition
 * in that mode.
 */
export function ModeLanding() {
  const { t } = useTranslation();
  const transitionClick = useTransitionLink();
  const canWalk = useCanWalk();

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-cream px-6 py-20 text-navy">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.75),transparent_60%)]"
      />

      {/* Heritage etchings, shown only where the corners are wide enough for them
          to read as illustration rather than clutter. They are ink-only cutouts,
          so the page's cream shows through. */}
      <Image
        src="/decor/one-pillar-pagoda.webp"
        alt=""
        loading="eager"
        width={900}
        height={716}
        sizes="(min-width: 1280px) 28rem, 20rem"
        className="pointer-events-none absolute bottom-0 left-0 hidden w-80 select-none opacity-45 md:block xl:w-md"
      />
      <Image
        src="/decor/lotus.webp"
        alt=""
        loading="eager"
        width={900}
        height={697}
        sizes="(min-width: 1280px) 26rem, 18rem"
        className="pointer-events-none absolute bottom-0 right-0 hidden w-72 select-none opacity-45 md:block xl:w-104"
      />
      <Sparkles className="inset-x-[12%] top-24 hidden h-[26rem] md:block" />

      <div className="absolute right-4 top-4 z-10">
        <LanguageToggle />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <p className="flex items-center justify-center gap-2 font-heading text-xl italic">
          {t("landing.welcome")}
          <Star className="h-3.5 w-3.5 text-gold" />
        </p>
        <h1 className="text-gold-leaf mt-2 text-5xl font-semibold leading-[1.05] md:text-6xl">
          {t("landing.title")}
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-navy/70">{t("landing.body")}</p>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row">
          <Link
            href="/exhibition"
            onClick={transitionClick("/exhibition")}
            className={`${buttonBase} border-gold/50 bg-navy text-cream hover:bg-navy/90`}
          >
            <span className="font-heading text-2xl font-semibold">{t("landing.normal")}</span>
            <span className="text-xs text-cream/80">{t("landing.normalHint")}</span>
          </Link>

          {canWalk ? (
            <Link
              href="/exhibition/walk"
              onClick={transitionClick("/exhibition/walk")}
              className={`${buttonBase} border-gold/60 bg-ivory text-navy hover:bg-white`}
            >
              <span aria-hidden className="flex gap-1">
                {["W", "A", "S", "D"].map((key) => (
                  <kbd
                    key={key}
                    className="grid h-6 w-6 place-items-center rounded border border-gold/60 bg-cream font-mono text-[11px] text-navy"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
              <span className="font-heading text-2xl font-semibold">{t("landing.walk")}</span>
              <span className="text-xs text-navy/70">{t("landing.walkHint")}</span>
            </Link>
          ) : (
            <div
              aria-disabled="true"
              className={`${buttonBase} cursor-not-allowed border-navy/15 bg-navy/5 text-navy/70 shadow-none`}
            >
              <span className="font-heading text-2xl font-semibold">{t("landing.walk")}</span>
              <span className="text-xs">{t("landing.walkUnavailable")}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
