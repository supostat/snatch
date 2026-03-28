pub mod commands;
pub mod error;
pub mod models;
pub mod services;
pub mod validators;

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Mutex, RwLock};

use models::download::DownloadHandle;
use services::audit::AuditService;
use services::clipboard::ClipboardWatcher;
use services::history::HistoryService;
use services::settings::SettingsService;
use services::ytdlp::{resolve_ffmpeg_binary, resolve_ytdlp_binary, YtdlpRunner};

pub struct AppState {
    pub ytdlp_runner: YtdlpRunner,
    pub ffmpeg_path: RwLock<Option<PathBuf>>,
    pub active_downloads: Mutex<HashMap<String, DownloadHandle>>,
    pub settings: RwLock<SettingsService>,
    pub history: RwLock<HistoryService>,
    pub audit: Mutex<AuditService>,
    pub binary_download_in_progress: AtomicBool,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "snatch=info".parse().expect("valid filter")),
        )
        .init();
    let binary_path = resolve_ytdlp_binary().ok();
    let ffmpeg_path = resolve_ffmpeg_binary().ok();

    let snatch_dir = dirs::home_dir()
        .map(|home| home.join(".snatch"))
        .unwrap_or_else(|| std::path::PathBuf::from(".snatch"));

    let settings_service = SettingsService::load_or_recreate(&snatch_dir.join("settings.json"));
    let auto_clipboard = settings_service.get_all().auto_clipboard;

    let app_state = AppState {
        ytdlp_runner: YtdlpRunner::new(binary_path),
        ffmpeg_path: RwLock::new(ffmpeg_path),
        active_downloads: Mutex::new(HashMap::new()),
        settings: RwLock::new(settings_service),
        history: RwLock::new(HistoryService::load_or_recreate(
            &snatch_dir.join("history.json"),
        )),
        audit: Mutex::new(AuditService::new(&snatch_dir)),
        binary_download_in_progress: AtomicBool::new(false),
    };

    if let Err(error) = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .setup(move |app| {
            ClipboardWatcher::start(app.handle().clone(), auto_clipboard);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::download::yt_get_info,
            commands::download::yt_download,
            commands::download::yt_cancel,
            commands::settings::settings_get_all,
            commands::settings::settings_get,
            commands::settings::settings_set,
            commands::history::history_get_all,
            commands::history::history_add,
            commands::history::history_remove,
            commands::history::history_clear,
            commands::dialog::select_folder,
            commands::dialog::open_path,
            commands::dialog::open_url,
            commands::dialog::show_in_folder,
            commands::window::window_minimize,
            commands::window::window_close,
            commands::window::window_is_fullscreen,
            commands::window::window_set_fullscreen,
            commands::window::get_downloads_path,
            commands::window::get_app_version,
            commands::system::check_dependencies,
            commands::system::download_binaries,
        ])
        .run(tauri::generate_context!())
    {
        eprintln!("fatal: tauri application failed: {error}");
        std::process::exit(1);
    }
}
