use regex::Regex;
use std::sync::LazyLock;

#[derive(Debug, Clone, PartialEq)]
pub enum ProgressUpdate {
    Download {
        percent: f64,
        total: Option<String>,
        speed: Option<String>,
        eta: Option<String>,
    },
    DownloadDone {
        total: String,
    },
    Merge {
        file_path: String,
    },
    ExtractAudio {
        file_path: String,
    },
    Destination {
        file_path: String,
    },
    AlreadyDownloaded {
        file_path: String,
    },
}

static DOWNLOAD_PROGRESS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[download\]\s+(\d+\.?\d*)%\s+of\s+~?\s*(\S+)\s+at\s+(\S+)\s+ETA\s+(\S+)")
        .expect("download progress regex is valid")
});

static DOWNLOAD_DONE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[download\]\s+100%\s+of\s+(\S+)").expect("download done regex is valid")
});

static MERGER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"\[Merger\] Merging formats into "(.+)""#).expect("merger regex is valid")
});

static EXTRACT_AUDIO: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[ExtractAudio\] Destination: (.+)").expect("extract audio regex is valid")
});

static DESTINATION: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[download\] Destination: (.+)").expect("destination regex is valid")
});

static ALREADY_DOWNLOADED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\[download\] (.+) has already been downloaded")
        .expect("already downloaded regex is valid")
});

pub fn parse_progress_line(line: &str) -> Option<ProgressUpdate> {
    if let Some(caps) = DOWNLOAD_PROGRESS.captures(line) {
        let percent: f64 = caps[1].parse().ok()?;
        return Some(ProgressUpdate::Download {
            percent,
            total: Some(caps[2].to_string()),
            speed: Some(caps[3].to_string()),
            eta: Some(caps[4].to_string()),
        });
    }

    if let Some(caps) = DOWNLOAD_DONE.captures(line) {
        return Some(ProgressUpdate::DownloadDone {
            total: caps[1].to_string(),
        });
    }

    if let Some(caps) = MERGER.captures(line) {
        return Some(ProgressUpdate::Merge {
            file_path: caps[1].to_string(),
        });
    }

    if let Some(caps) = EXTRACT_AUDIO.captures(line) {
        return Some(ProgressUpdate::ExtractAudio {
            file_path: caps[1].to_string(),
        });
    }

    if let Some(caps) = ALREADY_DOWNLOADED.captures(line) {
        return Some(ProgressUpdate::AlreadyDownloaded {
            file_path: caps[1].to_string(),
        });
    }

    if let Some(caps) = DESTINATION.captures(line) {
        return Some(ProgressUpdate::Destination {
            file_path: caps[1].to_string(),
        });
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_download_progress_with_approximate_size() {
        let line = "[download]  45.2% of ~123.45MiB at  2.50MiB/s ETA 00:32";
        let result = parse_progress_line(line);
        assert_eq!(
            result,
            Some(ProgressUpdate::Download {
                percent: 45.2,
                total: Some("123.45MiB".to_string()),
                speed: Some("2.50MiB/s".to_string()),
                eta: Some("00:32".to_string()),
            })
        );
    }

    #[test]
    fn parse_download_progress_exact_size() {
        let line = "[download]  78.3% of 512.00MiB at 10.00MiB/s ETA 00:11";
        let result = parse_progress_line(line);
        assert_eq!(
            result,
            Some(ProgressUpdate::Download {
                percent: 78.3,
                total: Some("512.00MiB".to_string()),
                speed: Some("10.00MiB/s".to_string()),
                eta: Some("00:11".to_string()),
            })
        );
    }

    #[test]
    fn parse_download_done() {
        let line = "[download] 100% of 123.45MiB in 00:49";
        let result = parse_progress_line(line);
        assert_eq!(
            result,
            Some(ProgressUpdate::DownloadDone {
                total: "123.45MiB".to_string(),
            })
        );
    }

    #[test]
    fn parse_merger() {
        let line = r#"[Merger] Merging formats into "Rick Astley - Never Gonna Give You Up.mkv""#;
        let result = parse_progress_line(line);
        assert_eq!(
            result,
            Some(ProgressUpdate::Merge {
                file_path: "Rick Astley - Never Gonna Give You Up.mkv".to_string(),
            })
        );
    }

    #[test]
    fn parse_extract_audio() {
        let line = "[ExtractAudio] Destination: song.mp3";
        let result = parse_progress_line(line);
        assert_eq!(
            result,
            Some(ProgressUpdate::ExtractAudio {
                file_path: "song.mp3".to_string(),
            })
        );
    }

    #[test]
    fn parse_destination() {
        let line = "[download] Destination: video.mp4";
        let result = parse_progress_line(line);
        assert_eq!(
            result,
            Some(ProgressUpdate::Destination {
                file_path: "video.mp4".to_string(),
            })
        );
    }

    #[test]
    fn parse_already_downloaded() {
        let line = "[download] video.mp4 has already been downloaded";
        let result = parse_progress_line(line);
        assert_eq!(
            result,
            Some(ProgressUpdate::AlreadyDownloaded {
                file_path: "video.mp4".to_string(),
            })
        );
    }

    #[test]
    fn parse_unknown_line_returns_none() {
        let line = "[info] Extracting URL: https://www.youtube.com/watch?v=test";
        assert_eq!(parse_progress_line(line), None);
    }

    #[test]
    fn parse_empty_line_returns_none() {
        assert_eq!(parse_progress_line(""), None);
    }

    #[test]
    fn parse_integer_percent() {
        let line = "[download]  5% of ~50.00MiB at 1.00MiB/s ETA 00:45";
        let result = parse_progress_line(line);
        assert!(
            matches!(result, Some(ProgressUpdate::Download { percent, .. }) if (percent - 5.0).abs() < f64::EPSILON)
        );
    }

    #[test]
    fn parse_kib_speed() {
        let line = "[download]  12.0% of ~200.00MiB at 512.00KiB/s ETA 06:23";
        let result = parse_progress_line(line);
        assert!(
            matches!(result, Some(ProgressUpdate::Download { speed: Some(s), .. }) if s == "512.00KiB/s")
        );
    }
}
