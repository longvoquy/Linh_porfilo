"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { HatErrorBoundary } from "./HatErrorBoundary";
import { HatFallback } from "./HatFallback";
import { SpinGuide } from "./SpinGuide";

// three.js is only needed here, and needs a browser: load it on the client only.
const HatScene = dynamic(() => import("./HatScene"), {
  ssr: false,
  loading: () => <HatFallback />,
});

let webglSupport: boolean | undefined;

/**
 * r3f reports a failed WebGL context asynchronously, which an error boundary
 * cannot catch — so probe once up front instead of letting the scene mount.
 */
function detectWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      webglSupport = gl !== null;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const subscribeNever = () => () => {};

type Props = {
  yaw: number;
  count: number;
  onSpin: () => void;
  onSelect: (index: number) => void;
};

export function HatStage({ yaw, count, onSpin, onSelect }: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  // `null` on the server and during hydration, so the first client render matches the HTML.
  const webgl = useSyncExternalStore<boolean | null>(subscribeNever, detectWebGL, () => null);

  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-xl md:max-w-none">
      <SpinGuide className="absolute inset-x-0 top-0 z-10 mx-auto h-10 w-56 text-gold-ink" />
      {/* Ground shadow, in CSS rather than in the scene: a plane on the 3D ground
          runs past the bottom of the canvas, which cuts it off with a hard edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] top-[72%] h-[32%] bg-[radial-gradient(ellipse_at_center,rgba(84,66,42,0.22),rgba(84,66,42,0.09)_45%,transparent_72%)]"
      />
      {/* Decorative + pointer-only: the carousel is the accessible way to navigate. */}
      <div aria-hidden className="absolute inset-0 cursor-grab active:cursor-grabbing">
        {webgl ? (
          <HatErrorBoundary fallback={<HatFallback />}>
            <HatScene
              yaw={yaw}
              count={count}
              reducedMotion={reduceMotion}
              onSpin={onSpin}
              onSelect={onSelect}
            />
          </HatErrorBoundary>
        ) : (
          <HatFallback />
        )}
      </div>
    </div>
  );
}
