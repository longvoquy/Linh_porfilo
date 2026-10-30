import { listFolderImages, listFolderVideos } from "@/lib/cloudinary";
import { getPublishedItems } from "@/lib/getContent";
import type { Chapter, ChapterImage, SectionKey } from "@/lib/types";

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
/**
 * Moves the named images to the front, in the given order; the rest keep their order.
 * A name is the public_id's last segment without a file-type suffix: uploads whose
 * extension was upper-case ("IMG_6199.JPG") end up as "img-6199-jpg" on Cloudinary.
 */
function leadWith(images: ChapterImage[], folder: string | undefined, lead: string[] | undefined): ChapterImage[] {
  if (!folder || !lead?.length) return images;
  const rank = (image: ChapterImage) => {
    const at = lead.indexOf(image.id.slice(folder.length + 1).replace(/-(jpe?g|png|heic)$/, ""));
    return at < 0 ? lead.length : at;
  };
  return [...images].sort((a, b) => rank(a) - rank(b));
}

export async function getChapters(sectionKey: SectionKey, onlySlugs?: string[]): Promise<Chapter[]> {
  const items = getPublishedItems(sectionKey).filter((item) => !onlySlugs || onlySlugs.includes(item.slug));

  // Folders are independent — list them concurrently rather than in series.
  return Promise.all(
    items.map(async (item) => {
      const folder = item.cloudinaryFolder;
      const [images, videos] = folder
        ? await Promise.all([listFolderImages(folder), listFolderVideos(folder)])
        : [[], []];
      return { item, images: leadWith(images, folder, item.gallery?.lead), videos };
    }),
  );
}
