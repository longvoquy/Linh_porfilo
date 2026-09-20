"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { DoubleSide, type Group } from "three";
import { shortestAngle } from "./carouselMath";
import { HAT_GOLD, createHatTexture } from "./hatTexture";

export type HatSceneProps = {
  /** Target yaw in radians; the hat eases toward it, taking the short way round. */
  yaw: number;
  reducedMotion: boolean;
  onSpin: () => void;
};

const RADIUS = 1.7;
const HEIGHT = 1.25;
const CAMERA_TARGET_Y = -0.3;
const DRAG_SPEED = 0.008;
/** Pointer travel (px) above which a click is treated as the end of a drag. */
const CLICK_SLOP = 6;

function Hat({ yaw, reducedMotion, onSpin }: HatSceneProps) {
  const group = useRef<Group>(null);
  const current = useRef(0); // yaw currently rendered
  const goal = useRef(0); // yaw being eased toward
  const gl = useThree((state) => state.gl);
  const texture = useMemo(() => createHatTexture(), []);

  useEffect(() => () => texture.dispose(), [texture]);

  // A new active section: ease to it via the shortest arc.
  useEffect(() => {
    goal.current = current.current + shortestAngle(current.current, yaw);
  }, [yaw]);

  // Drag to spin. Vertical touch scrolling stays native (touch-action: pan-y on the Canvas).
  useEffect(() => {
    const el = gl.domElement;
    let lastX: number | null = null;

    const down = (event: PointerEvent) => {
      lastX = event.clientX;
      el.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (lastX === null) return;
      current.current += (event.clientX - lastX) * DRAG_SPEED;
      goal.current = current.current;
      lastX = event.clientX;
    };
    const up = () => {
      lastX = null;
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
  }, [gl]);

  useFrame((state, delta) => {
    // Aim a little below the hat so the front of the pedestal stays in frame.
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
      <mesh>
        <coneGeometry args={[RADIUS, HEIGHT, 96, 1, true]} />
        <meshStandardMaterial map={texture} metalness={0.35} roughness={0.45} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -HEIGHT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RADIUS, 0.035, 16, 128]} />
        <meshStandardMaterial color={HAT_GOLD} metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, HEIGHT / 2 + 0.05, 0]}>
        <sphereGeometry args={[0.09, 24, 16]} />
        <meshStandardMaterial color={HAT_GOLD} metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

/** Glowing disc and two rings under the hat. Does not rotate with it. */
function Pedestal() {
  return (
    <group position={[0, -0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[2.0, 96]} />
        <meshBasicMaterial color="#f3e2b8" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[2.0, 2.035, 128]} />
        <meshBasicMaterial color={HAT_GOLD} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[2.2, 2.22, 128]} />
        <meshBasicMaterial color={HAT_GOLD} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

export default function HatScene(props: HatSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 2.2, 5.8], fov: 34 }}
      dpr={[1, 2]}
      style={{ touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff1d6" />
      <pointLight position={[-4, 2, 2]} intensity={25} color={HAT_GOLD} />
      <Pedestal />
      <Hat {...props} />
    </Canvas>
  );
}
