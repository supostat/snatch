import { describe, it, expect } from "vitest";
import { setI18nLocale } from "../../i18n";
import { getTabs, getQualityPresets, getThemes } from "../constants";

describe("getTabs", () => {
  it("returns 5 tabs with id and label", () => {
    setI18nLocale("en");
    const tabs = getTabs();
    expect(tabs).toHaveLength(5);
    for (const tab of tabs) {
      expect(tab).toHaveProperty("id");
      expect(tab).toHaveProperty("label");
      expect(typeof tab.label).toBe("string");
      expect(tab.label.length).toBeGreaterThan(0);
    }
  });

  it("includes all expected tab ids", () => {
    const tabs = getTabs();
    const ids = tabs.map((tab) => tab.id);
    expect(ids).toContain("download");
    expect(ids).toContain("queue");
    expect(ids).toContain("history");
    expect(ids).toContain("settings");
    expect(ids).toContain("about");
  });

  it("returns localized labels for Russian", () => {
    setI18nLocale("ru");
    const tabs = getTabs();
    const downloadTab = tabs.find((tab) => tab.id === "download");
    expect(downloadTab?.label).toBe("Загрузка");
    setI18nLocale("en");
  });
});

describe("getQualityPresets", () => {
  it("returns 6 quality presets", () => {
    setI18nLocale("en");
    const presets = getQualityPresets();
    expect(presets).toHaveLength(6);
    for (const preset of presets) {
      expect(preset).toHaveProperty("value");
      expect(preset).toHaveProperty("label");
    }
  });

  it("first preset is best quality", () => {
    const presets = getQualityPresets();
    expect(presets[0]?.value).toBe("best");
  });

  it("last preset is audio only", () => {
    const presets = getQualityPresets();
    expect(presets[presets.length - 1]?.value).toBe("audio");
  });
});

describe("getThemes", () => {
  it("returns 3 themes", () => {
    setI18nLocale("en");
    const themes = getThemes();
    expect(themes).toHaveLength(3);
    const values = themes.map((theme) => theme.value);
    expect(values).toContain("green");
    expect(values).toContain("amber");
    expect(values).toContain("cyan");
  });
});
