import { ArtsView } from "@/components/chapters/ArtsView";
import { getChapters } from "@/lib/chapters";
import { getSectionItems, getSectionMeta } from "@/lib/getContent";

/** Server Component: see app/awards/page.tsx for why this uses route-segment `revalidate`. */
export const revalidate = 3600;

const meta = getSectionMeta("art-portfolio")!;

/** The exhibition is a visual chapter (its photos come from Cloudinary); every other item here is a painting. */
const EXHIBITION_SLUG = "exhibition";

/** The paintings hung in a 3D gallery, deployed separately from this site. */
const EXHIBITION_URL = "https://linh-exhibition.vercel.app";

export default async function ArtPortfolioPage() {
  const chapters = await getChapters("art-portfolio", [EXHIBITION_SLUG]);
  const paintings = getSectionItems("art-portfolio").filter((item) => item.slug !== EXHIBITION_SLUG);

  return <ArtsView chapters={chapters} paintings={paintings} label={meta.label} exhibitionUrl={EXHIBITION_URL} />;
}
