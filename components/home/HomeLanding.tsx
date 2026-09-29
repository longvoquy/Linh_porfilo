"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SealStamp } from "@/components/decor/SealStamp";
import { Sparkles } from "@/components/decor/Sparkles";
import { getAllSections } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useRouteTransition } from "@/components/transition/RouteTransition";
import { ArchCarousel } from "./ArchCarousel";
import { HatHint } from "./HatHint";
import { HatStage } from "./HatStage";
import { PageLoader } from "./PageLoader";
import { wrapIndex, yawForIndex } from "./carouselMath";

const sections = getAllSections();
/**
 * Set once the hat has loaded in this tab. Coming back to Home client-side
 * remounts it, and the full-page loader is only for the first visit.
 */
let hatLoadedOnce = false;
/** Lift the loader after this long even if the hat never reports ready. */
const LOADER_TIMEOUT_MS = 10_000;
/** The wheel opens on this section. */
const INITIAL_SECTION = "research";

/**
 * Placeholders: point these at the real profiles before publishing. Anything
 * still set to "#" renders as a non-interactive mark rather than a dead link.
 */
const SOCIALS = [
  { key: "social.linkedin", href: "#", icon: LinkedInIcon },
  { key: "social.instagram", href: "#", icon: InstagramIcon },
  { key: "social.email", href: "#", icon: MailIcon },
] as const;

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 0c.5 4.3 3.2 7 7.5 7.5v1C11.2 9 8.5 11.7 8 16c-.5-4.3-3.2-7-7.5-7.5v-1C4.8 7 7.5 4.3 8 0Z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M3.2 5.7h2.1V13H3.2zM4.3 2.4a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6ZM7 5.7h2v1a2.4 2.4 0 0 1 2.1-1.1c2 0 2.6 1.3 2.6 3.1V13h-2.1V9.1c0-1-.2-1.8-1.2-1.8s-1.4.7-1.4 1.7V13H7Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="3.4" />
      <circle cx="8" cy="8" r="2.7" />
      <circle cx="11.4" cy="4.6" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    >
      <rect x="2" y="3.6" width="12" height="8.8" rx="1.6" />
      <path d="m2.6 4.8 5.4 3.6 5.4-3.6" />
    </svg>
  );
}

