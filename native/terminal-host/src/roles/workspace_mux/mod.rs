//! Replaceable client federation; source runtimes retain execution, input journals and writer leases.

use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{
    Arc,
    atomic::{AtomicBool, AtomicUsize, Ordering},
    mpsc,
};
use std::thread;
use std::time::{Duration, Instant};

use super::workspace::{SourceIdentity, WorkspaceDocument, WorkspaceStore, WorkspaceTab};
use super::workspace_value::Value;
use super::{
    attach::{AttachOptions, AttachServerWriter},
    credentials::ProfileCredentials,
    scope,
    source_route::{self, SourceRoute},
    wire,
};
use crate::{endpoint, protocol};

mod connection;
mod persistence;
mod routing;
mod topology;
mod view;

pub use persistence::check;
const INGRESS_BYTES: usize = 4 * 1024 * 1024;
const MAX_SOURCES: usize = 64;
type Envelope = protocol::Envelope<Value>;
struct Source {
    route: Arc<SourceRoute>,
    writer: AttachServerWriter,
    control: Option<endpoint::EndpointStream>,
    guard: Option<endpoint::ConnectionGuard>,
    tabs: Vec<wire::TabSummary>,
    raw_ids: HashMap<String, String>,
    sessions: HashMap<String, String>,
    created: HashSet<String>,
    generation: u64,
    reconnecting: bool,
    connected: bool,
    revision: u64,
    statuses: Vec<wire::TabStatus>,
    legacy_notice: bool,
}
struct SourceSnapshot {
    raw_ids: HashMap<String, String>,
    sessions: HashMap<String, String>,
    statuses: Vec<wire::TabStatus>,
}
enum Event {
    Client(Vec<u8>),
    Source(usize, u64, Vec<u8>),
    Failed(Option<(usize, u64)>),
    Connected(
        usize,
        Arc<SourceRoute>,
        endpoint::EndpointStream,
        SourceSnapshot,
    ),
    RecoveryBlocked(usize),
    NewSources(Result<Vec<(Arc<SourceRoute>, endpoint::EndpointStream, SourceSnapshot)>, String>),
    Metadata(Result<WorkspaceDocument, String>, Option<u64>),
}
struct Persistence {
    selected: Option<String>,
    order: Vec<String>,
    routes: Vec<Arc<SourceRoute>>,
    view: Option<u64>,
}
struct Paths {
    profile: PathBuf,
    data: PathBuf,
    root: PathBuf,
}
struct Model {
    layout: WorkspaceDocument,
    revision: u64,
    order: Vec<String>,
    viewed: Option<String>,
    utilities: HashMap<crate::core::tab_bar::TabKind, String>,
}
struct Routing {
    local: usize,
    active: usize,
    admitted: bool,
    signal: Arc<AtomicUsize>,
    views: HashMap<usize, Envelope>,
    resizes: HashMap<usize, Envelope>,
}
struct Workers {
    tx: mpsc::SyncSender<Event>,
    budget: Arc<AtomicUsize>,
    save: mpsc::SyncSender<Persistence>,
    stop: Arc<AtomicBool>,
}
struct Context {
    paths: Paths,
    sources: Vec<Source>,
    model: Model,
    routing: Routing,
    workers: Workers,
    output: AttachServerWriter,
    pending: Option<view::Pending>,
    view_ticket: u64,
    creations: topology::Creations,
    discovering: bool,
    last_discovery: Instant,
}
pub struct Proxy {
    pub endpoint: String,
    stop: Arc<AtomicBool>,
}
impl Drop for Proxy {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Release);
    }
}

