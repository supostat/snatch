import { describe, it, expect } from "vitest";
import { t, setI18nLocale, getI18nLocale } from "../index";

describe("i18n", () => {
  it("returns English text by default", () => {
    setI18nLocale("en");
    expect(t("tabs.download")).toBe("Download");
  });

  it("returns Russian text when locale is ru", () => {
    setI18nLocale("ru");
    expect(t("tabs.download")).toBe("Загрузка");
    setI18nLocale("en");
  });

  it("resolves nested keys with dot notation", () => {
    setI18nLocale("en");
    expect(t("settings.downloadDirectory")).toBe("Download directory");
    expect(t("quality.best")).toBe("Best Quality");
  });

  it("falls back to English for missing Russian keys", () => {
    setI18nLocale("ru");
    expect(t("download.urlPlaceholder")).toBe("https://www.youtube.com/watch?v=...");
    setI18nLocale("en");
  });

  it("returns key itself for unknown keys", () => {
    setI18nLocale("en");
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("tracks locale changes", () => {
    setI18nLocale("ru");
    expect(getI18nLocale()).toBe("ru");
    setI18nLocale("en");
    expect(getI18nLocale()).toBe("en");
  });

  it("handles all quality presets", () => {
    setI18nLocale("en");
    const presets = ["best", "q2160", "q1080", "q720", "q480", "audio"];
    for (const preset of presets) {
      const result = t(`quality.${preset}`);
      expect(result).not.toBe(`quality.${preset}`);
    }
  });

  it("handles all tab keys", () => {
    setI18nLocale("en");
    const tabs = ["download", "queue", "history", "settings", "about"];
    for (const tab of tabs) {
      const result = t(`tabs.${tab}`);
      expect(result).not.toBe(`tabs.${tab}`);
    }
  });
});
