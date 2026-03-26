import { api } from "../../lib/bindings";
import { HackerButton } from "../shared/HackerButton";

interface FolderPickerProps {
  currentPath: string;
  onSelect: (path: string) => void;
}

export function FolderPicker({ currentPath, onSelect }: FolderPickerProps) {
  async function handleBrowse() {
    const selected = await api.dialog.selectFolder();
    if (selected) {
      onSelect(selected);
    }
  }

  return (
    <div className="flex items-center gap-2 max-w-xs">
      <span
        className="text-[var(--accent)] font-mono text-xs truncate max-w-[200px]"
        title={currentPath}
      >
        {currentPath}
      </span>
      <HackerButton variant="ghost" onClick={() => void handleBrowse()}>
        BROWSE
      </HackerButton>
    </div>
  );
}
