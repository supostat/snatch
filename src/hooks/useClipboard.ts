import { useEffect } from "react";
import { api } from "../lib/bindings";

export function useClipboard(onNewUrl: (url: string) => void): void {
  useEffect(() => {
    const unlistenPromise = api.clipboard.onNewUrl(onNewUrl);

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onNewUrl]);
}
