import type { QueueItem, QueueItemStatus } from "../../lib/types";
import { HackerButton } from "../shared/HackerButton";
import { RetroProgress } from "../shared/RetroProgress";

interface BatchQueueProps {
  items: QueueItem[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

const STATUS_ICON: Record<QueueItemStatus, string> = {
  pending: "\u25CB",
  fetching: "\u25D4",
  downloading: "\u25BC",
  done: "\u2713",
  error: "\u2717",
  cancelled: "\u2500",
};

const STATUS_COLOR: Record<QueueItemStatus, string> = {
  pending: "text-hacker-text-dim",
  fetching: "text-[var(--accent)]",
  downloading: "text-[var(--accent)]",
  done: "text-[var(--accent)]",
  error: "text-hacker-red",
  cancelled: "text-hacker-text-dim",
};

function isActive(status: QueueItemStatus): boolean {
  return status === "fetching" || status === "downloading";
}

function QueueItemRow({
  item,
  onCancel,
  onRetry,
  onRemove,
}: {
  item: QueueItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const title = item.videoInfo?.title ?? item.url;
  const showProgress = item.status === "downloading" && item.progress;

  return (
    <div className="border border-hacker-border bg-hacker-surface p-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className={`font-mono text-sm ${STATUS_COLOR[item.status]}`}>
          {STATUS_ICON[item.status]}
        </span>

        <span className="flex-1 truncate font-mono text-xs text-hacker-text" title={title}>
          {title}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {isActive(item.status) && (
            <HackerButton variant="danger" onClick={() => onCancel(item.id)}>
              Cancel
            </HackerButton>
          )}
          {item.status === "error" && (
            <HackerButton variant="ghost" onClick={() => onRetry(item.id)}>
              Retry
            </HackerButton>
          )}
          {!isActive(item.status) && (
            <HackerButton variant="ghost" onClick={() => onRemove(item.id)}>
              Remove
            </HackerButton>
          )}
        </div>
      </div>

      {showProgress && item.progress && (
        <RetroProgress
          percent={item.progress.percent}
          speed={item.progress.speed}
          eta={item.progress.eta}
          stage={item.progress.stage}
        />
      )}

      {item.status === "error" && item.error && (
        <div className="font-mono text-xs text-hacker-red truncate" title={item.error}>
          {">"} {item.error}
        </div>
      )}
    </div>
  );
}

export function BatchQueue({ items, onCancel, onRetry, onRemove }: BatchQueueProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="font-mono text-xs text-hacker-text-dim">[ Queue empty ]</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <QueueItemRow
          key={item.id}
          item={item}
          onCancel={onCancel}
          onRetry={onRetry}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
