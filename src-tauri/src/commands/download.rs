use tauri::{AppHandle, State};
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::models::download::{DownloadHandle, DownloadOptions, DownloadResult};
use crate::models::quality::CookiesBrowser;
use crate::models::video_info::VideoInfo;
use crate::validators::path::SafePath;
use crate::validators::url::ValidatedUrl;
use crate::AppState;

#[tauri::command]
pub async fn yt_get_info(
    url: String,
    cookies_browser: CookiesBrowser,
    state: State<'_, AppState>,
) -> Result<VideoInfo, AppError> {
    let validated_url = ValidatedUrl::new(&url)?;
    state
        .ytdlp_runner
        .get_info(&validated_url, &cookies_browser)
        .await
}

#[tauri::command]
pub async fn yt_download(
    options: DownloadOptions,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<DownloadResult, AppError> {
    let validated_url = ValidatedUrl::new(&options.url)?;

    let mut allowed_dirs = Vec::new();
    if let Some(download_dir) = dirs::download_dir() {
        allowed_dirs.push(download_dir);
    }
    if let Some(home) = dirs::home_dir() {
        allowed_dirs.push(home.join(".snatch"));
    }
    let safe_path = SafePath::new(&options.output_dir, &allowed_dirs)?;

    let download_id = options.download_id.clone();
    let cancel_token = CancellationToken::new();

    {
        let mut downloads = state
            .active_downloads
            .lock()
            .map_err(|_| AppError::YtdlpFailed("internal lock error".to_string()))?;
        downloads.insert(
            download_id.clone(),
            DownloadHandle {
                cancel_token: cancel_token.clone(),
            },
        );
    }

    let result = state
        .ytdlp_runner
        .download(
            download_id.clone(),
            &validated_url,
            &options,
            &safe_path,
            cancel_token,
            app_handle,
        )
        .await;

    {
        let mut downloads = state
            .active_downloads
            .lock()
            .map_err(|_| AppError::YtdlpFailed("internal lock error".to_string()))?;
        downloads.remove(&download_id);
    }

    result
}

#[tauri::command]
pub async fn yt_cancel(download_id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let cancel_token = {
        let downloads = state
            .active_downloads
            .lock()
            .map_err(|_| AppError::YtdlpFailed("internal lock error".to_string()))?;
        match downloads.get(&download_id) {
            Some(handle) => handle.cancel_token.clone(),
            None => {
                return Err(AppError::YtdlpFailed(format!(
                    "download not found: {download_id}"
                )));
            }
        }
    };

    cancel_token.cancel();
    Ok(())
}
