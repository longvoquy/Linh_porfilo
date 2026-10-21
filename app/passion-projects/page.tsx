import { VisualChapters } from "@/components/chapters/VisualChapters";
import { getChapters } from "@/lib/chapters";
import { getSectionMeta } from "@/lib/getContent";

/** Server Component: see app/awards/page.tsx for why this uses route-segment `revalidate`. */
export const revalidate = 3600;

const meta = getSectionMeta("passion-projects")!;

export default async function PassionProjectsPage() {
  const chapters = await getChapters("passion-projects");

  return <VisualChapters chapters={chapters} label={meta.label} introKey="passion-projects.intro" />;
}
