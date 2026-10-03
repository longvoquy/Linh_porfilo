"use client";

import { useCallback, useMemo, useRef, useState, type PointerEvent } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { ComingSoon } from "@/components/ComingSoon";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useWebGLSupport } from "@/lib/webgl";
import { ExhibitionErrorBoundary } from "./ExhibitionErrorBoundary";
import { ExhibitionFallback } from "./ExhibitionFallback";
import { ExhibitionHud } from "./ExhibitionHud";
import type { ExhibitPiece } from "./pieces";

// three.js is only needed here, and needs a browser: load it on the client only.
const ExhibitionScene = dynamic(() => import("./ExhibitionScene"), {
  ssr: false,
  loading: () => null,
});

/** A touch swipe must travel at least this far (px), and be clearly horizontal. */
const SWIPE_MIN = 60;

const frameClass = "relative h-[calc(100svh-4.5rem)] min-h-[32rem] w-full overflow-hidden bg-navy";

export function ExhibitionStage({ pieces }: { pieces: ExhibitPiece[] }) {
  const { t, localize } = useTranslation();
  const reducedMotion = useReducedMotion() ?? false;
  const webgl = useWebGLSupport();
  const [stop, setStop] = useState(0);
  const [closeUp, setCloseUp] = useState(false);
  const [ready, setReady] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const last = pieces.length;

  const go = useCallback(
    (next: number) => {
      setStop(Math.max(0, Math.min(last, next)));
      setCloseUp(false);
    },
    [last],
  );
  const toggleCloseUp = useCallback(() => setCloseUp((current) => !current), []);
  const markReady = useCallback(() => setReady(true), []);

  const plates = useMemo(
    () => pieces.map((piece) => ({ title: localize(piece.title), date: piece.date })),
    [pieces, localize],
  );
  const plaque = useMemo(() => ({ title: "Vũ Khánh Linh", subtitle: t("exhibition.title") }), [t]);

  if (pieces.length === 0) return <ComingSoon />;
  if (webgl === false) return <ExhibitionFallback pieces={pieces} />;
  if (webgl === null) {
    return (
      <div className={`${frameClass} grid place-items-center text-cream`}>{t("exhibition.loading")}</div>
    );
  }

  // Mice drag to look around (the scene handles that); touch swipes step between paintings.
  const onPointerDown = (event: PointerEvent) => {
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || event.pointerType === "mouse") return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) go(stop + (dx < 0 ? 1 : -1));
  };

  return (
    <ExhibitionErrorBoundary fallback={<ExhibitionFallback pieces={pieces} />}>
      <div
        className={`${frameClass} [&_canvas]:touch-pan-y`}
        role="region"
        aria-label={t("exhibition.hall")}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <ExhibitionScene
          pieces={pieces}
          plates={plates}
          plaque={plaque}
          stop={stop}
          closeUp={closeUp}
          reducedMotion={reducedMotion}
          onSelect={go}
          onToggleCloseUp={toggleCloseUp}
          onReady={markReady}
        />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-navy text-cream">
            {t("exhibition.loading")}
          </div>
        )}
        <ExhibitionHud
          pieces={pieces}
          stop={stop}
          closeUp={closeUp}
          onGo={go}
          onToggleCloseUp={toggleCloseUp}
        />
      </div>
    </ExhibitionErrorBoundary>
  );
}
