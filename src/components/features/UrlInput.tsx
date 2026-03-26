import { useState, type KeyboardEvent } from "react";
import { MAX_URL_LENGTH } from "../../lib/constants";
import { HackerButton } from "../shared/HackerButton";
import { HackerInput } from "../shared/HackerInput";

interface UrlInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function UrlInput({ onFetch, isLoading, disabled = false }: UrlInputProps) {
  const [url, setUrl] = useState("");

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
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={disabled}
          autoFocus
        />
      </div>
      <HackerButton
        onClick={handleSubmit}
        disabled={!isValid || disabled}
        loading={isLoading}
      >
        FETCH
      </HackerButton>
    </div>
  );
}
