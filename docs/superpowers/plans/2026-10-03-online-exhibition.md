# Online Exhibition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 3D gallery hall at `/exhibition` showing the 8 art-portfolio paintings, navigated stop by stop.

**Architecture:** Pure, node-testable modules (`roomLayout`, `cameraRail`, `pieces`) decide where paintings hang and where the camera stands. A react-three-fiber scene renders the hall; a DOM HUD carries all text and controls. The server page shapes content into plain `ExhibitPiece[]` and a client `ExhibitionStage` picks 3D or a 2D list fallback.

**Tech Stack:** Next.js 16 App Router, React 19, three + `@react-three/fiber` (no `drei`), Tailwind v4, framer-motion (`useReducedMotion`), Node test runner.

## Global Constraints

- Package manager is pnpm. No npm/yarn, no other lockfiles.
- Read the relevant guide in `node_modules/next/dist/docs/` before relying on Next behaviour (this Next.js has breaking changes).
- Pure modules (`roomLayout.ts`, `cameraRail.ts`, `pieces.ts`) import no React, DOM or three at runtime. Between pure modules use `import type` only, with a `.ts` extension, so `node --test` runs them.
- Every UI string goes in **both** `lib/i18n/dictionaries/en.json` and `vi.json` and is read with `t(key)`; content strings are read with `localize(...)`.
- Palette via Tailwind tokens (`text-navy`, `bg-cream`, `bg-ivory`, `text-gold-ink`, `border-gold/…`). `gold` is not a small-text colour on cream; `vermilion` is for the seal stamp only. three.js needs plain hex: those live in `hallTextures.ts` as `HALL_COLORS`, mirroring `app/globals.css`.
- `lib/cloudinary.ts` and `lib/chapters.ts` are server-only and are not used here. Image URLs come from content JSON; never paste URLs into code.
- Do not switch caching to `use cache` / `cacheComponents`. The exhibition page needs no `revalidate` (static JSON).
- Do not loop-restart `pnpm dev` with Playwright on this machine. Verify with `pnpm test`, `pnpm lint`, `pnpm build`; the user checks visuals with `pnpm dev`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

---

## File map

| File | Responsibility |
|---|---|
| `lib/types.ts` (modify) | `MediaRef` gains optional `width`, `height` |
| `scripts/add-art-dimensions.mjs` (create) | One-off: write pixel size into `content/art-portfolio/*.json` |
| `components/exhibition/roomLayout.ts` | Pure: hall constants, painting fit and placement |
| `components/exhibition/cameraRail.ts` | Pure: camera poses per stop, fit distance, damping |
| `components/exhibition/pieces.ts` | Pure: `ActivityItem[]` → `ExhibitPiece[]`, Cloudinary texture URL |
| `lib/webgl.ts` (create), `components/home/HatStage.tsx` (modify) | Shared WebGL probe hook |
| `components/exhibition/ExhibitionFallback.tsx` | 2D list when no WebGL |
| `components/exhibition/ExhibitionHud.tsx` | Info card, controls, keyboard |
| `components/exhibition/hallTextures.ts` | Canvas-drawn textures + colours |
| `components/exhibition/ExhibitionScene.tsx` | R3F hall, frames, camera rig |
| `components/exhibition/ExhibitionErrorBoundary.tsx` | Falls back if the scene throws |
| `components/exhibition/ExhibitionStage.tsx` | State, WebGL choice, swipe, wiring |
| `app/exhibition/page.tsx`, `app/art-portfolio/page.tsx` | Route and entry link |
| `lib/i18n/dictionaries/{en,vi}.json` | UI strings |
| `package.json` | `test` script covers `components/exhibition/*.test.ts` |

---

### Task 1: Painting dimensions in content

**Files:**
- Modify: `lib/types.ts` (the `MediaRef` type)
- Create: `scripts/add-art-dimensions.mjs`
- Modify: `content/art-portfolio/*.json` (8 files, written by the script)

**Interfaces:**
- Produces: `MediaRef.width?: number`, `MediaRef.height?: number`; every art-portfolio image media has both set.

- [ ] **Step 1: Extend `MediaRef`**

In `lib/types.ts`, after the `alt?: LocalizedString;` line inside `MediaRef`, add:

```ts
  /** Pixel size of the source image, when known — lets layouts reserve its aspect ratio before it loads. */
  width?: number;
  height?: number;
```

- [ ] **Step 2: Write the script**

`scripts/add-art-dimensions.mjs`:

```js
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "content", "art-portfolio");

/** Cloudinary answers `fl_getinfo` with the original's pixel size as JSON. */
async function sourceSize(src) {
  const infoUrl = src.replace("/upload/f_auto,q_auto/", "/upload/fl_getinfo/");
  if (infoUrl === src) throw new Error(`Not a Cloudinary f_auto,q_auto URL: ${src}`);
  const res = await fetch(infoUrl);
  if (!res.ok) throw new Error(`${res.status} for ${infoUrl}`);
  const { input } = await res.json();
  return { width: input.width, height: input.height };
}

for (const file of (await readdir(DIR)).filter((f) => f.endsWith(".json"))) {
  const filePath = path.join(DIR, file);
  const item = JSON.parse(await readFile(filePath, "utf8"));
  const image = item.media.find((m) => m.type === "image" && m.src);
  if (!image) continue;
  Object.assign(image, await sourceSize(image.src));
  await writeFile(filePath, JSON.stringify(item, null, 2) + "\n");
  console.log(file, `${image.width}x${image.height}`);
}
```

- [ ] **Step 3: Run it**

Run: `node scripts/add-art-dimensions.mjs`
Expected: 8 lines such as `tranh-1.json 2048x1622`, `tranh-5.json 2339x3307` (portrait), no errors. A 4xx/error means the `fl_getinfo` URL form failed — stop and report; do not hand-edit numbers.

