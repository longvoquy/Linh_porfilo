import { VisualChapters } from "@/components/chapters/VisualChapters";
import { getChapters } from "@/lib/chapters";
import { getSectionMeta } from "@/lib/getContent";

/** See app/awards/page.tsx for why this is a Server Component with `revalidate`. */
export const revalidate = 3600;

const meta = getSectionMeta("volunteer")!;

export default async function VolunteerPage() {
  const chapters = await getChapters("volunteer");

  return <VisualChapters chapters={chapters} label={meta.label} introKey="volunteer.intro" />;
}
