import { useEffect, useState } from "react";
import { api } from "../../lib/bindings";
import { useAppStore } from "../../stores/app-store";

export function StatusBar() {
  const [version, setVersion] = useState<string>("...");
  const downloadActive = useAppStore((state) => state.downloadActive);

  useEffect(() => {
    api.app.getVersion().then(setVersion).catch(() => setVersion("unknown"));
  }, []);

  return (
    <footer className="flex h-6 items-center justify-between border-t border-hacker-border px-4 text-xs text-hacker-text-dim">
      <span>SNATCH v{version}</span>
      {downloadActive && (
        <span style={{ color: "var(--accent-dim)" }}>
          &#x25CF; downloading
        </span>
      )}
    </footer>
  );
}
