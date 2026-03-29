import { useEffect } from "react";
import { useI18n } from "../../hooks/useI18n";
import { useUpdater } from "../../hooks/useUpdater";
import { HackerButton } from "../shared/HackerButton";

export function UpdateBanner() {
  const { t } = useI18n();
  const updater = useUpdater();

  useEffect(() => {
    updater.checkForUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- check once on mount
  }, []);

  if (!updater.updateAvailable) return null;

  return (
    <div className="flex items-center justify-between border border-[var(--accent)] bg-[var(--accent)]/5 px-3 py-2 font-mono text-xs">
      <span className="text-[var(--accent)]">
        {t("updater.available")} v{updater.updateAvailable.version}
      </span>
      <div className="flex items-center gap-2">
        {updater.error && (
          <span className="text-hacker-red">{updater.error}</span>
        )}
        <HackerButton
          onClick={updater.installUpdate}
          disabled={updater.isDownloading}
        >
          {updater.isDownloading ? t("updater.installing") : t("updater.install")}
        </HackerButton>
        <button
          onClick={updater.dismissUpdate}
          className="text-hacker-text-dim hover:text-hacker-text cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
