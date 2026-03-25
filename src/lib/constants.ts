import type { QualityPreset, TabId, Theme } from "./types";

export const QUALITY_PRESETS: readonly { value: QualityPreset; label: string }[] = [
  { value: "best", label: "Best Quality" },
  { value: "q2160", label: "4K (2160p)" },
  { value: "q1080", label: "Full HD (1080p)" },
  { value: "q720", label: "HD (720p)" },
  { value: "q480", label: "SD (480p)" },
  { value: "audio", label: "Audio Only (MP3)" },
] as const;

export const TABS: readonly { id: TabId; label: string }[] = [
  { id: "download", label: "Download" },
  { id: "queue", label: "Queue" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
  { id: "about", label: "About" },
] as const;

export const THEMES: readonly { value: Theme; label: string; cssClass: string }[] = [
  { value: "green", label: "Matrix Green", cssClass: "theme-green" },
  { value: "amber", label: "Retro Amber", cssClass: "theme-amber" },
  { value: "cyan", label: "Cyber Cyan", cssClass: "theme-cyan" },
] as const;

export const MAX_CONCURRENT_DOWNLOADS = 5;
export const MIN_CONCURRENT_DOWNLOADS = 1;
export const MAX_HISTORY_ENTRIES = 500;
export const MAX_URL_LENGTH = 2048;
