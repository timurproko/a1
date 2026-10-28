use std::collections::HashMap;
use std::io::Write;
use std::path::Path;
use std::sync::{
    Arc, Mutex, MutexGuard,
    atomic::{AtomicBool, AtomicUsize, Ordering},
    mpsc,
};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;

use crate::core::tab_bar::TabKind;
use crate::endpoint::{self, OwnerEndpoint};
use crate::identity::ProcessIdentity;
use crate::launch::{self, ResidentRole};
use crate::protocol::{self, BridgeAttachment, BridgeRequest, Welcome};
use crate::roles::counters::{self, Event as CounterEvent};
use crate::roles::credentials::ProfileCredentials;
use crate::roles::registry::{RegistryAuthority, RegistryDocument, RegistryStore, TabRecord};
use crate::roles::wire::{
    self, AttachStart, BridgeSession, BridgeStatus, HolderExit, HolderLaunchConfig, Input,
    PasteStart, Resize, RoleHello, ServerLaunchConfig, Surface, TabCreate, TabList, TabStatus,
    TabSummary, TabTarget, ViewTarget,
};
use crate::session_lock::SessionLock;

mod attach;
mod bridge;
mod controller;
mod holder;
mod lifecycle;
mod registry;
mod standby;

use attach::*;
pub use bridge::encoded_bridge_token;
use bridge::*;
use controller::*;
use holder::*;
use lifecycle::*;
use registry::*;
pub use standby::sanitize_tab_environment;
use standby::*;

/// Every new Agent tab starts with the provider's label; duplicates are allowed and auto-naming
/// or a manual rename distinguishes them.
const DEFAULT_AGENT_TAB_NAME: &str = TabKind::Agent.provider().label;

fn tab_kind(tab_id: &str) -> TabKind {
    TabKind::of_id(tab_id)
}

/// The singleton tab a client message opens or prewarms and whether the message opens it.
fn utility_request(message_type: &str) -> Option<(TabKind, bool)> {
    TabKind::from_singleton_message(message_type)
}

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
/// Hard caps on the server's own collections; `docs/architecture/resident-tabs.md` lists every bound.
pub const MAX_CONNECTIONS: usize = 128;
pub const MAX_ATTACHED_CLIENTS: usize = 16;
pub const MAX_STOPPED_RECORDS: usize = 16;

/// True while another viewing client may attach.
pub fn client_slot_available(attached: usize) -> bool {
    attached < MAX_ATTACHED_CLIENTS
}

/// Reserves one connection slot, or refuses once [`MAX_CONNECTIONS`] are being served.
pub fn admit_connection(active: &AtomicUsize) -> bool {
    if active.fetch_add(1, Ordering::SeqCst) >= MAX_CONNECTIONS {
        active.fetch_sub(1, Ordering::SeqCst);
        return false;
    }
    true
}

/// Keeps at most [`MAX_STOPPED_RECORDS`] stopped tab records whose holders are gone, dropping the
/// oldest first. Their sessions stay on disk; only the registry entry is released.
pub fn prune_stopped_records(tabs: &mut Vec<TabRecord>) {
    let mut stopped = tabs
        .iter()
        .filter(|tab| tab.desired == "stopped" && tab.holder_pid.is_none())
        .map(|tab| {
            (
                tab.created_at.parse::<u64>().unwrap_or(0),
                tab.tab_id.clone(),
            )
        })
        .collect::<Vec<_>>();
    if stopped.len() <= MAX_STOPPED_RECORDS {
        return;
    }
    stopped.sort();
    let excess = stopped.len() - MAX_STOPPED_RECORDS;
    let remove = stopped
        .into_iter()
        .take(excess)
        .map(|(_, tab_id)| tab_id)
        .collect::<std::collections::HashSet<_>>();
    tabs.retain(|tab| !remove.contains(&tab.tab_id));
}

#[derive(Clone)]
struct Peer {
    tx: mpsc::SyncSender<Vec<u8>>,
    queued_bytes: Arc<AtomicUsize>,
    surface: Arc<Mutex<Option<Vec<u8>>>>,
    surface_signaled: Arc<AtomicBool>,
    /// Set when an unsent surface was replaced, so the next delivery counts as a full resync.
    surface_replaced: Arc<AtomicBool>,
}
impl Peer {
    fn offer_control(&self, frame: Vec<u8>) -> Result<(), &'static str> {
        let length = frame.len();
        let reserved = self
            .queued_bytes
            .try_update(Ordering::SeqCst, Ordering::SeqCst, |queued| {
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
        if let Ok(mut slot) = self.surface.lock()
            && slot.replace(frame).is_some()
        {
            counters::record(CounterEvent::RenderLaneReplacement);
            self.surface_replaced.store(true, Ordering::SeqCst);
        }
        // Performance: an empty frame wakes the writer at once instead of after its idle poll;
        // the flag keeps at most one wake queued so slow clients cannot fill the control lane.
        if !self.surface_signaled.swap(true, Ordering::SeqCst) {
            let _ = self.tx.try_send(Vec::new());
        }
    }
}

#[derive(Clone)]
struct HolderSession {
    peer: Peer,
    identity: ProcessIdentity,
    incarnation: u64,
    /// Unique to one authenticated socket, even when a reconnect keeps the same incarnation.
    connection_id: u64,
    /// Whether this holder encodes `input.event` frames itself; an older same-generation holder
    /// receives only pre-encoded bytes.
    semantic_input: bool,
    structured_surface: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct HolderGeometry {
    incarnation: u64,
    columns: u16,
    rows: u16,
}

#[derive(Clone)]
struct ClientSession {
    peer: Peer,
    viewed_tab: String,
    controller: bool,
    controller_revision: u64,
    /// Whether this client applies typed `terminal.effect` frames for its viewed tab.
    terminal_effects: bool,
    structured_surface: bool,
    /// Monotonic per-client identity for one view request; stamped onto every offered surface.
    view_generation: u64,
}

fn surface_for_client(
    mut surface: Surface,
    structured_supported: bool,
    request_generation: u64,
) -> Result<Surface, String> {
    surface.request_generation = request_generation;
    if structured_supported {
        if surface.structured.is_some() {
            surface.bytes.clear();
        }
    } else {
        if surface.bytes.is_empty()
            && let Some(structured) = surface.structured.as_ref()
        {
            surface.bytes = super::presentation::complete_surface_bytes(structured)?;
        }
        surface.structured = None;
    }
    Ok(surface)
}

fn accepts_holder_surface(existing: Option<&Surface>, next: &Surface) -> bool {
    let Some(existing) = existing else {
        return true;
    };
    if next.incarnation != existing.incarnation {
        return next.incarnation > existing.incarnation;
    }
    if next.revision != existing.revision {
        return next.revision > existing.revision;
    }
    // Protocol: equal revisions are idempotent metadata re-offers, never another child commit. Status and
    // accent may change independently, but retained visual and terminal state may not.
    next.bytes == existing.bytes
        && next.structured == existing.structured
        && next.modes == existing.modes
        && next.cursor == existing.cursor
}

fn desired_surface_subscription(
    state: &RuntimeState,
    tab_id: &str,
    holder_structured: bool,
) -> wire::SurfaceSubscription {
    let viewing = viewers(state, tab_id).collect::<Vec<_>>();
    let enabled = !viewing.is_empty();
    wire::SurfaceSubscription {
        enabled,
        effects: viewing
            .iter()
            .any(|client| client.controller && client.terminal_effects),
        structured: enabled
            && holder_structured
            && viewing.iter().any(|client| client.structured_surface),
        legacy: enabled
            && (!holder_structured || viewing.iter().any(|client| !client.structured_surface)),
    }
}

fn refresh_surface_subscription(state: &RuntimeState, tab_id: &str) -> Result<(), String> {
    let Some(holder) = state.holders.get(tab_id) else {
        return Ok(());
    };
    let subscription = desired_surface_subscription(state, tab_id, holder.structured_surface);
    let _ = holder
        .peer
        .offer_control(wire::frame("surface.subscription", None, subscription)?);
    Ok(())
}

/// Tells a tab's connected bridge whether any client views the tab.
fn offer_bridge_visibility(
    state: &RuntimeState,
    tab_id: &str,
    visible: bool,
) -> Result<(), String> {
    if let Some(bridge) = state.bridges.get(tab_id) {
        let _ = bridge.peer.offer_control(wire::frame(
            "bridge.visibility",
            None,
            serde_json::json!({ "visible": visible }),
        )?);
    }
    Ok(())
}

struct BridgePeer {
    peer: Peer,
    incarnation: u64,
    controller_boundary: bool,
}

#[derive(Clone)]
struct StandbyTab {
    tab_id: String,
    start: AttachStart,
    incarnation: u64,
    /// The verified identity of the launched standby holder, so discarding the standby can end
    /// the holder whether or not it has connected.
    holder: Option<ProcessIdentity>,
}

struct PendingControllerTransfer {
    client_id: String,
    revision: u64,
    previous_client_id: Option<String>,
    nonce: [u8; 16],
    core: crate::controller::ControllerCore,
    held_frames: Vec<Vec<u8>>,
    held_bytes: usize,
    started: std::time::Instant,
}

/// Rejection reasons a client can act on; `legacy-holder` tells it to fall back to byte input.
pub const INPUT_REJECTED_READ_ONLY: &str = "read-only-viewer";
pub const INPUT_REJECTED_LEGACY_HOLDER: &str = "legacy-holder";
pub const INPUT_REJECTED_MALFORMED: &str = "malformed-input";

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
    pending_controller_transfers: HashMap<String, PendingControllerTransfer>,
    standby: Option<StandbyTab>,
    holders: HashMap<String, HolderSession>,
    holder_geometries: HashMap<String, HolderGeometry>,
    launches: HashMap<String, AttachStart>,
    surfaces: HashMap<String, Arc<Surface>>,
    max_concurrent_starts: usize,
    active_starts: usize,
    /// The start-gate slot each recovering tab holds, by a token unique to that acquisition.
    recovery_slots: HashMap<String, u64>,
    /// User-requested tab starts waiting for a slot; recovery and standby yield free slots to them.
    interactive_start_waiters: usize,
    /// Each attached client's lifecycle requests that are queued or running.
    lifecycle: HashMap<String, LifecycleBacklog>,
    last_start: Option<std::time::Instant>,
    last_activity: std::time::Instant,
    core_started: std::time::Instant,
    last_supervision_tick: std::time::Instant,
    core: crate::core::server::State,
    workers: crate::shell::workers::WorkerPool<Result<(), String>>,
    startup_notice: Option<String>,
    /// The newest effective tab shortcut projection a child published; relayed to every client.
    shortcuts: Option<protocol::TabShortcuts>,
    diagnostics_root: std::path::PathBuf,
    shutdown_requested: bool,
}
impl RuntimeState {
    fn is_idle(&self) -> bool {
        let standby = self.standby.as_ref().map(|standby| standby.tab_id.as_str());
        crate::core::server::idle_exit_due(crate::core::server::IdleObservation {
            clients: self.clients.len(),
            bridges: self
                .bridges
                .keys()
                .filter(|tab_id| Some(tab_id.as_str()) != standby)
                .count(),
            user_holders: self
                .holders
                .keys()
                .filter(|tab_id| Some(tab_id.as_str()) != standby)
                .count(),
            starting_holders: self
                .core
                .starting_tabs()
                .filter(|tab_id| Some(*tab_id) != standby)
                .count(),
            since_activity: self.last_activity.elapsed(),
        })
    }

