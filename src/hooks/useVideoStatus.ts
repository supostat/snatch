import type { VideoStatus } from "../lib/types";
import { useAppStore } from "../stores/app-store";

export function useVideoStatus(videoId: string | null | undefined): VideoStatus {
  const downloadingVideoIds = useAppStore((state) => state.downloadingVideoIds);
  const historyVideoIds = useAppStore((state) => state.historyVideoIds);

  if (!videoId) return "idle";
  if (downloadingVideoIds.has(videoId)) return "downloading";
  if (historyVideoIds.has(videoId)) return "downloaded";
  return "idle";
}
