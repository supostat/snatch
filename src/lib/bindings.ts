import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  VideoInfo,
  DownloadOptions,
  DownloadResult,
  DownloadProgress,
  Settings,
  HistoryEntry,
  CookiesBrowser,
} from "./types";

export const api = {
  yt: {
    getInfo: (url: string, cookiesBrowser: CookiesBrowser) =>
      invoke<VideoInfo>("yt_get_info", { url, cookiesBrowser }),

    download: (options: DownloadOptions) =>
      invoke<DownloadResult>("yt_download", { options }),

    cancel: (downloadId: string) =>
      invoke<void>("yt_cancel", { downloadId }),

    onProgress: (callback: (progress: DownloadProgress) => void): Promise<UnlistenFn> =>
      listen<DownloadProgress>("yt:progress", (event) => callback(event.payload)),
  },

  settings: {
    getAll: () => invoke<Settings>("settings_get_all"),

    // runtime type depends on key, consumer must narrow
    get: (key: string) => invoke<unknown>("settings_get", { key }),

    set: (key: string, value: unknown) =>
      invoke<void>("settings_set", { key, value }),
  },

  history: {
    getAll: () => invoke<HistoryEntry[]>("history_get_all"),

    add: (entry: HistoryEntry) =>
      invoke<void>("history_add", { entry }),

    remove: (id: string) => invoke<void>("history_remove", { id }),

    clear: () => invoke<void>("history_clear"),
  },

  dialog: {
    selectFolder: () => invoke<string | null>("select_folder"),

    openPath: (path: string) => invoke<void>("open_path", { path }),

    openUrl: (url: string) => invoke<void>("open_url", { url }),

    showInFolder: (path: string) =>
      invoke<void>("show_in_folder", { path }),
  },

  window: {
    minimize: () => invoke<void>("window_minimize"),

    close: () => invoke<void>("window_close"),
  },

  app: {
    getDownloadsPath: () => invoke<string>("get_downloads_path"),

    getVersion: () => invoke<string>("get_app_version"),
  },

  clipboard: {
    onNewUrl: (callback: (url: string) => void): Promise<UnlistenFn> =>
      listen<string>("clipboard:new-url", (event) => callback(event.payload)),
  },
};
