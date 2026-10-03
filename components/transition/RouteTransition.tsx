"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

/**
 * Page-to-page navigation: a navy disc opens from the middle of the screen,
 * covers the page while the next route loads, then closes back to the middle
 * to reveal it.
 *
 * It lives in the root layout so the cover survives the route change: the old
 * page unmounts under it, and the new one is only revealed once it is in.
 *
 *   zoom     the disc is opening
 *   covered  the disc is full; navigating, waiting for the new page
 *   reveal   the disc closes (derived: covered + the new page is in)
 */
type TransitionStage = "idle" | "zoom" | "covered" | "reveal";

const OPEN_DURATION = 0.5;
const CLOSE_DURATION = 0.6;
/** Reveal anyway if the new page never arrives, so the site cannot stay covered. */
const COVER_TIMEOUT_MS = 10_000;

type RouteTransitionValue = {
  /** To another page, under the disc; ignored while a transition is running, or when already there. */
  navigate: (href: string) => void;
};

const RouteTransitionContext = createContext<RouteTransitionValue | null>(null);

export function useRouteTransition(): RouteTransitionValue {
  const value = useContext(RouteTransitionContext);
  if (!value) throw new Error("useRouteTransition must be used inside RouteTransitionProvider");
  return value;
}

/** `forced` is the timeout giving up on the new page: reveal whatever is there. */
type Phase = "idle" | "zoom" | "covered" | "forced";

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<string | null>(null);
  // Disc geometry, measured at the click: the screen's centre, and a radius
  // that reaches its farthest corner.
  const [disc, setDisc] = useState({ x: 0, y: 0, r: 0 });
  const timeout = useRef<number | undefined>(undefined);

  // The new page is in once the pathname matches: without a loading.tsx the
  // router only commits the route after its data has arrived.
  const pageIn = pathname === target;
  const stage: TransitionStage =
    phase === "forced" || (phase === "covered" && pageIn) ? "reveal" : phase;

  const navigate = useCallback(
    (href: string) => {
      if (phase !== "idle" || href === pathname) return;
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      setDisc({ x, y, r: Math.hypot(x, y) });
      setTarget(href);
      setPhase("zoom");
      router.prefetch(href);
    },
    [phase, pathname, router],
  );

  const value = useMemo(() => ({ navigate }), [navigate]);

  const open = stage === "zoom" || stage === "covered";

  const handleComplete = () => {
    if (stage === "zoom" && target) {
      setPhase("covered");
      router.push(target);
      timeout.current = window.setTimeout(() => setPhase("forced"), COVER_TIMEOUT_MS);
    } else if (stage === "reveal") {
      window.clearTimeout(timeout.current);
      setPhase("idle");
      setTarget(null);
    }
  };

  return (
    <RouteTransitionContext.Provider value={value}>
      {children}
      {phase !== "idle" && (
        // Covers the page from the click on, so nothing is clicked mid-transition.
        <div aria-hidden className="fixed inset-0 z-[70] grid place-items-center">
          {/* A real circle scaled with a transform, rather than a clip-path:
              the compositor runs a transform on the GPU, where a clip-path
              repaints the whole screen every frame. */}
          <motion.div
            className="absolute rounded-full bg-navy"
            style={{
              left: disc.x - disc.r,
              top: disc.y - disc.r,
              width: disc.r * 2,
              height: disc.r * 2,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: open ? 1 : 0 }}
            transition={
              open
                ? { duration: OPEN_DURATION, ease: [0.64, 0, 0.78, 0] }
                : { duration: CLOSE_DURATION, ease: [0.22, 1, 0.36, 1] }
            }
            onAnimationComplete={handleComplete}
          />
          {/* Only if the next page is slow: a gold thread, with a bead of gold
              running along it, fading in once the disc has been full for a moment. */}
          <div
            className={`relative h-px w-40 overflow-hidden bg-gold/25 transition-opacity ${
              stage === "covered" ? "opacity-100 delay-500 duration-500" : "opacity-0 duration-150"
            }`}
          >
            <div className="h-full w-1/3 bg-gold-lit animate-loader-sweep" />
          </div>
        </div>
      )}
    </RouteTransitionContext.Provider>
  );
}
