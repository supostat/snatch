import { useI18n } from "../../hooks/useI18n";
import type { HistoryEntry } from "../../lib/types";
import { HackerButton } from "../shared/HackerButton";

type ViewMode = "grid" | "list";

interface HistoryTableProps {
  entries: HistoryEntry[];
  onRemove: (id: string) => void;
  onPlay: (entry: HistoryEntry) => void;
  viewMode: ViewMode;
}

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "\u2014";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function GridCard({
  entry,
  onRemove,
  onPlay,
}: {
  entry: HistoryEntry;
  onRemove: () => void;
  onPlay: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="group border border-hacker-border bg-hacker-surface hover:border-[var(--accent-dim)] transition-colors duration-200 flex flex-col">
      <button
        onClick={onPlay}
        className="relative w-full aspect-video bg-hacker-bg overflow-hidden cursor-pointer"
      >
        {entry.thumbnail ? (
          <img
            src={entry.thumbnail}
            alt={entry.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-hacker-text-dim font-mono text-xs">
            {t("history.noThumbnail")}
          </div>
        )}
        {entry.duration !== null && (
          <span className="absolute bottom-1 right-1 bg-hacker-bg/90 text-hacker-text font-mono text-[10px] px-1 py-0.5">
            {formatDuration(entry.duration)}
          </span>
        )}
        <div className="absolute inset-0 bg-[var(--accent)]/0 group-hover:bg-[var(--accent)]/5 transition-colors duration-200 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 text-[var(--accent)] font-mono text-xs transition-opacity duration-200">
            {"▶"} {t("history.play")}
          </span>
        </div>
      </button>

      <div className="p-2 flex-1 flex flex-col gap-1">
        <div className="text-[var(--accent)] font-mono text-xs leading-tight line-clamp-2 min-h-[2rem]">
          {entry.title}
        </div>
        <div className="text-hacker-text-dim font-mono text-[10px]">
          {entry.channel && <span>{entry.channel}</span>}
        </div>
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex gap-2 text-hacker-text-dim font-mono text-[10px]">
            <span>{entry.quality}</span>
            <span>{formatFileSize(entry.fileSize)}</span>
            <span>{formatDate(entry.downloadedAt)}</span>
          </div>
          <button
            onClick={onRemove}
            className="text-hacker-text-dim hover:text-hacker-red font-mono text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          >
            {"✕"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListRow({
  entry,
  onRemove,
  onPlay,
}: {
  entry: HistoryEntry;
  onRemove: () => void;
  onPlay: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="group flex items-center gap-3 border border-hacker-border bg-hacker-surface p-3 hover:border-[var(--accent-dim)] transition-colors duration-200">
      <button
        onClick={onPlay}
        className="relative w-28 aspect-video bg-hacker-bg overflow-hidden shrink-0 cursor-pointer"
      >
        {entry.thumbnail ? (
          <img
            src={entry.thumbnail}
            alt={entry.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-hacker-text-dim font-mono text-[8px]">
            {t("history.noThumbnail")}
          </div>
        )}
        {entry.duration !== null && (
          <span className="absolute bottom-0.5 right-0.5 bg-hacker-bg/90 text-hacker-text font-mono text-[9px] px-0.5">
            {formatDuration(entry.duration)}
          </span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-[var(--accent)] font-mono text-xs truncate">
          {entry.title}
        </div>
        <div className="flex gap-3 text-hacker-text-dim font-mono text-[10px] mt-0.5">
          {entry.channel && <span>{entry.channel}</span>}
          <span>{entry.quality}</span>
          <span>{formatFileSize(entry.fileSize)}</span>
          <span>{formatDate(entry.downloadedAt)}</span>
        </div>
      </div>

      <HackerButton variant="ghost" onClick={onRemove}>
        {t("history.delete")}
      </HackerButton>
    </div>
  );
}

export function HistoryTable({
  entries,
  onRemove,
  onPlay,
  viewMode,
}: HistoryTableProps) {
  const { t } = useI18n();

  if (entries.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <span className="text-hacker-text-dim font-mono text-sm">
          {t("history.emptyState")}
        </span>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {entries.map((entry) => (
          <GridCard
            key={entry.id}
            entry={entry}
            onRemove={() => onRemove(entry.id)}
            onPlay={() => onPlay(entry)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <ListRow
          key={entry.id}
          entry={entry}
          onRemove={() => onRemove(entry.id)}
          onPlay={() => onPlay(entry)}
        />
      ))}
    </div>
  );
}
