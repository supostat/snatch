import type { ProgressStage } from "../../hooks/useDownload";

const TOTAL_BLOCKS = 30;

function ProgressBar({ stage }: { stage: ProgressStage }) {
  const clampedPercent = Math.min(100, Math.max(0, stage.percent));
  const filled = Math.round((clampedPercent / 100) * TOTAL_BLOCKS);
  const empty = TOTAL_BLOCKS - filled;

  const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
  const percentStr = clampedPercent.toFixed(1).padStart(5);

  return (
    <div className="font-mono text-xs space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-hacker-text-dim text-[10px] w-20 shrink-0 truncate">
          {stage.label}
        </span>
        <span className="text-hacker-text-dim">{"["}</span>
        <span className={stage.completed ? "text-[var(--accent-dim)]" : "text-[var(--accent)]"}>
          {bar}
        </span>
        <span className="text-hacker-text-dim">{"]"}</span>
        <span className={`font-bold ${stage.completed ? "text-[var(--accent-dim)]" : "text-[var(--accent)]"}`}>
          {percentStr}%
        </span>
        {!stage.completed && stage.speed && (
          <span className="text-hacker-text-dim">{stage.speed}</span>
        )}
        {!stage.completed && stage.eta && (
          <span className="text-hacker-text-dim">ETA {stage.eta}</span>
        )}
        {stage.completed && (
          <span className="text-[var(--accent-dim)]">{"\u2713"}</span>
        )}
      </div>
    </div>
  );
}

export function MultiProgress({ stages }: { stages: ProgressStage[] }) {
  if (stages.length === 0) return null;

  return (
    <div className="space-y-1">
      {stages.map((stage, index) => (
        <ProgressBar key={`${stage.label}-${index}`} stage={stage} />
      ))}
    </div>
  );
}
