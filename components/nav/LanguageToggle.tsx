"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const OPTIONS = ["en", "vi"] as const;

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="relative flex items-center rounded-full border border-black/10 bg-black/3 p-1 text-sm font-medium">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          className="relative z-10 px-3 py-1 uppercase tracking-wide"
        >
          {locale === option && (
            <motion.span
              layoutId="language-toggle-pill"
              className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className={locale === option ? "text-black" : "text-black/50"}>{option}</span>
        </button>
      ))}
    </div>
  );
}
