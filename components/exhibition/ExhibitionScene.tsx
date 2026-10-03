"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Camera,
  type Texture,
} from "three";
import {
  INTRO_POSE,
  VERTICAL_FOV,
  damp,
  dampPose,
  isSettled,
  poseForStop,
  type Pose,
} from "./cameraRail";
import { HALL_COLORS, createFloorTexture, createGlowTexture, createPlaqueTexture } from "./hallTextures";
import { aspectOf, textureUrl, type ExhibitPiece } from "./pieces";
import { WalkRig } from "./walk/WalkRig";
import { FRAME_BORDER, HALL, LABEL, hallLength, layoutPaintings, type Placement } from "./roomLayout";

export type SceneProps = {
  pieces: ExhibitPiece[];
  /** Label text for each painting, in piece order (already localized: context does not cross the canvas). */
  plates: { title: string; date?: string }[];
  /** 0 is the entrance; 1..pieces.length are the paintings. */
  stop: number;
  closeUp: boolean;
  reducedMotion: boolean;
  /** The guided tour, or walking the hall on foot. */
  mode: "tour" | "walk";
  /** Coming back to the tour from walking: glide from where the camera stands instead of snapping to the stop. */
  resume: boolean;
  onSelect: (stop: number) => void;
  onToggleCloseUp: () => void;
  /** Walking: the painting now in view, or null. */
  onFocusChange: (index: number | null) => void;
  /** Walking: whether the mouse is captured for looking around. */
  onLockChange: (locked: boolean) => void;
  onReady?: () => void;
};

/** How quickly the camera closes in on its goal (per second). */
const GLIDE_RATE = 3.2;
/** The camera drifts a little toward a mouse pointer (world units at the screen edge): depth without dragging. */
const PARALLAX = { x: 0.3, y: 0.12 };
const PARALLAX_RATE = 4;
/** Pointer travel (px) above which a press is not a click. */
const CLICK_SLOP = 6;

const lookDirection = new Vector3();

/** Where the camera stands and what it looks at, so a glide can start from there. */
function poseFromCamera(camera: Camera): Pose {
  camera.getWorldDirection(lookDirection);
  const { x, y, z } = camera.position;
  return {
    position: [x, y, z],
    target: [x + lookDirection.x * 8, y + lookDirection.y * 8, z + lookDirection.z * 8],
  };
}

