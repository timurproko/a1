//! Explicit read-only source custody for a newer control plane. Generic same-release admission,
//! source registry writers, holders and bridges retain their original authority checks.

use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Duration;

use super::{
    credentials::ProfileCredentials,
    maintain,
    registry::{RegistryDocument, RegistryStore},
    scope, wire,
};
use crate::identity::ProcessIdentity;
use crate::{endpoint, protocol};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct OwnerIdentity {
    pid: u32,
    start_identity: String,
}

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
    #[serde(default)]
    profile_root: Option<PathBuf>,
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
    state_root: PathBuf,
    release_root: PathBuf,
}

fn verify_login(
    recorded: &str,
    current: &str,
    _address: &str,
    _owner: &ProcessIdentity,
) -> Result<(), String> {
    if recorded == current {
        return Ok(());
    }
    #[cfg(target_os = "linux")]
    if crate::linux_login::process_session(recorded) {
        let stream =
            endpoint::connect(_address).map_err(|_| "resident Linux login peer unavailable")?;
        let _connection = endpoint::close_on_drop(&stream);
        crate::linux_login::verify_peer(&stream, _owner.pid)?;
        verify_live(_owner)?;
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    if crate::identity::legacy_macos_login(recorded) && current.starts_with("macos-audit-id:") {
        let stream =
            endpoint::connect(_address).map_err(|_| "resident legacy login peer unavailable")?;
        let _connection = endpoint::close_on_drop(&stream);
        crate::audit_session::verify_peer(&stream, _owner.pid)
            .map_err(|_| "resident legacy peer belongs to another login")?;
        verify_live(_owner)?;
        return Ok(());
    }
    Err("resident source belongs to another boot or login".into())
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
        if registry.boot_id != system.boot {
            return Err("resident source belongs to another boot or login".into());
        }
        verify_login(
            &registry.os_session_id,
            &system.os_session,
            &owner.endpoint,
            &identity,
        )?;
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
            state_root: root,
            release_root: release_root.to_path_buf(),
        })
    }

    pub fn release_root(&self) -> &Path {
        &self.release_root
    }

    pub fn closed_snapshot(
        profile: &Path,
        data: &Path,
        source: &super::workspace::SourceIdentity,
        tabs: &[super::workspace::WorkspaceTab],
    ) -> Result<Option<RegistryDocument>, String> {
        if scope::token_for(profile, &source.release_id)? != source.scope {
            return Err("closed source scope mismatch".into());
        }
        directory(&data.join("tabs"), false)?;
        let state = data.join("tabs").join(&source.scope);
        directory(&state, true)?;
        let registry =
            RegistryStore::parse(&record(&state.join("registry.json"), 2 * 1024 * 1024)?)?;
        if registry.release_id != source.release_id {
            return Err("closed source custody mismatch".into());
        }
        let system = crate::identity::current_system()
            .map_err(|_| "closed source boot identity unavailable")?;
        let ended_login = registry.boot_id != system.boot
            || crate::identity::login_change_proven(&registry.os_session_id, &system.os_session);
        let complete_stop = registry.epoch == source.epoch
            && registry.registry_revision >= source.revision
            && registry.tabs.iter().all(|tab| tab.desired == "stopped");
        let explicit_stop = registry.epoch >= source.epoch
            && tabs.iter().any(|tab| tab.source_scope == source.scope)
            && tabs
                .iter()
                .filter(|tab| tab.source_scope == source.scope)
                .all(|previous| {
                    registry
                        .tabs
                        .iter()
                        .any(|tab| tab.tab_id == previous.source_tab && tab.desired == "stopped")
                });
        if ended_login || complete_stop || explicit_stop {
            Ok(Some(registry))
        } else {
            Ok(None)
        }
    }

    pub fn reopen(&self, profile: &Path, data: &Path) -> Result<Self, String> {
        #[cfg(feature = "resident-fixtures")]
        {
            Self::open_fixture(
                profile,
                data,
                &self.release_root,
                &self
                    .release_root
                    .join(if cfg!(windows) { "host.exe" } else { "host" }),
            )
        }
        #[cfg(not(feature = "resident-fixtures"))]
        {
            Self::open(profile, data, &self.release_root)
        }
    }

    pub fn registry(&self) -> Result<RegistryDocument, String> {
        verify_live(&self.owner)?;
        let registry = RegistryStore::parse(&record(
            &self.state_root.join("registry.json"),
            2 * 1024 * 1024,
        )?)?;
        if registry.epoch != self.epoch || registry.release_id != self.release_id {
            return Err("resident source epoch changed".into());
        }
        Ok(registry)
    }

    pub fn attach(
        &self,
        selected: Option<&str>,
        timeout: Duration,
    ) -> Result<
        (
            endpoint::EndpointStream,
            protocol::Welcome,
            protocol::BridgeAttachment,
        ),
        String,
    > {
        verify_live(&self.owner)?;
        let mut stream =
            endpoint::connect(&self.endpoint).map_err(|_| "source attach unavailable")?;
        #[cfg(unix)]
        endpoint::set_handshake_deadline(&stream, timeout)
            .map_err(|_| "source attach deadline unavailable")?;
        wire::send(
            &mut stream,
            "hello",
            Some(1),
            wire::RoleHello {
                role: "attach".into(),
                generation: protocol::GENERATION,
                build: super::client_identity::build(),
                release_id: self.release_id.clone(),
                features: vec![
                    protocol::FEATURE_SEMANTIC_INPUT.into(),
                    protocol::FEATURE_TERMINAL_EFFECTS.into(),
                    protocol::FEATURE_STRUCTURED_SURFACE.into(),
                ],
                token: self.token.to_vec(),
                tab_id: selected.map(str::to_owned),
                pid: Some(std::process::id()),
                start_identity: None,
                incarnation: 0,
                child_pid: None,
                child_start_identity: None,
                highest_epoch: 0,
            },
        )?;
        #[cfg(windows)]
        endpoint::set_handshake_deadline(&stream, timeout)
            .map_err(|_| "source attach deadline unavailable")?;
        let welcome = wire::read_payload(&mut stream)?.ok_or("source attach closed")?;
        if wire::kind(&welcome)?.message_type != "welcome" {
            return Err("source attach refused".into());
        }
        let (_, welcome): (_, protocol::Welcome) = wire::body(&welcome)?;
        if welcome.release_id != self.release_id
            || welcome.epoch != self.epoch
            || welcome.generation != protocol::GENERATION
            || !protocol::negotiated(&welcome.features, "controller-boundary")
        {
            return Err("source control contract is incompatible".into());
        }
        let admission = wire::read_payload(&mut stream)?.ok_or("source admission closed")?;
        if wire::kind(&admission)?.message_type != "attached" {
            return Err("source attach admission refused".into());
        }
        let (_, admission): (_, protocol::BridgeAttachment) = wire::body(&admission)?;
        endpoint::clear_handshake_deadline(&stream).map_err(|_| "clear source deadline")?;
        Ok((stream, welcome, admission))
    }

    pub fn compatible(&self) -> Result<(), String> {
        let mut connection = maintain::connect_source(
            &self.endpoint,
            &self.token,
            &self.release_id,
            Some(self.epoch),
        )
        .map_err(|_| "source compatibility handshake failed")?;
        for required in [
            "resident-multi-tab",
            "slow-client-isolation",
            "controller-boundary",
            "bridge-visibility",
            "bridge-route",
            "bridge-stop",
        ] {
            if !protocol::negotiated(connection.features(), required) {
                return Err("source mandatory control contract is incompatible".into());
            }
        }
        let registry = self.registry()?;
        if protocol::negotiated(connection.features(), super::runtime_control::API) {
            let Some((kind, value, next)) = connection.request(
                "runtime.describe",
                serde_json::json!({"api":super::runtime_control::API}),
                Duration::from_secs(4),
            )?
            else {
                return Err("source control description timed out".into());
            };
            if kind != "runtime.describe" {
                return Err("source control description is invalid".into());
            }
            let contract: super::runtime_control::RuntimeControl = serde_json::from_value(value)
                .map_err(|_| "source control description is invalid")?;
            contract.validate_binding(
                &self.release_id,
                &self.scope,
                self.epoch,
                &registry.boot_id,
                &registry.os_session_id,
            )?;
            connection = next;
        } else if connection
            .features()
            .iter()
            .any(|feature| feature.starts_with("resident-control-"))
        {
            return Err("source runtime control API is unsupported".into());
        }
        let Some((kind, value, _connection)) =
            connection.request("tab.list", serde_json::json!({}), Duration::from_secs(4))?
        else {
            return Err("source compatibility request timed out".into());
        };
        if kind != "tab.list"
            || value
                .get("tabs")
                .and_then(serde_json::Value::as_array)
                .is_none()
        {
            return Err("source compatibility response is invalid".into());
        }
        #[cfg(not(feature = "resident-fixtures"))]
        {
            let manifest: serde_json::Value =
                serde_json::from_slice(&record(&self.release_root.join("package.json"), 65536)?)
                    .map_err(|_| "source launch contract metadata is invalid")?;
            if manifest.get("residentControlContracts").is_some()
                && !protocol::negotiated(_connection.features(), super::runtime_control::API)
            {
                return Err("source omitted its declared runtime control API".into());
            }
            if manifest
                .get("privateLaunchContract")
                .and_then(serde_json::Value::as_str)
                != Some("neutral-launch-v1")
            {
                return Err("source private launch contract is unsupported".into());
            }
        }
        self.registry()?;
        Ok(())
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

/// Enumerates affected profiles without guessing another live namespace's ownership.
pub fn profiles(current: &Path, data: &Path) -> Result<Vec<PathBuf>, String> {
    let mut profiles = super::workspace::profiles(data)?;
    let current = std::fs::canonicalize(current).map_err(|_| "resolve workspace profile")?;
    if !profiles.contains(&current) {
        profiles.push(current.clone());
    }
    let parent = data.join("tabs");
    if !parent.exists() {
        return Ok(profiles);
    }
    directory(&parent, false)?;
    for (index, entry) in std::fs::read_dir(&parent)
        .map_err(|_| "read resident profiles")?
        .enumerate()
    {
        if index >= 4096 {
            return Err("resident namespace bound exceeded".into());
        }
        let entry = entry.map_err(|_| "read resident profile")?;
        directory(&entry.path(), false)?;
        let path = entry.path().join("server.json");
        if !path.exists() {
            continue;
        }
        let bytes = record(&path, 65536)?;
        let Some(owner) = live_owner(
            &bytes,
            crate::identity::inspect_process,
            "read resident profile owner",
            "resident profile owner cannot be inspected",
        )?
        else {
            continue;
        };
        if let Some(profile) = owner.profile_root {
            let profile =
                std::fs::canonicalize(profile).map_err(|_| "resolve live resident profile")?;
            if scope::token_for(&profile, &owner.release_id)? != entry.file_name().to_string_lossy()
            {
                return Err("resident profile custody mismatch".into());
            }
            if !profiles.contains(&profile) {
                profiles.push(profile);
            }
        } else if scope::token_for(&current, &owner.release_id)?
            != entry.file_name().to_string_lossy()
        {
            return Err("another live predecessor profile cannot be verified".into());
        }
        if profiles.len() > 64 {
            return Err("resident profile bound exceeded".into());
        }
    }
    Ok(profiles)
}

/// Read-only bounded discovery; directory names are recomputed for the exact requested profile.
pub fn discover(
    profile: &Path,
    data: &Path,
    current_root: &Path,
) -> Result<Vec<SourceRoute>, String> {
    let parent = data.join("tabs");
    if !parent.exists() {
        return Ok(Vec::new());
    }
    directory(&parent, false)?;
    let mut sources = Vec::new();
    for (index, entry) in std::fs::read_dir(&parent)
        .map_err(|_| "read resident namespaces")?
        .enumerate()
    {
        if index >= 4096 {
            return Err("resident namespace bound exceeded".into());
        }
        let entry = entry.map_err(|_| "read resident namespace")?;
        directory(&entry.path(), false)?;
        let marker = entry.path().join("server.json");
        if !marker.exists() {
            continue;
        }
        let bytes = record(&marker, 65536)?;
        let Some(owner) = live_owner(
            &bytes,
            crate::identity::inspect_process,
            "unreadable resident owner",
            "resident source owner cannot be inspected",
        )?
        else {
            if dead_source_is_recovering(profile, &entry, &bytes)? {
                return Err("resident source is recovering".into());
            }
            continue;
        };
        let own_profile = scope::token_for(profile, &owner.release_id)?;
        if entry.file_name().to_string_lossy() != own_profile {
            if entry.file_name().to_string_lossy()
                == crate::endpoint::endpoint_token(profile)
                    .map_err(|_| "legacy profile identity")?
                && verify_live(&ProcessIdentity {
                    pid: owner.pid,
                    start: owner.start_identity.clone(),
                })
                .is_ok()
            {
                return Err("live legacy resident contract is unsupported".into());
            }
            continue;
        }
        let registry = RegistryStore::parse(&record(
            &entry.path().join("registry.json"),
            2 * 1024 * 1024,
        )?)?;
        let root = owner
            .release_root
            .map(PathBuf::from)
            .or_else(|| {
                if cfg!(feature = "resident-fixtures") {
                    registry
                        .tabs
                        .first()
                        .map(|tab| PathBuf::from(&tab.release))
                        .or_else(|| Some(current_root.to_path_buf()))
                } else {
                    None
                }
            })
            .ok_or("resident source root is unrecorded")?;
        #[cfg(feature = "resident-fixtures")]
        let route = SourceRoute::open_fixture(
            profile,
            data,
            &root,
            &root.join(if cfg!(windows) { "host.exe" } else { "host" }),
        )?;
        #[cfg(not(feature = "resident-fixtures"))]
        let route = SourceRoute::open(profile, data, &root)?;
        if route.source_scope() != own_profile {
            return Err("resident discovery custody mismatch".into());
        }
        sources.push(route);
        if sources.len() > 64 {
            return Err("resident source connection bound exceeded".into());
        }
    }
    #[cfg(not(feature = "resident-fixtures"))]
    let _ = current_root;
    Ok(sources)
}

fn dead_source_is_recovering(
    profile: &Path,
    entry: &std::fs::DirEntry,
    owner_bytes: &[u8],
) -> Result<bool, String> {
    let token = entry.file_name().to_string_lossy().into_owned();
    let current = serde_json::from_slice::<Owner>(owner_bytes)
        .ok()
        .and_then(|owner| scope::token_for(profile, &owner.release_id).ok())
        .is_some_and(|expected| expected == token);
    let legacy =
        crate::endpoint::endpoint_token(profile).map_err(|_| "legacy profile identity")? == token;
    if !current && !legacy {
        return Ok(false);
    }
    let path = entry.path().join("registry.json");
    if !path.exists() {
        return Ok(false);
    }
    live_execution(&RegistryStore::parse(&record(&path, 2 * 1024 * 1024)?)?)
}

fn live_owner<E, F>(
    bytes: &[u8],
    inspect: F,
    unreadable: &'static str,
    uninspectable: &'static str,
) -> Result<Option<Owner>, String>
where
    F: FnOnce(u32) -> Result<Option<ProcessIdentity>, E>,
{
    let identity: OwnerIdentity =
        serde_json::from_slice(bytes).map_err(|_| unreadable.to_owned())?;
    if identity.pid == 0
        || identity.start_identity.is_empty()
        || identity.start_identity.len() > 1024
        || identity.start_identity.chars().any(char::is_control)
    {
        return Err(unreadable.into());
    }
    match inspect(identity.pid) {
        Ok(Some(observed)) if observed.start == identity.start_identity => {
            serde_json::from_slice(bytes)
                .map(Some)
                .map_err(|_| unreadable.into())
        }
        Ok(_) => Ok(None),
        Err(_) => Err(uninspectable.into()),
    }
}

fn live_execution(registry: &RegistryDocument) -> Result<bool, String> {
    for tab in &registry.tabs {
        for (pid, start) in [
            tab.holder_pid.zip(tab.holder_start_identity.as_ref()),
            tab.child_pid.zip(tab.child_start_identity.as_ref()),
        ]
        .into_iter()
        .flatten()
        {
            match crate::identity::inspect_process(pid) {
                Ok(Some(observed)) if &observed.start == start => return Ok(true),
                Err(_) => return Err("resident source process cannot be inspected".into()),
                _ => {}
            }
        }
    }
    Ok(false)
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

#[cfg(test)]
mod tests {
    use super::live_owner;
    use crate::identity::ProcessIdentity;

    const LEGACY: &str = r#"{"pid":17,"startIdentity":"old-start","endpoint":"legacy"}"#;
    const CURRENT: &str = r#"{"pid":23,"startIdentity":"current-start","endpoint":"endpoint","generation":1,"verified":true,"releaseId":"release-id","releaseRoot":"/release","profileRoot":"/profile"}"#;

    #[test]
    fn dead_legacy_owner_is_omitted_before_current_schema_decode() {
        let owner = live_owner(
            LEGACY.as_bytes(),
            |_| Ok::<_, ()>(None),
            "unreadable",
            "uninspectable",
        )
        .unwrap();
        assert!(owner.is_none());
    }

    #[test]
    fn pid_reuse_omits_only_the_recorded_owner() {
        let owner = live_owner(
            LEGACY.as_bytes(),
            |pid| {
                Ok::<_, ()>(Some(ProcessIdentity {
                    pid,
                    start: "new-start".into(),
                }))
            },
            "unreadable",
            "uninspectable",
        )
        .unwrap();
        assert!(owner.is_none());
    }

    #[test]
    fn live_or_uninspectable_legacy_owner_remains_blocking() {
        let live = live_owner(
            LEGACY.as_bytes(),
            |pid| {
                Ok::<_, ()>(Some(ProcessIdentity {
                    pid,
                    start: "old-start".into(),
                }))
            },
            "unreadable",
            "uninspectable",
        );
        assert_eq!(live.err().as_deref(), Some("unreadable"));
        let unknown = live_owner(
            LEGACY.as_bytes(),
            |_| Err::<Option<ProcessIdentity>, _>(()),
            "unreadable",
            "uninspectable",
        );
        assert_eq!(unknown.err().as_deref(), Some("uninspectable"));
    }

    #[test]
    fn supported_live_owner_survives_beside_dead_legacy_debris() {
        let dead = live_owner(
            LEGACY.as_bytes(),
            |_| Ok::<_, ()>(None),
            "unreadable",
            "uninspectable",
        )
        .unwrap();
        let current = live_owner(
            CURRENT.as_bytes(),
            |pid| {
                Ok::<_, ()>(Some(ProcessIdentity {
                    pid,
                    start: "current-start".into(),
                }))
            },
            "unreadable",
            "uninspectable",
        )
        .unwrap();
        assert!(dead.is_none());
        assert_eq!(current.unwrap().release_id, "release-id");
    }

    #[test]
    fn malformed_minimal_identity_cannot_prove_death() {
        let result = live_owner(
            br#"{"pid":17}"#,
            |_| Ok::<_, ()>(None),
            "unreadable",
            "uninspectable",
        );
        assert_eq!(result.err().as_deref(), Some("unreadable"));
    }
}
