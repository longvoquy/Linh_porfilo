# Online Exhibition — 3D Gallery Hall

**Date:** 2026-10-03
**Status:** Approved, implementation in progress
**Branch:** `feature/online-exhibition`
**Scope:** new route `/exhibition`, a link from `/art-portfolio`, and an additive `MediaRef` change. Other sections are untouched.

## Goal

An online exhibition of the 8 original paintings in the `art-portfolio` section, experienced as a 3D gallery hall. The visitor glides from painting to painting. The existing `/art-portfolio` grid stays as the non-3D view.

## Decisions

- One experience, done well: a 3D hall with guided stops (no free-walk, no 2D corridor mode).
- Lives at a new route `/exhibition`; `/art-portfolio` gets a "Visit the exhibition" link.
- Style: Vietnamese-flavoured hall — cream walls, warm wood floor, gold frames, navy accents, a per-painting spotlight, light touches (lanterns, lotus motif). Uses the site palette, not raw hex in UI code.
- Approach: plain three + `@react-three/fiber` (no `drei`), with pure testable modules for layout and camera.

## Non-goals

Free walking, audio, painting no. 3 (not in the content), a separate lightbox, per-painting deep links.

## Room and camera

- A long hall. The 8 paintings hang alternately on the left and right walls, ordered by painting number (1, 2, 4–9).
- Stop 0 is the entrance: an intro plaque ("Vũ Khánh Linh — Exhibition") with `SealStamp`. Stops 1–8 are the paintings. 9 stops total.
- Each painting is fitted into a fixed maximum box, keeping its aspect ratio (5 landscape, 3 portrait). Each has a gold frame, a spotlight glow and a small label plate.
- Camera glides between stops and faces the painting. Controls: ‹ › buttons, arrow keys, swipe. Dragging looks around slightly. Clicking a painting toggles a closer view.
- A DOM overlay (`ExhibitionHud`) shows title, year, caption (EN/VI via `localize`) and a "3/8" counter, so keyboard and screen-reader users do not depend on the canvas.

## Files

- `app/exhibition/page.tsx` — Server Component (no `revalidate`: the content is static JSON, unlike the Cloudinary-listed chapters). Builds `ExhibitPiece[]` from `getSectionItems("art-portfolio")` (published only, first image media) and passes plain objects to the client.
- `components/exhibition/`
  - `roomLayout.ts` — pure: stop positions, painting size/position from aspect ratio.
  - `cameraRail.ts` — pure: easing and interpolation between stops.
  - `ExhibitionScene.tsx` — R3F scene (room, frames, lights, textures). Loaded with `dynamic(..., { ssr: false })` from a Client Component. React context does not cross `<Canvas>`, so localized text is passed in as props.
  - `ExhibitionStage.tsx` — WebGL probe, fallback while loading or on error (error boundary), mirroring `HatStage`.
  - `ExhibitionHud.tsx` — info card, buttons, counter, key and swipe handling.
  - `ExhibitionFallback.tsx` — plain vertical list of framed paintings, used without WebGL.
- `app/art-portfolio/page.tsx` — add the link.
- `lib/i18n/dictionaries/en.json` + `vi.json` — new UI strings (both).
- `lib/types.ts` — `MediaRef` gains optional `width` and `height`.
- `scripts/add-art-dimensions.mjs` — one-off: reads the local originals in `data/Art Portfolio/` (and `converted/`) and writes `width`/`height` into the 8 `content/art-portfolio/*.json` files.

## Data flow

JSON content → `getSectionItems` → `ExhibitPiece[]` (server) → `ExhibitionStage` (client) → `roomLayout` positions → scene + HUD. Textures come from the Cloudinary URL in `media[0].src` with a `w_2048` transformation. Width/height come from the JSON so the room is laid out correctly before any image loads.

## Error handling and performance

- No WebGL, or a scene error: `ExhibitionFallback` (full info and navigation).
- One image fails to load: that frame shows empty with its title; the others keep working.
- `prefers-reduced-motion`: the camera jumps to the stop instead of gliding.
- Mobile: capped pixel ratio, no dynamic shadows. The spotlight is a glow texture, not a real shadow.

## Testing

- `roomLayout.test.ts`, `cameraRail.test.ts` run by `pnpm test`; no React, DOM or three imports. They cover stop count, no overlapping paintings, aspect ratio kept, and easing endpoints. `pnpm test` globs `components/home/*.test.ts` today, so the script is extended to also cover `components/exhibition/*.test.ts`.
- Visual check is manual (`pnpm dev`). Do not loop-restart the dev server with Playwright on this machine; run `pnpm build` and `pnpm lint` once.

## Revisions

- **2026-10-03:** `/` serves the exhibition (hat landing not routed); the nav bar is hidden over it and a language toggle sits in the HUD. The "View as a grid" links were removed.
- **2026-10-03:** No artist name or entrance sign: the hall is just a gallery. Stop 0 is now an entrance view down the hall with a short intro card; the seal stamp is gone.
- **2026-10-03:** Smoother drag: the canvas renders on demand (`frameloop="demand"`, invalidated while the camera moves or the look-around is off-centre), the HUD no longer uses `backdrop-blur` over the live canvas, and the look-around limit is soft (tanh) instead of a hard clamp.
- **2026-10-03:** Drag-to-look-around removed (holding the mouse to peek at the label was awkward). The full view now frames picture, frame and label together, and a mouse pointer gives a light camera parallax instead. Click-drag does nothing; clicking a painting still toggles the close-up.
- **2026-10-03:** Added an optional walking mode, on top of the guided tour (which stays the default). Offered only where a hovering mouse exists. W A S D / arrows move, Shift runs, and the mouse looks around FPS-style via pointer lock (click the hall to capture, Esc to release). The visitor is kept inside the hall walls; the info card follows the painting being looked at. Code lives in `components/exhibition/walk/` (`walkMath.ts` is pure and tested). "Back to the tour" glides the camera to the current stop.
- **2026-10-03:** `/` is now a landing page with two buttons, Normal mode (`/exhibition`) and WASD mode (`/exhibition/walk`), reusing the old Home look (One Pillar Pagoda and lotus cutouts, gold-leaf title, sparkles) without the hat or carousel. Each button runs the existing page-to-page disc transition. WASD is disabled where there is no hover-capable mouse; opening `/exhibition/walk` there falls back to the tour. The cutouts and `Sparkles` were restored from git history after the cleanup removed them.
