import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/bindings";
import type {
  CookiesBrowser,
  DownloadProgress,
  QualityPreset,
  QueueItem,
  QueueItemStatus,
} from "../lib/types";
import { useAppStore } from "../stores/app-store";

interface UseQueueReturn {
  items: QueueItem[];
  addUrls: (urls: string[], quality: QualityPreset) => void;
  removeItem: (id: string) => void;
  cancelItem: (id: string) => void;
  clearQueue: () => void;
  retryItem: (id: string) => void;
}

type ItemsRef = React.RefObject<QueueItem[]>;

function isActive(status: QueueItemStatus): boolean {
  return status === "fetching" || status === "downloading";
}

function countActive(items: QueueItem[]): number {
  return items.filter((item) => isActive(item.status)).length;
}

function updateItem(
  items: QueueItem[],
  id: string,
  patch: Partial<QueueItem>,
): QueueItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, ...patch } : item,
  );
}

async function processItem(
  itemId: string,
  itemsRef: ItemsRef,
  setItems: React.Dispatch<React.SetStateAction<QueueItem[]>>,
  downloadIdMap: React.RefObject<Map<string, string>>,
  settings: { downloadDir: string; embedThumbnail: boolean; embedMetadata: boolean; cookiesBrowser: CookiesBrowser },
  advanceQueue: () => void,
): Promise<void> {
  const item = itemsRef.current.find((queued) => queued.id === itemId);
  if (!item || item.status !== "pending") return;

  setItems((previous) => updateItem(previous, itemId, { status: "fetching", error: null }));

  try {
    const videoInfo = await api.yt.getInfo(item.url, settings.cookiesBrowser);
    setItems((previous) => updateItem(previous, itemId, { videoInfo, status: "downloading" }));

    const downloadId = crypto.randomUUID();
    downloadIdMap.current.set(downloadId, itemId);

    const result = await api.yt.download({
      downloadId,
      url: item.url,
      quality: item.quality,
      outputDir: settings.downloadDir,
      embedThumbnail: settings.embedThumbnail,
      embedMetadata: settings.embedMetadata,
      cookiesBrowser: settings.cookiesBrowser,
    });

    downloadIdMap.current.delete(downloadId);

    if (result.success) {
      setItems((previous) => updateItem(previous, itemId, { status: "done" }));

      if (videoInfo) {
        api.history.add({
          id: downloadId,
          title: videoInfo.title,
          url: item.url,
          filePath: result.filePath ?? "",
          quality: item.quality,
          fileSize: result.fileSize,
          duration: videoInfo.duration,
          channel: videoInfo.channel,
          downloadedAt: new Date().toISOString(),
          thumbnail: videoInfo.thumbnail,
        }).catch(() => {});
      }
    } else {
      setItems((previous) =>
        updateItem(previous, itemId, {
          status: "error",
          error: result.error ?? "Download failed",
        }),
      );
    }
  } catch (processingError) {
    const currentItem = itemsRef.current.find((queued) => queued.id === itemId);
    if (currentItem?.status === "cancelled") return;

    setItems((previous) =>
      updateItem(previous, itemId, {
        status: "error",
        error: String(processingError),
      }),
    );
  } finally {
    advanceQueue();
  }
}

