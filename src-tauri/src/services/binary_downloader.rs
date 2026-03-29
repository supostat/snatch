use std::path::{Path, PathBuf};

use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};

use crate::error::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BinaryKind {
    YtDlp,
    Ffmpeg,
}

impl BinaryKind {
    fn name(&self) -> &'static str {
        match self {
            BinaryKind::YtDlp => "yt-dlp",
            BinaryKind::Ffmpeg => "ffmpeg",
        }
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BinaryDownloadProgress {
    pub binary: String,
    pub downloaded_bytes: u64,
    pub total_bytes: Option<u64>,
    pub percent: f64,
    pub stage: String,
}

struct PlatformTarget {
    os: &'static str,
    arch: &'static str,
}

fn detect_platform() -> Result<PlatformTarget, AppError> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    match (os, arch) {
        ("macos", "aarch64") | ("macos", "x86_64") => Ok(PlatformTarget { os, arch }),
        ("linux", "x86_64") | ("linux", "aarch64") => Ok(PlatformTarget { os, arch }),
        ("windows", "x86_64") => Ok(PlatformTarget { os, arch }),
        _ => Err(AppError::UnsupportedPlatform(format!("{os}-{arch}"))),
    }
}

const ALLOWED_DOMAINS: &[&str] = &[
    "github.com",
    "objects.githubusercontent.com",
    "release-assets.githubusercontent.com",
];

fn download_url(kind: BinaryKind, platform: &PlatformTarget) -> Result<String, AppError> {
    let url = match kind {
        BinaryKind::YtDlp => match (platform.os, platform.arch) {
            ("macos", _) => "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos",
            ("linux", "x86_64") => "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux",
            ("linux", "aarch64") => "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64",
            ("windows", _) => "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
            _ => return Err(AppError::UnsupportedPlatform(format!("{}-{}", platform.os, platform.arch))),
        },
        BinaryKind::Ffmpeg => match (platform.os, platform.arch) {
            ("macos", "aarch64") => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-darwin-arm64",
            ("macos", _) => "https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-darwin-x64",
            ("linux", "x86_64") => "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz",
            ("linux", "aarch64") => "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz",
            ("windows", _) => "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
            _ => return Err(AppError::UnsupportedPlatform(format!("{}-{}", platform.os, platform.arch))),
        },
    };
    Ok(url.to_string())
}

fn checksum_url(kind: BinaryKind) -> &'static str {
    match kind {
        BinaryKind::YtDlp => {
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/SHA2-256SUMS"
        }
        BinaryKind::Ffmpeg => {
            "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/checksums.sha256"
        }
    }
}

fn binary_filename(kind: BinaryKind, platform: &PlatformTarget) -> &'static str {
    match kind {
        BinaryKind::YtDlp => match (platform.os, platform.arch) {
            ("macos", _) => "yt-dlp_macos",
            ("linux", "x86_64") => "yt-dlp_linux",
            ("linux", "aarch64") => "yt-dlp_linux_aarch64",
            ("windows", _) => "yt-dlp.exe",
            _ => "yt-dlp",
        },
        BinaryKind::Ffmpeg => match (platform.os, platform.arch) {
            ("macos", "aarch64") => "ffmpeg-darwin-arm64",
            ("macos", _) => "ffmpeg-darwin-x64",
            ("linux", "x86_64") => "ffmpeg-master-latest-linux64-gpl.tar.xz",
            ("linux", "aarch64") => "ffmpeg-master-latest-linuxarm64-gpl.tar.xz",
            ("windows", _) => "ffmpeg-master-latest-win64-gpl.zip",
            _ => "ffmpeg",
        },
    }
}

fn compute_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

fn parse_checksum_for_file(checksum_content: &str, filename: &str) -> Option<String> {
    for line in checksum_content.lines() {
        // Format: "<hash>  <filename>" (two spaces)
        if let Some((hash, name)) = line.split_once("  ") {
            if name.trim() == filename {
                return Some(hash.trim().to_lowercase());
            }
        }
    }
    None
}

