# Awards & Honors — Visual Chapter Gallery

**Date:** 2026-08-15
**Status:** Approved, implementing
**Scope:** `/awards` route only. No other section page changes behavior.

## Goal

Replace the generic `ActivityGrid` on `/awards` with an editorial "visual chapter"
experience: one award = one chapter, each chapter holding a full image gallery
discovered dynamically from Cloudinary.

Target UX flow:

```
Home radial nav → Awards & Honors → Visual Chapters → click image → lightbox
```

## Constraints (from the user)

1. Keep the existing `ActivityItem` JSON-based content architecture.
2. `cloudinaryFolder?: string` is the preferred source for gallery discovery.
3. Keep `media[]` for certificate/document assets; preserve certificate viewing.
4. Cloudinary stays server-only. The API secret never reaches the client.
5. Prefer a `cover` asset as the chapter's primary image.
6. Deterministic fallback when no `cover` exists: earliest-created asset.
7. Discovery stays dynamic — no generated asset manifest committed to git.
8. 2–3 deterministic asymmetric CSS grid templates.
9. Reuse existing lightbox behavior; no new gallery/lightbox dependency.
10. Only use Framer Motion because it is already installed (`^12.43.0`).
11. Changes scoped to Awards; shared components only extended backward-compatibly.
12. No behavior change to other activity/section pages.

## Framework notes (Next.js 16.2.12)

Verified against the bundled docs in `node_modules/next/dist/docs`, per `AGENTS.md`:

- `unstable_cache` is **replaced by `use cache`** in Next 16. `use cache` requires
  the `cacheComponents` flag, which is a **global** config change and would alter
  rendering/error semantics for every route — this violates constraint 12.
- With Cache Components disabled, the route segment export `export const revalidate`
  is still supported (it is only removed *when* Cache Components is enabled).
  The value must be a statically analyzable literal.

**Decision:** cache with `export const revalidate = 3600` on `app/awards/page.tsx`.
This is scoped to the awards route, requires no global config, and keeps the
Cloudinary Admin API call off the hot path (one call per hour, not per request).

## Architecture

### Data model

`ActivityItem` gains one optional, backward-compatible field:

```ts
/** Cloudinary folder whose images form this item's gallery, e.g.
 *  "portfolio/awards/bebras-2025-2026". Discovered at request time. */
cloudinaryFolder?: string;
```

Nothing else about `ActivityItem` changes. Existing items without the field are
unaffected, so other sections keep working untouched.

Cloudinary layout — folder = award, files inside = that award's gallery:

```
portfolio/awards/
├── bebras-2025-2026/
│   ├── cover.jpg          ← preferred primary image
│   ├── <photo>.jpg
│   └── certificates/      ← PDFs, excluded from the gallery
├── money-maze/
├── veo-owlypia/
└── nguyen-sieu-scholarship/
```

Gallery discovery lists **direct children only** — a `public_id` whose remainder
after the folder prefix contains no `/`. That keeps `certificates/` out of the
visual gallery while preserving "folder = award" semantics.

### Server/client split

Localization (`useTranslation`) is a client React context, so the current awards
page is a Client Component. Cloudinary must stay server-side. Therefore:

- `app/awards/page.tsx` — **Server Component**. Calls the Cloudinary helper,
  passes fully-serializable plain data down. Sets `revalidate = 3600`.
- `components/awards/AwardsGallery.tsx` — **Client Component**. Owns localization
  and lightbox state.

All Cloudinary delivery URLs (thumbnail `srcSet` + full-size lightbox URL) are
**precomputed on the server** and passed down as plain strings. The client never
needs the cloud name, API key, or secret — nothing Cloudinary-related is imported
into a client module.

### New/changed types

```ts
export type AwardImage = {
  id: string;          // Cloudinary public_id, used as React key
  src: string;         // default-size delivery URL
  srcSet: string;      // responsive candidates for the grid
  full: string;        // larger URL used by the lightbox
  width: number;
  height: number;
};

export type AwardChapter = {
  item: ActivityItem;  // title/org/date/tier/caption/media (certificate)
  images: AwardImage[];// primary image first
};
```

### Files

| File | Purpose |
| --- | --- |
| `lib/types.ts` | + `cloudinaryFolder?`, `AwardImage`, `AwardChapter` |
| `lib/cloudinary.ts` | **Server-only.** Admin API listing + delivery URL builders |
| `lib/awards.ts` | Composes awards content with Cloudinary images |
| `app/awards/page.tsx` | Server Component, `revalidate = 3600` |
| `components/awards/AwardsGallery.tsx` | Client root: header, chapters, lightbox state |
| `components/awards/AwardChapter.tsx` | One chapter: number, title, meta, gallery, cert link |
| `components/awards/ChapterGallery.tsx` | Asymmetric grid templates + overflow rows |
| `components/awards/AwardLightbox.tsx` | Fullscreen viewer with prev/next/Escape |
| `content/awards/*.json` | 4 award chapters |
| `scripts/upload-awards-to-cloudinary.mjs` | One-off uploader for the local folders |

`package.json`: `cloudinary` moves from `devDependencies` to `dependencies`,
because it is now imported by server runtime code rather than only by a CLI script.

### Cover selection (deterministic)

1. Direct child whose public_id basename is exactly `cover`.
2. Otherwise the earliest asset by `created_at`, tie-broken by `public_id`.

No image analysis, no randomness.

### Gallery composition

Three deterministic templates on a 12-column grid, selected by
`chapterIndex % 3` — varied but never random, and stable across reloads:

