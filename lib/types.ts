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
  status: ActivityStatus;
};

export type SectionMeta = {
  key: SectionKey;
  label: LocalizedString;
  order: number;
};
