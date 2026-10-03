<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Vũ Khánh Linh — Portfolio

Bilingual (EN/VI) college-application portfolio. Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript, three.js via `@react-three/fiber`, framer-motion, Cloudinary for gallery images.

## This branch: `feature/online-exhibition`

A standalone deployment of a 3D online gallery of the art-portfolio paintings. `/` is a landing page with two buttons — Normal mode (`/exhibition`, guided tour) and WASD mode (`/exhibition/walk`, first-person walking; disabled without a mouse and keyboard). It is **not meant to be merged into `main`**: the nón lá Home landing was removed here, so a merge would delete it from `main`. CI (`.github/workflows/guard-main.yml`) fails any pull request from this branch into `main`. The rest of the site (other sections, nav) is unchanged and still routable by URL. Deploy this branch on its own (e.g. Vercel Production Branch = `feature/online-exhibition`).

## Commands

Package manager is **pnpm** (version pinned in `package.json`). Do not use npm/yarn or commit other lockfiles.

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` — ESLint (flat config, `eslint-config-next`)
- `pnpm test` — `node --test components/exhibition/*.test.ts components/exhibition/walk/*.test.ts` (Node's built-in runner running TS directly; keep tested modules free of React/DOM/three imports)

## Layout

- `app/` — routes. `/` is the mode landing; `/exhibition` and `/exhibition/walk` are the gallery (same `ExhibitionStage`, different `initialMode`). Nav (hidden over the landing and the gallery): `/`, `/about`, `/timeline`, `/portfolio`, `/resume`, `/contact` (placeholders using `ComingSoon`). Portfolio sections live at `/<section.key>`.
- `content/` — the content layer. `sections.ts` defines the 7 sections (key, bilingual label, order); `content/<section>/*.json` are `ActivityItem`s; `all.ts` imports every JSON file.
- `lib/` — `types.ts` (shared types), `getContent.ts` (section/item queries), `chapters.ts` + `cloudinary.ts` (server-only gallery loading), `i18n/` (language context, `useTranslation`, `dictionaries/en.json` + `vi.json`).
- `components/landing/` — `ModeLanding`: the two-button landing (pagoda and lotus cutouts from `public/decor/`; each button runs the page-to-page disc transition).
- `components/exhibition/` — the 3D gallery: pure, node-tested `roomLayout` (hall + painting placement), `cameraRail` (camera poses, damping) and `pieces` (content → `ExhibitPiece[]`, Cloudinary texture URL); `ExhibitionScene` (r3f hall, frames, camera rig), `ExhibitionStage` (WebGL probe + `ExhibitionFallback` + error boundary, mode state), `ExhibitionHud` (DOM info card + controls). `walk/` is the optional first-person mode (`walkMath` pure + tested, `WalkRig`, `useCanWalk`).
- `components/chapters/` — `VisualChapters` renderer (chapter + gallery + lightbox) used by Awards, Leadership, Volunteer.
- `components/activity/` — `ActivityGrid`/`ActivityCard`/`ActivityDetail`, used by the other sections.
- `components/decor/` — `BrandMark`, `Sparkles`. `components/nav/` — `NavBar`, `LanguageToggle`. `components/transition/` — page-to-page disc transition.
- `scripts/` — one-off Node scripts (run with `node scripts/<name>.mjs`), not part of the build.
- `docs/superpowers/specs|plans/` — design specs and plans for past features; read the relevant one before changing that feature.
- `data/` — raw originals (gitignored, local only).

## Content & sections

- Add an item: drop a JSON file in `content/<section>/`, then import it in `content/all.ts`. A section with no items renders "coming soon" automatically.
- Every user-facing string in content is a `LocalizedString` (`{ en, vi }`). UI strings go in **both** `lib/i18n/dictionaries/en.json` and `vi.json` and are read with `t(key)`; localized content is read with `localize(...)`.
- `status: "coming-soon"` items are shown as placeholders; only `published` items become chapters.

## Two page patterns

1. **Visual chapters** (awards, leadership, volunteer): async Server Component calling `getChapters(sectionKey)`, with `export const revalidate = 3600`. Gallery images are discovered at request time from the item's `cloudinaryFolder` (direct children only; an asset named `cover` leads). Never paste image URLs into code — upload to the folder instead.
2. **Activity grid** (art-portfolio, research, internship, passion-projects): `"use client"` page rendering `ActivityGrid` from `getSectionItems`.

Caching uses route-segment `revalidate`, deliberately **not** `use cache` / `cacheComponents` (that would change rendering for every route). Don't switch without discussing it.

## Server-only boundaries

- `lib/cloudinary.ts` and `lib/chapters.ts` are server-only (they read `CLOUDINARY_API_SECRET`; `cloudinary.ts` throws if loaded in the browser). Never import them from a Client Component — pass the plain `ChapterImage` objects down instead.
- Env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env*` (gitignored). Missing credentials degrade galleries to text-only instead of erroring.

## Design system

- Palette is defined once in `app/globals.css` (`:root` + `@theme inline`): `cream`, `ivory`, `navy`, `gold`, `gold-ink`, `gold-lit`. Use the Tailwind tokens (`text-navy`, `bg-cream`, …), not raw hex.
- Contrast rules (documented in `globals.css`): `gold` is **not** a text colour on cream — use `gold-ink` for small accent text.
- Fonts: Geist (sans), Geist Mono, Cormorant Garamond (`font-heading`, headings).
- three.js needs plain hex, so `hallTextures.ts` mirrors the palette as `HALL_COLORS`; keep it in sync with `globals.css`.

## Exhibition (3D)

- `ExhibitionScene` is loaded with `dynamic(..., { ssr: false })`; `ExhibitionStage` probes WebGL first (`lib/webgl.ts`) and falls back to `ExhibitionFallback` (a plain list). React context does not cross `<Canvas>`, so localized text reaches the scene as props.
- The scene renders on demand (`frameloop="demand"`): anything that moves must call `invalidate()` while it moves (the tour rig does; `WalkRig` invalidates every frame). Changing a material's `map` from empty to set needs the material rebuilt (see the `key` on the painting material).
- Painting sizes come from `width`/`height` in each content image (`scripts/add-art-dimensions.mjs` fills them from Cloudinary). Plaque and label text is drawn on a canvas: use a font with full Vietnamese coverage (not Georgia).
- Walking mode is desktop-only (hover + fine pointer) and uses pointer lock; keep `walkMath` free of three/DOM imports so it stays testable.

## Asset scripts

- `add-art-dimensions.mjs` — writes each art-portfolio image's pixel size into its content JSON (via Cloudinary `fl_getinfo`). Re-run after adding a painting.
- `upload-*-to-cloudinary.mjs` — upload local `data/<Section>/` folders to `portfolio/<section>/<slug>/` (certificates go in a `certificates/` subfolder, excluded from galleries).
- `convert-art-pdfs.mjs` — renders art-portfolio PDFs to images (with per-file rotation overrides).
