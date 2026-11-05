//! Profile-level topology only. Execution, credentials and session writers stay with their source.

use std::collections::{HashMap, HashSet};
use std::io::Read;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::{credentials, scope};
use crate::{durable, session_lock::SessionLock};

const SCHEMA: &str = "resident-workspace-v1";
const MAX_BYTES: usize = 2 * 1024 * 1024;
const MAX_TABS: usize = 4096;
const MAX_SOURCES: usize = 1024;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SourceIdentity {
    pub scope: String,
    pub release_id: String,
    pub release_root: String,
    pub epoch: u64,
    pub revision: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkspaceTab {
    pub id: String,
    pub source_scope: String,
    pub source_tab: String,
    pub incarnation: u64,
    pub name: String,
    pub name_source: String,
    pub session_file: Option<String>,
}

impl WorkspaceTab {
    /// Stable across process incarnations, distinct even when two sources use the same local ID.
    pub fn id_for(source_scope: &str, source_tab: &str) -> String {
        let mut hash = Sha256::new();
        hash.update(b"resident-workspace-tab-v1\0");
        hash.update(source_scope.as_bytes());
        hash.update([0]);
        hash.update(source_tab.as_bytes());
        let kind = crate::core::tab_bar::TabKind::of_id(source_tab);
        let prefix = if kind.is_singleton() {
            kind.id_prefix()
        } else {
            "agent-"
        };
        format!("{prefix}{}", hex::encode(hash.finalize()))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkspaceDocument {
    pub schema: String,
    pub profile: String,
    pub profile_root: String,
    pub boot_id: String,
    pub os_session_id: String,
    pub epoch: u64,
    pub revision: u64,
    pub sources: Vec<SourceIdentity>,
    /// Vector order is the user's order, not a source registry's incidental discovery order.
    pub tabs: Vec<WorkspaceTab>,
    pub selected: Option<String>,
}

/// Holds the kernel writer lease for its full lifetime. It is not cloneable, and mutations
/// require exclusive access to the store while the lease remains in custody.
pub struct WorkspaceStore {
    root: PathBuf,
    _lease: SessionLock,
    document: WorkspaceDocument,
    failed: bool,
    recovered: bool,
}

impl WorkspaceStore {
    pub fn open(profile: &Path, data: &Path) -> Result<Self, String> {
        let token = scope::workspace_token(profile)?;
        std::fs::create_dir_all(data).map_err(|_| "create workspace data directory")?;
        let data = std::fs::canonicalize(data).map_err(|_| "resolve workspace data directory")?;
        let parent = data.join("resident-workspaces");
        private_directory(&parent)?;
        let root = parent.join(&token);
        private_directory(&root)?;
        let lease = SessionLock::acquire_location(root.join("writer.lock"))
            .map_err(|_| "workspace writer lease is held")?;
        let (prior, recovered) = recover(&root, &token)?;
        let mut document = prior.clone().unwrap_or_else(|| WorkspaceDocument {
            schema: SCHEMA.into(),
            profile: token,
            profile_root: String::new(),
            boot_id: String::new(),
            os_session_id: String::new(),
            epoch: 0,
            revision: 0,
            sources: Vec::new(),
            tabs: Vec::new(),
            selected: None,
        });
        let system = crate::identity::current_system()
            .map_err(|_| "workspace login identity unavailable")?;
        let uncertain_login = document.boot_id == system.boot
            && document.os_session_id != system.os_session
            && !crate::identity::login_change_proven(&document.os_session_id, &system.os_session);
        if !document.boot_id.is_empty()
            && (document.boot_id != system.boot
                || crate::identity::login_change_proven(
                    &document.os_session_id,
                    &system.os_session,
                ))
        {
            archive_login(&root, &document)?;
            document.tabs.clear();
            document.sources.clear();
            document.selected = None;
        }
        document.boot_id = system.boot;
        // Invariant: preserve an incomparable legacy epoch; live control separately requires kernel peer proof.
        if !uncertain_login {
            document.os_session_id = system.os_session;
        }
        document.profile_root = std::fs::canonicalize(profile)
            .map_err(|_| "resolve workspace profile root")?
            .to_string_lossy()
            .into_owned();
        let epoch = read_epoch(&root)?;
        if prior.is_none() && epoch != 0 {
            return Err("workspace recovery blocked; epoch has no generation".into());
        }
        if epoch < document.epoch {
            return Err("workspace durable epoch regressed".into());
        }
        document.epoch = epoch.checked_add(1).ok_or("workspace epoch exhausted")?;
        // Concurrency: advance authority before publishing a generation, independently of history.
        replace_private(
            &root.join("workspace.epoch"),
            document.epoch.to_string().as_bytes(),
        )?;
        document.revision = document
            .revision
            .checked_add(1)
            .ok_or("workspace revision exhausted")?;
        persist(&root, prior.as_ref(), &document)?;
        replace_private(&root.join("initialized"), SCHEMA.as_bytes())?;
        Ok(Self {
            root,
            _lease: lease,
            document,
            failed: false,
            recovered,
        })
    }

    /// Read committed topology without taking a writer lease, recovering files, or advancing epochs.
    pub fn inspect(profile: &Path, data: &Path) -> Result<Option<WorkspaceDocument>, String> {
        let token = scope::workspace_token(profile)?;
        let parent = data.join("resident-workspaces");
        let root = parent.join(&token);
        for path in [&parent, &root] {
            let metadata = match std::fs::symlink_metadata(path) {
                Ok(metadata) => metadata,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
                Err(_) => return Err("inspect workspace directory".into()),
            };
            if !metadata.is_dir() || metadata.file_type().is_symlink() {
                return Err("workspace directory is linked or invalid".into());
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::MetadataExt;
                if metadata.uid() != unsafe { libc::geteuid() } || metadata.mode() & 0o077 != 0 {
                    return Err("workspace directory is not owner-private".into());
                }
            }
        }
        let primary = read_bytes(&root.join("workspace.json"))?;
        let document = match primary
            .as_deref()
            .map(|bytes| decode(bytes, &token))
            .transpose()
        {
            Ok(Some(document)) => document,
            Err(error)
                if error == "workspace schema is unsupported"
                    || error == "workspace profile mismatch" =>
            {
                return Err(error);
            }
            _ => read_document(&root.join("workspace.previous.json"), &token)?
                .ok_or("workspace profile generation is unavailable")?,
        };
        if scope::workspace_token(Path::new(&document.profile_root))? != token {
            return Err("workspace profile binding mismatch".into());
        }
        if read_epoch(&root)? < document.epoch {
            return Err("workspace durable epoch regressed".into());
        }
        Ok(Some(document))
    }

    pub fn snapshot(&self) -> &WorkspaceDocument {
        &self.document
    }
    pub fn recovered(&self) -> bool {
        self.recovered
    }

    /// The caller must first authenticate a complete source snapshot in this exact profile.
    /// Only that positively observed source can remove its tabs; absent sources remain referenced.
    pub fn reconcile_verified_source(
        &mut self,
        profile: &str,
        source: SourceIdentity,
        tabs: Vec<WorkspaceTab>,
    ) -> Result<(), String> {
        if profile != self.document.profile {
            return Err("workspace profile mismatch".into());
        }
        if let Some(prior) = self
            .document
            .sources
            .iter()
            .find(|old| old.scope == source.scope)
        {
            if prior.release_id != source.release_id || prior.release_root != source.release_root {
                return Err("workspace source custody changed".into());
            }
            if source.epoch < prior.epoch
                || (source.epoch == prior.epoch && source.revision < prior.revision)
            {
                return Err("workspace source snapshot is stale".into());
            }
            // Protocol: an equal revision can be re-offered, but cannot change committed data.
            if source.epoch == prior.epoch && source.revision == prior.revision {
                let old = self
                    .document
                    .tabs
                    .iter()
                    .filter(|tab| tab.source_scope == source.scope)
                    .map(|tab| (&tab.id, tab))
                    .collect::<HashMap<_, _>>();
                if old.len() != tabs.len()
                    || tabs
                        .iter()
                        .any(|tab| old.get(&tab.id).copied() != Some(tab))
                {
                    return Err("workspace source revision equivocated".into());
                }
                return Ok(());
            }
        }
        if tabs.iter().any(|tab| tab.source_scope != source.scope) {
            return Err("workspace tab source mismatch".into());
        }
        let mut next = self.document.clone();
        let incoming = tabs
            .iter()
            .map(|tab| (tab.id.clone(), tab.clone()))
            .collect::<HashMap<_, _>>();
        if incoming.len() != tabs.len() {
            return Err("workspace duplicate tab".into());
        }
        next.tabs
            .retain(|tab| tab.source_scope != source.scope || incoming.contains_key(&tab.id));
        for tab in &mut next.tabs {
            if let Some(updated) = incoming.get(&tab.id) {
                if updated.incarnation < tab.incarnation {
                    return Err("workspace incarnation is stale".into());
                }
                *tab = updated.clone();
            }
        }
        for tab in tabs {
            if !next.tabs.iter().any(|old| old.id == tab.id) {
                next.tabs.push(tab);
            }
        }
        next.sources.retain(|old| old.scope != source.scope);
        next.sources.push(source);
        if next
            .selected
            .as_ref()
            .is_none_or(|id| !next.tabs.iter().any(|tab| &tab.id == id))
        {
            next.selected = next.tabs.first().map(|tab| tab.id.clone());
        }
        self.commit(next)
    }

    pub fn select(&mut self, id: &str) -> Result<(), String> {
        if !self.document.tabs.iter().any(|tab| tab.id == id) {
            return Err("workspace selected tab is absent".into());
        }
        if self.document.selected.as_deref() == Some(id) {
            return Ok(());
        }
        let mut next = self.document.clone();
        next.selected = Some(id.into());
        self.commit(next)
    }

    pub fn reorder(&mut self, ids: &[String]) -> Result<(), String> {
        if ids.len() != self.document.tabs.len()
            || ids.iter().collect::<HashSet<_>>().len() != ids.len()
        {
            return Err("workspace reorder must name every tab once".into());
        }
        let mut next = self.document.clone();
        next.tabs = ids
            .iter()
            .map(|id| {
                self.document
                    .tabs
                    .iter()
                    .find(|tab| &tab.id == id)
                    .cloned()
                    .ok_or_else(|| "workspace reorder names an absent tab".to_owned())
            })
            .collect::<Result<_, _>>()?;
        if next.tabs == self.document.tabs {
            return Ok(());
        }
        self.commit(next)
    }

    fn commit(&mut self, mut next: WorkspaceDocument) -> Result<(), String> {
        if self.failed {
            return Err("workspace persistence is degraded".into());
        }
        next.revision = self
            .document
            .revision
            .checked_add(1)
            .ok_or("workspace revision exhausted")?;
        validate(&next, &self.document.profile)?;
        let on_disk = read_document(&self.root.join("workspace.json"), &self.document.profile)?;
        if on_disk.as_ref() != Some(&self.document)
            || read_epoch(&self.root)? != self.document.epoch
        {
            return Err("workspace writer is fenced".into());
        }
        match persist(&self.root, Some(&self.document), &next) {
            Ok(()) => {
                self.document = next;
                Ok(())
            }
            Err(error) => {
                self.failed = true;
                Err(error)
            }
        }
    }
}

fn private_directory(path: &Path) -> Result<(), String> {
    match std::fs::symlink_metadata(path) {
        Ok(meta) => {
            if !meta.is_dir() || meta.file_type().is_symlink() {
                return Err("workspace directory is linked or invalid".into());
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::MetadataExt;
                if meta.uid() != unsafe { libc::geteuid() } || meta.mode() & 0o077 != 0 {
                    return Err("workspace directory is not owner-private".into());
                }
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            let builder = std::fs::DirBuilder::new();
            #[cfg(unix)]
            let mut builder = builder;
            #[cfg(unix)]
            {
                use std::os::unix::fs::DirBuilderExt;
                builder.mode(0o700);
            }
            match builder.create(path) {
                Ok(()) => {}
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                    return private_directory(path);
                }
                Err(_) => return Err("create workspace directory".into()),
            }
        }
        Err(_) => return Err("inspect workspace directory".into()),
    }
    credentials::protect_directory(path)
}

fn read_bytes(path: &Path) -> Result<Option<Vec<u8>>, String> {
    let meta = match std::fs::symlink_metadata(path) {
        Ok(meta) => meta,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err("inspect workspace record".into()),
    };
    if !meta.is_file() || meta.file_type().is_symlink() || meta.len() > MAX_BYTES as u64 {
        return Err("workspace record boundary or size is invalid".into());
    }
    let mut bytes = Vec::new();
    std::fs::File::open(path)
        .map_err(|_| "open workspace record")?
        .take(MAX_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "read workspace record")?;
    if bytes.len() > MAX_BYTES {
        return Err("workspace record exceeds byte bound".into());
    }
    Ok(Some(bytes))
}

/// Canonical affected profiles are retained even after their source owner markers disappear.
pub fn profiles(data: &Path) -> Result<Vec<PathBuf>, String> {
    let parent = data.join("resident-workspaces");
    let entries = match std::fs::read_dir(&parent) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
        Err(_) => return Err("workspace profiles are unreadable".into()),
    };
    let mut result = Vec::new();
    for (index, entry) in entries.enumerate() {
        if index >= 4096 {
            return Err("workspace profile bound exceeded".into());
        }
        let entry = entry.map_err(|_| "read workspace profile")?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let metadata =
            std::fs::symlink_metadata(entry.path()).map_err(|_| "inspect workspace profile")?;
        if !token(&name, 20) || !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err("workspace profile boundary is invalid".into());
        }
        let primary = read_document(&entry.path().join("workspace.json"), &name);
        let document = match primary {
            Ok(Some(document)) => document,
            Err(error)
                if error == "workspace schema is unsupported"
                    || error == "workspace profile mismatch" =>
            {
                return Err(error);
            }
            _ => read_document(&entry.path().join("workspace.previous.json"), &name)?
                .ok_or("workspace profile generation is unavailable")?,
        };
        let root = PathBuf::from(&document.profile_root);
        if scope::workspace_token(&root)? != name {
            return Err("workspace profile binding mismatch".into());
        }
        if !result.contains(&root) {
            result.push(root);
        }
        if result.len() > 64 {
            return Err("workspace profile count exceeds bound".into());
        }
    }
    Ok(result)
}

/// Read-only cleanup evidence. Unreadable topology retains all releases at the caller.
pub fn held_release_roots(data: &Path) -> Result<Vec<String>, String> {
    let parent = data.join("resident-workspaces");
    let entries = match std::fs::read_dir(&parent) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(_) => return Err("workspace holds are unreadable".into()),
    };
    let parent_meta = std::fs::symlink_metadata(&parent).map_err(|_| "inspect workspace holds")?;
    if !parent_meta.is_dir() || parent_meta.file_type().is_symlink() {
        return Err("workspace hold boundary is invalid".into());
    }
    let mut roots = std::collections::BTreeSet::new();
    for (index, entry) in entries.enumerate() {
        if index >= 4096 {
            return Err("workspace hold directory bound exceeded".into());
        }
        let entry = entry.map_err(|_| "read workspace hold entry")?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let meta =
            std::fs::symlink_metadata(entry.path()).map_err(|_| "inspect workspace hold entry")?;
        if !token(&name, 20) || !meta.is_dir() || meta.file_type().is_symlink() {
            return Err("workspace hold namespace is invalid".into());
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            if meta.uid() != unsafe { libc::geteuid() } || meta.mode() & 0o077 != 0 {
                return Err("workspace hold ownership is invalid".into());
            }
        }
        let document = read_document(&entry.path().join("workspace.json"), &name)?
            .or(read_document(
                &entry.path().join("workspace.previous.json"),
                &name,
            )?)
            .ok_or("workspace hold generation is unavailable")?;
        if read_epoch(&entry.path())? < document.epoch {
            return Err("workspace hold epoch is invalid".into());
        }
        let system = crate::identity::current_system()
            .map_err(|_| "workspace hold login identity unavailable")?;
        if !document.boot_id.is_empty()
            && (document.boot_id != system.boot
                || crate::identity::login_change_proven(
                    &document.os_session_id,
                    &system.os_session,
                ))
        {
            continue;
        }
        for source in &document.sources {
            if document
                .tabs
                .iter()
                .any(|tab| tab.source_scope == source.scope)
            {
                let closed = super::source_route::SourceRoute::closed_snapshot(
                    Path::new(&document.profile_root),
                    data,
                    source,
                    &document.tabs,
                );
                if !matches!(closed, Ok(Some(_))) {
                    roots.insert(source.release_root.clone());
                }
            }
        }
    }
    Ok(roots.into_iter().collect())
}

