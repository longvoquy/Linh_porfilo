# Home — Conical Hat Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Home page's 2D `RadialNav` with a landing built around a simple 3D conical hat and an arch carousel that navigates to the seven portfolio sections.

**Architecture:** `HomeLanding` (client) owns `activeIndex`. `ArchCarousel` is controlled by it; `HatStage` derives the hat's yaw from it (`index * 2π / 7`) and reports clicks back. The hat scene (three.js via `@react-three/fiber`) is loaded with `next/dynamic` `ssr: false`, wrapped in an error boundary with a static SVG fallback. All ring/angle logic is in a pure module, `carouselMath.ts`, unit-tested with Node's built-in runner.

**Tech Stack:** Next.js 16.2.12 (App Router), React 19.2, Tailwind v4, framer-motion 12, three 0.186, @react-three/fiber 9.7 (peer `react >=19 <19.3`), TypeScript.

Spec: [`docs/superpowers/specs/2026-09-20-home-hat-landing-design.md`](../specs/2026-09-20-home-hat-landing-design.md). Work happens on branch `dev`.

## Global Constraints

- `AGENTS.md`: this is not the Next.js you know — read `node_modules/next/dist/docs/` before Next-specific changes. `ssr: false` with `next/dynamic` is only allowed inside a Client Component (`01-app/02-guides/lazy-loading.md`).
- Only the Home page (`/`) changes. No content JSON, no other page, no shared component (other than the two i18n dictionaries and `globals.css`) is touched.
- The three.js bundle must load on Home only, via `next/dynamic` with `ssr: false`.
- Bilingual: every new visible string exists in both `en.json` and `vi.json`.
- Honour `prefers-reduced-motion` (`useReducedMotion`).
- Navigation must work without the canvas: each arch is a real `<Link href="/{section.key}">`.
- Do not invent facts: the quote has no attribution.
- New Tailwind colours: `cream #f6efe3`, `navy #14213d`, `gold #b8935a`. The hat texture uses navy `#14213d` and gold `#c9a45c`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Do not push.

## File Structure

| File | Responsibility |
| --- | --- |
| `components/home/carouselMath.ts` | Pure helpers: `wrapIndex`, `ringOffset`, `shortestAngle`, `yawForIndex` |
| `components/home/carouselMath.test.ts` | `node --test` unit tests for the above |
| `components/home/sectionIcons.tsx` | One inline-SVG icon per `SectionKey` |
| `components/home/hatTexture.ts` | Canvas drawing of the hat pattern + `CanvasTexture` factory |
| `components/home/HatFallback.tsx` | Static SVG hat |
| `components/home/HatErrorBoundary.tsx` | Renders a fallback if children throw |
| `components/home/HatScene.tsx` | r3f `<Canvas>`: hat, lights, pedestal, drag/click/ease |
| `components/home/HatStage.tsx` | Dynamic-imports `HatScene`; boundary + fallback; "click to spin" label |
| `components/home/ArchCarousel.tsx` | Controlled arch carousel (buttons, arrow keys, swipe, links) |
| `components/home/HomeLanding.tsx` | Page layout; owns `activeIndex` |
| `app/page.tsx` | Renders `HomeLanding` |

---

### Task 1: Dependencies and pure carousel math

**Files:**
- Modify: `package.json`, `tsconfig.json`
- Create: `components/home/carouselMath.ts`, `components/home/carouselMath.test.ts`

**Interfaces:**
- Produces (used by Tasks 4, 5, 6):
  - `wrapIndex(index: number, count: number): number`
  - `ringOffset(index: number, active: number, count: number): number` — signed distance from `active` on a ring, in `[-floor(count/2), floor(count/2)]`
  - `shortestAngle(from: number, to: number): number` — signed radians in `(-π, π]`
  - `yawForIndex(index: number, count: number): number` — `index / count * 2π`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install three @react-three/fiber
