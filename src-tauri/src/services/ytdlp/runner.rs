use std::path::{Path, PathBuf};
use std::time::Instant;

use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio_util::sync::CancellationToken;

use crate::error::AppError;
use crate::models::download::{DownloadOptions, DownloadProgress, DownloadResult};
use crate::models::quality::{CookiesBrowser, DownloadStage};
use crate::models::video_info::VideoInfo;
use crate::validators::flags::validate_ytdlp_flags;
use crate::validators::path::SafePath;
use crate::validators::url::ValidatedUrl;

use super::formats;
use super::info;
use super::progress::{self, ProgressUpdate};

const PROGRESS_THROTTLE_MS: u128 = 250;
const CANCEL_GRACE_PERIOD_SECS: u64 = 5;

pub struct YtdlpRunner {
    binary_path: std::sync::RwLock<Option<PathBuf>>,
}

impl YtdlpRunner {
    pub fn new(binary_path: Option<PathBuf>) -> Self {
        Self {
            binary_path: std::sync::RwLock::new(binary_path),
        }
    }

    fn get_binary_path(&self) -> Result<PathBuf, AppError> {
        self.binary_path
            .read()
            .map_err(|_| AppError::YtdlpFailed("lock error".to_string()))?
            .clone()
            .ok_or(AppError::YtdlpNotFound)
    }

    pub fn is_available(&self) -> bool {
        self.binary_path
            .read()
            .map(|path| path.is_some())
            .unwrap_or(false)
    }

    pub fn update_binary_path(&self, path: PathBuf) {
        if let Ok(mut guard) = self.binary_path.write() {
            *guard = Some(path);
        }
    }

    pub async fn get_version(&self) -> Result<String, AppError> {
        let binary = self.get_binary_path()?;
        let output = Command::new(&binary)
            .arg("--version")
            .output()
            .await
            .map_err(|e| AppError::YtdlpFailed(format!("failed to get version: {e}")))?;

        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if version.is_empty() {
            return Err(AppError::YtdlpFailed("empty version output".to_string()));
        }
        Ok(version)
    }

