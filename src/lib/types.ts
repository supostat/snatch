export type QualityPreset =
  | "best"
  | "q2160"
  | "q1080"
  | "q720"
  | "q480"
  | "audio";

export type DownloadStage =
  | "downloading"
  | "merging"
  | "converting"
  | "done"
  | "error";

export type Theme = "green" | "amber" | "cyan";

export type Locale = "en" | "ru";

export type CookiesBrowser =
  | "none"
  | "chrome"
  | "firefox"
  | "safari"
  | "edge"
  | "brave";

export interface VideoInfo {
  title: string;
  thumbnail: string | null;
  duration: number;
  channel: string;
  uploadDate: string | null;
  viewCount: number | null;
  likeCount: number | null;
  description: string | null;
}

export interface DownloadOptions {
  downloadId: string;
  url: string;
  quality: QualityPreset;
  outputDir: string;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  cookiesBrowser: CookiesBrowser;
}

export interface DownloadProgress {
  downloadId: string;
  percent: number;
  speed: string | null;
  eta: string | null;
  downloaded: string | null;
  total: string | null;
  stage: DownloadStage;
  pass: string | null;
}

export interface DownloadResult {
  downloadId: string;
  filePath: string | null;
  fileSize: number | null;
  success: boolean;
  error: string | null;
}

export interface Settings {
  downloadDir: string;
  defaultQuality: QualityPreset;
  embedThumbnail: boolean;
  embedMetadata: boolean;
  autoClipboard: boolean;
  maxConcurrent: number;
  theme: Theme;
  showMatrixRain: boolean;
  crtEffect: boolean;
  locale: Locale;
  cookiesBrowser: CookiesBrowser;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  filePath: string;
  quality: string;
  fileSize: number | null;
  duration: number | null;
  channel: string | null;
  downloadedAt: string;
  thumbnail: string | null;
}

export type TabId = "download" | "queue" | "history" | "settings" | "about";
