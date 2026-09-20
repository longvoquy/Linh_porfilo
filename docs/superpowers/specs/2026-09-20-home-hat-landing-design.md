# Home — Conical Hat Landing (3D prototype)

**Date:** 2026-09-20
**Status:** Approved, not yet implemented
**Scope:** `/` (Home) only. No content page, shared component or content JSON changes.
**Reference:** the mockup image supplied by the user (navy + gold nón lá on a cream page, arch carousel below). It is an aesthetic direction, not a pixel-perfect spec.

## Goal

Replace the 2D `RadialNav` on the Home page with a landing built around a 3D
Vietnamese conical hat (nón lá) and an arch carousel that navigates to the
seven portfolio sections. This is a **prototype**: the hat is simple and
generated in code, and the detailed ornament (dragons, lotus, etc.) is
deliberately deferred.

## Non-goals (deferred)

- Detailed hat ornament — only rib lines and bands for now.
- New navbar (About Me, Timeline, Resume, Contact have no pages), Download Resume button, theme toggle.
- Temple / lotus sketches, social icons, sparkle effects.
- A real 3D model (GLB). The texture is isolated in one function so a detailed
  image can replace it later without touching the scene.

## Layout

- **Desktop (`md` and up):** three columns — greeting on the left ("Welcome to
  My Journey" and a "Start the Magic" button), hat in the centre, a quote on
  the right. The arch carousel sits below the hat.
- **Mobile:** stacked — greeting, hat, then a horizontally swipeable carousel.
- `LanguageToggle` stays in the top-right corner (the navbar is still hidden on Home).
- "Start the Magic" links to the currently selected section.

## Hat (3D)

- `three` + `@react-three/fiber`. The scene is loaded with `next/dynamic` and
  `ssr: false` from a Client Component wrapper — per
  `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`, `ssr: false`
  is only valid inside Client Components. The three.js bundle therefore loads
  on Home only.
- Geometry: open-ended cone (body), gold finial at the apex, gold torus rim,
  a glowing disc as the pedestal.
- Texture: drawn on a `<canvas>` — navy base, gold vertical ribs, a few
  horizontal bands — applied with metalness for a brass sheen. The drawing lives
  in a single function (`hatTexture.ts`), the only file to touch when the
  detailed ornament arrives.
- Interaction: a gentle idle sway (a continuous auto-spin would fight the
  carousel-to-hat coupling below, so it was dropped); drag to rotate; clicking
  the hat advances the carousel by one item.
- Fallback (`HatFallback`): static SVG cone, shown while the scene loads and
  when WebGL is unavailable or the scene throws (error boundary). With
  `prefers-reduced-motion` the 3D scene is kept but the sway is off and
  rotation snaps instead of easing.

## Arch carousel

- Seven arches from `content/sections.ts`, laid out along a circular arc. The
  active arch is filled navy with a gold outline; the others are cream.
- Controls: ‹ › buttons, left/right arrow keys, swipe. Clicking a non-active
  arch makes it active; clicking the active arch navigates to `/${section.key}`.
- The arch is a real `<Link>` (DOM), so keyboard and screen-reader users are not
  dependent on the canvas.
- Sections with no published items keep the existing "coming soon" marker
  (`getPublishedItems`).
- Hat and carousel are linked: hat yaw = `activeIndex * (2π / 7)`, so changing
  the active arch rotates the hat one step.
- Icons are inline SVG, one small component per section, collected in one file.

## Visual system

- Palette: cream background, navy, brass gold, added as `@theme` colours
  (`cream`, `navy`, `gold`); only Home uses them, so other pages are unaffected.
- Font: Cormorant Garamond already exists on `dev` (`--font-heading`, applied to
  all `h1`–`h6`; `font-heading` utility elsewhere). No new font is added.
- The quote is shown without the mockup's attribution (it is not the user's to
  fabricate); it is placeholder copy the user can replace. Hidden below `md`.
- Honours `useReducedMotion`.
- Strings for the new copy are added to `lib/i18n/dictionaries/en.json` and `vi.json`.

## Files

| Action | File |
| --- | --- |
| Add | `components/home/HomeLanding.tsx` — page layout; owns `activeIndex` (couples hat and carousel) |
| Add | `components/home/HatStage.tsx` — dynamic-imports the scene, fallback, error boundary |
| Add | `components/home/HatErrorBoundary.tsx` — shows the fallback if the scene throws |
| Add | `components/home/HatScene.tsx` — r3f scene |
| Add | `components/home/HatFallback.tsx` — static SVG hat |
| Add | `components/home/hatTexture.ts` — canvas texture drawing |
| Add | `components/home/ArchCarousel.tsx` — controlled carousel |
| Add | `components/home/carouselMath.ts` (+ `.test.ts`) — pure ring/angle helpers |
| Add | `components/home/sectionIcons.tsx` — inline SVG icons |
| Edit | `app/page.tsx` — renders `HomeLanding` |
| Edit | `app/globals.css` — `cream` / `navy` / `gold` theme colours |
| Edit | `lib/i18n/dictionaries/en.json`, `vi.json` — new strings |
| Edit | `package.json`, `tsconfig.json` — add `three`, `@react-three/fiber`, `@types/three`; a `test` script; allow `.ts` import extensions for the node test |
| Delete | `components/home/RadialNav.tsx` — once nothing imports it |

## Risks

- **Weak GPUs / mobile:** mitigated by the SVG fallback, lazy loading, and a capped device pixel ratio.
- **Prototype will not match the mockup's fidelity.** Accepted; the ornament is the follow-up.
- **Next 16 differs from older versions:** relevant docs are read before each Next-specific change.

## Verification

The project has no test framework. The only real logic (ring offsets, index
wrapping, shortest-angle rotation) is isolated in `carouselMath.ts` and unit
tested with Node's built-in runner (`node --test`, no new dependency).
Everything else is verified with `npm run build`, `npm run lint`, and headless
Edge screenshots of the dev server at desktop and mobile widths:
hat renders and rotates, arrow keys/buttons/swipe change the active arch, the
active arch links to the right section, the fallback appears with WebGL
disabled and with reduced motion, and EN/VI both render.