export function HomeLanding() {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      sections.findIndex((section) => section.key === INITIAL_SECTION),
    ),
  );
  const count = sections.length;
  // Reads the module flag only at mount: false on the server and on the first
  // hydration, so the loader is in the HTML and the markup matches.
  const [hatReady, setHatReady] = useState(() => hatLoadedOnce);
  const { stage, direction, enter, arrived } = useRouteTransition();
  const markHatReady = useCallback(() => {
    hatLoadedOnce = true;
    setHatReady(true);
    arrived();
  }, [arrived]);
  // Leaving: the hat zooms at the viewer. Arriving (the transition played
  // backwards): Home mounts under the cover with the hat still zoomed, and it
  // returns to its place as the cover lifts.
  const leaving = direction === "in" && stage !== "idle";
  const arriving = direction === "out" && (stage === "covered" || stage === "reveal");
  const returning = arriving && stage === "reveal";
  // Everything but the hat is hidden while it is zoomed, fading out as it
  // leaves and back in once it has mostly settled.
  const fade = `transition-opacity ${
    leaving || (arriving && !returning)
      ? "pointer-events-none opacity-0 duration-300"
      : "duration-500 delay-300"
  }`;

  useEffect(() => {
    const timer = window.setTimeout(markHatReady, LOADER_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [markHatReady]);

  return (
    <main className="relative min-h-svh overflow-hidden bg-cream text-navy">
      {/* Arriving through the transition, its cover is the loader. */}
      <PageLoader visible={!hatReady && !arriving} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.75),transparent_60%)]"
      />

      {/* Heritage etchings, shown only where the corners are wide enough for them
          to read as illustration rather than clutter. They are ink-only cutouts
          of the sources in asset/, made by scripts/prepare-decor.mjs so the
          parchment drops out and the page's cream shows through — re-run that
          script after replacing a source. */}
      <Image
        src="/decor/one-pillar-pagoda.webp"
        alt=""
        loading="eager"
        width={900}
        height={716}
        sizes="(min-width: 1280px) 28rem, 20rem"
        className={`pointer-events-none absolute bottom-0 left-0 hidden w-80 select-none md:block xl:w-md ${
          leaving || (arriving && !returning) ? "opacity-0" : "opacity-45"
        } ${fade}`}
      />
      <Image
        src="/decor/lotus.webp"
        alt=""
        loading="eager"
        width={900}
        height={697}
        sizes="(min-width: 1280px) 26rem, 18rem"
        className={`pointer-events-none absolute bottom-0 right-0 hidden w-72 select-none md:block xl:w-104 ${
          leaving || (arriving && !returning) ? "opacity-0" : "opacity-45"
        } ${fade}`}
      />
      <Sparkles className={`inset-x-[12%] top-24 hidden h-[26rem] md:block ${fade}`} />

      {/* The hat is framed centred in its 5:4 box, leaving ~12% of that box empty
          below the brim; under the hat's centre that reads as a 120px gap to the
          active arch. The negative margin closes a fifth of it. Kept to a fifth
          because the outer arches ride 53px higher than the active one, and
          pulling further would run them into the brim. */}
      <div className="relative mx-auto -mb-4 grid max-w-7xl gap-8 px-6 pt-12 md:grid-cols-[1fr_1.5fr_1fr] md:items-center lg:-mb-6 lg:max-w-352 lg:grid-cols-[1fr_2.5fr_1fr] lg:gap-4">
        <div className={fade}>
          <p className="flex items-center gap-2 font-heading text-xl italic">
            {t("home.hello")}
            <Star className="h-3.5 w-3.5 text-gold" />
          </p>
          <h1 className="mt-2 text-5xl font-semibold leading-[1.05] md:text-6xl">
            <span className="block">{t("home.welcome")}</span>
            <span className="text-gold-leaf block">{t("home.journey")}</span>
          </h1>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-navy/70">{t("home.body")}</p>
          <Link
            href={`/${sections[activeIndex].key}`}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              enter(`/${sections[activeIndex].key}`);
            }}
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-gold/50 bg-navy px-6 py-3 text-sm font-medium text-cream shadow-lg transition hover:bg-navy/90"
          >
            {t("home.start")}
            <Star className="h-3.5 w-3.5 text-gold" />
          </Link>

          <HatHint className="mt-8" />
        </div>

        <HatStage
          yaw={yawForIndex(activeIndex, count)}
          count={count}
          onSpin={() => setActiveIndex((index) => wrapIndex(index + 1, count))}
          onSelect={setActiveIndex}
          onReady={markHatReady}
          zooming={leaving}
          arriving={arriving}
          returning={returning}
        />

        <figure className={`hidden md:block ${fade}`}>
          <span aria-hidden className="block font-heading text-6xl leading-none text-gold">
            &ldquo;
          </span>
          <blockquote className="-mt-3 whitespace-pre-line font-heading text-2xl italic leading-relaxed text-gold-ink lg:text-3xl">
            {t("home.quote")}
          </blockquote>
          <figcaption className="mt-3 text-right font-heading text-base italic text-navy/70">
            — {t("home.quoteAuthor")}
          </figcaption>
          <SealStamp className="mt-6 ml-auto h-14 w-14" />
        </figure>
      </div>

      {/* The arches' backdrop blur is costly to repaint while they fade: drop it. */}
      <div className={`${fade} ${leaving || arriving ? "[&_a]:backdrop-blur-none" : ""}`}>
        <ArchCarousel activeIndex={activeIndex} onChange={setActiveIndex} onEnter={enter} />
      </div>

      <div className={`relative flex flex-col items-center gap-3 pb-10 pt-2 ${fade}`}>
        <ul className="flex items-center gap-3">
          {SOCIALS.map(({ key, href, icon: Icon }) => {
            const label = t(key);
            const disabled = href === "#";
            return (
              <li key={key}>
                {disabled ? (
                  <span
                    aria-label={label}
                    title={label}
                    className="grid h-9 w-9 place-items-center rounded-full bg-navy/70 text-gold/80"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                ) : (
                  <a
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noreferrer"
                    className="grid h-9 w-9 place-items-center rounded-full bg-navy text-gold transition hover:bg-navy/90"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        <p className="text-center text-[11px] uppercase tracking-[0.28em] text-navy/70">
          {t("home.scroll")}
        </p>
        <svg
          viewBox="0 0 16 10"
          aria-hidden
          className="h-2.5 w-4 animate-bounce text-gold motion-reduce:animate-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 2l6 6 6-6" />
        </svg>
      </div>
    </main>
  );
}
