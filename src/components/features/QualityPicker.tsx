import { QUALITY_PRESETS } from "../../lib/constants";
import type { QualityPreset } from "../../lib/types";
import { HackerSelect } from "../shared/HackerSelect";

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
      <HackerSelect
        value={value}
        options={QUALITY_PRESETS}
        onChange={(v) => onChange(v as QualityPreset)}
        disabled={disabled}
      />
    </div>
  );
}
