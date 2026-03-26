import { useCallback } from "react";
import { api } from "../lib/bindings";
import { useAppStore } from "../stores/app-store";

interface UseSettingsReturn {
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: unknown) => Promise<{ error: string | null }>;
}

export function useSettings(): UseSettingsReturn {
  const setSettings = useAppStore((state) => state.setSettings);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await api.settings.getAll();
      setSettings(settings);
    } catch {
      // Settings will remain null, defaults used in UI
    }
  }, [setSettings]);

  const updateSetting = useCallback(
    async (key: string, value: unknown): Promise<{ error: string | null }> => {
      try {
        await api.settings.set(key, value);
        await loadSettings();
        return { error: null };
      } catch (updateError) {
        return { error: String(updateError) };
      }
    },
    [loadSettings],
  );

  return { loadSettings, updateSetting };
}
