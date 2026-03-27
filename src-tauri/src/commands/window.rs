use tauri::AppHandle;

use crate::error::AppError;

#[tauri::command]
pub async fn window_minimize(window: tauri::Window) -> Result<(), AppError> {
    window
        .minimize()
        .map_err(|e| AppError::Window(format!("minimize failed: {e}")))
}

#[tauri::command]
pub async fn window_close(window: tauri::Window) -> Result<(), AppError> {
    window
        .close()
        .map_err(|e| AppError::Window(format!("close failed: {e}")))
}

#[tauri::command]
pub async fn window_is_fullscreen(window: tauri::Window) -> Result<bool, AppError> {
    window
        .is_fullscreen()
        .map_err(|e| AppError::Window(format!("fullscreen check failed: {e}")))
}

#[tauri::command]
pub async fn window_set_fullscreen(
    fullscreen: bool,
    window: tauri::Window,
) -> Result<(), AppError> {
    window
        .set_fullscreen(fullscreen)
        .map_err(|e| AppError::Window(format!("fullscreen failed: {e}")))
}

#[tauri::command]
pub async fn get_downloads_path() -> Result<String, AppError> {
    dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| AppError::Dialog("cannot determine downloads directory".to_string()))
}

#[tauri::command]
pub async fn get_app_version(app_handle: AppHandle) -> Result<String, AppError> {
    Ok(app_handle.config().version.clone().unwrap_or_else(|| "unknown".to_string()))
}
