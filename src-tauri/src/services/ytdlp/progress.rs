use regex::Regex;
use std::sync::LazyLock;

#[derive(Debug, Clone, PartialEq)]
pub enum ProgressUpdate {
    Download {
        percent: f64,
        speed: Option<String>,
        eta: Option<String>,
        total: Option<String>,
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

// --progress-template format:
// SNATCH|<downloaded_bytes>|<total_bytes>|<total_bytes_estimate>|<speed>|<eta>|<fragment_index>|<fragment_count>
static TEMPLATE_PROGRESS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^SNATCH\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)$")
        .expect("template progress regex is valid")
});

// Legacy regex for [download] lines (100% done, etc.)
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

fn parse_opt_u64(s: &str) -> Option<u64> {
    let trimmed = s.trim();
    if trimmed.is_empty() || trimmed == "NA" || trimmed == "None" {
        return None;
    }
    trimmed.parse().ok()
}

fn parse_opt_f64(s: &str) -> Option<f64> {
    let trimmed = s.trim();
    if trimmed.is_empty() || trimmed == "NA" || trimmed == "None" {
        return None;
    }
    trimmed.parse().ok()
}

fn format_bytes(bytes: u64) -> String {
    if bytes >= 1_073_741_824 {
        format!("{:.1}GiB", bytes as f64 / 1_073_741_824.0)
    } else if bytes >= 1_048_576 {
        format!("{:.1}MiB", bytes as f64 / 1_048_576.0)
    } else if bytes >= 1024 {
        format!("{:.1}KiB", bytes as f64 / 1024.0)
    } else {
        format!("{bytes}B")
    }
}

fn format_speed(bytes_per_sec: f64) -> String {
    if bytes_per_sec >= 1_048_576.0 {
        format!("{:.1}MiB/s", bytes_per_sec / 1_048_576.0)
    } else if bytes_per_sec >= 1024.0 {
        format!("{:.1}KiB/s", bytes_per_sec / 1024.0)
    } else {
        format!("{:.0}B/s", bytes_per_sec)
    }
}

fn format_eta(seconds: f64) -> String {
    let secs = seconds as u64;
    let mins = secs / 60;
    let remaining_secs = secs % 60;
    if mins > 0 {
        format!("{mins:02}:{remaining_secs:02}")
    } else {
        format!("00:{remaining_secs:02}")
    }
}

#[cfg(test)]
fn parse_progress_line(line: &str) -> Option<ProgressUpdate> {
    parse_progress_line_ex(line, false)
}

