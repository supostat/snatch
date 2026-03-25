import { create } from "zustand";
import type { Settings, TabId } from "../lib/types";

interface AppState {
  activeTab: TabId;
  settings: Settings | null;
  isYtdlpAvailable: boolean;
  ytdlpVersion: string | null;
  downloadActive: boolean;

  setActiveTab: (tab: TabId) => void;
  setSettings: (settings: Settings) => void;
  setYtdlpAvailable: (available: boolean) => void;
  setYtdlpVersion: (version: string | null) => void;
  setDownloadActive: (active: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: "download",
  settings: null,
  isYtdlpAvailable: false,
  ytdlpVersion: null,
  downloadActive: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSettings: (settings) => set({ settings }),
  setYtdlpAvailable: (available) => set({ isYtdlpAvailable: available }),
  setYtdlpVersion: (version) => set({ ytdlpVersion: version }),
  setDownloadActive: (active) => set({ downloadActive: active }),
}));
