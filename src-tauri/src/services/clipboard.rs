use std::collections::HashSet;
use std::time::Duration;

use tauri::{AppHandle, Emitter};
use tokio_util::sync::CancellationToken;

use crate::validators::url::is_youtube_url;

const POLL_INTERVAL: Duration = Duration::from_millis(1500);
const MAX_SEEN_URLS: usize = 200;

pub struct ClipboardWatcher {
    seen_urls: HashSet<String>,
    cancel_token: CancellationToken,
}

impl ClipboardWatcher {
    pub fn start(app_handle: AppHandle, auto_clipboard: bool) -> CancellationToken {
        let cancel_token = CancellationToken::new();

        if !auto_clipboard {
            return cancel_token;
        }

        let token = cancel_token.clone();
        tauri::async_runtime::spawn(async move {
            let mut watcher = Self {
                seen_urls: HashSet::new(),
                cancel_token: token.clone(),
            };
            watcher.poll_loop(app_handle).await;
        });

        cancel_token
    }

    async fn poll_loop(&mut self, app_handle: AppHandle) {
        loop {
            tokio::select! {
                _ = self.cancel_token.cancelled() => break,
                _ = tokio::time::sleep(POLL_INTERVAL) => {
                    self.check_clipboard(&app_handle);
                }
            }
        }
    }

    fn check_clipboard(&mut self, app_handle: &AppHandle) {
        let clipboard_text = match arboard::Clipboard::new().and_then(|mut cb| cb.get_text()) {
            Ok(text) => text,
            Err(_) => return,
        };

        let trimmed = clipboard_text.trim();
        if trimmed.is_empty() {
            return;
        }

        if !is_youtube_url(trimmed) {
            return;
        }

        if self.seen_urls.contains(trimmed) {
            return;
        }

        self.evict_if_full();
        self.seen_urls.insert(trimmed.to_string());
        let _ = app_handle.emit("clipboard:new-url", trimmed);
    }

    fn evict_if_full(&mut self) {
        if self.seen_urls.len() >= MAX_SEEN_URLS {
            // HashSet has no ordering; remove an arbitrary element
            if let Some(oldest) = self.seen_urls.iter().next().cloned() {
                self.seen_urls.remove(&oldest);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn evict_if_full_removes_one_when_at_capacity() {
        let mut watcher = ClipboardWatcher {
            seen_urls: HashSet::new(),
            cancel_token: CancellationToken::new(),
        };

        for i in 0..MAX_SEEN_URLS {
            watcher
                .seen_urls
                .insert(format!("https://www.youtube.com/watch?v=test{i:04}"));
        }

        assert_eq!(watcher.seen_urls.len(), MAX_SEEN_URLS);
        watcher.evict_if_full();
        assert_eq!(watcher.seen_urls.len(), MAX_SEEN_URLS - 1);
    }

    #[test]
    fn evict_if_full_does_nothing_below_capacity() {
        let mut watcher = ClipboardWatcher {
            seen_urls: HashSet::new(),
            cancel_token: CancellationToken::new(),
        };

        watcher
            .seen_urls
            .insert("https://www.youtube.com/watch?v=dQw4w9WgXcQ".to_string());

        watcher.evict_if_full();
        assert_eq!(watcher.seen_urls.len(), 1);
    }

    #[test]
    fn youtube_url_detection_reuses_validator() {
        assert!(is_youtube_url(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        ));
        assert!(is_youtube_url("https://youtu.be/dQw4w9WgXcQ"));
        assert!(is_youtube_url("https://www.youtube.com/shorts/dQw4w9WgXcQ"));
        assert!(!is_youtube_url("https://evil.com/watch?v=dQw4w9WgXcQ"));
        assert!(!is_youtube_url("not a url"));
        assert!(!is_youtube_url(""));
    }
}
