# Leadership — Visual Chapter Gallery

**Date:** 2026-08-19
**Status:** Implemented
**Builds on:** [2026-08-17-volunteer-chapters-and-shared-architecture-design.md](./2026-08-17-volunteer-chapters-and-shared-architecture-design.md)
**Scope:** `/leadership` only. No shared component or other section changed.

## Goal

Third and final section to adopt the visual-chapter pattern. Unlike the
Volunteer round, this required **zero changes to shared infrastructure** — the
`getChapters(sectionKey)` → `VisualChapters` → `Chapter` →
`ChapterGallery`/`ChapterLightbox` chain was reused exactly as-is, which is the
payoff of the generalizing refactor done for Volunteer.

## Chapters — 4, from 3 of the 4 local folders

`data/Leadership/` has four subfolders. Three produced chapters:

| Chapter | Source | Photos |
| --- | --- | --- |
| Student Council – Music & Drama Night Organizing Committee | `Nguyen Sieu Student Council/HĐHS_Ban tổ chức đêm nhạc kịch *.jpg` | 6 |
| Student Council – Warm Spring Festival Day | `Nguyen Sieu Student Council/HĐHS_Ngày hội ấm áp mùa xuân*.jpg` | 12 |
| Soccer Varsity | `Soccer Varsity/Bóng đá 1,3,4.jpg` | 3 |
| Sunrise Project | `Sunrise Project/Sunrise Project 1.jpg` | 1 |

**Student Council split into two chapters.** Its 18 photos are two distinct
events by filename. Split per the VEO/Owlypia precedent — two JSON files, two
Cloudinary folders, zero new component work. The alternative (one chapter with
two labelled sub-galleries) would have required building group UI: the
`subgroup` field and `groupBySubgroup()` helper exist in the codebase but are
dormant and consumed by no component. Declined as out of scope.

**Youngbiz Fest skipped** — the folder is empty, no source material at all. No
JSON, no Cloudinary folder, never referenced by the upload script.

**Soccer Varsity's video skipped** — `Bóng đá 2.mp4` (~5 MB). The gallery
pipeline lists Cloudinary `image` resources only; video was already deferred
for Money Maze in the Awards round. Listed in the script's `SKIP_FILES` with a
reason so the omission is deliberate and visible in its output.

**Sunrise Project (1 photo)** renders through the existing `SoloFeature` path
— natural aspect ratio rather than being cropped into a template cell.

## Captions are placeholder-grade — deliberately

This is the one substantive content difference from the prior two sections.
Awards and Volunteer both had **certificates** whose text supplied verifiable
org names, dates, and descriptions. `data/Leadership/` contains **no
certificates at all** — only photos. The user chose minimal filename-derived
text over supplying real facts, so every caption is a literal restatement of
what the folder/filename already says, with:

- **no `date` field on any chapter** (nothing verifies one — a deliberate
  deviation from the Awards/Volunteer precedent; `date`/`tier` are optional on
  `ActivityItem` and `Chapter.tsx` only renders them when present),
- no invented roles, achievements, or outcomes.

Caption confidence, strongest to weakest:

1. **Music & Drama Night** — "Ban tổ chức" literally means "organizing
   committee", so the committee role is filename-derived, not invented.
2. **Warm Spring Festival Day** — filename gives the event name but no role,
   so the caption says "Photos from…", deliberately **not** "organized".
3. **Soccer Varsity** — only the team name is known.
4. **Sunrise Project** — bare project name, single photo, nothing else
   derivable.

All four should be reviewed and corrected once real details are available.

## Files

| File | Change |
| --- | --- |
| `scripts/upload-leadership-to-cloudinary.mjs` | New uploader |
| `content/leadership/*.json` | 4 new chapters |
| `content/all.ts` | +4 imports, +4 array entries (existing entries untouched) |
| `app/leadership/page.tsx` | Rewritten from client `ActivityGrid` → Server Component |
| `lib/i18n/dictionaries/{en,vi}.json` | +`leadership.intro` |

No changes to `content/sections.ts`, `lib/chapters.ts`, `lib/cloudinary.ts`, or
any `components/chapters/*` file.

### Upload script

A hybrid of the two prior uploaders: `Soccer Varsity`/`Sunrise Project` map 1:1
to a chapter (Awards-style), while `Nguyen Sieu Student Council` needs a
per-file filename split (Volunteer-style) since one folder yields two chapters.
No `sharp`/resize step — the largest file is ~1.7 MB, far under Cloudinary's
10 MB limit.

**Split matching runs on the slugified filename, not the raw Vietnamese.**
`splitStudentCouncilSlug()` slugifies first (stripping diacritics to ASCII) and
matches `hdhs-ban-to-chuc-dem-nhac-kich` / `hdhs-ngay-hoi-am-ap-mua-xuan`. A
literal `"HĐHS_Ngày hội…"` string comparison — as originally planned — would be
vulnerable to the filesystem returning NFC- vs NFD-normalised filenames, which
differ between macOS and Windows. Dry-run before uploading confirmed 6/12 with
zero unmatched files.

## Verification

- Upload: 22 images (6+12+3+1), 0 certificates, 0 failures, `.mp4` skip line
  present in output.
- `npx tsc --noEmit` clean; `npm run lint` at the established baseline of 10
  errors / 15 warnings, all pre-existing and in unrelated files; `npm run
  build` passes with `/leadership` prerendering at `revalidate = 3600`
  alongside `/awards` and `/volunteer`.
- i18n dictionaries verified at equal key counts (15/15, no missing keys on
  either side).
- Prerendered `.next/server/app/leadership.html` inspected: exactly 4
  `chapter-leadership-*` ids in the expected order, 22 lazy-loaded images with
  22 distinct alt texts, per-chapter counts 6/12/3/1, no `chapter-awards-` or
  `chapter-volunteer-` ids (no cross-section leakage), no `.mp4` reference, 0
  certificate links.
- Client bundle scanned (32 files): zero hits for the Cloudinary secret, API
  key, or SDK.
- Playwright pass, desktop 1440px + mobile 390px: 4 correct headings, live-DOM
  per-chapter image counts 6/12/3/1 on both viewports, lightbox counter
  advanced 1/6 → 2/6, Escape closed the dialog, zero console errors, zero
  failed requests.
- Mobile `overflow: 20` confirmed **unchanged** — the pre-existing `NavBar`
  pill-link bug (`-translate-x-1/2` on a fixed `w-40`) present site-wide since
  before this work. Not fixed here, still open.

## Incidental cleanup

A stray `.claude/worktrees/agent-*/` directory (9.2 MB, a full duplicate
checkout from a failed agent-isolation tool call earlier in the session) was
doubling every lint result and was untracked *and* un-ignored, so it risked
being committed. Verified clean — no uncommitted changes, no unique commits —
then deregistered with `git worktree remove` and deleted. Lint returned to the
exact 10/15 baseline afterwards.
