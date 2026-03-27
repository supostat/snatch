import { useEffect, useState } from "react";
import { api } from "../../lib/bindings";
import { useI18n } from "../../hooks/useI18n";
import { useAppStore } from "../../stores/app-store";

export function StatusBar() {
  const [version, setVersion] = useState<string>("...");
  const downloadActive = useAppStore((state) => state.downloadActive);
  const { t } = useI18n();

  useEffect(() => {
    api.app.getVersion().then(setVersion).catch(() => setVersion("unknown"));
  }, []);

  return (
    <footer className="flex h-6 items-center justify-between border-t border-hacker-border px-4 text-xs text-hacker-text-dim">
      <span>SNATCH v{version}</span>
      {downloadActive && (
        <span style={{ color: "var(--accent-dim)" }}>
          &#x25CF; {t("common.downloading")}
        </span>
      )}
    </footer>
  );
}