async fn fetch_and_verify_checksum(
    client: &reqwest::Client,
    kind: BinaryKind,
    platform: &PlatformTarget,
    downloaded_bytes: &[u8],
) -> Result<(), AppError> {
    let url = checksum_url(kind);
    let filename = binary_filename(kind, platform);

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::BinaryDownload(format!("checksum download failed: {e}")))?;

    if !response.status().is_success() {
        tracing::warn!(
            "checksum file unavailable (HTTP {}), skipping verification for {}",
            response.status(),
            kind.name()
        );
        return Ok(());
    }

    let checksum_content = response
        .text()
        .await
        .map_err(|e| AppError::BinaryDownload(format!("checksum read failed: {e}")))?;

    let expected_hash = match parse_checksum_for_file(&checksum_content, filename) {
        Some(hash) => hash,
        None => {
            tracing::warn!(
                "checksum for {} not found in checksum file, skipping verification",
                filename
            );
            return Ok(());
        }
    };

    let actual_hash = compute_sha256(downloaded_bytes);

    if actual_hash != expected_hash {
        return Err(AppError::BinaryDownload(format!(
            "SHA256 mismatch for {}: expected {}, got {}",
            kind.name(),
            expected_hash,
            actual_hash,
        )));
    }

    tracing::info!(
        "SHA256 verified for {} ({})",
        kind.name(),
        &actual_hash[..16]
    );
    Ok(())
}

fn is_direct_ffmpeg_binary(platform: &PlatformTarget) -> bool {
    platform.os == "macos"
}

fn ffprobe_url(platform: &PlatformTarget) -> Option<&'static str> {
    match (platform.os, platform.arch) {
        ("macos", "aarch64") => Some("https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffprobe-darwin-arm64"),
        ("macos", _) => Some("https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffprobe-darwin-x64"),
        _ => None,
    }
}

fn validate_url_domain(url: &str) -> Result<(), AppError> {
    let parsed = url::Url::parse(url)
        .map_err(|_| AppError::BinaryDownload(format!("invalid URL: {url}")))?;

    let host = parsed
        .host_str()
        .ok_or_else(|| AppError::BinaryDownload("URL has no host".to_string()))?;

    if !ALLOWED_DOMAINS
        .iter()
        .any(|domain| host == *domain || host.ends_with(&format!(".{domain}")))
    {
        return Err(AppError::BinaryDownload(format!(
            "download from untrusted domain: {host}"
        )));
    }

    Ok(())
}

