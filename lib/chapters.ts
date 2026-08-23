import { listFolderImages } from "@/lib/cloudinary";
import { getPublishedItems } from "@/lib/getContent";
import type { Chapter, SectionKey } from "@/lib/types";

/**
 * SERVER ONLY (imports lib/cloudinary).
 *
 * Builds the ordered list of visual chapters for one section: its published
 * items from the JSON content layer, each paired with the images discovered
 * in its own Cloudinary folder. `sectionKey` is the only thing that
 * determines which content loads — Awards and Volunteer call this
 * independently with their own key and never see each other's items. An item
 * without a `cloudinaryFolder` still renders as a text-only chapter, so a
 * chapter can exist before its photos are uploaded.
 */
export async function getChapters(sectionKey: SectionKey): Promise<Chapter[]> {
  const items = getPublishedItems(sectionKey);

  // Folders are independent — list them concurrently rather than in series.
  return Promise.all(
    items.map(async (item) => ({
      item,
      images: item.cloudinaryFolder ? await listFolderImages(item.cloudinaryFolder) : [],
    })),
  );
}
