"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { DoubleSide, LatheGeometry, Vector2, type Group } from "three";
import { indexForYaw, shortestAngle, yawForIndex } from "./carouselMath";
import { hatProfile } from "./hatGeometry";
import { HAT_GOLD, createHatTexture } from "./hatTexture";

export type HatSceneProps = {
  /** Target yaw in radians; the hat eases toward it, taking the short way round. */
  yaw: number;
  /** Number of sections around the hat. */
  count: number;
  reducedMotion: boolean;
  /** A click on the hat: advance to the next section. */
  onSpin: () => void;
  /** Dragging the hat: the section now nearest the front. */
  onSelect: (index: number) => void;
};

const RADIUS = 1.7;
const HEIGHT = 1.25;
/**
 * Aim below the hat's centre so the apex and the front of the brim sit an equal
 * distance from the top and bottom of the frame — otherwise the hat rides low
 * and the space above it is wasted.
 */
const CAMERA_TARGET_Y = -0.65;
const DRAG_SPEED = 0.008;
/** Pointer travel (px) above which a click is treated as the end of a drag. */
const CLICK_SLOP = 6;

function Hat({ yaw, count, reducedMotion, onSpin, onSelect }: HatSceneProps) {
  const group = useRef<Group>(null);
  // Start already facing the initial section, so the hat does not spin on load.
  const current = useRef(yaw); // yaw currently rendered
  const goal = useRef(yaw); // yaw being eased toward
  const dragging = useRef(false);
  const onSelectRef = useRef(onSelect);
  const gl = useThree((state) => state.gl);
  const texture = useMemo(() => createHatTexture(), []);
  const shell = useMemo(
    () =>
      new LatheGeometry(
        hatProfile(RADIUS, HEIGHT, 64).map(({ r, y }) => new Vector2(r, y)),
        128,
      ),
    [],
  );

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => shell.dispose(), [shell]);

  // Keep the drag listeners (below) from re-subscribing when the parent's callback changes.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // A new active section: ease to it via the shortest arc. While the user is
  // dragging, the hat follows the pointer instead — a selection made by the
  // drag itself must not pull the hat back.
  useEffect(() => {
    if (dragging.current) return;
    goal.current = current.current + shortestAngle(current.current, yaw);
  }, [yaw]);

  // Drag to spin. The section nearest the front is reported live, so the
  // carousel follows the hat; on release the hat settles on that section.
  // Vertical touch scrolling stays native (touch-action: pan-y on the Canvas).
  useEffect(() => {
    const el = gl.domElement;
    let lastX: number | null = null;
    let moved = false;
    let front = 0;

    const down = (event: PointerEvent) => {
      lastX = event.clientX;
      moved = false;
      front = indexForYaw(current.current, count);
      dragging.current = true;
      el.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (lastX === null) return;
      moved = true;
      current.current += (event.clientX - lastX) * DRAG_SPEED;
      goal.current = current.current;
      lastX = event.clientX;

      const index = indexForYaw(current.current, count);
      if (index !== front) {
        front = index;
        onSelectRef.current(index);
      }
    };
    const up = () => {
      if (lastX === null) return;
      lastX = null;
      dragging.current = false;
      // A plain click has no drag to settle; onSpin drives the hat instead.
      if (moved) {
        goal.current = current.current + shortestAngle(current.current, yawForIndex(front, count));
      }
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl, count]);

  useFrame((state, delta) => {
    // Aim a little below the hat so the front of the brim stays in frame.
    state.camera.lookAt(0, CAMERA_TARGET_Y, 0);

    const hat = group.current;
    if (!hat) return;
    const ease = reducedMotion ? 1 : 1 - Math.exp(-5 * delta);
    current.current += (goal.current - current.current) * ease;
    const sway = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
    hat.rotation.y = current.current + sway;
  });

  return (
    <group
      ref={group}
      position={[0, -0.1, 0]}
      onClick={(event) => {
        if (event.delta > CLICK_SLOP) return;
        event.stopPropagation();
        onSpin();
      }}
    >
      <mesh geometry={shell}>
        <meshStandardMaterial map={texture} metalness={0.35} roughness={0.45} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -HEIGHT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RADIUS, 0.028, 16, 128]} />
        <meshStandardMaterial color={HAT_GOLD} metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function HatScene(props: HatSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.9, 4.9], fov: 31 }}
      dpr={[1, 2]}
      style={{ touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff1d6" />
      <pointLight position={[-4, 2, 2]} intensity={25} color={HAT_GOLD} />
      <Hat {...props} />
    </Canvas>
  );
}
