use std::collections::HashMap;
use std::io::Write;
use std::path::Path;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicUsize, Ordering},
    mpsc,
};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;

use crate::endpoint::{self, OwnerEndpoint};
use crate::identity::ProcessIdentity;
use crate::launch::{self, ResidentRole};
use crate::protocol::{self, BridgeAttachment, BridgeRequest, Welcome};
use crate::roles::credentials::ProfileCredentials;
use crate::roles::registry::{RegistryAuthority, RegistryDocument, RegistryStore, TabRecord};
use crate::roles::wire::{
    self, AttachStart, BridgeSession, BridgeStatus, HolderExit, HolderLaunchConfig, Input,
    PasteStart, Resize, RoleHello, ServerLaunchConfig, Surface, TabCreate, TabList, TabSummary,
    TabTarget,
};
use crate::session_lock::SessionLock;

/// One non-blocking render slot per attached client. Replacing an unsent update forces the
/// next delivery to use the supplied full surface so skipped revisions cannot corrupt state.
#[derive(Debug, Default)]
pub struct SingleSlotRenderLane {
    pending: Option<(u64, Vec<u8>)>,
    needs_full: bool,
}

impl SingleSlotRenderLane {
    pub fn offer(&mut self, revision: u64, patch: Vec<u8>) {
        if self.pending.replace((revision, patch)).is_some() {
            self.needs_full = true;
        }
    }
    pub fn drain(&mut self, full_surface: impl FnOnce() -> Vec<u8>) -> Option<RenderDelivery> {
        let (revision, patch) = self.pending.take()?;
        let full = std::mem::take(&mut self.needs_full);
        Some(RenderDelivery {
            revision,
            full,
            bytes: if full { full_surface() } else { patch },
        })
    }
}

#[derive(Debug, PartialEq, Eq)]
pub struct RenderDelivery {
    pub revision: u64,
    pub full: bool,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Default)]
pub struct AttachmentState {
    attached: HashMap<String, (String, u64)>,
    revision: u64,
}
impl AttachmentState {
    pub fn attach(&mut self, tab_id: &str, client_id: String) -> Result<u64, &'static str> {
        if self.attached.contains_key(tab_id) {
            return Err("a1 is attached in another terminal");
        }
        self.revision = self.revision.saturating_add(1);
        self.attached
            .insert(tab_id.to_owned(), (client_id, self.revision));
        Ok(self.revision)
    }
    pub fn transfer(&mut self, tab_id: &str, client_id: String) -> u64 {
        self.revision = self.revision.saturating_add(1);
        self.attached
            .insert(tab_id.to_owned(), (client_id, self.revision));
        self.revision
    }
    pub fn detach(&mut self, tab_id: &str, client_id: &str, revision: u64) -> bool {
        if self.current(tab_id) != Some((client_id, revision)) {
            return false;
        }
        self.attached.remove(tab_id);
        self.revision = self.revision.saturating_add(1);
        true
    }
    pub fn current(&self, tab_id: &str) -> Option<(&str, u64)> {
        self.attached
            .get(tab_id)
            .map(|(client, revision)| (client.as_str(), *revision))
    }
}

#[derive(Debug, Clone)]
pub struct RecordedHolder {
    pub tab_id: String,
    pub incarnation: u64,
    pub identity: ProcessIdentity,
    pub boot_identity: String,
    pub credential: [u8; 32],
}

pub fn adopt_verified_holder(
    record: &RecordedHolder,
    observed: Option<&ProcessIdentity>,
    boot_identity: &str,
    presented_credential: &[u8],
    expected_credential: &[u8; 32],
) -> bool {
    observed.is_some_and(|identity| identity == &record.identity)
        && record.boot_identity == boot_identity
        && record.credential == *expected_credential
        && presented_credential == expected_credential
}

#[derive(Default)]
pub struct ClientRenderLanes {
    lanes: HashMap<String, SingleSlotRenderLane>,
}
impl ClientRenderLanes {
    pub fn lane(&mut self, client_id: &str) -> &mut SingleSlotRenderLane {
        self.lanes.entry(client_id.to_owned()).or_default()
    }
    pub fn remove(&mut self, client_id: &str) {
        self.lanes.remove(client_id);
    }
}

const CONTROL_LANE_FRAMES: usize = 1024;
const CONTROL_LANE_BYTES: usize = 4 * 1024 * 1024;

#[derive(Clone)]
struct Peer {
    tx: mpsc::SyncSender<Vec<u8>>,
    queued_bytes: Arc<AtomicUsize>,
    surface: Arc<Mutex<Option<Vec<u8>>>>,
}
impl Peer {
    fn offer_control(&self, frame: Vec<u8>) -> Result<(), &'static str> {
        let length = frame.len();
        let reserved =
            self.queued_bytes
                .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |queued| {
                    queued
                        .checked_add(length)
                        .filter(|total| *total <= CONTROL_LANE_BYTES)
                });
        if reserved.is_err() {
            return Err("client-overrun");
        }
        if self.tx.try_send(frame).is_err() {
            self.queued_bytes.fetch_sub(length, Ordering::SeqCst);
            return Err("client-overrun");
        }
        Ok(())
    }

    fn offer_surface(&self, frame: Vec<u8>) {
        if let Ok(mut slot) = self.surface.lock() {
            *slot = Some(frame);
        }
    }
}

#[derive(Clone)]
struct HolderSession {
    peer: Peer,
    identity: ProcessIdentity,
    incarnation: u64,
}

#[derive(Clone)]
struct ClientSession {
    peer: Peer,
    viewed_tab: String,
    controller: bool,
    controller_revision: u64,
}

struct BridgePeer {
    peer: Peer,
    incarnation: u64,
}

struct RuntimeState {
    endpoint: String,
    profile: std::path::PathBuf,
    server_config: ServerLaunchConfig,
    credentials: ProfileCredentials,
    registry: RegistryDocument,
    registry_store: RegistryStore,
    attachment: AttachmentState,
    clients: HashMap<String, ClientSession>,
    bridges: HashMap<String, BridgePeer>,
    holders: HashMap<String, HolderSession>,
    launches: HashMap<String, AttachStart>,
    holders_terminating: std::collections::HashSet<String>,
    surfaces: HashMap<String, Surface>,
    holders_starting: std::collections::HashSet<String>,
    tabs_max: usize,
    max_concurrent_starts: usize,
    active_starts: usize,
    last_start: Option<std::time::Instant>,
    last_activity: std::time::Instant,
    core_started: std::time::Instant,
    last_supervision_tick: std::time::Instant,
    core: crate::core::server::State,
    workers: crate::shell::workers::WorkerPool<Result<(), String>>,
    startup_notice: Option<String>,
    diagnostics_root: std::path::PathBuf,
}
impl RuntimeState {
    fn is_idle(&self) -> bool {
        self.clients.is_empty()
            && self.bridges.is_empty()
            && self.holders.is_empty()
            && self.holders_starting.is_empty()
            && self.last_activity.elapsed() >= std::time::Duration::from_secs(10 * 60)
    }

    fn default_tab(&self) -> String {
        self.registry
            .tabs
            .iter()
            .min_by_key(|tab| tab.order)
            .map(|tab| tab.tab_id.clone())
            .unwrap_or_else(|| "tab-1".into())
    }
}

struct HeldAuthority;
impl RegistryAuthority for HeldAuthority {
    fn is_current(&self, _epoch: u64) -> bool {
        true
    }
}

fn inspect_identity_bounded(pid: u32) -> Result<Option<ProcessIdentity>, String> {
    let mut worker = crate::shell::workers::WorkerPool::new(1);
    worker
        .execute(
            u64::from(pid),
            std::time::Duration::from_secs(2),
            move || {
                crate::fault_injection::delay("A1_TABS_FAULT_DELAY_HOLDER_IDENTITY_MS");
                crate::identity::inspect_process(pid).map_err(|error| error.to_string())
            },
        )
        .map_err(str::to_owned)?;
    loop {
        for event in worker.poll(std::time::Instant::now()) {
            match event {
                crate::shell::workers::WorkerEvent::Completed { value, .. } => return value,
                crate::shell::workers::WorkerEvent::DeadlineMissed { .. } => {
                    return Err("identity inspection deadline exceeded".into());
                }
                crate::shell::workers::WorkerEvent::FailFast { .. } => {
                    return Err("identity inspection worker limit reached".into());
                }
            }
        }
        thread::sleep(std::time::Duration::from_millis(2));
    }
}

fn verify_session_writer_released(path: &Path, timeout: std::time::Duration) -> Result<(), String> {
    if !path.is_file() {
        return Err(format!("prior session is missing: {}", path.display()));
    }
    let deadline = std::time::Instant::now() + timeout;
    loop {
        match SessionLock::acquire(path) {
            Ok(lock) => {
                lock.release();
                return Ok(());
            }
            Err(_) if std::time::Instant::now() < deadline => {
                thread::sleep(std::time::Duration::from_millis(50));
            }
            Err(error) => return Err(format!("prior session writer did not release: {error}")),
        }
    }
}

fn commit_registry(store: RegistryStore, document: RegistryDocument) -> Result<(), String> {
    let incarnation = document.registry_revision;
    let mut worker = crate::shell::workers::WorkerPool::new(1);
    worker
        .execute(incarnation, std::time::Duration::from_secs(5), move || {
            store.commit(&document)
        })
        .map_err(str::to_owned)?;
    loop {
        for event in worker.poll(std::time::Instant::now()) {
            match event {
                crate::shell::workers::WorkerEvent::Completed { value, .. } => return value,
                crate::shell::workers::WorkerEvent::DeadlineMissed { .. } => {
                    return Err("registry persistence deadline exceeded".into());
                }
                crate::shell::workers::WorkerEvent::FailFast { .. } => {
                    return Err("registry persistence worker limit reached".into());
                }
            }
        }
        thread::sleep(std::time::Duration::from_millis(2));
    }
}

