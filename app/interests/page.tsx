import { VisualChapters } from "@/components/chapters/VisualChapters";
import { getChapters } from "@/lib/chapters";
import { getSectionMeta } from "@/lib/getContent";

/** Server Component: see app/awards/page.tsx for why this uses route-segment `revalidate`. */
export const revalidate = 3600;

const meta = getSectionMeta("interests")!;

export default async function InterestsPage() {
  const chapters = await getChapters("interests");

  return <VisualChapters chapters={chapters} label={meta.label} introKey="interests.intro" />;
}
