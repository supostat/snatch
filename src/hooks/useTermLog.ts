import { useCallback, useState } from "react";

const MAX_LINES = 200;

interface UseTermLogReturn {
  lines: string[];
  addLine: (line: string) => void;
  clear: () => void;
}

export function useTermLog(): UseTermLogReturn {
  const [lines, setLines] = useState<string[]>([]);

  const addLine = useCallback((line: string) => {
    setLines((prev) => {
      const next = [...prev, line];
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    });
  }, []);

  const clear = useCallback(() => {
    setLines([]);
  }, []);

  return { lines, addLine, clear };
}
