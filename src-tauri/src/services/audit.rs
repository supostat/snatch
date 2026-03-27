use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

pub struct AuditService {
    file_path: PathBuf,
    session_salt: String,
}

impl AuditService {
    pub fn new(audit_dir: &Path) -> Self {
        let file_path = audit_dir.join("audit.log");

        if let Some(parent) = file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let session_salt = uuid::Uuid::new_v4().to_string();

        Self {
            file_path,
            session_salt,
        }
    }

    pub fn log_event(&self, command: &str, args: &str, result: &str) {
        let args_hash = self.hash_value(args);
        let timestamp = chrono_now_iso();

        let entry = format!(
            r#"{{"ts":"{}","cmd":"{}","args_hash":"{}","result":"{}"}}"#,
            timestamp, command, args_hash, result
        );

        if let Err(error) = self.append_line(&entry) {
            tracing::warn!("failed to write audit log: {error}");
        }
    }

    fn hash_value(&self, value: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.session_salt.as_bytes());
        hasher.update(value.as_bytes());
        let result = hasher.finalize();
        hex_encode(&result[..8])
    }

    fn append_line(&self, line: &str) -> std::io::Result<()> {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.file_path)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = file.metadata()?;
            let mut permissions = metadata.permissions();
            if permissions.mode() & 0o777 != 0o600 {
                permissions.set_mode(0o600);
                fs::set_permissions(&self.file_path, permissions)?;
            }
        }

        writeln!(file, "{line}")?;
        Ok(())
    }
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn chrono_now_iso() -> String {
    let now = std::time::SystemTime::now();
    let duration = now
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();

    let days = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    let (year, month, day) = days_to_ymd(days);

    format!("{year:04}-{month:02}-{day:02}T{hours:02}:{minutes:02}:{seconds:02}Z")
}

fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    days += 719_468;
    let era = days / 146_097;
    let day_of_era = days % 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1460 + day_of_era / 36524 - day_of_era / 146_096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let mp = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if month <= 2 { year + 1 } else { year };
    (year, month, day)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn log_event_creates_file_and_appends() {
        let temp_dir =
            std::env::temp_dir().join(format!("snatch_audit_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();

        let service = AuditService::new(&temp_dir);
        service.log_event("open_path", "/some/path", "ok");
        service.log_event("history_clear", "", "ok");

        let content = fs::read_to_string(temp_dir.join("audit.log")).unwrap();
        let lines: Vec<&str> = content.trim().lines().collect();
        assert_eq!(lines.len(), 2);
        assert!(lines[0].contains("\"cmd\":\"open_path\""));
        assert!(lines[1].contains("\"cmd\":\"history_clear\""));

        fs::remove_dir_all(&temp_dir).unwrap();
    }

    #[test]
    fn hash_value_is_deterministic_within_session() {
        let temp_dir =
            std::env::temp_dir().join(format!("snatch_audit_hash_{}", uuid::Uuid::new_v4()));
        let service = AuditService::new(&temp_dir);

        let hash1 = service.hash_value("test_input");
        let hash2 = service.hash_value("test_input");
        assert_eq!(hash1, hash2);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn hash_value_differs_for_different_inputs() {
        let temp_dir =
            std::env::temp_dir().join(format!("snatch_audit_diff_{}", uuid::Uuid::new_v4()));
        let service = AuditService::new(&temp_dir);

        let hash1 = service.hash_value("input_a");
        let hash2 = service.hash_value("input_b");
        assert_ne!(hash1, hash2);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn hash_value_differs_across_sessions() {
        let temp_dir =
            std::env::temp_dir().join(format!("snatch_audit_sess_{}", uuid::Uuid::new_v4()));
        let service1 = AuditService::new(&temp_dir);
        let service2 = AuditService::new(&temp_dir);

        let hash1 = service1.hash_value("same_input");
        let hash2 = service2.hash_value("same_input");
        assert_ne!(hash1, hash2);

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn chrono_now_iso_format() {
        let ts = chrono_now_iso();
        assert!(ts.ends_with('Z'));
        assert_eq!(ts.len(), 20);
        assert_eq!(&ts[4..5], "-");
        assert_eq!(&ts[7..8], "-");
        assert_eq!(&ts[10..11], "T");
    }
}
