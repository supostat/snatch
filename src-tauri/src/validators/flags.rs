use crate::error::AppError;

// Flags used by YtdlpService in Phase 2+
const YTDLP_FLAGS_WHITELIST: &[&str] = &[
    "--format",
    "-f",
    "--output",
    "-o",
    "--extract-audio",
    "-x",
    "--audio-format",
    "--audio-quality",
    "--embed-thumbnail",
    "--embed-metadata",
    "--cookies-from-browser",
    "--merge-output-format",
    "--ffmpeg-location",
    "--dump-json",
    "--no-playlist",
    "--yes-playlist",
    "--flat-playlist",
    "--playlist-items",
    "--newline",
    "--progress-template",
    "--windows-filenames",
    "--replace-in-metadata",
    "--compat-options",
];

pub fn validate_ytdlp_flags(flags: &[&str]) -> Result<(), AppError> {
    for flag in flags {
        let is_flag = flag.starts_with("--")
            || (flag.starts_with('-')
                && flag.len() > 1
                && flag.as_bytes()[1].is_ascii_alphabetic());
        if is_flag && !YTDLP_FLAGS_WHITELIST.contains(flag) {
            return Err(AppError::YtdlpFailed(format!(
                "forbidden yt-dlp flag: {flag}"
            )));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accept_whitelisted_flags() {
        let flags = vec!["-f", "bestvideo+bestaudio", "--embed-thumbnail"];
        assert!(validate_ytdlp_flags(&flags).is_ok());
    }

    #[test]
    fn accept_flag_values_without_dash() {
        let flags = vec!["-f", "bestvideo", "-o", "%(title)s.%(ext)s"];
        assert!(validate_ytdlp_flags(&flags).is_ok());
    }

    #[test]
    fn reject_exec_flag() {
        let flags = vec!["--exec", "rm -rf /"];
        assert!(validate_ytdlp_flags(&flags).is_err());
    }

    #[test]
    fn reject_batch_file_flag() {
        let flags = vec!["--batch-file", "/tmp/urls.txt"];
        assert!(validate_ytdlp_flags(&flags).is_err());
    }

    #[test]
    fn reject_config_location() {
        let flags = vec!["--config-location", "/tmp/evil.conf"];
        assert!(validate_ytdlp_flags(&flags).is_err());
    }

    #[test]
    fn accept_empty_flags() {
        let flags: Vec<&str> = vec![];
        assert!(validate_ytdlp_flags(&flags).is_ok());
    }

    #[test]
    fn accept_cookies_from_browser() {
        let flags = vec!["--cookies-from-browser", "chrome"];
        assert!(validate_ytdlp_flags(&flags).is_ok());
    }

    #[test]
    fn reject_write_subs_flag() {
        let flags = vec!["--write-subs"];
        assert!(validate_ytdlp_flags(&flags).is_err());
    }

    #[test]
    fn accept_dump_json() {
        let flags = vec!["--dump-json"];
        assert!(validate_ytdlp_flags(&flags).is_ok());
    }

    #[test]
    fn reject_downloader_args() {
        let flags = vec!["--downloader-args", "aria2c:-x16"];
        assert!(validate_ytdlp_flags(&flags).is_err());
    }
}
