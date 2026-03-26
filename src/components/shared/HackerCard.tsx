import { type ReactNode } from "react";

interface HackerCardProps {
  children: ReactNode;
  className?: string;
}

export function HackerCard({ children, className = "" }: HackerCardProps) {
  return (
    <div
      className={`border border-hacker-border bg-hacker-surface p-4 ${className}`}
    >
      {children}
    </div>
  );
}
