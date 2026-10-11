use std::collections::HashMap;
use std::io::Write;
use std::path::Path;
use std::sync::{Arc, Mutex, mpsc};
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
    PasteStart, Resize, RoleHello, ServerLaunchConfig, Surface,
};
use crate::session_lock::SessionLock;

/// One non-blocking render slot per attached client. Replacing an unsent patch forces the
/// next delivery to be a full surface so no skipped revision can corrupt client state.
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
    attached: Option<String>,
    revision: u64,
}
impl AttachmentState {
    pub fn attach(&mut self, client_id: String) -> Result<u64, &'static str> {
        if self.attached.is_some() {
            return Err("a1 is attached in another terminal");
        }
        self.revision = self.revision.saturating_add(1);
        self.attached = Some(client_id);
        Ok(self.revision)
    }
    pub fn detach(&mut self, client_id: &str, revision: u64) -> bool {
        if self.attached.as_deref() != Some(client_id) || self.revision != revision {
            return false;
        }
        self.attached = None;
        self.revision = self.revision.saturating_add(1);
        true
    }
    pub fn current(&self) -> Option<(&str, u64)> {
        self.attached
            .as_deref()
            .map(|client| (client, self.revision))
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

#[derive(Clone)]
struct Peer {
    tx: mpsc::SyncSender<Vec<u8>>,
    surface: Arc<Mutex<Option<Vec<u8>>>>,
}
impl Peer {
    fn offer_surface(&self, frame: Vec<u8>) {
        if let Ok(mut slot) = self.surface.lock() {
            *slot = Some(frame);
        }
    }
}

struct RuntimeState {
    credentials: ProfileCredentials,
    registry: RegistryDocument,
    registry_store: RegistryStore,
    attachment: AttachmentState,
    attach: Option<Peer>,
    bridge: Option<Peer>,
    holder: Option<Peer>,
    surface: Option<Surface>,
    holder_starting: bool,
    last_activity: std::time::Instant,
}
impl RuntimeState {
    fn is_idle(&self) -> bool {
        self.attach.is_none()
            && self.bridge.is_none()
            && self.holder.is_none()
            && !self.holder_starting
            && self.last_activity.elapsed() >= std::time::Duration::from_secs(10 * 60)
    }
}

struct HeldAuthority;
impl RegistryAuthority for HeldAuthority {
    fn is_current(&self, _epoch: u64) -> bool {
        true
    }
}

pub fn run_server_child(profile: &Path, ready: &Path, context: &[u8]) -> Result<(), String> {
    let config: ServerLaunchConfig = serde_json::from_slice(context)
        .map_err(|error| format!("decode server context: {error}"))?;
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
    let _lease = SessionLock::acquire(&lease_path)
        .map_err(|error| format!("registry writer lease held: {error}"))?;
    let credentials = ProfileCredentials::load_or_create(&root)?;
    let system = crate::identity::current_system().map_err(|error| error.to_string())?;
    let existing = RegistryStore::read(&root.join("registry.json"))?;
    let epoch = existing
        .as_ref()
        .map_or(1, |document| document.epoch.saturating_add(1));
    let mut registry = existing.unwrap_or_else(|| RegistryDocument {
        registry_revision: 0,
        epoch,
        boot_id: system.boot.clone(),
        tabs: Vec::new(),
    });
    registry.epoch = epoch;
    if registry.boot_id != system.boot {
        registry.boot_id = system.boot;
        for tab in &mut registry.tabs {
            tab.lifecycle = "ended".into();
            tab.holder_pid = None;
            tab.holder_start_identity = None;
        }
    }
    let adopting_holder = registry.tabs.iter().any(|tab| {
        tab.lifecycle == "running"
            && tab
                .holder_pid
                .zip(tab.holder_start_identity.as_deref())
                .is_some_and(|(pid, start)| {
                    crate::identity::inspect_process(pid)
                        .ok()
                        .flatten()
                        .is_some_and(|identity| identity.start == start)
                })
    });
    if !adopting_holder {
        for tab in &mut registry.tabs {
            if tab.lifecycle == "running" {
                tab.lifecycle = "ended".into();
                tab.holder_pid = None;
                tab.holder_start_identity = None;
            }
        }
    }
    registry.registry_revision = registry.registry_revision.saturating_add(1);
    let registry_store =
        RegistryStore::new(root.join("registry.json"), epoch, Arc::new(HeldAuthority));
    registry_store.commit(&registry)?;
    if !config.endpoint.is_empty() {
        endpoint::remove_stale(&config.endpoint).map_err(|error| error.to_string())?;
    }
    let mut endpoint = if config.endpoint.is_empty() {
        OwnerEndpoint::bind(profile, Path::new(&config.runtime_dir))
            .map_err(|error| error.to_string())?
    } else {
        OwnerEndpoint::bind_name(config.endpoint.clone()).map_err(|error| error.to_string())?
    };
    std::fs::write(ready, format!("{}:server\n", std::process::id()))
        .map_err(|error| format!("write server readiness: {error}"))?;
    let state = Arc::new(Mutex::new(RuntimeState {
        credentials,
        registry,
        registry_store,
        attachment: AttachmentState::default(),
        attach: None,
        bridge: None,
        holder: None,
        surface: None,
        holder_starting: adopting_holder,
        last_activity: std::time::Instant::now(),
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
            "attach" | "probe" => locked.credentials.client_token.to_vec(),
            "holder" => locked
                .credentials
                .derive("holder", hello.tab_id.as_deref().unwrap_or(""), 1)
                .to_vec(),
            "bridge" => locked
                .credentials
                .derive("bridge", hello.tab_id.as_deref().unwrap_or(""), 1)
                .to_vec(),
            _ => return Err("unapproved resident peer role".to_owned()),
        }
    };
    if hello.token != expected {
        return Err("resident credential rejected".to_owned());
    }
    if hello.role == "holder" {
        let locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        if !locked.holder_starting {
            let record = locked
                .registry
                .tabs
                .iter()
                .find(|tab| Some(tab.tab_id.as_str()) == hello.tab_id.as_deref())
                .ok_or_else(|| "holder has no registry record".to_owned())?;
            let pid = hello
                .pid
                .ok_or_else(|| "holder did not present a pid".to_owned())?;
            let observed = crate::identity::inspect_process(pid)
                .map_err(|error| error.to_string())?
                .ok_or_else(|| "holder process is not live".to_owned())?;
            if record.holder_pid != Some(pid)
                || record.holder_start_identity.as_deref() != Some(observed.start.as_str())
            {
                return Err("holder identity does not match the registry".to_owned());
            }
        }
    }
    if hello.role == "probe" {
        return wire::send(&mut stream, "welcome", request_id, welcome());
    }
    let writer = stream
        .try_clone()
        .map_err(|error| format!("clone resident stream: {error}"))?;
    let (tx, rx) = mpsc::sync_channel::<Vec<u8>>(8);
    let surface = Arc::new(Mutex::new(None));
    thread::spawn({
        let surface = surface.clone();
        move || writer_loop(writer, rx, surface)
    });
    let peer = Peer { tx, surface };
    peer.tx
        .send(wire::frame("welcome", request_id, welcome())?)
        .map_err(|_| "resident writer stopped".to_owned())?;
    match hello.role.as_str() {
        "attach" => serve_attach(stream, peer, state, profile),
        "holder" => serve_holder(stream, peer, state),
        "bridge" => serve_bridge(stream, peer, state),
        _ => unreachable!(),
    }
}

fn welcome() -> Welcome {
    Welcome {
        generation: protocol::GENERATION,
        build: "a1-terminal-host".into(),
        features: vec!["resident-one-tab".into()],
        frame_limit: protocol::MAX_FRAME_BYTES as u32,
        input_limit: protocol::MAX_INPUT_BYTES as u32,
    }
}

fn writer_loop(
    mut stream: endpoint::EndpointStream,
    rx: mpsc::Receiver<Vec<u8>>,
    surface: Arc<Mutex<Option<Vec<u8>>>>,
) {
    loop {
        match rx.recv_timeout(std::time::Duration::from_millis(8)) {
            Ok(frame)
                if stream
                    .write_all(&frame)
                    .and_then(|()| stream.flush())
                    .is_err() =>
            {
                break;
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

fn serve_attach(
    mut stream: endpoint::EndpointStream,
    tx: Peer,
    state: Arc<Mutex<RuntimeState>>,
    profile: std::path::PathBuf,
) -> Result<(), String> {
    let client_id = format!("client-{:016x}", rand::random::<u64>());
    let revision = {
        let mut locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        let revision = match locked.attachment.attach(client_id.clone()) {
            Ok(value) => value,
            Err(message) => {
                let _ = tx.tx.send(wire::frame(
                    "refused",
                    None,
                    wire::ResultBody {
                        accepted: false,
                        message: Some(message.into()),
                    },
                )?);
                return Err(message.into());
            }
        };
        locked.attach = Some(tx.clone());
        if let Some(surface) = locked.surface.clone() {
            tx.offer_surface(wire::frame("surface", None, surface)?);
        }
        if let Some(bridge) = &locked.bridge {
            let _ = bridge.tx.try_send(wire::frame(
                "attachment",
                None,
                BridgeAttachment {
                    client_id: client_id.clone(),
                    controller_revision: revision,
                },
            )?);
        }
        revision
    };
    tx.tx
        .send(wire::frame(
            "attached",
            None,
            BridgeAttachment {
                client_id: client_id.clone(),
                controller_revision: revision,
            },
        )?)
        .map_err(|_| "attach writer stopped".to_owned())?;
    while let Some(payload) = wire::read_payload(&mut stream)? {
        let kind = wire::kind(&payload)?;
        match kind.message_type.as_str() {
            "attach.start" => {
                let (_, start): (_, AttachStart) = wire::body(&payload)?;
                let should_start = {
                    let mut locked = state
                        .lock()
                        .map_err(|_| "resident state poisoned".to_owned())?;
                    if locked.holder.is_none() && !locked.holder_starting {
                        locked.holder_starting = true;
                        true
                    } else {
                        false
                    }
                };
                if should_start {
                    if let Err(error) = start_holder(&profile, &state, start) {
                        state
                            .lock()
                            .map_err(|_| "resident state poisoned".to_owned())?
                            .holder_starting = false;
                        let _ = tx.tx.send(wire::frame(
                            "error",
                            None,
                            wire::ResultBody {
                                accepted: false,
                                message: Some(error.clone()),
                            },
                        )?);
                        return Err(error);
                    }
                }
            }
            "paste.start" => {
                let (_, paste): (_, PasteStart) = wire::body(&payload)?;
                let holder = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?
                    .holder
                    .clone();
                if let Some(holder) = holder {
                    holder
                        .tx
                        .send(wire::frame("paste.start", kind.request_id, paste)?)
                        .map_err(|_| "holder input lane stopped".to_owned())?;
                }
            }
            "input" => {
                let (_, input): (_, Input) = wire::body(&payload)?;
                let holder = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?
                    .holder
                    .clone();
                if let Some(holder) = holder {
                    let _ = holder
                        .tx
                        .send(wire::frame("input", kind.request_id, input)?);
                }
            }
            "resize" => {
                let (_, resize): (_, Resize) = wire::body(&payload)?;
                let holder = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?
                    .holder
                    .clone();
                if let Some(holder) = holder {
                    let _ = holder
                        .tx
                        .try_send(wire::frame("resize", kind.request_id, resize)?);
                }
            }
            "detach" => break,
            _ => {}
        }
    }
    let mut locked = state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?;
    locked.attachment.detach(&client_id, revision);
    locked.attach = None;
    locked.last_activity = std::time::Instant::now();
    if let Some(bridge) = &locked.bridge {
        let _ = bridge.tx.try_send(wire::frame(
            "attachment",
            None,
            BridgeAttachment {
                client_id: String::new(),
                controller_revision: revision.saturating_add(1),
            },
        )?);
    }
    Ok(())
}

fn start_holder(
    profile: &Path,
    state: &Arc<Mutex<RuntimeState>>,
    mut start: AttachStart,
) -> Result<(), String> {
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
    start
        .environment
        .retain(|(name, _)| !STRIP.contains(&name.as_str()));
    let (endpoint, holder_token, bridge_token) = {
        let locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        let endpoint = start
            .environment
            .iter()
            .find(|(name, _)| name == "A1_TABS_ENDPOINT")
            .map(|(_, value)| value.clone());
        let endpoint = endpoint.unwrap_or_else(|| default_endpoint(profile, &start.environment));
        (
            endpoint,
            locked.credentials.derive("holder", "tab-1", 1).to_vec(),
            locked.credentials.derive("bridge", "tab-1", 1).to_vec(),
        )
    };
    {
        let mut locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();
        locked.registry.tabs.retain(|tab| tab.tab_id != "tab-1");
        locked.registry.tabs.push(TabRecord {
            tab_id: "tab-1".into(),
            kind: "a1".into(),
            created_at,
            display_name: "agent".into(),
            name_source: "default".into(),
            order: 0,
            cwd: start.cwd.clone(),
            session_file: None,
            session_dir: None,
            desired: "running".into(),
            lifecycle: "starting".into(),
            incarnation: 1,
            holder_pid: None,
            holder_start_identity: None,
            release: start.release_root.clone(),
            last_exit: None,
        });
        locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
        locked.registry_store.commit(&locked.registry)?;
    }
    let context = HolderLaunchConfig {
        endpoint,
        tab_id: "tab-1".into(),
        incarnation: 1,
        token: holder_token,
        bridge_token,
        cwd: start.cwd,
        columns: start.columns,
        rows: start.rows,
        release_root: start.release_root,
        node_executable: start.node_executable,
        environment: start.environment,
    };
    let (_, observation) =
        launch::launch_resident_with_config(ResidentRole::Holder, profile, &context)
            .map_err(|error| error.to_string())?;
    let mut locked = state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?;
    if let Some(record) = locked
        .registry
        .tabs
        .iter_mut()
        .find(|tab| tab.tab_id == "tab-1")
    {
        record.holder_pid = Some(observation.process.pid);
        record.holder_start_identity = Some(observation.process.start);
        record.lifecycle = "running".into();
    }
    locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
    locked.registry_store.commit(&locked.registry)
}

fn default_endpoint(profile: &Path, environment: &[(String, String)]) -> String {
    let runtime = environment
        .iter()
        .find(|(name, _)| name == "A1_RUNTIME_DIR")
        .map(|(_, value)| value.as_str())
        .unwrap_or(".");
    let token = crate::endpoint::endpoint_token(profile).unwrap_or_else(|_| "invalid".into());
    if cfg!(windows) {
        format!(r"\\.\pipe\a1-tabs-{token}")
    } else {
        Path::new(runtime)
            .join(format!("a1-tabs-{token}.sock"))
            .to_string_lossy()
            .into_owned()
    }
}

fn serve_holder(
    mut stream: endpoint::EndpointStream,
    tx: Peer,
    state: Arc<Mutex<RuntimeState>>,
) -> Result<(), String> {
    {
        let mut locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        locked.holder = Some(tx);
        locked.holder_starting = false;
        locked.last_activity = std::time::Instant::now();
    }
    let mut last_exit = None;
    while let Some(payload) = wire::read_payload(&mut stream)? {
        let kind = wire::kind(&payload)?;
        match kind.message_type.as_str() {
            "surface" => {
                let (_, surface): (_, Surface) = wire::body(&payload)?;
                let mut locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                locked.surface = Some(surface.clone());
                if let Some(attach) = &locked.attach {
                    attach.offer_surface(wire::frame("surface", None, surface)?);
                }
            }
            "holder.exit" => {
                let (_, exit): (_, HolderExit) = wire::body(&payload)?;
                last_exit = Some(exit.signal.clone().unwrap_or_else(|| {
                    exit.code
                        .map_or_else(|| "ended".into(), |code| format!("exit {code}"))
                }));
                let locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                if let Some(attach) = &locked.attach {
                    let _ = attach.tx.try_send(wire::frame("holder.exit", None, exit)?);
                }
                break;
            }
            _ => {}
        }
    }
    let mut locked = state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?;
    locked.holder = None;
    locked.surface = None;
    locked.last_activity = std::time::Instant::now();
    if let Some(record) = locked
        .registry
        .tabs
        .iter_mut()
        .find(|tab| tab.tab_id == "tab-1")
    {
        record.lifecycle = "ended".into();
        record.holder_pid = None;
        record.holder_start_identity = None;
        record.last_exit = last_exit;
    }
    locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
    let document = locked.registry.clone();
    locked.registry_store.commit(&document)
}

fn serve_bridge(
    mut stream: endpoint::EndpointStream,
    tx: Peer,
    state: Arc<Mutex<RuntimeState>>,
) -> Result<(), String> {
    {
        let mut locked = state
            .lock()
            .map_err(|_| "resident state poisoned".to_owned())?;
        locked.bridge = Some(tx.clone());
        if let Some((client, revision)) = locked.attachment.current() {
            tx.tx
                .send(wire::frame(
                    "attachment",
                    None,
                    BridgeAttachment {
                        client_id: client.into(),
                        controller_revision: revision,
                    },
                )?)
                .map_err(|_| "bridge writer stopped".to_owned())?;
        }
    }
    while let Some(payload) = wire::read_payload(&mut stream)? {
        let kind = wire::kind(&payload)?;
        if kind.message_type == "bridge.status" {
            let (_, status): (_, BridgeStatus) = wire::body(&payload)?;
            let mut locked = state
                .lock()
                .map_err(|_| "resident state poisoned".to_owned())?;
            if let Some(surface) = locked.surface.as_mut() {
                surface.status = status.state;
            }
            if let (Some(attach), Some(surface)) = (&locked.attach, locked.surface.clone()) {
                attach.offer_surface(wire::frame("surface", None, surface)?);
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
                .find(|tab| tab.tab_id == "tab-1")
            {
                record.session_file = session.file.clone();
                record.session_dir = session
                    .file
                    .as_deref()
                    .and_then(|file| Path::new(file).parent())
                    .map(|path| path.to_string_lossy().into_owned());
                if let Some(name) = session.name {
                    record.display_name = name;
                    record.name_source = "agent".into();
                }
            }
            locked.registry.registry_revision = locked.registry.registry_revision.saturating_add(1);
            let document = locked.registry.clone();
            locked.registry_store.commit(&document)?;
        } else if kind.message_type == "bridge.request" {
            let (_, request): (_, BridgeRequest) = wire::body(&payload)?;
            let accepted = if request.action == "detach" {
                let locked = state
                    .lock()
                    .map_err(|_| "resident state poisoned".to_owned())?;
                if locked.attachment.current()
                    == Some((request.client_id.as_str(), request.controller_revision))
                {
                    if let Some(attach) = &locked.attach {
                        let _ = attach.tx.try_send(wire::frame(
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
            } else {
                false
            };
            tx.tx
                .send(wire::frame(
                    "bridge.result",
                    kind.request_id,
                    wire::ResultBody {
                        accepted,
                        message: None,
                    },
                )?)
                .map_err(|_| "bridge writer stopped".to_owned())?;
        }
    }
    let mut locked = state
        .lock()
        .map_err(|_| "resident state poisoned".to_owned())?;
    locked.bridge = None;
    locked.last_activity = std::time::Instant::now();
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
    fn second_client_is_refused_and_stale_detach_does_nothing() {
        let mut state = AttachmentState::default();
        let revision = state.attach("one".into()).unwrap();
        assert_eq!(
            state.attach("two".into()),
            Err("a1 is attached in another terminal")
        );
        assert!(!state.detach("one", revision + 1));
        assert!(state.detach("one", revision));
    }
}
