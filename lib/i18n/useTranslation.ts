"use client";

import type { LocalizedString } from "@/lib/types";
import { useLanguage } from "./LanguageContext";
import en from "./dictionaries/en.json";
import vi from "./dictionaries/vi.json";

const dictionaries = { en, vi } as const;

type DictionaryKey = keyof typeof en;

export function useTranslation() {
  const { locale } = useLanguage();

  function t(key: DictionaryKey): string {
    return dictionaries[locale][key] ?? dictionaries.en[key];
  }

  function localize(field: LocalizedString): string {
    return field[locale];
  }

  return { t, localize, locale };
}
