import type { Locale } from "../lib/types";
import en from "./en.json";
import ru from "./ru.json";

type TranslationDictionary = typeof en;

const dictionaries: Record<Locale, TranslationDictionary> = { en, ru };

let currentLocale: Locale = "en";

export function setI18nLocale(locale: Locale) {
  currentLocale = locale;
}

export function getI18nLocale(): Locale {
  return currentLocale;
}

export function t(key: string): string {
  const dictionary = dictionaries[currentLocale];
  const fallback = dictionaries.en;

  const resolve = (obj: Record<string, unknown>, path: string): string | undefined => {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === "string" ? current : undefined;
  };

  return resolve(dictionary, key) ?? resolve(fallback, key) ?? key;
}
