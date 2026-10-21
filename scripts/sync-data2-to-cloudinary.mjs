/**
 * Syncs data2.0/ to Cloudinary: uploads what is new, and (with --prune) deletes
 * assets under the synced prefixes that data2.0 no longer contains.
 *
 *   node scripts/sync-data2-to-cloudinary.mjs                    dry run: prints the plan
 *   node scripts/sync-data2-to-cloudinary.mjs --apply            upload only
 *   node scripts/sync-data2-to-cloudinary.mjs --apply --prune    upload + delete stale
 *
 * Layout (same as the older upload-*.mjs scripts):
 *   portfolio/<section>/<slug>/               photos (image), the site's gallery
 *   portfolio/<section>/<slug>/certificates/  PDFs (raw, extension kept in id)
 * Skipped: videos (gallery is images-only), "Copy of ..." duplicates, PDFs over
 * 10 MB. Existing public_ids are not re-uploaded. portfolio/art is untouched.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "data2.0");
const APPLY = process.argv.includes("--apply");
const PRUNE = process.argv.includes("--prune");
const MAX_BYTES = 10 * 1024 * 1024;

const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const nfc = (s) => s.normalize("NFC");

/**
 * Each rule: local folder (under data2.0) -> function(fileName) returning the
 * Cloudinary chapter folder (string), an array of them, or null to skip.
 * Matching runs on slugified names, which is NFC/NFD-proof.
 */
const fixed = (folder) => () => folder;
const COUNCIL_NIGHT = "portfolio/leadership/student-council-dem-nhac-kich";
const COUNCIL_SPRING = "portfolio/leadership/student-council-ngay-hoi-am-ap-mua-xuan";
const RULES = [
  ["1. Honors & awards/Bebras 2025, 2026", fixed("portfolio/awards/bebras-2025-2026")],
  ["1. Honors & awards/Cuộc thi Money maze", fixed("portfolio/awards/money-maze")],
  [
    "1. Honors & awards/Cuộc thi VEO và Owlypia",
    (n) => (slugify(n).startsWith("owlypia") ? "portfolio/awards/owlypia" : "portfolio/awards/veo"),
  ],
  ["1. Honors & awards/Extra-curriculars", fixed("portfolio/awards/extra-curriculars")],
  ["1. Honors & awards/Harvard Crimson 2026", fixed("portfolio/awards/harvard-crimson-2026")],
  ["1. Honors & awards/Học bổng Nguyễn Siêu", fixed("portfolio/awards/nguyen-sieu-scholarship")],
  ["1. Honors & awards/International Kangaroo Science Contest", fixed("portfolio/awards/kangaroo-science")],
  ["2. Passion projects/Exhibition", fixed("portfolio/passion-projects/exhibition")],
  ["2. Passion projects/Startup_ Khởi Vân", fixed("portfolio/passion-projects/khoi-van-startup")],
  [
    "3. Research/Financial Options for Social Security in Vietnam",
    fixed("portfolio/research/social-security-options-vietnam"),
  ],
  [
    "3. Research/The Influence of Cultural Heritage Values on Purchase Intention for Applied Design Ceramic Products Inspired by Vietnamese Fine Arts_ An S-O-R Framework Approach",
    fixed("portfolio/research/ceramic-cultural-heritage"),
  ],
  ["5. Leadership/1. Young BizFest 2026", fixed("portfolio/leadership/young-bizfest-2026")],
  ["5. Leadership/2. Sunrise Project", fixed("portfolio/leadership/sunrise-project")],
  [
    "5. Leadership/3. Nguyen Sieu Student Council",
    (n) => {
      const s = slugify(n);
      if (s.includes("nhac-kich")) return COUNCIL_NIGHT;
      if (s.includes("ngay-hoi")) return COUNCIL_SPRING;
      return [COUNCIL_NIGHT, COUNCIL_SPRING]; // Head HR cert is council-wide
    },
  ],
  [
    "6. Working experience_Done",
    (n) => {
      const s = slugify(n);
      if (s.startsWith("1-vietinbank")) return "portfolio/internship/vietinbank";
      if (s.startsWith("2-kingler")) return "portfolio/internship/kingler";
      return null;
    },
  ],
  ["7. Volunteer & Philanthropy/1. Thiện nguyện ở xã Vĩnh Thanh", fixed("portfolio/volunteer/vinh-thanh")],
  [
    "7. Volunteer & Philanthropy/2. Thiện nguyện ở Trung tâm trẻ tự kỷ",
    fixed("portfolio/volunteer/sunrise-autism-center"),
  ],
  [
    "7. Volunteer & Philanthropy/3. Thiện nguyện khác",
    (n) =>
      slugify(n).includes("uoc-mo-xanh")
        ? "portfolio/volunteer/quy-uoc-mo-xanh"
        : "portfolio/volunteer/muc-hoa-nguyet-hoa",
  ],
  ["8. Interests & skills/Basketball", fixed("portfolio/interests/basketball")],
  ["8. Interests & skills/CLB nhạc kịch 2024-2025", fixed("portfolio/interests/musical-club")],
  ["8. Interests & skills/Soccer Varsity", fixed("portfolio/interests/soccer-varsity")],
];
const SYNCED_PREFIXES = [
  "awards",
  "passion-projects",
  "research",
  "internship",
  "leadership",
  "volunteer",
  "interests",
].map((s) => `portfolio/${s}`);
const IMG = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);

async function loadEnv() {
  const c = await readFile(path.join(__dirname, "..", ".env"), "utf-8").catch(() => "");
  for (const l of c.split("\n")) {
    const t = l.trim();
    const eq = t.indexOf("=");
    if (!t || t.startsWith("#") || eq < 0) continue;
    const k = t.slice(0, eq).trim();
    if (!(k in process.env)) process.env[k] = t.slice(eq + 1).trim();
  }
}

