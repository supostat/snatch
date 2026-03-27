import { SettingsPanel } from "../components/features/SettingsPanel";
import { useI18n } from "../hooks/useI18n";
import { useSettings } from "../hooks/useSettings";
import { useAppStore } from "../stores/app-store";

export function SettingsPage() {
  const settings = useAppStore((state) => state.settings);
  const { updateSetting } = useSettings();
  const { t } = useI18n();

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-hacker-text-dim font-mono text-sm">
          {t("settings.loadingSettings")}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <SettingsPanel settings={settings} onUpdate={updateSetting} />
    </div>
  );
}
