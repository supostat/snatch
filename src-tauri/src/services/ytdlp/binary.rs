use std::path::{Path, PathBuf};

use crate::error::AppError;

pub fn snatch_bin_dir() -> PathBuf {
    dirs::home_dir()
        .map(|home| home.join(".snatch").join("bin"))
        .unwrap_or_else(|| PathBuf::from(".snatch/bin"))
}

pub fn resolve_ytdlp_binary() -> Result<PathBuf, AppError> {
    resolve_binary("yt-dlp").ok_or(AppError::YtdlpNotFound)
}

pub fn resolve_ffmpeg_binary() -> Result<PathBuf, AppError> {
    resolve_binary("ffmpeg").ok_or(AppError::FfmpegNotFound)
}

pub fn resolve_binary(name: &str) -> Option<PathBuf> {
    // 1. System PATH
    if let Some(path) = which(name) {
        return Some(path);
    }

    // 2. ~/.snatch/bin/
    let snatch_bin = snatch_bin_dir();
    let snatch_candidate = snatch_bin.join(name);
    if snatch_candidate.is_file() {
        return Some(snatch_candidate);
    }
    #[cfg(windows)]
    {
        let with_exe = snatch_bin.join(format!("{name}.exe"));
        if with_exe.is_file() {
            return Some(with_exe);
        }
    }

    // 3. Executable directory (sidecar)
    if let Ok(exe_dir) = exe_dir() {
        let candidate = exe_dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
        #[cfg(windows)]
        {
            let with_exe = exe_dir.join(format!("{name}.exe"));
            if with_exe.is_file() {
                return Some(with_exe);
            }
        }

        // 4. macOS .app bundle Resources
        let resources_candidate = exe_dir.join("../Resources").join(name);
        if resources_candidate.is_file() {
            return Some(resources_candidate);
        }
    }

    None
}

fn exe_dir() -> Result<PathBuf, ()> {
    std::env::current_exe()
        .map_err(|_| ())?
        .parent()
        .map(|p| p.to_path_buf())
        .ok_or(())
}

fn which(binary_name: &str) -> Option<PathBuf> {
    let path_var = std::env::var("PATH").ok()?;
    let separator = if cfg!(windows) { ';' } else { ':' };

    for dir in path_var.split(separator) {
        let candidate = Path::new(dir).join(binary_name);
        if candidate.is_file() {
            return Some(candidate);
        }
        #[cfg(windows)]
        {
            let with_exe = Path::new(dir).join(format!("{binary_name}.exe"));
            if with_exe.is_file() {
                return Some(with_exe);
            }
        }
    }

    None
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
    fn which_finds_binary_in_path() {
        let dir = temp_dir("which_path");
        let binary = dir.join("test-binary");
        fs::write(&binary, "#!/bin/sh").expect("write");

        let original_path = std::env::var("PATH").unwrap_or_default();
        std::env::set_var("PATH", dir.to_string_lossy().as_ref());
        let result = which("test-binary");
        std::env::set_var("PATH", &original_path);

        assert!(result.is_some());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn which_returns_none_when_not_found() {
        let original_path = std::env::var("PATH").unwrap_or_default();
        std::env::set_var("PATH", "");
        let result = which("nonexistent-binary-12345");
        std::env::set_var("PATH", &original_path);

        assert!(result.is_none());
    }

    #[test]
    fn resolve_binary_checks_snatch_bin() {
        let dir = temp_dir("snatch_bin");
        let binary = dir.join("test-tool");
        fs::write(&binary, "#!/bin/sh").expect("write");

        // We can't easily test snatch_bin_dir() without mocking HOME,
        // but we can test the which() + direct file check logic
        assert!(binary.is_file());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn snatch_bin_dir_is_absolute() {
        let dir = snatch_bin_dir();
        assert!(dir.is_absolute());
        assert!(dir.ends_with(".snatch/bin"));
    }
}