- [ ] **Step 4: Check the diff**

Run: `git diff --stat content/ lib/types.ts`
Expected: 8 content files with +2 lines each (`width`, `height`), `lib/types.ts` +3.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts scripts/add-art-dimensions.mjs content/art-portfolio
git commit -m "feat(content): add pixel size to art-portfolio images"
```

---

### Task 2: Room layout (pure, TDD)

**Files:**
- Create: `components/exhibition/roomLayout.ts`
- Test: `components/exhibition/roomLayout.test.ts`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Produces: `type Vec3 = [number, number, number]`; `HALL`; `MAX_PAINTING`; `type Placement = { index: number; side: "left" | "right"; position: Vec3; rotationY: number; width: number; height: number }`; `fitPainting(aspect: number, max?: { width: number; height: number }): { width: number; height: number }`; `layoutPaintings(aspects: number[]): Placement[]`; `hallLength(count: number): number`.

- [ ] **Step 1: Extend the test script**

In `package.json` set:
`"test": "node --test components/home/*.test.ts components/exhibition/*.test.ts"`

- [ ] **Step 2: Write the failing test**

`components/exhibition/roomLayout.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HALL, MAX_PAINTING, fitPainting, hallLength, layoutPaintings } from "./roomLayout.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

const ASPECTS = [1.26, 0.75, 1.41, 0.71, 1.41, 1.41, 1.41, 0.71];

describe("fitPainting", () => {
  it("fits a landscape painting by height", () => {
    const { width, height } = fitPainting(1.41);
    close(height, MAX_PAINTING.height);
    close(width / height, 1.41);
    assert.ok(width <= MAX_PAINTING.width);
  });
  it("fits a portrait painting by height", () => {
    const { width, height } = fitPainting(0.71);
    close(height, MAX_PAINTING.height);
    close(width / height, 0.71);
  });
  it("caps a very wide painting by width", () => {
    const { width, height } = fitPainting(3);
    close(width, MAX_PAINTING.width);
    close(width / height, 3);
  });
});

describe("layoutPaintings", () => {
  const placements = layoutPaintings(ASPECTS);

  it("places one painting per aspect, indexed in order", () => {
    assert.equal(placements.length, 8);
    placements.forEach((p, i) => assert.equal(p.index, i));
  });
  it("alternates left and right walls, starting left", () => {
    placements.forEach((p, i) => assert.equal(p.side, i % 2 === 0 ? "left" : "right"));
  });
  it("hangs on the wall of its side, at a growing distance down the hall", () => {
    placements.forEach((p, i) => {
      const [x, y, z] = p.position;
      assert.equal(Math.sign(x), p.side === "left" ? -1 : 1);
      assert.ok(Math.abs(x) < HALL.width / 2);
      close(y, HALL.paintingY);
      close(z, HALL.firstPaintingZ + i * HALL.spacing);
    });
  });
  it("faces into the hall", () => {
    for (const p of placements) {
      const normalX = Math.sin(p.rotationY);
      assert.ok(p.side === "left" ? normalX > 0.99 : normalX < -0.99);
    }
  });
  it("keeps each painting's aspect ratio", () => {
    placements.forEach((p, i) => close(p.width / p.height, ASPECTS[i]));
  });
  it("never overlaps paintings on the same wall", () => {
    for (const a of placements) {
      for (const b of placements) {
        if (a === b || a.side !== b.side) continue;
        const gap = Math.abs(a.position[2] - b.position[2]) - (a.width + b.width) / 2;
        assert.ok(gap > 0.5, `${a.index} and ${b.index} are ${gap} apart`);
      }
    }
  });
});

