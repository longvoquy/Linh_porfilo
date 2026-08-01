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
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        layoutId={`activity-${item.slug}`}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white p-6"
      >
        <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black/5">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs uppercase tracking-widest text-black/30">{item.section}</span>
          )}
        </div>
        {item.tier && (
          <span className="mb-2 w-fit rounded-full bg-black/90 px-2.5 py-0.5 text-xs font-medium text-white">
            {localize(item.tier)}
          </span>
        )}
        <h2 className="text-2xl font-semibold">{localize(item.title)}</h2>
        {item.org && <p className="mt-1 text-sm text-black/60">{localize(item.org)}</p>}
        {item.date && <p className="mt-1 text-xs text-black/40">{item.date}</p>}
        <p className="mt-4 text-base leading-relaxed text-black/80">{localize(item.caption)}</p>
        {certificate?.src && (
          <a
            href={certificate.src}
            target="_blank"
            rel="noreferrer"
            className="mt-4 w-fit text-sm font-medium underline underline-offset-4"
          >
            {t("activity.viewCertificate")}
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-fit text-sm font-medium text-black/60 hover:text-black"
        >
          {t("activity.close")}
        </button>
      </motion.div>
    </motion.div>
  );
}
