import { useI18n } from "../../hooks/useI18n";
import { useVideoStatus } from "../../hooks/useVideoStatus";

interface VideoStatusBadgeProps {
  videoId: string | null | undefined;
}

export function VideoStatusBadge({ videoId }: VideoStatusBadgeProps) {
  const status = useVideoStatus(videoId);
  const { t } = useI18n();

  if (status === "idle") return null;

  if (status === "downloading") {
    return (
      <span className="inline-flex items-center font-mono text-[10px] text-[var(--accent)] animate-pulse">
        {t("status.downloading")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center font-mono text-[10px] text-hacker-text-dim">
      {t("status.downloaded")}
    </span>
  );
}