- **A** — large primary left (7 cols, 4:3) + two stacked secondaries right (5 cols).
- **B** — mirror of A: two stacked secondaries left, large primary right.
- **C** — full-bleed primary (12 cols, 16:9) + two equal images below (6 cols each).

Images beyond the first three flow into a uniform 3-column "continuation" grid
below the feature composition, so a 20-image award stays readable rather than
generating ever more complex geometry.

A chapter with exactly **one** image bypasses the templates and renders at the
image's natural aspect ratio, width-capped and centred. Found during
implementation: VEO & Owlypia has a single near-square (1777×1776) photo, and
template C's 16:9 cell would have cropped away most of it.

Composed cells use fixed aspect-ratio containers with `object-cover` to keep the
editorial rhythm; the lightbox shows the full uncropped image via `object-contain`.

**Responsive:** single-column stack on mobile (templates collapse — no attempt to
preserve desktop geometry), 12-col compositions from `md` up. No horizontal overflow.

### Images and performance

Plain `<img>` with `loading="lazy"`, `decoding="async"`, `sizes`, and a Cloudinary
`srcSet` — matching the existing codebase convention (the project uses `<img>`
throughout, not `next/image`, so no `images.remotePatterns` config is needed).

Delivery URLs use `f_auto,q_auto` plus an explicit width (`w_<n>,c_limit`) and the
asset version, so overwrites can't be served stale from cache. Grid candidates:
400/640/900/1200w. Lightbox: 1600w. Full-resolution originals are never requested.

### Lightbox

A dedicated `AwardLightbox` under `components/awards/`, built with the same
Framer Motion overlay patterns already used by `ActivityDetail` (fixed overlay,
`AnimatePresence`, backdrop-click to close) and no new dependency.

`ActivityDetail` itself is left **unmodified**: it is a metadata detail modal
(title, caption, certificate link) shared by every other section, whereas the
awards lightbox is a minimal-chrome image viewer with prev/next. Building a
separate component satisfies constraint 9's intent (reuse patterns, add no
dependency) while guaranteeing constraints 11 and 12.

Supports: next, previous, close, Escape, ← / → keys, wrap-around, touch-friendly
hit targets, focus restore on close, and `aria-modal` labelling.

### Animation

Framer Motion `whileInView` (already a dependency; this is a new usage of it —
no new package) for a subtle chapter fade/slide-in, `once: true`. Hover scale
1.03 on images. `useReducedMotion()` is respected, matching `RadialNav`.

### Failure handling

If Cloudinary credentials are missing or the API call fails, `lib/awards.ts`
logs server-side and returns chapters with empty `images`. The page still renders
each chapter's text content — the awards page never hard-fails on a network error.
Awards whose `status` is not `published` are filtered out, as today.

### Certificates (implementation note)

Certificates upload to `<slug>/certificates/` as **raw** resources and are linked
from `media[]` as `type: "pdf"`, preserving the existing viewing behaviour.

This Cloudinary account has the **"PDF and ZIP files delivery"** security
restriction enabled, which returns `401` for PDF delivery as *both* image and raw
resources. The uploaded URLs are correct and go live the moment that setting is
unticked in Cloudinary → Settings → Security; no code change is needed. (A
PDF→JPG page-1 transform was verified to still work, and remains the fallback if
the restriction is kept.)

Money Maze's certificate (24 MB) exceeds the account's 10 MB upload limit, so
that chapter ships with no certificate link.

### VEO and Owlypia (implementation note)

Split into two chapters — `veo.json` and `owlypia.json` — rather than one merged
chapter, since they are separate achievements that happened to share a local
folder. Their Cloudinary assets were moved with `uploader.rename` (no
re-upload) into `portfolio/awards/veo/` and `portfolio/awards/owlypia/`.
`scripts/upload-awards-to-cloudinary.mjs` now maps that one local folder to two
slugs by filename prefix (`veo…` / `owlypia…`).

### Visual pass findings (Playwright, desktop 1440px + mobile 390px)

- **Fixed:** `AwardLightbox`'s header row wrapped onto three lines on narrow
  viewports — the title `<span>` had `truncate` but no `min-w-0`, so it never
  actually shrank and squeezed the counter/close controls into a wrapped
  column. Fixed by adding `min-w-0 flex-1` to the title and `shrink-0` to the
  controls group.
- **Added:** a single-image chapter (`SoloFeature`) renders at that image's
  natural aspect ratio rather than a template — VEO has one near-square photo
  that a 16:9 or 4:3 template would have cropped hard.
- **Pre-existing, out of scope:** `/awards` and every other page (verified on
  `/leadership`) has a 20px mobile horizontal-scroll overflow from `NavBar`'s
  pill links (`-translate-x-1/2` on a fixed `w-40`), unrelated to this work.
  Flagged for the user; not fixed here per the "scoped to Awards" constraint.
- Confirmed via automated pass: 5 chapters render (Bebras, Money Maze, VEO,
  Owlypia, Nguyễn Siêu), lightbox open/next/Escape all functional, zero
  console errors, zero failed network requests (all 18 images + cert link load
  with 2xx).

## Out of scope

- Video. Money Maze's `.mp4` files are not uploaded or rendered (user decision:
  images only for now).
- Other sections migrating to `cloudinaryFolder` — the field is available to them
  later, but no other page is touched.

## Acceptance

- Chapters render with number, title, category/year, gallery, optional cert link.
- Adding images to an award = upload to its Cloudinary folder, no code change.
- Adding an award = one JSON file + one import line, matching existing convention.
- No Cloudinary secret in any client bundle.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass.
- No horizontal overflow at 375px, 768px, 1440px.
