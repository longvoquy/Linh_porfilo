"use client";

import { motion } from "framer-motion";
import { RadialNav } from "@/components/home/RadialNav";
import { LanguageToggle } from "@/components/nav/LanguageToggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function Home() {
  const { t } = useTranslation();

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-5 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,0,0,0.05),transparent_65%)]"
      />

      {/* The navbar is hidden on Home, so the language control lives here instead. */}
      <div className="absolute right-5 top-5 z-20">
        <LanguageToggle />
      </div>

      <RadialNav />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-8 text-center text-[11px] uppercase tracking-[0.28em] text-black/35 md:mt-6"
      >
        {t("home.hint")}
      </motion.p>
    </main>
  );
}
