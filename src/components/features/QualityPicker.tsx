import { getQualityPresets } from "../../lib/constants";
import { useI18n } from "../../hooks/useI18n";
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
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3">
      <label className="text-hacker-text-dim font-mono text-xs uppercase tracking-widest shrink-0">
        {t("download.qualityLabel")}
      </label>
      <HackerSelect
        value={value}
        options={getQualityPresets()}
        onChange={(v) => onChange(v as QualityPreset)}
        disabled={disabled}
      />
    </div>
  );
}