fn archive_login(root: &Path, document: &WorkspaceDocument) -> Result<(), String> {
    let history = root.join("login-history");
    private_directory(&history)?;
    let path = history.join(format!(
        "login-{:020}-{:020}.json",
        document.epoch, document.revision
    ));
    replace_private(
        &path,
        &serde_json::to_vec(document).map_err(|_| "encode workspace login history")?,
    )?;
    let mut generations = std::fs::read_dir(&history)
        .map_err(|_| "inspect workspace login history")?
        .take(17)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "read workspace login history")?;
    if generations.len() > 16 {
        return Err("workspace login history bound exceeded".into());
    }
    for entry in &generations {
        if !entry.file_name().to_string_lossy().starts_with("login-") {
            return Err("workspace login history is unrecognized".into());
        }
        read_document(&entry.path(), &document.profile)?.ok_or("workspace history is invalid")?;
    }
    generations.sort_by_key(|entry| entry.file_name());
    let excess = generations.len().saturating_sub(3);
    for entry in generations.into_iter().take(excess) {
        std::fs::remove_file(entry.path()).map_err(|_| "prune workspace login history")?;
    }
    Ok(())
}

fn read_epoch(root: &Path) -> Result<u64, String> {
    let Some(bytes) = read_bytes(&root.join("workspace.epoch"))? else {
        return Ok(0);
    };
    if bytes.is_empty() || bytes.len() > 20 || !bytes.iter().all(u8::is_ascii_digit) {
        return Err("workspace durable epoch is invalid".into());
    }
    let epoch = std::str::from_utf8(&bytes)
        .map_err(|_| "workspace durable epoch is invalid")?
        .parse::<u64>()
        .map_err(|_| "workspace durable epoch is invalid")?;
    if epoch == 0 {
        return Err("workspace durable epoch is invalid".into());
    }
    Ok(epoch)
}

