"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getAllSections } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageToggle } from "./LanguageToggle";

type SlotRole = "prev" | "current" | "next";

// Circle is h-14 w-28 (56px radius). Side-slot x is derived from that radius so
// the left/right gap to the circle's rim stays symmetric by construction.
const CIRCLE_RADIUS = 56;
const PILL_WIDTH = 160; // w-40
const SIDE_SCALE = 0.82;
const SIDE_GAP_FROM_CIRCLE = 28;
const SIDE_X = CIRCLE_RADIUS + SIDE_GAP_FROM_CIRCLE + (PILL_WIDTH * SIDE_SCALE) / 2;

const SLOT_STYLE: Record<SlotRole, { x: number; y: number; rotate: number; scale: number }> = {
  prev: { x: -SIDE_X, y: -28, rotate: 0, scale: SIDE_SCALE },
  current: { x: 0, y: 30, rotate: 0, scale: 1 },
  next: { x: SIDE_X, y: -28, rotate: 0, scale: SIDE_SCALE },
};

const sections = getAllSections();
const WHEEL_COOLDOWN_MS = 450;

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { localize } = useTranslation();
  const lastNavigationRef = useRef(0);
  const wheelZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = wheelZoneRef.current;
    if (!zone) return;

    function handleWheel(event: WheelEvent) {
      if (Math.abs(event.deltaY) < 4) return;
      event.preventDefault();

      const now = Date.now();
      if (now - lastNavigationRef.current < WHEEL_COOLDOWN_MS) return;
      lastNavigationRef.current = now;

      const currentIndex = sections.findIndex((section) => `/${section.key}` === pathname);
      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex =
        currentIndex === -1
          ? direction > 0
            ? 0
            : sections.length - 1
          : (currentIndex + direction + sections.length) % sections.length;

      router.push(`/${sections[nextIndex].key}`);
    }

    zone.addEventListener("wheel", handleWheel, { passive: false });
    return () => zone.removeEventListener("wheel", handleWheel);
  }, [pathname, router]);

  // Home is its own radial navigation experience — the bar is hidden there only,
  // and stays active on every section page. (Declared after the hooks above so
  // hook order stays stable across routes.)
  if (pathname === "/") return null;

  const activeIndex = sections.findIndex((section) => `/${section.key}` === pathname);
  const centerIndex = activeIndex === -1 ? 0 : activeIndex;
  const count = sections.length;
  const slots: Array<{ role: SlotRole; section: (typeof sections)[number] }> = [
    { role: "prev", section: sections[(centerIndex - 1 + count) % count] },
    { role: "current", section: sections[centerIndex] },
    { role: "next", section: sections[(centerIndex + 1) % count] },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="pointer-events-auto text-sm font-semibold tracking-tight">
          Khánh Linh
        </Link>
        <div className="pointer-events-auto">
          <LanguageToggle />
        </div>
      </div>

      <div className="flex justify-center">
        <div ref={wheelZoneRef} className="relative flex flex-col items-center pb-6">
          <div
            aria-hidden
            className="relative z-10 h-14 w-28 rounded-b-full border border-t-0 border-black/10 bg-white shadow-md"
          />
          <div className="relative h-24 w-0">
            <AnimatePresence>
              {slots.map(({ role, section }) => {
                const href = `/${section.key}`;
                const active = pathname === href;
                const style = SLOT_STYLE[role];

                return (
                  <motion.div
                    key={section.key}
                    initial={{ x: style.x, y: style.y * 0.3, rotate: style.rotate, scale: 0.3, opacity: 0 }}
                    animate={{
                      x: style.x,
                      y: style.y,
                      rotate: style.rotate,
                      scale: style.scale,
                      opacity: role === "current" ? 1 : 0.65,
                    }}
                    exit={{ y: style.y * 0.3, scale: 0.3, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    className="absolute left-0 top-0 w-0"
                    style={{ zIndex: role === "current" ? 3 : 2 }}
                  >
                    <Link
                      href={href}
                      className={`block w-40 -translate-x-1/2 truncate rounded-full border px-3.5 py-2 text-center text-xs font-medium shadow-sm transition-colors ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white/95 text-black/70 backdrop-blur hover:text-black"
                      }`}
                    >
                      {localize(section.label)}
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
