import { useCallback, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";

interface UseUpdaterReturn {
  updateAvailable: Update | null;
  isChecking: boolean;
  isDownloading: boolean;
  error: string | null;
  checkForUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

export function useUpdater(): UseUpdaterReturn {
  const [updateAvailable, setUpdateAvailable] = useState<Update | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      const update = await check();
      if (update) {
        setUpdateAvailable(update);
      }
    } catch (checkError) {
      setError(String(checkError));
    } finally {
      setIsChecking(false);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!updateAvailable) return;
    setIsDownloading(true);
    setError(null);
    try {
      await updateAvailable.downloadAndInstall();
    } catch (installError) {
      setError(String(installError));
    } finally {
      setIsDownloading(false);
    }
  }, [updateAvailable]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(null);
  }, []);

  return {
    updateAvailable,
    isChecking,
    isDownloading,
    error,
    checkForUpdate,
    installUpdate,
    dismissUpdate,
  };
}
