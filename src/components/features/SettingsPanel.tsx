import { QUALITY_PRESETS, THEMES } from "../../lib/constants";
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

const COOKIES_OPTIONS = [
  { value: "none", label: "None" },
  { value: "chrome", label: "Chrome" },
  { value: "firefox", label: "Firefox" },
  { value: "safari", label: "Safari" },
  { value: "edge", label: "Edge" },
  { value: "brave", label: "Brave" },
] as const;

const LOCALE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
] as const;

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  return (
    <div className="space-y-4">
      <HackerCard>
        <SectionHeader title="Download" />

        <SettingRow label="Download directory">
          <FolderPicker
            currentPath={settings.downloadDir}
            onSelect={(path) => onUpdate("downloadDir", path)}
          />
        </SettingRow>

        <SettingRow label="Default quality">
          <HackerSelect
            value={settings.defaultQuality}
            options={QUALITY_PRESETS}
            onChange={(v) => onUpdate("defaultQuality", v as QualityPreset)}
          />
        </SettingRow>

        <HackerToggle
          label="Embed thumbnail"
          checked={settings.embedThumbnail}
          onChange={(v) => onUpdate("embedThumbnail", v)}
        />

        <HackerToggle
          label="Embed metadata"
          checked={settings.embedMetadata}
          onChange={(v) => onUpdate("embedMetadata", v)}
        />
      </HackerCard>

      <HackerCard>
        <SectionHeader title="Appearance" />

        <SettingRow label="Theme">
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => onUpdate("theme", t.value as Theme)}
                className={`px-3 py-1 font-mono text-xs border transition-all duration-200 cursor-pointer
                  ${settings.theme === t.value
                    ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-hacker-border text-hacker-text-dim hover:border-hacker-text"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </SettingRow>

        <HackerToggle
          label="Matrix rain effect"
          checked={settings.showMatrixRain}
          onChange={(v) => onUpdate("showMatrixRain", v)}
        />

        <HackerToggle
          label="CRT scanline effect"
          checked={settings.crtEffect}
          onChange={(v) => onUpdate("crtEffect", v)}
        />
      </HackerCard>

      <HackerCard>
        <SectionHeader title="Advanced" />

        <SettingRow label="Max concurrent downloads">
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
          label="Auto-paste from clipboard"
          checked={settings.autoClipboard}
          onChange={(v) => onUpdate("autoClipboard", v)}
        />

        <SettingRow label="Language">
          <HackerSelect
            value={settings.locale}
            options={LOCALE_OPTIONS}
            onChange={(v) => onUpdate("locale", v as Locale)}
          />
        </SettingRow>

        <SettingRow label="Browser cookies">
          <HackerSelect
            value={settings.cookiesBrowser}
            options={COOKIES_OPTIONS}
            onChange={(v) => onUpdate("cookiesBrowser", v as CookiesBrowser)}
          />
        </SettingRow>

        {settings.cookiesBrowser !== "none" && (
          <div className="border border-hacker-amber/50 bg-hacker-amber/5 p-2 mt-2 font-mono text-xs text-hacker-amber">
            {"⚠"} Gives yt-dlp access to your browser cookies, including auth data from other sites.
          </div>
        )}
      </HackerCard>
    </div>
  );
}
