use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistEntry {
    pub url: String,
    pub title: String,
    pub duration: Option<u64>,
    pub thumbnail: Option<String>,
    pub channel: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistInfo {
    pub title: String,
    pub channel: String,
    pub video_count: usize,
    pub entries: Vec<PlaylistEntry>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn camelcase_serialization() {
        let info = PlaylistInfo {
            title: "Test Playlist".to_string(),
            channel: "Test Channel".to_string(),
            video_count: 1,
            entries: vec![PlaylistEntry {
                url: "https://youtube.com/watch?v=abc".to_string(),
                title: "Video 1".to_string(),
                duration: Some(120),
                thumbnail: None,
                channel: None,
            }],
        };

        let json = serde_json::to_string(&info).expect("serialize");
        assert!(json.contains("\"videoCount\""));
        assert!(!json.contains("video_count"));
    }
}
