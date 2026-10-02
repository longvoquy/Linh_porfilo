"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTransitionLink } from "@/components/transition/useTransitionLink";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { publishedSections } from "./navSections";

/**
 * A strip of tabs under the main bar, shown only while a portfolio section is
 * open, so visitors can hop between sections without going back through Home.
 * It lives inside the header, so it hides and shows with the bar.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const { localize, t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const transitionClick = useTransitionLink();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const onSection = publishedSections.some(({ meta }) => pathname === `/${meta.key}`);

  // On narrow screens the strip scrolls sideways; keep the current tab in view.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [pathname, reduceMotion]);

  if (!onSection) return null;

  return (
    <nav aria-label={t("nav.sections")} className="border-t border-gold/15">
      {/* `w-fit` + `mx-auto` centres the tabs when they fit and lets them scroll when they don't. */}
      {/* `py-1.5` with the matching negative margin gives the focus ring room inside the
          scroll area (which would otherwise clip it) without changing the strip's height. */}
      <ul className="mx-auto -my-1.5 flex w-fit max-w-full overflow-x-auto px-3 py-1.5 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {publishedSections.map(({ meta }) => {
          const href = `/${meta.key}`;
          const current = pathname === href;
          return (
            <li key={meta.key} className="shrink-0">
              <Link
                ref={current ? activeRef : undefined}
                href={href}
                onClick={transitionClick(href)}
                aria-current={current ? "page" : undefined}
                className={`relative block touch-manipulation whitespace-nowrap px-3 py-3 text-sm transition-colors sm:px-4 ${
                  current ? "font-medium text-navy" : "text-navy/70 hover:text-navy"
                }`}
              >
                {localize(meta.label)}
                {current && (
                  <motion.span
                    aria-hidden
                    layoutId="section-tab-rule"
                    transition={
                      reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }
                    }
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold sm:inset-x-4"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
