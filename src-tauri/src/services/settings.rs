use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::models::settings::Settings;

const ALLOWED_KEYS: &[&str] = &[
    "downloadDir",
    "defaultQuality",
    "embedThumbnail",
    "embedMetadata",
    "autoClipboard",
    "maxConcurrent",
    "theme",
    "showMatrixRain",
    "crtEffect",
    "locale",
    "cookiesBrowser",
];

pub struct SettingsService {
    settings: Settings,
    file_path: PathBuf,
}

impl SettingsService {
    pub fn load(path: &Path) -> Result<Self, AppError> {
        let content = std::fs::read_to_string(path)?;
        let settings: Settings = serde_json::from_str(&content)?;
        Ok(Self {
            settings,
            file_path: path.to_path_buf(),
        })
    }

    pub fn load_or_recreate(path: &Path) -> Self {
        if path.exists() {
            match Self::load(path) {
                Ok(service) => return service,
                Err(_) => {
                    let backup = path.with_extension("json.corrupted");
                    let _ = std::fs::rename(path, &backup);
                }
            }
        }

        let service = Self {
            settings: Settings::default(),
            file_path: path.to_path_buf(),
        };

        let _ = service.persist();
        service
    }

    pub fn get_all(&self) -> Settings {
        self.settings.clone()
    }

    pub fn get(&self, key: &str) -> Result<serde_json::Value, AppError> {
        validate_key(key)?;
        let json = serde_json::to_value(&self.settings)
            .map_err(|e| AppError::Settings(format!("serialization failed: {e}")))?;
        json.get(key)
            .cloned()
            .ok_or_else(|| AppError::Settings(format!("key not found: {key}")))
    }

    pub fn set(&mut self, key: &str, value: serde_json::Value) -> Result<(), AppError> {
        validate_key(key)?;

        let mut json = serde_json::to_value(&self.settings)
            .map_err(|e| AppError::Settings(format!("serialization failed: {e}")))?;

        if let Some(obj) = json.as_object_mut() {
            obj.insert(key.to_string(), value);
        }

        let updated: Settings = serde_json::from_value(json)
            .map_err(|e| AppError::Settings(format!("invalid value for {key}: {e}")))?;

        if updated.max_concurrent < 1 || updated.max_concurrent > 5 {
            return Err(AppError::Settings(
                "maxConcurrent must be between 1 and 5".to_string(),
            ));
        }

        if updated.download_dir.is_empty() {
            return Err(AppError::Settings(
                "downloadDir cannot be empty".to_string(),
            ));
        }

        self.settings = updated;
        self.persist()
    }

    fn persist(&self) -> Result<(), AppError> {
        if let Some(parent) = self.file_path.parent() {
            ensure_dir(parent)?;
        }

        let tmp_path = self.file_path.with_extension("json.tmp");
        let content = serde_json::to_string_pretty(&self.settings)?;
        std::fs::write(&tmp_path, &content)?;
        std::fs::rename(&tmp_path, &self.file_path)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o600);
            let _ = std::fs::set_permissions(&self.file_path, perms);
        }

        Ok(())
    }
}

fn validate_key(key: &str) -> Result<(), AppError> {
    if ALLOWED_KEYS.contains(&key) {
        Ok(())
    } else {
        Err(AppError::Settings(format!("unknown setting key: {key}")))
    }
}

