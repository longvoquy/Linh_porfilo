"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransitionLink } from "@/components/transition/useTransitionLink";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { SectionMeta } from "@/lib/types";
import { publishedSections } from "./navSections";

/**
 * "Previous / next section" cards at the foot of every portfolio section, so a
 * visitor who has finished reading one can walk straight into the next.
 * Rendered once from the layout; it shows nothing on pages that aren't sections.
 */
export function SectionPager() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const index = publishedSections.findIndex(({ meta }) => pathname === `/${meta.key}`);
  if (index === -1) return null;

  const previous = publishedSections[index - 1]?.meta;
  const next = publishedSections[index + 1]?.meta;
  if (!previous && !next) return null;

  return (
    <nav aria-label={t("pager.label")} className="mx-auto max-w-6xl px-6 pb-20 sm:pb-28">
      {/* An empty cell holds the place of a missing neighbour, so "next" stays on the right. */}
      <div className="grid gap-4 border-t border-gold/25 pt-10 sm:grid-cols-2 sm:pt-14">
        {previous ? (
          <PagerLink section={previous} direction="previous" />
        ) : (
          <div aria-hidden className="hidden sm:block" />
        )}
        {next && <PagerLink section={next} direction="next" />}
      </div>
    </nav>
  );
}

function PagerLink({ section, direction }: { section: SectionMeta; direction: "previous" | "next" }) {
  const { localize, t } = useTranslation();
  const transitionClick = useTransitionLink();
  const isNext = direction === "next";
  const arrow = (
    <span
      aria-hidden
      className={`inline-block transition-transform motion-reduce:transition-none ${
        isNext ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"
      }`}
    >
      {isNext ? "→" : "←"}
    </span>
  );

  return (
    <Link
      href={`/${section.key}`}
      onClick={transitionClick(`/${section.key}`)}
      className={`group flex touch-manipulation flex-col gap-1 rounded-xl border border-gold/30 bg-ivory px-6 py-5 transition-colors hover:border-gold hover:bg-navy/5 ${
        isNext ? "items-end text-right" : "items-start text-left"
      }`}
    >
      <span className="text-[11px] uppercase tracking-[0.2em] text-gold-ink">
        {isNext ? (
          <>
            {t("pager.next")} {arrow}
          </>
        ) : (
          <>
            {arrow} {t("pager.previous")}
          </>
        )}
      </span>
      <span className="font-heading text-2xl font-semibold leading-tight text-navy">
        {localize(section.label)}
      </span>
    </Link>
  );
}
