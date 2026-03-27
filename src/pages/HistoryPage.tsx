import { HistoryTable } from "../components/features/HistoryTable";
import { HackerButton } from "../components/shared/HackerButton";
import { HackerInput } from "../components/shared/HackerInput";
import { useHistory } from "../hooks/useHistory";
import { useI18n } from "../hooks/useI18n";

export function HistoryPage() {
  const history = useHistory();
  const { t } = useI18n();

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
        {history.entries.length > 0 && (
          <HackerButton variant="danger" onClick={history.clearHistory}>
            {t("history.clearAll")}
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