describe("hallLength", () => {
  it("runs past the last painting by the end margin", () => {
    close(hallLength(8), HALL.firstPaintingZ + 7 * HALL.spacing + HALL.endMargin);
  });
  it("is still a room when empty", () => {
    close(hallLength(0), HALL.firstPaintingZ + HALL.endMargin);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot find module `./roomLayout.ts`.

- [ ] **Step 4: Implement**

`components/exhibition/roomLayout.ts`:

```ts
export type Vec3 = [number, number, number];

/**
 * The hall runs along +z from the entrance wall at z = 0. Paintings hang on the
 * left (x < 0) and right (x > 0) walls, alternating, each facing into the hall.
 */
export const HALL = {
  width: 8,
  height: 4.4,
  /** z of the first painting, measured from the entrance wall. */
  firstPaintingZ: 7,
  /** Distance down the hall between consecutive paintings (they alternate walls). */
  spacing: 5,
  /** Distance from the last painting to the far wall. */
  endMargin: 6,
  /** Height of a painting's centre. */
  paintingY: 1.7,
  /** Gap between the wall and a painting's centre plane; frames are 0.1 deep, so they touch the wall. */
  wallInset: 0.05,
} as const;

/** Largest box a painting may occupy; the painting is fitted inside it, keeping its aspect ratio. */
export const MAX_PAINTING = { width: 2.8, height: 1.9 } as const;

export type Placement = {
  index: number;
  side: "left" | "right";
  position: Vec3;
  /** Rotation about Y so the painting's front (+z) faces into the hall. */
  rotationY: number;
  width: number;
  height: number;
};

export function fitPainting(
  aspect: number,
  max: { width: number; height: number } = MAX_PAINTING,
): { width: number; height: number } {
  const width = Math.min(max.width, max.height * aspect);
  return { width, height: width / aspect };
}

/** Places paintings in order, given each one's width / height. */
export function layoutPaintings(aspects: number[]): Placement[] {
  return aspects.map((aspect, index) => {
    const side = index % 2 === 0 ? "left" : "right";
    const sign = side === "left" ? -1 : 1;
    const { width, height } = fitPainting(aspect);
    return {
      index,
      side,
      position: [
        sign * (HALL.width / 2 - HALL.wallInset),
        HALL.paintingY,
        HALL.firstPaintingZ + index * HALL.spacing,
      ],
      rotationY: (-sign * Math.PI) / 2,
      width,
      height,
    };
  });
}

export function hallLength(count: number): number {
  const lastPaintingZ = HALL.firstPaintingZ + Math.max(0, count - 1) * HALL.spacing;
  return lastPaintingZ + HALL.endMargin;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm test`
Expected: PASS, including the existing home tests.

- [ ] **Step 6: Commit**

```bash
git add package.json components/exhibition/roomLayout.ts components/exhibition/roomLayout.test.ts
git commit -m "feat(exhibition): add hall layout math"
```

---

### Task 3: Camera rail (pure, TDD)

**Files:**
- Create: `components/exhibition/cameraRail.ts`
- Test: `components/exhibition/cameraRail.test.ts`

**Interfaces:**
- Consumes: `Placement`, `Vec3` (type-only) from `./roomLayout.ts`.
- Produces: `type Pose = { position: Vec3; target: Vec3 }`; `EYE_Y`, `VERTICAL_FOV`, `CLOSE_UP_FACTOR`, `INTRO_POSE`; `fitDistance(width, height, viewportAspect, vfovDeg?): number`; `paintingPose(p: Placement, distance: number): Pose`; `poseForStop(stop: number, placements: Placement[], viewportAspect: number, closeUp: boolean): Pose` (stop 0 = entrance, stop `i` = placement `i - 1`); `damp(current, goal, dt, rate): number`; `dampPose(current: Pose, goal: Pose, dt: number, rate: number): Pose`.

- [ ] **Step 1: Write the failing test**

`components/exhibition/cameraRail.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLOSE_UP_FACTOR,
  EYE_Y,
  INTRO_POSE,
  VERTICAL_FOV,
  damp,
  dampPose,
  fitDistance,
  paintingPose,
  poseForStop,
} from "./cameraRail.ts";
import { layoutPaintings } from "./roomLayout.ts";

const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !== ${expected}`);

const placements = layoutPaintings([1.41, 0.71, 1.26]);
const DESKTOP = 16 / 9;
const PHONE = 9 / 19;

describe("fitDistance", () => {
  it("shows the whole painting on a wide viewport", () => {
    const { width, height } = placements[0];
    const d = fitDistance(width, height, DESKTOP);
    const visibleHeight = 2 * d * Math.tan((VERTICAL_FOV * Math.PI) / 360);
    assert.ok(visibleHeight >= height);
    assert.ok(visibleHeight * DESKTOP >= width);
  });
  it("stands further back on a narrow viewport", () => {
    const { width, height } = placements[0];
    assert.ok(fitDistance(width, height, PHONE) > fitDistance(width, height, DESKTOP));
  });
  it("stays inside the hall", () => {
    const d = fitDistance(100, 100, PHONE);
    assert.ok(d >= 2.6 && d <= 7.5);
  });
});

describe("paintingPose", () => {
  it("stands in front of a left-wall painting, looking at it", () => {
    const p = placements[0];
    const pose = paintingPose(p, 3);
    close(pose.position[0], p.position[0] + 3);
    close(pose.position[1], EYE_Y);
    close(pose.position[2], p.position[2]);
    assert.deepEqual(pose.target, p.position);
  });
  it("stands in front of a right-wall painting, looking at it", () => {
    const p = placements[1];
    const pose = paintingPose(p, 3);
    close(pose.position[0], p.position[0] - 3);
    close(pose.position[2], p.position[2]);
    assert.deepEqual(pose.target, p.position);
  });
});

describe("poseForStop", () => {
  it("stop 0 is the entrance", () => {
    assert.deepEqual(poseForStop(0, placements, DESKTOP, false), INTRO_POSE);
  });
  it("stop 1 is the first painting", () => {
    const pose = poseForStop(1, placements, DESKTOP, false);
    assert.deepEqual(pose.target, placements[0].position);
  });
  it("the close-up is nearer by CLOSE_UP_FACTOR", () => {
    const far = poseForStop(2, placements, DESKTOP, false);
    const near = poseForStop(2, placements, DESKTOP, true);
    const distance = (pose: { position: number[]; target: number[] }) =>
      Math.abs(pose.position[0] - pose.target[0]);
    close(distance(near), distance(far) * CLOSE_UP_FACTOR);
  });
});

describe("damp", () => {
  it("stays put when no time passes", () => close(damp(5, 10, 0, 4), 5));
  it("reaches the goal given long enough", () => assert.ok(Math.abs(damp(5, 10, 100, 4) - 10) < 1e-6));
  it("moves part of the way in between", () => {
    const v = damp(5, 10, 0.1, 4);
    assert.ok(v > 5 && v < 10);
  });
  it("works downward too", () => {
    const v = damp(10, 5, 0.1, 4);
    assert.ok(v < 10 && v > 5);
  });
});

describe("dampPose", () => {
  it("moves position and target toward the goal", () => {
    const next = dampPose(INTRO_POSE, poseForStop(1, placements, DESKTOP, false), 0.1, 4);
    const goal = poseForStop(1, placements, DESKTOP, false);
    assert.ok(next.position[2] > INTRO_POSE.position[2]);
    assert.ok(next.position[2] < goal.position[2]);
    assert.ok(next.target[0] < INTRO_POSE.target[0]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot find module `./cameraRail.ts`.

- [ ] **Step 3: Implement**

`components/exhibition/cameraRail.ts`:

```ts
import type { Placement, Vec3 } from "./roomLayout.ts";

export type Pose = { position: Vec3; target: Vec3 };

/** Eye height of the visitor. */
export const EYE_Y = 1.6;
export const VERTICAL_FOV = 50;
/** The close-up stands this fraction of the full-view distance from the painting. */
export const CLOSE_UP_FACTOR = 0.55;

/** Breathing room around a painting when fitting it to the view (1 = edge to edge). */
const FIT_MARGIN = 1.3;
const MIN_DISTANCE = 2.6;
/** The hall is 8 wide; keep the camera inside it when a narrow screen needs to stand far back. */
const MAX_DISTANCE = 7.5;

/** At the entrance, looking down the hall at the plaque on the entrance wall (z = 0). */
export const INTRO_POSE: Pose = { position: [0, EYE_Y, 4.5], target: [0, 2.1, 0] };

/** How far from a painting the camera must stand for it to fit the viewport. */
export function fitDistance(
  width: number,
  height: number,
  viewportAspect: number,
  vfovDeg: number = VERTICAL_FOV,
): number {
  const tanV = Math.tan((vfovDeg * Math.PI) / 360);
  const tanH = tanV * viewportAspect;
  const needed = FIT_MARGIN * Math.max(height / (2 * tanV), width / (2 * tanH));
  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, needed));
}

/** Stand `distance` in front of the painting, at eye height, looking at its centre. */
export function paintingPose(p: Placement, distance: number): Pose {
  const normalX = Math.sin(p.rotationY);
  const normalZ = Math.cos(p.rotationY);
  const [x, y, z] = p.position;
  return {
    position: [x + normalX * distance, EYE_Y, z + normalZ * distance],
    target: [x, y, z],
  };
}

/** Stop 0 is the entrance; stop `i` (1-based) is painting `i - 1`. */
export function poseForStop(
  stop: number,
  placements: Placement[],
  viewportAspect: number,
  closeUp: boolean,
): Pose {
  if (stop <= 0) return INTRO_POSE;
  const p = placements[stop - 1];
  const distance = fitDistance(p.width, p.height, viewportAspect) * (closeUp ? CLOSE_UP_FACTOR : 1);
  return paintingPose(p, distance);
}

/** Frame-rate independent ease toward `goal`: `rate` is how quickly it closes in (per second). */
export function damp(current: number, goal: number, dt: number, rate: number): number {
  return goal + (current - goal) * Math.exp(-rate * dt);
}

function dampVec(current: Vec3, goal: Vec3, dt: number, rate: number): Vec3 {
  return [
    damp(current[0], goal[0], dt, rate),
    damp(current[1], goal[1], dt, rate),
    damp(current[2], goal[2], dt, rate),
  ];
}

/** Moving the look-at point with the camera is what makes the camera turn smoothly between walls. */
export function dampPose(current: Pose, goal: Pose, dt: number, rate: number): Pose {
  return {
    position: dampVec(current.position, goal.position, dt, rate),
    target: dampVec(current.target, goal.target, dt, rate),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/exhibition/cameraRail.ts components/exhibition/cameraRail.test.ts
git commit -m "feat(exhibition): add camera rail math"
```

---

### Task 4: Exhibit pieces (pure, TDD)

**Files:**
- Create: `components/exhibition/pieces.ts`
- Test: `components/exhibition/pieces.test.ts`

**Interfaces:**
- Consumes: `ActivityItem`, `LocalizedString` types from `@/lib/types` (type-only).
- Produces: `type ExhibitPiece = { slug: string; title: LocalizedString; date?: string; caption: LocalizedString; alt: LocalizedString; src: string; width: number; height: number }`; `toExhibitPieces(items: ActivityItem[]): ExhibitPiece[]`; `aspectOf(piece: ExhibitPiece): number`; `textureUrl(src: string, maxWidth?: number): string`.

- [ ] **Step 1: Write the failing test**

`components/exhibition/pieces.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActivityItem } from "@/lib/types";
import { aspectOf, textureUrl, toExhibitPieces } from "./pieces.ts";

const SRC = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/portfolio/art/x.jpg";

function item(slug: string, overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    slug,
    section: "art-portfolio",
    title: { en: `T ${slug}`, vi: `V ${slug}` },
    date: "2025",
    caption: { en: "c", vi: "c" },
    media: [{ type: "image", src: SRC, width: 2000, height: 1000, alt: { en: "alt", vi: "alt" } }],
    status: "published",
    ...overrides,
  };
}

describe("toExhibitPieces", () => {
  it("orders by painting number, not alphabetically", () => {
    const pieces = toExhibitPieces([item("tranh-10-x"), item("tranh-2-x"), item("tranh-1-x")]);
    assert.deepEqual(
      pieces.map((p) => p.slug),
      ["tranh-1-x", "tranh-2-x", "tranh-10-x"],
    );
  });
  it("skips unpublished items", () => {
    const pieces = toExhibitPieces([item("tranh-1-x"), item("tranh-2-x", { status: "coming-soon" })]);
    assert.equal(pieces.length, 1);
  });
  it("skips items without an image", () => {
    const pieces = toExhibitPieces([item("tranh-1-x", { media: [] }), item("tranh-2-x")]);
    assert.deepEqual(
      pieces.map((p) => p.slug),
      ["tranh-2-x"],
    );
  });
  it("carries the image, size and text across", () => {
    const [piece] = toExhibitPieces([item("tranh-1-x")]);
    assert.equal(piece.src, SRC);
    assert.equal(piece.width, 2000);
    assert.equal(piece.height, 1000);
    assert.deepEqual(piece.alt, { en: "alt", vi: "alt" });
    assert.equal(piece.date, "2025");
  });
  it("falls back to the title for alt, and to 4:3 without a size", () => {
    const [piece] = toExhibitPieces([
      item("tranh-1-x", { media: [{ type: "image", src: SRC }] }),
    ]);
    assert.deepEqual(piece.alt, { en: "T tranh-1-x", vi: "V tranh-1-x" });
    assert.equal(aspectOf(piece), 4 / 3);
  });
  it("puts items without a painting number last", () => {
    const pieces = toExhibitPieces([item("zzz"), item("tranh-3-x")]);
    assert.deepEqual(
      pieces.map((p) => p.slug),
      ["tranh-3-x", "zzz"],
    );
  });
});

describe("aspectOf", () => {
  it("is width over height", () => {
    const [piece] = toExhibitPieces([item("tranh-1-x")]);
    assert.equal(aspectOf(piece), 2);
  });
});

describe("textureUrl", () => {
  it("asks Cloudinary for a capped width", () => {
    assert.equal(
      textureUrl(SRC, 1024),
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1024/v1/portfolio/art/x.jpg",
    );
  });
  it("defaults to 2048 wide", () => {
    assert.ok(textureUrl(SRC).includes("c_limit,w_2048"));
  });
  it("leaves other URLs alone", () => {
    assert.equal(textureUrl("https://example.com/a.jpg"), "https://example.com/a.jpg");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot find module `./pieces.ts`.

- [ ] **Step 3: Implement**

`components/exhibition/pieces.ts`:

```ts
import type { ActivityItem, LocalizedString } from "@/lib/types";

/** One painting, as the exhibition needs it: plain data, safe to pass from server to client. */
export type ExhibitPiece = {
  slug: string;
  title: LocalizedString;
  date?: string;
  caption: LocalizedString;
  alt: LocalizedString;
  src: string;
  width: number;
  height: number;
};

/** Used when an image's size is not in the content: a plain landscape frame. */
const FALLBACK_SIZE = { width: 4, height: 3 };

/** "tranh-9-goc-pho-binh-yen" → 9. Anything else sorts last. */
function paintingNumber(slug: string): number {
  const match = /^tranh-(\d+)/.exec(slug);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function toExhibitPieces(items: ActivityItem[]): ExhibitPiece[] {
  return items
    .filter((item) => item.status === "published")
    .flatMap((item): ExhibitPiece[] => {
      const image = item.media.find((m) => m.type === "image" && m.src);
      if (!image?.src) return [];
      return [
        {
          slug: item.slug,
          title: item.title,
          date: item.date,
          caption: item.caption,
          alt: image.alt ?? item.title,
          src: image.src,
          width: image.width ?? FALLBACK_SIZE.width,
          height: image.height ?? FALLBACK_SIZE.height,
        },
      ];
    })
    .sort((a, b) => paintingNumber(a.slug) - paintingNumber(b.slug));
}

export function aspectOf(piece: ExhibitPiece): number {
  return piece.width / piece.height;
}

/** A Cloudinary delivery URL capped to `maxWidth` (never upscaled). Other URLs pass through. */
export function textureUrl(src: string, maxWidth = 2048): string {
  return src.replace("/upload/f_auto,q_auto/", `/upload/f_auto,q_auto,c_limit,w_${maxWidth}/`);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test`
Expected: PASS (all three exhibition test files + home tests).

- [ ] **Step 5: Commit**

```bash
git add components/exhibition/pieces.ts components/exhibition/pieces.test.ts
git commit -m "feat(exhibition): shape art items into exhibit pieces"
```

---

### Task 5: Shared WebGL probe

**Files:**
- Create: `lib/webgl.ts`
- Modify: `components/home/HatStage.tsx`

**Interfaces:**
- Produces: `useWebGLSupport(): boolean | null` — `null` on the server and during hydration, then `true`/`false`.

- [ ] **Step 1: Create the hook**

`lib/webgl.ts`:

```ts
import { useSyncExternalStore } from "react";

let webglSupport: boolean | undefined;

/**
 * r3f reports a failed WebGL context asynchronously, which an error boundary
 * cannot catch — so probe once up front instead of letting a scene mount.
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

/** `null` on the server and during hydration, so the first client render matches the HTML. */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore<boolean | null>(subscribeNever, detectWebGL, () => null);
}
```

- [ ] **Step 2: Use it in `HatStage`**

In `components/home/HatStage.tsx`:
1. Change `import { useEffect, useState, useSyncExternalStore } from "react";` to `import { useEffect, useState } from "react";`.
2. Add `import { useWebGLSupport } from "@/lib/webgl";` after the `@/components/transition/RouteTransition` import.
3. Delete the `let webglSupport` declaration, the whole `detectWebGL` function with its doc comment, and `const subscribeNever = () => () => {};`.
4. Replace
```tsx
  // `null` on the server and during hydration, so the first client render matches the HTML.
  const webgl = useSyncExternalStore<boolean | null>(subscribeNever, detectWebGL, () => null);
```
with
```tsx
  const webgl = useWebGLSupport();
```

- [ ] **Step 3: Lint and type-check**

Run: `pnpm lint`
Expected: no errors in `lib/webgl.ts` or `HatStage.tsx`.

- [ ] **Step 4: Commit**

```bash
git add lib/webgl.ts components/home/HatStage.tsx
git commit -m "refactor: share the WebGL probe between hat and exhibition"
```

---

### Task 6: Strings and the 2D fallback

**Files:**
- Modify: `lib/i18n/dictionaries/en.json`, `lib/i18n/dictionaries/vi.json`
- Create: `components/exhibition/ExhibitionFallback.tsx`

**Interfaces:**
- Produces: dictionary keys `exhibition.title`, `exhibition.subtitle`, `exhibition.intro`, `exhibition.begin`, `exhibition.visit`, `exhibition.previous`, `exhibition.next`, `exhibition.closer`, `exhibition.stepBack`, `exhibition.backToGrid`, `exhibition.loading`, `exhibition.entrance`, `exhibition.hall`; `ExhibitionFallback({ pieces }: { pieces: ExhibitPiece[] })`.

- [ ] **Step 1: Add the strings**

Append to `en.json` (before the closing `}`, adding a comma after the last existing entry):

```json
  "exhibition.title": "Online Exhibition",
  "exhibition.subtitle": "Original paintings by Vũ Khánh Linh",
  "exhibition.intro": "Walk the hall at your own pace — use the arrows, swipe, or tap a painting to look closer.",
  "exhibition.begin": "Begin the tour",
  "exhibition.visit": "Visit the exhibition",
  "exhibition.previous": "Previous painting",
  "exhibition.next": "Next painting",
  "exhibition.closer": "Look closer",
  "exhibition.stepBack": "Step back",
  "exhibition.backToGrid": "View as a grid",
  "exhibition.loading": "Opening the gallery…",
  "exhibition.entrance": "Entrance",
  "exhibition.hall": "3D exhibition hall"
```

Append to `vi.json` the same keys:

```json
  "exhibition.title": "Triển lãm trực tuyến",
  "exhibition.subtitle": "Tranh gốc của Vũ Khánh Linh",
  "exhibition.intro": "Dạo bước trong phòng tranh theo nhịp của bạn — dùng mũi tên, vuốt, hoặc chạm vào tranh để xem gần hơn.",
  "exhibition.begin": "Bắt đầu tham quan",
  "exhibition.visit": "Tham quan triển lãm",
  "exhibition.previous": "Tranh trước",
  "exhibition.next": "Tranh tiếp theo",
  "exhibition.closer": "Xem gần hơn",
  "exhibition.stepBack": "Lùi lại",
  "exhibition.backToGrid": "Xem dạng lưới",
  "exhibition.loading": "Đang mở phòng tranh…",
  "exhibition.entrance": "Lối vào",
  "exhibition.hall": "Phòng triển lãm 3D"
```

- [ ] **Step 2: Write the fallback**

`components/exhibition/ExhibitionFallback.tsx`:

```tsx
"use client";

import Link from "next/link";
import { SealStamp } from "@/components/decor/SealStamp";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { textureUrl, type ExhibitPiece } from "./pieces";

/** The exhibition without WebGL: the same paintings as a plain vertical list of framed works. */
export function ExhibitionFallback({ pieces }: { pieces: ExhibitPiece[] }) {
  const { t, localize } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-12 text-center">
        <SealStamp className="mx-auto mb-4 h-12 w-12" />
        <h1 className="font-heading text-4xl font-semibold text-navy">{t("exhibition.title")}</h1>
        <p className="mt-2 text-navy/70">{t("exhibition.subtitle")}</p>
      </header>

      <ol className="space-y-16">
        {pieces.map((piece) => (
          <li key={piece.slug}>
            <figure className="border-[10px] border-gold/70 bg-ivory p-3 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={textureUrl(piece.src, 1400)}
                width={piece.width}
                height={piece.height}
                alt={localize(piece.alt)}
                loading="lazy"
                className="h-auto w-full"
              />
            </figure>
            <div className="mt-4 text-center">
              <h2 className="font-heading text-2xl font-semibold text-navy">{localize(piece.title)}</h2>
              {piece.date && <p className="text-sm text-gold-ink">{piece.date}</p>}
              <p className="mx-auto mt-2 max-w-xl text-navy/80">{localize(piece.caption)}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-14 text-center">
        <Link href="/art-portfolio" className="text-gold-ink underline underline-offset-4">
          {t("exhibition.backToGrid")}
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors (the dictionary keys type-check via `DictionaryKey`).

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/dictionaries components/exhibition/ExhibitionFallback.tsx
git commit -m "feat(exhibition): add strings and 2D fallback list"
```

---

### Task 7: HUD

**Files:**
- Create: `components/exhibition/ExhibitionHud.tsx`

**Interfaces:**
- Consumes: `ExhibitPiece` (`./pieces`), dictionary keys from Task 6.
- Produces: `ExhibitionHud({ pieces, stop, closeUp, onGo, onToggleCloseUp })` where `stop` 0 = entrance, `1..pieces.length` = paintings; `onGo(stop: number)` (the caller clamps), `onToggleCloseUp()`.

- [ ] **Step 1: Write the HUD**

`components/exhibition/ExhibitionHud.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SealStamp } from "@/components/decor/SealStamp";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { ExhibitPiece } from "./pieces";

type Props = {
  pieces: ExhibitPiece[];
  /** 0 is the entrance; 1..pieces.length are the paintings. */
  stop: number;
  closeUp: boolean;
  onGo: (stop: number) => void;
  onToggleCloseUp: () => void;
};

const buttonClass =
  "pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-gold/40 bg-ivory/90 text-xl text-navy shadow backdrop-blur transition-opacity hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink disabled:cursor-default disabled:opacity-30";

/**
 * Everything the visitor reads or presses. The canvas is decorative; this layer
 * is the accessible one — real buttons, real text, arrow-key navigation.
 */
export function ExhibitionHud({ pieces, stop, closeUp, onGo, onToggleCloseUp }: Props) {
  const { t, localize } = useTranslation();
  const last = pieces.length;
  const piece = stop > 0 ? pieces[stop - 1] : null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "ArrowRight") onGo(stop + 1);
      else if (event.key === "ArrowLeft") onGo(stop - 1);
      else if (event.key === "Escape" && closeUp) onToggleCloseUp();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop, closeUp, onGo, onToggleCloseUp]);

  return (
    <div className="pointer-events-none absolute inset-0">
      <h1 className="sr-only">{t("exhibition.title")}</h1>

      <Link
        href="/art-portfolio"
        className="pointer-events-auto absolute left-4 top-4 rounded-full border border-gold/40 bg-ivory/90 px-4 py-2 text-sm text-navy shadow backdrop-blur hover:bg-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
      >
        {t("exhibition.backToGrid")}
      </Link>

      <button
        type="button"
        aria-label={t("exhibition.previous")}
        disabled={stop <= 0}
        onClick={() => onGo(stop - 1)}
        className={`${buttonClass} absolute left-3 top-1/2 -translate-y-1/2`}
      >
        <span aria-hidden>‹</span>
      </button>
      <button
        type="button"
        aria-label={t("exhibition.next")}
        disabled={stop >= last}
        onClick={() => onGo(stop + 1)}
        className={`${buttonClass} absolute right-3 top-1/2 -translate-y-1/2`}
      >
        <span aria-hidden>›</span>
      </button>

      <section
        key={stop}
        aria-live="polite"
        className="pointer-events-auto absolute inset-x-4 bottom-4 rounded-2xl border border-gold/30 bg-ivory/90 p-5 text-navy shadow-lg backdrop-blur md:inset-x-auto md:bottom-8 md:left-8 md:max-w-md"
      >
        {piece ? (
          <>
            <p className="text-xs tracking-widest text-gold-ink uppercase">
              {stop} / {last}
            </p>
            <h2 className="font-heading mt-1 text-2xl font-semibold">{localize(piece.title)}</h2>
            {piece.date && <p className="text-sm text-gold-ink">{piece.date}</p>}
            <p className="mt-2 text-sm text-navy/80">{localize(piece.caption)}</p>
            <button
              type="button"
              aria-pressed={closeUp}
              onClick={onToggleCloseUp}
              className="mt-4 rounded-full border border-navy/30 px-4 py-1.5 text-sm hover:bg-navy hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
            >
              {closeUp ? t("exhibition.stepBack") : t("exhibition.closer")}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <SealStamp className="h-11 w-11 shrink-0" />
              <div>
                <p className="text-xs tracking-widest text-gold-ink uppercase">{t("exhibition.entrance")}</p>
                <p className="font-heading text-2xl font-semibold">{t("exhibition.subtitle")}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-navy/80">{t("exhibition.intro")}</p>
            <button
              type="button"
              onClick={() => onGo(1)}
              className="mt-4 rounded-full bg-navy px-5 py-2 text-sm text-cream hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
            >
              {t("exhibition.begin")}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/exhibition/ExhibitionHud.tsx
git commit -m "feat(exhibition): add HUD with info card and controls"
```

---

### Task 8: 3D scene

**Files:**
- Create: `components/exhibition/hallTextures.ts`
- Create: `components/exhibition/ExhibitionScene.tsx`

**Interfaces:**
- Consumes: `layoutPaintings`, `hallLength`, `HALL`, `Placement` (`./roomLayout`); `poseForStop`, `dampPose`, `damp`, `INTRO_POSE`, `VERTICAL_FOV`, `Pose` (`./cameraRail`); `ExhibitPiece`, `aspectOf`, `textureUrl` (`./pieces`).
- Produces: `default export function ExhibitionScene(props: SceneProps)` and `type SceneProps = { pieces: ExhibitPiece[]; plates: { title: string; date?: string }[]; plaque: { title: string; subtitle: string }; stop: number; closeUp: boolean; reducedMotion: boolean; onSelect: (stop: number) => void; onToggleCloseUp: () => void; onReady?: () => void }`. `plates[i]` is the label text for `pieces[i]`. React context does not cross `<Canvas>`, so the scene never calls i18n hooks.

- [ ] **Step 1: Canvas-drawn textures**

`components/exhibition/hallTextures.ts`:

```ts
import { CanvasTexture, SRGBColorSpace } from "three";

/** Plain hex for three.js. Keep in step with `--cream`, `--ivory`, `--navy`, `--gold`, `--gold-lit` in app/globals.css. */
export const HALL_COLORS = {
  cream: "#f6efe3",
  ivory: "#fffdf8",
  navy: "#14213d",
  gold: "#b8935a",
  goldLit: "#c9a45c",
} as const;

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  draw(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Wood planks running along the canvas' y axis, with a little deterministic variation. */
export function createFloorTexture(): CanvasTexture {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const planks = 8;
    const plankWidth = w / planks;
    for (let i = 0; i < planks; i++) {
      const shade = 0.86 + (((i * 37) % 11) / 11) * 0.24;
      ctx.fillStyle = `rgb(${Math.round(150 * shade)},${Math.round(104 * shade)},${Math.round(66 * shade)})`;
      ctx.fillRect(i * plankWidth, 0, plankWidth, h);
      // One cross-seam per plank, at a different height each time.
      const seam = h * (((i * 53) % 7) / 7);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(i * plankWidth, seam, plankWidth, 2);
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let i = 0; i <= planks; i++) ctx.fillRect(i * plankWidth - 1, 0, 2, h);
  });
}

/** A soft warm pool of light, for blending additively onto the wall behind a painting. */
export function createGlowTexture(): CanvasTexture {
  return canvasTexture(256, 256, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(255,226,160,0.55)");
    gradient.addColorStop(1, "rgba(255,226,160,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });
}

type PlaqueLine = { text: string; size: number; color: string };

/** A flat plaque with centred lines of serif text — painting labels and the entrance sign. */
export function createPlaqueTexture(
  lines: PlaqueLine[],
  background: string,
  width = 1024,
  height = 256,
): CanvasTexture {
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = HALL_COLORS.gold;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const total = lines.reduce((sum, line) => sum + line.size * 1.3, 0);
    let y = (h - total) / 2;
    for (const line of lines) {
      y += (line.size * 1.3) / 2;
      ctx.fillStyle = line.color;
      ctx.font = `600 ${line.size}px Georgia, "Times New Roman", serif`;
      ctx.fillText(line.text, w / 2, y, w - 80);
      y += (line.size * 1.3) / 2;
    }
  });
}
```

- [ ] **Step 2: The scene**

`components/exhibition/ExhibitionScene.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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

type LookState = { yaw: number; pitch: number; dragging: boolean; moved: number };

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Drags nudge the view a little; releasing eases it back. Also tells clicks from drags. */
function Rig({
  placements,
  stop,
  closeUp,
  reducedMotion,
  look,
}: {
  placements: Placement[];
  stop: number;
  closeUp: boolean;
  reducedMotion: boolean;
  look: RefObject<LookState>;
}) {
  const camera = useThree((state) => state.camera);
  const dom = useThree((state) => state.gl.domElement);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const goal = useMemo(
    () => poseForStop(stop, placements, aspect, closeUp),
    [stop, placements, aspect, closeUp],
  );
  const pose = useRef<Pose | null>(null);

  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    const onDown = (event: PointerEvent) => {
      look.current.dragging = true;
      look.current.moved = 0;
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
      state.moved += Math.abs(dx) + Math.abs(dy);
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
  }, [dom, look]);

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
  look,
  onSelect,
  onToggleCloseUp,
}: {
  piece: ExhibitPiece;
  placement: Placement;
  plate: { title: string; date?: string };
  glow: Texture;
  active: boolean;
  look: RefObject<LookState>;
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
          if (look.current.moved > CLICK_SLOP) return;
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
  const look = useRef<LookState>({ yaw: 0, pitch: 0, dragging: false, moved: 0 });

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
        look={look}
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
          look={look}
          onSelect={onSelect}
          onToggleCloseUp={onToggleCloseUp}
        />
      ))}
    </Canvas>
  );
}
```

- [ ] **Step 3: Lint and type-check**

Run: `pnpm lint`
Expected: no errors. If `react-hooks` rules flag a ref write or an effect, restructure minimally (do not disable rules blanket-wide) and note it in the commit message.

- [ ] **Step 4: Commit**

```bash
git add components/exhibition/hallTextures.ts components/exhibition/ExhibitionScene.tsx
git commit -m "feat(exhibition): add the 3D hall scene"
```

---

### Task 9: Stage, route and entry link

**Files:**
- Create: `components/exhibition/ExhibitionErrorBoundary.tsx`
- Create: `components/exhibition/ExhibitionStage.tsx`
- Create: `app/exhibition/page.tsx`
- Modify: `app/art-portfolio/page.tsx`

**Interfaces:**
- Consumes: everything above. `ComingSoon` from `@/components/ComingSoon`.
- Produces: route `/exhibition`; `ExhibitionStage({ pieces }: { pieces: ExhibitPiece[] })`.

- [ ] **Step 1: Error boundary**

`components/exhibition/ExhibitionErrorBoundary.tsx`:

```tsx
"use client";

import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { failed: boolean };

/** Renders `fallback` if anything below throws — e.g. the 3D scene failing to start. */
export class ExhibitionErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D exhibition unavailable, showing the list instead:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
```

- [ ] **Step 2: Stage**

`components/exhibition/ExhibitionStage.tsx`:

```tsx
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
  const plaque = useMemo(
    () => ({ title: "Vũ Khánh Linh", subtitle: t("exhibition.title") }),
    [t],
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
```

- [ ] **Step 3: Page**

`app/exhibition/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ExhibitionStage } from "@/components/exhibition/ExhibitionStage";
import { toExhibitPieces } from "@/components/exhibition/pieces";
import { getPublishedItems } from "@/lib/getContent";

export const metadata: Metadata = {
  title: "Online Exhibition — Vũ Khánh Linh",
  description: "A walk through the original paintings of Vũ Khánh Linh, in a 3D gallery hall.",
};

export default function ExhibitionPage() {
  const pieces = toExhibitPieces(getPublishedItems("art-portfolio"));

  return (
    <main>
      <ExhibitionStage pieces={pieces} />
    </main>
  );
}
```

- [ ] **Step 4: Entry link on `/art-portfolio`**

Replace the body of `app/art-portfolio/page.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { ActivityGrid } from "@/components/activity/ActivityGrid";
import { getSectionItems, getSectionMeta } from "@/lib/getContent";
import { useTranslation } from "@/lib/i18n/useTranslation";

const meta = getSectionMeta("art-portfolio")!;
const items = getSectionItems("art-portfolio");

export default function ArtPortfolioPage() {
  const { t, localize } = useTranslation();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-navy">{localize(meta.label)}</h1>
        <Link
          href="/exhibition"
          className="rounded-full bg-navy px-5 py-2 text-sm text-cream hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
        >
          {t("exhibition.visit")}
        </Link>
      </div>
      <ActivityGrid items={items} />
    </main>
  );
}
```

- [ ] **Step 5: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/exhibition app/exhibition app/art-portfolio/page.tsx
git commit -m "feat(exhibition): add /exhibition route, stage and entry link"
```

---

### Task 10: Verification

**Files:** none (fixes only if something fails).

- [ ] **Step 1: Tests** — Run `pnpm test`. Expected: all pass (home + exhibition).
- [ ] **Step 2: Lint** — Run `pnpm lint`. Expected: clean.
- [ ] **Step 3: Production build** — Run `pnpm build`. Expected: succeeds, `/exhibition` listed as a static route, no type errors. If it fails on `.ts`-extension imports between modules, drop the extension from non-test imports only if the module is not run by `node --test`; report what was changed.
- [ ] **Step 4: Report** — State plainly what passed. Visual behaviour (glide, drag-look, close-up, swipe, language switch, fallback) is **not** verified by these steps; tell the user to run `pnpm dev` and open `/exhibition`, with the checklist: 9 stops reachable by ‹ ›, arrow keys and swipe; click a painting to get closer, again to step back; EN/VI toggle updates the info card and the wall plates; the 8 grid items still show on `/art-portfolio`; with WebGL disabled the list appears.
