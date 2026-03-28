import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/bindings";
import type {
  CookiesBrowser,
  DownloadProgress,
  DownloadResult,
  HistoryEntry,
  QualityPreset,
  VideoInfo,
} from "../lib/types";
import { useAppStore } from "../stores/app-store";

export interface ProgressStage {
  label: string;
  percent: number;
  speed: string | null;
  eta: string | null;
  completed: boolean;
}

interface UseDownloadReturn {
  videoInfo: VideoInfo | null;
  progressStages: ProgressStage[];
  result: DownloadResult | null;
  error: string | null;
  isLoadingInfo: boolean;
  isDownloading: boolean;
  downloadId: string | null;

  fetchInfo: (url: string) => Promise<{ info: VideoInfo | null; error: string | null }>;
  startDownload: (url: string, quality: QualityPreset) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

function buildStageLabel(event: DownloadProgress): string {
  if (event.stage === "merging") return "Merge";
  if (event.stage === "converting") return "Convert";
  if (event.stage === "done") return "Done";
  return event.pass ?? "Download";
}

export function useDownload(): UseDownloadReturn {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);

  const downloadIdRef = useRef<string | null>(null);
  const videoInfoRef = useRef<VideoInfo | null>(null);
  const lastLabelRef = useRef<string>("");
  const settings = useAppStore((state) => state.settings);
  const setDownloadActive = useAppStore((state) => state.setDownloadActive);

  useEffect(() => {
    const unlistenPromise = api.yt.onProgress((event) => {
      if (!downloadIdRef.current || event.downloadId !== downloadIdRef.current) return;

      const label = buildStageLabel(event);
      const isNewStage = label !== lastLabelRef.current;

      setProgressStages((previous) => {
        if (isNewStage && lastLabelRef.current !== "") {
          // Mark previous stage as completed, add new current
          const completed = previous.map((stage) =>
            stage.completed ? stage : { ...stage, percent: 100, speed: null, eta: null, completed: true },
          );
          lastLabelRef.current = label;
          return [
            ...completed,
            { label, percent: event.percent, speed: event.speed, eta: event.eta, completed: event.stage === "done" },
          ];
        }

        if (lastLabelRef.current === "") {
          lastLabelRef.current = label;
        }

        // Update current (last) stage
        if (previous.length === 0) {
          return [{ label, percent: event.percent, speed: event.speed, eta: event.eta, completed: event.stage === "done" }];
        }

        const updated = [...previous];
        updated[updated.length - 1] = {
          label,
          percent: event.percent,
          speed: event.speed,
          eta: event.eta,
          completed: event.stage === "done",
        };
        return updated;
      });
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const fetchInfo = useCallback(
    async (url: string): Promise<{ info: VideoInfo | null; error: string | null }> => {
      setError(null);
      setVideoInfo(null);
      setResult(null);
      setProgressStages([]);
      lastLabelRef.current = "";
      setIsLoadingInfo(true);

      try {
        const cookiesBrowser: CookiesBrowser =
          settings?.cookiesBrowser ?? "none";
        const info = await api.yt.getInfo(url, cookiesBrowser);
        setVideoInfo(info);
        videoInfoRef.current = info;
        return { info, error: null };
      } catch (fetchError) {
        const errorMessage = String(fetchError);
        setError(errorMessage);
        return { info: null, error: errorMessage };
      } finally {
        setIsLoadingInfo(false);
      }
    },
    [settings],
  );

  const startDownload = useCallback(
    async (url: string, quality: QualityPreset) => {
      setError(null);
      setResult(null);
      setProgressStages([]);
      lastLabelRef.current = "";
      setIsDownloading(true);
      setDownloadActive(true);

      const newDownloadId = crypto.randomUUID();
      setDownloadId(newDownloadId);
      downloadIdRef.current = newDownloadId;

      try {
        const downloadResult = await api.yt.download({
          downloadId: newDownloadId,
          url,
          quality,
          outputDir: settings?.downloadDir ?? "",
          embedThumbnail: settings?.embedThumbnail ?? true,
          embedMetadata: settings?.embedMetadata ?? true,
          cookiesBrowser: settings?.cookiesBrowser ?? "none",
        });

        setResult(downloadResult);

        if (downloadResult.success && videoInfoRef.current) {
          const videoInfo = videoInfoRef.current;
          const historyEntry: HistoryEntry = {
            id: newDownloadId,
            title: videoInfo.title,
            url,
            filePath: downloadResult.filePath ?? "",
            quality,
            fileSize: downloadResult.fileSize,
            duration: videoInfo.duration,
            channel: videoInfo.channel,
            downloadedAt: new Date().toISOString(),
            thumbnail: videoInfo.thumbnail,
          };
          api.history.add(historyEntry).catch(() => {});
        }

        if (!downloadResult.success && downloadResult.error) {
          setError(downloadResult.error);
        }
      } catch (downloadError) {
        setError(String(downloadError));
      } finally {
        setIsDownloading(false);
        setDownloadActive(false);
        downloadIdRef.current = null;
      }
    },
    [settings, setDownloadActive],
  );

  const cancel = useCallback(async () => {
    if (downloadIdRef.current) {
      try {
        await api.yt.cancel(downloadIdRef.current);
      } catch (cancelError) {
        setError(String(cancelError));
      }
    }
  }, []);

  const reset = useCallback(() => {
    setVideoInfo(null);
    videoInfoRef.current = null;
    setProgressStages([]);
    lastLabelRef.current = "";
    setResult(null);
    setError(null);
    setIsLoadingInfo(false);
    setIsDownloading(false);
    setDownloadId(null);
    downloadIdRef.current = null;
  }, []);

  return {
    videoInfo,
    progressStages,
    result,
    error,
    isLoadingInfo,
    isDownloading,
    downloadId,
    fetchInfo,
    startDownload,
    cancel,
    reset,
  };
}
