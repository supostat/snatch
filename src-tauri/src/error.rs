use serde::ser::Serializer;
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Invalid YouTube URL: {0}")]
    InvalidUrl(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("yt-dlp binary not found")]
    YtdlpNotFound,

    #[error("yt-dlp process failed: {0}")]
    YtdlpFailed(String),

    #[error("Download cancelled")]
    Cancelled,

    #[error("Settings error: {0}")]
    Settings(String),

    #[error("History error: {0}")]
    History(String),

    #[error("Clipboard error: {0}")]
    Clipboard(String),

    #[error("Dialog error: {0}")]
    Dialog(String),

    #[error("Window error: {0}")]
    Window(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
}

impl AppError {
    fn sanitized_message(&self) -> String {
        let raw = self.to_string();
        let mut sanitized = raw;

        if let Some(home) = dirs::home_dir() {
            sanitized = sanitized.replace(&home.to_string_lossy().to_string(), "<home>");
        }

        if let Some(data) = dirs::data_dir() {
            let app_data = data.join("com.snatch.app");
            sanitized = sanitized.replace(&app_data.to_string_lossy().to_string(), "<app>");
        }

        sanitized
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.sanitized_message())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serialize_invalid_url_to_string() {
        let error = AppError::InvalidUrl("evil.com".to_string());
        let json = serde_json::to_value(&error).expect("serialize error");
        assert_eq!(json, serde_json::Value::String("Invalid YouTube URL: evil.com".to_string()));
    }

    #[test]
    fn serialize_ytdlp_not_found() {
        let error = AppError::YtdlpNotFound;
        let json = serde_json::to_value(&error).expect("serialize error");
        assert_eq!(json, serde_json::Value::String("yt-dlp binary not found".to_string()));
    }

    #[test]
    fn sanitize_home_directory_from_io_error() {
        if let Some(home) = dirs::home_dir() {
            let path = home.join("secret/file.txt");
            let error = AppError::InvalidPath(path.to_string_lossy().to_string());
            let sanitized = error.sanitized_message();
            assert!(
                !sanitized.contains(&home.to_string_lossy().to_string()),
                "home directory should be sanitized, got: {sanitized}"
            );
            assert!(sanitized.contains("<home>"));
        }
    }

    #[test]
    fn from_io_error() {
        let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let app_error: AppError = io_error.into();
        assert!(matches!(app_error, AppError::Io(_)));
    }

    #[test]
    fn cancelled_display() {
        let error = AppError::Cancelled;
        assert_eq!(error.to_string(), "Download cancelled");
    }
}
