import { useI18n } from "../../hooks/useI18n";
import type { HistoryEntry } from "../../lib/types";
import { HackerButton } from "../shared/HackerButton";

interface HistoryTableProps {
  entries: HistoryEntry[];
  onRemove: (id: string) => void;
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
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function HistoryTable({ entries, onRemove }: HistoryTableProps) {
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

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 border border-hacker-border bg-hacker-surface p-3 hover:border-[var(--accent-dim)] transition-colors duration-200"
        >
          {entry.thumbnail && (
            <img
              src={entry.thumbnail}
              alt={entry.title}
              className="w-16 h-10 object-cover border border-hacker-border shrink-0"
            />
          )}
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
          <HackerButton
            variant="ghost"
            onClick={() => onRemove(entry.id)}
          >
            {t("history.delete")}
          </HackerButton>
        </div>
      ))}
    </div>
  );
}