/** Builds the desired asset list. */
async function plan() {
  const want = [];
  const skipped = [];
  const used = new Set();
  for (const [rel, route] of RULES) {
    const dir = path.join(SRC, ...rel.split("/"));
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries.filter((x) => x.isFile())) {
      const ext = path.extname(e.name).toLowerCase();
      const file = path.join(dir, e.name);
      if (/^copy of /i.test(e.name)) {
        skipped.push([e.name, "duplicate 'Copy of'"]);
        continue;
      }
      // IMG_E9428 is the edited version of IMG_9428; only the edit is kept.
      if (/^IMG_9428\.heic$/i.test(e.name)) {
        skipped.push([e.name, "superseded by IMG_E9428"]);
        continue;
      }
      const isImg = IMG.has(ext);
      const isPdf = ext === ".pdf";
      if (!isImg && !isPdf) {
        skipped.push([e.name, "video/other (images-only)"]);
        continue;
      }
      const size = (await stat(file)).size;
      if (isPdf && size > MAX_BYTES) {
        skipped.push([e.name, `PDF ${(size / 1e6).toFixed(1)} MB > 10 MB`]);
        continue;
      }
      const routed = route(nfc(e.name));
      if (!routed) {
        skipped.push([e.name, "no route"]);
        continue;
      }
      for (const f of [].concat(routed)) {
        const folder = isImg ? f : `${f}/certificates`;
        const base = slugify(path.basename(e.name, ext)) || "file";
        const suffix = isImg ? "" : ext;
        let id = base;
        for (let i = 2; used.has(`${folder}/${id}${suffix}`); i++) id = `${base}-${i}`;
        used.add(`${folder}/${id}${suffix}`);
        want.push({ file, folder, id: id + suffix, kind: isImg ? "image" : "raw", size, ext, name: e.name });
      }
    }
  }
  return { want, skipped };
}

async function listRemote() {
  const out = new Map(); // "type:public_id" -> resource
  for (const prefix of SYNCED_PREFIXES) {
    for (const rt of ["image", "raw", "video"]) {
      let cursor;
      do {
        const r = await cloudinary.api.resources({
          type: "upload",
          resource_type: rt,
          prefix: prefix + "/",
          max_results: 500,
          next_cursor: cursor,
        });
        for (const x of r.resources) out.set(`${rt}:${x.public_id}`, x);
        cursor = r.next_cursor;
      } while (cursor);
    }
  }
  return out;
}

async function uploadOne(a) {
  const opts = { folder: a.folder, public_id: a.id, overwrite: true, resource_type: a.kind };
  if (a.kind === "image" && a.size > MAX_BYTES && a.ext !== ".heic") {
    const buf = await sharp(a.file)
      .rotate()
      .resize(3000, 3000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return new Promise((res, rej) =>
      cloudinary.uploader.upload_stream(opts, (e, r) => (e ? rej(e) : res(r))).end(buf),
    );
  }
  // HEIC is converted to JPG by Cloudinary so it can be delivered to browsers.
  return cloudinary.uploader.upload(a.file, { ...opts, ...(a.ext === ".heic" ? { format: "jpg" } : {}) });
}

await loadEnv();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const { want, skipped } = await plan();
const remote = await listRemote();
const wantKeys = new Set(want.map((a) => `${a.kind}:${a.folder}/${a.id}`));
const toUpload = want.filter((a) => !remote.has(`${a.kind}:${a.folder}/${a.id}`));
// Never delete an asset that content/*.json still links to (certificate URLs are
// pasted there by hand); those are reported instead so the link can be updated.
const contentText = (await Promise.all(
  (await readdir(path.join(__dirname, "..", "content"), { recursive: true }))
    .filter((f) => f.endsWith(".json"))
    .map((f) => readFile(path.join(__dirname, "..", "content", f), "utf-8")),
)).join(" ");
const referenced = (k) => contentText.includes(k.slice(k.indexOf(":") + 1));
const stale = [...remote.keys()].filter((k) => !wantKeys.has(k));
const toDelete = stale.filter((k) => !referenced(k));
const kept = stale.filter(referenced);

const count = (arr, f) => arr.reduce((m, a) => ((m[f(a)] = (m[f(a)] || 0) + 1), m), {});
console.log(
  `\nDesired: ${want.length}   already on Cloudinary: ${want.length - toUpload.length}   to upload: ${toUpload.length}   stale: ${toDelete.length}`,
);
console.log("\nUpload per folder:", count(toUpload, (a) => a.folder));
console.log("\nSkipped:");
skipped.forEach(([n, why]) => console.log(`  ${n} — ${why}`));
console.log("\nStale on Cloudinary (deleted only with --prune):");
toDelete.forEach((k) => console.log("  ", k));

if (kept.length) {
  console.log("Stale but still referenced by content/*.json (kept):");
  kept.forEach((k) => console.log("  ", k));
}

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply [--prune].");
  process.exit(0);
}

let ok = 0;
const failed = [];
const queue = [...toUpload];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let a; (a = queue.shift()); ) {
      try {
        await uploadOne(a);
        ok++;
        process.stdout.write(`\r uploaded ${ok}/${toUpload.length}`);
      } catch (e) {
        failed.push([a.name, e.message || String(e)]);
      }
    }
  }),
);
console.log(`\nUploaded ${ok}, failed ${failed.length}`);
failed.forEach(([n, m]) => console.log("  FAILED", n, m));

if (PRUNE) {
  for (const k of toDelete) {
    const i = k.indexOf(":");
    await cloudinary.api.delete_resources([k.slice(i + 1)], { resource_type: k.slice(0, i), type: "upload" });
  }
  console.log(`Deleted ${toDelete.length}`);
}
