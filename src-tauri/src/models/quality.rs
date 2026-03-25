use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum QualityPreset {
    #[default]
    Best,
    Q2160,
    Q1080,
    Q720,
    Q480,
    Audio,
}

impl QualityPreset {
    pub fn ytdlp_flags(&self) -> Vec<&str> {
        match self {
            Self::Best => vec!["-f", "bestvideo+bestaudio/best"],
            Self::Q2160 => vec!["-f", "bestvideo[height<=2160]+bestaudio/best[height<=2160]"],
            Self::Q1080 => vec!["-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]"],
            Self::Q720 => vec!["-f", "bestvideo[height<=720]+bestaudio/best[height<=720]"],
            Self::Q480 => vec!["-f", "bestvideo[height<=480]+bestaudio/best[height<=480]"],
            Self::Audio => vec!["-x", "--audio-format", "mp3", "--audio-quality", "0"],
        }
    }

    pub fn is_audio_only(&self) -> bool {
        matches!(self, Self::Audio)
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DownloadStage {
    #[default]
    Downloading,
    Merging,
    Converting,
    Done,
    Error,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Theme {
    #[default]
    Green,
    Amber,
    Cyan,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Locale {
    #[default]
    En,
    Ru,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CookiesBrowser {
    #[default]
    None,
    Chrome,
    Firefox,
    Safari,
    Edge,
    Brave,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quality_best_flags_contain_format() {
        let flags = QualityPreset::Best.ytdlp_flags();
        assert!(flags.contains(&"-f"));
    }

    #[test]
    fn quality_audio_is_audio_only() {
        assert!(QualityPreset::Audio.is_audio_only());
        assert!(!QualityPreset::Best.is_audio_only());
        assert!(!QualityPreset::Q1080.is_audio_only());
    }

    #[test]
    fn quality_preset_default_is_best() {
        assert_eq!(QualityPreset::default(), QualityPreset::Best);
    }

    #[test]
    fn quality_preset_camelcase_roundtrip() {
        let preset = QualityPreset::Q1080;
        let json = serde_json::to_string(&preset).expect("serialize");
        assert_eq!(json, r#""q1080""#);
        let deserialized: QualityPreset = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized, QualityPreset::Q1080);
    }

    #[test]
    fn theme_camelcase_roundtrip() {
        let theme = Theme::Amber;
        let json = serde_json::to_string(&theme).expect("serialize");
        assert_eq!(json, r#""amber""#);
        let deserialized: Theme = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized, Theme::Amber);
    }

    #[test]
    fn locale_camelcase_roundtrip() {
        let locale = Locale::Ru;
        let json = serde_json::to_string(&locale).expect("serialize");
        assert_eq!(json, r#""ru""#);
        let deserialized: Locale = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized, Locale::Ru);
    }

    #[test]
    fn cookies_browser_camelcase_roundtrip() {
        let browser = CookiesBrowser::Chrome;
        let json = serde_json::to_string(&browser).expect("serialize");
        assert_eq!(json, r#""chrome""#);
        let deserialized: CookiesBrowser = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized, CookiesBrowser::Chrome);
    }

    #[test]
    fn download_stage_camelcase_roundtrip() {
        let stage = DownloadStage::Merging;
        let json = serde_json::to_string(&stage).expect("serialize");
        assert_eq!(json, r#""merging""#);
        let deserialized: DownloadStage = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized, DownloadStage::Merging);
    }

    #[test]
    fn audio_flags_include_extract_audio() {
        let flags = QualityPreset::Audio.ytdlp_flags();
        assert!(flags.contains(&"-x"));
        assert!(flags.contains(&"--audio-format"));
    }
}
