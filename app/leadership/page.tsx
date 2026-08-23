import { VisualChapters } from "@/components/chapters/VisualChapters";
import { getChapters } from "@/lib/chapters";
import { getSectionMeta } from "@/lib/getContent";

/** See app/awards/page.tsx for why this is a Server Component with `revalidate`. */
export const revalidate = 3600;

const meta = getSectionMeta("leadership")!;

export default async function LeadershipPage() {
  const chapters = await getChapters("leadership");

  return <VisualChapters chapters={chapters} label={meta.label} introKey="leadership.intro" />;
}