    /// Invariant: a hidden Settings kept ready beside a landing is never the tab an attach shows;
    /// with only Settings left this names the first Agent an attach starts.
    fn default_tab(&self) -> String {
        let agents = self
            .registry
            .tabs
            .iter()
            .filter(|tab| TabKind::from_name(&tab.kind).is_some_and(|kind| kind.provider().owns_session))
            .cloned()
            .collect::<Vec<_>>();
        default_tab(&agents)
    }

    /// The tab an admitted attach without a requested tab views: the running default, or the
    /// fresh Agent this client's `attach.start` will start, which then reads the id back from the
    /// client session so admission's subscription and the started tab agree.
    fn attach_view_tab(&self) -> String {
        first_agent_start(&self.registry.tabs).map_or_else(|| self.default_tab(), |first| first.tab_id)
    }
}

fn default_tab(tabs: &[TabRecord]) -> String {
    tabs.iter()
        .filter(|tab| tab.desired != "stopped" && TabKind::from_name(&tab.kind).is_some_and(|kind| kind.provider().owns_session))
        .min_by_key(|tab| tab.order)
        .or_else(|| {
            tabs.iter()
                .filter(|tab| tab.desired != "stopped")
                .min_by_key(|tab| tab.order)
        })
        .map(|tab| tab.tab_id.clone())
        .unwrap_or_else(|| "tab-1".into())
}

/// The Agent an attach without a session selection starts, with the stopped Agent records it
/// drops first.
pub(super) struct FirstAgentStart {
    pub(super) tab_id: String,
    pub(super) dropped: Vec<String>,
}

/// `None` while an Agent runs, so the attach views the default tab. Otherwise the registry holds
/// no Agent worth viewing: a stopped Agent record no holder owns is dropped rather than counted,
/// and the new Agent takes a fresh identity so it never adopts a stopped tab's directory, draft,
/// or recovery screen. A profile that never had an Agent keeps its first-launch `tab-1`.
pub(super) fn first_agent_start(tabs: &[TabRecord]) -> Option<FirstAgentStart> {
    let agents = tabs
        .iter()
        .filter(|tab| TabKind::from_name(&tab.kind).is_some_and(|kind| kind.provider().owns_session))
        .collect::<Vec<_>>();
    if agents.iter().any(|tab| tab.desired != "stopped") {
        return None;
    }
    let dropped = agents
        .iter()
        .filter(|tab| tab.holder_pid.is_none())
        .map(|tab| tab.tab_id.clone())
        .collect::<Vec<_>>();
    let tab_id = if agents.is_empty() {
        "tab-1".into()
    } else {
        format!("tab-{:016x}", rand::random::<u64>())
    };
    Some(FirstAgentStart { tab_id, dropped })
}

fn recovered_launches(
    registry: &RegistryDocument,
    environment: &[(String, String)],
) -> HashMap<String, AttachStart> {
    registry
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
                    environment: environment.to_vec(),
                    session_file: tab.session_file.clone(),
                    session_dir: tab.session_dir.clone(),
                },
            )
        })
        .collect()
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

/// Locks the runtime state; a poisoned lock is the one error every role handler reports for it.
fn lock_state<T>(state: &Mutex<T>) -> Result<MutexGuard<'_, T>, String> {
    state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())
}

fn remove_holder_session(state: &mut RuntimeState, tab_id: &str) {
    state.holders.remove(tab_id);
    state.holder_geometries.remove(tab_id);
}

/// The clients currently viewing `tab_id`.
fn viewers<'a>(
    state: &'a RuntimeState,
    tab_id: &'a str,
) -> impl Iterator<Item = &'a ClientSession> {
    state
        .clients
        .values()
        .filter(move |client| client.viewed_tab == tab_id)
}

/// Whether any client currently views `tab_id`.
fn is_viewed(state: &RuntimeState, tab_id: &str) -> bool {
    viewers(state, tab_id).next().is_some()
}

/// Applies the crash-restart budget to a tab whose holder or child ended while it should run.
/// Within the budget the tab moves to a new incarnation in `restarting` and the restart delay is
/// returned; once the budget is spent the tab is `failed` and nothing is returned.
fn apply_restart_budget(
    record: &mut TabRecord,
    now_epoch_secs: u64,
) -> Option<std::time::Duration> {
    match crate::core::server::decide_restart(
        record.restarts,
        record
            .restart_window_start
            .map(std::time::Duration::from_secs),
        std::time::Duration::from_secs(now_epoch_secs),
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
            Some(delay)
        }
        crate::core::server::RestartDecision::Failed {
            restarts,
            window_start,
        } => {
            record.restarts = restarts;
            record.restart_window_start = Some(window_start.as_secs());
            record.lifecycle = "failed".into();
            None
        }
    }
}

/// Marks a tab for an explicit child restart and asks its holder to end the child, when
/// `authorized` allows it under the lock. The holder's child exit then restarts the tab without
/// spending its crash budget. False when unauthorized, when the tab has no connected holder, or
/// when the holder cannot take the request.
fn request_child_restart(
    state: &Mutex<RuntimeState>,
    tab_id: &str,
    authorized: impl FnOnce(&RuntimeState) -> bool,
) -> Result<bool, String> {
    let restart = {
        let mut locked = lock_state(state)?;
        if !authorized(&locked) {
            None
        } else {
            if let Some(record) = locked
                .registry
                .tabs
                .iter_mut()
                .find(|record| record.tab_id == tab_id)
            {
                record.requested_restart = true;
                bump_registry_revision(&mut locked.registry);
            }
            locked.holders.get(tab_id).map(|holder| {
                let (store, document) = registry_snapshot(&locked);
                (holder.peer.clone(), store, document)
            })
        }
    };
    let Some((holder, store, document)) = restart else {
        return Ok(false);
    };
    commit_registry(store, document)?;
    Ok(holder
        .offer_control(wire::frame(
            "holder.terminate-child",
            None,
            wire::ResultBody::accepted("explicit restart".into()),
        )?)
        .is_ok())
}

/// The respawn order for one tab incarnation, carrying that incarnation's holder and bridge tokens.
fn holder_respawn(
    credentials: &ProfileCredentials,
    tab_id: &str,
    incarnation: u64,
    session_file: Option<String>,
    start_fresh: bool,
) -> wire::HolderRespawn {
    wire::HolderRespawn {
        tab_id: tab_id.to_owned(),
        incarnation,
        session_file,
        recovery_journals: Vec::new(),
        start_fresh,
        holder_token: credentials.derive("holder", tab_id, incarnation).to_vec(),
        bridge_token: credentials.derive("bridge", tab_id, incarnation).to_vec(),
    }
}

/// Binds the server endpoint, waiting a bounded time for a previous owner that is still leaving.
/// A live owner is never disturbed; a Unix socket nothing answers on is stale and is replaced.
fn bind_owned_endpoint(
    profile: &Path,
    config: &ServerLaunchConfig,
) -> Result<OwnerEndpoint, String> {
    let _ = profile;
    if config.endpoint.is_empty() { return Err("resident release endpoint is missing".into()); }
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(5);
    let mut stale_removed = false;
    loop {
        let bound = OwnerEndpoint::bind_name(config.endpoint.clone());
        let error = match bound {
            Ok(endpoint) => return Ok(endpoint),
            Err(error) => error,
        };
        if cfg!(unix)
            && !stale_removed
            && !config.endpoint.is_empty()
            && Path::new(&config.endpoint).exists()
            && endpoint::connect(&config.endpoint).is_err()
        {
            endpoint::remove_stale(&config.endpoint).map_err(|error| error.to_string())?;
            stale_removed = true;
            continue;
        }
        if std::time::Instant::now() >= deadline {
            return Err(format!("endpoint is owned by a live server: {error}"));
        }
        thread::sleep(std::time::Duration::from_millis(25));
    }
}

