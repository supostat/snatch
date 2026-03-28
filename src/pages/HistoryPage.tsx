import { useEffect, useState } from "react";
import { HistoryTable } from "../components/features/HistoryTable";
import { VideoPlayer } from "../components/features/VideoPlayer";
import { HackerButton } from "../components/shared/HackerButton";
import { HackerInput } from "../components/shared/HackerInput";
import { useHistory } from "../hooks/useHistory";
import { useI18n } from "../hooks/useI18n";
import type { HistoryEntry } from "../lib/types";
import { useAppStore } from "../stores/app-store";

type ViewMode = "grid" | "list";

export function HistoryPage() {
  const history = useHistory();
  const { t } = useI18n();
  const activeTab = useAppStore((state) => state.activeTab);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [playingEntry, setPlayingEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    if (activeTab === "history") {
      history.loadHistory();
    }
  }, [activeTab, history.loadHistory]);

  function handlePlay(entry: HistoryEntry) {
    setPlayingEntry(entry);
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <HackerInput
            value={history.searchQuery}
            onChange={(e) => history.setSearchQuery(e.target.value)}
            placeholder={t("history.searchPlaceholder")}
          />
        </div>

        <div className="flex border border-hacker-border">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-2 py-1.5 font-mono text-xs cursor-pointer transition-colors duration-200
              ${viewMode === "grid"
                ? "text-[var(--accent)] bg-[var(--accent)]/10"
                : "text-hacker-text-dim hover:text-hacker-text"
              }`}
            title={t("history.gridView")}
          >
            {"⊞"}
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-2 py-1.5 font-mono text-xs cursor-pointer transition-colors duration-200 border-l border-hacker-border
              ${viewMode === "list"
                ? "text-[var(--accent)] bg-[var(--accent)]/10"
                : "text-hacker-text-dim hover:text-hacker-text"
              }`}
            title={t("history.listView")}
          >
            {"☰"}
          </button>
        </div>

        {history.entries.length > 0 && (
          <HackerButton variant="danger" onClick={history.clearHistory}>
            {t("history.clearAll")}
          </HackerButton>
        )}
      </div>

      {playingEntry && (
        <div className="border border-hacker-border bg-hacker-surface p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--accent)] font-mono text-xs truncate mr-3">
              {playingEntry.title}
            </span>
            <button
              onClick={() => setPlayingEntry(null)}
              className="text-hacker-text-dim hover:text-hacker-red font-mono text-sm cursor-pointer shrink-0"
            >
              {"✕"}
            </button>
          </div>
          <VideoPlayer filePath={playingEntry.filePath} />
        </div>
      )}

      <HistoryTable
        entries={history.filteredEntries}
        onRemove={history.removeEntry}
        onPlay={handlePlay}
        viewMode={viewMode}
      />
    </div>
  );
}