npm install -D @types/three
```
Expected: exits 0; `package.json` lists `three`, `@react-three/fiber` under `dependencies` and `@types/three` under `devDependencies`. No peer-dependency ERESOLVE error (r3f 9.7 accepts React 19.2).

- [ ] **Step 2: Add the `test` script**

In `package.json` `"scripts"`, add after `"lint": "eslint"`:
```json
    "lint": "eslint",
    "test": "node --test components/home/*.test.ts"
```

- [ ] **Step 3: Allow `.ts` import extensions (needed only by the node test)**

Open `tsconfig.json`. If `compilerOptions` does not already contain `allowImportingTsExtensions`, add `"allowImportingTsExtensions": true,` (Next already sets `"noEmit": true`, which this option requires). Leave the rest as is.

- [ ] **Step 4: Write the failing test**

Create `components/home/carouselMath.test.ts`:
```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ringOffset, shortestAngle, wrapIndex, yawForIndex } from "./carouselMath.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

describe("wrapIndex", () => {
  it("keeps in-range indices", () => assert.equal(wrapIndex(3, 7), 3));
  it("wraps past the end", () => assert.equal(wrapIndex(7, 7), 0));
  it("wraps below zero", () => assert.equal(wrapIndex(-1, 7), 6));
  it("wraps far below zero", () => assert.equal(wrapIndex(-15, 7), 6));
});

describe("ringOffset (count 7)", () => {
  it("is 0 for the active index", () => assert.equal(ringOffset(2, 2, 7), 0));
  it("is +1 / -1 for neighbours", () => {
    assert.equal(ringOffset(3, 2, 7), 1);
    assert.equal(ringOffset(1, 2, 7), -1);
  });
  it("wraps at the ends", () => {
    assert.equal(ringOffset(0, 6, 7), 1);
    assert.equal(ringOffset(6, 0, 7), -1);
  });
  it("covers -3..3 exactly once", () => {
    const offsets = Array.from({ length: 7 }, (_, i) => ringOffset(i, 0, 7)).sort((a, b) => a - b);
    assert.deepEqual(offsets, [-3, -2, -1, 0, 1, 2, 3]);
  });
});

describe("shortestAngle", () => {
  it("is 0 for equal angles", () => close(shortestAngle(1, 1), 0));
  it("goes the short way across the 2π seam", () => {
    close(shortestAngle(0, Math.PI * 2 - 0.1), -0.1);
    close(shortestAngle(Math.PI * 2 - 0.1, 0), 0.1);
  });
  it("handles multi-turn inputs", () => close(shortestAngle(0, Math.PI * 4 + 0.3), 0.3));
  it("returns π (not -π) for a half turn", () => close(shortestAngle(0, Math.PI), Math.PI));
});

