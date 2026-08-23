import { v2 as cloudinary } from "cloudinary";
import type { ChapterImage } from "@/lib/types";

/**
 * SERVER ONLY. This module reads CLOUDINARY_API_SECRET and must never be
 * imported from a Client Component. Consumers pass the plain `ChapterImage`
 * objects it returns down to the client, so no credential — not even the cloud
 * name — ever reaches the browser bundle. Section-agnostic: `folder` is just a
 * Cloudinary path, so any section can point its own chapters at their own
 * subtree (e.g. portfolio/awards/... vs portfolio/volunteer/...).
 */
if (typeof window !== "undefined") {
  throw new Error("lib/cloudinary.ts is server-only and must not be imported by client code.");
}

/** Widths offered to the browser for in-grid gallery images. */
const GRID_WIDTHS = [400, 640, 900, 1200];
/** Width requested when an image is opened fullscreen. */
const LIGHTBOX_WIDTH = 1600;

let configured = false;

/** Returns true when all three credentials are present. */
function configure(): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return false;

  if (!configured) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    configured = true;
  }
  return true;
}

/**
 * Builds a delivery URL constrained to `width`. `f_auto,q_auto` lets Cloudinary
 * pick format/quality per browser; `c_limit` never upscales past the original.
 * The version segment busts CDN caches when an asset is overwritten in place.
 */
function deliveryUrl(cloudName: string, publicId: string, version: number, format: string, width: number): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,c_limit,w_${width}/v${version}/${publicId}.${format}`;
}

type CloudinaryResource = {
  public_id: string;
  format: string;
  version: number;
  width: number;
  height: number;
  created_at: string;
};

/**
 * Lists the images that live *directly* inside `folder`, ignoring nested
 * subfolders (e.g. `certificates/`) so documents stay out of the visual gallery.
 *
 * Ordering is deterministic: an asset named `cover` comes first if present,
 * otherwise the earliest-created asset leads; the remainder follow by creation
 * time, tie-broken by public_id so the layout never shuffles between renders.
 *
 * Returns `[]` (never throws) when credentials are absent or the API call fails
 * — the calling chapter degrades to text-only rather than erroring.
 */
export async function listFolderImages(folder: string): Promise<ChapterImage[]> {
  if (!configure()) {
    console.warn(`[cloudinary] Missing credentials — skipping gallery for "${folder}".`);
    return [];
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const prefix = folder.endsWith("/") ? folder : `${folder}/`;

  let resources: CloudinaryResource[] = [];
  try {
    // Paginate: max_results caps at 500 per call.
    let nextCursor: string | undefined;
    do {
      const res = await cloudinary.api.resources({
        type: "upload",
        resource_type: "image",
        prefix,
        max_results: 500,
        next_cursor: nextCursor,
      });
      resources.push(...(res.resources as CloudinaryResource[]));
      nextCursor = res.next_cursor as string | undefined;
    } while (nextCursor);
  } catch (err) {
    console.error(`[cloudinary] Failed to list "${folder}":`, err instanceof Error ? err.message : err);
    return [];
  }

  // Direct children only — anything with a further "/" lives in a subfolder.
  resources = resources.filter((r) => !r.public_id.slice(prefix.length).includes("/"));

  resources.sort((a, b) => {
    const byDate = a.created_at.localeCompare(b.created_at);
    return byDate !== 0 ? byDate : a.public_id.localeCompare(b.public_id);
  });

  const coverIndex = resources.findIndex((r) => r.public_id.slice(prefix.length) === "cover");
  if (coverIndex > 0) {
    const [cover] = resources.splice(coverIndex, 1);
    resources.unshift(cover);
  }

  return resources.map((r) => ({
    id: r.public_id,
    src: deliveryUrl(cloudName, r.public_id, r.version, r.format, 900),
    srcSet: GRID_WIDTHS.map(
      (w) => `${deliveryUrl(cloudName, r.public_id, r.version, r.format, w)} ${w}w`,
    ).join(", "),
    full: deliveryUrl(cloudName, r.public_id, r.version, r.format, LIGHTBOX_WIDTH),
    width: r.width,
    height: r.height,
  }));
}
