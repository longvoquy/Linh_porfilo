"use client";

import { LanguageToggle } from "@/components/nav/LanguageToggle";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { textureUrl, type ExhibitPiece } from "./pieces";

/** The exhibition without WebGL: the same paintings as a plain vertical list of framed works. */
export function ExhibitionFallback({ pieces }: { pieces: ExhibitPiece[] }) {
  const { t, localize } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex justify-end">
        <LanguageToggle />
      </div>
      <header className="mb-12 text-center">
        <h1 className="font-heading text-4xl font-semibold text-navy">{t("exhibition.title")}</h1>
        <p className="mt-2 text-navy/70">{t("exhibition.subtitle")}</p>
      </header>

      <ol className="space-y-16">
        {pieces.map((piece) => (
          <li key={piece.slug}>
            <figure className="border-[10px] border-gold/70 bg-ivory p-3 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={textureUrl(piece.src, 1400)}
                width={piece.width}
                height={piece.height}
                alt={localize(piece.alt)}
                loading="lazy"
                className="h-auto w-full"
              />
            </figure>
            <div className="mt-4 text-center">
              <h2 className="font-heading text-2xl font-semibold text-navy">{localize(piece.title)}</h2>
              {piece.date && <p className="text-sm text-gold-ink">{piece.date}</p>}
              <p className="mx-auto mt-2 max-w-xl text-navy/80">{localize(piece.caption)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
