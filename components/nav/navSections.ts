import { getAllSections, getPublishedItems } from "@/lib/getContent";

export const allSections = getAllSections();

/**
 * Sections that have something published, in display order, with their item
 * counts. Empty sections stay out of every menu until they have content.
 */
export const publishedSections = allSections
  .map((meta) => ({ meta, count: getPublishedItems(meta.key).length }))
  .filter((section) => section.count > 0);
