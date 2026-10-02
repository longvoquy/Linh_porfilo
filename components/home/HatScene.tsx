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
  /** The hat has been drawn with its final texture: the loader can go. */
  onReady?: () => void;
  /**
   * The fast spin of the Home transition: `up` builds it as the hat zooms in;
   * `hold` keeps it at full speed, as the hat was left (arriving back, under
   * the cover); `none` lets any of it wind down onto the current section.
   */
  spin?: "up" | "hold" | "none";
};

const RADIUS = 1.7;
/**
 * Height against a radius of 1.7, which is roughly the proportion of a real nón
 * lá. A flatter cone than this reads as a bowl: its sides meet the rim so early
 * that the straight part of the silhouette is short and the eye follows the
 * curve of the rim instead.
 */
const HEIGHT = 1.5;
/**
 * Aim below the hat's centre so the apex and the front of the brim sit an equal
 * distance from the top and bottom of the frame — otherwise the hat rides low
 * and the space above it is wasted.
 */
const CAMERA_TARGET_Y = -0.55;
const DRAG_SPEED = 0.008;
/** Pointer travel (px) above which a click is treated as the end of a drag. */
const CLICK_SLOP = 6;
/** The transition spin: speed gained per second (rad/s²), and its cap (rad/s). */
const ZOOM_SPIN_ACCEL = 14;
const ZOOM_SPIN_MAX = 9;
/**
 * Coming back to Home, the spin ends in a planned landing: over this long, the
 * hat slows from its spin speed to a stop exactly on the section. At least
 * SETTLE_MIN_TRAVEL radians are covered, which is what keeps the curve moving
 * forward the whole way (it needs a distance of a third of speed × duration).
 */
const SETTLE_DURATION = 1;
const SETTLE_MIN_TRAVEL = (ZOOM_SPIN_MAX * SETTLE_DURATION) / 3;

type Settle = { elapsed: number; from: number; travel: number };


function Hat({ yaw, count, reducedMotion, onSpin, onSelect, onReady, spin: spinMode = "none" }: HatSceneProps) {
  const group = useRef<Group>(null);
  // Start already facing the initial section, so the hat does not spin on load.
  const current = useRef(yaw); // yaw currently rendered
  const goal = useRef(yaw); // yaw being eased toward
  const dragging = useRef(false);
  const onSelectRef = useRef(onSelect);
  const gl = useThree((state) => state.gl);
  // Extra spin speed from the transition, rad/s. Mounting mid-transition, the
  // hat is already at full speed.
  const spin = useRef(spinMode === "hold" ? ZOOM_SPIN_MAX : 0);
  const settle = useRef<Settle | null>(null);
  // Set once the texture is final; the next rendered frame then reports ready,
  // so the loader never uncovers a hat still wearing the bare weave.
  const settled = useRef(false);
  const reported = useRef(false);
  const onReadyRef = useRef(onReady);
  const { texture, settled: textureSettled } = useMemo(() => createHatTexture(), []);
  const shell = useMemo(
    () =>
      new LatheGeometry(
        hatProfile(RADIUS, HEIGHT, 64).map(({ r, y }) => new Vector2(r, y)),
        128,
      ),
    [],
  );

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    textureSettled.then(() => {
      settled.current = true;
    });
  }, [textureSettled]);
  useEffect(() => () => shell.dispose(), [shell]);

  // Keep the drag listeners (below) from re-subscribing when the parent's callback changes.
  useEffect(() => {
    onSelectRef.current = onSelect;
    onReadyRef.current = onReady;
  }, [onSelect, onReady]);

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
    if (spinMode === "up") {
      // Fling the hat round, faster and faster, as it flies at the viewer.
      spin.current = Math.min(spin.current + ZOOM_SPIN_ACCEL * delta, ZOOM_SPIN_MAX);
    }

    if (spinMode === "none" && spin.current > 0 && !settle.current) {
      // The spin is over: plan the landing. The section is reached going the
      // same way the hat is turning, by a distance of at least
      // SETTLE_MIN_TRAVEL, so the hat never has to stop and reverse.
      const turn = Math.PI * 2;
      const gap = shortestAngle(current.current, yaw);
      settle.current = {
        elapsed: 0,
        from: current.current,
        travel: gap + turn * Math.ceil((SETTLE_MIN_TRAVEL - gap) / turn),
      };
    }

    if (settle.current && dragging.current) {
      // Grabbed mid-landing: the drag takes over.
      settle.current = null;
      spin.current = 0;
      goal.current = current.current;
    } else if (settle.current) {
      const landing = settle.current;
      landing.elapsed += delta;
      const s = Math.min(landing.elapsed / SETTLE_DURATION, 1);
      // Cubic Hermite from the spin speed down to rest: it starts at exactly the
      // speed the hat was turning at, and ends at zero on the section.
      const speed = spin.current * SETTLE_DURATION;
      current.current =
        landing.from +
        (s * s * s - 2 * s * s + s) * speed +
        (3 * s * s - 2 * s * s * s) * landing.travel;
      goal.current = current.current;
      if (s === 1) {
        settle.current = null;
        spin.current = 0;
      }
    } else if (spin.current > 0) {
      current.current += spin.current * delta;
      goal.current = current.current;
    } else {
      // Reduced motion snaps a click to its section instead of easing there.
      const ease = reducedMotion ? 1 : 1 - Math.exp(-5 * delta);
      current.current += (goal.current - current.current) * ease;
    }
    // Always on, even with reduced motion: ±3.4° over a ~10 s cycle is an idle
    // breath, not the large or fast movement that setting exists to spare people.
    const sway = Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
    hat.rotation.y = current.current + sway;

    if (settled.current && !reported.current) {
      reported.current = true;
      onReadyRef.current?.();
    }
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
      // 20.5° above the rim. The higher the eye, the rounder the rim reads, and
      // past roughly 25° the hat stops looking like a cone seen from the side
      // and starts looking like a dish seen from above.
      camera={{ position: [0, 1.38, 5.15], fov: 31 }}
      dpr={[1, 2]}
      // Size by the layout box, not the bounding rect: the stage is scaled by a
      // CSS transform during the Home transition, and a canvas mounted while it
      // is zoomed would otherwise measure itself 2.4× too big and stay that way.
      resize={{ offsetSize: true }}
      style={{ touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff1d6" />
      <pointLight position={[-4, 2, 2]} intensity={25} color={HAT_GOLD} />
      <Hat {...props} />
    </Canvas>
  );
}
