"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { HatErrorBoundary } from "./HatErrorBoundary";
import { HatFallback } from "./HatFallback";

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
  onSpin: () => void;
};

export function HatStage({ yaw, onSpin }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion() ?? false;
  // `null` on the server and during hydration, so the first client render matches the HTML.
  const webgl = useSyncExternalStore<boolean | null>(subscribeNever, detectWebGL, () => null);

  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-xl md:max-w-none">
      <p className="absolute inset-x-0 top-0 z-10 text-center text-[11px] uppercase tracking-[0.3em] text-gold">
        {t("home.spin")}
      </p>
      {/* Decorative + pointer-only: the carousel is the accessible way to navigate. */}
      <div aria-hidden className="absolute inset-0 cursor-grab active:cursor-grabbing">
        {webgl ? (
          <HatErrorBoundary fallback={<HatFallback />}>
            <HatScene yaw={yaw} reducedMotion={reduceMotion} onSpin={onSpin} />
          </HatErrorBoundary>
        ) : (
          <HatFallback />
        )}
      </div>
    </div>
  );
}