pub fn run_server_child(profile: &Path, ready: &Path, context: &[u8]) -> Result<(), String> {
    let config: ServerLaunchConfig = serde_json::from_slice(context)
        .map_err(|error| format!("decode server context: {error}"))?;
    crate::fault_injection::install(&config.fault_environment);
    crate::fault_injection::validate_environment()?;
    let data = Path::new(&config.data_dir);
    let token = crate::roles::scope::token(profile)?;
    let root = data.join("tabs").join(token);
    std::fs::create_dir_all(&root)
        .map_err(|error| format!("create resident registry root: {error}"))?;
    let diagnostics_root = root.join("diagnostics");
    // Invariant: the endpoint is the one resource only a single server can own, so it is bound
    // before the lease, the epoch, the registry, or the marker; a server that loses it leaves
    // nothing behind that could fence or orphan the server that owns it.
    let mut endpoint = match bind_owned_endpoint(profile, &config) {
        Ok(endpoint) => endpoint,
        Err(error) => {
            let _ = crate::roles::diagnostics::append_log(
                &diagnostics_root,
                "server",
                "endpoint-owned-elsewhere",
            );
            return Err(error);
        }
    };
    crate::fault_injection::crash_at("after-bind");
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
    if let Some(document) = &existing { crate::roles::scope::admit(&document.release_id)?; }
    let epoch = existing
        .as_ref()
        .map_or(1, |document| document.epoch.saturating_add(1));
    let mut registry = existing.unwrap_or_else(|| RegistryDocument {
        release_id: crate::roles::scope::release_id().unwrap_or_default(),
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
        // Invariant: a stopping tab whose holder outlived its server is tracked like a running one;
        // a restarting holder is re-admitted through its pending respawn when it reconnects.
        if !matches!(tab.lifecycle.as_str(), "running" | "stopping") {
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
            tab.lifecycle = if tab.desired == "stopped" {
                "stopped".into()
            } else if tab.lifecycle == "failed" {
                "failed".into()
            } else {
                "holder-lost".into()
            };
            tab.holder_pid = None;
            tab.holder_start_identity = None;
            tab.child_pid = None;
            tab.child_start_identity = None;
        }
    }
    bump_registry_revision(&mut registry);
    let registry_store =
        RegistryStore::new(root.join("registry.json"), epoch, Arc::new(HeldAuthority));
    commit_registry(registry_store.clone(), registry.clone())?;
    crate::fault_injection::crash_at("after-epoch");
    if !config.endpoint.is_empty() {
        crate::roles::scope::write_owner_marker(&root, &config.endpoint)?;
        crate::fault_injection::crash_at("after-marker");
    }
    std::fs::write(ready, format!("{}:server\n", std::process::id()))
        .map_err(|error| format!("write server readiness: {error}"))?;
    #[cfg(unix)]
    let endpoint_address = endpoint.path().to_string_lossy().into_owned();
    #[cfg(windows)]
    let endpoint_address = endpoint.name().to_owned();
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
        Duration::from_secs(config.unresponsive_restart_seconds.clamp(30, 600));
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
    for tab_id in &adopting_holders {
        core.set_starting(tab_id, true);
    }
    let mut recovered_environment = std::env::vars().collect::<Vec<_>>();
    sanitize_tab_environment(&mut recovered_environment);
    let launches = recovered_launches(&registry, &recovered_environment);
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
        pending_controller_transfers: HashMap::new(),
        standby: None,
        holders: HashMap::new(),
        holder_geometries: HashMap::new(),
        launches,
        surfaces: HashMap::new(),
        max_concurrent_starts: config.max_concurrent_starts.clamp(1, 8),
        active_starts: 0,
        recovery_slots: HashMap::new(),
        interactive_start_waiters: 0,
        lifecycle: HashMap::new(),
        last_start: None,
        last_activity: std::time::Instant::now(),
        core_started,
        last_supervision_tick: core_started,
        core,
        workers: crate::shell::workers::WorkerPool::new(8),
        startup_notice,
        shortcuts: None,
        diagnostics_root: diagnostics_root.clone(),
        shutdown_requested: false,
    }));
    if !adopting_holders.is_empty() {
        let state = state.clone();
        thread::spawn(move || expire_unadmitted_holders(&state, adopting_holders));
    }
    {
        let state = state.clone();
        thread::spawn(move || reconcile_unconnected_holders(&state));
    }
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
    let connections = Arc::new(AtomicUsize::new(0));
    loop {
        watchdog.bump();
        match accepted_rx.recv_timeout(std::time::Duration::from_secs(1)) {
            Ok(Ok(stream)) => {
                // Security: a same-user process cannot exhaust server threads with idle connections.
                if !admit_connection(&connections) {
                    drop(stream);
                    continue;
                }
                let shared = state.clone();
                let profile = profile.to_path_buf();
                let connections = connections.clone();
                thread::spawn(move || {
                    if let Err(error) = serve_peer(stream, shared.clone(), profile)
                        && let Some(event) = peer_refusal_event(&error)
                        && let Some(root) = shared
                            .lock()
                            .ok()
                            .map(|locked| locked.diagnostics_root.clone())
                    {
                        let _ = crate::roles::diagnostics::append_log(&root, "server", event);
                    }
                    connections.fetch_sub(1, Ordering::SeqCst);
                });
            }
            Ok(Err(error)) => {
                if let Ok(locked) = state.lock() {
                    let _ = crate::roles::diagnostics::append_log(
                        &locked.diagnostics_root,
                        "server",
                        "endpoint-accept-failed",
                    );
                }
                return Err(error);
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                let _ = crate::roles::diagnostics::append_log(
                    &diagnostics_root,
                    "server",
                    "endpoint-stopped",
                );
                return Err("resident endpoint stopped".to_owned());
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                supervise_holders(&state);
                let exit = {
                    let Ok(locked) = state.lock() else {
                        let _ = crate::roles::diagnostics::append_log(
                            &diagnostics_root,
                            "server",
                            "exit-state-poisoned",
                        );
                        return Err("resident state poisoned".to_owned());
                    };
                    if locked.shutdown_requested {
                        Some("exit-shutdown")
                    } else if locked.is_idle() {
                        Some("exit-idle")
                    } else {
                        None
                    }
                };
                if let Some(event) = exit {
                    let _ =
                        crate::roles::diagnostics::append_log(&diagnostics_root, "server", event);
                    discard_standby(&state);
                    remove_owned_marker(&state);
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
            if gate_slot_free(
                locked.active_starts,
                locked.max_concurrent_starts,
                locked.interactive_start_waiters,
            ) && spaced
            {
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

/// True when recovery or standby may take a start slot: one is free and no user-requested start
/// is waiting for it.
fn gate_slot_free(active: usize, max: usize, interactive_waiters: usize) -> bool {
    active < max && interactive_waiters == 0
}

fn release_start_gate(state: &Arc<Mutex<RuntimeState>>) {
    if let Ok(mut locked) = state.lock() {
        locked.active_starts = locked.active_starts.saturating_sub(1);
    }
}

/// How long a recovering tab may hold a start-gate slot while its replacement holder starts.
const RECOVERY_SLOT_BOUND: std::time::Duration = std::time::Duration::from_secs(30);

/// Acquires a start-gate slot owned by `tab_id` until its replacement holder connects.
///
/// Invariant: a replacement holder can die, or its tab can stop, before it connects, so the slot
/// is also returned after a bound; otherwise each lost start would shrink the gate until every
/// later restart and tab start timed out.
fn acquire_recovery_slot(
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: &str,
    timeout: std::time::Duration,
) -> bool {
    if !acquire_start_gate(state, timeout) {
        return false;
    }
    let token = rand::random::<u64>();
    let Ok(mut locked) = state.lock() else {
        return false;
    };
    if locked
        .recovery_slots
        .insert(tab_id.to_owned(), token)
        .is_some()
    {
        // Invariant: a tab holds at most one slot; a newer recovery supersedes the older one.
        locked.active_starts = locked.active_starts.saturating_sub(1);
    }
    drop(locked);
    let state = state.clone();
    let tab_id = tab_id.to_owned();
    thread::spawn(move || {
        thread::sleep(RECOVERY_SLOT_BOUND);
        if let Ok(mut locked) = state.lock()
            && locked.recovery_slots.get(&tab_id) == Some(&token)
        {
            locked.recovery_slots.remove(&tab_id);
            locked.active_starts = locked.active_starts.saturating_sub(1);
        }
    });
    true
}

fn release_recovery_slot_of(state: &Arc<Mutex<RuntimeState>>, tab_id: &str) {
    if let Ok(mut locked) = state.lock() {
        release_recovery_slot(&mut locked, tab_id);
    }
}

/// Returns the start-gate slot `tab_id` holds for its recovery, if it still holds one.
fn release_recovery_slot(locked: &mut RuntimeState, tab_id: &str) {
    if locked.recovery_slots.remove(tab_id).is_some() {
        locked.active_starts = locked.active_starts.saturating_sub(1);
    }
}

/// Applies a `child-unresponsive` or `child-responsive` notice to the tab's registry lifecycle and
/// reports whether the registry changed. Invariant: liveness is supervision state only; the
/// presented surface status stays what the tab's bridge last reported, so no client sees it.
fn record_liveness(registry: &mut RegistryDocument, tab_id: &str, message: &str) -> bool {
    let Some(record) = registry
        .tabs
        .iter_mut()
        .find(|record| record.tab_id == tab_id)
    else {
        return false;
    };
    match message {
        "child-unresponsive" if record.lifecycle != "unresponsive" => {
            record.lifecycle = "unresponsive".into();
            counters::record(CounterEvent::UnresponsiveTransition);
            true
        }
        "child-responsive" if record.lifecycle == "unresponsive" => {
            record.lifecycle = "running".into();
            true
        }
        _ => false,
    }
}

fn supervise_holders(state: &Arc<Mutex<RuntimeState>>) {
    let (stale, commit) = {
        let Ok(mut locked) = state.lock() else {
            return;
        };
        expire_controller_boundaries(&mut locked);
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
                counters::record(CounterEvent::ChildHangRecovery);
                if let Some(holder) = locked.holders.get(&tab_id) {
                    let _ = holder.peer.offer_control(
                        wire::frame(
                            "holder.terminate-child",
                            None,
                            wire::ResultBody::accepted("event loop unresponsive".into()),
                        )
                        .unwrap_or_default(),
                    );
                }
            } else {
                registry_changed |= record_liveness(&mut locked.registry, &tab_id, &message);
            }
        }
        if registry_changed {
            bump_registry_revision(&mut locked.registry);
        }
        let stale = locked
            .holders
            .iter()
            .filter(|(tab_id, holder)| {
                pids.contains(&holder.identity.pid) && !locked.core.is_terminating(*tab_id)
            })
            .map(|(tab_id, holder)| (tab_id.clone(), holder.identity.clone()))
            .collect::<Vec<_>>();
        for (tab_id, _) in &stale {
            counters::record(CounterEvent::HolderHangRecovery);
            locked.core.set_terminating(&tab_id, true);
        }
        let commit = registry_changed.then(|| registry_snapshot(&locked));
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
            release_id: crate::roles::scope::release_id()?,
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
    crate::roles::scope::admit(&welcome.release_id)?;
    if welcome.generation != protocol::GENERATION {
        return Err("resident server generation is incompatible".to_owned());
    }
    Ok(())
}

/// Reads the complete first envelope under its admission budget before clearing the deadline.
fn read_peer_hello(
    stream: &mut endpoint::EndpointStream,
) -> Result<(Option<u64>, RoleHello), String> {
    endpoint::set_handshake_deadline(stream, std::time::Duration::from_secs(4))
        .map_err(|error| error.to_string())?;
    let payload =
        wire::read_payload(stream)?.ok_or_else(|| "peer closed before hello".to_owned())?;
    if wire::kind(&payload)?.message_type != "hello" {
        return Err("first resident message is not hello".to_owned());
    }
    let (request_id, hello): (_, RoleHello) = wire::body(&payload)?;
    if let Err(reason) = crate::roles::scope::admit(&hello.release_id) {
        wire::send(stream, "refused", request_id, wire::ResultBody::refused(reason.clone()))?;
        return Err(reason);
    }
    endpoint::clear_handshake_deadline(stream).map_err(|error| error.to_string())?;
    Ok((request_id, hello))
}

fn serve_peer(
    mut stream: endpoint::EndpointStream,
    state: Arc<Mutex<RuntimeState>>,
    profile: std::path::PathBuf,
) -> Result<(), String> {
    let _connection = endpoint::close_on_drop(&stream);
    lock_state(&state)?.last_activity = std::time::Instant::now();
    let (request_id, hello) = read_peer_hello(&mut stream)?;
    let supported =
        crate::fault_injection::server_generation_override().unwrap_or(protocol::GENERATION);
    if hello.generation != supported {
        return wire::send(
            &mut stream,
            "incompatible-generation",
            request_id,
            protocol::IncompatibleGeneration {
                offered: hello.generation,
                supported,
            },
        );
    }
    let (admitted_incarnation, epoch) = match admit_hello(&state, &hello) {
        Ok(admitted) => admitted,
        Err(reason) => {
            // Protocol: a refusal names its reason so a holder the server will never admit, such as
            // one without a registry or standby record, ends instead of asking for another server.
            let _ = wire::send(
                &mut stream,
                "refused",
                request_id,
                wire::ResultBody::refused(reason.clone()),
            );
            return Err(reason);
        }
    };
    if hello.role == "probe" {
        return wire::send(&mut stream, "welcome", request_id, welcome(epoch));
    }
    if hello.role == "maintain" {
        wire::send(&mut stream, "welcome", request_id, welcome(epoch))?;
        let served = serve_maintain(stream, state.clone());
        if served.is_err()
            && let Ok(locked) = state.lock()
        {
            let _ = crate::roles::diagnostics::append_log(
                &locked.diagnostics_root,
                "server",
                "maintenance-request-failed",
            );
        }
        return served;
    }
    wire::send(&mut stream, "welcome", request_id, welcome(epoch))?;
    let writer = stream
        .try_clone()
        .map_err(|error| format!("clone resident stream: {error}"))?;
    let (tx, rx) = mpsc::sync_channel::<Vec<u8>>(CONTROL_LANE_FRAMES);
    let queued_bytes = Arc::new(AtomicUsize::new(0));
    let surface = Arc::new(Mutex::new(None));
    let surface_signaled = Arc::new(AtomicBool::new(false));
    let surface_replaced = Arc::new(AtomicBool::new(false));
    thread::spawn({
        let queued_bytes = queued_bytes.clone();
        let surface = surface.clone();
        let surface_signaled = surface_signaled.clone();
        let surface_replaced = surface_replaced.clone();
        move || {
            writer_loop(
                writer,
                rx,
                queued_bytes,
                surface,
                surface_signaled,
                surface_replaced,
            )
        }
    });
    let peer = Peer {
        tx,
        queued_bytes,
        surface,
        surface_signaled,
        surface_replaced,
    };
    match hello.role.as_str() {
        "attach" | "internal" => {
            let allow_control = hello.role == "attach";
            let terminal_effects =
                protocol::negotiated(&hello.features, protocol::FEATURE_TERMINAL_EFFECTS);
            let structured_surface =
                protocol::negotiated(&hello.features, protocol::FEATURE_STRUCTURED_SURFACE);
            serve_attach(
                stream,
                peer,
                state,
                profile,
                hello.tab_id,
                allow_control,
                terminal_effects,
                structured_surface,
            )
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
                protocol::negotiated(&hello.features, protocol::FEATURE_SEMANTIC_INPUT),
                protocol::negotiated(&hello.features, protocol::FEATURE_STRUCTURED_SURFACE),
            )
        }
        "bridge" => {
            let heartbeat_supported = hello
                .features
                .iter()
                .any(|feature| feature == "bridge-heartbeat" || feature == "crash-recovery");
            let controller_boundary = hello
                .features
                .iter()
                .any(|feature| feature == "controller-boundary");
            serve_bridge(
                stream,
                peer,
                state,
                hello.tab_id.unwrap_or_default(),
                admitted_incarnation,
                heartbeat_supported,
                controller_boundary,
            )
        }
        _ => unreachable!(),
    }
}

/// Verifies a peer's hello against credentials, epoch, and the registry or standby record, and
/// returns the incarnation it is admitted under with the current epoch. Every error is a refusal
/// reason the peer may read; none includes peer-supplied text.
fn admit_hello(state: &Arc<Mutex<RuntimeState>>, hello: &RoleHello) -> Result<(u64, u64), String> {
    // Invariant: a holder or bridge belongs to the incarnation its token was derived with, which
    // the registry names; a hello that omits its incarnation must not detach a bridge's status
    // from the surfaces of the holder it runs under.
    let (expected, admitted_incarnation) = {
        let locked = lock_state(state)?;
        expected_peer_credential(&locked, hello)?
    };
    if hello.token != expected {
        return Err("resident credential rejected".to_owned());
    }
    let epoch = lock_state(&state)?.registry.epoch;
    if hello.highest_epoch > epoch {
        return Err("peer has observed a newer server epoch".to_owned());
    }
    verify_holder_record(state, hello)?;
    Ok((admitted_incarnation, epoch))
}

/// The credential a peer must present and the incarnation it is admitted under: the client token
/// for clients, or the holder or bridge token derived for the tab's recorded incarnation.
fn expected_peer_credential(
    locked: &RuntimeState,
    hello: &RoleHello,
) -> Result<(Vec<u8>, u64), String> {
    Ok(match hello.role.as_str() {
        "attach" | "internal" | "probe" | "maintain" => {
            (locked.credentials.client_token.to_vec(), hello.incarnation)
        }
        "holder" | "bridge" => {
            let tab_id = hello.tab_id.as_deref().unwrap_or("");
            let incarnation = locked
                .registry
                .tabs
                .iter()
                .find(|tab| tab.tab_id == tab_id)
                .map(|tab| {
                    if hello.role == "holder"
                        && tab.lifecycle == "restarting"
                        && hello.incarnation.saturating_add(1) == tab.incarnation
                    {
                        hello.incarnation
                    } else {
                        tab.incarnation
                    }
                })
                .or_else(|| {
                    locked
                        .standby
                        .as_ref()
                        .filter(|standby| standby.tab_id == tab_id)
                        .map(|standby| standby.incarnation)
                })
                .unwrap_or(1);
            (
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
                    .to_vec(),
                incarnation,
            )
        }
        _ => return Err("unapproved resident peer role".to_owned()),
    })
}

/// Verifies a holder's hello against its registry or standby record: the record must exist, name
/// the hello's incarnation, and match the live holder and child identities it recorded.
fn verify_holder_record(state: &Arc<Mutex<RuntimeState>>, hello: &RoleHello) -> Result<(), String> {
    if hello.role != "holder" {
        return Ok(());
    }
    let recorded = {
        let locked = lock_state(&state)?;
        let recorded = locked
            .registry
            .tabs
            .iter()
            .find(|tab| Some(tab.tab_id.as_str()) == hello.tab_id.as_deref())
            .cloned();
        let standby_matches = locked.standby.as_ref().is_some_and(|standby| {
            Some(standby.tab_id.as_str()) == hello.tab_id.as_deref()
                && standby.incarnation == hello.incarnation
        });
        if recorded.is_none() && !standby_matches {
            return Err("holder has no registry or standby record".to_owned());
        }
        recorded
    };
    let pending_respawn = recorded.as_ref().is_some_and(|recorded| {
        recorded.lifecycle == "restarting"
            && hello.incarnation.saturating_add(1) == recorded.incarnation
    });
    if recorded
        .as_ref()
        .is_some_and(|recorded| hello.incarnation != recorded.incarnation && !pending_respawn)
    {
        return Err("holder incarnation does not match the registry".to_owned());
    }
    if let Some(recorded_pid) = recorded.as_ref().and_then(|recorded| recorded.holder_pid) {
        let pid = hello
            .pid
            .ok_or_else(|| "holder did not present a pid".to_owned())?;
        let observed = inspect_identity_bounded(pid)?
            .ok_or_else(|| "holder process is not live".to_owned())?;
        if recorded_pid != pid
            || recorded
                .as_ref()
                .and_then(|recorded| recorded.holder_start_identity.as_deref())
                != Some(observed.start.as_str())
        {
            return Err("holder identity does not match the registry".to_owned());
        }
    }
    if let Some(recorded_child_pid) = recorded.as_ref().and_then(|recorded| recorded.child_pid) {
        let child_pid = hello
            .child_pid
            .ok_or_else(|| "holder did not present its child pid".to_owned())?;
        let child = inspect_identity_bounded(child_pid)?
            .ok_or_else(|| "holder child process is not live".to_owned())?;
        if recorded_child_pid != child_pid
            || recorded
                .as_ref()
                .and_then(|recorded| recorded.child_start_identity.as_deref())
                != Some(child.start.as_str())
            || hello.child_start_identity.as_deref() != Some(child.start.as_str())
        {
            return Err("holder child identity does not match the registry".to_owned());
        }
    }
    Ok(())
}

fn welcome(epoch: u64) -> Welcome {
    Welcome {
        generation: protocol::GENERATION,
        build: "a1-terminal-host".into(),
        release_id: crate::roles::scope::release_id().unwrap_or_default(),
        features: vec![
            "resident-multi-tab".into(),
            "slow-client-isolation".into(),
            "crash-recovery".into(),
            "bridge-heartbeat".into(),
            "bridge-restart".into(),
            "controller-boundary".into(),
            "bridge-visibility".into(),
            "bridge-rename".into(),
            "bridge-route".into(),
            "bridge-stop".into(),
            "standby-promotion".into(),
            "recovery-status".into(),
            protocol::FEATURE_SEMANTIC_INPUT.into(),
            protocol::FEATURE_TERMINAL_EFFECTS.into(),
            protocol::FEATURE_STRUCTURED_SURFACE.into(),
            "bridge-shortcuts".into(),
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
    surface_signaled: Arc<AtomicBool>,
    surface_replaced: Arc<AtomicBool>,
) {
    let _connection = endpoint::close_on_drop(&stream);
    loop {
        match rx.recv_timeout(std::time::Duration::from_millis(8)) {
            Ok(frame) if !frame.is_empty() => {
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
        surface_signaled.store(false, Ordering::SeqCst);
        let frame = surface.lock().ok().and_then(|mut slot| slot.take());
        if frame.is_some() && surface_replaced.swap(false, Ordering::SeqCst) {
            counters::record(CounterEvent::FullSurfaceResync);
        }
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

struct ControlClaim {
    attachment: Option<(Peer, BridgeAttachment)>,
    pending: bool,
}

/// What inspecting one recorded process identity found.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ProcessState {
    Live,
    /// No process, or a different process reusing the pid.
    Gone,
    /// No identity is recorded.
    Unknown,
    /// The inspection itself failed.
    Unverifiable,
}

/// What a maintenance stop does with a tab still tracked after its grace and forced termination.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum StopDisposition {
    Release,
    Remain(&'static str),
}

/// A tab lifecycle request taken off a client's input path.
struct LifecycleRequest {
    message_type: String,
    request_id: Option<u64>,
    payload: Vec<u8>,
    /// Only this client's matching create request can cancel its queued or running start.
    cancelled: Option<Arc<AtomicBool>>,
}

/// One client's lifecycle requests that are queued or running.
#[derive(Default)]
struct LifecycleBacklog {
    pending: usize,
    running_since: Option<std::time::Instant>,
}

struct StartPermit {
    state: Arc<Mutex<RuntimeState>>,
    tab_id: String,
}
impl Drop for StartPermit {
    fn drop(&mut self) {
        if let Ok(mut locked) = self.state.lock() {
            locked.active_starts = locked.active_starts.saturating_sub(1);
            locked.core.set_starting(&self.tab_id, false);
        }
    }
}

/// Registers a waiting user-requested start for as long as it lives.
struct InteractiveStartWaiter<'a> {
    state: &'a Arc<Mutex<RuntimeState>>,
}
impl Drop for InteractiveStartWaiter<'_> {
    fn drop(&mut self) {
        if let Ok(mut locked) = self.state.lock() {
            locked.interactive_start_waiters = locked.interactive_start_waiters.saturating_sub(1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_reader_thread_processes_input_during_a_restart_delay() {
        let (reader_tx, reader_rx) = mpsc::channel::<&str>();
        let (respawn_tx, respawn_rx) = mpsc::channel::<std::time::Instant>();
        let delay = std::time::Duration::from_millis(300);
        let scheduled = std::time::Instant::now();
        // Invariant: scheduling the respawn returns at once; the reader goes on to its next frame.
        after_delay(delay, move || {
            let _ = respawn_tx.send(std::time::Instant::now());
        });
        reader_tx.send("holder frame").unwrap();
        assert_eq!(
            reader_rx.recv_timeout(delay / 3).as_deref(),
            Ok("holder frame"),
            "the reader handled a frame inside the restart delay"
        );
        assert!(scheduled.elapsed() < delay);
        let delivered = respawn_rx
            .recv_timeout(std::time::Duration::from_secs(5))
            .expect("the respawn runs once the delay elapses");
        assert!(delivered.duration_since(scheduled) >= delay);
    }

    fn retained_surface(incarnation: u64, revision: u64, bytes: &[u8]) -> Surface {
        Surface {
            tab_id: "tab".into(),
            incarnation,
            revision,
            request_generation: 0,
            bytes: bytes.to_vec(),
            structured: None,
            status: "idle".into(),
            accent: None,
            stale: false,
            modes: None,
            cursor: None,
        }
    }

    #[test]
    fn holder_surface_identity_rejects_stale_or_mutated_equal_revisions() {
        let existing = retained_surface(2, 9, b"current");
        assert!(accepts_holder_surface(None, &existing));
        assert!(accepts_holder_surface(
            Some(&existing),
            &retained_surface(2, 10, b"next")
        ));
        assert!(accepts_holder_surface(
            Some(&existing),
            &retained_surface(3, 1, b"restart")
        ));
        assert!(!accepts_holder_surface(
            Some(&existing),
            &retained_surface(2, 8, b"old")
        ));
        assert!(!accepts_holder_surface(
            Some(&existing),
            &retained_surface(2, 9, b"different")
        ));
        let mut metadata = existing.clone();
        metadata.status = "working".into();
        metadata.accent = Some("blue".into());
        assert!(accepts_holder_surface(Some(&existing), &metadata));
    }

    #[test]
    fn welcome_advertises_the_owned_route_bridge() {
        let welcome = welcome(7);
        assert!(
            welcome
                .features
                .iter()
                .any(|feature| feature == "bridge-route")
        );
    }

    #[test]
    fn a_replaced_surface_counts_a_lane_replacement_and_marks_a_resync() {
        let (tx, _rx) = mpsc::sync_channel(CONTROL_LANE_FRAMES);
        let peer = Peer {
            tx,
            queued_bytes: Arc::new(AtomicUsize::new(0)),
            surface: Arc::new(Mutex::new(None)),
            surface_signaled: Arc::new(AtomicBool::new(false)),
            surface_replaced: Arc::new(AtomicBool::new(false)),
        };
        let before = counters::snapshot(1);
        peer.offer_surface(vec![1]);
        assert!(!peer.surface_replaced.load(Ordering::SeqCst));
        peer.offer_surface(vec![2]);
        assert!(peer.surface_replaced.load(Ordering::SeqCst));
        assert_eq!(*peer.surface.lock().unwrap(), Some(vec![2]));
        // Concurrency: other tests may record events too, so the delta is a lower bound.
        assert!(counters::snapshot(1).render_lane_replacements > before.render_lane_replacements);
    }

    #[test]
    fn idle_exit_removes_the_owner_marker_only_while_still_owned() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("server.json");
        let own = ProcessIdentity {
            pid: 41,
            start: "own-start".into(),
        };
        assert!(!remove_marker_if_owned(&path, &own), "no marker is a no-op");
        std::fs::write(&path, r#"{"pid":41,"startIdentity":"replacement-start"}"#).unwrap();
        assert!(!remove_marker_if_owned(&path, &own));
        std::fs::write(&path, r#"{"pid":42,"startIdentity":"own-start"}"#).unwrap();
        assert!(!remove_marker_if_owned(&path, &own));
        assert!(path.exists(), "a replacement's marker is kept");
        std::fs::write(&path, r#"{"pid":41,"startIdentity":"own-start"}"#).unwrap();
        assert!(remove_marker_if_owned(&path, &own));
        assert!(!path.exists());
    }

    pub(super) fn record(
        tab_id: &str,
        created_at: u64,
        desired: &str,
        holder_pid: Option<u32>,
    ) -> TabRecord {
        TabRecord {
            tab_id: tab_id.into(),
            kind: "agent".into(),
            created_at: created_at.to_string(),
            display_name: tab_id.into(),
            name_source: "default".into(),
            order: 0,
            cwd: "/w".into(),
            session_file: None,
            session_dir: None,
            desired: desired.into(),
            lifecycle: if desired == "stopped" {
                "stopped".into()
            } else {
                "running".into()
            },
            incarnation: 1,
            holder_pid,
            holder_start_identity: None,
            child_pid: None,
            child_start_identity: None,
            release: "/r".into(),
            last_exit: None,
            restarts: 0,
            restart_window_start: None,
            requested_restart: false,
            attention_seq: 0,
            seen_seq: 0,
        }
    }

    #[test]
    fn liveness_notices_change_only_the_registry_lifecycle() {
        let mut registry = RegistryDocument {
            registry_revision: 1,
            epoch: 1,
            boot_id: "boot".into(),
            os_session_id: "session".into(),
            release_id: String::new(),
            tabs: vec![record("tab", 1, "running", None)],
        };
        let before = crate::roles::counters::snapshot(1).unresponsive_transitions;
        assert!(record_liveness(&mut registry, "tab", "child-unresponsive"));
        assert_eq!(registry.tabs[0].lifecycle, "unresponsive");
        assert!(!record_liveness(&mut registry, "tab", "child-unresponsive"));
        assert!(crate::roles::counters::snapshot(1).unresponsive_transitions > before);
        assert!(record_liveness(&mut registry, "tab", "child-responsive"));
        assert_eq!(registry.tabs[0].lifecycle, "running");
        assert!(!record_liveness(&mut registry, "tab", "child-responsive"));
        assert!(!record_liveness(
            &mut registry,
            "missing",
            "child-unresponsive"
        ));
    }

    #[test]
    fn stopping_agent_cannot_detach_its_former_controller() {
        let running = record("older", 1, "running", None);
        let stopping = record("closing", 2, "stopped", None);
        let tabs = vec![running, stopping];
        assert!(bridge::allows_controller_request(&tabs, "older"));
        assert!(!bridge::allows_controller_request(&tabs, "closing"),
            "a stopped child's bridge can request detach before its controller switches tabs");
        assert!(!bridge::allows_controller_request(&tabs, "missing"));
    }

    #[test]
    fn default_attach_selects_the_first_ordered_running_agent() {
        let mut settings = record("settings-1", 1, "running", None);
        settings.kind = "settings".into();
        settings.order = 0;
        let mut second = record("tab-2", 2, "running", None);
        second.order = 2;
        let mut first = record("tab-1", 3, "running", None);
        first.order = 1;
        let mut stopped = record("tab-stopped", 4, "stopped", None);
        stopped.order = 0;
        assert_eq!(default_tab(&[settings, second, first, stopped]), "tab-1");
    }

    #[test]
    fn attach_starts_a_fresh_agent_only_when_every_agent_has_stopped() {
        let empty = first_agent_start(&[]).expect("an empty registry starts an Agent");
        assert_eq!(empty.tab_id, "tab-1");
        assert!(empty.dropped.is_empty());
        let mut settings = record("settings-1", 1, "running", None);
        settings.kind = "settings".into();
        let utility_only = first_agent_start(std::slice::from_ref(&settings))
            .expect("a utility-only registry starts an Agent");
        assert_eq!(utility_only.tab_id, "tab-1");
        assert!(utility_only.dropped.is_empty());

        let exited = record("tab-1", 2, "stopped", None);
        let stopping = record("tab-2", 3, "stopped", Some(4242));
        let start = first_agent_start(&[settings.clone(), exited.clone(), stopping])
            .expect("stopped Agents start a new one");
        assert!(
            start.tab_id.starts_with("tab-") && start.tab_id != "tab-1",
            "a new Agent beside stopped records takes a fresh identity: {}",
            start.tab_id
        );
        assert_eq!(
            start.dropped,
            ["tab-1"],
            "only the holder-less stopped record is dropped"
        );

        let running = record("tab-3", 4, "running", Some(1));
        assert!(
            first_agent_start(&[settings, exited, running]).is_none(),
            "a running Agent is viewed instead"
        );
    }

    #[test]
    fn registered_kinds_drive_server_identity_messages_and_capabilities() {
        assert_eq!(tab_kind("settings-1"), TabKind::Settings);
        assert_eq!(tab_kind("changelog-1"), TabKind::Changelog);
        assert_eq!(tab_kind("tab-1"), TabKind::Agent);
        assert_eq!(utility_request("tab.open-changelog"), Some((TabKind::Changelog, true)));
        assert_eq!(utility_request("tab.prewarm-settings"), Some((TabKind::Settings, false)));
        assert_eq!(utility_request("tab.open-browser"), None);
        assert_eq!(utility_request("tab.create"), None);
        for kind in TabKind::ALL {
            let provider = kind.provider();
            assert_eq!(TabKind::from_name(provider.name), Some(kind));
            assert_eq!(provider.renameable, provider.owns_session);
        }
        let mut changelog = record("changelog-1", 1, "running", None);
        changelog.kind = "changelog".into();
        let mut registry = RegistryDocument {
            registry_revision: 1,
            epoch: 1,
            boot_id: "boot".into(),
            os_session_id: "session".into(),
            release_id: String::new(),
            tabs: vec![record("agent-1", 1, "running", None), changelog],
        };
        append_live_tab(&mut registry, record("agent-2", 2, "running", None));
        let ids = registry
            .tabs
            .iter()
            .map(|tab| tab.tab_id.as_str())
            .collect::<Vec<_>>();
        assert_eq!(ids, ["agent-1", "changelog-1", "agent-2"]);
        assert_eq!(default_tab(&[]), "tab-1", "singleton tabs never become the default Agent");
    }

    #[test]
    fn every_new_tab_appends_and_drag_order_survives_later_creation() {
        let mut settings = record("settings-1", 1, "running", None);
        settings.kind = "settings".into();
        settings.order = 1;
        let mut first = record("agent-1", 2, "running", None);
        first.order = 0;
        let mut registry = RegistryDocument {
            registry_revision: 4,
            epoch: 1,
            boot_id: "boot".into(),
            os_session_id: "session".into(),
            release_id: String::new(),
            tabs: vec![first, settings],
        };
        let names = |registry: &RegistryDocument| {
            registry
                .tabs
                .iter()
                .map(|tab| tab.tab_id.clone())
                .collect::<Vec<_>>()
        };
        assert_eq!(names(&registry), ["agent-1", "settings-1"]);
        let mut second = record("agent-2", 3, "running", None);
        second.order = 2;
        append_live_tab(&mut registry, second);
        assert_eq!(names(&registry), ["agent-1", "settings-1", "agent-2"]);
        assert_eq!(
            registry
                .tabs
                .iter()
                .map(|tab| tab.order)
                .collect::<Vec<_>>(),
            [0, 1, 2]
        );
        assert!(lifecycle::reorder_registry(
            &mut registry,
            &wire::TabReorder {
                tab_id: "settings-1".into(),
                target_index: 0,
                expected_revision: 4,
            }
        ));
        assert_eq!(names(&registry), ["settings-1", "agent-1", "agent-2"]);
        assert_eq!(registry.tabs[0].order, 0, "dragged placement stays durable");
        append_live_tab(&mut registry, record("agent-3", 4, "running", None));
        assert_eq!(
            names(&registry),
            ["settings-1", "agent-1", "agent-2", "agent-3"]
        );
    }

    #[test]
    fn reorder_targets_visible_tabs_not_stopped_registry_slots() {
        let mut settings = record("settings-1", 3, "running", None);
        settings.kind = "settings".into();
        let mut registry = RegistryDocument {
            registry_revision: 4,
            epoch: 1,
            boot_id: "boot".into(),
            os_session_id: "session".into(),
            release_id: String::new(),
            tabs: vec![
                record("closed-0", 0, "stopped", None),
                record("agent-1", 1, "running", None),
                record("closed-1", 2, "stopped", None),
                settings,
                record("closed-2", 4, "stopped", None),
                record("agent-2", 5, "running", None),
                record("closed-3", 6, "stopped", None),
            ],
        };
        let visible = |registry: &RegistryDocument| {
            registry
                .tabs
                .iter()
                .filter(|tab| tab.desired != "stopped")
                .map(|tab| tab.tab_id.clone())
                .collect::<Vec<_>>()
        };
        assert!(lifecycle::reorder_registry(
            &mut registry,
            &wire::TabReorder {
                tab_id: "agent-1".into(),
                target_index: 2,
                expected_revision: 4,
            }
        ));
        assert_eq!(visible(&registry), ["settings-1", "agent-2", "agent-1"]);
        assert_eq!(registry.tabs.last().unwrap().tab_id, "closed-3");
        assert!(lifecycle::reorder_registry(
            &mut registry,
            &wire::TabReorder {
                tab_id: "agent-1".into(),
                target_index: 0,
                expected_revision: 5,
            }
        ));
        assert_eq!(visible(&registry), ["agent-1", "settings-1", "agent-2"]);
        assert!(lifecycle::reorder_registry(
            &mut registry,
            &wire::TabReorder {
                tab_id: "settings-1".into(),
                target_index: 0,
                expected_revision: 6,
            }
        ));
        assert_eq!(visible(&registry), ["settings-1", "agent-1", "agent-2"]);
        assert!(lifecycle::move_live_tab_last(&mut registry, "settings-1"));
        assert_eq!(visible(&registry), ["agent-1", "agent-2", "settings-1"]);
        assert!(!lifecycle::move_live_tab_last(&mut registry, "settings-1"));
        assert_eq!(registry.registry_revision, 8);
    }

    #[test]
    fn stopped_records_do_not_affect_the_final_visible_slot() {
        let mut settings = record("settings-1", 2, "running", None);
        settings.kind = "settings".into();
        settings.order = 1;
        let mut stopped = record("closed-agent", 3, "stopped", None);
        stopped.order = 2;
        let mut registry = RegistryDocument {
            registry_revision: 4,
            epoch: 1,
            boot_id: "boot".into(),
            os_session_id: "session".into(),
            release_id: String::new(),
            tabs: vec![record("agent-1", 1, "running", None), settings, stopped],
        };
        append_live_tab(&mut registry, record("agent-2", 4, "running", None));
        let visible = registry
            .tabs
            .iter()
            .filter(|tab| tab.desired != "stopped")
            .map(|tab| (tab.tab_id.as_str(), tab.order))
            .collect::<Vec<_>>();
        assert_eq!(visible, [("agent-1", 0), ("settings-1", 1), ("agent-2", 2)]);
        assert_eq!(registry.tabs.last().unwrap().desired, "stopped");
    }

    #[test]
    fn reorder_registry_is_revision_guarded_and_no_op_safe() {
        let tabs = ["a", "b", "c"]
            .into_iter()
            .enumerate()
            .map(|(index, id)| {
                let mut tab = record(id, index as u64, "running", None);
                tab.order = index as u32;
                tab
            })
            .collect::<Vec<_>>();
        let mut registry = RegistryDocument {
            registry_revision: 4,
            epoch: 1,
            boot_id: "boot".into(),
            os_session_id: "session".into(),
            release_id: String::new(),
            tabs,
        };
        let original = registry.clone();
        assert!(!lifecycle::reorder_registry(
            &mut registry,
            &wire::TabReorder {
                tab_id: "a".into(),
                target_index: 2,
                expected_revision: 3,
            }
        ));
        assert_eq!(registry, original);
        assert!(!lifecycle::reorder_registry(
            &mut registry,
            &wire::TabReorder {
                tab_id: "b".into(),
                target_index: 1,
                expected_revision: 4,
            }
        ));
        assert_eq!(registry, original);
        assert!(lifecycle::reorder_registry(
            &mut registry,
            &wire::TabReorder {
                tab_id: "a".into(),
                target_index: 2,
                expected_revision: 4,
            }
        ));
        assert_eq!(
            registry
                .tabs
                .iter()
                .map(|tab| (tab.tab_id.as_str(), tab.order))
                .collect::<Vec<_>>(),
            [("b", 0), ("c", 1), ("a", 2)]
        );
        assert_eq!(registry.registry_revision, 5);
    }

    #[test]
    fn restart_budget_schedules_new_incarnations_until_spent_then_fails_the_tab() {
        let mut tab = record("tab-1", 1, "running", None);
        let now = 1_000;
        let mut delays = Vec::new();
        while let Some(delay) = apply_restart_budget(&mut tab, now) {
            assert_eq!(tab.lifecycle, "restarting");
            assert_eq!(tab.restart_window_start, Some(now));
            delays.push(delay);
        }
        assert_eq!(delays, crate::core::server::RESTART_BACKOFF.to_vec());
        assert_eq!(tab.incarnation, 1 + delays.len() as u64);
        assert_eq!(tab.restarts as usize, delays.len());
        assert_eq!(tab.lifecycle, "failed");
        let window = crate::core::server::RESTART_WINDOW.as_secs();
        assert!(apply_restart_budget(&mut tab, now + window).is_some());
        assert_eq!(tab.restarts, 1);
    }

    #[test]
    fn respawn_orders_carry_the_incarnation_tokens() {
        let root = tempfile::tempdir().unwrap();
        let credentials = ProfileCredentials::load_or_create(root.path()).unwrap();
        let respawn = holder_respawn(&credentials, "tab-1", 7, Some("s.jsonl".into()), true);
        assert_eq!(respawn.tab_id, "tab-1");
        assert_eq!(respawn.incarnation, 7);
        assert_eq!(respawn.session_file.as_deref(), Some("s.jsonl"));
        assert!(respawn.start_fresh && respawn.recovery_journals.is_empty());
        assert_eq!(
            respawn.holder_token,
            credentials.derive("holder", "tab-1", 7).to_vec()
        );
        assert_eq!(
            respawn.bridge_token,
            credentials.derive("bridge", "tab-1", 7).to_vec()
        );
        assert_ne!(respawn.holder_token, respawn.bridge_token);
    }

    #[test]
    fn registry_revisions_advance_once_per_change_and_saturate() {
        let mut document = RegistryDocument {
            registry_revision: 0,
            epoch: 1,
            boot_id: "boot".into(),
            os_session_id: String::new(),
            release_id: String::new(),
            tabs: Vec::new(),
        };
        bump_registry_revision(&mut document);
        bump_registry_revision(&mut document);
        assert_eq!(document.registry_revision, 2);
        document.registry_revision = u64::MAX;
        bump_registry_revision(&mut document);
        assert_eq!(document.registry_revision, u64::MAX);
        assert!(commit_staged(None).is_ok());
    }

    #[test]
    fn a_poisoned_runtime_lock_reports_the_one_handler_error() {
        let lock = Mutex::new(());
        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = lock.lock().unwrap();
            panic!("poison the lock");
        }));
        assert!(lock.is_poisoned());
        assert_eq!(
            lock_state(&lock).err().as_deref(),
            Some("resident state poisoned")
        );
    }

    #[test]
    fn result_bodies_name_acceptance_and_reason() {
        let ok = wire::ResultBody::ok();
        assert!(ok.accepted && ok.message.is_none());
        let accepted = wire::ResultBody::accepted("done".into());
        assert!(accepted.accepted && accepted.message.as_deref() == Some("done"));
        let refused = wire::ResultBody::refused("busy".into());
        assert!(!refused.accepted && refused.message.as_deref() == Some("busy"));
    }

    #[test]
    fn attached_clients_are_capped() {
        assert!(client_slot_available(MAX_ATTACHED_CLIENTS - 1));
        assert!(!client_slot_available(MAX_ATTACHED_CLIENTS));
        assert!(!client_slot_available(MAX_ATTACHED_CLIENTS + 1));
    }

    #[test]
    fn connections_beyond_the_cap_are_refused_and_released_slots_are_reused() {
        let active = AtomicUsize::new(0);
        for _ in 0..MAX_CONNECTIONS {
            assert!(admit_connection(&active));
        }
        assert!(!admit_connection(&active));
        assert_eq!(active.load(Ordering::SeqCst), MAX_CONNECTIONS);
        active.fetch_sub(1, Ordering::SeqCst);
        assert!(admit_connection(&active));
    }

    #[test]
    fn stopped_records_are_bounded_oldest_first_and_live_tabs_are_kept() {
        let mut tabs = (0..MAX_STOPPED_RECORDS as u64 + 5)
            .map(|index| record(&format!("stopped-{index}"), index, "stopped", None))
            .collect::<Vec<_>>();
        tabs.push(record("running", 0, "running", Some(7)));
        tabs.push(record("stopping", 0, "stopped", Some(8)));
        prune_stopped_records(&mut tabs);
        let stopped = tabs
            .iter()
            .filter(|tab| tab.desired == "stopped" && tab.holder_pid.is_none())
            .count();
        assert_eq!(stopped, MAX_STOPPED_RECORDS);
        assert!(tabs.iter().all(|tab| tab.tab_id != "stopped-0"));
        assert!(tabs.iter().any(|tab| tab.tab_id == "stopped-20"));
        assert!(tabs.iter().any(|tab| tab.tab_id == "running"));
        assert!(
            tabs.iter().any(|tab| tab.tab_id == "stopping"),
            "a stopped record whose holder is still live is kept"
        );
    }

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
    fn three_tabs_keep_independent_successive_partial_frames() {
        let mut lanes = [
            SingleSlotRenderLane::default(),
            SingleSlotRenderLane::default(),
            SingleSlotRenderLane::default(),
        ];
        for revision in 1..=4 {
            for (tab, lane) in lanes.iter_mut().enumerate() {
                lane.offer(
                    revision,
                    format!("tab-{tab}-partial-{revision}").into_bytes(),
                );
            }
            for (tab, lane) in lanes.iter_mut().enumerate() {
                let delivery = lane.drain(Vec::new).expect("tab delivery");
                assert_eq!(delivery.revision, revision);
                assert_eq!(
                    delivery.bytes,
                    format!("tab-{tab}-partial-{revision}").into_bytes()
                );
                assert!(!delivery.full);
            }
        }
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
            surface_signaled: Arc::new(AtomicBool::new(false)),
            surface_replaced: Arc::new(AtomicBool::new(false)),
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
            surface_signaled: Arc::new(AtomicBool::new(false)),
            surface_replaced: Arc::new(AtomicBool::new(false)),
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
    fn standby_requires_exact_cwd_release_node_and_environment() {
        let start = AttachStart {
            client_id: "one".into(),
            tabs_max: 10,
            cwd: "E:/repo".into(),
            columns: 80,
            rows: 23,
            release_root: "E:/release".into(),
            node_executable: "node".into(),
            environment: vec![("B".into(), "2".into()), ("A".into(), "1".into())],
            session_file: None,
            session_dir: None,
        };
        let mut reordered = start.clone();
        reordered.client_id = "two".into();
        reordered.columns = 120;
        reordered.rows = 40;
        reordered.environment.reverse();
        assert!(same_standby_context(&start, &reordered));
        for changed in [
            ("cwd", "E:/other"),
            ("release", "E:/other-release"),
            ("node", "other-node"),
        ] {
            let mut candidate = reordered.clone();
            match changed.0 {
                "cwd" => candidate.cwd = changed.1.into(),
                "release" => candidate.release_root = changed.1.into(),
                _ => candidate.node_executable = changed.1.into(),
            }
            assert!(!same_standby_context(&start, &candidate));
        }
        reordered.environment.push(("EXTRA".into(), "value".into()));
        assert!(!same_standby_context(&start, &reordered));
    }

    #[test]
    fn a_session_name_becomes_the_tab_name_unless_automatic_after_a_user_name() {
        let mut tab = record("tab-1", 1, "running", None);
        bridge::apply_session_name(&mut tab, " fix-login ", Some("auto"));
        assert_eq!(
            (tab.display_name.as_str(), tab.name_source.as_str()),
            ("fix-login", "auto")
        );
        bridge::apply_session_name(&mut tab, "what is there", Some("user"));
        assert_eq!(
            (tab.display_name.as_str(), tab.name_source.as_str()),
            ("what is there", "user"),
            "a /name over an automatic name renames the tab"
        );
        bridge::apply_session_name(&mut tab, "later-auto", Some("auto"));
        assert_eq!(
            tab.display_name, "what is there",
            "an automatic name never replaces a user name"
        );
        bridge::apply_session_name(&mut tab, "again", Some("odd"));
        assert_eq!(
            (tab.display_name.as_str(), tab.name_source.as_str()),
            ("again", "user")
        );
        for invalid in ["  ", "bell\u{7}", &"x".repeat(65)] {
            bridge::apply_session_name(&mut tab, invalid, Some("user"));
            assert_eq!(tab.display_name, "again");
        }
        bridge::apply_session_name(&mut tab, "Agent", Some("default"));
        assert_eq!(
            (tab.display_name.as_str(), tab.name_source.as_str()),
            ("Agent", "default")
        );
    }

    #[test]
    fn bridge_session_reads_the_child_name_source() {
        // Protocol: The child bridge client sends camelCase `nameSource`.
        let child: BridgeSession =
            serde_json::from_str(r#"{"file":"D:/s.jsonl","name":"ask-100","nameSource":"auto"}"#)
                .unwrap();
        assert_eq!(child.name_source.as_deref(), Some("auto"));
        let legacy: BridgeSession =
            serde_json::from_str(r#"{"file":null,"name":"x","name_source":"default"}"#).unwrap();
        assert_eq!(legacy.name_source.as_deref(), Some("default"));
        let encoded = rmp_serde::to_vec_named(&serde_json::json!({
            "file": null, "name": "ask-100", "nameSource": "auto",
        }))
        .unwrap();
        let decoded: BridgeSession = rmp_serde::from_slice(&encoded).unwrap();
        assert_eq!(decoded.name_source.as_deref(), Some("auto"));
    }

    #[test]
    fn bridge_status_rejects_stale_sequences_and_tracks_unseen_completion() {
        assert!(accepts_bridge_sequence(None, 2, 1));
        assert!(!accepts_bridge_sequence(Some((2, 4)), 2, 4));
        assert!(!accepts_bridge_sequence(Some((2, 4)), 2, 3));
        assert!(accepts_bridge_sequence(Some((2, 4)), 3, 1));
        assert_eq!(
            bridge_surface_status("working", "idle".into(), 0, 0, false, false),
            "done-unseen"
        );
        assert_eq!(
            bridge_surface_status("done-unseen", "done-unseen".into(), 0, 0, false, true),
            "idle"
        );
        assert_eq!(
            bridge_surface_status("needs-input", "idle".into(), 0, 0, false, false),
            "done-unseen"
        );
        assert_eq!(
            bridge_surface_status("idle", "idle".into(), 1, 0, false, false),
            "needs-input"
        );
        assert_eq!(
            bridge_surface_status("idle", "idle".into(), 0, 1, false, false),
            "working"
        );
        assert_eq!(
            bridge_surface_status("idle", "suspended".into(), 0, 0, false, false),
            "idle"
        );
        // Invariant: Settlement markers reported by the child persist while viewed until the next turn.
        for settled in ["done", "aborted", "failed"] {
            assert_eq!(
                bridge_surface_status("working", settled.into(), 0, 0, false, true),
                settled
            );
            assert_eq!(
                bridge_surface_status(settled, settled.into(), 0, 0, false, true),
                settled
            );
            assert_eq!(
                bridge_surface_status(settled, "working".into(), 0, 0, false, true),
                "working"
            );
        }
        let mut attention = u64::MAX;
        mark_attention(&mut attention);
        assert_eq!(attention, u64::MAX);
        let mut seen = 2;
        assert!(mark_seen(3, &mut seen));
        assert_eq!(seen, 3);
        assert!(!mark_seen(3, &mut seen));
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

    #[test]
    fn recovery_yields_free_start_slots_to_a_waiting_user_start() {
        assert!(gate_slot_free(1, 2, 0));
        assert!(!gate_slot_free(1, 2, 1));
        assert!(!gate_slot_free(2, 2, 0));
    }

    #[test]
    fn lifecycle_failures_answer_with_their_request_reply_and_hide_paths() {
        assert_eq!(lifecycle_refusal("attach.start"), "error");
        assert_eq!(lifecycle_refusal("tab.create"), "tab.create-failed");
        assert_eq!(lifecycle_refusal("tab.close"), "tab.closed");
        assert_eq!(lifecycle_refusal("tab.restart"), "tab.restarted");
        assert_eq!(lifecycle_refusal("tab.rename"), "tab.rename-refused");
        assert_eq!(lifecycle_refusal("tab.reorder"), "tab.reordered");
        assert_eq!(
            lifecycle_failure_message("tab.create", TAB_START_BUSY),
            TAB_START_BUSY
        );
        assert_eq!(
            lifecycle_failure_message("tab.rename", "commit C:\\Users\\someone\\registry.json"),
            "Tab change could not be completed"
        );
    }

    #[test]
    fn create_cancellation_matches_only_this_connections_request() {
        let current = Mutex::new(None);
        let frame = wire::frame("tab.create", Some(7), wire::ResultBody::ok()).unwrap();
        let token = begin_client_create(&current, &wire::kind(&frame[4..]).unwrap()).unwrap();
        let wrong = wire::frame("tab.cancel-create", None, serde_json::json!({ "requestId": 8 })).unwrap();
        cancel_client_create(&current, &wrong[4..]).unwrap();
        assert!(!token.load(Ordering::Acquire));
        let matching = wire::frame("tab.cancel-create", None, serde_json::json!({ "requestId": 7 })).unwrap();
        cancel_client_create(&current, &matching[4..]).unwrap();
        assert!(token.load(Ordering::Acquire));
    }

    #[test]
    fn a_full_lifecycle_refusal_reaches_the_client_without_waiting() {
        let (tx, rx) = mpsc::sync_channel(CONTROL_LANE_FRAMES);
        let peer = Peer {
            tx,
            queued_bytes: Arc::new(AtomicUsize::new(0)),
            surface: Arc::new(Mutex::new(None)),
            surface_signaled: Arc::new(AtomicBool::new(false)),
            surface_replaced: Arc::new(AtomicBool::new(false)),
        };
        let encoded = wire::frame("tab.create", Some(7), wire::ResultBody::ok()).unwrap();
        assert_eq!(wire::kind(&encoded[4..]).unwrap().request_id, Some(7));
        let request = LifecycleRequest {
            message_type: "tab.create".into(),
            request_id: Some(7),
            payload: Vec::new(),
            cancelled: None,
        };
        refuse_lifecycle(&peer, &request, "busy".into());
        let frame = rx.try_recv().expect("refusal frame");
        let payload = &frame[4..];
        assert_eq!(
            wire::kind(payload).unwrap().message_type,
            "tab.create-failed"
        );
        let (request_id, body): (_, wire::ResultBody) = wire::body(payload).unwrap();
        assert_eq!(request_id, Some(7));
        assert!(!body.accepted);
        assert_eq!(body.message.as_deref(), Some("busy"));
    }

    #[test]
    fn lifecycle_status_totals_pending_work_and_reports_the_oldest_running_request() {
        let now = std::time::Instant::now();
        let mut backlog = HashMap::new();
        backlog.insert(
            "one".to_owned(),
            LifecycleBacklog {
                pending: 2,
                running_since: now.checked_sub(std::time::Duration::from_secs(12)),
            },
        );
        backlog.insert(
            "two".to_owned(),
            LifecycleBacklog {
                pending: 1,
                running_since: None,
            },
        );
        let status = lifecycle_status(&backlog, now);
        assert_eq!(status["pending"], 3);
        assert!(status["oldestMs"].as_u64().unwrap() >= 12_000);
        assert_eq!(
            lifecycle_status(&HashMap::new(), now),
            serde_json::json!({ "pending": 0, "oldestMs": 0 })
        );
    }

    #[test]
    fn stop_releases_only_tabs_whose_processes_are_verified_gone() {
        use ProcessState::{Gone, Live, Unknown, Unverifiable};
        let release = StopDisposition::Release;
        let holder_live = StopDisposition::Remain("holder-live");
        let child_live = StopDisposition::Remain("child-live");
        let unverifiable = StopDisposition::Remain("unverifiable");
        for (holder, child, expected) in [
            (Gone, Gone, release),
            (Gone, Unknown, release),
            (Unknown, Gone, release),
            (Unknown, Unknown, release),
            (Live, Gone, holder_live),
            (Live, Live, holder_live),
            (Live, Unverifiable, holder_live),
            (Gone, Live, child_live),
            (Unknown, Live, child_live),
            (Unverifiable, Live, child_live),
            (Unverifiable, Gone, unverifiable),
            (Gone, Unverifiable, unverifiable),
            (Unknown, Unverifiable, unverifiable),
        ] {
            assert_eq!(
                stop_disposition(holder, child),
                expected,
                "holder {holder:?}, child {child:?}"
            );
        }
    }

    #[test]
    fn a_missing_or_exited_identity_is_not_live() {
        assert_eq!(process_state(None), ProcessState::Unknown);
        let current = crate::identity::inspect_process(std::process::id())
            .unwrap()
            .unwrap();
        assert_eq!(process_state(Some(&current)), ProcessState::Live);
        let reused = ProcessIdentity {
            pid: current.pid,
            start: format!("{}-not-this-process", current.start),
        };
        assert_eq!(process_state(Some(&reused)), ProcessState::Gone);
    }
}
