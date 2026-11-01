//! Explicit read-only source custody for a newer control plane. Generic same-release admission,
//! source registry writers, holders and bridges retain their original authority checks.

use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Duration;

use super::{credentials::ProfileCredentials, maintain, registry::RegistryStore, scope};
use crate::identity::ProcessIdentity;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Owner {
    pid: u32,
    start_identity: String,
    endpoint: String,
    generation: u16,
    verified: bool,
    release_id: String,
    release_root: Option<String>,
}

pub enum SourceRead {
    Description,
    Tabs,
    Status,
}

/// Not constructible from an endpoint or unchecked expected-release string. Opening this route
/// verifies profile/namespace, exact source identity, live native owner and existing credentials.
/// It never loads or executes the source's code and cannot start, stop or restart an Agent.
pub struct SourceRoute {
    scope: String,
    release_id: String,
    epoch: u64,
    owner: ProcessIdentity,
    endpoint: String,
    token: [u8; 32],
}

impl SourceRoute {
    /// Callers that later execute a source artifact must separately certify its immutable payload;
    /// this read-only route establishes control custody, not permission to execute arbitrary code.
    pub fn open(profile: &Path, data: &Path, release_root: &Path) -> Result<Self, String> {
        let root =
            std::fs::canonicalize(release_root).map_err(|_| "resolve resident source root")?;
        let release = scope::release_id_for_root(&root)?;
        Self::verify(profile, data, &root, release, false)
    }

    #[cfg(feature = "resident-fixtures")]
    pub fn open_fixture(
        profile: &Path,
        data: &Path,
        release_root: &Path,
        executable: &Path,
    ) -> Result<Self, String> {
        let root =
            std::fs::canonicalize(release_root).map_err(|_| "resolve fixture source root")?;
        let executable =
            std::fs::canonicalize(executable).map_err(|_| "resolve fixture source custody")?;
        if executable.parent() != Some(root.as_path()) {
            return Err("fixture source custody mismatch".into());
        }
        Self::verify(
            profile,
            data,
            &root,
            scope::fixture_release_id(&executable)?,
            true,
        )
    }

    fn verify(
        profile: &Path,
        data: &Path,
        release_root: &Path,
        release_id: String,
        fixture: bool,
    ) -> Result<Self, String> {
        let token = scope::token_for(profile, &release_id)?;
        let data = std::fs::canonicalize(data).map_err(|_| "resolve resident source data")?;
        let parent = data.join("tabs");
        directory(&parent, false)?;
        let root = parent.join(&token);
        directory(&root, true)?;
        let owner: Owner = serde_json::from_slice(&record(&root.join("server.json"), 65536)?)
            .map_err(|_| "resident source owner is unreadable")?;
        if !owner.verified
            || owner.generation != crate::protocol::GENERATION
            || owner.release_id != release_id
            || owner.endpoint.is_empty()
            || owner.endpoint.len() > 1024
            || owner.endpoint.chars().any(char::is_control)
        {
            return Err("resident source owner custody mismatch".into());
        }
        match owner.release_root.as_deref() {
            Some(recorded)
                if std::fs::canonicalize(recorded).ok().as_deref() == Some(release_root) => {}
            None if fixture => {}
            _ => return Err("resident source root custody mismatch".into()),
        }
        let identity = ProcessIdentity {
            pid: owner.pid,
            start: owner.start_identity,
        };
        verify_live(&identity)?;
        // Security: bound reads before parsing; the ordinary registry reader is not an IPC budget.
        let registry =
            RegistryStore::parse(&record(&root.join("registry.json"), 2 * 1024 * 1024)?)?;
        if registry.release_id != release_id || registry.epoch == 0 {
            return Err("resident source registry custody mismatch".into());
        }
        let system = crate::identity::current_system()
            .map_err(|_| "resident source login identity unavailable")?;
        if registry.boot_id != system.boot || registry.os_session_id != system.os_session {
            return Err("resident source belongs to another boot or login".into());
        }
        for path in ["client-token", "profile-secret"] {
            let _ = record(&root.join(path), 32)?;
        }
        let credentials = ProfileCredentials::load_existing(&root)?
            .ok_or("resident source credentials absent")?;
        Ok(Self {
            scope: token,
            release_id,
            epoch: registry.epoch,
            owner: identity,
            endpoint: owner.endpoint,
            token: credentials.client_token,
        })
    }

    pub fn source_scope(&self) -> &str {
        &self.scope
    }
    pub fn release_id(&self) -> &str {
        &self.release_id
    }
    pub fn epoch(&self) -> u64 {
        self.epoch
    }

    pub fn read(
        &self,
        request: SourceRead,
        timeout: Duration,
    ) -> Result<serde_json::Value, String> {
        verify_live(&self.owner)?;
        let connection = maintain::connect_source(
            &self.endpoint,
            &self.token,
            &self.release_id,
            Some(self.epoch),
        )
        .map_err(|_| "resident source handshake unavailable or changed")?;
        let method = match request {
            SourceRead::Description => "runtime.describe",
            SourceRead::Tabs => "tab.list",
            SourceRead::Status => "host.status",
        };
        let Some((kind, value, _)) = connection.request(
            method,
            serde_json::json!({}),
            timeout.min(Duration::from_secs(5)),
        )?
        else {
            return Err("resident source read timed out".into());
        };
        if kind != method {
            return Err("resident source API is unsupported".into());
        }
        Ok(value)
    }
}

fn verify_live(expected: &ProcessIdentity) -> Result<(), String> {
    match crate::identity::inspect_process(expected.pid) {
        Ok(Some(observed)) if &observed == expected => Ok(()),
        _ => Err("resident source owner is gone or unverifiable".into()),
    }
}

fn directory(path: &Path, private: bool) -> Result<(), String> {
    let metadata =
        std::fs::symlink_metadata(path).map_err(|_| "inspect resident source directory")?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err("resident source directory is linked or invalid".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        let disallowed = if private { 0o077 } else { 0o022 };
        if metadata.uid() != unsafe { libc::geteuid() } || metadata.mode() & disallowed != 0 {
            return Err("resident source directory ownership is unverified".into());
        }
    }
    #[cfg(not(unix))]
    let _ = private;
    Ok(())
}

fn record(path: &PathBuf, maximum: usize) -> Result<Vec<u8>, String> {
    let metadata = std::fs::symlink_metadata(path).map_err(|_| "inspect resident source record")?;
    if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() > maximum as u64 {
        return Err("resident source record boundary or size is invalid".into());
    }
    let mut bytes = Vec::new();
    std::fs::File::open(path)
        .map_err(|_| "open resident source record")?
        .take(maximum as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "read resident source record")?;
    if bytes.len() > maximum {
        return Err("resident source record exceeds read bound".into());
    }
    Ok(bytes)
}