fn read_document(path: &Path, profile: &str) -> Result<Option<WorkspaceDocument>, String> {
    let Some(bytes) = read_bytes(path)? else {
        return Ok(None);
    };
    decode(&bytes, profile).map(Some)
}

fn decode(bytes: &[u8], profile: &str) -> Result<WorkspaceDocument, String> {
    let raw: serde_json::Value =
        serde_json::from_slice(bytes).map_err(|_| "workspace record is unreadable")?;
    if raw
        .get("schema")
        .and_then(serde_json::Value::as_str)
        .is_some_and(|schema| schema != SCHEMA)
    {
        return Err("workspace schema is unsupported".into());
    }
    if raw
        .get("profile")
        .and_then(serde_json::Value::as_str)
        .is_some_and(|id| id != profile)
    {
        return Err("workspace profile mismatch".into());
    }
    let document: WorkspaceDocument =
        serde_json::from_slice(bytes).map_err(|_| "workspace record is unreadable")?;
    validate(&document, profile)?;
    Ok(document)
}

fn recover(root: &Path, profile: &str) -> Result<(Option<WorkspaceDocument>, bool), String> {
    // Security: boundary failures do not authorize quarantine or following another path.
    let primary = read_bytes(&root.join("workspace.json"))?;
    match primary
        .as_deref()
        .map(|bytes| decode(bytes, profile))
        .transpose()
    {
        Ok(Some(document)) => return Ok((Some(document), false)),
        Err(error)
            if error == "workspace schema is unsupported"
                || error == "workspace profile mismatch" =>
        {
            return Err(error);
        }
        _ => {}
    }
    let previous = read_document(&root.join("workspace.previous.json"), profile)?;
    if let Some(document) = previous {
        if let Some(bytes) = primary {
            let mut preserved_count = 0;
            for (index, entry) in std::fs::read_dir(root)
                .map_err(|_| "inspect workspace recovery history")?
                .enumerate()
            {
                if index >= 32 {
                    return Err("workspace recovery directory exceeds entry bound".into());
                }
                let entry = entry.map_err(|_| "inspect workspace recovery entry")?;
                if entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with("workspace.corrupt-")
                {
                    preserved_count += 1;
                }
            }
            if preserved_count >= 3 {
                return Err("workspace recovery history is full; evidence preserved".into());
            }
            let preserved = root.join(format!(
                "workspace.corrupt-{:016x}.json",
                rand::random::<u64>()
            ));
            replace_private(&preserved, &bytes)?;
        }
        return Ok((Some(document), true));
    }
    if primary.is_some() || read_bytes(&root.join("initialized"))?.is_some() {
        return Err("workspace recovery blocked; no valid generation remains".into());
    }
    Ok((None, false))
}

