import { useState } from "react";
import { useI18n } from "../../hooks/useI18n";
import type { PlaylistEntry, PlaylistInfo, QualityPreset } from "../../lib/types";
import { HackerButton } from "../shared/HackerButton";
import { HackerCard } from "../shared/HackerCard";

interface PlaylistViewProps {
  playlist: PlaylistInfo;
  onAddToQueue: (entries: PlaylistEntry[], quality: QualityPreset) => void;
  quality: QualityPreset;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "--:--";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function PlaylistView({ playlist, onAddToQueue, quality }: PlaylistViewProps) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(playlist.entries.map((_, index) => index)),
  );

  function toggleEntry(index: number) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(playlist.entries.map((_, index) => index)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function handleAddToQueue() {
    const selectedEntries = playlist.entries.filter((_, index) => selectedIds.has(index));
    if (selectedEntries.length > 0) {
      onAddToQueue(selectedEntries, quality);
    }
  }

  return (
    <HackerCard>
      {/* Playlist header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[var(--accent)] font-mono text-sm font-bold">
            {playlist.title}
          </div>
          <div className="text-hacker-text-dim font-mono text-xs mt-0.5">
            {playlist.channel} · {playlist.videoCount} {t("playlist.videos")}
          </div>
        </div>
      </div>

      {/* Selection controls */}
      <div className="flex items-center gap-3 mb-2 pb-2 border-b border-hacker-border">
        <span className="text-hacker-text-dim font-mono text-[10px]">
          {t("playlist.selected")}: {selectedIds.size}/{playlist.entries.length}
        </span>
        <button
          onClick={selectAll}
          className="text-[var(--accent-dim)] hover:text-[var(--accent)] font-mono text-[10px] cursor-pointer"
        >
          {t("playlist.selectAll")}
        </button>
        <button
          onClick={deselectAll}
          className="text-hacker-text-dim hover:text-hacker-text font-mono text-[10px] cursor-pointer"
        >
          {t("playlist.deselectAll")}
        </button>
        <div className="ml-auto">
          <HackerButton
            onClick={handleAddToQueue}
            disabled={selectedIds.size === 0}
          >
            {t("playlist.addToQueue")} ({selectedIds.size})
          </HackerButton>
        </div>
      </div>

      {/* Video list */}
      <div className="max-h-80 overflow-y-auto space-y-0.5">
        {playlist.entries.map((entry, index) => (
          <button
            key={`${entry.url}-${index}`}
            onClick={() => toggleEntry(index)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-left cursor-pointer transition-colors duration-150
              ${selectedIds.has(index)
                ? "bg-[var(--accent)]/5 text-[var(--accent)]"
                : "text-hacker-text-dim hover:text-hacker-text"
              }`}
          >
            {/* Checkbox */}
            <span
              className={`w-3.5 h-3.5 border font-mono text-[8px] flex items-center justify-center shrink-0
                ${selectedIds.has(index)
                  ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
                  : "border-hacker-border text-transparent"
                }`}
            >
              {selectedIds.has(index) ? "✓" : ""}
            </span>

            {/* Thumbnail */}
            {entry.thumbnail ? (
              <img
                src={entry.thumbnail}
                alt=""
                className="w-12 aspect-video object-cover shrink-0"
              />
            ) : (
              <div className="w-12 aspect-video bg-hacker-bg shrink-0" />
            )}

            {/* Index */}
            <span className="font-mono text-[10px] w-5 text-right shrink-0 opacity-50">
              {index + 1}
            </span>

            {/* Title */}
            <span className="font-mono text-xs truncate flex-1">
              {entry.title}
            </span>

            {/* Duration */}
            <span className="font-mono text-[10px] opacity-50 shrink-0">
              {formatDuration(entry.duration)}
            </span>
          </button>
        ))}
      </div>
    </HackerCard>
  );
}
