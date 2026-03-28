import { useEffect, useRef } from "react";
import { useI18n } from "../../hooks/useI18n";

interface HistoryContextMenuProps {
  position: { x: number; y: number };
  fileExists: boolean;
  onPlay: () => void;
  onOpenExternal: () => void;
  onShowInFolder: () => void;
  onRemoveEntry: () => void;
  onDeleteFile: () => void;
  onClose: () => void;
}

export function HistoryContextMenu({
  position,
  fileExists,
  onPlay,
  onOpenExternal,
  onShowInFolder,
  onRemoveEntry,
  onDeleteFile,
  onClose,
}: HistoryContextMenuProps) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Clamp menu position to viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menuRef.current.style.left = `${viewportWidth - rect.width - 8}px`;
    }
    if (rect.bottom > viewportHeight) {
      menuRef.current.style.top = `${viewportHeight - rect.height - 8}px`;
    }
  }, [position]);

  function handleAction(action: () => void) {
    action();
    onClose();
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-hacker-surface border border-hacker-border py-1 min-w-[180px] font-mono text-xs shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {fileExists && (
        <>
          <MenuItem label={t("history.contextPlay")} onClick={() => handleAction(onPlay)} />
          <MenuItem label={t("history.contextOpenExternal")} onClick={() => handleAction(onOpenExternal)} />
          <MenuItem label={t("history.contextShowInFolder")} onClick={() => handleAction(onShowInFolder)} />
          <Separator />
        </>
      )}

      {!fileExists && (
        <div className="px-3 py-1.5 text-hacker-red/70 italic">
          {t("history.fileMissing")}
        </div>
      )}

      <MenuItem label={t("history.contextRemoveEntry")} onClick={() => handleAction(onRemoveEntry)} />

      {fileExists && (
        <MenuItem
          label={t("history.contextDeleteFile")}
          onClick={() => handleAction(onDeleteFile)}
          variant="danger"
        />
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  const colorClass = variant === "danger"
    ? "text-hacker-red/70 hover:text-hacker-red hover:bg-hacker-red/10"
    : "text-hacker-text hover:text-[var(--accent)] hover:bg-[var(--accent)]/10";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 cursor-pointer transition-colors duration-150 ${colorClass}`}
    >
      {label}
    </button>
  );
}

function Separator() {
  return <div className="my-1 border-t border-hacker-border" />;
}
