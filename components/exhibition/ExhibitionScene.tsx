"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { INTRO_POSE, VERTICAL_FOV, damp, dampPose, poseForStop, type Pose } from "./cameraRail";
import { HALL_COLORS, createFloorTexture, createGlowTexture, createPlaqueTexture } from "./hallTextures";
import { aspectOf, textureUrl, type ExhibitPiece } from "./pieces";
import { HALL, hallLength, layoutPaintings, type Placement } from "./roomLayout";

export type SceneProps = {
  pieces: ExhibitPiece[];
  /** Label text for each painting, in piece order (already localized: context does not cross the canvas). */
  plates: { title: string; date?: string }[];
  plaque: { title: string; subtitle: string };
  /** 0 is the entrance; 1..pieces.length are the paintings. */
  stop: number;
  closeUp: boolean;
  reducedMotion: boolean;
  onSelect: (stop: number) => void;
  onToggleCloseUp: () => void;
  onReady?: () => void;
};

/** How quickly the camera closes in on its goal (per second). */
const GLIDE_RATE = 3.2;
/** How far dragging may turn the view, and how fast. Radians / radians per px. */
const LOOK_LIMIT = 0.3;
const LOOK_SPEED = 0.0025;
const LOOK_RETURN_RATE = 5;
/** Pointer travel (px) above which a press counts as a drag, not a click. */
const CLICK_SLOP = 6;
const FRAME_BORDER = 0.08;

type LookState = { yaw: number; pitch: number; dragging: boolean };

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Drags nudge the view a little; releasing eases it back. */
function Rig({
  placements,
  stop,
  closeUp,
  reducedMotion,
}: {
  placements: Placement[];
  stop: number;
  closeUp: boolean;
  reducedMotion: boolean;
}) {
  const camera = useThree((state) => state.camera);
  const dom = useThree((state) => state.gl.domElement);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const goal = useMemo(
    () => poseForStop(stop, placements, aspect, closeUp),
    [stop, placements, aspect, closeUp],
  );
  const pose = useRef<Pose | null>(null);
  const look = useRef<LookState>({ yaw: 0, pitch: 0, dragging: false });

  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    const onDown = (event: PointerEvent) => {
      look.current.dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      dom.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      const state = look.current;
      if (!state.dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      state.yaw = clamp(state.yaw + dx * LOOK_SPEED, LOOK_LIMIT);
      state.pitch = clamp(state.pitch + dy * LOOK_SPEED, LOOK_LIMIT);
    };
    const onUp = () => {
      look.current.dragging = false;
    };
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerup", onUp);
    dom.addEventListener("pointercancel", onUp);
    return () => {
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointercancel", onUp);
    };
  }, [dom]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    pose.current =
      !pose.current || reducedMotion ? goal : dampPose(pose.current, goal, dt, GLIDE_RATE);
    camera.position.set(...pose.current.position);
    camera.lookAt(...pose.current.target);

    const state = look.current;
    if (!state.dragging || reducedMotion) {
      state.yaw = damp(state.yaw, 0, dt, LOOK_RETURN_RATE);
      state.pitch = damp(state.pitch, 0, dt, LOOK_RETURN_RATE);
    }
    camera.rotateY(state.yaw);
    camera.rotateX(state.pitch);
  });

  return null;
}

/** Loads a painting's image. `null` while loading, `"failed"` if it cannot be fetched. */
function useArtTexture(src: string): Texture | null | "failed" {
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const [texture, setTexture] = useState<Texture | null | "failed">(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: Texture | null = null;
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      textureUrl(src),
      (next) => {
        if (cancelled) {
          next.dispose();
          return;
        }
        next.colorSpace = SRGBColorSpace;
        next.anisotropy = Math.min(8, maxAnisotropy);
        loaded = next;
        setTexture(next);
      },
      undefined,
      () => {
        if (!cancelled) setTexture("failed");
      },
    );
    return () => {
      cancelled = true;
      loaded?.dispose();
    };
  }, [src, maxAnisotropy]);

  return texture;
}

