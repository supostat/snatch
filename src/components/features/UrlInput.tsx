import { useEffect, useState, type KeyboardEvent } from "react";
import { MAX_URL_LENGTH } from "../../lib/constants";
import { useI18n } from "../../hooks/useI18n";
import { HackerButton } from "../shared/HackerButton";
import { HackerInput } from "../shared/HackerInput";

interface UrlInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  externalUrl?: string;
}

export function UrlInput({ onFetch, isLoading, disabled = false, externalUrl }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    if (externalUrl) {
      setUrl(externalUrl);
    }
  }, [externalUrl]);

  const isValid = url.trim().length > 0 && url.length <= MAX_URL_LENGTH;

  function handleSubmit() {
    if (isValid && !isLoading && !disabled) {
      onFetch(url.trim());
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      handleSubmit();
    }
  }

  return (
    <div className="flex gap-3 items-center">
      <div className="flex-1">
        <HackerInput
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("download.urlPlaceholder")}
          disabled={disabled}
          autoFocus
        />
      </div>
      <HackerButton
        onClick={handleSubmit}
        disabled={!isValid || disabled}
        loading={isLoading}
      >
        {t("download.fetch")}
      </HackerButton>
    </div>
  );
}
