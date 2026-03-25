pub mod commands;
pub mod error;
pub mod models;
pub mod services;
pub mod validators;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(error) = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
    {
        eprintln!("fatal: tauri application failed: {error}");
        std::process::exit(1);
    }
}
