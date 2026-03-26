import { DownloadPage } from "../../pages/DownloadPage";
import { HistoryPage } from "../../pages/HistoryPage";
import { QueuePage } from "../../pages/QueuePage";
import { SettingsPage } from "../../pages/SettingsPage";
import { useAppStore } from "../../stores/app-store";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { StatusBar } from "./StatusBar";
import { TabNav } from "./TabNav";
import { TitleBar } from "./TitleBar";

export function MainLayout() {
  const activeTab = useAppStore((state) => state.activeTab);

  return (
    <div className="flex h-full flex-col bg-hacker-bg">
      <TitleBar />

      <TabNav />

      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {activeTab === "download" && <DownloadPage />}
          {activeTab === "queue" && <QueuePage />}
          {activeTab === "history" && <HistoryPage />}
          {activeTab === "settings" && <SettingsPage />}
          {activeTab === "about" && <PlaceholderTab name="About" />}
        </ErrorBoundary>
      </main>

      <StatusBar />
    </div>
  );
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <span style={{ color: "var(--accent-dim)" }}>[ {name} ]</span>
    </div>
  );
}
