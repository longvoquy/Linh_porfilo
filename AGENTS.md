<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Vũ Khánh Linh — Portfolio

Bilingual (EN/VI) college-application portfolio. Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript, three.js via `@react-three/fiber`, framer-motion, Cloudinary for gallery images.

## Commands

Package manager is **pnpm** (version pinned in `package.json`). Do not use npm/yarn or commit other lockfiles.

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` — ESLint (flat config, `eslint-config-next`)
- `pnpm test` — `node --test components/home/*.test.ts` (Node's built-in runner running TS directly; keep tested modules free of React/DOM/three imports)

## Layout

- `app/` — routes. Nav: `/`, `/about`, `/timeline`, `/portfolio`, `/resume`, `/contact` (placeholders using `ComingSoon`). Portfolio sections live at `/<section.key>`.
- `content/` — the content layer. `sections.ts` defines the 7 sections (key, bilingual label, order); `content/<section>/*.json` are `ActivityItem`s; `all.ts` imports every JSON file.
- `lib/` — `types.ts` (shared types), `getContent.ts` (section/item queries), `chapters.ts` + `cloudinary.ts` (server-only gallery loading), `i18n/` (language context, `useTranslation`, `dictionaries/en.json` + `vi.json`).
- `components/home/` — Home landing: 3D nón lá (`HatScene`, `hatGeometry`, `hatTexture`), `HatStage` (WebGL probe + `HatFallback` + error boundary), `ArchCarousel` driven by the hat's yaw (`carouselMath`), `HatHint`, `SpinGuide`.
- `components/chapters/` — `VisualChapters` renderer (chapter + gallery + lightbox) used by Awards, Leadership, Volunteer.
- `components/activity/` — `ActivityGrid`/`ActivityCard`/`ActivityDetail`, used by the other sections.
- `components/decor/` — `BrandMark`, `SealStamp`, `Sparkles`. `components/nav/` — `NavBar`, `LanguageToggle`.
- `scripts/` — one-off Node scripts (run with `node scripts/<name>.mjs`), not part of the build.
- `docs/superpowers/specs|plans/` — design specs and plans for past features; read the relevant one before changing that feature.
- `asset/` — source artwork (committed). `data/` — raw originals (gitignored, local only). `public/decor/` — generated WebPs.

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

- Palette is defined once in `app/globals.css` (`:root` + `@theme inline`): `cream`, `ivory`, `navy`, `gold`, `gold-ink`, `gold-lit`, `vermilion`. Use the Tailwind tokens (`text-navy`, `bg-cream`, …), not raw hex.
- Contrast rules (documented in `globals.css`): `gold` is **not** a text colour on cream — use `gold-ink` for small accent text. `vermilion` is reserved for the seal stamp.
- Fonts: Geist (sans), Geist Mono, Cormorant Garamond (`font-heading`, headings).
- three.js needs plain hex, so `hatTexture.ts` mirrors `--navy`/`--gold-lit` as `HAT_NAVY`/`HAT_GOLD`; keep them in sync with `globals.css`.

## Home hat (3D)

- `HatScene` is loaded with `dynamic(..., { ssr: false })`; `HatStage` probes WebGL first and falls back to `HatFallback` (SVG) — keep both visually in step when the hat design changes.
- The hat surface is `/decor/hat-disc.webp`: a top-down disc painting (`asset/test2.png`) unrolled into a 2560×512 strip by `scripts/prepare-decor.mjs`. The texture size there must match `WIDTH`/`HEIGHT` in `hatTexture.ts`. `PANEL_OFFSET` rotates the artwork so the front faces the initial section (`INITIAL_SECTION = "research"` in `HomeLanding.tsx`).
- `HomeLanding` social links are `"#"` placeholders — fill in real URLs before publishing.

## Asset scripts

- `prepare-decor.mjs` — turns `asset/` etchings (lotus, One Pillar Pagoda) into transparent sepia-ink WebPs and builds `hat-disc.webp`. Re-run after changing any source in `asset/`, and commit the regenerated `public/decor/*.webp`.
- `upload-*-to-cloudinary.mjs` — upload local `data/<Section>/` folders to `portfolio/<section>/<slug>/` (certificates go in a `certificates/` subfolder, excluded from galleries).
- `convert-art-pdfs.mjs` — renders art-portfolio PDFs to images (with per-file rotation overrides).
