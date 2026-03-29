import { useState } from "react";
import { useI18n } from "../../hooks/useI18n";
import { useVideoStatus } from "../../hooks/useVideoStatus";
import type { PlaylistEntry, PlaylistInfo, QualityPreset, VideoStatus } from "../../lib/types";
import { useAppStore } from "../../stores/app-store";
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

function PlaylistEntryStatusBadge({ videoId }: { videoId: string }) {
  const status: VideoStatus = useVideoStatus(videoId);
  const { t } = useI18n();

  if (status === "idle") return null;

  return (
    <span
      className={`font-mono text-[9px] shrink-0 ${
        status === "downloading"
          ? "text-[var(--accent)] animate-pulse"
          : "text-hacker-text-dim"
      }`}
    >
      {status === "downloading" ? t("status.downloading") : t("status.downloaded")}
    </span>
  );
}

function isVideoUnavailable(videoId: string, historyVideoIds: Set<string>, downloadingVideoIds: Set<string>): boolean {
  return historyVideoIds.has(videoId) || downloadingVideoIds.has(videoId);
}

export function PlaylistView({ playlist, onAddToQueue, quality }: PlaylistViewProps) {
  const { t } = useI18n();
  const historyVideoIds = useAppStore((state) => state.historyVideoIds);
  const downloadingVideoIds = useAppStore((state) => state.downloadingVideoIds);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    const available = new Set<number>();
    playlist.entries.forEach((entry, index) => {
      if (!isVideoUnavailable(entry.videoId, historyVideoIds, downloadingVideoIds)) {
        available.add(index);
      }
    });
    return available;
  });

  function toggleEntry(index: number) {
    const entry = playlist.entries[index];
    if (!entry || isVideoUnavailable(entry.videoId, historyVideoIds, downloadingVideoIds)) return;

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
    const available = new Set<number>();
    playlist.entries.forEach((entry, index) => {
      if (!isVideoUnavailable(entry.videoId, historyVideoIds, downloadingVideoIds)) {
        available.add(index);
      }
    });
    setSelectedIds(available);
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function handleAddToQueue() {
    const selectedEntries = playlist.entries.filter((_, index) => selectedIds.has(index));
    if (selectedEntries.length === 0) return;
    onAddToQueue(selectedEntries, quality);
    setSelectedIds(new Set());
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
        {playlist.entries.map((entry, index) => {
          const unavailable = isVideoUnavailable(entry.videoId, historyVideoIds, downloadingVideoIds);

          return (
          <button
            key={`${entry.url}-${index}`}
            onClick={() => toggleEntry(index)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors duration-150
              ${unavailable
                ? "opacity-40 cursor-default"
                : selectedIds.has(index)
                  ? "bg-[var(--accent)]/5 text-[var(--accent)] cursor-pointer"
                  : "text-hacker-text-dim hover:text-hacker-text cursor-pointer"
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

            {/* Status badge */}
            <PlaylistEntryStatusBadge videoId={entry.videoId} />

            {/* Duration */}
            <span className="font-mono text-[10px] opacity-50 shrink-0">
              {formatDuration(entry.duration)}
            </span>
          </button>
          );
        })}
      </div>
    </HackerCard>
  );
}