pub async fn download_binary(
    kind: BinaryKind,
    destination_dir: &Path,
    app_handle: &AppHandle,
) -> Result<PathBuf, AppError> {
    let platform = detect_platform()?;
    let url = download_url(kind, &platform)?;

    std::fs::create_dir_all(destination_dir)
        .map_err(|e| AppError::BinaryDownload(format!("failed to create directory: {e}")))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o700);
        let _ = std::fs::set_permissions(destination_dir, perms);
    }

    let binary_name = kind.name().to_string();

    emit_progress(app_handle, &binary_name, 0, None, 0.0, "downloading");

    let file_bytes = download_with_progress(&url, app_handle, &binary_name).await?;

    let checksum_client = reqwest::Client::new();
    fetch_and_verify_checksum(&checksum_client, kind, &platform, &file_bytes).await?;

    match kind {
        BinaryKind::YtDlp => {
            let dest = if cfg!(windows) {
                destination_dir.join("yt-dlp.exe")
            } else {
                destination_dir.join("yt-dlp")
            };
            std::fs::write(&dest, &file_bytes)
                .map_err(|e| AppError::BinaryDownload(format!("failed to write yt-dlp: {e}")))?;
            make_executable(&dest)?;
            remove_quarantine(&dest);

            emit_progress(
                app_handle,
                &binary_name,
                file_bytes.len() as u64,
                Some(file_bytes.len() as u64),
                100.0,
                "verifying",
            );
            verify_binary(&dest, &["--version"]).await?;
            emit_progress(
                app_handle,
                &binary_name,
                file_bytes.len() as u64,
                Some(file_bytes.len() as u64),
                100.0,
                "done",
            );

            Ok(dest)
        }
        BinaryKind::Ffmpeg if is_direct_ffmpeg_binary(&platform) => {
            let ffmpeg_dest = destination_dir.join("ffmpeg");
            std::fs::write(&ffmpeg_dest, &file_bytes)
                .map_err(|e| AppError::BinaryDownload(format!("failed to write ffmpeg: {e}")))?;
            make_executable(&ffmpeg_dest)?;
            remove_quarantine(&ffmpeg_dest);

            if let Some(ffprobe_download_url) = ffprobe_url(&platform) {
                let ffprobe_bytes =
                    download_with_progress(ffprobe_download_url, app_handle, "ffprobe").await?;
                let ffprobe_dest = destination_dir.join("ffprobe");
                std::fs::write(&ffprobe_dest, &ffprobe_bytes).map_err(|e| {
                    AppError::BinaryDownload(format!("failed to write ffprobe: {e}"))
                })?;
                make_executable(&ffprobe_dest)?;
                remove_quarantine(&ffprobe_dest);
            }

            emit_progress(
                app_handle,
                &binary_name,
                file_bytes.len() as u64,
                Some(file_bytes.len() as u64),
                100.0,
                "verifying",
            );
            verify_binary(&ffmpeg_dest, &["-version"]).await?;
            emit_progress(
                app_handle,
                &binary_name,
                file_bytes.len() as u64,
                Some(file_bytes.len() as u64),
                100.0,
                "done",
            );

            Ok(ffmpeg_dest)
        }
        BinaryKind::Ffmpeg => {
            emit_progress(
                app_handle,
                &binary_name,
                file_bytes.len() as u64,
                Some(file_bytes.len() as u64),
                100.0,
                "extracting",
            );

            let extracted = extract_ffmpeg(&file_bytes, destination_dir, &platform)?;

            for path in &extracted {
                make_executable(path)?;
                remove_quarantine(path);
            }

            let ffmpeg_path = extracted
                .into_iter()
                .find(|p| {
                    p.file_name()
                        .map(|n| n.to_string_lossy().starts_with("ffmpeg"))
                        .unwrap_or(false)
                })
                .ok_or_else(|| {
                    AppError::BinaryDownload("ffmpeg not found in archive".to_string())
                })?;

            emit_progress(
                app_handle,
                &binary_name,
                file_bytes.len() as u64,
                Some(file_bytes.len() as u64),
                100.0,
                "verifying",
            );
            verify_binary(&ffmpeg_path, &["-version"]).await?;
            emit_progress(
                app_handle,
                &binary_name,
                file_bytes.len() as u64,
                Some(file_bytes.len() as u64),
                100.0,
                "done",
            );

            Ok(ffmpeg_path)
        }
    }
}

async fn download_with_progress(
    url: &str,
    app_handle: &AppHandle,
    binary_name: &str,
) -> Result<Vec<u8>, AppError> {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            let url_str = attempt.url().to_string();
            if let Ok(parsed) = url::Url::parse(&url_str) {
                if let Some(host) = parsed.host_str() {
                    if ALLOWED_DOMAINS
                        .iter()
                        .any(|d| host == *d || host.ends_with(&format!(".{d}")))
                    {
                        return attempt.follow();
                    }
                }
            }
            attempt.stop()
        }))
        .build()
        .map_err(|e| AppError::BinaryDownload(format!("HTTP client error: {e}")))?;

    validate_url_domain(url)?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::BinaryDownload(format!("download failed: {e}")))?;

    if !response.status().is_success() {
        return Err(AppError::BinaryDownload(format!(
            "HTTP {}: {}",
            response.status(),
            url
        )));
    }

    let total_bytes = response.content_length();
    let mut downloaded: u64 = 0;
    let mut buffer = Vec::with_capacity(total_bytes.unwrap_or(10_000_000) as usize);
    let mut stream = response.bytes_stream();
    let mut last_emit = std::time::Instant::now();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::BinaryDownload(format!("stream error: {e}")))?;
        downloaded += chunk.len() as u64;
        buffer.extend_from_slice(&chunk);

        if last_emit.elapsed().as_millis() >= 250 {
            let percent = total_bytes
                .map(|total| (downloaded as f64 / total as f64) * 100.0)
                .unwrap_or(0.0);
            emit_progress(
                app_handle,
                binary_name,
                downloaded,
                total_bytes,
                percent,
                "downloading",
            );
            last_emit = std::time::Instant::now();
        }
    }

    if buffer.is_empty() {
        return Err(AppError::BinaryDownload(
            "downloaded file is empty".to_string(),
        ));
    }

    Ok(buffer)
}

