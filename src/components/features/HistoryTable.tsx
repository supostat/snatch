import { useState } from "react";
import { useI18n } from "../../hooks/useI18n";
import type { HistoryEntry } from "../../lib/types";
import { HistoryContextMenu } from "./HistoryContextMenu";

type ViewMode = "grid" | "list";

interface HistoryTableProps {
  entries: HistoryEntry[];
  fileExistsMap: Map<string, boolean>;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onPlay: (entry: HistoryEntry) => void;
  onOpenExternal: (filePath: string) => void;
  onShowInFolder: (filePath: string) => void;
  onRemoveEntry: (id: string) => void;
  onDeleteFile: (id: string) => void;
  viewMode: ViewMode;
}

interface ContextMenuState {
  entry: HistoryEntry;
  position: { x: number; y: number };
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
  fileExists,
  isSelected,
  onToggleSelection,
  onPlay,
  onContextMenu,
}: {
  entry: HistoryEntry;
  fileExists: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onPlay: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className={`group border bg-hacker-surface hover:border-[var(--accent-dim)] transition-colors duration-200 flex flex-col relative
        ${isSelected ? "border-[var(--accent)]" : "border-hacker-border"}
        ${!fileExists ? "opacity-50" : ""}`}
      onContextMenu={onContextMenu}
    >
      {/* Selection checkbox */}
      <button
        onClick={onToggleSelection}
        className={`absolute top-1 left-1 z-10 w-4 h-4 border font-mono text-[8px] flex items-center justify-center cursor-pointer transition-all duration-200
          ${isSelected
            ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
            : "border-hacker-border bg-hacker-bg/80 text-transparent group-hover:border-hacker-text-dim"
          }`}
      >
        {isSelected ? "✓" : ""}
      </button>

      <button
        onClick={fileExists ? onPlay : undefined}
        className={`relative w-full aspect-video bg-hacker-bg overflow-hidden ${fileExists ? "cursor-pointer" : "cursor-default"}`}
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
        {fileExists && (
          <div className="absolute inset-0 bg-[var(--accent)]/0 group-hover:bg-[var(--accent)]/5 transition-colors duration-200 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-[var(--accent)] font-mono text-xs transition-opacity duration-200">
              {"▶"} {t("history.play")}
            </span>
          </div>
        )}
        {!fileExists && (
          <div className="absolute inset-0 flex items-center justify-center bg-hacker-bg/60">
            <span className="text-hacker-red font-mono text-[10px]">
              {t("history.fileMissing")}
            </span>
          </div>
        )}
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
        </div>
      </div>
    </div>
  );
}

function ListRow({
  entry,
  fileExists,
  isSelected,
  onToggleSelection,
  onPlay,
  onContextMenu,
}: {
  entry: HistoryEntry;
  fileExists: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onPlay: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className={`group flex items-center gap-3 border bg-hacker-surface p-3 hover:border-[var(--accent-dim)] transition-colors duration-200
        ${isSelected ? "border-[var(--accent)]" : "border-hacker-border"}
        ${!fileExists ? "opacity-50" : ""}`}
      onContextMenu={onContextMenu}
    >
      {/* Selection checkbox */}
      <button
        onClick={onToggleSelection}
        className={`w-4 h-4 border font-mono text-[8px] flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0
          ${isSelected
            ? "border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]"
            : "border-hacker-border bg-hacker-bg text-transparent group-hover:border-hacker-text-dim"
          }`}
      >
        {isSelected ? "✓" : ""}
      </button>

      <button
        onClick={fileExists ? onPlay : undefined}
        className={`relative w-28 aspect-video bg-hacker-bg overflow-hidden shrink-0 ${fileExists ? "cursor-pointer" : "cursor-default"}`}
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
        {!fileExists && (
          <div className="absolute inset-0 flex items-center justify-center bg-hacker-bg/60">
            <span className="text-hacker-red font-mono text-[8px]">
              {t("history.fileMissing")}
            </span>
          </div>
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
    </div>
  );
}

export function HistoryTable({
  entries,
  fileExistsMap,
  selectedIds,
  onToggleSelection,
  onPlay,
  onOpenExternal,
  onShowInFolder,
  onRemoveEntry,
  onDeleteFile,
  viewMode,
}: HistoryTableProps) {
  const { t } = useI18n();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  function handleContextMenu(event: React.MouseEvent, entry: HistoryEntry) {
    event.preventDefault();
    setContextMenu({
      entry,
      position: { x: event.clientX, y: event.clientY },
    });
  }

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
    <>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {entries.map((entry) => (
            <GridCard
              key={entry.id}
              entry={entry}
              fileExists={fileExistsMap.get(entry.id) ?? true}
              isSelected={selectedIds.has(entry.id)}
              onToggleSelection={() => onToggleSelection(entry.id)}
              onPlay={() => onPlay(entry)}
              onContextMenu={(e) => handleContextMenu(e, entry)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <ListRow
              key={entry.id}
              entry={entry}
              fileExists={fileExistsMap.get(entry.id) ?? true}
              isSelected={selectedIds.has(entry.id)}
              onToggleSelection={() => onToggleSelection(entry.id)}
              onPlay={() => onPlay(entry)}
              onContextMenu={(e) => handleContextMenu(e, entry)}
            />
          ))}
        </div>
      )}

      {contextMenu && (
        <HistoryContextMenu
          position={contextMenu.position}
          fileExists={fileExistsMap.get(contextMenu.entry.id) ?? true}
          onPlay={() => onPlay(contextMenu.entry)}
          onOpenExternal={() => onOpenExternal(contextMenu.entry.filePath)}
          onShowInFolder={() => onShowInFolder(contextMenu.entry.filePath)}
          onRemoveEntry={() => onRemoveEntry(contextMenu.entry.id)}
          onDeleteFile={() => onDeleteFile(contextMenu.entry.id)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