pub fn run_server_child(profile: &Path, ready: &Path, context: &[u8]) -> Result<(), String> {
    let config: ServerLaunchConfig = serde_json::from_slice(context)
        .map_err(|error| format!("decode server context: {error}"))?;
    crate::fault_injection::install(&config.fault_environment);
    crate::fault_injection::validate_environment()?;
    let data = Path::new(&config.data_dir);
    let token = crate::endpoint::endpoint_token(profile).map_err(|error| error.to_string())?;
    let root = data.join("tabs").join(token);
    std::fs::create_dir_all(&root)
        .map_err(|error| format!("create resident registry root: {error}"))?;
    let lease_path = root.join("registry-writer-lease");
    if !lease_path.exists() {
        std::fs::write(&lease_path, b"a1 resident writer lease\n")
            .map_err(|error| format!("create registry writer lease: {error}"))?;
    }
    let lease_deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
    let _lease = loop {
        match SessionLock::acquire(&lease_path) {
            Ok(lease) => break lease,
            Err(error) if std::time::Instant::now() < lease_deadline => {
                let _ = error;
                thread::sleep(std::time::Duration::from_millis(25));
            }
            Err(error) => return Err(format!("registry writer lease held: {error}")),
        }
    };
    crate::fault_injection::crash_at("after-lease");
    let credentials = ProfileCredentials::load_or_create(&root)?;
    let mut system = crate::identity::current_system().map_err(|error| error.to_string())?;
    system.os_session = config.os_session_identity.clone();
    let (existing, startup_notice) = RegistryStore::recover(&root.join("registry.json"))?;
    let epoch = existing
        .as_ref()
        .map_or(1, |document| document.epoch.saturating_add(1));
    let mut registry = existing.unwrap_or_else(|| RegistryDocument {
        registry_revision: 0,
        epoch,
        boot_id: system.boot.clone(),
        os_session_id: system.os_session.clone(),
        tabs: Vec::new(),
    });
    registry.epoch = epoch;
    let all_holders_gone = registry.tabs.iter().all(|tab| {
        tab.holder_pid
            .zip(tab.holder_start_identity.as_deref())
            .is_none_or(|(pid, start)| {
                crate::identity::inspect_process(pid)
                    .ok()
                    .flatten()
                    .is_none_or(|identity| identity.start != start)
            })
    });
    let os_session_changed = !registry.os_session_id.is_empty()
        && registry.os_session_id != "unavailable"
        && system.os_session != "unavailable"
        && registry.os_session_id != system.os_session;
    let prior_session_ended = registry.boot_id != system.boot
        || ((os_session_changed || system.os_session == "unavailable")
            && all_holders_gone
            && !registry.tabs.is_empty());
    if prior_session_ended {
        RegistryStore::archive_tabset(&root, &registry)?;
        registry.tabs.clear();
    }
    registry.boot_id = system.boot;
    registry.os_session_id = system.os_session;
    let mut adopting_holders = std::collections::HashSet::new();
    for tab in &mut registry.tabs {
        if tab.lifecycle != "running" {
            continue;
        }
        let holder_live = tab
            .holder_pid
            .zip(tab.holder_start_identity.as_deref())
            .is_some_and(|(pid, start)| {
                crate::identity::inspect_process(pid)
                    .ok()
                    .flatten()
                    .is_some_and(|identity| identity.start == start)
            });
        let child_live = match (tab.child_pid, tab.child_start_identity.as_deref()) {
            (Some(pid), Some(start)) => crate::identity::inspect_process(pid)
                .ok()
                .flatten()
                .is_some_and(|identity| identity.start == start),
            (None, None) => true,
            _ => false,
        };
        if holder_live && child_live {
            adopting_holders.insert(tab.tab_id.clone());
        } else {
            tab.lifecycle = "holder-lost".into();
            tab.holder_pid = None;
            tab.holder_start_identity = None;
            tab.child_pid = None;
            tab.child_start_identity = None;
        }
    }
    registry.registry_revision = registry.registry_revision.saturating_add(1);
    let registry_store =
        RegistryStore::new(root.join("registry.json"), epoch, Arc::new(HeldAuthority));
    commit_registry(registry_store.clone(), registry.clone())?;
    crate::fault_injection::crash_at("after-epoch");
    if !config.endpoint.is_empty() {
        let owner = crate::identity::inspect_process(std::process::id())
            .map_err(|error| error.to_string())?
            .ok_or_else(|| "inspect server owner identity".to_owned())?;
        let marker = serde_json::to_vec_pretty(&serde_json::json!({
            "pid": owner.pid,
            "startIdentity": owner.start,
            "endpoint": &config.endpoint,
            "generation": protocol::GENERATION,
            "verified": true,
            "detachmentMode": "resident-child",
        }))
        .map_err(|error| error.to_string())?;
        crate::durable::replace(root.join("server.json"), &marker)
            .map_err(|error| error.to_string())?;
        crate::fault_injection::crash_at("after-marker");
    }
    if !config.endpoint.is_empty() {
        endpoint::remove_stale(&config.endpoint).map_err(|error| error.to_string())?;
    }
    let mut endpoint = if config.endpoint.is_empty() {
        OwnerEndpoint::bind(profile, Path::new(&config.runtime_dir))
            .map_err(|error| error.to_string())?
    } else {
        OwnerEndpoint::bind_name(config.endpoint.clone()).map_err(|error| error.to_string())?
    };
    crate::fault_injection::crash_at("after-bind");
    std::fs::write(ready, format!("{}:server\n", std::process::id()))
        .map_err(|error| format!("write server readiness: {error}"))?;
    #[cfg(unix)]
    let endpoint_address = endpoint.path().to_string_lossy().into_owned();
    #[cfg(windows)]
    let endpoint_address = endpoint.name().to_owned();
    let starting_tabs = adopting_holders;
    let diagnostics_root = root.join("diagnostics");
    let _ = crate::roles::diagnostics::append_log(&diagnostics_root, "server", "started");
    let watchdog = crate::shell::watchdog::start(
        "server",
        &diagnostics_root,
        std::time::Duration::from_secs(15),
        vec!["server-main".into(), "server-accept".into()],
    );
    crate::fault_injection::freeze_role("server");
    let core_started = std::time::Instant::now();
    let mut core = crate::core::server::State::new(epoch, config.max_concurrent_starts);
    core.unresponsive_restart_after =
        std::time::Duration::from_secs(config.unresponsive_restart_seconds.clamp(30, 600));
    for tab in &registry.tabs {
        let mut core_tab = crate::core::server::TabState::new((80, 23));
        core_tab.incarnation = tab.incarnation;
        core_tab.holder_pid = tab.holder_pid;
        core_tab.lifecycle = match tab.lifecycle.as_str() {
            "running" => crate::core::server::Lifecycle::Running,
            "stopping" => crate::core::server::Lifecycle::Stopping,
            "stopped" => crate::core::server::Lifecycle::Stopped,
            "holder-lost" => crate::core::server::Lifecycle::HolderLost,
            "crashed" => crate::core::server::Lifecycle::Crashed,
            "restarting" => crate::core::server::Lifecycle::Restarting,
            "unresponsive" => crate::core::server::Lifecycle::Unresponsive,
            "failed" => crate::core::server::Lifecycle::Failed,
            _ => crate::core::server::Lifecycle::Pending,
        };
        core_tab.restarts = tab.restarts;
        core_tab.last_exit = tab.last_exit.clone();
        core.tabs.insert(tab.tab_id.clone(), core_tab);
    }
    let mut recovered_environment = std::env::vars().collect::<Vec<_>>();
    sanitize_tab_environment(&mut recovered_environment);
    let launches = registry
        .tabs
        .iter()
        .map(|tab| {
            (
                tab.tab_id.clone(),
                AttachStart {
                    client_id: "recovered-server".into(),
                    tabs_max: 10,
                    cwd: tab.cwd.clone(),
                    columns: 80,
                    rows: 23,
                    release_root: tab.release.clone(),
                    node_executable: "node".into(),
                    environment: recovered_environment.clone(),
                    session_file: tab.session_file.clone(),
                    session_dir: tab.session_dir.clone(),
                },
            )
        })
        .collect();
    let state = Arc::new(Mutex::new(RuntimeState {
        endpoint: endpoint_address,
        profile: profile.to_path_buf(),
        server_config: config.clone(),
        credentials,
        registry,
        registry_store,
        attachment: AttachmentState::default(),
        clients: HashMap::new(),
        bridges: HashMap::new(),
        holders: HashMap::new(),
        launches,
        holders_terminating: std::collections::HashSet::new(),
        surfaces: HashMap::new(),
        holders_starting: starting_tabs,
        tabs_max: 10,
        max_concurrent_starts: config.max_concurrent_starts.clamp(1, 8),
        active_starts: 0,
        last_start: None,
        last_activity: std::time::Instant::now(),
        core_started,
        last_supervision_tick: core_started,
        core,
        workers: crate::shell::workers::WorkerPool::new(8),
        startup_notice,
        diagnostics_root,
    }));
    let (accepted_tx, accepted_rx) = mpsc::channel();
    thread::spawn(move || {
        loop {
            match endpoint.accept() {
                Ok(stream) => {
                    if accepted_tx.send(Ok(stream)).is_err() {
                        return;
                    }
                }
                Err(error) => {
                    let _ = accepted_tx.send(Err(error.to_string()));
                    return;
                }
            }
        }
    });
    loop {
        watchdog.bump();
        match accepted_rx.recv_timeout(std::time::Duration::from_secs(1)) {
            Ok(Ok(stream)) => {
                let shared = state.clone();
                let profile = profile.to_path_buf();
                thread::spawn(move || {
                    let _ = serve_peer(stream, shared, profile);
                });
            }
            Ok(Err(error)) => return Err(error),
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                return Err("resident endpoint stopped".to_owned());
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                supervise_holders(&state);
                if state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?
                    .is_idle()
                {
                    return Ok(());
                }
            }
        }
    }
}

fn acquire_start_gate(state: &Arc<Mutex<RuntimeState>>, timeout: std::time::Duration) -> bool {
    let deadline = std::time::Instant::now() + timeout;
    loop {
        if let Ok(mut locked) = state.lock() {
            let spaced = locked
                .last_start
                .is_none_or(|last| last.elapsed() >= crate::core::server::START_SPACING);
            if locked.active_starts < locked.max_concurrent_starts && spaced {
                locked.active_starts = locked.active_starts.saturating_add(1);
                locked.last_start = Some(std::time::Instant::now());
                return true;
            }
        } else {
            return false;
        }
        if std::time::Instant::now() >= deadline {
            return false;
        }
        thread::sleep(std::time::Duration::from_millis(10));
    }
}

fn release_start_gate(state: &Arc<Mutex<RuntimeState>>) {
    if let Ok(mut locked) = state.lock() {
        locked.active_starts = locked.active_starts.saturating_sub(1);
    }
}

