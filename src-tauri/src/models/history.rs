use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub title: String,
    pub url: String,
    pub file_path: String,
    pub quality: String,
    pub file_size: Option<u64>,
    pub duration: Option<u64>,
    pub channel: Option<String>,
    pub downloaded_at: String,
    pub thumbnail: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn camelcase_roundtrip() {
        let entry = HistoryEntry {
            id: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            title: "Test Video".to_string(),
            url: "https://www.youtube.com/watch?v=test".to_string(),
            file_path: "/tmp/test.mp4".to_string(),
            quality: "q1080".to_string(),
            file_size: Some(104857600),
            duration: Some(300),
            channel: Some("Test Channel".to_string()),
            downloaded_at: "2024-01-15T12:00:00Z".to_string(),
            thumbnail: Some("https://i.ytimg.com/vi/test/default.jpg".to_string()),
        };

        let json = serde_json::to_string(&entry).expect("serialize");
        assert!(json.contains("\"filePath\""));
        assert!(json.contains("\"fileSize\""));
        assert!(json.contains("\"downloadedAt\""));
        assert!(!json.contains("file_path"));
        assert!(!json.contains("downloaded_at"));

        let deserialized: HistoryEntry = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(deserialized.id, entry.id);
        assert_eq!(deserialized.title, "Test Video");
        assert_eq!(deserialized.file_size, Some(104857600));
    }

    #[test]
    fn optional_fields_absent() {
        let json = r#"{
            "id": "test-id",
            "title": "Video",
            "url": "https://youtube.com/watch?v=x",
            "filePath": "/tmp/x.mp4",
            "quality": "best",
            "downloadedAt": "2024-01-01T00:00:00Z"
        }"#;
        let entry: HistoryEntry = serde_json::from_str(json).expect("deserialize");
        assert!(entry.file_size.is_none());
        assert!(entry.duration.is_none());
        assert!(entry.channel.is_none());
        assert!(entry.thumbnail.is_none());
    }
}
