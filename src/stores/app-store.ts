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

  setActiveTab: (tab: TabId) => void;
  setSettings: (settings: Settings) => void;
  setYtdlpAvailable: (available: boolean) => void;
  setYtdlpVersion: (version: string | null) => void;
  setFfmpegAvailable: (available: boolean) => void;
  setBinaryDownloading: (downloading: boolean) => void;
  setDownloadActive: (active: boolean) => void;
  setQueueUrls: (urls: string[], quality: QualityPreset) => void;
  consumeQueueUrls: () => PendingQueueUrls | null;
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
}));
