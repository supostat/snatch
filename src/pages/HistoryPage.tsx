import { HistoryTable } from "../components/features/HistoryTable";
import { HackerButton } from "../components/shared/HackerButton";
import { HackerInput } from "../components/shared/HackerInput";
import { useHistory } from "../hooks/useHistory";

export function HistoryPage() {
  const history = useHistory();

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <HackerInput
            value={history.searchQuery}
            onChange={(e) => history.setSearchQuery(e.target.value)}
            placeholder="Search history..."
          />
        </div>
        {history.entries.length > 0 && (
          <HackerButton variant="danger" onClick={history.clearHistory}>
            CLEAR
          </HackerButton>
        )}
      </div>

      <HistoryTable
        entries={history.filteredEntries}
        onRemove={history.removeEntry}
      />
    </div>
  );
}
