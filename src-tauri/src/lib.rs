pub mod commands;
pub mod error;
pub mod models;
pub mod services;
pub mod validators;

use std::collections::HashMap;
use std::sync::Mutex;

use models::download::DownloadHandle;
use services::ytdlp::{resolve_ytdlp_binary, YtdlpRunner};

pub struct AppState {
    pub ytdlp_runner: YtdlpRunner,
    pub active_downloads: Mutex<HashMap<String, DownloadHandle>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let binary_path = resolve_ytdlp_binary().ok();

    let app_state = AppState {
        ytdlp_runner: YtdlpRunner::new(binary_path),
        active_downloads: Mutex::new(HashMap::new()),
    };

    if let Err(error) = tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::download::yt_get_info,
            commands::download::yt_download,
            commands::download::yt_cancel,
        ])
        .run(tauri::generate_context!())
    {
        eprintln!("fatal: tauri application failed: {error}");
        std::process::exit(1);
    }
}