fn supervise_holders(state: &Arc<Mutex<RuntimeState>>) {
    let (stale, commit) = {
        let Ok(mut locked) = state.lock() else {
            return;
        };
        if locked
            .workers
            .poll(std::time::Instant::now())
            .iter()
            .any(|event| matches!(event, crate::shell::workers::WorkerEvent::FailFast { .. }))
        {
            panic!("resident server abandoned-worker limit reached");
        }
        let observed = std::time::Instant::now();
        let loop_healthy = observed.duration_since(locked.last_supervision_tick)
            <= std::time::Duration::from_secs(2);
        locked.last_supervision_tick = observed;
        let now = locked.core_started.elapsed();
        let effects = crate::core::server::step(
            &mut locked.core,
            crate::core::server::Event::Tick { loop_healthy },
            now,
        );
        let mut pids = std::collections::HashSet::new();
        let mut notices = Vec::new();
        for effect in effects {
            match effect {
                crate::core::Effect::InspectIdentity { process_id, .. } => {
                    pids.insert(process_id);
                }
                crate::core::Effect::Send { peer, message } => notices.push((peer, message)),
                _ => {}
            }
        }
        let mut registry_changed = false;
        for (tab_id, message) in notices {
            if message == "terminate-unresponsive-child" {
                if let Some(holder) = locked.holders.get(&tab_id) {
                    let _ = holder.peer.offer_control(
                        wire::frame(
                            "holder.terminate-child",
                            None,
                            wire::ResultBody {
                                accepted: true,
                                message: Some("event loop unresponsive".into()),
                            },
                        )
                        .unwrap_or_default(),
                    );
                }
            } else if message == "child-responsive" {
                let responsive = locked.surfaces.get_mut(&tab_id).map(|surface| {
                    surface.status = "idle".into();
                    surface.clone()
                });
                if let Some(surface) = responsive {
                    for client in locked
                        .clients
                        .values()
                        .filter(|client| client.viewed_tab == tab_id)
                    {
                        client.peer.offer_surface(
                            wire::frame("surface", None, surface.clone()).unwrap_or_default(),
                        );
                    }
                }
                if let Some(record) = locked
                    .registry
                    .tabs
                    .iter_mut()
                    .find(|record| record.tab_id == tab_id)
                {
                    if record.lifecycle == "unresponsive" {
                        record.lifecycle = "running".into();
                        registry_changed = true;
                    }
                }
            } else if message == "child-unresponsive" {
                let unresponsive = locked.surfaces.get_mut(&tab_id).map(|surface| {
                    surface.status = "unresponsive".into();
                    surface.clone()
                });
                if let Some(surface) = unresponsive {
                    for client in locked
                        .clients
                        .values()
                        .filter(|client| client.viewed_tab == tab_id)
                    {
                        client.peer.offer_surface(
                            wire::frame("surface", None, surface.clone()).unwrap_or_default(),
                        );
                    }
                }
                if let Some(record) = locked
                    .registry
                    .tabs
                    .iter_mut()
                    .find(|record| record.tab_id == tab_id)
                {
                    if record.lifecycle != "unresponsive" {
                        record.lifecycle = "unresponsive".into();
                        registry_changed = true;
                    }
                }
            }
        }
        if registry_changed {
            locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
        }
        let stale = locked
            .holders
            .iter()
            .filter(|(tab_id, holder)| {
                pids.contains(&holder.identity.pid) && !locked.holders_terminating.contains(*tab_id)
            })
            .map(|(tab_id, holder)| (tab_id.clone(), holder.identity.clone()))
            .collect::<Vec<_>>();
        for (tab_id, _) in &stale {
            locked.holders_terminating.insert(tab_id.clone());
        }
        let commit =
            registry_changed.then(|| (locked.registry_store.clone(), locked.registry.clone()));
        (stale, commit)
    };
    if let Some((store, document)) = commit {
        let _ = commit_registry(store, document);
    }
    for (_, identity) in stale {
        let Ok(mut locked) = state.lock() else {
            return;
        };
        let incarnation = u64::from(identity.pid);
        let _ =
            locked
                .workers
                .execute(incarnation, std::time::Duration::from_secs(12), move || {
                    crate::identity::terminate_verified(
                        &identity,
                        std::time::Duration::from_secs(5),
                        std::time::Duration::from_secs(5),
                    )
                    .map_err(|error| error.to_string())
                });
    }
}

pub fn probe(address: &str, token: &[u8]) -> Result<(), String> {
    let mut stream = endpoint::connect(address).map_err(|error| error.to_string())?;
    wire::send(
        &mut stream,
        "hello",
        Some(1),
        RoleHello {
            role: "probe".into(),
            generation: protocol::GENERATION,
            build: "a1".into(),
            features: vec![],
            token: token.to_vec(),
            tab_id: None,
            pid: Some(std::process::id()),
            start_identity: None,
            incarnation: 0,
            child_pid: None,
            child_start_identity: None,
            highest_epoch: 0,
        },
    )?;
    let payload =
        wire::read_payload(&mut stream)?.ok_or_else(|| "server closed the probe".to_owned())?;
    let kind = wire::kind(&payload)?;
    if kind.message_type != "welcome" {
        return Err(format!("resident probe refused: {}", kind.message_type));
    }
    let (_, welcome): (_, Welcome) = wire::body(&payload)?;
    if welcome.generation != protocol::GENERATION {
        return Err("resident server generation is incompatible".to_owned());
    }
    Ok(())
}

fn serve_peer(
    mut stream: endpoint::EndpointStream,
    state: Arc<Mutex<RuntimeState>>,
    profile: std::path::PathBuf,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?
        .last_activity = std::time::Instant::now();
    endpoint::set_handshake_deadline(&stream, std::time::Duration::from_secs(4))
        .map_err(|error| error.to_string())?;
    let payload =
        wire::read_payload(&mut stream)?.ok_or_else(|| "peer closed before hello".to_owned())?;
    endpoint::clear_handshake_deadline(&stream).map_err(|error| error.to_string())?;
    let kind = wire::kind(&payload)?;
    if kind.message_type != "hello" {
        return Err("first resident message is not hello".to_owned());
    }
    let (request_id, hello): (_, RoleHello) = wire::body(&payload)?;
    if hello.generation != protocol::GENERATION {
        return wire::send(
            &mut stream,
            "incompatible-generation",
            request_id,
            protocol::IncompatibleGeneration {
                offered: hello.generation,
                supported: protocol::GENERATION,
            },
        );
    }
    let expected = {
        let locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        match hello.role.as_str() {
            "attach" | "internal" | "probe" => locked.credentials.client_token.to_vec(),
            "holder" | "bridge" => {
                let tab_id = hello.tab_id.as_deref().unwrap_or("");
                let incarnation = locked
                    .registry
                    .tabs
                    .iter()
                    .find(|tab| tab.tab_id == tab_id)
                    .map_or(1, |tab| {
                        if hello.role == "holder"
                            && tab.lifecycle == "restarting"
                            && hello.incarnation.saturating_add(1) == tab.incarnation
                        {
                            hello.incarnation
                        } else {
                            tab.incarnation
                        }
                    });
                locked
                    .credentials
                    .derive(
                        if hello.role == "holder" {
                            "holder"
                        } else {
                            "bridge"
                        },
                        tab_id,
                        incarnation,
                    )
                    .to_vec()
            }
            _ => return Err("unapproved resident peer role".to_owned()),
        }
    };
    if hello.token != expected {
        return Err("resident credential rejected".to_owned());
    }
    let epoch = state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?
        .registry
        .epoch;
    if hello.highest_epoch > epoch {
        return Err("peer has observed a newer server epoch".to_owned());
    }
    if hello.role == "holder" {
        let recorded = {
            let locked = state
                .lock()
                .map_err(|_| "resident state poisoned".to_owned())?;
            locked
                .registry
                .tabs
                .iter()
                .find(|tab| Some(tab.tab_id.as_str()) == hello.tab_id.as_deref())
                .cloned()
                .ok_or_else(|| "holder has no registry record".to_owned())?
        };
        let pending_respawn = recorded.lifecycle == "restarting"
            && hello.incarnation.saturating_add(1) == recorded.incarnation;
        if hello.incarnation != recorded.incarnation && !pending_respawn {
            return Err("holder incarnation does not match the registry".to_owned());
        }
        if let Some(recorded_pid) = recorded.holder_pid {
            let pid = hello
                .pid
                .ok_or_else(|| "holder did not present a pid".to_owned())?;
            let observed = inspect_identity_bounded(pid)?
                .ok_or_else(|| "holder process is not live".to_owned())?;
            if recorded_pid != pid
                || recorded.holder_start_identity.as_deref() != Some(observed.start.as_str())
            {
                return Err("holder identity does not match the registry".to_owned());
            }
        }
        if let Some(recorded_child_pid) = recorded.child_pid {
            let child_pid = hello
                .child_pid
                .ok_or_else(|| "holder did not present its child pid".to_owned())?;
            let child = inspect_identity_bounded(child_pid)?
                .ok_or_else(|| "holder child process is not live".to_owned())?;
            if recorded_child_pid != child_pid
                || recorded.child_start_identity.as_deref() != Some(child.start.as_str())
                || hello.child_start_identity.as_deref() != Some(child.start.as_str())
            {
                return Err("holder child identity does not match the registry".to_owned());
            }
        }
    }
    if hello.role == "probe" {
        return wire::send(&mut stream, "welcome", request_id, welcome(epoch));
    }
    wire::send(&mut stream, "welcome", request_id, welcome(epoch))?;
    let writer = stream
        .try_clone()
        .map_err(|error| format!("clone resident stream: {error}"))?;
    let (tx, rx) = mpsc::sync_channel::<Vec<u8>>(CONTROL_LANE_FRAMES);
    let queued_bytes = Arc::new(AtomicUsize::new(0));
    let surface = Arc::new(Mutex::new(None));
    thread::spawn({
        let queued_bytes = queued_bytes.clone();
        let surface = surface.clone();
        move || writer_loop(writer, rx, queued_bytes, surface)
    });
    let peer = Peer {
        tx,
        queued_bytes,
        surface,
    };
    match hello.role.as_str() {
        "attach" | "internal" => {
            let allow_control = hello.role == "attach";
            serve_attach(stream, peer, state, profile, hello.tab_id, allow_control)
        }
        "holder" => {
            let pid = hello
                .pid
                .ok_or_else(|| "holder did not present a pid".to_owned())?;
            let identity = inspect_identity_bounded(pid)?
                .ok_or_else(|| "holder process is not live".to_owned())?;
            let child_identity = match (hello.child_pid, hello.child_start_identity.as_deref()) {
                (Some(child_pid), Some(child_start)) => inspect_identity_bounded(child_pid)?
                    .filter(|candidate| candidate.start == child_start),
                _ => None,
            };
            serve_holder(
                stream,
                peer,
                state,
                hello.tab_id.unwrap_or_default(),
                identity,
                child_identity,
                hello.incarnation,
            )
        }
        "bridge" => {
            let heartbeat_supported = hello
                .features
                .iter()
                .any(|feature| feature == "bridge-heartbeat" || feature == "crash-recovery");
            serve_bridge(
                stream,
                peer,
                state,
                hello.tab_id.unwrap_or_default(),
                hello.incarnation,
                heartbeat_supported,
            )
        }
        _ => unreachable!(),
    }
}

fn welcome(epoch: u64) -> Welcome {
    Welcome {
        generation: protocol::GENERATION,
        build: "a1-terminal-host".into(),
        features: vec![
            "resident-multi-tab".into(),
            "slow-client-isolation".into(),
            "crash-recovery".into(),
            "bridge-heartbeat".into(),
            "bridge-restart".into(),
            "recovery-status".into(),
        ],
        frame_limit: protocol::MAX_FRAME_BYTES as u32,
        input_limit: protocol::MAX_INPUT_BYTES as u32,
        epoch,
    }
}

