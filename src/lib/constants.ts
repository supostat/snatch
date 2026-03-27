import { t } from "../i18n";
import type { QualityPreset, TabId, Theme } from "./types";

export function getQualityPresets(): readonly { value: QualityPreset; label: string }[] {
  return [
    { value: "best", label: t("quality.best") },
    { value: "q2160", label: t("quality.q2160") },
    { value: "q1080", label: t("quality.q1080") },
    { value: "q720", label: t("quality.q720") },
    { value: "q480", label: t("quality.q480") },
    { value: "audio", label: t("quality.audio") },
  ];
}

export function getTabs(): readonly { id: TabId; label: string }[] {
  return [
    { id: "download", label: t("tabs.download") },
    { id: "queue", label: t("tabs.queue") },
    { id: "history", label: t("tabs.history") },
    { id: "settings", label: t("tabs.settings") },
    { id: "about", label: t("tabs.about") },
  ];
}

export function getThemes(): readonly { value: Theme; label: string }[] {
  return [
    { value: "green", label: t("themes.green") },
    { value: "amber", label: t("themes.amber") },
    { value: "cyan", label: t("themes.cyan") },
  ];
}

export const MAX_CONCURRENT_DOWNLOADS = 5;
export const MIN_CONCURRENT_DOWNLOADS = 1;
export const MAX_HISTORY_ENTRIES = 500;
export const MAX_URL_LENGTH = 2048;