pub fn start(options: &AttachOptions<'_>) -> Result<Proxy, String> {
    start_at(
        options.profile,
        options.data_dir,
        options.runtime_dir,
        Path::new(options.release_root),
    )
}
pub fn start_at(
    profile: &Path,
    data: &Path,
    runtime: &Path,
    release: &Path,
) -> Result<Proxy, String> {
    #[cfg(windows)]
    let _ = runtime;
    #[cfg(windows)]
    let address = format!(
        r"\\.\pipe\a1-workspace-{}-{:016x}",
        std::process::id(),
        rand::random::<u64>()
    );
    #[cfg(unix)]
    let address = runtime
        .join(format!("a1-w-{:016x}.sock", rand::random::<u64>()))
        .to_string_lossy()
        .into_owned();
    let mut listener =
        endpoint::OwnerEndpoint::bind_name(address.clone()).map_err(|error| error.to_string())?;
    let paths = Paths {
        profile: profile.into(),
        data: data.into(),
        root: release.into(),
    };
    let stop = Arc::new(AtomicBool::new(false));
    let stopped = stop.clone();
    thread::spawn(move || {
        if let Ok(stream) = listener.accept() {
            let _ = serve(stream, paths, stopped);
        }
    });
    Ok(Proxy {
        endpoint: address,
        stop,
    })
}
pub fn run(options: AttachOptions<'_>) -> Result<(), String> {
    let proxy = start(&options)?;
    super::attach::run_attach(AttachOptions {
        endpoint: &proxy.endpoint,
        ..options
    })
}
fn admit(stream: &mut endpoint::EndpointStream, paths: &Paths) -> Result<String, String> {
    let own = scope::release_id()?;
    let state = paths.data.join("tabs").join(scope::token(&paths.profile)?);
    let credentials =
        ProfileCredentials::load_existing(&state)?.ok_or("workspace client credentials absent")?;
    endpoint::set_handshake_deadline(stream, Duration::from_secs(5))
        .map_err(|_| "workspace handshake deadline")?;
    let payload = wire::read_payload(stream)?.ok_or("workspace client closed")?;
    let (_, hello): (_, wire::RoleHello) = wire::body(&payload)?;
    if hello.role != "attach"
        || hello.release_id != own
        || hello.token != credentials.client_token
        || hello.generation != protocol::GENERATION
    {
        return Err("workspace client admission refused".into());
    }
    Ok(own)
}
fn initial_sources(
    routes: Vec<Arc<SourceRoute>>,
    layout: &WorkspaceDocument,
    tx: &mpsc::SyncSender<Event>,
    budget: &Arc<AtomicUsize>,
    signal: &Arc<AtomicUsize>,
) -> Result<(Vec<Source>, Vec<String>), String> {
    let mut sources = Vec::new();
    let mut features: Option<Vec<String>> = None;
    let deadline = Instant::now() + Duration::from_secs(5);
    for (index, route) in routes.into_iter().enumerate() {
        let selected = layout
            .tabs
            .iter()
            .find(|tab| {
                Some(&tab.id) == layout.selected.as_ref()
                    && tab.source_scope == route.source_scope()
            })
            .map(|tab| tab.source_tab.as_str());
        let (stream, welcome, admission) = route.attach(
            selected,
            deadline
                .saturating_duration_since(Instant::now())
                .max(Duration::from_millis(1)),
        )?;
        features
            .get_or_insert_with(|| welcome.features.clone())
            .retain(|feature| welcome.features.contains(feature));
        let revision = admission
            .initial_tabs
            .as_ref()
            .map_or(0, |list| list.revision);
        let tabs = admission
            .initial_tabs
            .map(|list| {
                list.tabs
                    .into_iter()
                    .map(|tab| wire::TabSummary {
                        tab_id: WorkspaceTab::id_for(route.source_scope(), &tab.tab_id),
                        name: tab.name,
                        name_source: tab.name_source,
                        lifecycle: tab.lifecycle,
                        cwd: tab.cwd,
                    })
                    .collect()
            })
            .unwrap_or_default();
        let snapshot = connection::snapshot(&route)?;
        let mut source = connection::source(route, stream, index, 1, tx, budget, signal, snapshot)?;
        source.tabs = tabs;
        source.revision = revision;
        source.legacy_notice = !protocol::negotiated(&welcome.features, "client-identity");
        sources.push(source);
    }
    Ok((sources, features.unwrap_or_default()))
}
fn announce(
    stream: &mut endpoint::EndpointStream,
    sources: &[Source],
    layout: &WorkspaceDocument,
    viewed: &Option<String>,
    own: String,
    features: Vec<String>,
) -> Result<Vec<String>, String> {
    wire::send(
        stream,
        "welcome",
        Some(1),
        protocol::Welcome {
            generation: protocol::GENERATION,
            build: "workspace-client".into(),
            release_id: own,
            features,
            frame_limit: protocol::MAX_FRAME_BYTES as u32,
            input_limit: protocol::MAX_INPUT_BYTES as u32,
            epoch: layout.epoch,
        },
    )?;
    let mut tabs = routing::aggregate(sources, layout, layout.revision).tabs;
    routing::singletons(&mut tabs, viewed.as_deref(), &HashMap::new());
    let order = tabs.iter().map(|tab| tab.tab_id.clone()).collect();
    wire::send(
        stream,
        "attached",
        None,
        protocol::BridgeAttachment {
            client_id: format!("workspace-{:016x}", rand::random::<u64>()),
            controller_revision: 0,
            selected_tab: viewed.clone(),
            initial_tabs: Some(protocol::InitialTabs {
                revision: layout.revision,
                tabs: tabs
                    .into_iter()
                    .map(|tab| protocol::InitialTab {
                        tab_id: tab.tab_id,
                        name: tab.name,
                        name_source: tab.name_source,
                        lifecycle: tab.lifecycle,
                        cwd: tab.cwd,
                    })
                    .collect(),
            }),
        },
    )?;
    Ok(order)
}

