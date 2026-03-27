use serde::{Deserialize, Serialize};

use super::quality::{CookiesBrowser, Locale, QualityPreset, Theme};

fn default_download_dir() -> String {
    dirs::download_dir()
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_else(|| {
            dirs::home_dir()
                .map(|home| home.join("Downloads").to_string_lossy().to_string())
                .unwrap_or_default()
        })
}

fn default_true() -> bool {
    true
}

fn default_max_concurrent() -> u8 {
    3
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default = "default_download_dir")]
    pub download_dir: String,

    #[serde(default)]
    pub default_quality: QualityPreset,

    #[serde(default = "default_true")]
    pub embed_thumbnail: bool,

    #[serde(default = "default_true")]
    pub embed_metadata: bool,

    #[serde(default = "default_true")]
    pub auto_clipboard: bool,

    #[serde(default = "default_max_concurrent")]
    pub max_concurrent: u8,

    #[serde(default)]
    pub theme: Theme,

    #[serde(default = "default_true")]
    pub show_matrix_rain: bool,

    #[serde(default = "default_true")]
    pub crt_effect: bool,

    #[serde(default)]
    pub locale: Locale,

    #[serde(default)]
    pub cookies_browser: CookiesBrowser,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            download_dir: default_download_dir(),
            default_quality: QualityPreset::default(),
            embed_thumbnail: true,
            embed_metadata: true,
            auto_clipboard: false,
            max_concurrent: default_max_concurrent(),
            theme: Theme::default(),
            show_matrix_rain: true,
            crt_effect: true,
            locale: Locale::default(),
            cookies_browser: CookiesBrowser::default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn camelcase_roundtrip() {
        let settings = Settings::default();
        let json = serde_json::to_string(&settings).expect("serialize");

        assert!(json.contains("\"downloadDir\""));
        assert!(json.contains("\"defaultQuality\""));
        assert!(json.contains("\"embedThumbnail\""));
        assert!(json.contains("\"embedMetadata\""));
        assert!(json.contains("\"autoClipboard\""));
        assert!(json.contains("\"maxConcurrent\""));
        assert!(json.contains("\"showMatrixRain\""));
        assert!(json.contains("\"crtEffect\""));
        assert!(json.contains("\"cookiesBrowser\""));
        assert!(!json.contains("download_dir"));

        let deserialized: Settings = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized.embed_thumbnail, true);
        assert_eq!(deserialized.max_concurrent, 3);
    }

    #[test]
    fn deserialize_empty_json_uses_defaults() {
        let settings: Settings = serde_json::from_str("{}").expect("deserialize");
        assert_eq!(settings.embed_thumbnail, true);
        assert_eq!(settings.embed_metadata, true);
        assert_eq!(settings.auto_clipboard, false);
        assert_eq!(settings.max_concurrent, 3);
        assert_eq!(settings.show_matrix_rain, true);
        assert_eq!(settings.crt_effect, true);
        assert_eq!(settings.default_quality, QualityPreset::Best);
        assert_eq!(settings.theme, Theme::Green);
        assert_eq!(settings.locale, Locale::En);
        assert_eq!(settings.cookies_browser, CookiesBrowser::None);
    }

    #[test]
    fn partial_json_fills_missing_with_defaults() {
        let json = r#"{"embedThumbnail": false, "maxConcurrent": 5}"#;
        let settings: Settings = serde_json::from_str(json).expect("deserialize");
        assert_eq!(settings.embed_thumbnail, false);
        assert_eq!(settings.max_concurrent, 5);
        assert_eq!(settings.embed_metadata, true);
        assert_eq!(settings.auto_clipboard, false);
    }

    #[test]
    fn default_download_dir_is_not_empty() {
        let settings = Settings::default();
        assert!(!settings.download_dir.is_empty());
    }
}
