import { DownloadPage } from "../../pages/DownloadPage";
import { HistoryPage } from "../../pages/HistoryPage";
import { SettingsPage } from "../../pages/SettingsPage";
import { useAppStore } from "../../stores/app-store";
import { ErrorBoundary } from "../shared/ErrorBoundary";
import { TabNav } from "./TabNav";

export function MainLayout() {
  const activeTab = useAppStore((state) => state.activeTab);

  return (
    <div className="flex h-full flex-col bg-hacker-bg">
      <header className="flex h-8 items-center justify-between border-b border-hacker-border px-4">
        <div
          className="flex items-center gap-2 text-xs font-bold tracking-widest"
          style={{ color: "var(--accent)" }}
        >
          SNATCH
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex h-5 w-5 items-center justify-center rounded text-hacker-text-dim hover:bg-hacker-surface hover:text-hacker-text"
            aria-label="Minimize"
          >
            &#x2500;
          </button>
          <button
            className="flex h-5 w-5 items-center justify-center rounded text-hacker-text-dim hover:bg-hacker-surface hover:text-hacker-text"
            aria-label="Maximize"
          >
            &#x25A1;
          </button>
          <button
            className="flex h-5 w-5 items-center justify-center rounded text-hacker-text-dim hover:bg-hacker-surface hover:text-hacker-red"
            aria-label="Close"
          >
            &#x2715;
          </button>
        </div>
      </header>

      <TabNav />

      <main className="flex-1 overflow-hidden">
        <ErrorBoundary>
          {activeTab === "download" && <DownloadPage />}
          {activeTab === "queue" && <PlaceholderTab name="Queue" />}
          {activeTab === "history" && <HistoryPage />}
          {activeTab === "settings" && <SettingsPage />}
          {activeTab === "about" && <PlaceholderTab name="About" />}
        </ErrorBoundary>
      </main>

      <footer className="flex h-6 items-center border-t border-hacker-border px-4 text-xs text-hacker-text-dim">
        <span>SNATCH v1.0.0</span>
      </footer>
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
