//! Stable, profile-scoped topology. Source absence is never an empty snapshot.
use super::*;

pub fn check(profile: &Path, data: &Path, root: &Path) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    let mut identities = Vec::new();
    for profile in source_route::profiles(profile, data)? {
        let routes = source_route::discover(&profile, data, root)?
            .into_iter()
            .map(Arc::new)
            .collect::<Vec<_>>();
        if routes.len() > MAX_SOURCES {
            return Err("workspace source capacity exceeded".into());
        }
        for route in &routes {
            route.compatible()?;
            identities.push(format!(
                "{}:{}:{}",
                scope::workspace_token(&profile)?,
                route.release_id(),
                route.epoch()
            ));
        }
        // Concurrency: readiness observes custody; opening a writer here competes with live
        // viewers and repeatedly fsyncs topology inside the activation command's deadline.
        if let Some(document) = WorkspaceStore::inspect(&profile, data)? {
            closed_sources(&document, &profile, data, &routes)?;
        }
    }
    identities.sort();
    let mut digest = Sha256::new();
    digest.update(b"resident-workspace-check-v1\0");
    for identity in identities {
        digest.update(identity.as_bytes());
        digest.update([0]);
    }
    Ok(hex::encode(digest.finalize()))
}
pub(super) fn startup(
    profile: &Path,
    data: &Path,
    routes: Vec<Arc<SourceRoute>>,
) -> Result<WorkspaceDocument, String> {
    let mut store = WorkspaceStore::open(profile, data)?;
    reconcile_closed(&mut store, profile, data, &routes)?;
    drop(store);
    persist(
        profile,
        data,
        Persistence {
            selected: None,
            order: vec![],
            routes,
            view: None,
        },
    )
}
fn reconcile_closed(
    store: &mut WorkspaceStore,
    profile: &Path,
    data: &Path,
    routes: &[Arc<SourceRoute>],
) -> Result<(), String> {
    let closed = closed_sources(store.snapshot(), profile, data, routes)?;
    let identity = store.snapshot().profile.clone();
    for source in closed {
        store.reconcile_verified_source(&identity, source, vec![])?;
    }
    Ok(())
}
fn closed_sources(
    document: &WorkspaceDocument,
    profile: &Path,
    data: &Path,
    routes: &[Arc<SourceRoute>],
) -> Result<Vec<SourceIdentity>, String> {
    let previous_tabs = &document.tabs;
    let previous = document
        .sources
        .iter()
        .filter(|source| {
            previous_tabs
                .iter()
                .any(|tab| tab.source_scope == source.scope)
        })
        .cloned()
        .collect::<Vec<_>>();
    let mut verified = Vec::new();
    for source in previous {
        if routes
            .iter()
            .any(|route| route.source_scope() == source.scope)
        {
            continue;
        }
        let closed = SourceRoute::closed_snapshot(profile, data, &source, &previous_tabs)?
            .ok_or("recorded source is unavailable; workspace preserved")?;
        verified.push(SourceIdentity {
            epoch: closed.epoch,
            revision: closed.registry_revision,
            ..source
        });
    }
    Ok(verified)
}
pub(super) fn persist(
    profile: &Path,
    data: &Path,
    update: Persistence,
) -> Result<WorkspaceDocument, String> {
    let deadline = Instant::now() + Duration::from_secs(1);
    let mut store = loop {
        match WorkspaceStore::open(profile, data) {
            Ok(store) => break store,
            Err(error)
                if error == "workspace writer lease is held" && Instant::now() < deadline =>
            {
                thread::sleep(Duration::from_millis(10))
            }
            Err(error) => return Err(error),
        }
    };
    let identity = store.snapshot().profile.clone();
    for route in update.routes {
        let registry = route.registry()?;
        let mut tabs = registry
            .tabs
            .iter()
            .filter(|tab| tab.desired != "stopped")
            .collect::<Vec<_>>();
        tabs.sort_by_key(|tab| tab.order);
        store.reconcile_verified_source(
            &identity,
            SourceIdentity {
                scope: route.source_scope().into(),
                release_id: route.release_id().into(),
                release_root: route.release_root().to_string_lossy().into_owned(),
                epoch: registry.epoch,
                revision: registry.registry_revision,
            },
            tabs.into_iter()
                .map(|tab| WorkspaceTab {
                    id: WorkspaceTab::id_for(route.source_scope(), &tab.tab_id),
                    source_scope: route.source_scope().into(),
                    source_tab: tab.tab_id.clone(),
                    incarnation: tab.incarnation,
                    name: tab.display_name.clone(),
                    name_source: tab.name_source.clone(),
                    session_file: tab.session_file.clone(),
                })
                .collect(),
        )?;
    }
    if !update.order.is_empty() {
        let live = store
            .snapshot()
            .tabs
            .iter()
            .map(|tab| tab.id.clone())
            .collect::<HashSet<_>>();
        let mut order = update
            .order
            .into_iter()
            .filter(|id| live.contains(id))
            .collect::<Vec<_>>();
        for tab in &store.snapshot().tabs {
            if !order.contains(&tab.id) {
                order.push(tab.id.clone());
            }
        }
        store.reorder(&order)?;
    }
    // Concurrency: positive source closure may overtake a queued selection; that is not a storage failure.
    if let Some(selected) = update
        .selected
        .filter(|id| store.snapshot().tabs.iter().any(|tab| &tab.id == id))
    {
        store.select(&selected)?;
    }
    Ok(store.snapshot().clone())
}
pub(super) fn worker(
    paths: &Paths,
    tx: mpsc::SyncSender<Event>,
    stop: Arc<AtomicBool>,
) -> Arc<mailbox::Mailbox> {
    let sender = Arc::new(mailbox::Mailbox::default());
    let receiver = sender.clone();
    let profile = paths.profile.clone();
    let data = paths.data.clone();
    thread::spawn(move || {
        while let Some(update) = receiver.take(&stop) {
            let view = update.view;
            // Concurrency: another client may own the short metadata writer lease. Wait only
            // on this worker, retaining the bounded latest-intent slot and all execution custody.
            let result = loop {
                let result = persist(&profile, &data, update.clone());
                if stop.load(Ordering::Acquire) {
                    return;
                }
                if result
                    .as_ref()
                    .is_err_and(|error| error == "workspace writer lease is held")
                {
                    continue;
                }
                break result;
            };
            if tx.send(Event::Metadata(result, view)).is_err() {
                break;
            }
        }
    });
    sender
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn activation_check_does_not_compete_with_a_live_metadata_writer() {
        let root = tempfile::tempdir().unwrap();
        let profile = root.path().join("profile");
        let data = root.path().join("data");
        std::fs::create_dir_all(&profile).unwrap();
        let held = WorkspaceStore::open(&profile, &data).unwrap();
        let before = held.snapshot().clone();
        let first = check(&profile, &data, root.path()).unwrap();
        assert_eq!(check(&profile, &data, root.path()).unwrap(), first);
        assert_eq!(
            WorkspaceStore::inspect(&profile, &data).unwrap(),
            Some(before)
        );
    }

    #[test]
    fn another_clients_writer_lease_waits_off_loop_without_error_or_lost_view() {
        let root = tempfile::tempdir().unwrap();
        let paths = Paths {
            profile: root.path().join("profile"),
            data: root.path().join("data"),
            root: root.path().join("release"),
        };
        std::fs::create_dir_all(&paths.profile).unwrap();
        let held = WorkspaceStore::open(&paths.profile, &paths.data).unwrap();
        let (tx, rx) = mpsc::sync_channel(16);
        let stop = Arc::new(AtomicBool::new(false));
        let mailbox = worker(&paths, tx, stop.clone());
        mailbox
            .submit(Persistence {
                selected: None,
                order: vec![],
                routes: vec![],
                view: Some(1),
            })
            .unwrap();
        thread::sleep(Duration::from_millis(1200));
        assert!(
            matches!(rx.try_recv(), Err(mpsc::TryRecvError::Empty)),
            "lease contention must not surface as persistence failure"
        );
        mailbox
            .submit(Persistence {
                selected: None,
                order: vec![],
                routes: vec![],
                view: Some(2),
            })
            .unwrap();
        drop(held);
        for expected in [1, 2] {
            let Event::Metadata(result, ticket) = rx.recv_timeout(Duration::from_secs(5)).unwrap()
            else {
                panic!("unexpected worker event")
            };
            assert!(result.is_ok());
            assert_eq!(ticket, Some(expected));
        }
        stop.store(true, Ordering::Release);
    }
}
impl Context {
    pub(super) fn metadata(
        &mut self,
        result: Result<WorkspaceDocument, String>,
        ticket: Option<u64>,
    ) -> Result<(), String> {
        match result {
            Ok(updated) => {
                // Concurrency: an acknowledgement may predate a newer reveal, creation reservation or drag.
                // It updates custody, never the live user's already-ordered intent.
                for tab in &updated.tabs {
                    if routing::target(&self.sources, &tab.id).is_some() {
                        topology::remember(&mut self.model.order, &tab.id);
                    }
                }
                for source in &mut self.sources {
                    source.sessions = updated
                        .tabs
                        .iter()
                        .filter(|tab| tab.source_scope == source.route.source_scope())
                        .filter_map(|tab| {
                            tab.session_file
                                .as_ref()
                                .map(|file| (file.clone(), tab.source_tab.clone()))
                        })
                        .collect();
                }
                self.model.layout = updated;
                if let Some(ticket) = ticket {
                    self.view_saved(ticket)?;
                }
            }
            Err(_) => {
                if ticket.is_some()
                    && self
                        .pending
                        .as_ref()
                        .is_some_and(|pending| Some(pending.ticket) == ticket)
                {
                    self.pending = None;
                }
                self.notice("Couldn't save tab changes. Try again.")?;
            }
        }
        Ok(())
    }
}
