import { QUALITY_PRESETS } from "../../lib/constants";
import type { QualityPreset } from "../../lib/types";

interface QualityPickerProps {
  value: QualityPreset;
  onChange: (quality: QualityPreset) => void;
  disabled?: boolean;
}

export function QualityPicker({
  value,
  onChange,
  disabled = false,
}: QualityPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-hacker-text-dim font-mono text-xs uppercase tracking-widest shrink-0">
        Quality:
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as QualityPreset)}
        disabled={disabled}
        className="bg-hacker-bg border border-hacker-border text-[var(--accent)] font-mono text-sm
          px-3 py-2 outline-none cursor-pointer
          focus:border-[var(--accent)] focus:shadow-[0_0_8px_var(--accent-glow)]
          transition-all duration-200
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {QUALITY_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}
