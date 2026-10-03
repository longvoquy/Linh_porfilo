"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Euler } from "three";
import { EYE_Y, damp } from "../cameraRail";
import { HALL, type Placement } from "../roomLayout";
import { facingPainting, hallBounds, lookBy, stepWalk, type WalkState } from "./walkMath";

type Props = {
  placements: Placement[];
  length: number;
  /** The painting now in view, or null. Called only when it changes. */
  onFocusChange: (index: number | null) => void;
  /** Whether the mouse is captured for looking around. */
  onLockChange: (locked: boolean) => void;
};

/** How quickly key presses ease in and out, so starting and stopping is not abrupt. */
const INPUT_RATE = 12;
/** A single mouse event never turns the view by more than this many pixels' worth. */
const MAX_MOUSE_STEP = 120;

const MOVE_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);
const RUN_KEYS = ["ShiftLeft", "ShiftRight"];

const clampStep = (value: number) => Math.max(-MAX_MOUSE_STEP, Math.min(MAX_MOUSE_STEP, value));

/**
 * First-person walking: W A S D (or the arrows) to move, Shift to run, and the
 * mouse to look around once the pointer is locked to the canvas. It takes over
 * the camera from wherever the guided tour left it.
 */
export function WalkRig({ placements, length, onFocusChange, onLockChange }: Props) {
  const camera = useThree((state) => state.camera);
  const dom = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const bounds = useMemo(() => hallBounds(HALL.width, length), [length]);
  const walk = useRef<WalkState | null>(null);
  const keys = useRef(new Set<string>());
  const eased = useRef({ forward: 0, right: 0 });
  const focus = useRef<number | null>(null);

  // Start where the tour camera was standing, facing the way it faced.
  useEffect(() => {
    const euler = new Euler().setFromQuaternion(camera.quaternion, "YXZ");
    walk.current = {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, camera.position.x)),
      z: Math.max(bounds.minZ, Math.min(bounds.maxZ, camera.position.z)),
      yaw: euler.y,
      pitch: euler.x,
    };
    invalidate();
  }, [camera, bounds, invalidate]);

  useEffect(() => {
    const held = keys.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (MOVE_KEYS.has(event.code)) {
        held.add(event.code);
        event.preventDefault();
      } else if (RUN_KEYS.includes(event.code)) {
        held.add(event.code);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      held.delete(event.code);
    };
    const releaseAll = () => held.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      held.clear();
    };
  }, []);

  // The mouse looks around only while it is locked to the canvas; a click captures it.
  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== dom || !walk.current) return;
      walk.current = lookBy(walk.current, clampStep(event.movementX), clampStep(event.movementY));
    };
    const onLockChanged = () => onLockChange(document.pointerLockElement === dom);
    const capture = () => {
      if (document.pointerLockElement === dom) return;
      // The promise form rejects if the browser refuses (e.g. right after Esc); that is fine.
      const request = dom.requestPointerLock() as unknown as Promise<void> | undefined;
      request?.catch?.(() => {});
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChanged);
    dom.addEventListener("click", capture);
    onLockChanged();
    // Arriving from the landing's button, the click may still count as a user gesture; if not, a click will.
    capture();
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChanged);
      dom.removeEventListener("click", capture);
      if (document.pointerLockElement === dom) document.exitPointerLock();
      onLockChange(false);
    };
  }, [dom, onLockChange]);

  useFrame((frame, delta) => {
    const current = walk.current;
    if (!current) return;
    const dt = Math.min(delta, 0.05);
    const held = keys.current;

    const forward = (held.has("KeyW") || held.has("ArrowUp") ? 1 : 0) - (held.has("KeyS") || held.has("ArrowDown") ? 1 : 0);
    const right = (held.has("KeyD") || held.has("ArrowRight") ? 1 : 0) - (held.has("KeyA") || held.has("ArrowLeft") ? 1 : 0);
    const input = eased.current;
    input.forward = damp(input.forward, forward, dt, INPUT_RATE);
    input.right = damp(input.right, right, dt, INPUT_RATE);
    const run = RUN_KEYS.some((code) => held.has(code));

    const next = stepWalk(current, { forward: input.forward, right: input.right, run }, dt, bounds);
    walk.current = next;

    camera.rotation.reorder("YXZ");
    camera.position.set(next.x, EYE_Y, next.z);
    camera.rotation.set(next.pitch, next.yaw, 0);

    const looking = facingPainting(next, placements);
    if (looking !== focus.current) {
      focus.current = looking;
      onFocusChange(looking);
    }

    // Walking is a live view: keep drawing for as long as the mode lasts.
    frame.invalidate();
  });

  return null;
}
