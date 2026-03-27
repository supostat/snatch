import { AboutPage } from "../../pages/AboutPage";
import { DownloadPage } from "../../pages/DownloadPage";
import { HistoryPage } from "../../pages/HistoryPage";
import { QueuePage } from "../../pages/QueuePage";
import { SettingsPage } from "../../pages/SettingsPage";
import { useAppStore } from "../../stores/app-store";
import { CRTOverlay } from "../effects/CRTOverlay";
import { MatrixRain } from "../effects/MatrixRain";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { StatusBar } from "./StatusBar";
import { TabNav } from "./TabNav";
import { TitleBar } from "./TitleBar";

export function MainLayout() {
  const activeTab = useAppStore((state) => state.activeTab);
  const settings = useAppStore((state) => state.settings);

  return (
    <div className="flex h-full flex-col bg-hacker-bg">
      {settings?.showMatrixRain && <MatrixRain />}

      <TitleBar />

      <TabNav />

      <main className="relative z-10 flex-1 overflow-hidden">
        <ErrorBoundary>
          {activeTab === "download" && <DownloadPage />}
          {activeTab === "queue" && <QueuePage />}
          {activeTab === "history" && <HistoryPage />}
          {activeTab === "settings" && <SettingsPage />}
          {activeTab === "about" && <AboutPage />}
        </ErrorBoundary>
      </main>

      <StatusBar />

      {settings?.crtEffect && <CRTOverlay />}
    </div>
  );
}