export function useQueue(): UseQueueReturn {
  const [items, setItems] = useState<QueueItem[]>([]);
  const itemsRef = useRef<QueueItem[]>([]);
  const downloadIdMap = useRef<Map<string, string>>(new Map());
  const settings = useAppStore((state) => state.settings);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const maxConcurrent = settings?.maxConcurrent ?? 3;

  const advanceQueue = useCallback(() => {
    const currentItems = itemsRef.current;
    const activeCount = countActive(currentItems);
    const slotsAvailable = maxConcurrent - activeCount;

    if (slotsAvailable <= 0) return;

    const pendingItems = currentItems.filter((item) => item.status === "pending");
    const toStart = pendingItems.slice(0, slotsAvailable);

    if (toStart.length === 0) return;

    for (const item of toStart) {
      const resolvedSettings = {
        downloadDir: settings?.downloadDir ?? "",
        embedThumbnail: settings?.embedThumbnail ?? true,
        embedMetadata: settings?.embedMetadata ?? true,
        cookiesBrowser: settings?.cookiesBrowser ?? "none" as CookiesBrowser,
      };
      processItem(item.id, itemsRef, setItems, downloadIdMap, resolvedSettings, advanceQueue);
    }
  }, [maxConcurrent, settings]);

  const lastLabelsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const unlistenPromise = api.yt.onProgress((progressEvent: DownloadProgress) => {
      const queueItemId = downloadIdMap.current.get(progressEvent.downloadId);
      if (!queueItemId) return;

      setItems((previous) => {
        const item = previous.find((queued) => queued.id === queueItemId);
        if (!item) return previous;

        const label = progressEvent.stage === "merging" ? "Merge"
          : progressEvent.stage === "converting" ? "Convert"
          : progressEvent.stage === "done" ? "Done"
          : progressEvent.pass ?? "Download";

        const lastLabel = lastLabelsRef.current.get(queueItemId) ?? "";
        const isNewStage = label !== lastLabel && lastLabel !== "";

        let stages = [...item.progressStages];

        if (isNewStage) {
          stages = stages.map((s) =>
            s.completed ? s : { ...s, percent: 100, speed: null, eta: null, completed: true },
          );
          stages.push({
            label,
            percent: progressEvent.percent,
            speed: progressEvent.speed,
            eta: progressEvent.eta,
            completed: progressEvent.stage === "done",
          });
        } else if (stages.length === 0) {
          stages.push({
            label,
            percent: progressEvent.percent,
            speed: progressEvent.speed,
            eta: progressEvent.eta,
            completed: progressEvent.stage === "done",
          });
        } else {
          stages[stages.length - 1] = {
            label,
            percent: progressEvent.percent,
            speed: progressEvent.speed,
            eta: progressEvent.eta,
            completed: progressEvent.stage === "done",
          };
        }

        if (lastLabel === "" || isNewStage) {
          lastLabelsRef.current.set(queueItemId, label);
        }

        return updateItem(previous, queueItemId, { progress: progressEvent, progressStages: stages });
      });
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const addUrls = useCallback(
    (urls: string[], quality: QualityPreset) => {
      const newItems: QueueItem[] = urls
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((url) => ({
          id: crypto.randomUUID(),
          url,
          status: "pending" as const,
          videoInfo: null,
          progress: null,
          progressStages: [],
          error: null,
          quality,
        }));

      if (newItems.length === 0) return;

      const merged = [...itemsRef.current, ...newItems];
      itemsRef.current = merged;
      setItems(merged);

      const activeCount = countActive(merged);
      const slotsAvailable = maxConcurrent - activeCount;
      const pendingToStart = newItems.slice(0, Math.max(0, slotsAvailable));

      for (const item of pendingToStart) {
        const resolvedSettings = {
          downloadDir: settings?.downloadDir ?? "",
          embedThumbnail: settings?.embedThumbnail ?? true,
          embedMetadata: settings?.embedMetadata ?? true,
          cookiesBrowser: settings?.cookiesBrowser ?? "none" as CookiesBrowser,
        };
        processItem(item.id, itemsRef, setItems, downloadIdMap, resolvedSettings, advanceQueue);
      }
    },
    [maxConcurrent, settings, advanceQueue],
  );

  const removeItem = useCallback((id: string) => {
    const item = itemsRef.current.find((queued) => queued.id === id);
    if (item && isActive(item.status)) {
      for (const [downloadId, queueItemId] of downloadIdMap.current) {
        if (queueItemId === id) {
          api.yt.cancel(downloadId).catch(() => {});
          downloadIdMap.current.delete(downloadId);
          break;
        }
      }
    }
    setItems((previous) => previous.filter((queued) => queued.id !== id));
  }, []);

  const cancelItem = useCallback((id: string) => {
    for (const [downloadId, queueItemId] of downloadIdMap.current) {
      if (queueItemId === id) {
        api.yt.cancel(downloadId).catch(() => {});
        downloadIdMap.current.delete(downloadId);
        break;
      }
    }
    setItems((previous) => updateItem(previous, id, { status: "cancelled", progress: null }));
  }, []);

  const clearQueue = useCallback(() => {
    for (const item of itemsRef.current) {
      if (isActive(item.status)) {
        for (const [downloadId, queueItemId] of downloadIdMap.current) {
          if (queueItemId === item.id) {
            api.yt.cancel(downloadId).catch(() => {});
            break;
          }
        }
      }
    }
    downloadIdMap.current.clear();
    setItems([]);
  }, []);

  const retryItem = useCallback(
    (id: string) => {
      setItems((previous) =>
        updateItem(previous, id, { status: "pending", error: null, progress: null }),
      );

      const resolvedSettings = {
        downloadDir: settings?.downloadDir ?? "",
        embedThumbnail: settings?.embedThumbnail ?? true,
        embedMetadata: settings?.embedMetadata ?? true,
        cookiesBrowser: settings?.cookiesBrowser ?? "none" as CookiesBrowser,
      };

      const activeCount = countActive(itemsRef.current);
      if (activeCount < maxConcurrent) {
        processItem(id, itemsRef, setItems, downloadIdMap, resolvedSettings, advanceQueue);
      }
    },
    [settings, maxConcurrent, advanceQueue],
  );

  return { items, addUrls, removeItem, cancelItem, clearQueue, retryItem };
}