fn writer_loop(
    mut stream: endpoint::EndpointStream,
    rx: mpsc::Receiver<Vec<u8>>,
    queued_bytes: Arc<AtomicUsize>,
    surface: Arc<Mutex<Option<Vec<u8>>>>,
) {
    loop {
        match rx.recv_timeout(std::time::Duration::from_millis(8)) {
            Ok(frame) => {
                queued_bytes.fetch_sub(frame.len(), Ordering::SeqCst);
                if stream
                    .write_all(&frame)
                    .and_then(|()| stream.flush())
                    .is_err()
                {
                    break;
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
            _ => {}
        }
        let frame = surface.lock().ok().and_then(|mut slot| slot.take());
        if let Some(frame) = frame
            && stream
                .write_all(&frame)
                .and_then(|()| stream.flush())
                .is_err()
        {
            break;
        }
    }
}

fn claim_client_control(
    locked: &mut RuntimeState,
    client_id: &str,
    allow_control: bool,
) -> Result<Option<(Peer, BridgeAttachment)>, String> {
    if !allow_control {
        return Ok(None);
    }
    let Some(viewed_tab) = locked
        .clients
        .get(client_id)
        .map(|client| client.viewed_tab.clone())
    else {
        return Ok(None);
    };
    if locked
        .clients
        .get(client_id)
        .is_some_and(|client| client.controller)
    {
        return Ok(None);
    }
    let previous = locked
        .attachment
        .current(&viewed_tab)
        .map(|(id, _)| id.to_owned());
    let revision = locked
        .attachment
        .transfer(&viewed_tab, client_id.to_owned());
    if let Some(previous) = previous
        && let Some(client) = locked.clients.get_mut(&previous)
    {
        client.controller = false;
        client.controller_revision = 0;
        let _ = client.peer.offer_control(wire::frame(
            "viewer.status",
            None,
            wire::ResultBody {
                accepted: true,
                message: None,
            },
        )?);
    }
    if let Some(client) = locked.clients.get_mut(client_id) {
        client.controller = true;
        client.controller_revision = revision;
    }
    Ok(locked.bridges.get(&viewed_tab).map(|bridge| {
        (
            bridge.peer.clone(),
            BridgeAttachment {
                client_id: client_id.to_owned(),
                controller_revision: revision,
            },
        )
    }))
}

fn serve_attach(
    mut stream: endpoint::EndpointStream,
    tx: Peer,
    state: Arc<Mutex<RuntimeState>>,
    profile: std::path::PathBuf,
    requested_tab: Option<String>,
    allow_control: bool,
) -> Result<(), String> {
    let client_id = format!("client-{:016x}", rand::random::<u64>());
    let (revision, _controller, startup_notice) = {
        let mut locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        let viewed_tab = requested_tab
            .filter(|tab_id| locked.registry.tabs.iter().any(|tab| &tab.tab_id == tab_id))
            .unwrap_or_else(|| locked.default_tab());
        let (revision, controller) =
            if allow_control && locked.attachment.current(&viewed_tab).is_none() {
                (
                    locked.attachment.attach(&viewed_tab, client_id.clone())?,
                    true,
                )
            } else {
                (
                    locked
                        .attachment
                        .current(&viewed_tab)
                        .map_or(0, |(_, revision)| revision),
                    false,
                )
            };
        locked.clients.insert(
            client_id.clone(),
            ClientSession {
                peer: tx.clone(),
                viewed_tab: viewed_tab.clone(),
                controller,
                controller_revision: revision,
            },
        );
        if let Some(holder) = locked.holders.get(&viewed_tab) {
            let _ = holder.peer.offer_control(wire::frame(
                "surface.subscription",
                None,
                wire::SurfaceSubscription { enabled: true },
            )?);
        }
        if let Some(surface) = locked.surfaces.get(&viewed_tab).cloned() {
            tx.offer_surface(wire::frame("surface", None, surface)?);
        }
        if controller && let Some(bridge) = locked.bridges.get(&viewed_tab) {
            let _ = bridge.peer.offer_control(wire::frame(
                "attachment",
                None,
                BridgeAttachment {
                    client_id: client_id.clone(),
                    controller_revision: revision,
                },
            )?);
        }
        let startup_notice = locked
            .startup_notice
            .clone()
            .or_else(|| locked.registry_store.failure());
        (revision, controller, startup_notice)
    };
    if let Some(message) = startup_notice {
        tx.offer_control(wire::frame(
            "recovery.notice",
            None,
            wire::ResultBody {
                accepted: true,
                message: Some(message),
            },
        )?)
        .map_err(str::to_owned)?;
    }
    tx.offer_control(wire::frame(
        "attached",
        None,
        BridgeAttachment {
            client_id: client_id.clone(),
            controller_revision: revision,
        },
    )?)
    .map_err(str::to_owned)?;
    while let Some(payload) = wire::read_payload(&mut stream)? {
        let kind = wire::kind(&payload)?;
        match kind.message_type.as_str() {
            "attach.start" => {
                let (_, start): (_, AttachStart) = wire::body(&payload)?;
                if let Ok(mut locked) = state.lock() {
                    locked.tabs_max = start.tabs_max.clamp(1, 50);
                }
                let tab_id = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?
                    .default_tab();
                let should_start = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    locked.registry.tabs.is_empty()
                        && locked.holders_starting.insert(tab_id.clone())
                };
                if should_start {
                    start_holder(&profile, &state, tab_id, start)?;
                }
            }
            "tab.create" => {
                let (_, create): (_, TabCreate) = wire::body(&payload)?;
                let tab_id = format!("tab-{:016x}", rand::random::<u64>());
                {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    let active_tabs = locked
                        .registry
                        .tabs
                        .iter()
                        .filter(|tab| tab.desired != "stopped")
                        .count();
                    let pending_tabs = locked
                        .holders_starting
                        .iter()
                        .filter(|tab_id| {
                            !locked
                                .registry
                                .tabs
                                .iter()
                                .any(|tab| &tab.tab_id == *tab_id)
                        })
                        .count();
                    if active_tabs + pending_tabs >= locked.tabs_max {
                        tx.offer_control(wire::frame(
                            "tab.create-refused",
                            kind.request_id,
                            wire::ResultBody {
                                accepted: false,
                                message: Some("tab-limit".into()),
                            },
                        )?)
                        .map_err(str::to_owned)?;
                        continue;
                    }
                    locked.holders_starting.insert(tab_id.clone());
                }
                let start = AttachStart {
                    client_id: client_id.clone(),
                    tabs_max: state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?
                        .tabs_max,
                    cwd: create.cwd,
                    columns: create.columns,
                    rows: create.rows,
                    release_root: create.release_root,
                    node_executable: create.node_executable,
                    environment: create.environment,
                    session_file: None,
                    session_dir: None,
                };
                match start_holder(&profile, &state, tab_id.clone(), start) {
                    Ok(()) => {
                        tx.offer_control(wire::frame(
                            "tab.created",
                            kind.request_id,
                            TabTarget { tab_id },
                        )?)
                        .map_err(str::to_owned)?;
                    }
                    Err(error) => {
                        if let Ok(mut locked) = state.lock() {
                            locked.holders_starting.remove(&tab_id);
                        }
                        tx.offer_control(wire::frame(
                            "tab.create-failed",
                            kind.request_id,
                            wire::ResultBody {
                                accepted: false,
                                message: Some(error),
                            },
                        )?)
                        .map_err(str::to_owned)?;
                    }
                }
            }
            "tab.list" => {
                let (revision, tabs) = {
                    let locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    let mut tabs = locked
                        .registry
                        .tabs
                        .iter()
                        .map(|tab| TabSummary {
                            tab_id: tab.tab_id.clone(),
                            name: tab.display_name.clone(),
                            name_source: tab.name_source.clone(),
                            lifecycle: tab.lifecycle.clone(),
                            cwd: tab.cwd.clone(),
                        })
                        .collect::<Vec<_>>();
                    tabs.sort_by_key(|tab| {
                        locked
                            .registry
                            .tabs
                            .iter()
                            .find(|record| record.tab_id == tab.tab_id)
                            .map_or(u32::MAX, |record| record.order)
                    });
                    (locked.registry.registry_revision, tabs)
                };
                tx.offer_control(wire::frame(
                    "tab.list",
                    kind.request_id,
                    TabList { revision, tabs },
                )?)
                .map_err(str::to_owned)?;
            }
            "tab.view" => {
                let (_, target): (_, TabTarget) = wire::body(&payload)?;
                let mut locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                if !locked
                    .registry
                    .tabs
                    .iter()
                    .any(|tab| tab.tab_id == target.tab_id)
                {
                    continue;
                }
                let previous = locked.clients.get(&client_id).map(|client| {
                    (
                        client.viewed_tab.clone(),
                        client.controller,
                        client.controller_revision,
                    )
                });
                if let Some((previous_tab, true, previous_revision)) = previous.as_ref() {
                    locked
                        .attachment
                        .detach(previous_tab, &client_id, *previous_revision);
                }
                let next_revision =
                    if allow_control && locked.attachment.current(&target.tab_id).is_none() {
                        Some(
                            locked
                                .attachment
                                .attach(&target.tab_id, client_id.clone())?,
                        )
                    } else {
                        None
                    };
                if let Some(client) = locked.clients.get_mut(&client_id) {
                    client.viewed_tab = target.tab_id.clone();
                    client.controller = next_revision.is_some();
                    client.controller_revision = next_revision.unwrap_or(0);
                }
                if let Some((previous_tab, _, _)) = previous
                    && previous_tab != target.tab_id
                    && !locked
                        .clients
                        .values()
                        .any(|client| client.viewed_tab == previous_tab)
                    && let Some(holder) = locked.holders.get(&previous_tab)
                {
                    let _ = holder.peer.offer_control(wire::frame(
                        "surface.subscription",
                        None,
                        wire::SurfaceSubscription { enabled: false },
                    )?);
                }
                if let Some(holder) = locked.holders.get(&target.tab_id) {
                    let _ = holder.peer.offer_control(wire::frame(
                        "surface.subscription",
                        None,
                        wire::SurfaceSubscription { enabled: true },
                    )?);
                }
                if let Some(surface) = locked.surfaces.get(&target.tab_id).cloned() {
                    tx.offer_surface(wire::frame("surface", None, surface)?);
                }
                if let Some(controller_revision) = next_revision
                    && let Some(bridge) = locked.bridges.get(&target.tab_id)
                {
                    let _ = bridge.peer.offer_control(wire::frame(
                        "attachment",
                        None,
                        BridgeAttachment {
                            client_id: client_id.clone(),
                            controller_revision,
                        },
                    )?);
                }
            }
            "tab.reorder" => {
                let (_, reorder): (_, wire::TabReorder) = wire::body(&payload)?;
                let commit = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    if locked.registry.registry_revision != reorder.expected_revision {
                        None
                    } else if let Some(from) = locked
                        .registry
                        .tabs
                        .iter()
                        .position(|tab| tab.tab_id == reorder.tab_id)
                    {
                        let tab = locked.registry.tabs.remove(from);
                        let target = reorder.target_index.min(locked.registry.tabs.len());
                        locked.registry.tabs.insert(target, tab);
                        for (index, tab) in locked.registry.tabs.iter_mut().enumerate() {
                            tab.order = index as u32;
                        }
                        locked.registry.registry_revision =
                            locked.registry.registry_revision.saturating_add(1);
                        Some((locked.registry_store.clone(), locked.registry.clone()))
                    } else {
                        None
                    }
                };
                let accepted = commit.is_some();
                if let Some((store, document)) = commit {
                    commit_registry(store, document)?;
                }
                tx.offer_control(wire::frame(
                    "tab.reordered",
                    kind.request_id,
                    wire::ResultBody {
                        accepted,
                        message: if accepted {
                            None
                        } else {
                            Some("stale tab order".into())
                        },
                    },
                )?)
                .map_err(str::to_owned)?;
            }
            "tab.rename" => {
                let (_, rename): (_, wire::TabRename) = wire::body(&payload)?;
                let name = rename.name.trim();
                let valid = !name.is_empty()
                    && name.chars().count() <= 64
                    && !name.chars().any(char::is_control);
                if !valid {
                    tx.offer_control(wire::frame(
                        "tab.rename-refused",
                        kind.request_id,
                        wire::ResultBody {
                            accepted: false,
                            message: Some("Tab names must be 1–64 printable characters.".into()),
                        },
                    )?)
                    .map_err(str::to_owned)?;
                    continue;
                }
                let commit = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    if let Some(tab) = locked
                        .registry
                        .tabs
                        .iter_mut()
                        .find(|tab| tab.tab_id == rename.tab_id)
                    {
                        tab.display_name = name.to_owned();
                        tab.name_source = "user".into();
                        locked.registry.registry_revision =
                            locked.registry.registry_revision.saturating_add(1);
                        Some((locked.registry_store.clone(), locked.registry.clone()))
                    } else {
                        None
                    }
                };
                let accepted = commit.is_some();
                if let Some((store, document)) = commit {
                    commit_registry(store, document)?;
                }
                tx.offer_control(wire::frame(
                    "tab.renamed",
                    kind.request_id,
                    wire::ResultBody {
                        accepted,
                        message: None,
                    },
                )?)
                .map_err(str::to_owned)?;
            }
            "tab.close" => {
                let (_, target): (_, TabTarget) = wire::body(&payload)?;
                let mut locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                if let Some(holder) = locked.holders.get(&target.tab_id) {
                    let _ = holder.peer.offer_control(wire::frame(
                        "shutdown",
                        kind.request_id,
                        target.clone(),
                    )?);
                }
                let commit = if let Some(tab) = locked
                    .registry
                    .tabs
                    .iter_mut()
                    .find(|tab| tab.tab_id == target.tab_id)
                {
                    tab.desired = "stopped".into();
                    tab.lifecycle = "stopping".into();
                    locked.registry.registry_revision =
                        locked.registry.registry_revision.saturating_add(1);
                    Some((locked.registry_store.clone(), locked.registry.clone()))
                } else {
                    None
                };
                drop(locked);
                if let Some((store, document)) = commit {
                    commit_registry(store, document)?;
                }
                tx.offer_control(wire::frame(
                    "tab.closed",
                    kind.request_id,
                    wire::ResultBody {
                        accepted: true,
                        message: None,
                    },
                )?)
                .map_err(str::to_owned)?;
            }
            "tab.claimInput" => {
                let bridge = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    claim_client_control(&mut locked, &client_id, allow_control)?
                };
                if let Some((peer, attachment)) = bridge {
                    let _ = peer.offer_control(wire::frame("attachment", None, attachment)?);
                }
                tx.offer_control(wire::frame(
                    "tab.inputClaimed",
                    kind.request_id,
                    wire::ResultBody {
                        accepted: true,
                        message: None,
                    },
                )?)
                .map_err(str::to_owned)?;
            }
            "paste.start" | "input" | "resize" => {
                let target = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    let bridge = claim_client_control(&mut locked, &client_id, allow_control)?;
                    if let Some((peer, attachment)) = bridge {
                        let _ = peer.offer_control(wire::frame("attachment", None, attachment)?);
                    }
                    locked
                        .clients
                        .get(&client_id)
                        .filter(|client| client.controller)
                        .and_then(|client| locked.holders.get(&client.viewed_tab))
                        .map(|holder| (holder.peer.clone(), locked.registry.epoch))
                };
                let Some((holder, epoch)) = target else {
                    tx.offer_control(wire::frame(
                        "input.rejected",
                        kind.request_id,
                        wire::ResultBody {
                            accepted: false,
                            message: Some("read-only-viewer".into()),
                        },
                    )?)
                    .map_err(str::to_owned)?;
                    continue;
                };
                let frame = match kind.message_type.as_str() {
                    "paste.start" => {
                        let (_, mut body): (_, PasteStart) = wire::body(&payload)?;
                        body.epoch = epoch;
                        wire::frame("paste.start", kind.request_id, body)?
                    }
                    "input" => {
                        let (_, mut body): (_, Input) = wire::body(&payload)?;
                        body.epoch = epoch;
                        wire::frame("input", kind.request_id, body)?
                    }
                    _ => {
                        let (_, mut body): (_, Resize) = wire::body(&payload)?;
                        body.epoch = epoch;
                        wire::frame("resize", kind.request_id, body)?
                    }
                };
                holder.offer_control(frame).map_err(str::to_owned)?;
            }
            "detach" => break,
            _ => {}
        }
    }
    let mut locked = state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?;
    if let Some(session) = locked.clients.remove(&client_id) {
        if session.controller {
            locked
                .attachment
                .detach(&session.viewed_tab, &client_id, session.controller_revision);
        }
        let still_viewed = locked
            .clients
            .values()
            .any(|client| client.viewed_tab == session.viewed_tab);
        if !still_viewed && let Some(holder) = locked.holders.get(&session.viewed_tab) {
            let _ = holder.peer.offer_control(wire::frame(
                "surface.subscription",
                None,
                wire::SurfaceSubscription { enabled: false },
            )?);
        }
    }
    locked.last_activity = std::time::Instant::now();
    Ok(())
}