fn ensure_dir(dir: &Path) -> Result<(), AppError> {
    if !dir.exists() {
        std::fs::create_dir_all(dir)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o700);
            let _ = std::fs::set_permissions(dir, perms);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::quality::Theme;
    use std::fs;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn temp_settings_path() -> PathBuf {
        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("snatch_settings_{id}"));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir.join("settings.json")
    }

    fn cleanup(path: &Path) {
        if let Some(parent) = path.parent() {
            let _ = fs::remove_dir_all(parent);
        }
    }

    #[test]
    fn load_or_recreate_creates_defaults_when_no_file() {
        let path = temp_settings_path();
        let service = SettingsService::load_or_recreate(&path);
        assert!(path.exists());
        assert_eq!(service.settings.max_concurrent, 3);
        assert_eq!(service.settings.theme, Theme::Green);
        cleanup(&path);
    }

    #[test]
    fn load_or_recreate_recovers_from_corrupted_json() {
        let path = temp_settings_path();
        fs::write(&path, "not valid json{{{").expect("write corrupted");

        let service = SettingsService::load_or_recreate(&path);
        assert_eq!(service.settings.max_concurrent, 3);
        assert!(path.with_extension("json.corrupted").exists());
        cleanup(&path);
    }

    #[test]
    fn load_merges_partial_json_with_defaults() {
        let path = temp_settings_path();
        fs::write(&path, r#"{"embedThumbnail": false}"#).expect("write partial");

        let service = SettingsService::load(&path).expect("load");
        assert!(!service.settings.embed_thumbnail);
        assert_eq!(service.settings.max_concurrent, 3);
        assert_eq!(service.settings.theme, Theme::Green);
        cleanup(&path);
    }

    #[test]
    fn set_and_persist_roundtrip() {
        let path = temp_settings_path();
        let mut service = SettingsService::load_or_recreate(&path);

        service
            .set("theme", serde_json::json!("amber"))
            .expect("set theme");
        service
            .set("maxConcurrent", serde_json::json!(5))
            .expect("set max_concurrent");

        let reloaded = SettingsService::load(&path).expect("reload");
        assert_eq!(reloaded.settings.theme, Theme::Amber);
        assert_eq!(reloaded.settings.max_concurrent, 5);
        cleanup(&path);
    }

    #[test]
    fn get_returns_value_for_valid_key() {
        let path = temp_settings_path();
        let service = SettingsService::load_or_recreate(&path);

        let value = service.get("maxConcurrent").expect("get");
        assert_eq!(value, serde_json::json!(3));
        cleanup(&path);
    }

    #[test]
    fn reject_unknown_key_on_set() {
        let path = temp_settings_path();
        let mut service = SettingsService::load_or_recreate(&path);

        let result = service.set("hackerMode", serde_json::json!(true));
        assert!(result.is_err());
        cleanup(&path);
    }

    #[test]
    fn reject_unknown_key_on_get() {
        let path = temp_settings_path();
        let service = SettingsService::load_or_recreate(&path);

        let result = service.get("hackerMode");
        assert!(result.is_err());
        cleanup(&path);
    }

    #[test]
    fn reject_max_concurrent_out_of_range() {
        let path = temp_settings_path();
        let mut service = SettingsService::load_or_recreate(&path);

        assert!(service.set("maxConcurrent", serde_json::json!(0)).is_err());
        assert!(service.set("maxConcurrent", serde_json::json!(6)).is_err());
        assert!(service.set("maxConcurrent", serde_json::json!(3)).is_ok());
        cleanup(&path);
    }

    #[test]
    fn reject_empty_download_dir() {
        let path = temp_settings_path();
        let mut service = SettingsService::load_or_recreate(&path);

        let result = service.set("downloadDir", serde_json::json!(""));
        assert!(result.is_err());
        cleanup(&path);
    }

    #[test]
    fn get_all_returns_clone() {
        let path = temp_settings_path();
        let service = SettingsService::load_or_recreate(&path);

        let all = service.get_all();
        assert_eq!(all.theme, service.settings.theme);
        cleanup(&path);
    }

    #[cfg(unix)]
    #[test]
    fn file_permissions_are_0600() {
        use std::os::unix::fs::PermissionsExt;

        let path = temp_settings_path();
        let _service = SettingsService::load_or_recreate(&path);

        let mode = fs::metadata(&path).expect("metadata").permissions().mode() & 0o777;
        assert_eq!(mode, 0o600);
        cleanup(&path);
    }
}
