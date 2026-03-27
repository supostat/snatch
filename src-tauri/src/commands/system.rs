use serde::Serialize;
use tauri::State;

use crate::error::AppError;
use crate::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyStatus {
    pub ytdlp_available: bool,
    pub ytdlp_version: Option<String>,
}

#[tauri::command]
pub async fn check_dependencies(state: State<'_, AppState>) -> Result<DependencyStatus, AppError> {
    let ytdlp_available = state.ytdlp_runner.is_available();
    let ytdlp_version = if ytdlp_available {
        state.ytdlp_runner.get_version().await.ok()
    } else {
        None
    };

    Ok(DependencyStatus {
        ytdlp_available,
        ytdlp_version,
    })
}
