import { useEffect } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { useSettings } from "./hooks/useSettings";
import { useAppStore } from "./stores/app-store";

export function App() {
  const { loadSettings } = useSettings();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const settings = useAppStore((state) => state.settings);
  const theme = settings?.theme ?? "green";

  return (
    <div data-theme={theme} className="h-full">
      <MainLayout />
    </div>
  );
}
