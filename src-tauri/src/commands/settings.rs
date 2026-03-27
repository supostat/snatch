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
    let is_cookies_change = key == "cookiesBrowser";

    let mut service = state.settings.write().map_err(|_| {
        AppError::Settings("internal lock error".to_string())
    })?;
    let result = service.set(&key, value.clone());

    if is_cookies_change {
        let result_str = if result.is_ok() { "ok" } else { "error" };
        let args = format!("cookiesBrowser={value}");
        if let Ok(audit) = state.audit.lock() {
            audit.log_event("settings_set_cookies", &args, result_str);
        }
    }

    result
}
