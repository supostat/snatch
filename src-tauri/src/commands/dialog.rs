use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::error::AppError;
use crate::validators::path::SafePath;
use crate::AppState;

#[tauri::command]
pub async fn select_folder(app_handle: AppHandle) -> Result<Option<String>, AppError> {
    let folder = app_handle.dialog().file().blocking_pick_folder();

    match folder {
        Some(file_path) => Ok(Some(file_path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn open_path(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let allowed_dirs = build_allowed_dirs();
    let _safe = SafePath::new(&path, &allowed_dirs)?;

    opener::open(&path)
        .map_err(|e| AppError::Dialog(format!("failed to open path: {e}")))?;

    // AppState used for SafePath validation context
    let _ = &state;
    Ok(())
}

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), AppError> {
    if !url.starts_with("https://") {
        return Err(AppError::Dialog(
            "only HTTPS URLs are allowed".to_string(),
        ));
    }

    opener::open(&url)
        .map_err(|e| AppError::Dialog(format!("failed to open URL: {e}")))?;

    Ok(())
}

#[tauri::command]
pub async fn show_in_folder(
    path: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let allowed_dirs = build_allowed_dirs();
    let _safe = SafePath::new(&path, &allowed_dirs)?;

    opener::reveal(&path)
        .map_err(|e| AppError::Dialog(format!("failed to reveal in folder: {e}")))?;

    let _ = &state;
    Ok(())
}

fn build_allowed_dirs() -> Vec<std::path::PathBuf> {
    let mut allowed = Vec::new();
    if let Some(download_dir) = dirs::download_dir() {
        allowed.push(download_dir);
    }
    if let Some(home) = dirs::home_dir() {
        allowed.push(home.join(".snatch"));
    }
    allowed
}
