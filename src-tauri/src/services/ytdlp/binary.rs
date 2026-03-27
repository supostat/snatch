use std::path::{Path, PathBuf};

use crate::error::AppError;

pub fn resolve_ytdlp_binary() -> Result<PathBuf, AppError> {
    let exe_dir = std::env::current_exe()
        .map_err(|_| AppError::YtdlpNotFound)?
        .parent()
        .ok_or(AppError::YtdlpNotFound)?
        .to_path_buf();

    resolve_from_dir(&exe_dir)
}

fn resolve_from_dir(exe_dir: &Path) -> Result<PathBuf, AppError> {
    let candidates = [
        exe_dir.join("yt-dlp"),
        exe_dir.join("yt-dlp.exe"),
        // macOS .app bundle: binary is in Contents/MacOS, resources in Contents/Resources
        exe_dir.join("../Resources/yt-dlp"),
    ];

    for candidate in &candidates {
        if candidate.is_file() {
            return Ok(candidate.clone());
        }
    }

    // Dev mode only: fall back to PATH lookup
    #[cfg(debug_assertions)]
    if let Ok(path) = which("yt-dlp") {
        return Ok(path);
    }

    Err(AppError::YtdlpNotFound)
}

#[cfg(debug_assertions)]
fn which(binary_name: &str) -> Result<PathBuf, AppError> {
    let path_var = std::env::var("PATH").map_err(|_| AppError::YtdlpNotFound)?;
    let separator = if cfg!(windows) { ';' } else { ':' };

    for dir in path_var.split(separator) {
        let candidate = Path::new(dir).join(binary_name);
        if candidate.is_file() {
            return Ok(candidate);
        }
    }

    Err(AppError::YtdlpNotFound)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn temp_dir(label: &str) -> PathBuf {
        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("snatch_binary_{label}_{id}"));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    #[test]
    fn resolve_finds_binary_in_exe_dir() {
        let dir = temp_dir("exe_dir");
        let binary = dir.join("yt-dlp");
        fs::write(&binary, "#!/bin/sh\necho fake").expect("write fake binary");

        let result = resolve_from_dir(&dir);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), binary);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn resolve_finds_binary_in_macos_resources() {
        // macOS layout: Contents/MacOS/snatch (exe), Contents/Resources/yt-dlp (sidecar)
        let contents_dir = temp_dir("macos_resolve");
        let macos_dir = contents_dir.join("MacOS");
        let resources_dir = contents_dir.join("Resources");
        fs::create_dir_all(&macos_dir).expect("create MacOS dir");
        fs::create_dir_all(&resources_dir).expect("create Resources dir");

        let binary = resources_dir.join("yt-dlp");
        fs::write(&binary, "#!/bin/sh\necho fake").expect("write fake binary");

        // exe_dir = Contents/MacOS, candidate = ../Resources/yt-dlp = Contents/Resources/yt-dlp
        let result = resolve_from_dir(&macos_dir);
        assert!(result.is_ok());

        let _ = fs::remove_dir_all(&contents_dir);
    }

    #[test]
    fn resolve_returns_error_when_no_binary() {
        let dir = temp_dir("empty");
        // Temporarily clear PATH so debug-mode PATH fallback doesn't find yt-dlp
        let original_path = std::env::var("PATH").unwrap_or_default();
        std::env::set_var("PATH", "");
        let result = resolve_from_dir(&dir);
        std::env::set_var("PATH", &original_path);
        assert!(result.is_err());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn resolve_prefers_exe_dir_over_resources() {
        let dir = temp_dir("prefer");
        let exe_binary = dir.join("yt-dlp");
        fs::write(&exe_binary, "exe-version").expect("write exe binary");

        let resources = dir.join("Resources");
        fs::create_dir_all(&resources).expect("create Resources");
        fs::write(resources.join("yt-dlp"), "resources-version").expect("write resources binary");

        let result = resolve_from_dir(&dir).unwrap();
        assert_eq!(result, exe_binary);

        let _ = fs::remove_dir_all(&dir);
    }
}