pub fn sanitize_tab_environment(environment: &mut Vec<(String, String)>) {
    const STRIP: &[&str] = &[
        "A1_ENDPOINT",
        "A1_EXIT_NOTICE_PATH",
        "A1_PROCESS_GUARDIAN_PATH",
        "A1_STARTUP_TRACE",
        "A1_SESSION_RUNTIME_ID",
        "LAUNCH_CONTEXT_RESIDENT_ROOT_EXECUTABLE",
        "LAUNCH_CONTEXT_RESIDENT_ROOT_ARGUMENTS",
        "LAUNCH_CONTEXT_RESIDENT_FALLBACK",
    ];
    environment.retain(|(name, _)| !STRIP.contains(&name.as_str()));
}

struct StartPermit {
    state: Arc<Mutex<RuntimeState>>,
    tab_id: String,
}
impl Drop for StartPermit {
    fn drop(&mut self) {
        if let Ok(mut locked) = self.state.lock() {
            locked.active_starts = locked.active_starts.saturating_sub(1);
            locked.holders_starting.remove(&self.tab_id);
        }
    }
}

fn acquire_start_permit(
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: &str,
) -> Result<(StartPermit, std::time::Duration), String> {
    loop {
        {
            let mut locked = state
                .lock()
                .map_err(|_| "resident state poisoned".to_owned())?;
            if locked.active_starts < locked.max_concurrent_starts {
                locked.active_starts += 1;
                let now = std::time::Instant::now();
                let scheduled = locked
                    .last_start
                    .and_then(|last| last.checked_add(std::time::Duration::from_millis(250)))
                    .filter(|next| *next > now)
                    .unwrap_or(now);
                locked.last_start = Some(scheduled);
                return Ok((
                    StartPermit {
                        state: state.clone(),
                        tab_id: tab_id.to_owned(),
                    },
                    scheduled.saturating_duration_since(now),
                ));
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
}

fn start_holder(
    profile: &Path,
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: String,
    mut start: AttachStart,
) -> Result<(), String> {
    let (_permit, spacing) = acquire_start_permit(state, &tab_id)?;
    sanitize_tab_environment(&mut start.environment);
    if !spacing.is_zero() {
        std::thread::sleep(spacing);
    }
    let (
        endpoint,
        server_config,
        incarnation,
        holder_token,
        bridge_token,
        registry_store,
        starting_document,
    ) = {
        let mut locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        let incarnation = locked
            .registry
            .tabs
            .iter()
            .find(|tab| tab.tab_id == tab_id)
            .map_or(1, |tab| tab.incarnation.saturating_add(1));
        let holder_token = locked
            .credentials
            .derive("holder", &tab_id, incarnation)
            .to_vec();
        let bridge_token = locked
            .credentials
            .derive("bridge", &tab_id, incarnation)
            .to_vec();
        let order = locked.registry.tabs.len() as u32;
        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();
        locked.launches.insert(tab_id.clone(), start.clone());
        locked.registry.tabs.retain(|tab| tab.tab_id != tab_id);
        locked.registry.tabs.push(TabRecord {
            tab_id: tab_id.clone(),
            kind: "a1".into(),
            created_at,
            display_name: if order == 0 {
                "agent".into()
            } else {
                format!("agent {}", order + 1)
            },
            name_source: "default".into(),
            order,
            cwd: start.cwd.clone(),
            session_file: start.session_file.clone(),
            session_dir: start.session_dir.clone(),
            desired: "running".into(),
            lifecycle: "starting".into(),
            incarnation,
            holder_pid: None,
            holder_start_identity: None,
            child_pid: None,
            child_start_identity: None,
            release: start.release_root.clone(),
            last_exit: None,
            restarts: 0,
            restart_window_start: None,
            requested_restart: false,
        });
        locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
        let document = locked.registry.clone();
        (
            locked.endpoint.clone(),
            locked.server_config.clone(),
            incarnation,
            holder_token,
            bridge_token,
            locked.registry_store.clone(),
            document,
        )
    };
    commit_registry(registry_store.clone(), starting_document)?;
    let context = HolderLaunchConfig {
        endpoint,
        tab_id: tab_id.clone(),
        incarnation,
        token: holder_token,
        bridge_token,
        cwd: start.cwd,
        columns: start.columns,
        rows: start.rows,
        release_root: start.release_root,
        node_executable: start.node_executable,
        environment: start.environment,
        session_file: start.session_file,
        session_dir: start.session_dir,
        recovery_journals: Vec::new(),
        server: server_config,
    };
    let mut last_error = None;
    let mut launched = None;
    for _ in 0..3 {
        match launch::launch_resident_with_config(ResidentRole::Holder, profile, &context) {
            Ok(value) => {
                launched = Some(value);
                break;
            }
            Err(error) => {
                last_error = Some(error.to_string());
            }
        }
    }
    let outcome = match launched {
        Some((mut process, observation)) => {
            match inspect_identity_bounded(observation.process.pid) {
                Ok(Some(identity)) if identity.start == observation.process.start => {
                    Ok(observation.process)
                }
                Ok(_) => {
                    let _ = process.terminate();
                    Err("holder identity could not be verified".to_owned())
                }
                Err(error) => {
                    let _ = process.terminate();
                    Err(error)
                }
            }
        }
        None => Err(last_error.unwrap_or_else(|| "holder start failed".into())),
    };
    let mut locked = state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?;
    match outcome {
        Ok(identity) => {
            if let Some(record) = locked
                .registry
                .tabs
                .iter_mut()
                .find(|tab| tab.tab_id == tab_id && tab.incarnation == incarnation)
            {
                record.holder_pid = Some(identity.pid);
                record.holder_start_identity = Some(identity.start);
                record.lifecycle = "running".into();
            }
        }
        Err(reason) => {
            if let Some(record) = locked
                .registry
                .tabs
                .iter_mut()
                .find(|tab| tab.tab_id == tab_id && tab.incarnation == incarnation)
            {
                record.lifecycle = "failed".into();
                record.last_exit = Some(reason.clone());
            }
            locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
            let document = locked.registry.clone();
            let store = locked.registry_store.clone();
            drop(locked);
            commit_registry(store, document)?;
            return Err(reason);
        }
    }
    locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
    let document = locked.registry.clone();
    let registry_store = locked.registry_store.clone();
    drop(locked);
    commit_registry(registry_store, document)
}

fn launch_replacement_holder(state: &Arc<Mutex<RuntimeState>>, tab_id: &str) -> Result<(), String> {
    let (context, profile) = {
        let locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        let start = locked
            .launches
            .get(tab_id)
            .ok_or_else(|| "holder launch context is unavailable".to_owned())?;
        let record = locked
            .registry
            .tabs
            .iter()
            .find(|record| record.tab_id == tab_id)
            .ok_or_else(|| "restart tab is absent from registry".to_owned())?;
        let context = HolderLaunchConfig {
            endpoint: locked.endpoint.clone(),
            tab_id: tab_id.to_owned(),
            incarnation: record.incarnation,
            token: locked
                .credentials
                .derive("holder", tab_id, record.incarnation)
                .to_vec(),
            bridge_token: locked
                .credentials
                .derive("bridge", tab_id, record.incarnation)
                .to_vec(),
            cwd: start.cwd.clone(),
            columns: start.columns,
            rows: start.rows,
            release_root: start.release_root.clone(),
            node_executable: start.node_executable.clone(),
            environment: start.environment.clone(),
            session_file: record.session_file.clone(),
            session_dir: record.session_dir.clone(),
            recovery_journals: Vec::new(),
            server: locked.server_config.clone(),
        };
        (context, locked.profile.clone())
    };
    // Rationale: the launch boundary verifies the resident process and the holder handshake
    // independently verifies its PID/start identity before admission. Avoid terminating a holder merely because
    // an additional post-launch observation races with a burst of concurrent replacements.
    let mut last_error = "replacement holder did not start".to_owned();
    for _ in 0..3 {
        match launch::launch_resident_with_config(ResidentRole::Holder, &profile, &context) {
            Ok(_) => return Ok(()),
            Err(error) => last_error = error.to_string(),
        }
        for _ in 0..10 {
            if state.lock().ok().is_some_and(|locked| {
                locked
                    .holders
                    .get(tab_id)
                    .is_some_and(|holder| holder.incarnation == context.incarnation)
            }) {
                return Ok(());
            }
            thread::sleep(std::time::Duration::from_millis(50));
        }
    }
    Err(last_error)
}

fn serve_holder(
    mut stream: endpoint::EndpointStream,
    tx: Peer,
    state: Arc<Mutex<RuntimeState>>,
    tab_id: String,
    identity: ProcessIdentity,
    child_identity: Option<ProcessIdentity>,
    connection_incarnation: u64,
) -> Result<(), String> {
    {
        let mut locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        let viewed = locked
            .clients
            .values()
            .any(|client| client.viewed_tab == tab_id);
        if viewed {
            tx.offer_control(wire::frame(
                "surface.subscription",
                None,
                wire::SurfaceSubscription { enabled: true },
            )?)
            .map_err(str::to_owned)?;
        }
        let holder_pid = identity.pid;
        let holder_start = identity.start.clone();
        let holder_peer = tx.clone();
        let pending_respawn = locked
            .registry
            .tabs
            .iter()
            .find(|record| {
                record.tab_id == tab_id
                    && record.lifecycle == "restarting"
                    && connection_incarnation.saturating_add(1) == record.incarnation
            })
            .map(|record| wire::HolderRespawn {
                tab_id: tab_id.clone(),
                incarnation: record.incarnation,
                session_file: record.session_file.clone(),
                recovery_journals: Vec::new(),
                start_fresh: false,
                holder_token: locked
                    .credentials
                    .derive("holder", &tab_id, record.incarnation)
                    .to_vec(),
                bridge_token: locked
                    .credentials
                    .derive("bridge", &tab_id, record.incarnation)
                    .to_vec(),
            });
        locked.holders.insert(
            tab_id.clone(),
            HolderSession {
                peer: tx,
                identity,
                incarnation: connection_incarnation,
            },
        );
        let mut recovering = false;
        if let Some(record) =
            locked.registry.tabs.iter_mut().find(|record| {
                record.tab_id == tab_id && record.incarnation == connection_incarnation
            })
        {
            recovering = record.lifecycle == "restarting";
            record.holder_pid = Some(holder_pid);
            record.holder_start_identity = Some(holder_start);
            if let Some(child) = child_identity.as_ref() {
                record.child_pid = Some(child.pid);
                record.child_start_identity = Some(child.start.clone());
                record.lifecycle = "running".into();
            }
            let incarnation = record.incarnation;
            let heartbeat_at = locked.core_started.elapsed();
            let core_tab = locked
                .core
                .tabs
                .entry(tab_id.clone())
                .or_insert_with(|| crate::core::server::TabState::new((80, 23)));
            core_tab.incarnation = incarnation;
            core_tab.holder_pid = Some(holder_pid);
            core_tab.lifecycle = crate::core::server::Lifecycle::Running;
            core_tab.last_heartbeat_at = heartbeat_at;
            core_tab.missed_heartbeats = 0;
        }
        if recovering {
            locked.active_starts = locked.active_starts.saturating_sub(1);
        }
        let registry_commit = recovering.then(|| {
            locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
            (locked.registry_store.clone(), locked.registry.clone())
        });
        locked.holders_terminating.remove(&tab_id);
        locked.holders_starting.remove(&tab_id);
        locked.last_activity = std::time::Instant::now();
        drop(locked);
        if let Some((store, document)) = registry_commit {
            commit_registry(store, document)?;
        }
        if let Some(respawn) = pending_respawn {
            if !acquire_start_gate(&state, std::time::Duration::from_secs(40)) {
                return Err("resident restart start gate timed out".into());
            }
            if let Err(error) =
                holder_peer.offer_control(wire::frame("holder.respawn", None, respawn)?)
            {
                release_start_gate(&state);
                return Err(error.to_owned());
            }
        }
    }
    let mut last_exit = None;
    while let Some(payload) = wire::read_payload(&mut stream)? {
        let kind = wire::kind(&payload)?;
        match kind.message_type.as_str() {
            "surface" => {
                let (_, mut surface): (_, Surface) = wire::body(&payload)?;
                surface.tab_id = tab_id.clone();
                let mut locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                locked.surfaces.insert(tab_id.clone(), surface.clone());
                for client in locked
                    .clients
                    .values()
                    .filter(|client| client.viewed_tab == tab_id)
                {
                    client
                        .peer
                        .offer_surface(wire::frame("surface", None, surface.clone())?);
                }
            }
            "input.rejected" | "input.uncertain" => {
                let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                let locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                for client in locked
                    .clients
                    .values()
                    .filter(|client| client.viewed_tab == tab_id)
                {
                    let _ = client.peer.offer_control(wire::frame(
                        &kind.message_type,
                        kind.request_id,
                        result.clone(),
                    )?);
                }
            }
            "holder.heartbeat" => {
                let (_, ready): (_, wire::HolderReady) = wire::body(&payload)?;
                let child = inspect_identity_bounded(ready.child_pid)?
                    .filter(|identity| identity.start == ready.child_start_identity);
                let mut locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                let now = locked.core_started.elapsed();
                let _ = crate::core::server::step(
                    &mut locked.core,
                    crate::core::server::Event::HolderHeartbeat {
                        tab_id: tab_id.clone(),
                        incarnation: ready.incarnation,
                    },
                    now,
                );
                let _ = crate::core::server::step(
                    &mut locked.core,
                    crate::core::server::Event::ChildObserved {
                        tab_id: tab_id.clone(),
                        incarnation: ready.incarnation,
                        process_id: ready.child_pid,
                        alive: child.is_some(),
                    },
                    now,
                );
                locked.holders_terminating.remove(&tab_id);
                let changed = if ready.tab_id == tab_id {
                    if let Some(record) = locked.registry.tabs.iter_mut().find(|record| {
                        record.tab_id == tab_id
                            && record.incarnation == ready.incarnation
                            && record.holder_pid == Some(ready.pid)
                    }) {
                        if let Some(child) = child {
                            let changed = record.child_pid != Some(child.pid)
                                || record.child_start_identity.as_deref()
                                    != Some(child.start.as_str())
                                || record.lifecycle != "running";
                            record.child_pid = Some(child.pid);
                            record.child_start_identity = Some(child.start);
                            record.lifecycle = "running".into();
                            changed
                        } else {
                            false
                        }
                    } else {
                        false
                    }
                } else {
                    false
                };
                let commit = if changed {
                    locked.registry.registry_revision =
                        locked.registry.registry_revision.saturating_add(1);
                    Some((locked.registry_store.clone(), locked.registry.clone()))
                } else {
                    None
                };
                drop(locked);
                if let Some((store, document)) = commit {
                    commit_registry(store, document)?;
                }
            }
            "holder.recovery-action" => {
                let (_, request): (_, wire::ResultBody) = wire::body(&payload)?;
                let action = request.message.as_deref().unwrap_or("");
                let (store, document, peer, respawn) = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    let mut next = None;
                    let mut close = false;
                    let mut incarnation = 0;
                    let mut session_file = None;
                    if let Some(record) = locked
                        .registry
                        .tabs
                        .iter_mut()
                        .find(|record| record.tab_id == tab_id)
                    {
                        if action == "close" {
                            record.desired = "stopped".into();
                            record.lifecycle = "stopped".into();
                            close = true;
                        } else if matches!(action, "retry" | "fresh")
                            && matches!(
                                record.lifecycle.as_str(),
                                "failed" | "crashed" | "restarting"
                            )
                        {
                            record.restarts = 0;
                            record.restart_window_start = Some(
                                SystemTime::now()
                                    .duration_since(UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_secs(),
                            );
                            record.incarnation = record.incarnation.saturating_add(1);
                            record.lifecycle = "restarting".into();
                            incarnation = record.incarnation;
                            session_file = (action == "retry")
                                .then(|| record.session_file.clone())
                                .flatten();
                            next = Some(action == "fresh");
                        }
                    }
                    locked.registry.registry_revision =
                        locked.registry.registry_revision.saturating_add(1);
                    let peer = locked
                        .holders
                        .get(&tab_id)
                        .map(|holder| holder.peer.clone());
                    let respawn = next.map(|start_fresh| wire::HolderRespawn {
                        tab_id: tab_id.clone(),
                        incarnation,
                        session_file,
                        recovery_journals: Vec::new(),
                        start_fresh,
                        holder_token: locked
                            .credentials
                            .derive("holder", &tab_id, incarnation)
                            .to_vec(),
                        bridge_token: locked
                            .credentials
                            .derive("bridge", &tab_id, incarnation)
                            .to_vec(),
                    });
                    let peer = if close || respawn.is_some() {
                        peer
                    } else {
                        None
                    };
                    (
                        locked.registry_store.clone(),
                        locked.registry.clone(),
                        peer,
                        respawn,
                    )
                };
                commit_registry(store, document)?;
                if let Some(peer) = peer {
                    if let Some(respawn) = respawn {
                        let session_ok = respawn.session_file.as_deref().map_or(Ok(()), |file| {
                            verify_session_writer_released(
                                Path::new(file),
                                std::time::Duration::from_secs(5),
                            )
                        });
                        if let Err(error) = session_ok {
                            let commit = {
                                let mut locked = state
                                    .lock()
                                    .map_err(|_| "resident state poisoned".to_owned())?;
                                if let Some(record) = locked
                                    .registry
                                    .tabs
                                    .iter_mut()
                                    .find(|record| record.tab_id == tab_id)
                                {
                                    record.lifecycle = "failed".into();
                                    record.last_exit = Some(error);
                                }
                                locked.registry.registry_revision =
                                    locked.registry.registry_revision.saturating_add(1);
                                (locked.registry_store.clone(), locked.registry.clone())
                            };
                            commit_registry(commit.0, commit.1)?;
                        } else {
                            if !acquire_start_gate(&state, std::time::Duration::from_secs(40)) {
                                return Err("resident restart start gate timed out".into());
                            }
                            if let Err(error) =
                                peer.offer_control(wire::frame("holder.respawn", None, respawn)?)
                            {
                                release_start_gate(&state);
                                return Err(error.to_owned());
                            }
                        }
                    } else {
                        peer.offer_control(wire::frame(
                            "shutdown",
                            None,
                            wire::ResultBody {
                                accepted: true,
                                message: None,
                            },
                        )?)
                        .map_err(str::to_owned)?;
                    }
                }
            }
            "holder.exit" => {
                let (_, exit): (_, HolderExit) = wire::body(&payload)?;
                let reason = exit.signal.clone().unwrap_or_else(|| {
                    exit.code
                        .map_or_else(|| "ended".into(), |code| format!("exit {code}"))
                });
                last_exit = Some(reason.clone());
                let (store, document, respawn) = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    for client in locked
                        .clients
                        .values()
                        .filter(|client| client.viewed_tab == tab_id)
                    {
                        let _ = client.peer.offer_control(wire::frame(
                            "holder.exit",
                            None,
                            exit.clone(),
                        )?);
                    }
                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs();
                    let mut restart = None;
                    let mut failed = false;
                    let mut next_incarnation = connection_incarnation;
                    let mut session_file = None;
                    if let Some(record) = locked.registry.tabs.iter_mut().find(|record| {
                        record.tab_id == tab_id && record.incarnation == connection_incarnation
                    }) {
                        record.last_exit = Some(reason.clone());
                        record.child_pid = None;
                        record.child_start_identity = None;
                        if record.desired != "running" {
                            record.lifecycle = "stopped".into();
                        } else if record.requested_restart {
                            record.requested_restart = false;
                            record.incarnation = record.incarnation.saturating_add(1);
                            record.lifecycle = "restarting".into();
                            next_incarnation = record.incarnation;
                            session_file = record.session_file.clone();
                            restart = Some(0);
                        } else {
                            match crate::core::server::decide_restart(
                                record.restarts,
                                record
                                    .restart_window_start
                                    .map(std::time::Duration::from_secs),
                                std::time::Duration::from_secs(now),
                            ) {
                                crate::core::server::RestartDecision::Schedule {
                                    delay,
                                    restarts,
                                    window_start,
                                } => {
                                    record.restarts = restarts;
                                    record.restart_window_start = Some(window_start.as_secs());
                                    record.incarnation = record.incarnation.saturating_add(1);
                                    record.lifecycle = "restarting".into();
                                    next_incarnation = record.incarnation;
                                    session_file = record.session_file.clone();
                                    restart = Some(delay.as_secs());
                                }
                                crate::core::server::RestartDecision::Failed {
                                    restarts,
                                    window_start,
                                } => {
                                    record.restarts = restarts;
                                    record.restart_window_start = Some(window_start.as_secs());
                                    record.lifecycle = "failed".into();
                                    failed = true;
                                }
                            }
                        }
                    }
                    locked.registry.registry_revision =
                        locked.registry.registry_revision.saturating_add(1);
                    let respawn = restart.map(|delay| {
                        let holder_token = locked
                            .credentials
                            .derive("holder", &tab_id, next_incarnation)
                            .to_vec();
                        let bridge_token = locked
                            .credentials
                            .derive("bridge", &tab_id, next_incarnation)
                            .to_vec();
                        (
                            delay,
                            wire::HolderRespawn {
                                tab_id: tab_id.clone(),
                                incarnation: next_incarnation,
                                session_file,
                                recovery_journals: Vec::new(),
                                start_fresh: false,
                                holder_token,
                                bridge_token,
                            },
                        )
                    });
                    if respawn.is_some() {
                        let restarting = locked.surfaces.get_mut(&tab_id).map(|surface| {
                            surface.status = "restarting".into();
                            surface.clone()
                        });
                        if let Some(surface) = restarting {
                            for client in locked
                                .clients
                                .values()
                                .filter(|client| client.viewed_tab == tab_id)
                            {
                                client.peer.offer_surface(wire::frame(
                                    "surface",
                                    None,
                                    surface.clone(),
                                )?);
                            }
                        }
                    }
                    if failed {
                        if let Some(surface) = locked.surfaces.get_mut(&tab_id) {
                            surface.status = "failed".into();
                        }
                        for client in locked
                            .clients
                            .values()
                            .filter(|client| client.viewed_tab == tab_id)
                        {
                            let _ = client.peer.offer_control(wire::frame(
                                "failure.status",
                                None,
                                wire::ResultBody {
                                    accepted: false,
                                    message: Some(reason.clone()),
                                },
                            )?);
                        }
                    }
                    (
                        locked.registry_store.clone(),
                        locked.registry.clone(),
                        respawn,
                    )
                };
                commit_registry(store, document)?;
                crate::fault_injection::crash_at("after-restart-budget-commit");
                let diagnostics_root = state
                    .lock()
                    .ok()
                    .map(|locked| locked.diagnostics_root.clone());
                if let Some(root) = diagnostics_root {
                    let child_record = crate::roles::diagnostics::newest_child_record(&root);
                    let _ = crate::roles::diagnostics::write_crash(
                        &root,
                        "holder",
                        connection_incarnation,
                        "child-exit",
                        &["child-exited"],
                        child_record.as_deref(),
                    );
                }
                if let Some((delay, respawn)) = respawn {
                    thread::sleep(std::time::Duration::from_secs(delay));
                    let session_check = respawn.session_file.as_deref().map_or(Ok(()), |file| {
                        verify_session_writer_released(
                            Path::new(file),
                            std::time::Duration::from_secs(5),
                        )
                    });
                    if let Err(error) = session_check {
                        let commit = {
                            let mut locked = state
                                .lock()
                                .map_err(|_| "resident state poisoned".to_owned())?;
                            if let Some(record) = locked.registry.tabs.iter_mut().find(|record| {
                                record.tab_id == tab_id && record.incarnation == respawn.incarnation
                            }) {
                                record.lifecycle = "failed".into();
                                record.last_exit = Some(error);
                            }
                            locked.registry.registry_revision =
                                locked.registry.registry_revision.saturating_add(1);
                            (locked.registry_store.clone(), locked.registry.clone())
                        };
                        commit_registry(commit.0, commit.1)?;
                    } else {
                        let peer = state.lock().ok().and_then(|locked| {
                            locked
                                .holders
                                .get(&tab_id)
                                .filter(|holder| holder.incarnation == connection_incarnation)
                                .map(|holder| holder.peer.clone())
                        });
                        if !acquire_start_gate(&state, std::time::Duration::from_secs(40)) {
                            return Err("resident restart start gate timed out".into());
                        }
                        if let Some(peer) = peer {
                            if let Err(error) =
                                peer.offer_control(wire::frame("holder.respawn", None, respawn)?)
                            {
                                release_start_gate(&state);
                                return Err(error.to_owned());
                            }
                        } else {
                            release_start_gate(&state);
                        }
                    }
                }
            }
            _ => {}
        }
    }
    let mut locked = state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?;
    if locked
        .holders
        .get(&tab_id)
        .is_some_and(|holder| holder.incarnation != connection_incarnation)
    {
        return Ok(());
    }
    locked.holders.remove(&tab_id);
    let incarnation = locked
        .core
        .tabs
        .get(&tab_id)
        .map_or(0, |tab| tab.incarnation);
    let now = locked.core_started.elapsed();
    let _ = crate::core::server::step(
        &mut locked.core,
        crate::core::server::Event::HolderConnectionLost {
            tab_id: tab_id.clone(),
            incarnation,
        },
        now,
    );
    locked.holders_terminating.remove(&tab_id);
    locked.surfaces.remove(&tab_id);
    locked.last_activity = std::time::Instant::now();
    let now_epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let mut restart_delay = None;
    if let Some(record) = locked
        .registry
        .tabs
        .iter_mut()
        .find(|tab| tab.tab_id == tab_id)
    {
        record.holder_pid = None;
        record.holder_start_identity = None;
        record.child_pid = None;
        record.child_start_identity = None;
        record.last_exit = last_exit.or_else(|| Some("holder connection lost".into()));
        if record.desired == "stopped" {
            record.lifecycle = "stopped".into();
        } else {
            match crate::core::server::decide_restart(
                record.restarts,
                record
                    .restart_window_start
                    .map(std::time::Duration::from_secs),
                std::time::Duration::from_secs(now_epoch),
            ) {
                crate::core::server::RestartDecision::Schedule {
                    delay,
                    restarts,
                    window_start,
                } => {
                    record.restarts = restarts;
                    record.restart_window_start = Some(window_start.as_secs());
                    record.incarnation = record.incarnation.saturating_add(1);
                    record.lifecycle = "restarting".into();
                    restart_delay = Some(delay);
                }
                crate::core::server::RestartDecision::Failed {
                    restarts,
                    window_start,
                } => {
                    record.restarts = restarts;
                    record.restart_window_start = Some(window_start.as_secs());
                    record.lifecycle = "failed".into();
                }
            }
        }
    }
    locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
    let document = locked.registry.clone();
    let registry_store = locked.registry_store.clone();
    drop(locked);
    commit_registry(registry_store, document)?;
    if let Some(delay) = restart_delay {
        thread::sleep(delay);
        let session_file = state.lock().ok().and_then(|locked| {
            locked
                .registry
                .tabs
                .iter()
                .find(|record| record.tab_id == tab_id)
                .and_then(|record| record.session_file.clone())
        });
        if let Some(session_file) = session_file {
            if let Err(error) = verify_session_writer_released(
                Path::new(&session_file),
                std::time::Duration::from_secs(5),
            ) {
                let commit = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    if let Some(record) = locked
                        .registry
                        .tabs
                        .iter_mut()
                        .find(|record| record.tab_id == tab_id)
                    {
                        record.lifecycle = "failed".into();
                        record.last_exit = Some(error);
                    }
                    locked.registry.registry_revision =
                        locked.registry.registry_revision.saturating_add(1);
                    (locked.registry_store.clone(), locked.registry.clone())
                };
                commit_registry(commit.0, commit.1)?;
                return Ok(());
            }
        }
        if !acquire_start_gate(&state, std::time::Duration::from_secs(40)) {
            return Err("replacement holder start gate timed out".into());
        }
        if let Err(error) = launch_replacement_holder(&state, &tab_id) {
            release_start_gate(&state);
            let commit = {
                let mut locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                if let Some(record) = locked
                    .registry
                    .tabs
                    .iter_mut()
                    .find(|record| record.tab_id == tab_id)
                {
                    record.lifecycle = "failed".into();
                    record.last_exit = Some("holder restart failed".into());
                }
                locked.registry.registry_revision =
                    locked.registry.registry_revision.saturating_add(1);
                (locked.registry_store.clone(), locked.registry.clone())
            };
            commit_registry(commit.0, commit.1)?;
            return Err(error);
        }
    }
    Ok(())
}

fn serve_bridge(
    mut stream: endpoint::EndpointStream,
    tx: Peer,
    state: Arc<Mutex<RuntimeState>>,
    tab_id: String,
    incarnation: u64,
    heartbeat_supported: bool,
) -> Result<(), String> {
    {
        let mut locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        locked.bridges.insert(
            tab_id.clone(),
            BridgePeer {
                peer: tx.clone(),
                incarnation,
            },
        );
        if heartbeat_supported {
            let now = locked.core_started.elapsed();
            let _ = crate::core::server::step(
                &mut locked.core,
                crate::core::server::Event::BridgeConnection {
                    tab_id: tab_id.clone(),
                    incarnation,
                    connected: true,
                },
                now,
            );
        }
        if let Some((client, revision)) = locked.attachment.current(&tab_id) {
            tx.offer_control(wire::frame(
                "attachment",
                None,
                BridgeAttachment {
                    client_id: client.into(),
                    controller_revision: revision,
                },
            )?)
            .map_err(str::to_owned)?;
        }
    }
    while let Some(payload) = wire::read_payload(&mut stream)? {
        let current = state
            .lock()
            .ok()
            .and_then(|locked| locked.bridges.get(&tab_id).map(|bridge| bridge.incarnation));
        if current != Some(incarnation) {
            break;
        }
        let kind = wire::kind(&payload)?;
        if kind.message_type == "bridge.heartbeat" {
            let (_, _heartbeat): (_, wire::BridgeHeartbeat) = wire::body(&payload)?;
            if heartbeat_supported {
                let mut locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                let now = locked.core_started.elapsed();
                let _ = crate::core::server::step(
                    &mut locked.core,
                    crate::core::server::Event::ChildHeartbeat {
                        tab_id: tab_id.clone(),
                        incarnation,
                    },
                    now,
                );
            }
        } else if kind.message_type == "bridge.status" {
            let (_, status): (_, BridgeStatus) = wire::body(&payload)?;
            let mut locked = state
                .lock()
                .map_err(|_| "resident state poisoned".to_owned())?;
            let updated = if let Some(surface) = locked.surfaces.get_mut(&tab_id) {
                surface.status = if status.degraded {
                    "degraded".into()
                } else if status.pending_requests > 0 {
                    "needs-input".into()
                } else if status.queued_input > 0 {
                    "working".into()
                } else {
                    status.state
                };
                if status.accent.is_some() {
                    surface.accent = status.accent;
                }
                Some(surface.clone())
            } else {
                None
            };
            if let Some(surface) = updated {
                for client in locked
                    .clients
                    .values()
                    .filter(|client| client.viewed_tab == tab_id)
                {
                    client
                        .peer
                        .offer_surface(wire::frame("surface", None, surface.clone())?);
                }
            }
        } else if kind.message_type == "bridge.session" {
            let (_, session): (_, BridgeSession) = wire::body(&payload)?;
            let mut locked = state
                .lock()
                .map_err(|_| "resident state poisoned".to_owned())?;
            if let Some(record) = locked
                .registry
                .tabs
                .iter_mut()
                .find(|tab| tab.tab_id == tab_id)
            {
                record.session_file = session.file.clone();
                record.session_dir = session
                    .file
                    .as_deref()
                    .and_then(|file| Path::new(file).parent())
                    .map(|path| path.to_string_lossy().into_owned());
                if let Some(name) = session.name {
                    let name = name.trim();
                    let source = session.name_source.as_deref().unwrap_or("user");
                    let valid = !name.is_empty()
                        && name.chars().count() <= 64
                        && !name.chars().any(char::is_control);
                    let auto_rejected = source == "auto" && record.name_source == "user";
                    if valid && !auto_rejected {
                        record.display_name = name.to_owned();
                        record.name_source = match source {
                            "default" | "auto" | "user" => source,
                            _ => "user",
                        }
                        .into();
                    }
                }
            }
            locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
            let document = locked.registry.clone();
            let registry_store = locked.registry_store.clone();
            drop(locked);
            commit_registry(registry_store, document)?;
        } else if kind.message_type == "bridge.request" {
            let (_, request): (_, BridgeRequest) = wire::body(&payload)?;
            let accepted = if request.action == "detach" {
                let locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                if locked.attachment.current(&tab_id)
                    == Some((request.client_id.as_str(), request.controller_revision))
                {
                    if let Some(client) = locked
                        .clients
                        .get(&request.client_id)
                        .filter(|client| client.viewed_tab == tab_id)
                    {
                        let _ = client.peer.offer_control(wire::frame(
                            "detach",
                            None,
                            wire::ResultBody {
                                accepted: true,
                                message: None,
                            },
                        )?);
                    }
                    true
                } else {
                    false
                }
            } else if request.action == "restart" {
                let restart = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    if locked.attachment.current(&tab_id)
                        != Some((request.client_id.as_str(), request.controller_revision))
                    {
                        None
                    } else {
                        let mut changed = false;
                        if let Some(record) = locked
                            .registry
                            .tabs
                            .iter_mut()
                            .find(|record| record.tab_id == tab_id)
                        {
                            record.requested_restart = true;
                            changed = true;
                        }
                        if changed {
                            locked.registry.registry_revision =
                                locked.registry.registry_revision.saturating_add(1);
                        }
                        locked.holders.get(&tab_id).map(|holder| {
                            (
                                holder.peer.clone(),
                                locked.registry_store.clone(),
                                locked.registry.clone(),
                            )
                        })
                    }
                };
                if let Some((holder, store, document)) = restart {
                    commit_registry(store, document)?;
                    wire::frame(
                        "holder.terminate-child",
                        None,
                        wire::ResultBody {
                            accepted: true,
                            message: Some("explicit restart".into()),
                        },
                    )
                    .is_ok_and(|frame| holder.offer_control(frame).is_ok())
                } else {
                    false
                }
            } else {
                false
            };
            tx.offer_control(wire::frame(
                "bridge.result",
                kind.request_id,
                wire::ResultBody {
                    accepted,
                    message: None,
                },
            )?)
            .map_err(str::to_owned)?;
        }
    }
    let mut locked = state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?;
    if locked
        .bridges
        .get(&tab_id)
        .is_some_and(|bridge| bridge.incarnation == incarnation)
    {
        locked.bridges.remove(&tab_id);
        if heartbeat_supported {
            let now = locked.core_started.elapsed();
            let _ = crate::core::server::step(
                &mut locked.core,
                crate::core::server::Event::BridgeConnection {
                    tab_id: tab_id.clone(),
                    incarnation,
                    connected: false,
                },
                now,
            );
        }
    }
    let mut changed = false;
    if let Some(record) = locked
        .registry
        .tabs
        .iter_mut()
        .find(|record| record.tab_id == tab_id)
        && record.lifecycle == "unresponsive"
    {
        record.lifecycle = "running".into();
        changed = true;
    }
    if let Some(surface) = locked.surfaces.get_mut(&tab_id)
        && surface.status == "unresponsive"
    {
        surface.status = "idle".into();
    }
    let commit = changed.then(|| {
        locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
        (locked.registry_store.clone(), locked.registry.clone())
    });
    locked.last_activity = std::time::Instant::now();
    drop(locked);
    if let Some((store, document)) = commit {
        commit_registry(store, document)?;
    }
    Ok(())
}

