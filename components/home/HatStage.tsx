"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAnimate, useReducedMotion } from "framer-motion";
import { CLOSE_DURATION } from "@/components/transition/RouteTransition";
import { useWebGLSupport } from "@/lib/webgl";
import { HatErrorBoundary } from "./HatErrorBoundary";
import { HatFallback } from "./HatFallback";
import { SpinGuide } from "./SpinGuide";

// three.js is only needed here, and needs a browser: load it on the client only.
const HatScene = dynamic(() => import("./HatScene"), {
  ssr: false,
  // PageLoader covers the page until the scene reports ready.
  loading: () => null,
});

/**
 * How much the stage grows while zooming into the hat. The navy disc of the
 * route transition overtakes it partway, so it never has to fill the screen.
 */
const ZOOM_SCALE = 2.4;
const ZOOM_DURATION = 0.85;

type Props = {
  yaw: number;
  count: number;
  onSpin: () => void;
  onSelect: (index: number) => void;
  /** The hat is on screen in its final form — 3D and textured, or the static fallback. */
  onReady?: () => void;
  /** Leaving Home: the hat flies to the middle of the screen and grows. */
  zooming?: boolean;
  /** Coming back to Home: mounted zoomed in, as `zooming` left it... */
  arriving?: boolean;
  /** ...and shrinking back into place as the cover lifts. */
  returning?: boolean;
};

export function HatStage({
  yaw,
  count,
  onSpin,
  onSelect,
  onReady,
  zooming = false,
  arriving = false,
  returning = false,
}: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const webgl = useWebGLSupport();
  // Until the scene has drawn its final texture (or given up), it stays hidden.
  const [settled, setSettled] = useState(false);

  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    if (settled || webgl === false) onReady?.();
  }, [settled, webgl, onReady]);

  // Fly the stage from where it sits to the middle of the screen, growing as
  // it goes; the transform does not move the layout around it. Arriving, it
  // starts there — the cover is still up — and flies back when `returning`.
  const zoomedOut = zooming || (arriving && !returning);
  useEffect(() => {
    const stage = scope.current;
    if (!stage) return;
    if (zoomedOut) {
      const rect = stage.getBoundingClientRect();
      animate(
        stage,
        {
          x: window.innerWidth / 2 - (rect.left + rect.width / 2),
          y: window.innerHeight / 2 - (rect.top + rect.height / 2),
          scale: ZOOM_SCALE,
        },
        zooming ? { duration: ZOOM_DURATION, ease: [0.55, 0, 0.75, 0.2] } : { duration: 0 },
      );
    } else if (returning) {
      animate(
        stage,
        { x: 0, y: 0, scale: 1 },
        // A touch longer than the cover closing, so the hat is still
        // settling as the page appears around it.
        { duration: CLOSE_DURATION + 0.3, ease: [0.22, 1, 0.36, 1] },
      );
    }
  }, [zoomedOut, zooming, returning, animate, scope]);

  return (
    <div
      ref={scope}
      className={`relative mx-auto aspect-[5/4] w-full max-w-xl md:max-w-none ${
        zooming || arriving ? "z-20" : ""
      }`}
    >
      <SpinGuide
        className={`absolute inset-x-0 top-0 z-10 mx-auto h-10 w-56 text-gold-ink transition-opacity duration-200 ${
          zooming || arriving ? "opacity-0" : ""
        }`}
      />
      {/* Ground shadow, in CSS rather than in the scene: a plane on the 3D ground
          runs past the bottom of the canvas, which cuts it off with a hard edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] top-[72%] h-[32%] bg-[radial-gradient(ellipse_at_center,rgba(84,66,42,0.22),rgba(84,66,42,0.09)_45%,transparent_72%)]"
      />
      {/* Decorative + pointer-only: the carousel is the accessible way to navigate. */}
      <div aria-hidden className="absolute inset-0 cursor-grab active:cursor-grabbing">
        {webgl ? (
          <HatErrorBoundary fallback={<HatFallback />} onError={() => setSettled(true)}>
            <div
              // Arriving, the cover waits for the hat, so there is nothing to fade.
              className={`h-full w-full ${arriving ? "" : "transition-opacity duration-700"} ${
                settled ? "opacity-100" : "opacity-0"
              }`}
            >
              <HatScene
                yaw={yaw}
                count={count}
                reducedMotion={reduceMotion}
                spin={zooming ? "up" : arriving && !returning ? "hold" : "none"}
                onSpin={onSpin}
                onSelect={onSelect}
                onReady={() => setSettled(true)}
              />
            </div>
          </HatErrorBoundary>
        ) : webgl === false ? (
          <HatFallback />
        ) : null}
      </div>
    </div>
  );
}
