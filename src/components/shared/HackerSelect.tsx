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

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? value;

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger
        className="bg-hacker-bg border-hacker-border text-[var(--accent)] font-mono text-xs h-auto py-2.5
          focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent-glow)]
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent
        className="bg-hacker-bg border border-hacker-border font-mono text-xs min-w-fit"
        alignItemWithTrigger={false}
        align="start"
      >
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-[var(--accent)] opacity-70 focus:opacity-100 focus:bg-[var(--accent)]/25 focus:text-[var(--accent)] py-2"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
