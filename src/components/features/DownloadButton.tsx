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
  if (isDownloading) {
    return (
      <HackerButton variant="danger" onClick={onCancel}>
        CANCEL
      </HackerButton>
    );
  }

  return (
    <HackerButton onClick={onStart} disabled={disabled}>
      START DOWNLOAD
    </HackerButton>
  );
}
