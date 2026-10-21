import { VisualChapters } from "@/components/chapters/VisualChapters";
import { getChapters } from "@/lib/chapters";
import { getSectionMeta } from "@/lib/getContent";

/** Server Component: see app/awards/page.tsx for why this uses route-segment `revalidate`. */
export const revalidate = 3600;

const meta = getSectionMeta("research")!;

export default async function ResearchPage() {
  const chapters = await getChapters("research");

  return <VisualChapters chapters={chapters} label={meta.label} introKey="research.intro" />;
}
