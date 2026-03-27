import { useEffect, useRef } from "react";
import { useI18n } from "../../hooks/useI18n";

interface TermLogProps {
  lines: string[];
  maxHeight?: string;
}

export function TermLog({ lines, maxHeight = "200px" }: TermLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [lines.length]);

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto border border-hacker-border bg-hacker-bg p-3 font-mono text-xs text-hacker-text-dim"
      style={{ maxHeight }}
    >
      {lines.length === 0 ? (
        <span className="text-hacker-text-dim opacity-50">
          {">"} {t("common.waitingForOutput")}
        </span>
      ) : (
        lines.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-all leading-5">
            <span className="text-[var(--accent-dim)] mr-2 select-none">
              {">"}
            </span>
            {line}
          </div>
        ))
      )}
    </div>
  );
}