describe("yawForIndex", () => {
  it("is 0 for the first item", () => close(yawForIndex(0, 7), 0));
  it("advances 2π/count per item", () => close(yawForIndex(1, 7), (Math.PI * 2) / 7));
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module ... carouselMath.ts` (or `ERR_MODULE_NOT_FOUND`).

- [ ] **Step 6: Write the implementation**

Create `components/home/carouselMath.ts`:
```ts
/** Wraps `index` into `[0, count)`, including negative values. */
export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/**
 * Signed distance of `index` from `active` on a ring of `count` items, in
 * `[-floor(count / 2), floor(count / 2)]`. Negative is to the left.
 */
export function ringOffset(index: number, active: number, count: number): number {
  const half = Math.floor(count / 2);
  const offset = wrapIndex(index - active, count);
  return offset > half ? offset - count : offset;
}

/** Shortest signed rotation from `from` to `to`, in radians, in `(-π, π]`. */
export function shortestAngle(from: number, to: number): number {
  const full = Math.PI * 2;
  let diff = (to - from) % full;
  if (diff > Math.PI) diff -= full;
  if (diff <= -Math.PI) diff += full;
  return diff;
}

/** Hat yaw that puts item `index` of `count` at the front. */
export function yawForIndex(index: number, count: number): number {
  return (index / count) * Math.PI * 2;
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green, 0 failures.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0 with no errors (confirms the `.ts` extension import in the test is accepted).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json components/home/carouselMath.ts components/home/carouselMath.test.ts
git commit -m "feat(home): add three/r3f deps and carousel math helpers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Theme colours, i18n strings, section icons

**Files:**
- Modify: `app/globals.css`, `lib/i18n/dictionaries/en.json`, `lib/i18n/dictionaries/vi.json`
- Create: `components/home/sectionIcons.tsx`

**Interfaces:**
- Produces: Tailwind utilities `bg-cream`, `text-navy`, `text-gold`, `border-gold`, … (opacity modifiers work, e.g. `bg-cream/80`).
- Produces: dictionary keys `home.hello`, `home.welcome`, `home.journey`, `home.body`, `home.start`, `home.spin`, `home.hatHint`, `home.quote`, `carousel.label`, `carousel.previous`, `carousel.next`.
- Produces: `sectionIcons: Record<SectionKey, (props: { className?: string }) => ReactElement>` from `components/home/sectionIcons.tsx`.

- [ ] **Step 1: Add theme colours**

In `app/globals.css`, inside the existing `@theme inline { ... }` block, add after the `--font-heading` line:
```css
  --color-cream: #f6efe3;
  --color-navy: #14213d;
  --color-gold: #b8935a;
```

- [ ] **Step 2: Add English strings**

In `lib/i18n/dictionaries/en.json`, add before the closing `}` (mind the comma after the current last entry):
```json
  "home.hello": "Xin chào!",
  "home.welcome": "Welcome to",
  "home.journey": "My Journey",
  "home.body": "This is the story of my growth, passions, and purpose. Each experience has shaped me into who I am today.",
  "home.start": "Start the Magic",
  "home.spin": "Click to spin",
  "home.hatHint": "Click the hat to spin the wheel of my experiences",
  "home.quote": "Every line has a lineage. Every pattern reflects a changing world.",
  "carousel.label": "Portfolio sections",
  "carousel.previous": "Previous section",
  "carousel.next": "Next section"
```

- [ ] **Step 3: Add Vietnamese strings**

In `lib/i18n/dictionaries/vi.json`, same position:
```json
  "home.hello": "Xin chào!",
  "home.welcome": "Chào mừng đến với",
  "home.journey": "Hành trình của mình",
  "home.body": "Đây là câu chuyện về sự trưởng thành, đam mê và mục đích sống của mình. Mỗi trải nghiệm đã tạo nên con người mình hôm nay.",
  "home.start": "Bắt đầu hành trình",
  "home.spin": "Nhấn để xoay",
  "home.hatHint": "Nhấn vào chiếc nón để xoay bánh xe trải nghiệm",
  "home.quote": "Mỗi đường nét đều có nguồn cội. Mỗi hoa văn phản chiếu một thế giới đang đổi thay.",
  "carousel.label": "Các mục hồ sơ",
  "carousel.previous": "Mục trước",
  "carousel.next": "Mục tiếp theo"
```

- [ ] **Step 4: Create the icons**

Create `components/home/sectionIcons.tsx`:
```tsx
import type { ReactElement } from "react";
import type { SectionKey } from "@/lib/types";

type IconProps = { className?: string };

/** 24×24 stroke icon; colour comes from `currentColor`. */
function Icon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export const sectionIcons: Record<SectionKey, (props: IconProps) => ReactElement> = {
  awards: (p) => (
    <Icon {...p}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </Icon>
  ),
  leadership: (p) => (
    <Icon {...p}>
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M16 5.2a3 3 0 0 1 0 5.6 M18 14.3a5 5 0 0 1 3 4.7v1" />
    </Icon>
  ),
  "passion-projects": (p) => (
    <Icon {...p}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </Icon>
  ),
  "art-portfolio": (p) => (
    <Icon {...p}>
      <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.9 1.5-1.9-.3-1 .4-2.1 1.5-2.1H17a4 4 0 0 0 4-4c0-5-4-10-9-10Z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7" r="1" />
      <circle cx="15" cy="7.5" r="1" />
    </Icon>
  ),
  volunteer: (p) => (
    <Icon {...p}>
      <path d="M12 14s-4-2.6-4-5.5A2.5 2.5 0 0 1 12 7a2.5 2.5 0 0 1 4 1.5C16 11.4 12 14 12 14Z" />
      <path d="M3 17h4l4 3h6l4-4" />
    </Icon>
  ),
  research: (p) => (
    <Icon {...p}>
      <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M21 21l-4.5-4.5" />
    </Icon>
  ),
  internship: (p) => (
    <Icon {...p}>
      <path d="M4 8h16v11H4Z M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M4 13h16" />
    </Icon>
  ),
};
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0. (`Record<SectionKey, …>` fails to compile if a section key is missing an icon.)

- [ ] **Step 6: Commit**

```bash
git add app/globals.css lib/i18n/dictionaries/en.json lib/i18n/dictionaries/vi.json components/home/sectionIcons.tsx
git commit -m "feat(home): add theme colours, i18n strings and section icons

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Hat texture and static fallback

**Files:**
- Create: `components/home/hatTexture.ts`, `components/home/HatFallback.tsx`

**Interfaces:**
- Produces: `HAT_NAVY: string`, `HAT_GOLD: string`, `createHatTexture(): CanvasTexture` (browser-only; call it inside `useMemo`/effect, never at module scope) from `hatTexture.ts`.
- Produces: `HatFallback(): ReactElement` — fills its parent (`h-full w-full`).

- [ ] **Step 1: Write the texture module**

Create `components/home/hatTexture.ts`:
```ts
import { CanvasTexture, SRGBColorSpace } from "three";

export const HAT_NAVY = "#14213d";
export const HAT_GOLD = "#c9a45c";

/**
 * Unrolled hat surface. The cone's UVs put the apex on the top row and the rim
 * on the bottom row, so 5:1 keeps the pattern roughly undistorted. This file is
 * the only place to touch when the detailed ornament arrives.
 */
const WIDTH = 2560;
const HEIGHT = 512;
const PANELS = 12;

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
  ctx.fill();
}

export function drawHatPattern(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = HAT_NAVY;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = HAT_GOLD;
  ctx.fillStyle = HAT_GOLD;
  const panelWidth = width / PANELS;

  // Ribs. i = 0 and i = PANELS are the same rib split across the wrap seam.
  ctx.lineWidth = 7;
  for (let i = 0; i <= PANELS; i++) {
    const x = i * panelWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Double bands at mid-height and near the rim.
  ctx.lineWidth = 4;
  for (const fraction of [0.6, 0.64, 0.9, 0.94]) {
    ctx.beginPath();
    ctx.moveTo(0, height * fraction);
    ctx.lineTo(width, height * fraction);
    ctx.stroke();
  }

  // Diamonds in each panel. The panel narrows toward the apex, so the vertical
  // radius scales with the height fraction to look square on the cone.
  const rx = panelWidth * 0.2;
  for (const fraction of [0.3, 0.77]) {
    for (let i = 0; i < PANELS; i++) {
      diamond(ctx, (i + 0.5) * panelWidth, height * fraction, rx, rx * fraction);
    }
  }

  // Small squares between the rim bands.
  for (let x = 12; x < width; x += 28) {
    ctx.fillRect(x, height * 0.92 - 4, 8, 8);
  }
}

export function createHatTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is unavailable");
  drawHatPattern(ctx, WIDTH, HEIGHT);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
```

- [ ] **Step 2: Write the static fallback**

Create `components/home/HatFallback.tsx`:
```tsx
/** Static hat shown while the 3D scene loads, or when WebGL is unavailable. */
export function HatFallback() {
  return (
    <svg viewBox="0 0 400 320" aria-hidden className="h-full w-full">
      <defs>
        <linearGradient id="hat-fallback-body" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0e1830" />
          <stop offset="0.5" stopColor="#1f3160" />
          <stop offset="1" stopColor="#0e1830" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="282" rx="176" ry="26" fill="#f3e2b8" opacity="0.5" />
      <path d="M200 40 L368 240 Q200 292 32 240 Z" fill="url(#hat-fallback-body)" />
      <path
        d="M200 40 L110 262 M200 40 L155 274 M200 40 L200 279 M200 40 L245 274 M200 40 L290 262"
        stroke="#c9a45c"
        strokeWidth="2"
        opacity="0.7"
        fill="none"
      />
      <path d="M32 240 Q200 292 368 240" stroke="#c9a45c" strokeWidth="4" fill="none" />
      <circle cx="200" cy="38" r="7" fill="#c9a45c" />
    </svg>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/home/hatTexture.ts components/home/HatFallback.tsx
git commit -m "feat(home): add hat pattern texture and static fallback

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: 3D scene, error boundary and stage

**Files:**
- Create: `components/home/HatScene.tsx`, `components/home/HatErrorBoundary.tsx`, `components/home/HatStage.tsx`

**Interfaces:**
- Consumes: `shortestAngle` (Task 1), `createHatTexture`, `HAT_GOLD` (Task 3), `HatFallback` (Task 3), dictionary key `home.spin` (Task 2).
- Produces: `HatScene` (default export) with props `{ yaw: number; reducedMotion: boolean; onSpin: () => void }`.
- Produces: `HatStage({ yaw, onSpin }: { yaw: number; onSpin: () => void })` (named export) — used by Task 6.

- [ ] **Step 1: Write the scene**

Create `components/home/HatScene.tsx`:
```tsx
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
        <circleGeometry args={[2.3, 96]} />
        <meshBasicMaterial color="#f3e2b8" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[2.3, 2.34, 128]} />
        <meshBasicMaterial color={HAT_GOLD} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <ringGeometry args={[2.7, 2.72, 128]} />
        <meshBasicMaterial color={HAT_GOLD} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

export default function HatScene(props: HatSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 2.3, 6.2], fov: 32 }}
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
```

- [ ] **Step 2: Write the error boundary**

Create `components/home/HatErrorBoundary.tsx`:
```tsx
"use client";

