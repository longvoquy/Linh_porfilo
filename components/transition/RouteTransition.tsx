"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The "into the hat" navigation, both ways. A navy disc — the hat's own colour
 * — opens from the middle of the screen, covers the page while the next route
 * loads, then closes back to the middle to reveal it.
 *
 *   in   Home → a section: the hat zooms at the viewer, the disc opens behind
 *        it (after ZOOM_LEAD), then closes over the section.
 *   out  anywhere → Home, the same film run backwards: the disc opens, then
 *        closes onto a hat that starts huge in the middle, spinning, and
 *        shrinks back into its place. Home reports `arrived` once its hat is
 *        drawn, so the disc never closes onto an empty stage.
 *
 * It lives in the root layout so the cover survives the route change: the old
 * page unmounts under it, and the new one is only revealed once it is in.
 *
 *   zoom     the disc is opening (and, going in, the hat zooming)
 *   covered  the disc is full; navigating, waiting for the new page
 *   reveal   the disc closes (derived: covered + the new page is in)
 */
export type TransitionStage = "idle" | "zoom" | "covered" | "reveal";
export type TransitionDirection = "in" | "out";

/** Going in, the hat zooms on its own for this long before the disc opens. */
const ZOOM_LEAD = 0.35;
const OPEN_DURATION = 0.5;
export const CLOSE_DURATION = 0.6;
/** Reveal anyway if the new page never arrives, so the site cannot stay covered. */
const COVER_TIMEOUT_MS = 10_000;

type RouteTransitionValue = {
  stage: TransitionStage;
  direction: TransitionDirection;
  /** Into a section from Home; ignored while a transition is running. */
  enter: (href: string) => void;
  /** Back to Home; ignored while a transition is running. */
  goHome: () => void;
  /** Home's hat is on screen, so a transition heading home may reveal it. */
  arrived: () => void;
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
  const reduceMotion = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<Phase>("idle");
  const [direction, setDirection] = useState<TransitionDirection>("in");
  const [target, setTarget] = useState<string | null>(null);
  const [homeArrived, setHomeArrived] = useState(false);
  // Disc geometry, measured at the click: the screen's centre, and a radius
  // that reaches its farthest corner.
  const [disc, setDisc] = useState({ x: 0, y: 0, r: 0 });
  const timeout = useRef<number | undefined>(undefined);

  // The new page is in once the pathname matches: without a loading.tsx the
  // router only commits the route after its data has arrived. Home also has
  // to have drawn its hat.
  const pageIn = pathname === target && (direction === "in" || homeArrived);
  const stage: TransitionStage =
    phase === "forced" || (phase === "covered" && pageIn) ? "reveal" : phase;

  const start = useCallback(
    (href: string, dir: TransitionDirection) => {
      if (phase !== "idle" || href === pathname) return;
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      setDisc({ x, y, r: Math.hypot(x, y) });
      setTarget(href);
      setDirection(dir);
      setHomeArrived(false);
      setPhase("zoom");
      router.prefetch(href);
    },
    [phase, pathname, router],
  );

  const enter = useCallback((href: string) => start(href, "in"), [start]);
  const goHome = useCallback(() => start("/", "out"), [start]);
  const arrived = useCallback(() => setHomeArrived(true), []);

  const value = useMemo(
    () => ({ stage, direction, enter, goHome, arrived }),
    [stage, direction, enter, goHome, arrived],
  );

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
            initial={reduceMotion ? { opacity: 0 } : { scale: 0 }}
            animate={reduceMotion ? { opacity: open ? 1 : 0 } : { scale: open ? 1 : 0 }}
            transition={
              reduceMotion
                ? { duration: 0.25 }
                : open
                  ? {
                      delay: direction === "in" ? ZOOM_LEAD : 0,
                      duration: OPEN_DURATION,
                      ease: [0.64, 0, 0.78, 0],
                    }
                  : { duration: CLOSE_DURATION, ease: [0.22, 1, 0.36, 1] }
            }
            onAnimationComplete={handleComplete}
          />
          {/* Only if the next page is slow: a gold thread, like the first-load
              loader, fading in once the disc has been full for a moment. */}
          <div
            className={`relative h-px w-40 overflow-hidden bg-gold/25 transition-opacity ${
              stage === "covered" ? "opacity-100 delay-500 duration-500" : "opacity-0 duration-150"
            }`}
          >
            <div className="h-full w-1/3 bg-gold-lit motion-safe:animate-loader-sweep motion-reduce:mx-auto motion-reduce:animate-pulse" />
          </div>
        </div>
      )}
    </RouteTransitionContext.Provider>
  );
}