fn serve(
    mut stream: endpoint::EndpointStream,
    paths: Paths,
    stop: Arc<AtomicBool>,
) -> Result<(), String> {
    let own = admit(&mut stream, &paths)?;
    let routes = connection::discover_ready(&paths)?
        .into_iter()
        .map(Arc::new)
        .collect::<Vec<_>>();
    if routes.len() > MAX_SOURCES {
        return Err("workspace source capacity exceeded".into());
    }
    let local = routes
        .iter()
        .position(|route| route.release_id() == own)
        .ok_or("selected execution source is absent")?;
    for route in &routes {
        route.compatible()?;
    }
    let layout = persistence::startup(&paths.profile, &paths.data, routes.clone())?;
    let (tx, rx) = mpsc::sync_channel(1024);
    let budget = Arc::new(AtomicUsize::new(0));
    let selected_source = layout
        .tabs
        .iter()
        .find(|tab| Some(&tab.id) == layout.selected.as_ref())
        .and_then(|tab| {
            routes
                .iter()
                .position(|route| route.source_scope() == tab.source_scope)
        })
        .unwrap_or(local);
    let signal = Arc::new(AtomicUsize::new(selected_source));
    let (sources, mut features) = initial_sources(routes, &layout, &tx, &budget, &signal)?;
    features.push("resident-workspace-v1".into());
    let viewed = layout
        .selected
        .clone()
        .filter(|id| routing::target(&sources, id).is_some());
    let active = viewed
        .as_deref()
        .and_then(|id| routing::target(&sources, id))
        .map_or(local, |target| target.0);
    signal.store(active, Ordering::Release);
    let order = announce(&mut stream, &sources, &layout, &viewed, own, features)?;
    let revision = layout.revision;
    endpoint::clear_handshake_deadline(&stream).map_err(|_| "clear workspace deadline")?;
    connection::reader(
        stream.try_clone().map_err(|_| "clone workspace reader")?,
        None,
        tx.clone(),
        budget.clone(),
        signal.clone(),
    );
    let save = persistence::worker(&paths, tx.clone(), stop.clone());
    let mut context = Context {
        paths,
        sources,
        model: Model {
            layout,
            revision,
            order,
            viewed,
            utilities: HashMap::new(),
        },
        routing: Routing {
            local,
            active,
            admitted: true,
            signal,
            views: HashMap::new(),
            resizes: HashMap::new(),
        },
        workers: Workers {
            tx,
            budget,
            save,
            stop,
        },
        output: AttachServerWriter::start(stream),
        pending: None,
        view_ticket: 0,
        creations: topology::Creations::default(),
        discovering: false,
        last_discovery: Instant::now(),
    };
    context.initial_statuses()?;
    let result = context.run(rx);
    context.workers.stop.store(true, Ordering::Release);
    for source in &mut context.sources {
        let _ = wire::send(&mut source.writer, "detach", None, wire::ResultBody::ok());
    }
    result
}
impl Drop for Context {
    fn drop(&mut self) {
        self.workers.stop.store(true, Ordering::Release);
    }
}
impl Context {
    fn initial_statuses(&mut self) -> Result<(), String> {
        #[derive(serde::Serialize)]
        struct Batch {
            statuses: Vec<wire::TabStatus>,
        }
        let statuses = self
            .sources
            .iter()
            .flat_map(|source| source.statuses.clone())
            .collect();
        wire::send(
            &mut self.output,
            "workspace.status",
            None,
            Batch { statuses },
        )?;
        if self.sources.iter().any(|source| source.legacy_notice) {
            if let Some(version) = super::client_identity::version() {
                wire::send(
                    &mut self.output,
                    "viewer.status",
                    None,
                    wire::ResultBody {
                        accepted: true,
                        message: Some(format!(
                            "Client {version} connected. Retained Agent UI notices do not require restarting Agents."
                        )),
                    },
                )?;
            }
        }
        Ok(())
    }
    fn run(&mut self, rx: mpsc::Receiver<Event>) -> Result<(), String> {
        while !self.workers.stop.load(Ordering::Acquire) && self.output.failure().is_none() {
            let event = match rx.recv_timeout(Duration::from_millis(50)) {
                Ok(event) => event,
                Err(mpsc::RecvTimeoutError::Timeout) => continue,
                Err(_) => break,
            };
            match event {
                Event::Failed(None) => break,
                Event::Failed(Some((index, generation))) => {
                    self.source_failed(index, generation)?
                }
                Event::RecoveryBlocked(index) => {
                    self.sources[index].reconnecting = false;
                    self.notice(
                        "Source recovery is blocked; state is preserved. Reopen to retry.",
                    )?;
                }
                Event::Connected(index, route, connection, snapshot) => {
                    self.reconnected(index, route, connection, snapshot)?
                }
                Event::NewSources(result) => self.new_sources(result)?,
                Event::Metadata(result, view) => self.metadata(result, view)?,
                Event::Source(index, generation, payload) => {
                    self.workers
                        .budget
                        .fetch_sub(payload.len(), Ordering::SeqCst);
                    self.source_message(index, generation, payload)?;
                }
                Event::Client(payload) => {
                    self.workers
                        .budget
                        .fetch_sub(payload.len(), Ordering::SeqCst);
                    if !self.client_message(payload)? {
                        break;
                    }
                }
            }
        }
        Ok(())
    }
    fn notice(&mut self, message: &str) -> Result<(), String> {
        wire::send(
            &mut self.output,
            "recovery.notice",
            None,
            wire::ResultBody::refused(message.into()),
        )
    }
    fn refused(&mut self, message: &str) -> Result<(), String> {
        wire::send(
            &mut self.output,
            "input.rejected",
            None,
            wire::ResultBody::refused(message.into()),
        )
    }
    fn uncertain(&mut self, request: Option<u64>) -> Result<(), String> {
        wire::send(
            &mut self.output,
            "input.uncertain",
            request,
            wire::ResultBody::refused(
                "Source delivery is uncertain; input was not replayed. Execution remains resident."
                    .into(),
            ),
        )
    }
    fn save(
        &mut self,
        selected: Option<String>,
        order: Vec<String>,
        route: Option<usize>,
        view: Option<u64>,
    ) -> Result<bool, String> {
        let update = Persistence {
            selected,
            order,
            routes: route
                .map(|index| vec![self.sources[index].route.clone()])
                .unwrap_or_default(),
            view,
        };
        if self.workers.save.try_send(update).is_ok() {
            Ok(true)
        } else {
            self.notice("Workspace persistence is busy; execution is unchanged.")?;
            Ok(false)
        }
    }
}
fn send_value(writer: &mut impl Write, envelope: &Envelope) -> Result<(), String> {
    wire::send(
        writer,
        &envelope.message_type,
        envelope.request_id,
        &envelope.body,
    )
}
