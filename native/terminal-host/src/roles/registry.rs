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
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistryDocument {
    pub registry_revision: u64,
    pub epoch: u64,
    pub boot_id: String,
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
}

impl RegistryStore {
    pub fn new(path: PathBuf, epoch: u64, authority: Arc<dyn RegistryAuthority>) -> Self {
        Self {
            path,
            epoch,
            authority,
            commit_gate: Arc::new(Mutex::new(())),
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

    /// A mutation is acknowledged only after durable replacement completes under current authority.
    pub fn commit(&self, document: &RegistryDocument) -> Result<(), String> {
        let _gate = self
            .commit_gate
            .lock()
            .map_err(|_| "registry commit gate poisoned".to_owned())?;
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
        durable::replace(&self.path, &bytes).map_err(|error| error.to_string())?;
        crate::fault_injection::crash_at("after-registry-commit");
        if !self.authority.is_current(self.epoch) {
            return Err("registry writer lease was lost after commit".to_owned());
        }
        Ok(())
    }
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
    fn serialized_registry_has_no_secret_or_terminal_payload_fields() {
        let bytes = serde_json::to_vec(&document(1)).unwrap();
        reject_sensitive_keys(&bytes).unwrap();
        let text = String::from_utf8(bytes).unwrap();
        assert!(!text.contains("token"));
        assert!(!text.contains("environment"));
        assert!(!text.contains("terminalContent"));
    }
}
