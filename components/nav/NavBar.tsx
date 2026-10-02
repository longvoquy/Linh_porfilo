"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandMark } from "@/components/decor/BrandMark";
import { useRouteTransition } from "@/components/transition/RouteTransition";
import { useTransitionLink } from "@/components/transition/useTransitionLink";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { DictionaryKey } from "@/lib/i18n/useTranslation";
import { LanguageToggle } from "./LanguageToggle";
import { allSections, publishedSections as sections } from "./navSections";
import { SectionTabs } from "./SectionTabs";

type NavItem = { href: string; key: DictionaryKey; ready: boolean; menu?: boolean };

/**
 * Top-level destinations, in the order they appear. Portfolio is a menu of the
 * sections rather than a page of its own, so it has no link.
 * Set `ready: true` once a page has real content (not just `ComingSoon`) to show it.
 */
const ALL_ITEMS: NavItem[] = [
  { href: "/", key: "nav.home", ready: true },
  { href: "/about", key: "nav.about", ready: false },
  { href: "/timeline", key: "nav.timeline", ready: false },
  { href: "/portfolio", key: "nav.portfolio", ready: sections.length > 0, menu: true },
  { href: "/resume", key: "nav.resume", ready: false },
  { href: "/contact", key: "nav.contact", ready: false },
];
const ITEMS = ALL_ITEMS.filter((item) => item.ready);

const PORTFOLIO = "/portfolio";

/** Scrolling down past this hides the bar; any upward scroll brings it back. */
const HIDE_AFTER = 120;
/** Ignore scroll deltas smaller than this so trackpad jitter doesn't flicker the bar. */
const SCROLL_JITTER = 6;
/** How long the pointer may stray off the Portfolio menu before it closes. */
const HOVER_CLOSE_DELAY_MS = 150;

