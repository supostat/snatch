import { create } from "zustand";
import type { QualityPreset, Settings, TabId } from "../lib/types";

interface PendingQueueUrls {
  urls: string[];
  quality: QualityPreset;
}

interface AppState {
  activeTab: TabId;
  settings: Settings | null;
  isYtdlpAvailable: boolean;
  ytdlpVersion: string | null;
  isFfmpegAvailable: boolean;
  isBinaryDownloading: boolean;
  downloadActive: boolean;
  pendingQueueUrls: PendingQueueUrls | null;
  historyVideoIds: Set<string>;
  downloadingVideoIds: Set<string>;

  setActiveTab: (tab: TabId) => void;
  setSettings: (settings: Settings) => void;
  setYtdlpAvailable: (available: boolean) => void;
  setYtdlpVersion: (version: string | null) => void;
  setFfmpegAvailable: (available: boolean) => void;
  setBinaryDownloading: (downloading: boolean) => void;
  setDownloadActive: (active: boolean) => void;
  setQueueUrls: (urls: string[], quality: QualityPreset) => void;
  consumeQueueUrls: () => PendingQueueUrls | null;
  setHistoryVideoIds: (ids: Set<string>) => void;
  addHistoryVideoId: (videoId: string) => void;
  setDownloadingVideoIds: (ids: Set<string>) => void;
  addDownloadingVideoId: (videoId: string) => void;
  removeDownloadingVideoId: (videoId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: "download",
  settings: null,
  isYtdlpAvailable: false,
  ytdlpVersion: null,
  isFfmpegAvailable: false,
  isBinaryDownloading: false,
  downloadActive: false,
  pendingQueueUrls: null,
  historyVideoIds: new Set(),
  downloadingVideoIds: new Set(),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSettings: (settings) => set({ settings }),
  setYtdlpAvailable: (available) => set({ isYtdlpAvailable: available }),
  setYtdlpVersion: (version) => set({ ytdlpVersion: version }),
  setFfmpegAvailable: (available) => set({ isFfmpegAvailable: available }),
  setBinaryDownloading: (downloading) => set({ isBinaryDownloading: downloading }),
  setDownloadActive: (active) => set({ downloadActive: active }),
  setQueueUrls: (urls, quality) => set({ pendingQueueUrls: { urls, quality } }),
  consumeQueueUrls: () => {
    const pending = get().pendingQueueUrls;
    if (pending) {
      set({ pendingQueueUrls: null });
    }
    return pending;
  },
  setHistoryVideoIds: (ids) => set({ historyVideoIds: ids }),
  addHistoryVideoId: (videoId) => {
    if (!videoId) return;
    const next = new Set(get().historyVideoIds);
    next.add(videoId);
    set({ historyVideoIds: next });
  },
  setDownloadingVideoIds: (ids) => set({ downloadingVideoIds: ids }),
  addDownloadingVideoId: (videoId) => {
    if (!videoId) return;
    const next = new Set(get().downloadingVideoIds);
    next.add(videoId);
    set({ downloadingVideoIds: next });
  },
  removeDownloadingVideoId: (videoId) => {
    const next = new Set(get().downloadingVideoIds);
    next.delete(videoId);
    set({ downloadingVideoIds: next });
  },
}));
