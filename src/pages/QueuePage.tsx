import { useEffect, useState } from "react";
import { BatchQueue } from "../components/features/BatchQueue";
import { QualityPicker } from "../components/features/QualityPicker";
import { HackerButton } from "../components/shared/HackerButton";
import { useI18n } from "../hooks/useI18n";
import { useQueue } from "../hooks/useQueue";
import type { QualityPreset, QueueItemStatus } from "../lib/types";
import { useAppStore } from "../stores/app-store";

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
  const { t } = useI18n();

  return (
    <div className="flex gap-4 font-mono text-xs">
      <span className="text-hacker-text-dim">
        {t("queue.total")}<span className="text-hacker-text">{total}</span>
      </span>
      <span className="text-hacker-text-dim">
        {t("queue.active")}<span className="text-[var(--accent)]">{downloading}</span>
      </span>
      <span className="text-hacker-text-dim">
        {t("queue.pending")}<span className="text-hacker-text">{pending}</span>
      </span>
      <span className="text-hacker-text-dim">
        {t("queue.done")}<span className="text-[var(--accent)]">{done}</span>
      </span>
      {errors > 0 && (
        <span className="text-hacker-text-dim">
          {t("queue.errors")}<span className="text-hacker-red">{errors}</span>
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
  const { t } = useI18n();
  const activeTab = useAppStore((state) => state.activeTab);
  const consumeQueueUrls = useAppStore((state) => state.consumeQueueUrls);

  // Pick up playlist URLs sent from DownloadPage
  useEffect(() => {
    if (activeTab !== "queue") return;
    const pending = consumeQueueUrls();
    if (pending) {
      setQuality(pending.quality);
      queue.addUrls(pending.urls, pending.quality);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addUrls is stable via useCallback, consumeQueueUrls clears state on read (no loop)
  }, [activeTab]);

  function handleAddToQueue() {
    const lines = urlText.split("\n");
    const validUrls = lines
      .map((line) => line.trim())
      .filter((line) => {
        try {
          const url = new URL(line);
          return (
            (url.protocol === "https:" || url.protocol === "http:") &&
            !line.includes("playlist?list=")
          );
        } catch {
          return false;
        }
      });

    if (validUrls.length === 0) return;

    queue.addUrls(validUrls, quality);
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
          placeholder={t("queue.urlsPlaceholder")}
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
            {t("queue.addToQueue")}
          </HackerButton>
          {total > 0 && (
            <HackerButton variant="danger" onClick={queue.clearQueue}>
              {t("queue.clear")}
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
