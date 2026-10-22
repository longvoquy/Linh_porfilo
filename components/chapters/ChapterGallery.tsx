"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ChapterImage } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Props = {
  images: ChapterImage[];
  /** Chapter position, used to pick a deterministic layout template. */
  chapterIndex: number;
  onOpen: (imageIndex: number) => void;
  /** Localized chapter title, used for image alt text. */
  title: string;
  /** Pins the focal image to one side; it then keeps its own proportions. Unset: the layout follows `chapterIndex`. */
  featureSide?: "left" | "right";
};

/** Galleries longer than this start collapsed to `COLLAPSED_COUNT` images. */
const COLLAPSE_ABOVE = 12;
const COLLAPSED_COUNT = 9;

/** Widths the grid images may occupy, so the browser can pick a candidate. */
const FEATURE_SIZES = "(min-width: 768px) 60vw, 100vw";
const SECONDARY_SIZES = "(min-width: 768px) 30vw, 100vw";
const OVERFLOW_SIZES = "(min-width: 768px) 30vw, 100vw";

/** Distinguishes images in the same chapter for screen readers. */
function imageAlt(title: string, index: number): string {
  return `${title} — ${index + 1}`;
}

/**
 * Renders one chapter's images as an asymmetric editorial composition.
 *
 * The first three images form a "feature" block using one of three templates
 * chosen by `chapterIndex % 3` — varied between chapters, but deterministic, so
 * a given chapter always looks the same. Any remaining images flow into a uniform
 * grid below rather than generating ever-more-complex geometry. A chapter with
 * exactly one image skips the templates entirely (see `SoloFeature`).
 *
 * On mobile every template collapses to a single stacked column.
 */
export function ChapterGallery({ images, chapterIndex, onOpen, title, featureSide }: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (images.length === 0) return null;

  // A chapter with dozens of photos starts with a short selection so the page
  // stays quick to scroll; the lightbox still steps through every image.
  const collapsed = images.length > COLLAPSE_ABOVE && !expanded;
  const feature = images.slice(0, 3);
  const overflow = images.slice(3, collapsed ? COLLAPSED_COUNT : undefined);
  const template = chapterIndex % 3;

  return (
    <div className="space-y-4 sm:space-y-6">
      {images.length === 1 ? (
        <SoloFeature image={images[0]} onOpen={onOpen} title={title} />
      ) : featureSide ? (
        <SplitFeature images={feature} onOpen={onOpen} title={title} mirrored={featureSide === "right"} keepRatio />
      ) : template === 2 ? (
        <StackedFeature images={feature} onOpen={onOpen} title={title} />
      ) : (
        <SplitFeature images={feature} onOpen={onOpen} title={title} mirrored={template === 1} />
      )}

      {overflow.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {overflow.map((image, i) => (
            <GalleryImage
              key={image.id}
              image={image}
              sizes={OVERFLOW_SIZES}
              alt={imageAlt(title, i + 3)}
              className="aspect-[4/3]"
              onOpen={() => onOpen(i + 3)}
            />
          ))}
        </div>
      )}

      {images.length > COLLAPSE_ABOVE && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="rounded-full border border-gold/50 px-6 py-2.5 text-sm font-medium text-gold-ink transition hover:border-navy hover:bg-navy hover:text-cream"
          >
            {expanded ? t("chapters.showLess") : `${t("chapters.showAll")} (${images.length})`}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A chapter holding a single image renders at that image's natural aspect ratio
 * rather than being forced into a template's crop — a near-square certificate
 * photo would lose most of its content to a 16:9 cell. Width is capped so one
 * image doesn't overwhelm the chapter.
 */
function SoloFeature({
  image,
  onOpen,
  title,
}: {
  image: ChapterImage;
  onOpen: (i: number) => void;
  title: string;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <GalleryImage
        image={image}
        sizes="(min-width: 768px) 48rem, 100vw"
        alt={imageAlt(title, 0)}
        className=""
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
        onOpen={() => onOpen(0)}
      />
    </div>
  );
}

/**
 * Templates A and B: a large focal image beside a column of smaller ones.
 * `mirrored` swaps the sides so consecutive chapters don't look identical.
 */
function SplitFeature({
  images,
  onOpen,
  title,
  mirrored,
  keepRatio = false,
}: {
  images: ChapterImage[];
  onOpen: (i: number) => void;
  title: string;
  mirrored: boolean;
  /** Show the focal image uncropped; the others fill the column beside it. */
  keepRatio?: boolean;
}) {
  const [primary, ...secondary] = images;

  if (secondary.length === 0) {
    return (
      <GalleryImage
        image={primary}
        sizes={FEATURE_SIZES}
        alt={imageAlt(title, 0)}
        className="aspect-[16/10]"
        onOpen={() => onOpen(0)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-12">
      <div className={`md:col-span-7 ${mirrored ? "md:order-2" : ""}`}>
        <GalleryImage
          image={primary}
          sizes={FEATURE_SIZES}
          alt={imageAlt(title, 0)}
          className={keepRatio ? "" : "aspect-[4/3] md:h-full"}
          style={keepRatio ? { aspectRatio: `${primary.width} / ${primary.height}` } : undefined}
          onOpen={() => onOpen(0)}
        />
      </div>
      {/* Secondaries share the primary's height on desktop; stack on mobile. */}
      <div className={`flex flex-col gap-4 sm:gap-6 md:col-span-5 ${mirrored ? "md:order-1" : ""}`}>
        {secondary.map((image, i) => (
          <GalleryImage
            key={image.id}
            image={image}
            sizes={SECONDARY_SIZES}
            alt={imageAlt(title, i + 1)}
            className="aspect-[4/3] md:aspect-auto md:min-h-0 md:flex-1"
            onOpen={() => onOpen(i + 1)}
          />
        ))}
      </div>
    </div>
  );
}

/** Template C: a full-width focal image with two images beneath it. */
function StackedFeature({
  images,
  onOpen,
  title,
}: {
  images: ChapterImage[];
  onOpen: (i: number) => void;
  title: string;
}) {
  const [primary, ...secondary] = images;

  return (
    <div className="space-y-4 sm:space-y-6">
      <GalleryImage
        image={primary}
        sizes="100vw"
        alt={imageAlt(title, 0)}
        className="aspect-[16/9]"
        onOpen={() => onOpen(0)}
      />
      {secondary.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {secondary.map((image, i) => (
            <GalleryImage
              key={image.id}
              image={image}
              sizes={SECONDARY_SIZES}
              alt={imageAlt(title, i + 1)}
              className="aspect-[4/3]"
              onOpen={() => onOpen(i + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryImage({
  image,
  sizes,
  alt,
  className,
  style,
  onOpen,
}: {
  image: ChapterImage;
  sizes: string;
  alt: string;
  className: string;
  /** Used for natural-aspect-ratio rendering, where no utility class fits. */
  style?: React.CSSProperties;
  onOpen: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      whileHover={reduceMotion ? undefined : { scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={style}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl bg-navy/5 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={sizes}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
      <span className="pointer-events-none absolute inset-0 bg-navy/0 transition-colors duration-300 group-hover:bg-navy/10" />
    </motion.button>
  );
}
