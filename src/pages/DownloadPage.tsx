import { useCallback, useState } from "react";
import { DownloadButton } from "../components/features/DownloadButton";
import { QualityPicker } from "../components/features/QualityPicker";
import { UrlInput } from "../components/features/UrlInput";
import { VideoPreview } from "../components/features/VideoPreview";
import { RetroProgress } from "../components/shared/RetroProgress";
import { TermLog } from "../components/shared/TermLog";
import { useClipboard } from "../hooks/useClipboard";
import { useDownload } from "../hooks/useDownload";
import { useTermLog } from "../hooks/useTermLog";
import type { QualityPreset } from "../lib/types";

export function DownloadPage() {
  const [url, setUrl] = useState("");
  const [clipboardUrl, setClipboardUrl] = useState<string | undefined>();
  const [quality, setQuality] = useState<QualityPreset>("best");
  const { lines, addLine, clear: clearLog } = useTermLog();
  const download = useDownload();

  const handleClipboardUrl = useCallback((newUrl: string) => {
    setClipboardUrl(newUrl);
  }, []);

  useClipboard(handleClipboardUrl);

  async function handleFetch(inputUrl: string) {
    setUrl(inputUrl);
    clearLog();
    addLine(`Fetching info for: ${inputUrl}`);
    const result = await download.fetchInfo(inputUrl);
    if (result.error) {
      addLine(`Error: ${result.error}`);
    }
  }

  async function handleStartDownload() {
    if (!url) return;
    addLine(`Starting download: ${quality}`);
    await download.startDownload(url, quality);
  }

  async function handleCancel() {
    addLine("Cancelling download...");
    await download.cancel();
  }


  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      <UrlInput
        onFetch={handleFetch}
        isLoading={download.isLoadingInfo}
        disabled={download.isDownloading}
        externalUrl={clipboardUrl}
      />

      {download.error && !download.isLoadingInfo && (
        <div className="border border-hacker-red bg-hacker-surface p-3 font-mono text-xs text-hacker-red">
          {">"} ERROR: {download.error}
        </div>
      )}

      {download.videoInfo && <VideoPreview videoInfo={download.videoInfo} />}

      {download.videoInfo && (
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

      {download.result?.success && (
        <div className="border border-[var(--accent)] bg-hacker-surface p-3 font-mono text-xs text-[var(--accent)]">
          {">"} Download complete: {download.result.filePath}
        </div>
      )}

      <TermLog lines={lines} maxHeight="180px" />
    </div>
  );
}
