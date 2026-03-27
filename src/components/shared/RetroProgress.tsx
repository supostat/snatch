import { useI18n } from "../../hooks/useI18n";
import type { DownloadStage } from "../../lib/types";

interface RetroProgressProps {
  percent: number;
  speed: string | null;
  eta: string | null;
  stage: DownloadStage;
}

const TOTAL_BLOCKS = 30;

const STAGE_KEYS: Record<DownloadStage, string> = {
  downloading: "progress.downloading",
  merging: "progress.merging",
  converting: "progress.converting",
  done: "progress.done",
  error: "progress.error",
};

export function RetroProgress({
  percent,
  speed,
  eta,
  stage,
}: RetroProgressProps) {
  const { t } = useI18n();
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const filled = Math.round((clampedPercent / 100) * TOTAL_BLOCKS);
  const empty = TOTAL_BLOCKS - filled;

  const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
  const percentStr = clampedPercent.toFixed(1).padStart(5);

  return (
    <div className="font-mono text-sm space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-hacker-text-dim">{"["}</span>
        <span className="text-[var(--accent)]">{bar}</span>
        <span className="text-hacker-text-dim">{"]"}</span>
        <span className="text-[var(--accent)] font-bold">{percentStr}%</span>
      </div>
      <div className="flex gap-4 text-xs text-hacker-text-dim">
        <span>{t(STAGE_KEYS[stage])}</span>
        {speed && <span>{speed}</span>}
        {eta && <span>{t("progress.eta")}{eta}</span>}
      </div>
    </div>
  );
}
