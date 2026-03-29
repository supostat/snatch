use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::models::history::HistoryEntry;

const MAX_ENTRIES: usize = 500;

pub struct HistoryService {
    entries: Vec<HistoryEntry>,
    file_path: PathBuf,
}

impl HistoryService {
    pub fn load(path: &Path) -> Result<Self, AppError> {
        let content = std::fs::read_to_string(path)?;
        let entries: Vec<HistoryEntry> = serde_json::from_str(&content)?;
        Ok(Self {
            entries,
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
            entries: Vec::new(),
            file_path: path.to_path_buf(),
        };

        let _ = service.persist();
        service
    }

    pub fn get_all(&self) -> Vec<HistoryEntry> {
        self.entries.clone()
    }

    pub fn get_video_ids(&self) -> Vec<String> {
        self.entries
            .iter()
            .filter_map(|entry| entry.video_id.clone())
            .filter(|video_id| !video_id.is_empty())
            .collect()
    }

    pub fn add(&mut self, entry: HistoryEntry) -> Result<(), AppError> {
        self.entries.insert(0, entry);
        self.entries.truncate(MAX_ENTRIES);
        self.persist()
    }

    pub fn remove(&mut self, id: &str) -> Result<(), AppError> {
        let before = self.entries.len();
        self.entries.retain(|e| e.id != id);
        if self.entries.len() == before {
            return Err(AppError::History(format!("entry not found: {id}")));
        }
        self.persist()
    }

    pub fn clear(&mut self) -> Result<(), AppError> {
        self.entries.clear();
        self.persist()
    }

    fn persist(&self) -> Result<(), AppError> {
        if let Some(parent) = self.file_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)?;

                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let perms = std::fs::Permissions::from_mode(0o700);
                    let _ = std::fs::set_permissions(parent, perms);
                }
            }
        }

        let tmp_path = self.file_path.with_extension("json.tmp");
        let content = serde_json::to_string_pretty(&self.entries)?;
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn temp_history_path() -> PathBuf {
        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("snatch_history_{id}"));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir.join("history.json")
    }

    fn cleanup(path: &Path) {
        if let Some(parent) = path.parent() {
            let _ = fs::remove_dir_all(parent);
        }
    }

    fn make_entry(id: &str, title: &str) -> HistoryEntry {
        HistoryEntry {
            id: id.to_string(),
            video_id: Some(format!("vid_{id}")),
            title: title.to_string(),
            url: "https://www.youtube.com/watch?v=test".to_string(),
            file_path: "/tmp/test.mp4".to_string(),
            quality: "q1080".to_string(),
            file_size: Some(1024),
            duration: Some(60),
            channel: Some("Channel".to_string()),
            downloaded_at: "2024-01-01T00:00:00Z".to_string(),
            thumbnail: None,
        }
    }

    #[test]
    fn get_video_ids_returns_non_empty_ids() {
        let path = temp_history_path();
        let mut service = HistoryService::load_or_recreate(&path);

        let mut entry_with_id = make_entry("1", "With ID");
        entry_with_id.video_id = Some("dQw4w9WgXcQ".to_string());
        service.add(entry_with_id).expect("add");

        let mut entry_without_id = make_entry("2", "Without ID");
        entry_without_id.video_id = None;
        service.add(entry_without_id).expect("add");

        let mut entry_empty_id = make_entry("3", "Empty ID");
        entry_empty_id.video_id = Some(String::new());
        service.add(entry_empty_id).expect("add");

        let video_ids = service.get_video_ids();
        assert_eq!(video_ids.len(), 1);
        assert_eq!(video_ids[0], "dQw4w9WgXcQ");
        cleanup(&path);
    }

    #[test]
    fn load_or_recreate_creates_empty_when_no_file() {
        let path = temp_history_path();
        let service = HistoryService::load_or_recreate(&path);
        assert!(path.exists());
        assert!(service.entries.is_empty());
        cleanup(&path);
    }

    #[test]
    fn load_or_recreate_recovers_from_corrupted_json() {
        let path = temp_history_path();
        fs::write(&path, "not valid json{{{").expect("write corrupted");

        let service = HistoryService::load_or_recreate(&path);
        assert!(service.entries.is_empty());
        assert!(path.with_extension("json.corrupted").exists());
        cleanup(&path);
    }

    #[test]
    fn add_inserts_at_beginning() {
        let path = temp_history_path();
        let mut service = HistoryService::load_or_recreate(&path);

        service.add(make_entry("1", "First")).expect("add first");
        service.add(make_entry("2", "Second")).expect("add second");

        assert_eq!(service.entries[0].id, "2");
        assert_eq!(service.entries[1].id, "1");
        cleanup(&path);
    }

    #[test]
    fn fifo_eviction_at_max_entries() {
        let path = temp_history_path();
        let mut service = HistoryService::load_or_recreate(&path);

        for i in 0..MAX_ENTRIES {
            service
                .add(make_entry(&format!("id-{i}"), &format!("Video {i}")))
                .expect("add");
        }
        assert_eq!(service.entries.len(), MAX_ENTRIES);

        service
            .add(make_entry("overflow", "Overflow"))
            .expect("add overflow");
        assert_eq!(service.entries.len(), MAX_ENTRIES);
        assert_eq!(service.entries[0].id, "overflow");
        assert_eq!(service.entries.last().unwrap().id, "id-1");
        cleanup(&path);
    }

    #[test]
    fn remove_by_id() {
        let path = temp_history_path();
        let mut service = HistoryService::load_or_recreate(&path);

        service.add(make_entry("1", "First")).expect("add");
        service.add(make_entry("2", "Second")).expect("add");
        service.remove("1").expect("remove");

        assert_eq!(service.entries.len(), 1);
        assert_eq!(service.entries[0].id, "2");
        cleanup(&path);
    }

    #[test]
    fn remove_nonexistent_returns_error() {
        let path = temp_history_path();
        let mut service = HistoryService::load_or_recreate(&path);
        assert!(service.remove("nonexistent").is_err());
        cleanup(&path);
    }

    #[test]
    fn clear_removes_all() {
        let path = temp_history_path();
        let mut service = HistoryService::load_or_recreate(&path);

        service.add(make_entry("1", "First")).expect("add");
        service.add(make_entry("2", "Second")).expect("add");
        service.clear().expect("clear");

        assert!(service.entries.is_empty());
        cleanup(&path);
    }

    #[test]
    fn persist_and_reload_roundtrip() {
        let path = temp_history_path();
        let mut service = HistoryService::load_or_recreate(&path);

        service.add(make_entry("1", "First")).expect("add");
        service.add(make_entry("2", "Second")).expect("add");

        let reloaded = HistoryService::load(&path).expect("reload");
        assert_eq!(reloaded.entries.len(), 2);
        assert_eq!(reloaded.entries[0].id, "2");
        assert_eq!(reloaded.entries[1].id, "1");
        cleanup(&path);
    }

    #[test]
    fn get_all_returns_clone() {
        let path = temp_history_path();
        let mut service = HistoryService::load_or_recreate(&path);
        service.add(make_entry("1", "First")).expect("add");

        let all = service.get_all();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].title, "First");
        cleanup(&path);
    }

    #[cfg(unix)]
    #[test]
    fn file_permissions_are_0600() {
        use std::os::unix::fs::PermissionsExt;

        let path = temp_history_path();
        let mut service = HistoryService::load_or_recreate(&path);
        service.add(make_entry("1", "First")).expect("add");

        let mode = fs::metadata(&path).expect("metadata").permissions().mode() & 0o777;
        assert_eq!(mode, 0o600);
        cleanup(&path);
    }
}
