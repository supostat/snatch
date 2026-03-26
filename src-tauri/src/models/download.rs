use serde::{Deserialize, Serialize};
use tokio_util::sync::CancellationToken;

use super::quality::{CookiesBrowser, DownloadStage, QualityPreset};

pub struct DownloadHandle {
    pub cancel_token: CancellationToken,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadOptions {
    pub download_id: String,
    pub url: String,
    pub quality: QualityPreset,
    pub output_dir: String,
    pub embed_thumbnail: bool,
    pub embed_metadata: bool,
    pub cookies_browser: CookiesBrowser,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub download_id: String,
    pub percent: f64,
    pub speed: Option<String>,
    pub eta: Option<String>,
    pub downloaded: Option<String>,
    pub total: Option<String>,
    pub stage: DownloadStage,
    pub pass: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadResult {
    pub download_id: String,
    pub file_path: Option<String>,
    pub file_size: Option<u64>,
    pub success: bool,
    pub error: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn download_options_camelcase_roundtrip() {
        let options = DownloadOptions {
            download_id: "test-id".to_string(),
            url: "https://www.youtube.com/watch?v=test".to_string(),
            quality: QualityPreset::Q1080,
            output_dir: "/tmp/downloads".to_string(),
            embed_thumbnail: true,
            embed_metadata: true,
            cookies_browser: CookiesBrowser::None,
        };

        let json = serde_json::to_string(&options).expect("serialize");
        assert!(json.contains("\"downloadId\""));
        assert!(json.contains("\"outputDir\""));
        assert!(json.contains("\"embedThumbnail\""));
        assert!(json.contains("\"embedMetadata\""));
        assert!(json.contains("\"cookiesBrowser\""));

        let deserialized: DownloadOptions = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized.url, options.url);
        assert_eq!(deserialized.quality, QualityPreset::Q1080);
    }

    #[test]
    fn download_progress_camelcase_roundtrip() {
        let progress = DownloadProgress {
            download_id: "abc-123".to_string(),
            percent: 45.5,
            speed: Some("2.5MiB/s".to_string()),
            eta: Some("00:30".to_string()),
            downloaded: Some("50MiB".to_string()),
            total: Some("110MiB".to_string()),
            stage: DownloadStage::Downloading,
            pass: Some("1/3 Video".to_string()),
        };

        let json = serde_json::to_string(&progress).expect("serialize");
        assert!(json.contains("\"downloadId\""));
        assert!(!json.contains("download_id"));

        let deserialized: DownloadProgress = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized.download_id, "abc-123");
        assert!((deserialized.percent - 45.5).abs() < f64::EPSILON);
    }

    #[test]
    fn download_result_camelcase_roundtrip() {
        let result = DownloadResult {
            download_id: "abc-123".to_string(),
            file_path: Some("/tmp/video.mp4".to_string()),
            file_size: Some(104857600),
            success: true,
            error: None,
        };

        let json = serde_json::to_string(&result).expect("serialize");
        assert!(json.contains("\"downloadId\""));
        assert!(json.contains("\"filePath\""));
        assert!(json.contains("\"fileSize\""));

        let deserialized: DownloadResult = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized.download_id, "abc-123");
        assert!(deserialized.success);
    }
}
