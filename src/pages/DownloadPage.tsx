import { useCallback, useState } from "react";
import { DownloadButton } from "../components/features/DownloadButton";
import { QualityPicker } from "../components/features/QualityPicker";
import { UrlInput } from "../components/features/UrlInput";
import { VideoPlayer } from "../components/features/VideoPlayer";
import { VideoPreview } from "../components/features/VideoPreview";
import { RetroProgress } from "../components/shared/RetroProgress";
import { TermLog } from "../components/shared/TermLog";
import { useClipboard } from "../hooks/useClipboard";
import { useDownload } from "../hooks/useDownload";
import { useI18n } from "../hooks/useI18n";
import { useTermLog } from "../hooks/useTermLog";
import { useAppStore } from "../stores/app-store";
import { getQualityPresets } from "../lib/constants";
import type { QualityPreset } from "../lib/types";

export function DownloadPage() {
  const [url, setUrl] = useState("");
  const [clipboardUrl, setClipboardUrl] = useState<string | undefined>();
  const [quality, setQuality] = useState<QualityPreset>("best");
  const { lines, addLine, clear: clearLog } = useTermLog();
  const download = useDownload();
  const { t } = useI18n();
  const isYtdlpAvailable = useAppStore((state) => state.isYtdlpAvailable);

  const handleClipboardUrl = useCallback((newUrl: string) => {
    setClipboardUrl(newUrl);
  }, []);

  useClipboard(handleClipboardUrl);

  async function handleFetch(inputUrl: string) {
    setUrl(inputUrl);
    clearLog();
    addLine(`${t("download.fetchingInfo")}${inputUrl}`);
    const result = await download.fetchInfo(inputUrl);
    if (result.error) {
      addLine(`${t("download.errorPrefix")}${result.error}`);
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


  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {!isYtdlpAvailable && (
        <div className="border border-hacker-amber bg-hacker-amber/5 p-4 font-mono text-xs space-y-2">
          <div className="text-hacker-amber font-bold">{t("deps.ytdlpMissing")}</div>
          <div className="text-hacker-text-dim">{t("deps.ytdlpInstallHint")}</div>
          <code className="block text-[var(--accent)] bg-hacker-bg px-3 py-2 border border-hacker-border">
            brew install yt-dlp
          </code>
        </div>
      )}

      <UrlInput
        onFetch={handleFetch}
        isLoading={download.isLoadingInfo}
        disabled={download.isDownloading || !isYtdlpAvailable}
        externalUrl={clipboardUrl}
      />

      {download.error && !download.isLoadingInfo && (
        <div className="border border-hacker-red bg-hacker-surface p-3 font-mono text-xs text-hacker-red">
          {">"} {t("download.downloadError")}{download.error}
        </div>
      )}

      {download.videoInfo && <VideoPreview videoInfo={download.videoInfo} />}

      {download.videoInfo && !download.result?.success && (
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
            disabled={!download.videoInfo}
          />
        </div>
      )}

      {download.isDownloading && download.progress && (
        <RetroProgress
          percent={download.progress.percent}
          speed={download.progress.speed}
          eta={download.progress.eta}
          stage={download.progress.stage}
        />
      )}

      {download.result?.success && download.result.filePath && (
        <VideoPlayer filePath={download.result.filePath} />
      )}

      {!download.result?.success && (
        <TermLog lines={lines} maxHeight="180px" />
      )}
    </div>
  );
}
