"use client";

import { motion } from "framer-motion";
import type { ActivityItem } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/useTranslation";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function ActivityCard({ item, onOpen }: { item: ActivityItem; onOpen: () => void }) {
  const { localize } = useTranslation();
  const thumbnail = item.media[0]?.thumbnail ?? item.media[0]?.src;

  return (
    <motion.button
      type="button"
      layoutId={`activity-${item.slug}`}
      variants={cardVariants}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="flex flex-col gap-3 rounded-2xl border border-gold/35 bg-ivory p-5 text-left shadow-arch transition-shadow hover:border-gold hover:shadow-md"
    >
      <div className="flex aspect-4/3 items-center justify-center overflow-hidden rounded-xl bg-navy/5">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs uppercase tracking-widest text-navy/60">{item.section}</span>
        )}
      </div>
      {item.tier && (
        <span className="w-fit rounded-full bg-navy px-2.5 py-0.5 text-xs font-medium text-gold">
          {localize(item.tier)}
        </span>
      )}
      <h3 className="text-lg font-semibold leading-snug text-navy">{localize(item.title)}</h3>
      {item.org && <p className="text-sm text-navy/70">{localize(item.org)}</p>}
      {item.date && <p className="text-xs text-gold-ink">{item.date}</p>}
    </motion.button>
  );
}
