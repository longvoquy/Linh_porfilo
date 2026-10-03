import type { Metadata } from "next";
import { ExhibitionStage } from "@/components/exhibition/ExhibitionStage";
import { toExhibitPieces } from "@/components/exhibition/pieces";
import { getPublishedItems } from "@/lib/getContent";

export const metadata: Metadata = {
  title: "Online Exhibition — Vũ Khánh Linh",
  description: "A walk through the original paintings of Vũ Khánh Linh, in a 3D gallery hall.",
};

export default function ExhibitionPage() {
  const pieces = toExhibitPieces(getPublishedItems("art-portfolio"));

  return (
    <main>
      <ExhibitionStage pieces={pieces} />
    </main>
  );
}
