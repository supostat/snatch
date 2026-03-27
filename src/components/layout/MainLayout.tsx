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

function TabPanel({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`absolute inset-0 ${visible ? "" : "hidden"}`}
      aria-hidden={!visible}
    >
      {children}
    </div>
  );
}

export function MainLayout() {
  const activeTab = useAppStore((state) => state.activeTab);
  const settings = useAppStore((state) => state.settings);

  return (
    <div className="flex h-full flex-col bg-hacker-bg">
      {settings?.showMatrixRain && <MatrixRain />}

      <div className="relative z-10 flex h-full flex-col">
        <div className="bg-hacker-bg">
          <TitleBar />
          <TabNav />
        </div>

        <main className="relative flex-1 overflow-hidden">
          <ErrorBoundary>
            <TabPanel visible={activeTab === "download"}><DownloadPage /></TabPanel>
            <TabPanel visible={activeTab === "queue"}><QueuePage /></TabPanel>
            <TabPanel visible={activeTab === "history"}><HistoryPage /></TabPanel>
            <TabPanel visible={activeTab === "settings"}><SettingsPage /></TabPanel>
            <TabPanel visible={activeTab === "about"}><AboutPage /></TabPanel>
          </ErrorBoundary>
        </main>

        <div className="bg-hacker-bg">
          <StatusBar />
        </div>
      </div>

      {settings?.crtEffect && <CRTOverlay />}
    </div>
  );
}
