"use client";

import { motion } from "framer-motion";
import type { ActivityItem } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function ActivityDetail({ item, onClose }: { item: ActivityItem; onClose: () => void }) {
  const { localize, t } = useTranslation();
  const cover = item.media[0]?.thumbnail ?? item.media[0]?.src;
  const certificate = item.media.find((m) => m.type === "pdf");

  return (
    <motion.div
      className="fixed inset-0 z-60 flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        layoutId={`activity-${item.slug}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-gold/35 bg-ivory p-6"
      >
        <div className="mb-4 flex max-h-[70vh] items-center justify-center overflow-hidden rounded-xl bg-navy/5">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="max-h-[70vh] w-full object-contain" />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center">
              <span className="text-xs uppercase tracking-widest text-navy/60">{item.section}</span>
            </div>
          )}
        </div>
        {item.tier && (
          <span className="mb-2 w-fit rounded-full bg-navy px-2.5 py-0.5 text-xs font-medium text-gold">
            {localize(item.tier)}
          </span>
        )}
        <h2 className="text-2xl font-semibold text-navy">{localize(item.title)}</h2>
        {item.org && <p className="mt-1 text-sm text-navy/70">{localize(item.org)}</p>}
        {item.date && <p className="mt-1 text-xs text-gold-ink">{item.date}</p>}
        <p className="mt-4 text-base leading-relaxed text-navy/70">{localize(item.caption)}</p>
        {certificate?.src && (
          <a
            href={certificate.src}
            target="_blank"
            rel="noreferrer"
            className="mt-4 w-fit text-sm font-medium text-gold-ink underline underline-offset-4 transition hover:text-navy"
          >
            {t("activity.viewCertificate")}
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-fit text-sm font-medium text-navy/70 transition hover:text-navy"
        >
          {t("activity.close")}
        </button>
      </motion.div>
    </motion.div>
  );
}