    pub async fn get_info(
        &self,
        url: &ValidatedUrl,
        cookies_browser: &CookiesBrowser,
    ) -> Result<VideoInfo, AppError> {
        let binary = self.get_binary_path()?;
        let args = formats::build_info_args(url, cookies_browser);

        let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        validate_ytdlp_flags(&args_refs)?;

        let output = Command::new(binary)
            .args(&args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| AppError::YtdlpFailed(format!("failed to spawn yt-dlp: {e}")))?
            .wait_with_output()
            .await
            .map_err(|e| AppError::YtdlpFailed(format!("yt-dlp process error: {e}")))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::YtdlpFailed(
                stderr.lines().last().unwrap_or("unknown error").to_string(),
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        info::parse_video_info(&stdout)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn download(
        &self,
        download_id: String,
        url: &ValidatedUrl,
        options: &DownloadOptions,
        output_dir: &SafePath,
        ffmpeg_location: Option<&Path>,
        cancel_token: CancellationToken,
        app_handle: AppHandle,
    ) -> Result<DownloadResult, AppError> {
        let binary = self.get_binary_path()?;
        let args = formats::build_download_args(url, options, output_dir, ffmpeg_location);

        tracing::info!(binary = %binary.display(), args = ?args, "spawning yt-dlp download");

        let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        validate_ytdlp_flags(&args_refs)?;

        let mut child = Command::new(&binary)
            .args(&args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| AppError::YtdlpFailed(format!("failed to spawn yt-dlp: {e}")))?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| AppError::YtdlpFailed("failed to capture stdout".to_string()))?;

        let mut reader = BufReader::new(stdout).lines();
        let mut last_emit = Instant::now();
        let mut last_file_path: Option<String> = None;
        let mut current_stage = DownloadStage::Downloading;
        let is_video = !options.quality.is_audio_only();
        let mut download_pass: u8 = 0;
        let total_passes: u8 = if is_video { 2 } else { 1 };
        let mut pass_max_percent: f64 = 0.0;
        let mut using_template = false;

        loop {
            tokio::select! {
                line_result = reader.next_line() => {
                    match line_result {
                        Ok(Some(line)) => {
                            // Once we receive a template line, ignore legacy [download] progress
                            if line.starts_with("SNATCH|") {
                                using_template = true;
                            }
                            if let Some(update) = progress::parse_progress_line_ex(&line, using_template) {
                                match &update {
                                    ProgressUpdate::Download { percent, speed, eta, total } => {
                                        if last_emit.elapsed().as_millis() >= PROGRESS_THROTTLE_MS {
                                            if *percent > pass_max_percent {
                                                pass_max_percent = *percent;
                                            }
                                            let pass_label = make_pass_label(download_pass, total_passes);
                                            let _ = app_handle.emit("yt:progress", &make_progress(
                                                &download_id, pass_max_percent, &current_stage, speed.clone(), eta.clone(), total.clone(), pass_label,
                                            ));
                                            last_emit = Instant::now();
                                        }
                                    }
                                    ProgressUpdate::DownloadDone { .. } => {
                                        let pass_label = make_pass_label(download_pass, total_passes);
                                        let _ = app_handle.emit("yt:progress", &make_progress(
                                            &download_id, 100.0, &current_stage, None, None, None, pass_label,
                                        ));
                                        download_pass += 1;
                                        pass_max_percent = 0.0;
                                    }
                                    ProgressUpdate::Merge { file_path } => {
                                        current_stage = DownloadStage::Merging;
                                        last_file_path = Some(file_path.clone());
                                        let _ = app_handle.emit("yt:progress", &make_progress(
                                            &download_id, 100.0, &current_stage, None, None, None, None,
                                        ));
                                    }
                                    ProgressUpdate::ExtractAudio { file_path } => {
                                        current_stage = DownloadStage::Converting;
                                        last_file_path = Some(file_path.clone());
                                        let _ = app_handle.emit("yt:progress", &make_progress(
                                            &download_id, 100.0, &current_stage, None, None, None, None,
                                        ));
                                    }
                                    ProgressUpdate::Destination { file_path } => {
                                        // Each new Destination = new download pass
                                        // First Destination is pass 0 (already set), subsequent ones increment
                                        if last_file_path.is_some() {
                                            download_pass += 1;
                                            pass_max_percent = 0.0;
                                        }
                                        last_file_path = Some(file_path.clone());
                                    }
                                    ProgressUpdate::AlreadyDownloaded { file_path } => {
                                        last_file_path = Some(file_path.clone());
                                    }
                                }
                            }
                        }
                        Ok(None) => break,
                        Err(e) => {
                            return Err(AppError::YtdlpFailed(
                                format!("error reading yt-dlp output: {e}"),
                            ));
                        }
                    }
                }
                _ = cancel_token.cancelled() => {
                    return Self::cancel_child(&mut child).await;
                }
            }
        }

        let status = child
            .wait()
            .await
            .map_err(|e| AppError::YtdlpFailed(format!("failed to wait for yt-dlp: {e}")))?;

        if !status.success() {
            if let Some(mut stderr) = child.stderr.take() {
                let mut stderr_buf = String::new();
                let _ = tokio::io::AsyncReadExt::read_to_string(&mut stderr, &mut stderr_buf).await;
                if !stderr_buf.is_empty() {
                    tracing::error!(stderr = %stderr_buf, "yt-dlp failed");
                    let last_line = stderr_buf.lines().last().unwrap_or("unknown error");
                    return Err(AppError::YtdlpFailed(last_line.to_string()));
                }
            }
            return Err(AppError::YtdlpFailed(
                "yt-dlp exited with non-zero status".to_string(),
            ));
        }

        let _ = app_handle.emit(
            "yt:progress",
            &make_progress(
                &download_id,
                100.0,
                &DownloadStage::Done,
                None,
                None,
                None,
                None,
            ),
        );

        let file_size = last_file_path
            .as_deref()
            .and_then(|p| std::fs::metadata(p).ok())
            .map(|m| m.len());

        Ok(DownloadResult {
            download_id,
            file_path: last_file_path,
            file_size,
            success: true,
            error: None,
        })
    }

    async fn cancel_child(child: &mut tokio::process::Child) -> Result<DownloadResult, AppError> {
        #[cfg(unix)]
        if let Some(pid) = child.id() {
            let _ = nix::sys::signal::kill(
                nix::unistd::Pid::from_raw(pid as i32),
                nix::sys::signal::Signal::SIGTERM,
            );
        }

        #[cfg(windows)]
        {
            let _ = child.kill().await;
        }

        #[cfg(unix)]
        match tokio::time::timeout(
            std::time::Duration::from_secs(CANCEL_GRACE_PERIOD_SECS),
            child.wait(),
        )
        .await
        {
            Ok(_) => {}
            Err(_) => {
                let _ = child.kill().await;
            }
        }

        Err(AppError::Cancelled)
    }
}

fn make_pass_label(current_pass: u8, total_passes: u8) -> Option<String> {
    if total_passes <= 1 {
        return None;
    }
    let label = if current_pass == 0 { "Video" } else { "Audio" };
    Some(format!("{}/{} {}", current_pass + 1, total_passes, label))
}

fn make_progress(
    download_id: &str,
    percent: f64,
    stage: &DownloadStage,
    speed: Option<String>,
    eta: Option<String>,
    total: Option<String>,
    pass: Option<String>,
) -> DownloadProgress {
    DownloadProgress {
        download_id: download_id.to_string(),
        percent,
        speed,
        eta,
        downloaded: None,
        total,
        stage: stage.clone(),
        pass,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn runner_without_binary_returns_not_found() {
        let runner = YtdlpRunner::new(None);
        assert!(runner.get_binary_path().is_err());
        assert!(!runner.is_available());
    }

    #[test]
    fn runner_with_binary_returns_path() {
        let path = PathBuf::from("/usr/local/bin/yt-dlp");
        let runner = YtdlpRunner::new(Some(path.clone()));
        assert_eq!(runner.get_binary_path().unwrap(), path);
        assert!(runner.is_available());
    }

    #[test]
    fn runner_update_binary_path() {
        let runner = YtdlpRunner::new(None);
        assert!(!runner.is_available());
        runner.update_binary_path(PathBuf::from("/tmp/yt-dlp"));
        assert!(runner.is_available());
        assert_eq!(
            runner.get_binary_path().unwrap(),
            PathBuf::from("/tmp/yt-dlp")
        );
    }

    #[test]
    fn make_progress_creates_correct_payload() {
        let payload = make_progress(
            "test-id",
            50.0,
            &DownloadStage::Downloading,
            Some("1MiB/s".into()),
            None,
            None,
            Some("1/2 Video".into()),
        );
        assert_eq!(payload.download_id, "test-id");
        assert!((payload.percent - 50.0).abs() < f64::EPSILON);
        assert_eq!(payload.stage, DownloadStage::Downloading);
        assert_eq!(payload.speed, Some("1MiB/s".into()));
    }
}
