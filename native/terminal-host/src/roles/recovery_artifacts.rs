use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

const LAST_SCREEN_LIMIT: usize = 2 * 1024 * 1024;
const STDERR_LIMIT: usize = 5 * 1024 * 1024;
const MAX_GENERATIONS: usize = 3;
const MAX_AGE: Duration = Duration::from_secs(7 * 24 * 60 * 60);

pub fn write_last_screen(
    root: &Path,
    incarnation: u64,
    rendered: &[u8],
) -> Result<PathBuf, String> {
    let plain = strip_terminal_controls(rendered);
    write_bounded(
        root,
        "last-screen",
        incarnation,
        &plain,
        LAST_SCREEN_LIMIT,
        "txt",
    )
}

/// Private bounded sink reserved for fixture producers; real PTY children remain merged.
pub fn write_stderr_fixture(
    root: &Path,
    incarnation: u64,
    bytes: &[u8],
) -> Result<PathBuf, String> {
    write_bounded(root, "stderr", incarnation, bytes, STDERR_LIMIT, "log")
}

fn write_bounded(
    root: &Path,
    prefix: &str,
    incarnation: u64,
    bytes: &[u8],
    limit: usize,
    extension: &str,
) -> Result<PathBuf, String> {
    std::fs::create_dir_all(root).map_err(|error| format!("create recovery directory: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(root, std::fs::Permissions::from_mode(0o700))
            .map_err(|error| format!("protect recovery directory: {error}"))?;
    }
    prune(root, prefix)?;
    let path = root.join(format!("{prefix}-{incarnation}.{extension}"));
    let bounded = &bytes[..bytes.len().min(limit)];
    crate::fault_injection::crash_at("recovery-file-during-write");
    crate::fault_injection::crash_at("recovery-file-before-rename");
    crate::durable::replace(&path, bounded).map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("protect recovery file: {error}"))?;
    }
    prune(root, prefix)?;
    Ok(path)
}

fn prune(root: &Path, prefix: &str) -> Result<(), String> {
    let now = SystemTime::now();
    let mut files = std::fs::read_dir(root)
        .map_err(|error| format!("read recovery directory: {error}"))?
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with(&format!("{prefix}-"))
        })
        .filter_map(|entry| {
            let modified = entry.metadata().ok()?.modified().ok()?;
            Some((modified, entry.path()))
        })
        .collect::<Vec<_>>();
    files.sort_by_key(|(modified, _)| *modified);
    for (_, path) in files
        .iter()
        .filter(|(modified, _)| now.duration_since(*modified).is_ok_and(|age| age > MAX_AGE))
    {
        let _ = std::fs::remove_file(path);
    }
    files.retain(|(_, path)| path.exists());
    let remove = files.len().saturating_sub(MAX_GENERATIONS);
    for (_, path) in files.into_iter().take(remove) {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}

fn strip_terminal_controls(bytes: &[u8]) -> Vec<u8> {
    let mut result = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            0x1b => {
                index += 1;
                if bytes.get(index) == Some(&b'[') {
                    index += 1;
                    while index < bytes.len() {
                        let byte = bytes[index];
                        index += 1;
                        if (0x40..=0x7e).contains(&byte) {
                            break;
                        }
                    }
                } else if index < bytes.len() {
                    index += 1;
                }
            }
            byte @ (b'\n' | b'\r' | b'\t') => {
                result.push(byte);
                index += 1;
            }
            byte if byte >= 0x20 => {
                result.push(byte);
                index += 1;
            }
            _ => index += 1,
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recovery_files_are_plain_bounded_private_and_rotated() {
        let root = tempfile::tempdir().unwrap();
        for incarnation in 1..=4 {
            write_last_screen(root.path(), incarnation, b"secret\x1b[31m screen\x1b[0m\n").unwrap();
            std::thread::sleep(Duration::from_millis(2));
        }
        let files = std::fs::read_dir(root.path()).unwrap().collect::<Vec<_>>();
        assert_eq!(files.len(), 3);
        let newest = root.path().join("last-screen-4.txt");
        let text = std::fs::read_to_string(&newest).unwrap();
        assert_eq!(text, "secret screen\n");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                std::fs::metadata(newest).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
    }

    #[test]
    fn fixture_stderr_sink_caps_content() {
        let root = tempfile::tempdir().unwrap();
        let path = write_stderr_fixture(root.path(), 1, &vec![b'x'; STDERR_LIMIT + 10]).unwrap();
        assert_eq!(std::fs::metadata(path).unwrap().len(), STDERR_LIMIT as u64);
    }
}