pub fn encoded_bridge_token(
    credentials: &ProfileCredentials,
    tab_id: &str,
    incarnation: u64,
) -> String {
    BASE64.encode(credentials.derive("bridge", tab_id, incarnation))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stalled_client_gets_one_full_current_surface() {
        let mut lane = SingleSlotRenderLane::default();
        lane.offer(1, b"patch-1".to_vec());
        lane.offer(2, b"patch-2".to_vec());
        assert_eq!(
            lane.drain(|| b"full-2".to_vec()),
            Some(RenderDelivery {
                revision: 2,
                full: true,
                bytes: b"full-2".to_vec()
            })
        );
        assert_eq!(lane.drain(Vec::new), None);
    }

    #[test]
    fn fifty_mebibytes_to_a_stalled_reader_does_not_delay_a_normal_reader() {
        let mut stalled = SingleSlotRenderLane::default();
        let mut normal = SingleSlotRenderLane::default();
        let surface = vec![b'x'; 1024 * 1024];
        for revision in 1..=50 {
            stalled.offer(revision, surface.clone());
            normal.offer(revision, surface.clone());
            let delivery = normal.drain(|| surface.clone()).expect("normal delivery");
            assert_eq!(delivery.revision, revision);
            assert!(!delivery.full);
            assert_eq!(delivery.bytes.len(), surface.len());
        }
        let delivery = stalled.drain(|| surface.clone()).expect("stalled delivery");
        assert_eq!(delivery.revision, 50);
        assert!(delivery.full);
        assert_eq!(delivery.bytes.len(), surface.len());
    }

    #[test]
    fn control_lane_is_bounded_by_frames_and_bytes() {
        let (tx, _rx) = mpsc::sync_channel(CONTROL_LANE_FRAMES);
        let peer = Peer {
            tx,
            queued_bytes: Arc::new(AtomicUsize::new(0)),
            surface: Arc::new(Mutex::new(None)),
        };
        for _ in 0..CONTROL_LANE_FRAMES {
            assert_eq!(peer.offer_control(vec![0]), Ok(()));
        }
        assert_eq!(peer.offer_control(vec![0]), Err("client-overrun"));

        let (tx, _rx) = mpsc::sync_channel(CONTROL_LANE_FRAMES);
        let peer = Peer {
            tx,
            queued_bytes: Arc::new(AtomicUsize::new(0)),
            surface: Arc::new(Mutex::new(None)),
        };
        assert_eq!(
            peer.offer_control(vec![0; CONTROL_LANE_BYTES + 1]),
            Err("client-overrun")
        );
    }

    #[test]
    fn tab_environment_drops_every_launch_instance_identity() {
        let mut environment = vec![
            ("A1_ENDPOINT".into(), "private".into()),
            ("A1_EXIT_NOTICE_PATH".into(), "private".into()),
            ("A1_PROCESS_GUARDIAN_PATH".into(), "private".into()),
            ("A1_STARTUP_TRACE".into(), "private".into()),
            ("A1_SESSION_RUNTIME_ID".into(), "private".into()),
            (
                "LAUNCH_CONTEXT_RESIDENT_ROOT_EXECUTABLE".into(),
                "private".into(),
            ),
            (
                "LAUNCH_CONTEXT_RESIDENT_ROOT_ARGUMENTS".into(),
                "private".into(),
            ),
            ("LAUNCH_CONTEXT_RESIDENT_FALLBACK".into(), "private".into()),
            ("PATH".into(), "retained".into()),
        ];
        sanitize_tab_environment(&mut environment);
        assert_eq!(environment, vec![("PATH".into(), "retained".into())]);
    }

    #[test]
    fn control_is_exclusive_per_tab_and_stale_detach_does_nothing() {
        let mut state = AttachmentState::default();
        let revision = state.attach("tab-a", "one".into()).unwrap();
        assert_eq!(
            state.attach("tab-a", "two".into()),
            Err("a1 is attached in another terminal")
        );
        assert!(state.attach("tab-b", "two".into()).is_ok());
        assert!(!state.detach("tab-a", "one", revision + 1));
        assert!(state.detach("tab-a", "one", revision));
    }
}
