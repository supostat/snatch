use serde::Deserialize;

use crate::error::AppError;
use crate::models::playlist_info::{PlaylistEntry, PlaylistInfo};
use crate::models::video_info::VideoInfo;

/// Intermediate struct for parsing yt-dlp --dump-json output.
/// yt-dlp returns hundreds of fields; we only extract what we need.
#[derive(Deserialize)]
struct YtdlpJsonOutput {
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    thumbnail: Option<String>,
    #[serde(default)]
    duration: Option<f64>,
    #[serde(default)]
    channel: Option<String>,
    #[serde(default)]
    uploader: Option<String>,
    #[serde(default)]
    upload_date: Option<String>,
    #[serde(default)]
    view_count: Option<u64>,
    #[serde(default)]
    like_count: Option<u64>,
    #[serde(default)]
    description: Option<String>,
}

pub fn parse_video_info(json_output: &str) -> Result<VideoInfo, AppError> {
    let raw: YtdlpJsonOutput = serde_json::from_str(json_output)?;

    let video_id = raw.id.unwrap_or_default();
    let title = raw.title.unwrap_or_else(|| "Unknown Title".to_string());
    let channel = raw
        .channel
        .or(raw.uploader)
        .unwrap_or_else(|| "Unknown Channel".to_string());
    let duration = raw.duration.map(|d| d as u64).unwrap_or(0);
    let upload_date = raw.upload_date.and_then(|d| format_upload_date(&d));

    Ok(VideoInfo {
        video_id,
        title,
        thumbnail: raw.thumbnail,
        duration,
        channel,
        upload_date,
        view_count: raw.view_count,
        like_count: raw.like_count,
        description: raw.description,
    })
}

/// Intermediate struct for parsing yt-dlp --flat-playlist --dump-json output.
/// Each line is a JSON object representing one playlist entry.
#[derive(Deserialize)]
struct YtdlpPlaylistEntry {
    #[serde(default)]
    url: Option<String>,
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    duration: Option<f64>,
    #[serde(default)]
    thumbnails: Option<Vec<YtdlpThumbnail>>,
    #[serde(default)]
    channel: Option<String>,
    #[serde(default)]
    uploader: Option<String>,
}

#[derive(Deserialize)]
struct YtdlpThumbnail {
    #[serde(default)]
    url: Option<String>,
}

/// Parse yt-dlp --flat-playlist output (one JSON per line, first line is playlist metadata)
pub fn parse_playlist_info(json_lines: &str) -> Result<PlaylistInfo, AppError> {
    let mut entries = Vec::new();
    let mut playlist_title = String::from("Unknown Playlist");
    let mut playlist_channel = String::from("Unknown Channel");

    for line in json_lines.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let raw: serde_json::Value = serde_json::from_str(trimmed)?;

        // Playlist metadata has _type: "playlist"
        if raw.get("_type").and_then(|v| v.as_str()) == Some("playlist") {
            if let Some(title) = raw.get("title").and_then(|v| v.as_str()) {
                playlist_title = title.to_string();
            }
            if let Some(channel) = raw
                .get("channel")
                .or_else(|| raw.get("uploader"))
                .and_then(|v| v.as_str())
            {
                playlist_channel = channel.to_string();
            }
            continue;
        }

        // Individual video entries
        if let Ok(entry) = serde_json::from_value::<YtdlpPlaylistEntry>(raw) {
            let video_id = entry.id.unwrap_or_default();
            let url = entry
                .url
                .unwrap_or_else(|| format!("https://www.youtube.com/watch?v={video_id}"));
            let title = entry.title.unwrap_or_else(|| "Untitled".to_string());
            let thumbnail = entry
                .thumbnails
                .and_then(|thumbs| thumbs.last().and_then(|t| t.url.clone()));

            entries.push(PlaylistEntry {
                video_id,
                url,
                title,
                duration: entry.duration.map(|d| d as u64),
                thumbnail,
                channel: entry.channel.or(entry.uploader),
            });
        }
    }

    Ok(PlaylistInfo {
        title: playlist_title,
        channel: playlist_channel,
        video_count: entries.len(),
        entries,
    })
}

/// Convert yt-dlp date format "YYYYMMDD" to "YYYY-MM-DD"
fn format_upload_date(raw: &str) -> Option<String> {
    if raw.len() != 8 || !raw.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    Some(format!("{}-{}-{}", &raw[0..4], &raw[4..6], &raw[6..8]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_full_video_info() {
        let json = r#"{
            "id": "dQw4w9WgXcQ",
            "title": "Never Gonna Give You Up",
            "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
            "duration": 212.5,
            "channel": "Rick Astley",
            "upload_date": "20091025",
            "view_count": 1500000000,
            "like_count": 15000000,
            "description": "Official music video"
        }"#;

        let info = parse_video_info(json).unwrap();
        assert_eq!(info.video_id, "dQw4w9WgXcQ");
        assert_eq!(info.title, "Never Gonna Give You Up");
        assert_eq!(info.channel, "Rick Astley");
        assert_eq!(info.duration, 212);
        assert_eq!(info.upload_date, Some("2009-10-25".to_string()));
        assert_eq!(info.view_count, Some(1500000000));
        assert!(info.thumbnail.is_some());
    }

    #[test]
    fn parse_minimal_json_uses_defaults() {
        let json = r#"{}"#;
        let info = parse_video_info(json).unwrap();
        assert_eq!(info.video_id, "");
        assert_eq!(info.title, "Unknown Title");
        assert_eq!(info.channel, "Unknown Channel");
        assert_eq!(info.duration, 0);
        assert!(info.thumbnail.is_none());
        assert!(info.upload_date.is_none());
    }

    #[test]
    fn channel_falls_back_to_uploader() {
        let json = r#"{
            "title": "Test",
            "uploader": "SomeUploader"
        }"#;
        let info = parse_video_info(json).unwrap();
        assert_eq!(info.channel, "SomeUploader");
    }

    #[test]
    fn channel_prefers_channel_over_uploader() {
        let json = r#"{
            "title": "Test",
            "channel": "Official Channel",
            "uploader": "SomeUploader"
        }"#;
        let info = parse_video_info(json).unwrap();
        assert_eq!(info.channel, "Official Channel");
    }

    #[test]
    fn invalid_json_returns_error() {
        let result = parse_video_info("not json at all");
        assert!(result.is_err());
    }

    #[test]
    fn upload_date_formatting() {
        assert_eq!(
            format_upload_date("20240115"),
            Some("2024-01-15".to_string())
        );
        assert_eq!(format_upload_date("invalid"), None);
        assert_eq!(format_upload_date("2024"), None);
        assert_eq!(format_upload_date(""), None);
    }

    #[test]
    fn duration_float_truncated_to_u64() {
        let json = r#"{"duration": 123.9}"#;
        let info = parse_video_info(json).unwrap();
        assert_eq!(info.duration, 123);
    }

    #[test]
    fn extra_fields_are_ignored() {
        let json = r#"{
            "title": "Test",
            "formats": [{"format_id": "22"}],
            "subtitles": {},
            "requested_formats": [],
            "unknown_field": true
        }"#;
        let info = parse_video_info(json).unwrap();
        assert_eq!(info.title, "Test");
    }
}