function Painting({
  piece,
  placement,
  plate,
  glow,
  active,
  onSelect,
  onToggleCloseUp,
}: {
  piece: ExhibitPiece;
  placement: Placement;
  plate: { title: string; date?: string };
  glow: Texture;
  active: boolean;
  onSelect: (stop: number) => void;
  onToggleCloseUp: () => void;
}) {
  const art = useArtTexture(piece.src);
  const { width, height } = placement;

  const plateTexture = useMemo(
    () =>
      createPlaqueTexture(
        [
          { text: plate.title, size: 78, color: HALL_COLORS.navy },
          ...(plate.date ? [{ text: plate.date, size: 56, color: HALL_COLORS.gold }] : []),
        ],
        HALL_COLORS.ivory,
      ),
    [plate.title, plate.date],
  );
  useEffect(() => () => plateTexture.dispose(), [plateTexture]);

  return (
    <group position={placement.position} rotation={[0, placement.rotationY, 0]}>
      {/* A warm pool of light on the wall behind. */}
      <mesh position={[0, 0.1, -0.045]}>
        <planeGeometry args={[width + 2.4, height + 2.4]} />
        <meshBasicMaterial
          map={glow}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <boxGeometry args={[width + FRAME_BORDER * 2, height + FRAME_BORDER * 2, 0.1]} />
        <meshStandardMaterial color={HALL_COLORS.goldLit} metalness={0.55} roughness={0.35} />
      </mesh>

      <mesh
        position={[0, 0, 0.052]}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta > CLICK_SLOP) return;
          if (active) onToggleCloseUp();
          else onSelect(placement.index + 1);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[width, height]} />
        {/* Unlit, so the painting's own colours are shown as painted. A frame whose image fails stays a cream blank. */}
        <meshBasicMaterial
          map={art === "failed" ? null : art}
          color={art && art !== "failed" ? "#ffffff" : HALL_COLORS.cream}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, -height / 2 - 0.34, -0.04]}>
        <planeGeometry args={[1.1, 0.275]} />
        <meshBasicMaterial map={plateTexture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Hall({ length, plaque }: { length: number; plaque: SceneProps["plaque"] }) {
  const floor = useMemo(() => {
    const texture = createFloorTexture();
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, length / 4);
    return texture;
  }, [length]);
  useEffect(() => () => floor.dispose(), [floor]);

  const plaqueTexture = useMemo(
    () =>
      createPlaqueTexture(
        [
          { text: plaque.title, size: 120, color: HALL_COLORS.goldLit },
          { text: plaque.subtitle, size: 56, color: HALL_COLORS.cream },
        ],
        HALL_COLORS.navy,
        1024,
        512,
      ),
    [plaque.title, plaque.subtitle],
  );
  useEffect(() => () => plaqueTexture.dispose(), [plaqueTexture]);

  const half = HALL.width / 2;
  const lanterns = Array.from({ length: Math.floor(length / 6) }, (_, i) => 3 + i * 6);

  return (
    <group>
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 6, 4]} intensity={0.9} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, length / 2]}>
        <planeGeometry args={[HALL.width, length]} />
        <meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HALL.height, length / 2]}>
        <planeGeometry args={[HALL.width, length]} />
        <meshStandardMaterial color={HALL_COLORS.navy} roughness={0.9} />
      </mesh>

      <mesh rotation={[0, Math.PI / 2, 0]} position={[-half, HALL.height / 2, length / 2]}>
        <planeGeometry args={[length, HALL.height]} />
        <meshStandardMaterial color={HALL_COLORS.cream} roughness={0.95} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[half, HALL.height / 2, length / 2]}>
        <planeGeometry args={[length, HALL.height]} />
        <meshStandardMaterial color={HALL_COLORS.cream} roughness={0.95} />
      </mesh>
      <mesh position={[0, HALL.height / 2, 0]}>
        <planeGeometry args={[HALL.width, HALL.height]} />
        <meshStandardMaterial color={HALL_COLORS.cream} roughness={0.95} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} position={[0, HALL.height / 2, length]}>
        <planeGeometry args={[HALL.width, HALL.height]} />
        <meshStandardMaterial color={HALL_COLORS.cream} roughness={0.95} />
      </mesh>

      {/* Gold baseboards and crown moulding. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (half - 0.025), 0.12, length / 2]}>
            <boxGeometry args={[0.05, 0.24, length]} />
            <meshStandardMaterial color={HALL_COLORS.gold} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[side * (half - 0.04), HALL.height - 0.1, length / 2]}>
            <boxGeometry args={[0.08, 0.2, length]} />
            <meshStandardMaterial color={HALL_COLORS.gold} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* The entrance sign. */}
      <group position={[0, 2.3, 0.05]}>
        <mesh>
          <boxGeometry args={[3.4, 1.8, 0.1]} />
          <meshStandardMaterial color={HALL_COLORS.goldLit} metalness={0.55} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[3.2, 1.6]} />
          <meshBasicMaterial map={plaqueTexture} toneMapped={false} />
        </mesh>
      </group>

      {/* Paper lanterns down the middle of the ceiling. */}
      {lanterns.map((z) => (
        <group key={z} position={[0, HALL.height, z]}>
          <mesh position={[0, -0.45, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.9, 6]} />
            <meshStandardMaterial color={HALL_COLORS.gold} />
          </mesh>
          <mesh position={[0, -1, 0]}>
            <cylinderGeometry args={[0.26, 0.2, 0.5, 14]} />
            <meshStandardMaterial
              color={HALL_COLORS.cream}
              emissive={HALL_COLORS.goldLit}
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function ExhibitionScene({
  pieces,
  plates,
  plaque,
  stop,
  closeUp,
  reducedMotion,
  onSelect,
  onToggleCloseUp,
  onReady,
}: SceneProps) {
  const placements = useMemo(() => layoutPaintings(pieces.map(aspectOf)), [pieces]);
  const length = hallLength(pieces.length);
  const glow = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => glow.dispose(), [glow]);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ fov: VERTICAL_FOV, near: 0.1, far: 80, position: INTRO_POSE.position }}
      onCreated={() => onReady?.()}
    >
      <Rig
        placements={placements}
        stop={stop}
        closeUp={closeUp}
        reducedMotion={reducedMotion}
      />
      <Hall length={length} plaque={plaque} />
      {pieces.map((piece, i) => (
        <Painting
          key={piece.slug}
          piece={piece}
          placement={placements[i]}
          plate={plates[i]}
          glow={glow}
          active={stop === i + 1}
          onSelect={onSelect}
          onToggleCloseUp={onToggleCloseUp}
        />
      ))}
    </Canvas>
  );
}
