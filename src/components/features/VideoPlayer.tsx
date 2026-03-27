import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useI18n } from "../../hooks/useI18n";
import { api } from "../../lib/bindings";
import { HackerButton } from "../shared/HackerButton";

interface VideoPlayerProps {
  filePath: string;
}

export function VideoPlayer({ filePath }: VideoPlayerProps) {
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useI18n();
  const assetUrl = convertFileSrc(filePath);
  const isAudio = /\.(mp3|m4a|opus|ogg|wav|flac|aac)$/i.test(filePath);

  function handleOpenFullscreen() {
    const video = videoRef.current;
    if (video) video.pause();
    setIsFullscreen(true);
  }

  function handleCloseFullscreen(currentTime: number) {
    setIsFullscreen(false);
    const video = videoRef.current;
    if (video) {
      video.currentTime = currentTime;
    }
  }

  if (hasError) {
    return (
      <div className="border border-hacker-border bg-hacker-surface p-4 font-mono text-xs space-y-3">
        <div className="text-hacker-text-dim">{t("player.unsupported")}</div>
        <HackerButton onClick={() => void api.dialog.openPath(filePath)}>
          {t("player.openExternal")}
        </HackerButton>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="border border-hacker-border bg-hacker-surface p-4 space-y-3">
        <audio
          src={assetUrl}
          controls
          onError={() => setHasError(true)}
          className="w-full"
        />
        <PlayerActions filePath={filePath} />
      </div>
    );
  }

  return (
    <>
      <div className="border border-hacker-border bg-hacker-surface space-y-3">
        <video
          ref={videoRef}
          src={assetUrl}
          controls
          onError={() => setHasError(true)}
          className="w-full max-h-[400px] bg-black"
        />
        <div className="px-4 pb-3">
          <PlayerActions
            filePath={filePath}
            onFullscreen={handleOpenFullscreen}
          />
        </div>
      </div>

      {isFullscreen && (
        <VideoFullscreenModal
          assetUrl={assetUrl}
          startTime={videoRef.current?.currentTime ?? 0}
          onClose={handleCloseFullscreen}
        />
      )}
    </>
  );
}

function VideoFullscreenModal({
  assetUrl,
  startTime,
  onClose,
}: {
  assetUrl: string;
  startTime: number;
  onClose: (currentTime: number) => void;
}) {
  const fullscreenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    void api.window.setFullscreen(true);
    return () => { void api.window.setFullscreen(false); };
  }, []);

  const handleClose = useCallback(() => {
    const currentTime = fullscreenVideoRef.current?.currentTime ?? 0;
    onClose(currentTime);
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleClose]);

  // Fallback: poll fullscreen state — if WebKit exits fullscreen via Esc
  // but our listener didn't fire, detect it and close modal
  useEffect(() => {
    const interval = setInterval(() => {
      void api.window.isFullscreen().then((isFs: boolean) => {
        if (!isFs) handleClose();
      });
    }, 500);
    return () => clearInterval(interval);
  }, [handleClose]);

  function handleVideoLoaded() {
    const video = fullscreenVideoRef.current;
    if (video) {
      video.currentTime = startTime;
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      style={{ isolation: "isolate" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 text-white/60 hover:text-white font-mono text-2xl cursor-pointer"
        aria-label="Close"
      >
        &#x2715;
      </button>
      <video
        ref={fullscreenVideoRef}
        src={assetUrl}
        controls
        autoPlay
        onLoadedMetadata={handleVideoLoaded}
        className="w-full h-full object-contain"
      />
    </div>,
    document.body,
  );
}

function PlayerActions({
  filePath,
  onFullscreen,
}: {
  filePath: string;
  onFullscreen?: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex gap-2">
      {onFullscreen && (
        <HackerButton variant="ghost" onClick={onFullscreen}>
          {t("player.fullscreen")}
        </HackerButton>
      )}
      <HackerButton variant="ghost" onClick={() => void api.dialog.openPath(filePath)}>
        {t("player.openExternal")}
      </HackerButton>
      <HackerButton variant="ghost" onClick={() => void api.dialog.showInFolder(filePath)}>
        {t("player.showInFolder")}
      </HackerButton>
    </div>
  );
}
