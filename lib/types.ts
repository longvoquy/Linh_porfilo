export type Locale = "en" | "vi";

export type LocalizedString = {
  en: string;
  vi: string;
};

export type MediaRef = {
  type: "image" | "pdf" | "video";
  /** Full URL to the hosted image/pdf (e.g. Cloudinary, Drive, Vercel Blob). Not committed to git. */
  src?: string;
  /** YouTube/Vimeo (or other) embed URL, used instead of `src` for externally hosted video. */
  externalUrl?: string;
  /** Poster/thumbnail image URL shown in cards and grids (required for pdf/video). */
  thumbnail?: string;
  alt?: LocalizedString;
};

export type ActivityStatus = "published" | "coming-soon";

export type SectionKey =
  | "art-portfolio"
  | "awards"
  | "internship"
  | "leadership"
  | "passion-projects"
  | "research"
  | "volunteer";

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
};

export type SectionMeta = {
  key: SectionKey;
  label: LocalizedString;
  order: number;
};
