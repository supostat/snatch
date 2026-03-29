import { useCallback, useState } from "react";
import { DependencyBanner } from "../components/features/DependencyBanner";
import { DownloadButton } from "../components/features/DownloadButton";
import { PlaylistView } from "../components/features/PlaylistView";
import { QualityPicker } from "../components/features/QualityPicker";
import { UrlInput } from "../components/features/UrlInput";
import { VideoPlayer } from "../components/features/VideoPlayer";
import { VideoPreview } from "../components/features/VideoPreview";
import { MultiProgress } from "../components/shared/RetroProgress";
import { TermLog } from "../components/shared/TermLog";
import { VideoStatusBadge } from "../components/shared/VideoStatusBadge";
import { useClipboard } from "../hooks/useClipboard";
import { useDownload } from "../hooks/useDownload";
import { useI18n } from "../hooks/useI18n";
import { useTermLog } from "../hooks/useTermLog";
import { useVideoStatus } from "../hooks/useVideoStatus";
import { api } from "../lib/bindings";
import { getQualityPresets } from "../lib/constants";
import type { PlaylistEntry, PlaylistInfo, QualityPreset } from "../lib/types";
import { useAppStore } from "../stores/app-store";

function isPlaylistUrl(url: string): boolean {
  return url.includes("playlist?list=");
}

export function DownloadPage() {
  const [url, setUrl] = useState("");
  const [clipboardUrl, setClipboardUrl] = useState<string | undefined>();
  const [quality, setQuality] = useState<QualityPreset>("best");
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const { lines, addLine, clear: clearLog } = useTermLog();
  const download = useDownload();
  const { t } = useI18n();
  const isYtdlpAvailable = useAppStore((state) => state.isYtdlpAvailable);
  const isFfmpegAvailable = useAppStore((state) => state.isFfmpegAvailable);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const isDepsReady = isYtdlpAvailable && isFfmpegAvailable;
  const settings = useAppStore((state) => state.settings);
  const videoStatus = useVideoStatus(download.videoInfo?.videoId);
  const isAlreadyDownloadedOrActive = videoStatus === "downloaded" || videoStatus === "downloading";

  const handleClipboardUrl = useCallback((newUrl: string) => {
    setClipboardUrl(newUrl);
  }, []);

  useClipboard(handleClipboardUrl);

  async function handleFetch(inputUrl: string) {
    setUrl(inputUrl);
    setPlaylistInfo(null);
    clearLog();

    if (isPlaylistUrl(inputUrl)) {
      setIsLoadingPlaylist(true);
      addLine(`${t("playlist.fetchingPlaylist")}${inputUrl}`);
      try {
        const cookiesBrowser = settings?.cookiesBrowser ?? "none";
        const info = await api.yt.getPlaylistInfo(inputUrl, cookiesBrowser);
        setPlaylistInfo(info);
        clearLog();
      } catch (error) {
        addLine(`${t("download.errorPrefix")}${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsLoadingPlaylist(false);
      }
    } else {
      addLine(`${t("download.fetchingInfo")}${inputUrl}`);
      const result = await download.fetchInfo(inputUrl);
      if (result.error) {
        addLine(`${t("download.errorPrefix")}${result.error}`);
      }
    }
  }

  async function handleStartDownload() {
    if (!url || download.isDownloading) return;
    const qualityLabel = getQualityPresets().find((p) => p.value === quality)?.label ?? quality;
    addLine(`${t("download.startingDownload")}${qualityLabel}`);
    await download.startDownload(url, quality);
  }

  async function handleCancel() {
    addLine(t("download.cancellingDownload"));
    await download.cancel();
  }

  function handleAddPlaylistToQueue(entries: PlaylistEntry[], selectedQuality: QualityPreset) {
    const queueUrls = entries.map((entry) => entry.url);
    const store = useAppStore.getState();
    for (const entry of entries) {
      if (entry.videoId) {
        store.addDownloadingVideoId(entry.videoId);
      }
    }
    store.setQueueUrls(queueUrls, selectedQuality);
    setActiveTab("queue");
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <DependencyBanner />

      <UrlInput
        onFetch={handleFetch}
        isLoading={download.isLoadingInfo || isLoadingPlaylist}
        disabled={download.isDownloading || !isDepsReady}
        externalUrl={clipboardUrl}
      />

      {download.error && !download.isLoadingInfo && !playlistInfo && (
        <div className="border border-hacker-red bg-hacker-surface p-3 font-mono text-xs text-hacker-red">
          {">"} {t("download.downloadError")}{download.error}
        </div>
      )}

      {/* Playlist view */}
      {playlistInfo && !download.isDownloading && (
        <PlaylistView
          playlist={playlistInfo}
          onAddToQueue={handleAddPlaylistToQueue}
          quality={quality}
        />
      )}

      {/* Single video view */}
      {download.videoInfo && !playlistInfo && (
        <div className="flex flex-col gap-1">
          <VideoPreview videoInfo={download.videoInfo} />
          <VideoStatusBadge videoId={download.videoInfo.videoId} />
        </div>
      )}

      {download.videoInfo && !playlistInfo && !download.result?.success && (
        <div className="flex items-center gap-4">
          <QualityPicker
            value={quality}
            onChange={setQuality}
            disabled={download.isDownloading}
          />
          <DownloadButton
            isDownloading={download.isDownloading}
            onStart={handleStartDownload}
            onCancel={handleCancel}
            disabled={!download.videoInfo || isAlreadyDownloadedOrActive}
          />
        </div>
      )}

      {/* Quality picker for playlist */}
      {playlistInfo && !download.isDownloading && (
        <div className="flex items-center gap-4">
          <QualityPicker
            value={quality}
            onChange={setQuality}
            disabled={false}
          />
        </div>
      )}

      {download.isDownloading && download.progressStages.length > 0 && (
        <MultiProgress stages={download.progressStages} />
      )}

      {download.result?.success && download.result.filePath && (
        <VideoPlayer filePath={download.result.filePath} />
      )}

      {!download.result?.success && lines.length > 0 && (
        <TermLog lines={lines} maxHeight="180px" />
      )}
    </div>
  );
}
