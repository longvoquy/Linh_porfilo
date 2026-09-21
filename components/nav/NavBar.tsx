"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandMark } from "@/components/decor/BrandMark";
import { getAllSections } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { DictionaryKey } from "@/lib/i18n/useTranslation";
import { LanguageToggle } from "./LanguageToggle";

const sections = getAllSections();

type NavItem = { href: string; key: DictionaryKey };

/** Top-level destinations, in the order they appear. Portfolio owns the sections. */
const ITEMS: NavItem[] = [
  { href: "/", key: "nav.home" },
  { href: "/about", key: "nav.about" },
  { href: "/timeline", key: "nav.timeline" },
  { href: "/portfolio", key: "nav.portfolio" },
  { href: "/resume", key: "nav.resume" },
  { href: "/contact", key: "nav.contact" },
];

const PORTFOLIO = "/portfolio";

/** A section page counts as being under Portfolio, so the parent stays marked. */
function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === PORTFOLIO) {
    return pathname === PORTFOLIO || sections.some((s) => pathname === `/${s.key}`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4.5 6 8l3-3.5" />
    </svg>
  );
}

/** The gold rule under the current item. */
function ActiveRule() {
  return <span aria-hidden className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-gold" />;
}

export function NavBar() {
  const pathname = usePathname();
  const { localize, t } = useTranslation();
  const reduceMotion = useReducedMotion();
  // Each disclosure remembers the route it was opened on, so navigating away
  // closes it during render — no effect, and no cascading re-render.
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const [portfolioAt, setPortfolioAt] = useState<string | null>(null);
  const openMenu = menuAt === pathname;
  const openPortfolio = portfolioAt === pathname;
  const setOpenMenu = (open: boolean) => setMenuAt(open ? pathname : null);
  const setOpenPortfolio = (open: boolean) => setPortfolioAt(open ? pathname : null);
  const portfolioRef = useRef<HTMLDivElement>(null);

  // The dropdown closes on Escape, or on a pointer landing outside it.
  useEffect(() => {
    if (!openPortfolio) return;

    // Closes via the state setter itself, which is stable — the derived helper
    // would be a new function each render and re-subscribe on every one.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPortfolioAt(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!portfolioRef.current?.contains(event.target as Node)) setPortfolioAt(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openPortfolio]);

  const linkClass = (active: boolean) =>
    `relative py-1 text-sm transition-colors ${
      active ? "font-medium text-navy" : "text-navy/70 hover:text-navy"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-gold/20 bg-cream/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-navy transition-colors hover:text-gold-ink"
        >
          <BrandMark className="h-10 w-11" />
          <span className="whitespace-pre-line font-heading text-lg font-semibold leading-[1.1]">
            {t("nav.brand")}
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-7 lg:flex">
          {ITEMS.map((item) => {
            const active = isCurrent(pathname, item.href);

            if (item.href !== PORTFOLIO) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(active)}
                >
                  {t(item.key)}
                  {active && <ActiveRule />}
                </Link>
              );
            }

            return (
              <div key={item.href} ref={portfolioRef} className="relative">
                <div className="flex items-center gap-1">
                  <Link
                    href={PORTFOLIO}
                    aria-current={active ? "page" : undefined}
                    className={linkClass(active)}
                  >
                    {t(item.key)}
                    {active && <ActiveRule />}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpenPortfolio(!openPortfolio)}
                    aria-expanded={openPortfolio}
                    aria-label={t("nav.sections")}
                    className="rounded p-0.5 text-navy/70 transition-colors hover:text-navy"
                  >
                    <Chevron
                      className={`h-3 w-3 transition-transform ${openPortfolio ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {openPortfolio && (
                    <motion.ul
                      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: reduceMotion ? 0 : 0.15 }}
                      className="absolute right-0 top-full z-10 mt-3 w-56 overflow-hidden rounded-xl border border-gold/30 bg-ivory py-1 shadow-arch"
                    >
                      {sections.map((section) => {
                        const href = `/${section.key}`;
                        const current = pathname === href;
                        return (
                          <li key={section.key}>
                            <Link
                              href={href}
                              aria-current={current ? "page" : undefined}
                              className={`block px-4 py-2 text-sm transition-colors ${
                                current
                                  ? "bg-navy/5 font-medium text-navy"
                                  : "text-navy/70 hover:bg-navy/5 hover:text-navy"
                              }`}
                            >
                              {localize(section.label)}
                            </Link>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-6">
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setOpenMenu(!openMenu)}
            aria-expanded={openMenu}
            aria-controls="nav-menu"
            aria-label={t("nav.menu")}
            className="grid h-9 w-9 place-items-center rounded-full border border-gold/30 bg-ivory text-navy lg:hidden"
          >
            <svg
              viewBox="0 0 16 16"
              aria-hidden
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              {openMenu ? <path d="M3 3l10 10M13 3 3 13" /> : <path d="M2 4h12M2 8h12M2 12h12" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Below lg the destinations collapse into a disclosure, sections included. */}
      <AnimatePresence>
        {openMenu && (
          <motion.nav
            id="nav-menu"
            aria-label="Main"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="overflow-hidden border-t border-gold/20 lg:hidden"
          >
            <ul className="mx-auto max-w-7xl px-6 py-3">
              {ITEMS.map((item) => {
                const active = isCurrent(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block py-2 text-sm ${
                        active ? "font-medium text-navy" : "text-navy/70"
                      }`}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-2 border-t border-gold/20 pt-2">
                <p className="pb-1 text-[11px] uppercase tracking-[0.2em] text-gold-ink">
                  {t("nav.sections")}
                </p>
                <ul>
                  {sections.map((section) => (
                    <li key={section.key}>
                      <Link
                        href={`/${section.key}`}
                        className="block py-1.5 text-sm text-navy/70"
                      >
                        {localize(section.label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
