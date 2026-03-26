import type { VideoInfo } from "../../lib/types";
import { HackerCard } from "../shared/HackerCard";

interface VideoPreviewProps {
  videoInfo: VideoInfo;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

function formatCount(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toString();
}

export function VideoPreview({ videoInfo }: VideoPreviewProps) {
  return (
    <HackerCard>
      <div className="flex gap-4">
        {videoInfo.thumbnail && (
          <img
            src={videoInfo.thumbnail}
            alt={videoInfo.title}
            className="w-40 h-24 object-cover border border-hacker-border shrink-0"
          />
        )}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="text-[var(--accent)] font-mono text-sm font-bold truncate">
            {videoInfo.title}
          </div>
          <div className="text-hacker-text font-mono text-xs">
            {videoInfo.channel}
          </div>
          <div className="flex gap-4 text-hacker-text-dim font-mono text-xs mt-1">
            <span>{formatDuration(videoInfo.duration)}</span>
            {videoInfo.viewCount !== null && (
              <span>{formatCount(videoInfo.viewCount)} views</span>
            )}
            {videoInfo.uploadDate && <span>{videoInfo.uploadDate}</span>}
          </div>
        </div>
      </div>
    </HackerCard>
  );
}
