import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/bindings";
import type { HistoryEntry } from "../lib/types";

export type SortField = "date" | "title" | "size" | "duration";
export type SortDirection = "asc" | "desc";

interface UseHistoryReturn {
  entries: HistoryEntry[];
  filteredEntries: HistoryEntry[];
  fileExistsMap: Map<string, boolean>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  qualityFilter: string;
  setQualityFilter: (quality: string) => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortDirection: SortDirection;
  toggleSortDirection: () => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  resultCount: number;
  totalCount: number;
  loadHistory: () => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  deleteFileAndEntry: (id: string) => Promise<void>;
  batchRemoveEntries: () => Promise<void>;
  batchDeleteFiles: () => Promise<void>;
  clearHistory: () => Promise<void>;
  openInPlayer: (filePath: string) => Promise<void>;
  showInFolder: (filePath: string) => Promise<void>;
}

function compareEntries(
  a: HistoryEntry,
  b: HistoryEntry,
  field: SortField,
  direction: SortDirection,
): number {
  const multiplier = direction === "asc" ? 1 : -1;

  switch (field) {
    case "date":
      return multiplier * a.downloadedAt.localeCompare(b.downloadedAt);
    case "title":
      return multiplier * a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    case "size":
      return multiplier * ((a.fileSize ?? 0) - (b.fileSize ?? 0));
    case "duration":
      return multiplier * ((a.duration ?? 0) - (b.duration ?? 0));
  }
}

export function useHistory(): UseHistoryReturn {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [fileExistsMap, setFileExistsMap] = useState<Map<string, boolean>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const checkingFiles = useRef(false);

  const loadHistory = useCallback(async () => {
    try {
      const history = await api.history.getAll();
      setEntries(history);
    } catch {
      // History remains empty on error
    }
  }, []);

  // Check file existence after entries load
  useEffect(() => {
    if (entries.length === 0 || checkingFiles.current) return;
    checkingFiles.current = true;

    const paths = entries.map((entry) => entry.filePath);
    api.dialog
      .checkFilesExist(paths)
      .then((results) => {
        const nextMap = new Map<string, boolean>();
        entries.forEach((entry, index) => {
          nextMap.set(entry.id, results[index] ?? false);
        });
        setFileExistsMap(nextMap);
      })
      .catch(() => {
        // Assume all exist on error
      })
      .finally(() => {
        checkingFiles.current = false;
      });
  }, [entries]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const removeEntry = useCallback(
    async (id: string) => {
      try {
        await api.history.remove(id);
        setSelectedIds((previous) => {
          const next = new Set(previous);
          next.delete(id);
          return next;
        });
        await loadHistory();
      } catch {
        // Silently fail
      }
    },
    [loadHistory],
  );

  const deleteFileAndEntry = useCallback(
    async (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;

      try {
        await api.dialog.deleteFile(entry.filePath);
      } catch {
        // File might already be deleted — continue
      }

      await removeEntry(id);
    },
    [entries, removeEntry],
  );

  const batchRemoveEntries = useCallback(async () => {
    for (const id of selectedIds) {
      try {
        await api.history.remove(id);
      } catch {
        // Continue with next
      }
    }
    setSelectedIds(new Set());
    await loadHistory();
  }, [selectedIds, loadHistory]);

  const batchDeleteFiles = useCallback(async () => {
    for (const id of selectedIds) {
      const entry = entries.find((e) => e.id === id);
      if (!entry) continue;
      try {
        await api.dialog.deleteFile(entry.filePath);
        await api.history.remove(id);
      } catch {
        // Continue with next
      }
    }
    setSelectedIds(new Set());
    await loadHistory();
  }, [selectedIds, entries, loadHistory]);

  const clearHistory = useCallback(async () => {
    try {
      await api.history.clear();
      setSelectedIds(new Set());
      await loadHistory();
    } catch {
      // Silently fail
    }
  }, [loadHistory]);

  const openInPlayer = useCallback(async (filePath: string) => {
    try {
      await api.dialog.openPath(filePath);
    } catch {
      // Silently fail
    }
  }, []);

  const showInFolder = useCallback(async (filePath: string) => {
    try {
      await api.dialog.showInFolder(filePath);
    } catch {
      // Silently fail
    }
  }, []);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (qualityFilter !== "all") {
      result = result.filter((entry) => entry.quality === qualityFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query) ||
          entry.url.toLowerCase().includes(query) ||
          (entry.channel?.toLowerCase().includes(query) ?? false),
      );
    }

    result = [...result].sort((a, b) => compareEntries(a, b, sortField, sortDirection));

    return result;
  }, [entries, searchQuery, qualityFilter, sortField, sortDirection]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
  }, [filteredEntries]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
  }, []);

  return {
    entries,
    filteredEntries,
    fileExistsMap,
    searchQuery,
    setSearchQuery,
    qualityFilter,
    setQualityFilter,
    sortField,
    setSortField,
    sortDirection,
    toggleSortDirection,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    resultCount: filteredEntries.length,
    totalCount: entries.length,
    loadHistory,
    removeEntry,
    deleteFileAndEntry,
    batchRemoveEntries,
    batchDeleteFiles,
    clearHistory,
    openInPlayer,
    showInFolder,
  };
}
