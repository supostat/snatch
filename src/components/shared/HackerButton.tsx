import { type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "danger";

interface HackerButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `border-[var(--accent)] text-[var(--accent)]
    hover:bg-[var(--accent)] hover:text-hacker-bg
    hover:shadow-[0_0_12px_var(--accent-glow)]`,
  ghost: `border-hacker-border text-hacker-text
    hover:border-[var(--accent-dim)] hover:text-[var(--accent)]`,
  danger: `border-hacker-red text-hacker-red
    hover:bg-hacker-red hover:text-hacker-bg
    hover:shadow-[0_0_12px_rgba(255,51,51,0.5)]`,
};

export function HackerButton({
  variant = "primary",
  loading = false,
  disabled,
  children,
  ...props
}: HackerButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`border px-4 py-2 font-mono text-xs uppercase tracking-widest
        transition-all duration-200 cursor-pointer
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none
        ${variantStyles[variant]}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? "[...]" : children}
    </button>
  );
}
