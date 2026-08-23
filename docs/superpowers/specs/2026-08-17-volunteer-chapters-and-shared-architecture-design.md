# Volunteer & Philanthropy — Visual Chapters, and Shared Chapter Architecture

**Date:** 2026-08-17
**Status:** Implemented
**Builds on:** [2026-08-15-awards-visual-chapters-design.md](./2026-08-15-awards-visual-chapters-design.md)
**Scope:** `/volunteer` (new), plus a generalizing refactor of the chapter
infrastructure Awards already used. No other section's behavior changes.

## Goal

Give Volunteer & Philanthropy the same visual-chapter treatment as Awards,
without merging their content, routes, or section identity. Per the user's
explicit constraint:

```
getChapters(sectionKey)
      ↓
VisualChapters
      ↓
Chapter
      ↓
ChapterGallery / ChapterLightbox
```

`sectionKey` is the only thing that decides which content loads. The
presentation layer is shared; the data is not.

## Refactor: award-specific → section-agnostic

Nothing from the Awards work was committed yet, so this was a clean rename
rather than a migration:

| Before | After |
| --- | --- |
| `lib/awards.ts` (`getAwardChapters()`, awards-only) | `lib/chapters.ts` (`getChapters(sectionKey)`) |
| `AwardChapter` / `AwardImage` types | `Chapter` / `ChapterImage` |
| `components/awards/AwardsGallery.tsx` | `components/chapters/VisualChapters.tsx` |
| `components/awards/AwardChapter.tsx` | `components/chapters/Chapter.tsx` |
| `components/awards/AwardLightbox.tsx` | `components/chapters/ChapterLightbox.tsx` |
| `components/awards/ChapterGallery.tsx` | `components/chapters/ChapterGallery.tsx` (moved only) |

`lib/cloudinary.ts` was already section-agnostic (`listFolderImages(folder)`
takes any path) and only needed the type rename.

**Intro copy stays per-section.** `VisualChapters` takes an `introKey: DictionaryKey`
prop (`"awards.intro"` vs `"volunteer.intro"`) rather than hardcoding a lookup,
so each section owns its own editorial copy while the component stays generic.
`chapters.count`/`chapters.previousImage`/`chapters.nextImage` i18n keys are
truly generic wording ("Chapters", "Next image") and are shared as-is.

**Collision safety.** `Chapter`'s `aria-labelledby` id is now
`chapter-${item.section}-${item.slug}` (was `award-${item.slug}`) — slugs are
unique per content file today, but prefixing with section is free insurance
against two sections ever colliding on an id.

`app/awards/page.tsx` and `app/volunteer/page.tsx` are both now thin Server
Components: `getChapters(sectionKey)` → `<VisualChapters chapters label
introKey />`.

## Volunteer content — 2 chapters, not 1

`data/Volunteer & Philanthropy/` is a **flat** local folder (unlike Awards'
per-award subfolders) containing 2 certificates and 6 photos. Reading both
certificates directly confirmed two factually distinct activities, not one:

1. **Chắp Cánh Ước Mơ – Vĩnh Thanh** — Hội Liên hiệp Phụ nữ xã Vĩnh Thanh
   (Vĩnh Thanh Women's Union), 2026, supporting orphaned/disadvantaged children
   in Vĩnh Thanh commune. All 6 photos + 1 cert.
2. **Mục Hoạ Nguyệt Hoa** — Event Club, Nguyễn Siêu School, 2025, a fundraiser
   for children at a welfare center under the Department of Health. Cert only,
   no photos — same shape as the Owlypia chapter.

`content/volunteer/vinh-thanh.json` and `content/volunteer/muc-hoa-nguyet-hoa.json`,
wired into `content/all.ts` alongside the existing awards imports (no import
touched or reordered).

## Oversized photos: resize, don't skip

3 of the 6 Vĩnh Thanh photos (11–12.6 MB) exceeded the account's 10 MB upload
limit — the same wall Money Maze's certificate hit, but here it was half the
gallery rather than one of several documents, so skipping wasn't acceptable.

`sharp` was added as a **devDependency** (build-time script only, not a
runtime dependency) to downscale anything over the limit to max 3000px on the
long edge at JPEG q85 before upload — comfortably under 10 MB, still well
above the 1600px width the lightbox ever requests. Verified: the 3 resized
photos landed at 3000×2000, 0.6–0.9 MB each. Originals on disk untouched.

Note: `sharp` was already present in `node_modules` as an **optional**
dependency of Next.js itself (`^0.34.5`, used for Next's built-in image
optimization) — confirmed via the original committed lockfile before this
session touched anything. Promoting it to an explicit devDependency introduced
no new vulnerability; the "5 high severity" `npm audit` findings (js-yaml,
nanoid, next, postcss, sharp/libvips) are all pre-existing and unrelated.

`scripts/upload-volunteer-to-cloudinary.mjs` is a **new script**, not a
generalization of `upload-awards-to-cloudinary.mjs`. The two sections' local
folder shapes differ enough (nested per-award subfolders vs. one flat
directory needing a per-file split, like the VEO/Owlypia case but for the
whole section) that forcing one script to cover both would add branching
without reducing real duplication. This mirrors the user's clarification that
only the *presentation* layer needs to be shared — upload tooling is
dev-only infrastructure, not part of that contract.

## Verification

- All 6 photos + 2 certificates uploaded; `portfolio/volunteer/vinh-thanh/`
  and `portfolio/volunteer/muc-hoa-nguyet-hoa/` follow the same
  folder-per-chapter / `certificates/` subfolder convention as Awards.
- Both certificate URLs return `200` with `Content-Type: application/pdf` and
  valid `%PDF-` magic bytes (PDF delivery was already enabled on the account
  by this point).
- `npx tsc --noEmit`, `npm run lint` (10 pre-existing errors, none in touched
  files), `npm run build`: all clean. `/awards` and `/volunteer` both
  prerender with `revalidate = 3600`.
- Rendered HTML inspected directly: `/volunteer` contains exactly the 2
  Volunteer chapters and none of the 5 Awards chapters, and vice versa — no
  cross-section data leakage.
- Client bundle re-scanned for the Cloudinary secret/key: zero hits (33 files).
- Playwright visual pass (desktop 1440px, mobile 390px): 2 chapters render,
  asymmetric gallery for the 6-photo chapter, cert-only text chapter renders
  correctly with no gallery, lightbox open/next/Escape all functional, both
  cert links correct, zero console errors, zero failed requests. Mobile
  overflow is the same pre-existing `NavBar` 20px issue already flagged for
  Awards — confirmed identical, not a new regression.
- One test-only false alarm: the first Playwright lightbox screenshot looked
  dim/translucent. Traced to a cold Cloudinary cache — the first-ever request
  for that photo's 1600w derivative took 1.4s (vs 0.19s once cached), longer
  than the test's 1s wait. Re-shot warm: renders crisply. Not a code defect;
  `/awards` and `/volunteer` share identical lightbox code.
