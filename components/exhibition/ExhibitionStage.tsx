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
import { useCanWalk } from "./walk/useCanWalk";

// three.js is only needed here, and needs a browser: load it on the client only.
const ExhibitionScene = dynamic(() => import("./ExhibitionScene"), {
  ssr: false,
  loading: () => null,
});

/** A touch swipe must travel at least this far (px), and be clearly horizontal. */
const SWIPE_MIN = 60;

const frameClass = "relative h-svh min-h-[32rem] w-full overflow-hidden bg-navy";

export function ExhibitionStage({
  pieces,
  initialMode = "tour",
}: {
  pieces: ExhibitPiece[];
  /** Which mode the page opens in; walking falls back to the tour where there is no mouse and keyboard. */
  initialMode?: "tour" | "walk";
}) {
  const { t, localize } = useTranslation();
  const reducedMotion = useReducedMotion() ?? false;
  const webgl = useWebGLSupport();
  const [stop, setStop] = useState(0);
  const [closeUp, setCloseUp] = useState(false);
  const [ready, setReady] = useState(false);
  const [chosenMode, setMode] = useState<"tour" | "walk">(initialMode);
  // Set once the visitor has walked, so the tour glides back from where they stand.
  const [resume, setResume] = useState(false);
  const [walkFocus, setWalkFocus] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const canWalk = useCanWalk();
  const mode = chosenMode === "walk" && !canWalk ? "tour" : chosenMode;
  const frameRef = useRef<HTMLDivElement>(null);
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

  const enterWalk = useCallback(() => {
    setMode("walk");
    setCloseUp(false);
    setWalkFocus(null);
    // This click is the user gesture that pointer lock requires, so capture the mouse now.
    const canvas = frameRef.current?.querySelector("canvas");
    const request = canvas?.requestPointerLock() as unknown as Promise<void> | undefined;
    request?.catch?.(() => {});
  }, []);
  const exitWalk = useCallback(() => {
    setMode("tour");
    setResume(true);
    setWalkFocus(null);
  }, []);

  const plates = useMemo(
    () => pieces.map((piece) => ({ title: localize(piece.title), date: piece.date })),
    [pieces, localize],
  );

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
    // In the close-up a drag pans across the picture, so it must not also change painting.
    if (!start || event.pointerType === "mouse" || closeUp) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) go(stop + (dx < 0 ? 1 : -1));
  };

  return (
    <ExhibitionErrorBoundary fallback={<ExhibitionFallback pieces={pieces} />}>
      <div
        ref={frameRef}
        // Vertical pans belong to the page, except in the close-up, where touch drags the picture both ways.
        className={`${frameClass} ${closeUp ? "[&_canvas]:touch-none" : "[&_canvas]:touch-pan-y"}`}
        role="region"
        aria-label={t("exhibition.hall")}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <ExhibitionScene
          pieces={pieces}
          plates={plates}
          stop={stop}
          closeUp={closeUp}
          reducedMotion={reducedMotion}
          mode={mode}
          resume={resume}
          onSelect={go}
          onToggleCloseUp={toggleCloseUp}
          onFocusChange={setWalkFocus}
          onLockChange={setLocked}
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
          canWalk={canWalk}
          walk={mode === "walk" ? { focus: walkFocus, locked } : null}
          onEnterWalk={enterWalk}
          onExitWalk={exitWalk}
        />
      </div>
    </ExhibitionErrorBoundary>
  );
}
