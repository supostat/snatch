use std::path::{Path, PathBuf};

use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct SafePath(PathBuf);

impl SafePath {
    pub fn new(path: &str, allowed_dirs: &[PathBuf]) -> Result<Self, AppError> {
        if path.contains('\0') {
            return Err(AppError::InvalidPath(
                "path contains null bytes".to_string(),
            ));
        }

        let path_buf = PathBuf::from(path);

        if !path_buf.is_absolute() {
            return Err(AppError::InvalidPath(format!(
                "path must be absolute: {path}"
            )));
        }

        if path.contains("..") {
            return Err(AppError::InvalidPath("path traversal detected".to_string()));
        }

        // canonicalize resolves symlinks to their real target path,
        // so the subsequent starts_with check rejects symlinks pointing outside allowed dirs
        let canonical = std::fs::canonicalize(&path_buf)
            .map_err(|_| AppError::InvalidPath(format!("path does not exist: {path}")))?;

        let is_within_allowed = allowed_dirs.iter().any(|dir| canonical.starts_with(dir));

        if !is_within_allowed {
            return Err(AppError::InvalidPath(
                "path outside allowed scope".to_string(),
            ));
        }

        Ok(Self(canonical))
    }

    pub fn as_path(&self) -> &Path {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::os::unix::fs as unix_fs;
    use std::sync::atomic::{AtomicU32, Ordering};

    static TEST_COUNTER: AtomicU32 = AtomicU32::new(0);

    fn unique_temp_dir(name: &str) -> PathBuf {
        let id = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("snatch_safepath_{name}_{id}"));
        fs::create_dir_all(&dir).expect("create temp dir");
        fs::canonicalize(&dir).expect("canonicalize temp dir")
    }

    fn cleanup_temp_dir(dir: &Path) {
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn accept_absolute_path_within_allowed_dir() {
        let allowed = unique_temp_dir("accept");
        let test_file = allowed.join("test.txt");
        fs::write(&test_file, "test").expect("write test file");

        let result = SafePath::new(&test_file.to_string_lossy(), &[allowed.clone()]);
        assert!(result.is_ok());
        assert!(result.unwrap().as_path().starts_with(&allowed));

        cleanup_temp_dir(&allowed);
    }

    #[test]
    fn reject_relative_path() {
        let allowed = unique_temp_dir("relative");
        let result = SafePath::new("relative/path.txt", &[allowed.clone()]);
        assert!(result.is_err());
        cleanup_temp_dir(&allowed);
    }

    #[test]
    fn reject_path_traversal() {
        let allowed = unique_temp_dir("traversal");
        let traversal = format!("{}/../etc/passwd", allowed.to_string_lossy());
        let result = SafePath::new(&traversal, &[allowed.clone()]);
        assert!(result.is_err());
        cleanup_temp_dir(&allowed);
    }

    #[test]
    fn reject_null_bytes() {
        let allowed = unique_temp_dir("null");
        let result = SafePath::new("/tmp/test\0.txt", &[allowed.clone()]);
        assert!(result.is_err());
        cleanup_temp_dir(&allowed);
    }

    #[test]
    fn reject_path_outside_allowed_scope() {
        let allowed = unique_temp_dir("outside");
        let result = SafePath::new("/etc/hosts", &[allowed.clone()]);
        assert!(result.is_err());
        cleanup_temp_dir(&allowed);
    }

    #[test]
    fn reject_nonexistent_path() {
        let allowed = unique_temp_dir("nonexist");
        let nonexistent = format!("{}/does_not_exist.txt", allowed.to_string_lossy());
        let result = SafePath::new(&nonexistent, &[allowed.clone()]);
        assert!(result.is_err());
        cleanup_temp_dir(&allowed);
    }

    #[test]
    fn symlink_outside_scope_rejected() {
        let allowed = unique_temp_dir("symlink_scope");
        let outside = unique_temp_dir("symlink_target");
        let outside_file = outside.join("secret.txt");
        fs::write(&outside_file, "secret").expect("write target file");

        let symlink_path = allowed.join("link_to_secret.txt");
        unix_fs::symlink(&outside_file, &symlink_path).expect("create symlink");

        let result = SafePath::new(&symlink_path.to_string_lossy(), &[allowed.clone()]);
        assert!(
            result.is_err(),
            "symlink pointing outside allowed scope must be rejected"
        );

        cleanup_temp_dir(&allowed);
        cleanup_temp_dir(&outside);
    }
}
