use std::sync::atomic::Ordering;

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::error::AppError;
use crate::services::binary_downloader::{self, BinaryKind};
use crate::services::ytdlp::binary::snatch_bin_dir;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyStatus {
    pub ytdlp_available: bool,
    pub ytdlp_version: Option<String>,
    pub ffmpeg_available: bool,
}

#[tauri::command]
pub async fn check_dependencies(state: State<'_, AppState>) -> Result<DependencyStatus, AppError> {
    let ytdlp_available = state.ytdlp_runner.is_available();
    let ytdlp_version = if ytdlp_available {
        state.ytdlp_runner.get_version().await.ok()
    } else {
        None
    };

    let ffmpeg_available = state
        .ffmpeg_path
        .read()
        .map(|path| path.is_some())
        .unwrap_or(false);

    Ok(DependencyStatus {
        ytdlp_available,
        ytdlp_version,
        ffmpeg_available,
    })
}

#[tauri::command]
pub async fn download_binaries(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<DependencyStatus, AppError> {
    if state
        .binary_download_in_progress
        .swap(true, Ordering::SeqCst)
    {
        return Err(AppError::BinaryDownload(
            "download already in progress".to_string(),
        ));
    }

    let result = download_binaries_inner(&app_handle, &state).await;

    state
        .binary_download_in_progress
        .store(false, Ordering::SeqCst);

    result
}

async fn download_binaries_inner(
    app_handle: &AppHandle,
    state: &AppState,
) -> Result<DependencyStatus, AppError> {
    let bin_dir = snatch_bin_dir();

    // Download yt-dlp if not available
    if !state.ytdlp_runner.is_available() {
        let ytdlp_path =
            binary_downloader::download_binary(BinaryKind::YtDlp, &bin_dir, app_handle).await?;
        state.ytdlp_runner.update_binary_path(ytdlp_path);
    }

    // Download ffmpeg if not available
    let ffmpeg_available = state
        .ffmpeg_path
        .read()
        .map(|p| p.is_some())
        .unwrap_or(false);

    if !ffmpeg_available {
        let ffmpeg_path =
            binary_downloader::download_binary(BinaryKind::Ffmpeg, &bin_dir, app_handle).await?;
        if let Ok(mut guard) = state.ffmpeg_path.write() {
            *guard = Some(ffmpeg_path);
        }
    }

    // Return updated status
    let ytdlp_version = if state.ytdlp_runner.is_available() {
        state.ytdlp_runner.get_version().await.ok()
    } else {
        None
    };

    Ok(DependencyStatus {
        ytdlp_available: state.ytdlp_runner.is_available(),
        ytdlp_version,
        ffmpeg_available: state
            .ffmpeg_path
            .read()
            .map(|p| p.is_some())
            .unwrap_or(false),
    })
}
