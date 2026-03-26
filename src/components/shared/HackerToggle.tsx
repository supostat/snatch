interface HackerToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function HackerToggle({
  label,
  checked,
  onChange,
  disabled = false,
}: HackerToggleProps) {
  return (
    <label
      className={`flex items-center gap-3 cursor-pointer select-none
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 border transition-all duration-200 cursor-pointer
          ${checked
            ? "border-[var(--accent)] bg-[var(--accent)]/20"
            : "border-hacker-border bg-hacker-bg"
          }
          disabled:cursor-not-allowed`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 transition-all duration-200
            ${checked
              ? "left-[1.125rem] bg-[var(--accent)]"
              : "left-0.5 bg-hacker-text-dim"
            }`}
        />
      </button>
      <span className="text-hacker-text font-mono text-xs">{label}</span>
    </label>
  );
}
