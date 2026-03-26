import { type InputHTMLAttributes } from "react";

interface HackerInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  fullWidth?: boolean;
}

export function HackerInput({
  fullWidth = true,
  ...props
}: HackerInputProps) {
  return (
    <div
      className={`flex items-center gap-2 border border-hacker-border bg-hacker-bg px-3 py-2 font-mono text-sm
        focus-within:border-[var(--accent)] focus-within:shadow-[0_0_8px_var(--accent-glow)]
        transition-all duration-200 ${fullWidth ? "w-full" : ""}`}
    >
      <span className="text-[var(--accent-dim)] select-none shrink-0">
        {">_"}
      </span>
      <input
        className="w-full bg-transparent text-[var(--accent)] placeholder-hacker-text-dim outline-none font-mono text-sm"
        {...props}
      />
    </div>
  );
}
