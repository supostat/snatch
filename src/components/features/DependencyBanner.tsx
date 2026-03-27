import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/bindings";
import type { BinaryDownloadProgress } from "../../lib/types";
import { useI18n } from "../../hooks/useI18n";
import { useAppStore } from "../../stores/app-store";
import { HackerButton } from "../shared/HackerButton";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProgressLine({ progress }: { progress: BinaryDownloadProgress }) {
  const { t } = useI18n();
  const filled = Math.floor(progress.percent / 5);
  const empty = 20 - filled;
  const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);

  const sizeText = progress.totalBytes
    ? `${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}`
    : formatBytes(progress.downloadedBytes);

  const stageLabel = t(`deps.stage.${progress.stage}`);

  return (
    <div className="text-[var(--accent)] font-mono text-xs">
      {">"} [{progress.binary}] {bar} {progress.percent.toFixed(0)}% {sizeText} — {stageLabel}
    </div>
  );
}

export function DependencyBanner() {
  const { t } = useI18n();
  const isYtdlpAvailable = useAppStore((state) => state.isYtdlpAvailable);
  const isFfmpegAvailable = useAppStore((state) => state.isFfmpegAvailable);
  const isBinaryDownloading = useAppStore((state) => state.isBinaryDownloading);
  const setBinaryDownloading = useAppStore((state) => state.setBinaryDownloading);
  const setYtdlpAvailable = useAppStore((state) => state.setYtdlpAvailable);
  const setYtdlpVersion = useAppStore((state) => state.setYtdlpVersion);
  const setFfmpegAvailable = useAppStore((state) => state.setFfmpegAvailable);
  const [progress, setProgress] = useState<BinaryDownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isBinaryDownloading) return;

    let unlisten: (() => void) | undefined;
    api.app.onBinaryDownloadProgress((p) => setProgress(p)).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, [isBinaryDownloading]);

  const handleInstall = useCallback(async () => {
    setError(null);
    setBinaryDownloading(true);
    try {
      const status = await api.app.downloadBinaries();
      setYtdlpAvailable(status.ytdlpAvailable);
      setYtdlpVersion(status.ytdlpVersion);
      setFfmpegAvailable(status.ffmpegAvailable);
    } catch (err) {
      setError(String(err));
    } finally {
      setBinaryDownloading(false);
      setProgress(null);
    }
  }, [setBinaryDownloading, setYtdlpAvailable, setYtdlpVersion, setFfmpegAvailable]);

  if (isYtdlpAvailable && isFfmpegAvailable) return null;

  const missingLabel = !isYtdlpAvailable && !isFfmpegAvailable
    ? t("deps.bothMissing")
    : !isYtdlpAvailable
      ? t("deps.ytdlpMissing")
      : t("deps.ffmpegMissing");

  return (
    <div className="border border-hacker-amber bg-hacker-surface p-4 font-mono text-xs space-y-3">
      <div className="text-hacker-amber font-bold">{missingLabel}</div>
      <div className="text-hacker-text-dim">{t("deps.installHint")}</div>

      {isBinaryDownloading && progress && <ProgressLine progress={progress} />}

      {error && (
        <div className="text-hacker-red">{t("deps.installFailed")}: {error}</div>
      )}

      {!isBinaryDownloading && (
        <HackerButton onClick={handleInstall} variant="primary">
          {t("deps.installButton")}
        </HackerButton>
      )}
    </div>
  );
}
