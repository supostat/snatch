pub mod commands;
pub mod error;
pub mod models;
pub mod services;
pub mod validators;

use std::collections::HashMap;
use std::sync::{Mutex, RwLock};

use models::download::DownloadHandle;
use services::settings::SettingsService;
use services::ytdlp::{resolve_ytdlp_binary, YtdlpRunner};

pub struct AppState {
    pub ytdlp_runner: YtdlpRunner,
    pub active_downloads: Mutex<HashMap<String, DownloadHandle>>,
    pub settings: RwLock<SettingsService>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let binary_path = resolve_ytdlp_binary().ok();

    let settings_path = dirs::home_dir()
        .map(|home| home.join(".snatch").join("settings.json"))
        .unwrap_or_else(|| std::path::PathBuf::from("settings.json"));

    let app_state = AppState {
        ytdlp_runner: YtdlpRunner::new(binary_path),
        active_downloads: Mutex::new(HashMap::new()),
        settings: RwLock::new(SettingsService::load_or_recreate(&settings_path)),
    };

    if let Err(error) = tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::download::yt_get_info,
            commands::download::yt_download,
            commands::download::yt_cancel,
            commands::settings::settings_get_all,
            commands::settings::settings_get,
            commands::settings::settings_set,
        ])
        .run(tauri::generate_context!())
    {
        eprintln!("fatal: tauri application failed: {error}");
        std::process::exit(1);
    }
}
