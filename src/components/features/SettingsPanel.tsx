import { getQualityPresets, getThemes } from "../../lib/constants";
import { useI18n } from "../../hooks/useI18n";
import type {
  CookiesBrowser,
  Locale,
  QualityPreset,
  Settings,
  Theme,
} from "../../lib/types";
import { HackerCard } from "../shared/HackerCard";
import { HackerSelect } from "../shared/HackerSelect";
import { HackerToggle } from "../shared/HackerToggle";
import { FolderPicker } from "./FolderPicker";

interface SettingsPanelProps {
  settings: Settings;
  onUpdate: (key: string, value: unknown) => void;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="text-[var(--accent-dim)] font-mono text-xs uppercase tracking-widest mb-3 mt-1">
      {"// "}{title}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-hacker-text font-mono text-xs">{label}</span>
      {children}
    </div>
  );
}

const COOKIES_BROWSERS = ["none", "chrome", "firefox", "safari", "edge", "brave"] as const;

const LOCALES = ["en", "ru"] as const;

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  const { t } = useI18n();

  const cookiesOptions = COOKIES_BROWSERS.map((browser) => ({
    value: browser,
    label: t(`cookies.${browser}`),
  }));

  const localeOptions = LOCALES.map((locale) => ({
    value: locale,
    label: t(`locales.${locale}`),
  }));

  const themes = getThemes();

  return (
    <div className="space-y-4">
      <HackerCard>
        <SectionHeader title={t("settings.sectionDownload")} />

        <SettingRow label={t("settings.downloadDirectory")}>
          <FolderPicker
            currentPath={settings.downloadDir}
            onSelect={(path) => onUpdate("downloadDir", path)}
          />
        </SettingRow>

        <SettingRow label={t("settings.defaultQuality")}>
          <HackerSelect
            value={settings.defaultQuality}
            options={getQualityPresets()}
            onChange={(v) => onUpdate("defaultQuality", v as QualityPreset)}
          />
        </SettingRow>

        <HackerToggle
          label={t("settings.embedThumbnail")}
          checked={settings.embedThumbnail}
          onChange={(v) => onUpdate("embedThumbnail", v)}
        />

        <HackerToggle
          label={t("settings.embedMetadata")}
          checked={settings.embedMetadata}
          onChange={(v) => onUpdate("embedMetadata", v)}
        />
      </HackerCard>

      <HackerCard>
        <SectionHeader title={t("settings.sectionAppearance")} />

        <SettingRow label={t("settings.theme")}>
          <div className="flex gap-2">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => onUpdate("theme", themeOption.value as Theme)}
                className={`px-3 py-1 font-mono text-xs border transition-all duration-200 cursor-pointer
                  ${settings.theme === themeOption.value
                    ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-hacker-border text-hacker-text-dim hover:border-hacker-text"
                  }`}
              >
                {themeOption.label}
              </button>
            ))}
          </div>
        </SettingRow>

        <HackerToggle
          label={t("settings.matrixRainEffect")}
          checked={settings.showMatrixRain}
          onChange={(v) => onUpdate("showMatrixRain", v)}
        />

        <HackerToggle
          label={t("settings.crtScanlineEffect")}
          checked={settings.crtEffect}
          onChange={(v) => onUpdate("crtEffect", v)}
        />
      </HackerCard>

      <HackerCard>
        <SectionHeader title={t("settings.sectionAdvanced")} />

        <SettingRow label={t("settings.maxConcurrentDownloads")}>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onUpdate("maxConcurrent", n)}
                className={`w-7 h-7 font-mono text-xs border transition-all duration-200 cursor-pointer
                  ${settings.maxConcurrent === n
                    ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-hacker-border text-hacker-text-dim hover:border-hacker-text"
                  }`}
              >
                {n}
              </button>
            ))}
          </div>
        </SettingRow>

        <HackerToggle
          label={t("settings.autoPasteClipboard")}
          checked={settings.autoClipboard}
          onChange={(v) => onUpdate("autoClipboard", v)}
        />

        <SettingRow label={t("settings.language")}>
          <HackerSelect
            value={settings.locale}
            options={localeOptions}
            onChange={(v) => onUpdate("locale", v as Locale)}
          />
        </SettingRow>

        <SettingRow label={t("settings.browserCookies")}>
          <HackerSelect
            value={settings.cookiesBrowser}
            options={cookiesOptions}
            onChange={(v) => onUpdate("cookiesBrowser", v as CookiesBrowser)}
          />
        </SettingRow>

        {settings.cookiesBrowser !== "none" && (
          <div className="border border-hacker-amber/50 bg-hacker-amber/5 p-2 mt-2 font-mono text-xs text-hacker-amber">
            {"⚠"} {t("settings.cookiesWarning")}
          </div>
        )}
      </HackerCard>
    </div>
  );
}
