import { useAppStore } from "../../stores/app-store";
import { getTabs } from "../../lib/constants";
import type { TabId } from "../../lib/types";

export function TabNav() {
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const tabs = getTabs();

  return (
    <nav className="flex border-b border-hacker-border">
      {tabs.map((tab) => (
        <TabButton
          key={tab.id}
          tabId={tab.id}
          label={tab.label}
          isActive={activeTab === tab.id}
          onClick={setActiveTab}
        />
      ))}
    </nav>
  );
}

function TabButton({
  tabId,
  label,
  isActive,
  onClick,
}: {
  tabId: TabId;
  label: string;
  isActive: boolean;
  onClick: (tab: TabId) => void;
}) {
  return (
    <button
      className={`px-4 py-2 text-xs font-mono tracking-wider transition-colors ${
        isActive
          ? "border-b-2 text-[var(--accent)]"
          : "text-hacker-text-dim hover:text-hacker-text"
      }`}
      style={
        isActive
          ? { borderBottomColor: "var(--accent)" }
          : undefined
      }
      onClick={() => onClick(tabId)}
    >
      {label.toUpperCase()}
    </button>
  );
}
