"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ActivityItem } from "@/lib/types";
import { ComingSoon } from "@/components/ComingSoon";
import { ActivityCard } from "./ActivityCard";
import { ActivityDetail } from "./ActivityDetail";

export function ActivityGrid({ items }: { items: ActivityItem[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const published = items.filter((item) => item.status === "published");

  if (published.length === 0) {
    return <ComingSoon />;
  }

  const openItem = published.find((item) => item.slug === openSlug) ?? null;

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {published.map((item) => (
          <ActivityCard key={item.slug} item={item} onOpen={() => setOpenSlug(item.slug)} />
        ))}
      </motion.div>
      <AnimatePresence>
        {openItem && <ActivityDetail item={openItem} onClose={() => setOpenSlug(null)} />}
      </AnimatePresence>
    </>
  );
}
