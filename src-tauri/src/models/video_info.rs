use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub video_id: String,
    pub title: String,
    pub thumbnail: Option<String>,
    pub duration: u64,
    pub channel: String,
    pub upload_date: Option<String>,
    pub view_count: Option<u64>,
    pub like_count: Option<u64>,
    pub description: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn camelcase_roundtrip() {
        let info = VideoInfo {
            video_id: "dQw4w9WgXcQ".to_string(),
            title: "Test Video".to_string(),
            thumbnail: Some("https://i.ytimg.com/vi/test/default.jpg".to_string()),
            duration: 300,
            channel: "Test Channel".to_string(),
            upload_date: Some("2024-01-15".to_string()),
            view_count: Some(1000),
            like_count: Some(50),
            description: Some("A test video".to_string()),
        };

        let json = serde_json::to_string(&info).expect("serialize");
        assert!(json.contains("\"videoId\""));
        assert!(json.contains("\"uploadDate\""));
        assert!(json.contains("\"viewCount\""));
        assert!(json.contains("\"likeCount\""));
        assert!(!json.contains("upload_date"));

        let deserialized: VideoInfo = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized.video_id, "dQw4w9WgXcQ");
        assert_eq!(deserialized.title, "Test Video");
        assert_eq!(deserialized.duration, 300);
        assert_eq!(deserialized.upload_date, Some("2024-01-15".to_string()));
    }

    #[test]
    fn optional_fields_absent() {
        let json = r#"{
            "videoId": "",
            "title": "Minimal",
            "duration": 60,
            "channel": "Chan"
        }"#;
        let info: VideoInfo = serde_json::from_str(json).expect("deserialize");
        assert_eq!(info.video_id, "");
        assert_eq!(info.title, "Minimal");
        assert!(info.thumbnail.is_none());
        assert!(info.upload_date.is_none());
        assert!(info.view_count.is_none());
    }
}