/** A section page counts as being under Portfolio, so the parent stays marked. */
function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === PORTFOLIO) {
    return pathname === PORTFOLIO || allSections.some((s) => pathname === `/${s.key}`);
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

/** The gold rule under the current item; one shared element, so it glides between items. */
function ActiveRule({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.span
      aria-hidden
      layoutId="nav-active-rule"
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
      className="absolute -bottom-1.5 left-0 h-0.5 w-full rounded-full bg-gold"
    />
  );
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
  const portfolioButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  // A mouse hovering Portfolio opens it; `openedByHover` lets the click that
  // usually follows keep it open instead of toggling it shut again.
  const hoverCloseTimer = useRef<number>(undefined);
  const openedByHover = useRef(false);
  const { goHome } = useRouteTransition();
  const transitionClick = useTransitionLink();

  const [scrolled, setScrolled] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);
  const lastY = useRef(0);
  // An open menu keeps the bar on screen, whatever the scroll direction.
  const hidden = scrolledDown && !openMenu && !openPortfolio;

  // Links home play the hat transition backwards. Modified clicks (new tab,
  // etc.) keep native behaviour; so does a click on Home while already there.
  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goHome();
  };

  const handlePortfolioEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(hoverCloseTimer.current);
    if (!openPortfolio) {
      openedByHover.current = true;
      setOpenPortfolio(true);
    }
  };
  const handlePortfolioLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => {
      openedByHover.current = false;
      setPortfolioAt(null);
    }, HOVER_CLOSE_DELAY_MS);
  };
  const handlePortfolioClick = () => {
    const keepOpen = openedByHover.current && openPortfolio;
    openedByHover.current = false;
    if (!keepOpen) setOpenPortfolio(!openPortfolio);
  };

  useEffect(() => () => window.clearTimeout(hoverCloseTimer.current), []);

  // The bar tints once the page moves, and tucks away while reading downwards.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const delta = y - lastY.current;
      if (Math.abs(delta) < SCROLL_JITTER) return;
      lastY.current = y;
      setScrolledDown(delta > 0 && y > HIDE_AFTER);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Either disclosure closes on Escape, handing focus back to its button. Each
  // also closes on a pointer landing outside it (outside the bar, for the mobile panel).
  useEffect(() => {
    if (!openPortfolio && !openMenu) return;

    // Closes via the state setters themselves, which are stable — the derived
    // helpers would be new functions each render and re-subscribe on every one.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (openPortfolio) {
        setPortfolioAt(null);
        portfolioButtonRef.current?.focus();
      } else {
        setMenuAt(null);
        menuButtonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (openPortfolio && !portfolioRef.current?.contains(target)) setPortfolioAt(null);
      if (openMenu && !headerRef.current?.contains(target)) setMenuAt(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openPortfolio, openMenu]);

  const linkClass = (active: boolean) =>
    `relative touch-manipulation py-1 text-sm transition-colors ${
      active ? "font-medium text-navy" : "text-navy/70 hover:text-navy"
    }`;

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 border-b backdrop-blur transition-[transform,background-color,border-color,box-shadow] duration-300 focus-within:translate-y-0 motion-reduce:transition-none ${
        hidden ? "-translate-y-full" : "translate-y-0"
      } ${scrolled ? "border-gold/20 bg-cream/90 shadow-arch" : "border-transparent bg-cream/60"}`}
    >
      <a
        href="#main-content"
        className="sr-only rounded-full bg-navy px-4 py-2 text-sm text-cream focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-10"
      >
        {t("nav.skip")}
      </a>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        <Link
          href="/"
          onClick={handleHomeClick}
          className="flex shrink-0 touch-manipulation items-center gap-2.5 text-navy transition-colors hover:text-gold-ink"
        >
          <BrandMark className="h-10 w-11" />
          <span className="whitespace-pre-line font-heading text-lg font-semibold leading-[1.1]">
            {t("nav.brand")}
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-7 lg:flex">
          {ITEMS.map((item) => {
            const active = isCurrent(pathname, item.href);

            if (!item.menu) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={item.href === "/" ? handleHomeClick : undefined}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(active)}
                >
                  {t(item.key)}
                  {active && <ActiveRule reduceMotion={reduceMotion} />}
                </Link>
              );
            }

            return (
              <div
                key={item.href}
                ref={portfolioRef}
                className="relative"
                onPointerEnter={handlePortfolioEnter}
                onPointerLeave={handlePortfolioLeave}
              >
                <button
                  ref={portfolioButtonRef}
                  type="button"
                  onClick={handlePortfolioClick}
                  aria-expanded={openPortfolio}
                  aria-controls="nav-portfolio-menu"
                  className={`${linkClass(active)} flex items-center gap-1`}
                >
                  {t(item.key)}
                  <Chevron
                    className={`h-3 w-3 transition-transform motion-reduce:transition-none ${
                      openPortfolio ? "rotate-180" : ""
                    }`}
                  />
                  {active && <ActiveRule reduceMotion={reduceMotion} />}
                </button>

                <AnimatePresence>
                  {openPortfolio && (
                    <motion.div
                      id="nav-portfolio-menu"
                      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                      transition={{ duration: reduceMotion ? 0 : 0.15 }}
                      // `pt-3` (not a margin) bridges the gap under the button, so a
                      // pointer travelling down to the panel never leaves the hover area.
                      className="absolute right-0 top-full z-10 w-72 pt-3"
                    >
                      <div className="rounded-xl border border-gold/30 bg-ivory p-1.5 shadow-arch">
                        <p className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-[0.2em] text-gold-ink">
                          {t("nav.sections")}
                        </p>
                        <ul>
                          {sections.map(({ meta, count }) => {
                            const href = `/${meta.key}`;
                            const current = pathname === href;
                            return (
                              <li key={meta.key}>
                                <Link
                                  href={href}
                                  onClick={transitionClick(href)}
                                  aria-current={current ? "page" : undefined}
                                  className={`flex touch-manipulation items-baseline justify-between gap-4 rounded-lg px-3 py-2.5 transition-colors ${
                                    current
                                      ? "bg-navy/5 text-navy"
                                      : "text-navy/75 hover:bg-navy/5 hover:text-navy"
                                  }`}
                                >
                                  <span className="font-heading text-lg font-semibold leading-tight">
                                    {localize(meta.label)}
                                  </span>
                                  <span className="text-xs tabular-nums text-gold-ink">{count}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-6">
          <LanguageToggle />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpenMenu(!openMenu)}
            aria-expanded={openMenu}
            aria-controls="nav-menu"
            aria-label={t("nav.menu")}
            className="grid h-11 w-11 touch-manipulation place-items-center rounded-full border border-gold/30 bg-ivory text-navy lg:hidden"
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

      <SectionTabs />

      {/* Below lg the destinations collapse into a panel under the bar, sections included.
          It fades and slides (compositor-only) rather than animating its height. */}
      <AnimatePresence>
        {openMenu && (
          <motion.nav
            id="nav-menu"
            aria-label="Main"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain border-b border-gold/20 bg-cream shadow-arch lg:hidden"
          >
            <ul className="mx-auto max-w-7xl px-6 py-3">
              {ITEMS.filter((item) => !item.menu).map((item) => {
                const active = isCurrent(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={item.href === "/" ? handleHomeClick : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 touch-manipulation items-center text-base ${
                        active ? "font-medium text-navy" : "text-navy/70 active:text-navy"
                      }`}
                    >
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-2 border-t border-gold/20 pt-3">
                <p className="pb-1 text-[11px] uppercase tracking-[0.2em] text-gold-ink">
                  {t("nav.sections")}
                </p>
                <ul>
                  {sections.map(({ meta, count }) => {
                    const href = `/${meta.key}`;
                    const current = pathname === href;
                    return (
                      <li key={meta.key}>
                        <Link
                          href={href}
                          onClick={transitionClick(href)}
                          aria-current={current ? "page" : undefined}
                          className={`flex min-h-11 touch-manipulation items-baseline justify-between gap-4 py-2.5 ${
                            current ? "font-medium text-navy" : "text-navy/70 active:text-navy"
                          }`}
                        >
                          <span className="font-heading text-lg font-semibold leading-tight">
                            {localize(meta.label)}
                          </span>
                          <span className="text-xs tabular-nums text-gold-ink">{count}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