/** Glides the camera between stops, with a light parallax toward a mouse pointer. */
function Rig({
  placements,
  stop,
  closeUp,
  reducedMotion,
  resume,
}: {
  placements: Placement[];
  stop: number;
  closeUp: boolean;
  reducedMotion: boolean;
  resume: boolean;
}) {
  const camera = useThree((state) => state.camera);
  const dom = useThree((state) => state.gl.domElement);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const invalidate = useThree((state) => state.invalidate);
  const goal = useMemo(
    () => poseForStop(stop, placements, aspect, closeUp),
    [stop, placements, aspect, closeUp],
  );
  const pose = useRef<Pose | null>(null);
  const shift = useRef({ x: 0, y: 0 });
  const mouseOver = useRef(false);

  // The canvas only renders on demand: wake it when the camera has somewhere new to go.
  useEffect(() => {
    invalidate();
  }, [goal, reducedMotion, invalidate]);

  // Only a mouse hovering the canvas draws the camera along; touch has no hover to follow.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      mouseOver.current = event.pointerType === "mouse";
      invalidate();
    };
    const onLeave = () => {
      mouseOver.current = false;
      invalidate();
    };
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerleave", onLeave);
    return () => {
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerleave", onLeave);
    };
  }, [dom, invalidate]);

  useFrame((frame, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!pose.current) pose.current = resume ? poseFromCamera(camera) : goal;
    else pose.current = reducedMotion ? goal : dampPose(pose.current, goal, dt, GLIDE_RATE);
    camera.position.set(...pose.current.position);
    camera.lookAt(...pose.current.target);

    // Slide the camera sideways without turning it, so near things shift against far ones.
    const follow = mouseOver.current && !reducedMotion;
    const wantX = follow ? frame.pointer.x * PARALLAX.x : 0;
    const wantY = follow ? frame.pointer.y * PARALLAX.y : 0;
    const offset = shift.current;
    offset.x = damp(offset.x, wantX, dt, PARALLAX_RATE);
    offset.y = damp(offset.y, wantY, dt, PARALLAX_RATE);
    camera.translateX(offset.x);
    camera.translateY(offset.y);

    // Keep rendering until the camera has arrived and the parallax has come to rest.
    const parallaxDone = Math.abs(offset.x - wantX) < 1e-3 && Math.abs(offset.y - wantY) < 1e-3;
    if (!parallaxDone || !isSettled(pose.current, goal)) frame.invalidate();
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
  interactive,
  onSelect,
  onToggleCloseUp,
}: {
  piece: ExhibitPiece;
  placement: Placement;
  plate: { title: string; date?: string };
  glow: Texture;
  active: boolean;
  /** Clicking toggles the close-up; off while walking, where clicks belong to the mouse look. */
  interactive: boolean;
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
          if (!interactive) return;
          event.stopPropagation();
          if (event.delta > CLICK_SLOP) return;
          if (active) onToggleCloseUp();
          else onSelect(placement.index + 1);
        }}
        onPointerOver={() => {
          if (interactive) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[width, height]} />
        {/* Unlit, so the painting's own colours are shown as painted. A frame whose image fails stays a cream blank.
            The key rebuilds the material when the image arrives: three does not recompile a shader whose `map`
            goes from empty to set, so without it the frame would be drawn as flat white. */}
        <meshBasicMaterial
          key={art && art !== "failed" ? "image" : "blank"}
          map={art === "failed" ? null : art}
          color={art && art !== "failed" ? "#ffffff" : HALL_COLORS.cream}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, -height / 2 - LABEL.offset, -0.04]}>
        <planeGeometry args={[LABEL.width, LABEL.height]} />
        <meshBasicMaterial map={plateTexture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Hall({ length }: { length: number }) {
  const floor = useMemo(() => {
    const texture = createFloorTexture();
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, length / 4);
    return texture;
  }, [length]);
  useEffect(() => () => floor.dispose(), [floor]);

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
  stop,
  closeUp,
  reducedMotion,
  mode,
  resume,
  onSelect,
  onToggleCloseUp,
  onFocusChange,
  onLockChange,
  onReady,
}: SceneProps) {
  const placements = useMemo(() => layoutPaintings(pieces.map(aspectOf)), [pieces]);
  const length = hallLength(pieces.length);
  const glow = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => glow.dispose(), [glow]);

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop="demand"
      camera={{ fov: VERTICAL_FOV, near: 0.1, far: 80, position: INTRO_POSE.position }}
      onCreated={({ camera }) => {
        // Face down the hall from the first frame (walking starts from wherever the camera looks).
        camera.lookAt(...INTRO_POSE.target);
        onReady?.();
      }}
    >
      {mode === "walk" ? (
        <WalkRig
          placements={placements}
          length={length}
          onFocusChange={onFocusChange}
          onLockChange={onLockChange}
        />
      ) : (
        <Rig
          placements={placements}
          stop={stop}
          closeUp={closeUp}
          reducedMotion={reducedMotion}
          resume={resume}
        />
      )}
      <Hall length={length} />
      {pieces.map((piece, i) => (
        <Painting
          key={piece.slug}
          piece={piece}
          placement={placements[i]}
          plate={plates[i]}
          glow={glow}
          active={stop === i + 1}
          interactive={mode === "tour"}
          onSelect={onSelect}
          onToggleCloseUp={onToggleCloseUp}
        />
      ))}
    </Canvas>
  );
}