fn extract_ffmpeg(
    archive_bytes: &[u8],
    destination_dir: &Path,
    platform: &PlatformTarget,
) -> Result<Vec<PathBuf>, AppError> {
    if platform.os == "windows" || platform.os == "macos" {
        extract_ffmpeg_from_zip(archive_bytes, destination_dir)
    } else {
        extract_ffmpeg_from_tar_xz(archive_bytes, destination_dir)
    }
}

fn extract_ffmpeg_from_zip(
    archive_bytes: &[u8],
    destination_dir: &Path,
) -> Result<Vec<PathBuf>, AppError> {
    let cursor = std::io::Cursor::new(archive_bytes);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| AppError::BinaryDownload(format!("failed to open zip: {e}")))?;

    let target_names: &[&str] = if cfg!(windows) {
        &["ffmpeg.exe", "ffprobe.exe"]
    } else {
        &["ffmpeg", "ffprobe"]
    };

    let mut extracted = Vec::new();

    let matching_entries: Vec<(usize, String)> = (0..archive.len())
        .filter_map(|i| {
            let entry = archive.by_index(i).ok()?;
            let name = entry.name().to_string();
            let file_name = Path::new(&name).file_name()?.to_string_lossy().to_string();
            if target_names.contains(&file_name.as_str()) && !entry.is_dir() {
                Some((i, file_name))
            } else {
                None
            }
        })
        .collect();

    for (index, file_name) in matching_entries {
        let mut entry = archive
            .by_index(index)
            .map_err(|e| AppError::BinaryDownload(format!("failed to read zip entry: {e}")))?;
        let dest_path = destination_dir.join(&file_name);
        let mut dest_file = std::fs::File::create(&dest_path)
            .map_err(|e| AppError::BinaryDownload(format!("failed to create {file_name}: {e}")))?;
        std::io::copy(&mut entry, &mut dest_file)
            .map_err(|e| AppError::BinaryDownload(format!("failed to extract {file_name}: {e}")))?;
        extracted.push(dest_path);
    }

    if extracted.is_empty() {
        return Err(AppError::BinaryDownload(
            "ffmpeg/ffprobe not found in archive".to_string(),
        ));
    }

    Ok(extracted)
}

fn extract_ffmpeg_from_tar_xz(
    archive_bytes: &[u8],
    destination_dir: &Path,
) -> Result<Vec<PathBuf>, AppError> {
    let xz_reader = xz2::read::XzDecoder::new(archive_bytes);
    let mut archive = tar::Archive::new(xz_reader);

    let target_names = ["ffmpeg", "ffprobe"];
    let mut extracted = Vec::new();

    for entry_result in archive
        .entries()
        .map_err(|e| AppError::BinaryDownload(format!("failed to read tar: {e}")))?
    {
        let mut entry =
            entry_result.map_err(|e| AppError::BinaryDownload(format!("tar entry error: {e}")))?;

        let entry_path = entry
            .path()
            .map_err(|e| AppError::BinaryDownload(format!("tar path error: {e}")))?
            .to_path_buf();

        let file_name = match entry_path.file_name() {
            Some(name) => name.to_string_lossy().to_string(),
            None => continue,
        };

        if target_names.contains(&file_name.as_str()) && entry.header().entry_type().is_file() {
            let dest_path = destination_dir.join(&file_name);
            let mut dest_file = std::fs::File::create(&dest_path).map_err(|e| {
                AppError::BinaryDownload(format!("failed to create {file_name}: {e}"))
            })?;
            std::io::copy(&mut entry, &mut dest_file).map_err(|e| {
                AppError::BinaryDownload(format!("failed to extract {file_name}: {e}"))
            })?;
            extracted.push(dest_path);
        }
    }

    if extracted.is_empty() {
        return Err(AppError::BinaryDownload(
            "ffmpeg/ffprobe not found in tar.xz archive".to_string(),
        ));
    }

    Ok(extracted)
}

