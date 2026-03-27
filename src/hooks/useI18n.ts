import { useCallback } from "react";
import { useAppStore } from "../stores/app-store";
import { t as translate, setI18nLocale } from "../i18n";

export function useI18n() {
  const locale = useAppStore((state) => state.settings?.locale ?? "en");

  setI18nLocale(locale);

  const t = useCallback(
    (key: string): string => translate(key),
    [locale],
  );

  return { t, locale } as const;
}
