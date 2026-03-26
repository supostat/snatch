import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HackerSelectProps {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function HackerSelect({
  value,
  options,
  onChange,
  disabled = false,
}: HackerSelectProps) {
  const handleValueChange = (nextValue: string | null) => {
    if (nextValue !== null) onChange(nextValue);
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger
        className="bg-hacker-bg border-hacker-border text-[var(--accent)] font-mono text-xs
          focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent-glow)]
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="bg-hacker-surface border-hacker-border font-mono text-xs"
      >
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-hacker-text focus:bg-[var(--accent)]/10 focus:text-[var(--accent)]"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
