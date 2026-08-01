"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function ComingSoon() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-black/15 px-8 py-16 text-center">
      <motion.span
        aria-hidden
        className="h-2 w-2 rounded-full bg-black/40"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <p className="text-base font-medium">{t("comingSoon.title")}</p>
      <p className="text-sm text-black/60">{t("comingSoon.body")}</p>
    </div>
  );
}
