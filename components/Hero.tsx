"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n/useTranslation";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function Hero() {
  const { t } = useTranslation();

  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-6xl flex-col gap-4 px-6 pb-16 pt-20"
    >
      <motion.p
        variants={item}
        className="text-sm font-medium uppercase tracking-widest text-black/50"
      >
        {t("hero.greeting")}
      </motion.p>
      <motion.h1 variants={item} className="text-4xl font-semibold tracking-tight sm:text-6xl">
        Vũ Khánh Linh
      </motion.h1>
      <motion.p variants={item} className="max-w-2xl text-lg text-black/70">
        {t("hero.tagline")}
      </motion.p>
    </motion.section>
  );
}
