use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use crate::durable;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabRecord {
    pub tab_id: String,
    pub kind: String,
    pub created_at: String,
    pub display_name: String,
    pub name_source: String,
    pub order: u32,
    pub cwd: String,
    pub session_file: Option<String>,
    pub session_dir: Option<String>,
    pub desired: String,
    pub lifecycle: String,
    pub incarnation: u64,
    pub holder_pid: Option<u32>,
    pub holder_start_identity: Option<String>,
    #[serde(default)]
    pub child_pid: Option<u32>,
    #[serde(default)]
    pub child_start_identity: Option<String>,
    pub release: String,
    pub last_exit: Option<String>,
    #[serde(default)]
    pub restarts: u8,
    #[serde(default)]
    pub restart_window_start: Option<u64>,
    #[serde(default)]
    pub requested_restart: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistryDocument {
    pub registry_revision: u64,
    pub epoch: u64,
    pub boot_id: String,
    #[serde(default)]
    pub os_session_id: String,
    pub tabs: Vec<TabRecord>,
}

pub trait RegistryAuthority: Send + Sync {
    fn is_current(&self, epoch: u64) -> bool;
}

#[derive(Clone)]
pub struct RegistryStore {
    path: PathBuf,
    epoch: u64,
    authority: Arc<dyn RegistryAuthority>,
    commit_gate: Arc<Mutex<()>>,
    failed: Arc<Mutex<Option<String>>>,
}

impl RegistryStore {
    pub fn new(path: PathBuf, epoch: u64, authority: Arc<dyn RegistryAuthority>) -> Self {
        Self {
            path,
            epoch,
            authority,
            commit_gate: Arc::new(Mutex::new(())),
            failed: Arc::new(Mutex::new(None)),
        }
    }

    pub fn read(path: &Path) -> Result<Option<RegistryDocument>, String> {
        let bytes = match std::fs::read(path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(error) => return Err(format!("read registry: {error}")),
        };
        let document: RegistryDocument = serde_json::from_slice(&bytes)
            .map_err(|error| format!("registry unreadable: {error}"))?;
        validate(&document)?;
        Ok(Some(document))
    }

    pub fn recover(path: &Path) -> Result<(Option<RegistryDocument>, Option<String>), String> {
        match Self::read(path) {
            Ok(document) => Ok((document, None)),
            Err(primary_error) if path.exists() => {
                crate::fault_injection::crash_at("registry-before-quarantine-rename");
                let stamp = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis();
                let corrupt = path.with_file_name(format!("registry.corrupt-{stamp}.json"));
                std::fs::rename(path, &corrupt)
                    .map_err(|error| format!("quarantine unreadable registry: {error}"))?;
                crate::fault_injection::crash_at("registry-after-quarantine-rename");
                let history = path
                    .parent()
                    .unwrap_or_else(|| Path::new("."))
                    .join("registry-history");
                let mut generations = std::fs::read_dir(&history)
                    .map(|entries| {
                        entries
                            .filter_map(Result::ok)
                            .map(|entry| entry.path())
                            .filter(|path| {
                                path.file_name().is_some_and(|name| {
                                    name.to_string_lossy().starts_with("registry-")
                                })
                            })
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default();
                generations.sort_by(|left, right| right.file_name().cmp(&left.file_name()));
                crate::fault_injection::crash_at("registry-before-history-load");
                for generation in generations {
                    if let Ok(Some(document)) = Self::read(&generation) {
                        return Ok((
                            Some(document),
                            Some(format!(
                                "quarantined {} and recovered {} ({primary_error})",
                                corrupt.display(),
                                generation.display()
                            )),
                        ));
                    }
                }
                Err(format!(
                    "registry recovery blocked; preserved {} and no valid history generation exists ({primary_error})",
                    corrupt.display()
                ))
            }
            Err(error) => Err(error),
        }
    }

    pub fn archive_tabset(root: &Path, document: &RegistryDocument) -> Result<PathBuf, String> {
        let history = root.join("registry-history");
        std::fs::create_dir_all(&history)
            .map_err(|error| format!("create tab-set history: {error}"))?;
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        let safe_boot = document
            .boot_id
            .chars()
            .map(|character| {
                if character.is_ascii_alphanumeric() || character == '-' {
                    character
                } else {
                    '_'
                }
            })
            .collect::<String>();
        let path = history.join(format!("tabset-{safe_boot}-{stamp}.json"));
        let bytes = serde_json::to_vec_pretty(document).map_err(|error| error.to_string())?;
        crate::fault_injection::crash_at("registry-before-tabset-move");
        durable::replace(&path, &bytes).map_err(|error| error.to_string())?;
        crate::fault_injection::crash_at("registry-after-tabset-move");
        Ok(path)
    }

    pub fn failure(&self) -> Option<String> {
        self.failed.lock().ok().and_then(|failure| failure.clone())
    }

    /// A mutation is acknowledged only after durable replacement completes under current authority.
    pub fn commit(&self, document: &RegistryDocument) -> Result<(), String> {
        let _gate = self
            .commit_gate
            .lock()
            .map_err(|_| "registry commit gate poisoned".to_owned())?;
        if let Some(reason) = self.failure() {
            return Err(format!(
                "registry persistence is degraded after an earlier failure: {reason}"
            ));
        }
        validate(document)?;
        if document.epoch != self.epoch {
            return Err("registry epoch mismatch".to_owned());
        }
        if !self.authority.is_current(self.epoch) {
            return Err("registry writer lease is not current".to_owned());
        }
        let bytes = serde_json::to_vec_pretty(document)
            .map_err(|error| format!("encode registry: {error}"))?;
        reject_sensitive_keys(&bytes)?;
        if !self.authority.is_current(self.epoch) {
            return Err("registry writer lease was lost before commit".to_owned());
        }
        if let Some(current) = Self::read(&self.path)? {
            if current.epoch == document.epoch
                && current.registry_revision > document.registry_revision
            {
                return Ok(());
            }
            if current.epoch > document.epoch {
                return Err("registry commit is fenced by a newer epoch".to_owned());
            }
        }
        crate::fault_injection::crash_at("before-registry-commit");
        let started = std::time::Instant::now();
        let mut delay = std::time::Duration::from_millis(50);
        loop {
            match replace_registry(&self.path, &bytes) {
                Ok(()) => break,
                Err(error)
                    if transient_replacement_error(&error.to_string())
                        && started.elapsed() < std::time::Duration::from_secs(10) =>
                {
                    crate::fault_injection::crash_at("registry-during-rename-retry");
                    std::thread::sleep(delay);
                    delay = delay
                        .saturating_mul(2)
                        .min(std::time::Duration::from_secs(2));
                }
                Err(error) => {
                    let reason = error.to_string();
                    if let Ok(mut failure) = self.failed.lock() {
                        *failure = Some(reason.clone());
                    }
                    return Err(reason);
                }
            }
        }
        let _ = write_history_generation(&self.path, document, &bytes);
        crate::fault_injection::crash_at("after-registry-commit");
        if !self.authority.is_current(self.epoch) {
            return Err("registry writer lease was lost after commit".to_owned());
        }
        Ok(())
    }
}

fn write_history_generation(
    registry_path: &Path,
    document: &RegistryDocument,
    bytes: &[u8],
) -> Result<(), String> {
    let root = registry_path
        .parent()
        .ok_or_else(|| "registry path has no parent".to_owned())?
        .join("registry-history");
    std::fs::create_dir_all(&root).map_err(|error| format!("create registry history: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&root, std::fs::Permissions::from_mode(0o700))
            .map_err(|error| format!("protect registry history: {error}"))?;
    }
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let path = root.join(format!(
        "registry-{:020}-{stamp}.json",
        document.registry_revision
    ));
    durable::replace(&path, bytes).map_err(|error| error.to_string())?;
    let mut generations = std::fs::read_dir(&root)
        .map_err(|error| format!("read registry history: {error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .is_some_and(|name| name.to_string_lossy().starts_with("registry-"))
        })
        .collect::<Vec<_>>();
    generations.sort();
    let remove = generations.len().saturating_sub(20);
    for stale in generations.into_iter().take(remove) {
        let _ = std::fs::remove_file(stale);
    }
    Ok(())
}

fn replace_registry(path: &Path, bytes: &[u8]) -> Result<(), durable::DurableError> {
    static EBUSY_INJECTED: std::sync::atomic::AtomicBool =
        std::sync::atomic::AtomicBool::new(false);
    match crate::fault_injection::setting("A1_TABS_FAULT_REGISTRY_REPLACE").as_deref() {
        Some("ebusy-once") if !EBUSY_INJECTED.swap(true, std::sync::atomic::Ordering::SeqCst) => {
            Err(durable::DurableError(
                "injected EBUSY replacement failure".into(),
            ))
        }
        Some("enospc") => Err(durable::DurableError(
            "injected ENOSPC replacement failure".into(),
        )),
        _ => durable::replace(path, bytes),
    }
}

fn transient_replacement_error(message: &str) -> bool {
    let message = message.to_ascii_lowercase();
    [
        "sharing violation",
        "access is denied",
        "permission denied",
        "resource busy",
        "device or resource busy",
        "ebusy",
    ]
    .iter()
    .any(|needle| message.contains(needle))
}

fn validate(document: &RegistryDocument) -> Result<(), String> {
    if document.epoch == 0 || document.boot_id.is_empty() {
        return Err("registry authority fields are invalid".to_owned());
    }
    let mut ids = std::collections::HashSet::new();
    for tab in &document.tabs {
        if tab.tab_id.is_empty() || tab.kind != "a1" || !ids.insert(&tab.tab_id) {
            return Err("registry tab identity is invalid".to_owned());
        }
        if !matches!(tab.desired.as_str(), "running" | "stopped") {
            return Err("registry desired state is invalid".to_owned());
        }
    }
    Ok(())
}

fn reject_sensitive_keys(bytes: &[u8]) -> Result<(), String> {
    let text = String::from_utf8_lossy(bytes).to_ascii_lowercase();
    for forbidden in [
        "token",
        "secret",
        "environment",
        "terminalcontent",
        "prompt",
    ] {
        if text.contains(&format!("\"{forbidden}\"")) {
            return Err(format!("registry contains forbidden field {forbidden}"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicBool, Ordering};

    struct Authority(AtomicBool);
    impl RegistryAuthority for Authority {
        fn is_current(&self, _epoch: u64) -> bool {
            self.0.load(Ordering::SeqCst)
        }
    }
    fn document(epoch: u64) -> RegistryDocument {
        RegistryDocument {
            registry_revision: 1,
            epoch,
            boot_id: "boot".into(),
            os_session_id: "session".into(),
            tabs: vec![TabRecord {
                tab_id: "tab-1".into(),
                kind: "a1".into(),
                created_at: "now".into(),
                display_name: "agent".into(),
                name_source: "default".into(),
                order: 0,
                cwd: "/work".into(),
                session_file: None,
                session_dir: None,
                desired: "running".into(),
                lifecycle: "starting".into(),
                incarnation: 1,
                holder_pid: None,
                holder_start_identity: None,
                child_pid: None,
                child_start_identity: None,
                release: "test".into(),
                last_exit: None,
                restarts: 0,
                restart_window_start: None,
                requested_restart: false,
            }],
        }
    }

    #[test]
    fn commits_before_returning_and_refuses_lost_authority_or_epoch() {
        let root = tempfile::tempdir().unwrap();
        let authority = Arc::new(Authority(AtomicBool::new(true)));
        let store = RegistryStore::new(root.path().join("registry.json"), 7, authority.clone());
        store.commit(&document(7)).unwrap();
        assert_eq!(
            RegistryStore::read(&root.path().join("registry.json")).unwrap(),
            Some(document(7))
        );
        assert!(store.commit(&document(8)).unwrap_err().contains("epoch"));
        authority.0.store(false, Ordering::SeqCst);
        assert!(store.commit(&document(7)).unwrap_err().contains("lease"));
    }

    #[test]
    fn unreadable_registry_is_quarantined_and_newest_valid_history_is_loaded() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("registry.json");
        let authority = Arc::new(Authority(AtomicBool::new(true)));
        let store = RegistryStore::new(path.clone(), 7, authority);
        let mut first = document(7);
        store.commit(&first).unwrap();
        first.registry_revision = 2;
        store.commit(&first).unwrap();
        std::fs::write(&path, b"{truncated").unwrap();
        let (recovered, notice) = RegistryStore::recover(&path).unwrap();
        assert_eq!(recovered.unwrap().registry_revision, 2);
        assert!(notice.unwrap().contains("registry.corrupt-"));
        assert!(!path.exists());
    }

    #[test]
    fn all_invalid_generations_fail_closed_and_preserve_files() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("registry.json");
        let history = root.path().join("registry-history");
        std::fs::create_dir_all(&history).unwrap();
        std::fs::write(&path, b"invalid-current").unwrap();
        std::fs::write(history.join("registry-0001.json"), b"invalid-history").unwrap();
        let error = RegistryStore::recover(&path).unwrap_err();
        assert!(error.contains("recovery blocked"));
        assert!(std::fs::read_dir(root.path()).unwrap().any(|entry| {
            entry
                .unwrap()
                .file_name()
                .to_string_lossy()
                .starts_with("registry.corrupt-")
        }));
        assert!(history.join("registry-0001.json").exists());
    }

    #[test]
    fn replacement_error_classification_is_platform_specific_and_bounded() {
        assert!(transient_replacement_error("Access is denied (os error 5)"));
        assert!(transient_replacement_error(
            "Device or resource busy (os error 16)"
        ));
        assert!(!transient_replacement_error(
            "No space left on device (os error 28)"
        ));
    }

    #[test]
    fn serialized_registry_has_no_secret_or_terminal_payload_fields() {
        let bytes = serde_json::to_vec(&document(1)).unwrap();
        reject_sensitive_keys(&bytes).unwrap();
        let text = String::from_utf8(bytes).unwrap();
        assert!(!text.contains("token"));
        assert!(!text.contains("environment"));
        assert!(!text.contains("terminalContent"));
    }
}