fn make_executable(path: &Path) -> Result<(), AppError> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o755);
        std::fs::set_permissions(path, perms)
            .map_err(|e| AppError::BinaryDownload(format!("chmod failed: {e}")))?;
    }
    let _ = path;
    Ok(())
}

fn remove_quarantine(path: &Path) {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("xattr")
            .args(["-d", "com.apple.quarantine"])
            .arg(path)
            .output();
    }
    let _ = path;
}

async fn verify_binary(path: &Path, version_args: &[&str]) -> Result<(), AppError> {
    let mut cmd = tokio::process::Command::new(path);
    cmd.args(version_args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd
        .output()
        .await
        .map_err(|e| AppError::BinaryDownload(format!("verification failed: {e}")))?;

    if !output.status.success() {
        return Err(AppError::BinaryDownload(format!(
            "{} verification failed with exit code {:?}",
            path.display(),
            output.status.code()
        )));
    }

    Ok(())
}

fn emit_progress(
    app_handle: &AppHandle,
    binary: &str,
    downloaded_bytes: u64,
    total_bytes: Option<u64>,
    percent: f64,
    stage: &str,
) {
    let _ = app_handle.emit(
        "binary:download-progress",
        BinaryDownloadProgress {
            binary: binary.to_string(),
            downloaded_bytes,
            total_bytes,
            percent,
            stage: stage.to_string(),
        },
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_current_platform_succeeds() {
        let result = detect_platform();
        assert!(result.is_ok());
    }

    #[test]
    fn download_url_ytdlp_returns_github_url() {
        let platform = detect_platform().unwrap();
        let url = download_url(BinaryKind::YtDlp, &platform).unwrap();
        assert!(url.starts_with("https://github.com/yt-dlp/yt-dlp/"));
    }

    #[test]
    fn download_url_ffmpeg_returns_github_url() {
        let platform = detect_platform().unwrap();
        let url = download_url(BinaryKind::Ffmpeg, &platform).unwrap();
        assert!(url.starts_with("https://github.com/"));
    }

    #[test]
    fn validate_github_domain_passes() {
        assert!(validate_url_domain("https://github.com/yt-dlp/yt-dlp").is_ok());
        assert!(validate_url_domain("https://objects.githubusercontent.com/file").is_ok());
    }

    #[test]
    fn validate_evil_domain_fails() {
        assert!(validate_url_domain("https://evil.com/yt-dlp").is_err());
        assert!(validate_url_domain("https://github.com.evil.com/file").is_err());
    }

    #[test]
    fn binary_kind_name_matches() {
        assert_eq!(BinaryKind::YtDlp.name(), "yt-dlp");
        assert_eq!(BinaryKind::Ffmpeg.name(), "ffmpeg");
    }

    #[test]
    fn compute_sha256_produces_correct_hash() {
        let hash = compute_sha256(b"hello world");
        assert_eq!(
            hash,
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    }

    #[test]
    fn parse_checksum_finds_matching_file() {
        let content = "abc123  yt-dlp_linux\ndef456  yt-dlp_macos\nghi789  yt-dlp.exe\n";
        assert_eq!(
            parse_checksum_for_file(content, "yt-dlp_macos"),
            Some("def456".to_string())
        );
    }

    #[test]
    fn parse_checksum_returns_none_for_missing_file() {
        let content = "abc123  yt-dlp_linux\ndef456  yt-dlp_macos\n";
        assert_eq!(parse_checksum_for_file(content, "yt-dlp.exe"), None);
    }

    #[test]
    fn parse_checksum_handles_empty_content() {
        assert_eq!(parse_checksum_for_file("", "yt-dlp"), None);
    }

    #[test]
    fn checksum_url_returns_github_urls() {
        assert!(checksum_url(BinaryKind::YtDlp).contains("SHA2-256SUMS"));
        assert!(checksum_url(BinaryKind::Ffmpeg).contains("checksums.sha256"));
    }

    #[test]
    fn binary_filename_matches_download_url() {
        let platform = detect_platform().unwrap();
        let url = download_url(BinaryKind::YtDlp, &platform).unwrap();
        let filename = binary_filename(BinaryKind::YtDlp, &platform);
        assert!(url.ends_with(filename));
    }
}
