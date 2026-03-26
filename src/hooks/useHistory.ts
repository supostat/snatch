import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/bindings";
import type { HistoryEntry } from "../lib/types";

interface UseHistoryReturn {
  entries: HistoryEntry[];
  filteredEntries: HistoryEntry[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadHistory: () => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export function useHistory(): UseHistoryReturn {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const history = await api.history.getAll();
      setEntries(history);
    } catch {
      // History remains empty on error
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const removeEntry = useCallback(
    async (id: string) => {
      try {
        await api.history.remove(id);
        await loadHistory();
      } catch {
        // Silently fail — entry stays in list
      }
    },
    [loadHistory],
  );

  const clearHistory = useCallback(async () => {
    try {
      await api.history.clear();
      await loadHistory();
    } catch {
      // Silently fail
    }
  }, [loadHistory]);

  const filteredEntries = searchQuery.trim()
    ? entries.filter((entry) => {
        const query = searchQuery.toLowerCase();
        return (
          entry.title.toLowerCase().includes(query) ||
          entry.url.toLowerCase().includes(query) ||
          (entry.channel?.toLowerCase().includes(query) ?? false)
        );
      })
    : entries;

  return {
    entries,
    filteredEntries,
    searchQuery,
    setSearchQuery,
    loadHistory,
    removeEntry,
    clearHistory,
  };
}
