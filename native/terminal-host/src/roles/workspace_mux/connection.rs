//! Transport workers never supervise execution or retry a mutating command.
use super::*;

impl Source {
    pub(super) fn disconnect(&mut self) {
        let _ = wire::send(&mut self.writer, "detach", None, wire::ResultBody::ok());
        #[cfg(unix)]
        if let Some(control) = &self.control {
            let _ = control.shutdown(std::net::Shutdown::Both);
        }
        self.guard.take();
        self.control.take();
        self.connected = false;
    }
}
impl Drop for Source {
    fn drop(&mut self) {
        self.disconnect();
    }
}

pub(super) fn discover_ready(paths: &Paths) -> Result<Vec<SourceRoute>, String> {
    let deadline = Instant::now() + Duration::from_secs(15);
    loop {
        match source_route::discover(&paths.profile, &paths.data, &paths.root) {
            Err(error) if error.contains("recovering") && Instant::now() < deadline => {
                thread::sleep(Duration::from_millis(100))
            }
            result => return result,
        }
    }
}
pub(super) fn snapshot(route: &SourceRoute) -> Result<SourceSnapshot, String> {
    let registry = route.registry()?;
    let raw_ids = registry
        .tabs
        .iter()
        .filter(|tab| tab.desired != "stopped")
        .map(|tab| {
            (
                WorkspaceTab::id_for(route.source_scope(), &tab.tab_id),
                tab.tab_id.clone(),
            )
        })
        .collect();
    let sessions = registry
        .tabs
        .into_iter()
        .filter(|tab| tab.desired != "stopped")
        .filter_map(|tab| tab.session_file.map(|file| (file, tab.tab_id)))
        .collect();
    Ok(SourceSnapshot {
        raw_ids,
        sessions,
        statuses: statuses(route)?,
    })
}
pub(super) fn source(
    route: Arc<SourceRoute>,
    stream: endpoint::EndpointStream,
    index: usize,
    generation: u64,
    tx: &mpsc::SyncSender<Event>,
    budget: &Arc<AtomicUsize>,
    signal: &Arc<AtomicUsize>,
    snapshot: SourceSnapshot,
) -> Result<Source, String> {
    let SourceSnapshot {
        raw_ids,
        sessions,
        statuses,
    } = snapshot;
    let control = stream.try_clone().map_err(|_| "clone source control")?;
    let guard = endpoint::close_on_drop(&control);
    reader(
        stream.try_clone().map_err(|_| "clone source reader")?,
        Some((index, generation)),
        tx.clone(),
        budget.clone(),
        signal.clone(),
    );
    Ok(Source {
        route,
        writer: AttachServerWriter::start(stream),
        control: Some(control),
        guard: Some(guard),
        tabs: vec![],
        raw_ids,
        sessions,
        created: HashSet::new(),
        generation,
        reconnecting: false,
        connected: true,
        revision: 0,
        statuses,
        legacy_notice: false,
    })
}
fn statuses(route: &SourceRoute) -> Result<Vec<wire::TabStatus>, String> {
    let report = route.read(source_route::SourceRead::Tabs, Duration::from_secs(4))?;
    let tabs = report
        .get("tabs")
        .and_then(serde_json::Value::as_array)
        .ok_or("source status snapshot is invalid")?;
    if tabs.len() > 4096 {
        return Err("source status snapshot bound exceeded".into());
    }
    tabs.iter()
        .map(|tab| {
            let id = tab
                .get("tabId")
                .and_then(serde_json::Value::as_str)
                .ok_or("source status identity is invalid")?;
            let status = tab
                .get("status")
                .and_then(serde_json::Value::as_str)
                .ok_or("source status is invalid")?;
            Ok(wire::TabStatus {
                tab_id: WorkspaceTab::id_for(route.source_scope(), id),
                status: status.into(),
                accent: None,
            })
        })
        .collect()
}
pub(super) fn reader(
    mut stream: endpoint::EndpointStream,
    source: Option<(usize, u64)>,
    tx: mpsc::SyncSender<Event>,
    budget: Arc<AtomicUsize>,
    active: Arc<AtomicUsize>,
) {
    thread::spawn(move || {
        loop {
            let mut payload = match wire::read_payload(&mut stream) {
                Ok(Some(value)) => value,
                _ => {
                    let _ = tx.send(Event::Failed(source));
                    break;
                }
            };
            if source.is_some_and(|(index, _)| index != active.load(Ordering::Acquire))
                && wire::kind(&payload).is_ok_and(|kind| kind.message_type == "surface")
            {
                #[derive(serde::Deserialize)]
                #[serde(rename_all = "camelCase")]
                struct Status {
                    tab_id: String,
                    status: String,
                    accent: Option<String>,
                }
                if let Ok((_, status)) = wire::body::<Status>(&payload) {
                    let frame = wire::frame(
                        "tab.status",
                        None,
                        wire::TabStatus {
                            tab_id: status.tab_id,
                            status: status.status,
                            accent: status.accent,
                        },
                    )
                    .unwrap_or_default();
                    if frame.len() < 4 {
                        continue;
                    }
                    payload = frame[4..].to_vec();
                } else {
                    let _ = tx.send(Event::Failed(source));
                    break;
                }
            }
            if budget
                .try_update(Ordering::SeqCst, Ordering::SeqCst, |size| {
                    size.checked_add(payload.len())
                        .filter(|size| *size <= INGRESS_BYTES)
                })
                .is_err()
            {
                let _ = tx.send(Event::Failed(source));
                break;
            }
            let size = payload.len();
            let event = match source {
                Some((index, generation)) => Event::Source(index, generation, payload),
                None => Event::Client(payload),
            };
            if tx.send(event).is_err() {
                budget.fetch_sub(size, Ordering::SeqCst);
                break;
            }
        }
    });
}
impl Context {
    pub(super) fn source_failed(&mut self, index: usize, generation: u64) -> Result<(), String> {
        if self.sources[index].generation != generation || self.sources[index].reconnecting {
            return Ok(());
        }
        self.sources[index].connected = false;
        if self.sources[index].tabs.is_empty() && index != self.routing.local {
            return Ok(());
        }
        self.sources[index].reconnecting = true;
        if index == self.routing.active {
            self.pending = None;
            self.routing.admitted = false;
            self.uncertain(None)?;
        }
        let route = self.sources[index].route.clone();
        let profile = self.paths.profile.clone();
        let data = self.paths.data.clone();
        let tx = self.workers.tx.clone();
        let stop = self.workers.stop.clone();
        let selected = self
            .model
            .viewed
            .as_deref()
            .and_then(|id| self.sources[index].raw_ids.get(id))
            .cloned();
        thread::spawn(move || {
            let deadline = Instant::now() + Duration::from_secs(15);
            while Instant::now() < deadline && !stop.load(Ordering::Acquire) {
                if let Ok(route) = route.reopen(&profile, &data)
                    && route.compatible().is_ok()
                    && let Ok(snapshot) = snapshot(&route)
                    && let Ok((stream, _, _)) =
                        route.attach(selected.as_deref(), Duration::from_secs(4))
                {
                    let _ = tx.send(Event::Connected(index, Arc::new(route), stream, snapshot));
                    return;
                }
                thread::sleep(Duration::from_millis(250));
            }
            let _ = tx.send(Event::RecoveryBlocked(index));
        });
        Ok(())
    }
    pub(super) fn reconnected(
        &mut self,
        index: usize,
        route: Arc<SourceRoute>,
        stream: endpoint::EndpointStream,
        snapshot: SourceSnapshot,
    ) -> Result<(), String> {
        let generation = self.sources[index]
            .generation
            .checked_add(1)
            .ok_or("source generation exhausted")?;
        let mut recovered = source(
            route,
            stream,
            index,
            generation,
            &self.workers.tx,
            &self.workers.budget,
            &self.routing.signal,
            snapshot,
        )?;
        recovered.tabs = std::mem::take(&mut self.sources[index].tabs);
        self.sources[index] = recovered;
        wire::send(
            &mut self.sources[index].writer,
            "tab.list",
            None,
            wire::ResultBody::ok(),
        )?;
        self.restore_view(index)
    }
    pub(super) fn discover(&mut self) {
        if self.discovering || self.last_discovery.elapsed() < Duration::from_secs(2) {
            return;
        }
        self.discovering = true;
        self.last_discovery = Instant::now();
        let known = self
            .sources
            .iter()
            .enumerate()
            .map(|(index, source)| {
                (
                    source.route.source_scope().to_owned(),
                    (index, source.connected || source.reconnecting),
                )
            })
            .collect::<HashMap<_, _>>();
        let paths = Paths {
            profile: self.paths.profile.clone(),
            data: self.paths.data.clone(),
            root: self.paths.root.clone(),
        };
        let tx = self.workers.tx.clone();
        let stop = self.workers.stop.clone();
        thread::spawn(move || {
            let found = (|| {
                let mut found = Vec::new();
                for route in source_route::discover(&paths.profile, &paths.data, &paths.root)? {
                    if stop.load(Ordering::Acquire) {
                        break;
                    }
                    if known
                        .get(route.source_scope())
                        .is_some_and(|(_, connected)| *connected)
                    {
                        continue;
                    }
                    route.compatible()?;
                    let snapshot = snapshot(&route)?;
                    if let Some((index, _)) = known.get(route.source_scope()) {
                        if route
                            .registry()?
                            .tabs
                            .iter()
                            .all(|tab| tab.desired == "stopped")
                        {
                            continue;
                        }
                        let (stream, _, _) = route.attach(None, Duration::from_secs(4))?;
                        tx.send(Event::Connected(*index, Arc::new(route), stream, snapshot))
                            .map_err(|_| "workspace closed")?;
                    } else {
                        let (stream, _, _) = route.attach(None, Duration::from_secs(4))?;
                        found.push((Arc::new(route), stream, snapshot));
                    }
                }
                Ok(found)
            })();
            let _ = tx.send(Event::NewSources(found));
        });
    }
    pub(super) fn new_sources(
        &mut self,
        result: Result<Vec<(Arc<SourceRoute>, endpoint::EndpointStream, SourceSnapshot)>, String>,
    ) -> Result<(), String> {
        self.discovering = false;
        let new =
            match result {
                Ok(new) => new,
                Err(_) => return self.notice(
                    "Additional sources could not be verified; existing work remains connected.",
                ),
            };
        for (route, stream, snapshot) in new {
            if self
                .sources
                .iter()
                .any(|source| source.route.source_scope() == route.source_scope())
            {
                continue;
            }
            if self.sources.len() >= MAX_SOURCES {
                return Err("workspace source capacity exceeded".into());
            }
            let index = self.sources.len();
            let mut source = source(
                route,
                stream,
                index,
                1,
                &self.workers.tx,
                &self.workers.budget,
                &self.routing.signal,
                snapshot,
            )?;
            wire::send(&mut source.writer, "tab.list", None, wire::ResultBody::ok())?;
            self.sources.push(source);
        }
        Ok(())
    }
}
