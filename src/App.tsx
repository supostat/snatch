import { useEffect } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { api } from "./lib/bindings";
import { useSettings } from "./hooks/useSettings";
import { useAppStore } from "./stores/app-store";

export function App() {
  const { loadSettings } = useSettings();
  const setYtdlpAvailable = useAppStore((state) => state.setYtdlpAvailable);
  const setYtdlpVersion = useAppStore((state) => state.setYtdlpVersion);
  const setFfmpegAvailable = useAppStore((state) => state.setFfmpegAvailable);

  useEffect(() => {
    loadSettings();
    api.app.checkDependencies().then((status) => {
      setYtdlpAvailable(status.ytdlpAvailable);
      setYtdlpVersion(status.ytdlpVersion);
      setFfmpegAvailable(status.ffmpegAvailable);
    }).catch(() => {
      setYtdlpAvailable(false);
      setFfmpegAvailable(false);
    });
  }, [loadSettings, setYtdlpAvailable, setYtdlpVersion, setFfmpegAvailable]);

  const settings = useAppStore((state) => state.settings);
  const theme = settings?.theme ?? "green";

  return (
    <div data-theme={theme} className="h-full">
      <MainLayout />
    </div>
  );
}