import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { failed: boolean };

/** Renders `fallback` if anything below throws — e.g. WebGL context creation failing. */
export class HatErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D hat unavailable, showing the static hat instead:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
```

- [ ] **Step 3: Write the stage**

Create `components/home/HatStage.tsx`:
```tsx
"use client";

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

type Props = {
  yaw: number;
  onSpin: () => void;
};

export function HatStage({ yaw, onSpin }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-xl md:max-w-none">
      <p className="absolute inset-x-0 top-0 z-10 text-center text-[11px] uppercase tracking-[0.3em] text-gold">
        {t("home.spin")}
      </p>
      {/* Decorative + pointer-only: the carousel is the accessible way to navigate. */}
      <div aria-hidden className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <HatErrorBoundary fallback={<HatFallback />}>
          <HatScene yaw={yaw} reducedMotion={reduceMotion} onSpin={onSpin} />
        </HatErrorBoundary>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit 0. If `react-hooks` lint rules flag a ref access or `setState` in an effect, restructure to keep refs touched only inside effects/`useFrame`/event handlers (as written) rather than suppressing the rule.

- [ ] **Step 5: Commit**

```bash
git add components/home/HatScene.tsx components/home/HatErrorBoundary.tsx components/home/HatStage.tsx
git commit -m "feat(home): add 3D hat scene with drag, click and fallback

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Arch carousel

**Files:**
- Create: `components/home/ArchCarousel.tsx`

**Interfaces:**
- Consumes: `ringOffset`, `wrapIndex` (Task 1), `sectionIcons` (Task 2), keys `carousel.*` and `comingSoon.title` (Task 2 / existing), `getAllSections`, `getPublishedItems` from `@/lib/getContent`.
- Produces: `ArchCarousel({ activeIndex, onChange }: { activeIndex: number; onChange: (index: number) => void })` (named export) — used by Task 6.

- [ ] **Step 1: Write the carousel**

Create `components/home/ArchCarousel.tsx`:
```tsx
"use client";

import { useRef, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getAllSections, getPublishedItems } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ringOffset, wrapIndex } from "./carouselMath";
import { sectionIcons } from "./sectionIcons";

