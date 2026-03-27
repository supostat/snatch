use tauri::State;

use crate::error::AppError;
use crate::models::history::HistoryEntry;
use crate::AppState;

#[tauri::command]
pub async fn history_get_all(state: State<'_, AppState>) -> Result<Vec<HistoryEntry>, AppError> {
    let service = state
        .history
        .read()
        .map_err(|_| AppError::History("internal lock error".to_string()))?;
    Ok(service.get_all())
}

#[tauri::command]
pub async fn history_add(entry: HistoryEntry, state: State<'_, AppState>) -> Result<(), AppError> {
    let mut service = state
        .history
        .write()
        .map_err(|_| AppError::History("internal lock error".to_string()))?;
    service.add(entry)
}

#[tauri::command]
pub async fn history_remove(id: String, state: State<'_, AppState>) -> Result<(), AppError> {
    let mut service = state
        .history
        .write()
        .map_err(|_| AppError::History("internal lock error".to_string()))?;
    service.remove(&id)
}

#[tauri::command]
pub async fn history_clear(state: State<'_, AppState>) -> Result<(), AppError> {
    let mut service = state
        .history
        .write()
        .map_err(|_| AppError::History("internal lock error".to_string()))?;
    let result = service.clear();

    if let Ok(audit) = state.audit.lock() {
        audit.log_event(
            "history_clear",
            "",
            if result.is_ok() { "ok" } else { "error" },
        );
    }

    result
}
