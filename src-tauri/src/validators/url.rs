use regex::Regex;
use std::sync::LazyLock;

use crate::error::AppError;

const MAX_URL_LENGTH: usize = 2048;

pub(crate) static YOUTUBE_URL_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"^https://(www\.)?(youtube\.com/(watch\?v=[\w\-]{11}|shorts/[\w\-]{11}|playlist\?list=[\w\-]+)|youtu\.be/[\w\-]{11})"
    ).expect("youtube URL regex is valid")
});

pub(crate) fn is_youtube_url(text: &str) -> bool {
    YOUTUBE_URL_REGEX.is_match(text)
}

#[derive(Debug, Clone)]
pub struct ValidatedUrl(String);

impl ValidatedUrl {
    pub fn new(url: &str) -> Result<Self, AppError> {
        if url.len() > MAX_URL_LENGTH {
            return Err(AppError::InvalidUrl(format!(
                "URL exceeds maximum length of {MAX_URL_LENGTH} characters"
            )));
        }

        if !YOUTUBE_URL_REGEX.is_match(url) {
            return Err(AppError::InvalidUrl(url.to_string()));
        }

        Ok(Self(url.to_string()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accept_standard_youtube_url() {
        let result = ValidatedUrl::new("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        assert!(result.is_ok());
        assert_eq!(
            result.unwrap().as_str(),
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        );
    }

    #[test]
    fn accept_youtube_without_www() {
        let result = ValidatedUrl::new("https://youtube.com/watch?v=dQw4w9WgXcQ");
        assert!(result.is_ok());
    }

    #[test]
    fn accept_youtu_be_short_url() {
        let result = ValidatedUrl::new("https://youtu.be/dQw4w9WgXcQ");
        assert!(result.is_ok());
    }

    #[test]
    fn accept_youtube_shorts() {
        let result = ValidatedUrl::new("https://www.youtube.com/shorts/dQw4w9WgXcQ");
        assert!(result.is_ok());
    }

    #[test]
    fn accept_youtube_playlist() {
        let result = ValidatedUrl::new("https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf");
        assert!(result.is_ok());
    }

    #[test]
    fn reject_evil_domain() {
        let result = ValidatedUrl::new("https://evil.com/watch?v=dQw4w9WgXcQ");
        assert!(result.is_err());
    }

    #[test]
    fn reject_http_without_tls() {
        let result = ValidatedUrl::new("http://www.youtube.com/watch?v=dQw4w9WgXcQ");
        assert!(result.is_err());
    }

    #[test]
    fn reject_empty_string() {
        let result = ValidatedUrl::new("");
        assert!(result.is_err());
    }

    #[test]
    fn reject_url_exceeding_max_length() {
        let long_url = format!("https://www.youtube.com/watch?v=dQw4w9WgXcQ&{}", "x".repeat(2048));
        let result = ValidatedUrl::new(&long_url);
        assert!(result.is_err());
    }

    #[test]
    fn reject_javascript_protocol() {
        let result = ValidatedUrl::new("javascript:alert('xss')");
        assert!(result.is_err());
    }

    #[test]
    fn reject_subdomain_spoofing() {
        let result = ValidatedUrl::new("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ");
        assert!(result.is_err());
    }

    #[test]
    fn reject_plain_text() {
        let result = ValidatedUrl::new("not a url at all");
        assert!(result.is_err());
    }
}
