import { VisualChapters } from "@/components/chapters/VisualChapters";
import { getChapters } from "@/lib/chapters";
import { getSectionMeta } from "@/lib/getContent";

/**
 * Server Component: the Cloudinary Admin API call happens here so credentials
 * stay on the server, and only plain image URLs are handed to the client.
 *
 * Revalidate hourly. Note this is the pre-Cache-Components API — `use cache`
 * would require enabling `cacheComponents` globally in next.config.ts, which
 * changes rendering semantics for every route. Route segment `revalidate` is
 * still supported while that flag is off and keeps the change scoped to /awards.
 */
export const revalidate = 3600;

const meta = getSectionMeta("awards")!;

export default async function AwardsPage() {
  const chapters = await getChapters("awards");

  return <VisualChapters chapters={chapters} label={meta.label} introKey="awards.intro" />;
}