/// When using_template is true, legacy `[download] X%` lines are ignored
/// for Download updates (they produce unstable percentages). Non-download
/// events like Merge, Destination, etc. are always parsed.
pub fn parse_progress_line_ex(line: &str, using_template: bool) -> Option<ProgressUpdate> {
    // Template-based progress (preferred, from --progress-template)
    if let Some(caps) = TEMPLATE_PROGRESS.captures(line) {
        let downloaded = parse_opt_u64(&caps[1]);
        let total_bytes = parse_opt_u64(&caps[2]);
        let total_estimate = parse_opt_u64(&caps[3]);
        let speed = parse_opt_f64(&caps[4]);
        let eta = parse_opt_f64(&caps[5]);
        let frag_index = parse_opt_u64(&caps[6]);
        let frag_count = parse_opt_u64(&caps[7]);

        // Cascading percent calculation:
        // 1. fragment_index / fragment_count (most stable for DASH/HLS)
        // 2. downloaded_bytes / total_bytes (exact when available)
        // 3. downloaded_bytes / total_bytes_estimate (approximate)
        let percent = frag_index
            .and_then(|i| {
                frag_count.map(|n| {
                    if n == 0 {
                        0.0
                    } else {
                        (i as f64 / n as f64) * 100.0
                    }
                })
            })
            .or_else(|| {
                downloaded.and_then(|d| {
                    total_bytes.or(total_estimate).map(|t| {
                        if t == 0 {
                            0.0
                        } else {
                            (d as f64 / t as f64) * 100.0
                        }
                    })
                })
            })
            .unwrap_or(0.0)
            .clamp(0.0, 100.0);

        let total_display = total_bytes.or(total_estimate).map(format_bytes);

        let speed_display = speed.map(format_speed);
        let eta_display = eta.map(format_eta);

        return Some(ProgressUpdate::Download {
            percent,
            speed: speed_display,
            eta: eta_display,
            total: total_display,
        });
    }

    // Legacy [download] progress (fallback — skip if template is active)
    if !using_template {
        if let Some(caps) = DOWNLOAD_PROGRESS.captures(line) {
            let percent: f64 = caps[1].parse().ok()?;
            return Some(ProgressUpdate::Download {
                percent,
                total: Some(caps[2].to_string()),
                speed: Some(caps[3].to_string()),
                eta: Some(caps[4].to_string()),
            });
        }
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
    fn parse_template_progress_with_fragments() {
        let line = "SNATCH|5242880|NA|10485760|1048576|5|10|20";
        let result = parse_progress_line(line);
        assert_eq!(
            result,
            Some(ProgressUpdate::Download {
                percent: 50.0,
                total: Some("10.0MiB".to_string()),
                speed: Some("1.0MiB/s".to_string()),
                eta: Some("00:05".to_string()),
            })
        );
    }

    #[test]
    fn parse_template_progress_fragments_preferred_over_bytes() {
        // fragment_index/count = 75%, bytes = 50% — fragments should win
        let line = "SNATCH|5242880|NA|10485760|2097152|3|15|20";
        let result = parse_progress_line(line);
        match result {
            Some(ProgressUpdate::Download { percent, .. }) => {
                assert!((percent - 75.0).abs() < f64::EPSILON);
            }
            _ => panic!("expected Download"),
        }
    }

    #[test]
    fn parse_template_progress_no_fragments_uses_total() {
        let line = "SNATCH|5242880|10485760|NA|1048576|2|NA|NA";
        let result = parse_progress_line(line);
        match result {
            Some(ProgressUpdate::Download { percent, .. }) => {
                assert!((percent - 50.0).abs() < f64::EPSILON);
            }
            _ => panic!("expected Download"),
        }
    }

    #[test]
    fn parse_template_progress_no_fragments_uses_estimate() {
        let line = "SNATCH|5242880|NA|10485760|1048576|2|NA|NA";
        let result = parse_progress_line(line);
        match result {
            Some(ProgressUpdate::Download { percent, .. }) => {
                assert!((percent - 50.0).abs() < f64::EPSILON);
            }
            _ => panic!("expected Download"),
        }
    }

    #[test]
    fn parse_template_progress_all_na() {
        let line = "SNATCH|NA|NA|NA|NA|NA|NA|NA";
        let result = parse_progress_line(line);
        match result {
            Some(ProgressUpdate::Download {
                percent,
                speed,
                eta,
                total,
            }) => {
                assert!((percent - 0.0).abs() < f64::EPSILON);
                assert!(speed.is_none());
                assert!(eta.is_none());
                assert!(total.is_none());
            }
            _ => panic!("expected Download"),
        }
    }

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
    fn format_bytes_units() {
        assert_eq!(format_bytes(500), "500B");
        assert_eq!(format_bytes(1536), "1.5KiB");
        assert_eq!(format_bytes(10_485_760), "10.0MiB");
        assert_eq!(format_bytes(1_610_612_736), "1.5GiB");
    }

    #[test]
    fn format_speed_units() {
        assert_eq!(format_speed(500.0), "500B/s");
        assert_eq!(format_speed(1_048_576.0), "1.0MiB/s");
        assert_eq!(format_speed(5120.0), "5.0KiB/s");
    }

    #[test]
    fn format_eta_values() {
        assert_eq!(format_eta(5.0), "00:05");
        assert_eq!(format_eta(65.0), "01:05");
        assert_eq!(format_eta(3661.0), "61:01");
    }
}