fn replace_private(path: &Path, bytes: &[u8]) -> Result<(), String> {
    // Security: linked/oversized targets never authorize replacement of foreign authority.
    let _ = read_bytes(path)?;
    durable::replace(path, bytes).map_err(|_| "commit workspace record")?;
    credentials::protect_file(path)
}

fn persist(
    root: &Path,
    prior: Option<&WorkspaceDocument>,
    next: &WorkspaceDocument,
) -> Result<(), String> {
    validate(next, &next.profile)?;
    let bytes = serde_json::to_vec(next).map_err(|_| "encode workspace record")?;
    if bytes.len() > MAX_BYTES {
        return Err("workspace record exceeds byte bound".into());
    }
    if let Some(prior) = prior {
        replace_private(
            &root.join("workspace.previous.json"),
            &serde_json::to_vec(prior).map_err(|_| "encode prior workspace")?,
        )?;
    }
    replace_private(&root.join("workspace.json"), &bytes)
}

fn token(value: &str, length: usize) -> bool {
    value.len() == length
        && value
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}
fn text(value: &str, maximum: usize) -> bool {
    !value.is_empty() && value.len() <= maximum && !value.chars().any(char::is_control)
}

fn validate(document: &WorkspaceDocument, profile: &str) -> Result<(), String> {
    if document.schema != SCHEMA
        || document.profile != profile
        || !token(profile, 20)
        || document.epoch == 0
        || document.revision == 0
        || document.tabs.len() > MAX_TABS
        || document.sources.len() > MAX_SOURCES
    {
        return Err("workspace document identity or bounds are invalid".into());
    }
    let mut scopes = HashSet::new();
    for source in &document.sources {
        if !token(&source.scope, 20)
            || !token(&source.release_id, 64)
            || !text(&source.release_root, 4096)
            || !Path::new(&source.release_root).is_absolute()
            || source.epoch == 0
            || source.revision == 0
            || !scopes.insert(&source.scope)
        {
            return Err("workspace source is invalid".into());
        }
    }
    let mut ids = HashSet::new();
    for tab in &document.tabs {
        if tab.id != WorkspaceTab::id_for(&tab.source_scope, &tab.source_tab)
            || !ids.insert(&tab.id)
            || !scopes.contains(&tab.source_scope)
            || !text(&tab.source_tab, 256)
            || tab.incarnation == 0
            || !text(&tab.name, 1024)
            || !matches!(
                tab.name_source.as_str(),
                "default" | "auto" | "user" | "system"
            )
            || tab
                .session_file
                .as_deref()
                .is_some_and(|file| !text(file, 4096))
        {
            return Err("workspace tab is invalid".into());
        }
    }
    if document
        .selected
        .as_ref()
        .is_some_and(|id| !ids.contains(id))
        || (!document.tabs.is_empty() && document.selected.is_none())
    {
        return Err("workspace selection is invalid".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests;
