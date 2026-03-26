use tauri::State;

use crate::error::AppError;
use crate::models::settings::Settings;
use crate::AppState;

#[tauri::command]
pub async fn settings_get_all(
    state: State<'_, AppState>,
) -> Result<Settings, AppError> {
    let service = state.settings.read().map_err(|_| {
        AppError::Settings("internal lock error".to_string())
    })?;
    Ok(service.get_all())
}

#[tauri::command]
pub async fn settings_get(
    key: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, AppError> {
    let service = state.settings.read().map_err(|_| {
        AppError::Settings("internal lock error".to_string())
    })?;
    service.get(&key)
}

#[tauri::command]
pub async fn settings_set(
    key: String,
    value: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let mut service = state.settings.write().map_err(|_| {
        AppError::Settings("internal lock error".to_string())
    })?;
    service.set(&key, value)
}
