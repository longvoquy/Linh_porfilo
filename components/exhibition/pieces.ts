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
