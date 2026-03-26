import { useState } from "react";
import { BatchQueue } from "../components/features/BatchQueue";
import { QualityPicker } from "../components/features/QualityPicker";
import { HackerButton } from "../components/shared/HackerButton";
import { useQueue } from "../hooks/useQueue";
import type { QualityPreset, QueueItemStatus } from "../lib/types";

function QueueStats({
  total,
  downloading,
  pending,
  done,
  errors,
}: {
  total: number;
  downloading: number;
  pending: number;
  done: number;
  errors: number;
}) {
  return (
    <div className="flex gap-4 font-mono text-xs">
      <span className="text-hacker-text-dim">
        TOTAL: <span className="text-hacker-text">{total}</span>
      </span>
      <span className="text-hacker-text-dim">
        ACTIVE: <span className="text-[var(--accent)]">{downloading}</span>
      </span>
      <span className="text-hacker-text-dim">
        PENDING: <span className="text-hacker-text">{pending}</span>
      </span>
      <span className="text-hacker-text-dim">
        DONE: <span className="text-[var(--accent)]">{done}</span>
      </span>
      {errors > 0 && (
        <span className="text-hacker-text-dim">
          ERRORS: <span className="text-hacker-red">{errors}</span>
        </span>
      )}
    </div>
  );
}

function countByStatus(items: { status: QueueItemStatus }[], status: QueueItemStatus): number {
  return items.filter((item) => item.status === status).length;
}

export function QueuePage() {
  const [urlText, setUrlText] = useState("");
  const [quality, setQuality] = useState<QualityPreset>("best");
  const queue = useQueue();

  function handleAddToQueue() {
    const urls = urlText.split("\n");
    queue.addUrls(urls, quality);
    setUrlText("");
  }

  const total = queue.items.length;
  const downloading = countByStatus(queue.items, "fetching") + countByStatus(queue.items, "downloading");
  const pending = countByStatus(queue.items, "pending");
  const done = countByStatus(queue.items, "done");
  const errors = countByStatus(queue.items, "error");

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <div className="flex flex-col gap-2">
        <textarea
          value={urlText}
          onChange={(event) => setUrlText(event.target.value)}
          placeholder="Paste URLs here, one per line..."
          rows={4}
          className="w-full resize-none bg-hacker-bg border border-hacker-border p-3
            font-mono text-sm text-[var(--accent)] placeholder:text-hacker-text-dim
            outline-none focus:border-[var(--accent)] focus:shadow-[0_0_8px_var(--accent-glow)]
            transition-all duration-200"
        />
        <div className="flex items-center gap-4">
          <QualityPicker value={quality} onChange={setQuality} />
          <HackerButton
            onClick={handleAddToQueue}
            disabled={urlText.trim().length === 0}
          >
            Add to Queue
          </HackerButton>
          {total > 0 && (
            <HackerButton variant="danger" onClick={queue.clearQueue}>
              Clear
            </HackerButton>
          )}
        </div>
      </div>

      {total > 0 && (
        <QueueStats
          total={total}
          downloading={downloading}
          pending={pending}
          done={done}
          errors={errors}
        />
      )}

      <BatchQueue
        items={queue.items}
        onCancel={queue.cancelItem}
        onRetry={queue.retryItem}
        onRemove={queue.removeItem}
      />
    </div>
  );
}
