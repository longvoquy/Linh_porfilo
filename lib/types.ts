export type Locale = "en" | "vi";

export type LocalizedString = {
  en: string;
  vi: string;
};

export type MediaRef = {
  /** "pdf" is a linked document: a PDF, or a certificate scanned as an image. */
  type: "image" | "pdf" | "video";
  /** Full URL to the hosted image/pdf (e.g. Cloudinary, Drive, Vercel Blob). Not committed to git. */
  src?: string;
  /** YouTube/Vimeo (or other) embed URL, used instead of `src` for externally hosted video. */
  externalUrl?: string;
  /** Poster/thumbnail image URL shown in cards and grids (required for pdf/video). */
  thumbnail?: string;
  alt?: LocalizedString;
  /** Pixel size (or any size with the same aspect ratio, e.g. 16 x 9) — lets layouts reserve space and tell a portrait clip from a landscape one. */
  width?: number;
  height?: number;
};

/** An outbound link shown with an item (a shop, a social page, a channel). */
export type ItemLink = {
  label: LocalizedString;
  url: string;
};

export type ActivityStatus = "published" | "coming-soon";

export type SectionKey =
  | "art-portfolio"
  | "awards"
  | "internship"
  | "leadership"
  | "passion-projects"
  | "research"
  | "volunteer"
  | "interests";

export type ActivityItem = {
  slug: string;
  section: SectionKey;
  /** Groups items within a section, e.g. "Nguyen Sieu Student Council" inside Leadership. */
  subgroup?: string;
  title: LocalizedString;
  org?: LocalizedString;
  date?: string;
  tier?: LocalizedString;
  caption: LocalizedString;
  media: MediaRef[];
  /**
   * Cloudinary folder whose images make up this item's gallery, e.g.
   * "portfolio/awards/bebras-2025-2026". Listed server-side at request time so
   * new uploads appear without touching code. `media` still holds documents
   * (certificate PDFs) that are not part of the visual gallery.
   */
  cloudinaryFolder?: string;
  /** Overrides for how this item's Cloudinary gallery is arranged. */
  gallery?: {
    /** Image names (the last segment of the public_id, e.g. "img-6188") to show first, in this order. */
    lead?: string[];
    /** Pins the large focal image to one side of the feature block; it then keeps its own proportions instead of being cropped. */
    featureSide?: "left" | "right";
  };
  /** External pages for this item, shown under the caption. */
  links?: ItemLink[];
  status: ActivityStatus;
};

/** One gallery image, with delivery URLs precomputed server-side. */
export type ChapterImage = {
  /** Cloudinary public_id — stable React key. */
  id: string;
  /** Default-size delivery URL. */
  src: string;
  /** Responsive candidates for grid rendering. */
  srcSet: string;
  /** Larger delivery URL used by the lightbox. */
  full: string;
  width: number;
  height: number;
};

/**
 * One ActivityItem rendered as a visual chapter: its metadata plus its gallery.
 * Section-agnostic — Awards and Volunteer both produce these from their own,
 * independently-loaded content via `getChapters(sectionKey)`.
 */
export type Chapter = {
  item: ActivityItem;
  /** Primary/cover image first, then the rest in deterministic order. */
  images: ChapterImage[];
  /** Clips hosted on Cloudinary, in the chapter folder's `videos/` subfolder. YouTube videos live in `item.media`. */
  videos: ChapterVideo[];
};

/** One Cloudinary-hosted clip, with delivery URLs precomputed server-side. */
export type ChapterVideo = {
  /** Cloudinary public_id — stable React key. */
  id: string;
  /** MP4 delivery URL (Cloudinary transcodes whatever was uploaded). */
  src: string;
  /** Still from the first frame. */
  poster: string;
  width: number;
  height: number;
};

export type SectionMeta = {
  key: SectionKey;
  label: LocalizedString;
  order: number;
};
