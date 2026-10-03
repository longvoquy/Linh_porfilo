import type { Metadata } from "next";
import { ExhibitionStage } from "@/components/exhibition/ExhibitionStage";
import { toExhibitPieces } from "@/components/exhibition/pieces";
import { getPublishedItems } from "@/lib/getContent";

export const metadata: Metadata = {
  title: "Art Exhibition — walk",
  description: "Walk through a gallery of original paintings in 3D with W A S D and the mouse.",
};

/** The exhibition opened in walking mode (it falls back to the tour without a mouse and keyboard). */
export default function ExhibitionWalkPage() {
  const pieces = toExhibitPieces(getPublishedItems("art-portfolio"));

  return (
    <main>
      <ExhibitionStage pieces={pieces} initialMode="walk" />
    </main>
  );
}