const sections = getAllSections();

/** Horizontal gap between arches, as a % of one arch's width. */
const SPACING = 108;
/** Vertical lift per offset², as a % of one arch's height — bends the row into an arc. */
const LIFT = 3.5;
const TILT_DEG = 5;
const SWIPE_THRESHOLD = 40;

type Props = {
  activeIndex: number;
  onChange: (index: number) => void;
};

function ArrowButton({
  direction,
  label,
  onClick,
}: {
  direction: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="z-20 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy text-gold shadow-md transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-5 w-5"
      >
        <path d={direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

export function ArchCarousel({ activeIndex, onChange }: Props) {
  const { localize, t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const dragged = useRef(false);
  const count = sections.length;

  const go = (delta: number) => onChange(wrapIndex(activeIndex + delta, count));

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
  };

  // Every arch is a real link. Non-active ones just bring themselves to the
  // front on a plain click; modified clicks (new tab, etc.) keep native behaviour.
  const handleArchClick = (event: MouseEvent<HTMLAnchorElement>, index: number, active: boolean) => {
    if (dragged.current) {
      event.preventDefault();
      return;
    }
    if (active || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onChange(index);
  };

  return (
    <section
      aria-label={t("carousel.label")}
      onKeyDown={handleKeyDown}
      className="relative mx-auto w-full max-w-5xl px-4"
    >
      <div className="flex items-center">
        <ArrowButton direction="prev" label={t("carousel.previous")} onClick={() => go(-1)} />

        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragStart={() => {
            dragged.current = true;
          }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -SWIPE_THRESHOLD) go(1);
            else if (info.offset.x > SWIPE_THRESHOLD) go(-1);
            // Let the click that follows a drag pass first, then re-enable clicks.
            window.setTimeout(() => {
              dragged.current = false;
            }, 0);
          }}
          className="relative mx-2 h-60 flex-1 touch-pan-y overflow-x-clip md:h-72"
        >
          {sections.map((section, index) => {
            const offset = ringOffset(index, activeIndex, count);
            const active = offset === 0;
            const distance = Math.abs(offset);
            const Icon = sectionIcons[section.key];
            const hasContent = getPublishedItems(section.key).length > 0;

            return (
              <motion.div
                key={section.key}
                initial={false}
                animate={{
                  x: `${offset * SPACING}%`,
                  y: `${-offset * offset * LIFT}%`,
                  rotate: offset * TILT_DEG,
                  scale: 1 - distance * 0.07,
                  opacity: distance === 3 ? 0.45 : 1,
                }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 30 }}
                style={{ zIndex: 10 - distance }}
                className="absolute bottom-2 left-1/2 -ml-14 w-28 md:-ml-16 md:w-32"
              >
                <Link
                  href={`/${section.key}`}
                  draggable={false}
                  aria-current={active ? "true" : undefined}
                  onClick={(event) => handleArchClick(event, index, active)}
                  className={`flex h-44 flex-col items-center justify-end gap-2 rounded-t-[999px] rounded-b-2xl border px-2 pb-5 pt-10 text-center transition-colors md:h-48 ${
                    active
                      ? "border-gold bg-navy text-gold shadow-[0_0_28px_rgba(201,164,92,0.55)]"
                      : "border-gold/40 bg-cream/80 text-navy hover:border-gold"
                  }`}
                >
                  <Icon className="h-8 w-8 text-gold" />
                  <span className="font-heading text-base font-semibold leading-tight">
                    {localize(section.label)}
                  </span>
                  {!hasContent && (
                    <span className="text-[9px] uppercase tracking-widest opacity-60">
                      {t("comingSoon.title")}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <ArrowButton direction="next" label={t("carousel.next")} onClick={() => go(1)} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/home/ArchCarousel.tsx
git commit -m "feat(home): add arch carousel

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Compose the page and retire RadialNav

**Files:**
- Create: `components/home/HomeLanding.tsx`
- Modify: `app/page.tsx` (full replace)
- Delete: `components/home/RadialNav.tsx`

**Interfaces:**
- Consumes: `HatStage` (Task 4), `ArchCarousel` (Task 5), `wrapIndex`, `yawForIndex` (Task 1), keys `home.*` (Task 2), `LanguageToggle` (`@/components/nav/LanguageToggle`).

- [ ] **Step 1: Write the landing**

Create `components/home/HomeLanding.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { LanguageToggle } from "@/components/nav/LanguageToggle";
import { getAllSections } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ArchCarousel } from "./ArchCarousel";
import { wrapIndex, yawForIndex } from "./carouselMath";
import { HatStage } from "./HatStage";

const sections = getAllSections();

export function HomeLanding() {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const count = sections.length;

  return (
    <main className="relative min-h-svh overflow-hidden bg-cream text-navy">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(255,255,255,0.75),transparent_60%)]"
      />

      {/* The navbar is hidden on Home, so the language control lives here instead. */}
      <div className="absolute right-5 top-5 z-30">
        <LanguageToggle />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 px-6 pb-4 pt-20 md:grid-cols-[1fr_1.5fr_1fr] md:items-center md:pt-14">
        <div>
          <p className="font-heading text-xl italic">{t("home.hello")}</p>
          <h1 className="mt-2 text-5xl font-semibold leading-[1.05] md:text-6xl">
            <span className="block">{t("home.welcome")}</span>
            <span className="block text-gold">{t("home.journey")}</span>
          </h1>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-navy/70">{t("home.body")}</p>
          <Link
            href={`/${sections[activeIndex].key}`}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-medium text-cream shadow-lg transition hover:bg-navy/90"
          >
            {t("home.start")}
            <span aria-hidden className="text-gold">
              ✦
            </span>
          </Link>
        </div>

        <HatStage
          yaw={yawForIndex(activeIndex, count)}
          onSpin={() => setActiveIndex((index) => wrapIndex(index + 1, count))}
        />

        <blockquote className="hidden font-heading text-3xl italic leading-relaxed text-gold md:block">
          “{t("home.quote")}”
        </blockquote>
      </div>

      <ArchCarousel activeIndex={activeIndex} onChange={setActiveIndex} />

      <p className="mt-2 pb-8 text-center text-[11px] uppercase tracking-[0.28em] text-navy/40">
        {t("home.hatHint")}
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Point the page at it**

Replace the whole of `app/page.tsx` with:
```tsx
import { HomeLanding } from "@/components/home/HomeLanding";

export default function Home() {
  return <HomeLanding />;
}
```

- [ ] **Step 3: Delete RadialNav and confirm nothing imports it**

Run:
```bash
git rm components/home/RadialNav.tsx
grep -rn "RadialNav" app components lib
```
Expected: `git rm` succeeds; `grep` prints nothing (exit 1).

- [ ] **Step 4: Full static checks**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all exit 0; the build output lists `/` as a static route and does not error on `ssr: false`.

- [ ] **Step 5: Commit**

```bash
git add components/home/HomeLanding.tsx app/page.tsx
git commit -m "feat(home): compose hat landing page and remove RadialNav

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Visual verification and tuning

**Files:**
- Modify (only if the screenshots show a problem): `components/home/HatScene.tsx` (light intensities, camera), `components/home/hatTexture.ts` (pattern proportions), `components/home/ArchCarousel.tsx` (spacing/lift), `components/home/HomeLanding.tsx` (spacing)

Screenshots go to the session scratchpad, not the repo. Edge path: `/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`.

- [ ] **Step 1: Start the dev server**

Run (background): `npm run dev`
Expected: "Ready" on `http://localhost:3000`.

- [ ] **Step 2: Desktop screenshot**

Run:
```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --enable-logging=stderr --v=0 --virtual-time-budget=10000 --window-size=1440,900 --screenshot="$SCRATCH/home-desktop.png" http://localhost:3000
```
(`$SCRATCH` = the scratchpad directory.) Read the PNG. Check: hat visible with navy body and gold ribs/diamonds; pedestal rings under it; three columns; seven arches in an arc with the first (Awards) navy-filled at the centre; no text overlap. If the hat is too dark, raise `ambientLight`/`directionalLight` intensity in `HatScene.tsx`; if the gold reads flat, raise the `pointLight` intensity.

- [ ] **Step 3: Console check**

From the same command's stderr, look for lines containing `CONSOLE`. Expected: no hydration-mismatch or React errors, and no `THREE.` warnings. Fix any that appear at their source.

- [ ] **Step 4: Mobile screenshot**

Same command with `--window-size=390,844` and output `home-mobile.png`. Check: greeting, then hat, then carousel stack vertically; the quote is hidden; no horizontal page scroll; the arches fit (side ones clipped, not overflowing the page).

- [ ] **Step 5: Fallback screenshot**

Same command with `--disable-3d-apis` (and without the swiftshader flags) → `home-nowebgl.png`. Expected: the static SVG hat renders, the rest of the page is intact, and stderr shows the `3D hat unavailable` warning.

- [ ] **Step 6: Interaction spot-check**

There is no interactive browser in this environment, so verify by reasoning plus one scripted check: run the desktop command with `--dump-dom` and confirm the DOM contains seven `a[href="/awards"]…a[href="/internship"]` links and exactly one with `aria-current="true"`. State clearly in the report that drag, click-to-spin, arrow keys and swipe were verified by code review and build only, not by hand.

- [ ] **Step 7: Tune and re-run**

Apply any fixes from Steps 2–5, then re-run `npm test && npx tsc --noEmit && npm run lint && npm run build` and the affected screenshot.

- [ ] **Step 8: Stop the dev server and commit tuning (if any)**

```bash
git add -A components app
git commit -m "fix(home): tune hat lighting and layout after visual check

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
Skip the commit if nothing changed.

---

## Self-Review

**Spec coverage**
- Layout (3 columns, mobile stack, LanguageToggle, "Start the Magic" → active section): Task 6.
- Hat geometry, texture in one function, sway, drag, click-advances, dynamic `ssr:false`, fallback + error boundary, reduced motion: Tasks 3–4. Reduced motion handled in `HatScene` (`reducedMotion` → no sway, snap) and `ArchCarousel` (`duration: 0`).
- Carousel: 7 arches from sections, arc layout, active styling, buttons / arrow keys / swipe / click-to-focus / real `<Link>`, coming-soon marker, hat↔carousel coupling, inline icons: Tasks 2, 5, 6.
- Visual system (`@theme` colours, existing `font-heading`, i18n EN/VI, quote without attribution, hidden below `md`): Tasks 2, 6.
- Files table: every file has a task; `RadialNav` deleted only after grep confirms no importer.
- Verification (unit tests for math, build, lint, screenshots desktop/mobile/no-WebGL): Tasks 1, 6, 7.

**Placeholder scan:** none — every code step contains the code; commands have expected output.

**Type consistency:** `HatSceneProps` (`yaw`, `reducedMotion`, `onSpin`) matches `HatStage`'s usage; `HatStage({ yaw, onSpin })` matches `HomeLanding`; `ArchCarousel({ activeIndex, onChange })` matches `HomeLanding` (`setActiveIndex` is a `Dispatch<SetStateAction<number>>`, assignable to `(index: number) => void`); helper names (`wrapIndex`, `ringOffset`, `shortestAngle`, `yawForIndex`) are identical across tasks.
