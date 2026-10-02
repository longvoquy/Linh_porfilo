"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/lib/i18n/useTranslation";

const OPTIONS = ["en", "vi"] as const;

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className="relative flex items-center rounded-full border border-gold/30 bg-navy/5 p-1 text-sm font-medium"
    >
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          className="group relative z-10 touch-manipulation px-3 py-2 uppercase tracking-wide sm:py-1.5"
        >
          {locale === option && (
            <motion.span
              layoutId="language-toggle-pill"
              className="absolute inset-0 -z-10 rounded-full bg-ivory shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span
            className={`transition-colors ${
              locale === option ? "text-navy" : "text-navy/70 group-hover:text-navy"
            }`}
          >
            {option}
          </span>
        </button>
      ))}
    </div>
  );
}
