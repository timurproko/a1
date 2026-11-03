//! Metadata-only artifact holds for private recovery. Never read or export checkpoint contents.
use super::registry::RegistryStore;
use std::collections::{BTreeSet, HashSet};
use std::io::Read;
use std::path::{Component, Path, PathBuf};
use std::time::{Duration, SystemTime};

const AGE: Duration = Duration::from_secs(7 * 24 * 60 * 60);
const RECORD_BYTES: usize = 2 * 1024 * 1024;

pub(super) fn collect(namespaces: &[PathBuf]) -> Result<Vec<String>, String> {
    let mut roots = BTreeSet::new();
    let mut budget = 16 * 1024 * 1024;
    let now = SystemTime::now();
    for namespace in namespaces {
        let mut seen = HashSet::new();
        for path in registries(namespace)? {
            let Some(bytes) = record(&path, &mut budget)? else {
                continue;
            };
            let registry = RegistryStore::parse(&bytes)?;
            for tab in registry.tabs {
                if !seen.insert((tab.tab_id.clone(), tab.release.clone())) {
                    continue;
                }
                if has_custody(namespace, &tab.tab_id, now)? {
                    roots.insert(tab.release);
                }
            }
        }
    }
    Ok(roots.into_iter().collect())
}
fn registries(namespace: &Path) -> Result<Vec<PathBuf>, String> {
    let mut paths = vec![namespace.join("registry.json")];
    let history = namespace.join("registry-history");
    if !directory(&history)? {
        return Ok(paths);
    }
    for (index, entry) in std::fs::read_dir(&history)
        .map_err(|_| "inspect recovery registry history")?
        .enumerate()
    {
        if index >= 64 {
            return Err("recovery registry history bound exceeded".into());
        }
        let entry = entry.map_err(|_| "read recovery registry history")?;
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.ends_with(".json") && (name.starts_with("registry-") || name.starts_with("tabset-"))
        {
            paths.push(entry.path());
        }
    }
    Ok(paths)
}
fn record(path: &Path, budget: &mut usize) -> Result<Option<Vec<u8>>, String> {
    let metadata = match std::fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err("recovery registry is unreadable".into()),
    };
    if !metadata.is_file()
        || metadata.file_type().is_symlink()
        || metadata.len() > RECORD_BYTES.min(*budget) as u64
    {
        return Err("recovery registry boundary exceeded".into());
    }
    let mut bytes = Vec::new();
    std::fs::File::open(path)
        .map_err(|_| "open recovery registry")?
        .take(RECORD_BYTES.min(*budget) as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "read recovery registry")?;
    if bytes.len() > RECORD_BYTES.min(*budget) {
        return Err("recovery registry byte budget exceeded".into());
    }
    *budget -= bytes.len();
    Ok(Some(bytes))
}
fn directory(path: &Path) -> Result<bool, String> {
    let metadata = match std::fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(_) => return Err("recovery directory is unreadable".into()),
    };
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err("recovery directory boundary is invalid".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        if metadata.uid() != unsafe { libc::geteuid() } || metadata.mode() & 0o022 != 0 {
            return Err("recovery directory ownership is unverified".into());
        }
    }
    Ok(true)
}
fn has_custody(namespace: &Path, tab: &str, now: SystemTime) -> Result<bool, String> {
    let mut components = Path::new(tab).components();
    if !matches!(components.next(), Some(Component::Normal(_))) || components.next().is_some() {
        return Err("recovery tab identity is invalid".into());
    }
    let directory_path = namespace.join(tab);
    if !directory(&directory_path)? {
        return Ok(false);
    }
    for name in ["draft.json", "journal.jsonl", "recovery"] {
        let path = directory_path.join(name);
        let metadata = match std::fs::symlink_metadata(&path) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(_) => return Err("private recovery metadata is unreadable".into()),
        };
        if metadata.file_type().is_symlink()
            || !(metadata.is_file() || name == "recovery" && metadata.is_dir())
        {
            return Err("private recovery boundary is invalid".into());
        }
        let modified = metadata
            .modified()
            .map_err(|_| "private recovery age is unavailable")?;
        if now.duration_since(modified).map_or(true, |age| age <= AGE) {
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn checkpoints_hold_artifacts_without_being_read_and_expire_without_deleting_data() {
        let root = tempfile::tempdir().unwrap();
        let tab = root.path().join("tab-1");
        std::fs::create_dir(&tab).unwrap();
        let path = tab.join("draft.json");
        std::fs::write(&path, b"private fixture draft, deliberately not JSON").unwrap();
        assert!(has_custody(root.path(), "tab-1", SystemTime::now()).unwrap());
        let after = SystemTime::now() + AGE + Duration::from_secs(1);
        assert!(!has_custody(root.path(), "tab-1", after).unwrap());
        assert!(path.exists());
        assert!(has_custody(root.path(), "../outside", SystemTime::now()).is_err());
    }
    #[test]
    fn unknown_age_retains_custody_instead_of_expiring_it() {
        let root = tempfile::tempdir().unwrap();
        let tab = root.path().join("tab");
        std::fs::create_dir(&tab).unwrap();
        std::fs::write(tab.join("journal.jsonl"), b"private fixture").unwrap();
        assert!(has_custody(root.path(), "tab", SystemTime::UNIX_EPOCH).unwrap());
    }
    #[cfg(unix)]
    #[test]
    fn linked_checkpoints_are_not_followed() {
        let root = tempfile::tempdir().unwrap();
        let tab = root.path().join("tab");
        std::fs::create_dir(&tab).unwrap();
        std::os::unix::fs::symlink("/unread/foreign", tab.join("draft.json")).unwrap();
        assert!(has_custody(root.path(), "tab", SystemTime::now()).is_err());
    }
}
