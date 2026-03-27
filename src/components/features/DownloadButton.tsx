import { useI18n } from "../../hooks/useI18n";
import { HackerButton } from "../shared/HackerButton";

interface DownloadButtonProps {
  isDownloading: boolean;
  onStart: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function DownloadButton({
  isDownloading,
  onStart,
  onCancel,
  disabled = false,
}: DownloadButtonProps) {
  const { t } = useI18n();

  if (isDownloading) {
    return (
      <HackerButton variant="danger" onClick={onCancel}>
        {t("download.cancel")}
      </HackerButton>
    );
  }

  return (
    <HackerButton onClick={onStart} disabled={disabled}>
      {t("download.startDownload")}
    </HackerButton>
  );
}
