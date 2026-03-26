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

interface UseDownloadReturn {
  videoInfo: VideoInfo | null;
  progress: DownloadProgress | null;
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

export function useDownload(): UseDownloadReturn {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);

  const downloadIdRef = useRef<string | null>(null);
  const videoInfoRef = useRef<VideoInfo | null>(null);
  const settings = useAppStore((state) => state.settings);
  const setDownloadActive = useAppStore((state) => state.setDownloadActive);

  useEffect(() => {
    const unlistenPromise = api.yt.onProgress((progressEvent) => {
      if (
        downloadIdRef.current &&
        progressEvent.downloadId === downloadIdRef.current
      ) {
        setProgress(progressEvent);
      }
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
      setProgress(null);
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
      setProgress(null);
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
    setProgress(null);
    setResult(null);
    setError(null);
    setIsLoadingInfo(false);
    setIsDownloading(false);
    setDownloadId(null);
    downloadIdRef.current = null;
  }, []);

  return {
    videoInfo,
    progress,
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
