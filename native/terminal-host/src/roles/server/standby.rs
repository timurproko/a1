use super::*;

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

/// How long a user-requested tab start waits for a start slot. It exceeds
/// [`RECOVERY_SLOT_BOUND`], so an ordinary wait behind recovering tabs still succeeds.
pub(super) const START_PERMIT_DEADLINE: std::time::Duration = std::time::Duration::from_secs(60);

/// The typed failure of a user-requested tab start that found no free start slot in time.
pub const TAB_START_BUSY: &str = "tab-start-busy";

pub(super) fn start_permit_deadline() -> std::time::Duration {
    crate::fault_injection::setting("A1_TABS_FAULT_START_DEADLINE_MS")
        .and_then(|value| value.parse::<u64>().ok())
        .map_or(START_PERMIT_DEADLINE, std::time::Duration::from_millis)
}

pub(super) fn acquire_start_permit(
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: &str,
    start: &mut AttachStart,
) -> Result<(StartPermit, std::time::Duration), String> {
    crate::roles::scope::pin_launch(&mut start.release_root, &mut start.node_executable)?;
    let deadline = std::time::Instant::now() + start_permit_deadline();
    let _waiter = {
        let mut locked = lock_state(&state)?;
        locked.interactive_start_waiters = locked.interactive_start_waiters.saturating_add(1);
        InteractiveStartWaiter { state }
    };
    loop {
        {
            let mut locked = lock_state(&state)?;
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
        // Invariant: this wait runs on a client's lifecycle worker, never its input path, and it
        // ends; a start slot that never frees becomes a typed failure the client can show.
        if std::time::Instant::now() >= deadline {
            return Err(TAB_START_BUSY.to_owned());
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
}

pub(super) fn same_standby_context(standby: &AttachStart, requested: &AttachStart) -> bool {
    let normalize = |values: &[(String, String)]| {
        values
            .iter()
            .cloned()
            .collect::<std::collections::BTreeMap<_, _>>()
    };
    standby.cwd == requested.cwd
        && standby.release_root == requested.release_root
        && standby.node_executable == requested.node_executable
        && normalize(&standby.environment) == normalize(&requested.environment)
}

pub(super) fn promote_standby(
    state: &Arc<Mutex<RuntimeState>>,
    start: AttachStart,
) -> Result<Option<String>, String> {
    let promotion = {
        let mut locked = lock_state(&state)?;
        let Some(standby) = locked
            .standby
            .as_ref()
            .filter(|standby| {
                same_standby_context(&standby.start, &start)
                    && locked.holders.contains_key(&standby.tab_id)
            })
            .cloned()
        else {
            return Ok(None);
        };
        let holder = locked
            .holders
            .get(&standby.tab_id)
            .cloned()
            .ok_or_else(|| "standby holder disappeared".to_owned())?;
        locked.standby = None;
        let order = locked.registry.tabs.len() as u32;
        let display_name = DEFAULT_AGENT_TAB_NAME.to_owned();
        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();
        let previous = locked.registry.clone();
        prune_stopped_records(&mut locked.registry.tabs);
        locked.registry.tabs.push(TabRecord {
            tab_id: standby.tab_id.clone(),
            kind: "agent".into(),
            created_at,
            display_name,
            name_source: "default".into(),
            order,
            cwd: start.cwd.clone(),
            session_file: None,
            session_dir: None,
            desired: "running".into(),
            lifecycle: "starting".into(),
            incarnation: standby.incarnation,
            holder_pid: Some(holder.identity.pid),
            holder_start_identity: Some(holder.identity.start.clone()),
            child_pid: None,
            child_start_identity: None,
            release: start.release_root.clone(),
            last_exit: None,
            restarts: 0,
            restart_window_start: None,
            requested_restart: false,
            attention_seq: 0,
            seen_seq: 0,
        });
        bump_registry_revision(&mut locked.registry);
        let document = locked.registry.clone();
        (
            standby,
            holder,
            locked.registry_store.clone(),
            previous,
            document,
        )
    };
    let (standby, holder, store, previous, document) = promotion;
    if let Err(error) = commit_registry(store, document.clone()) {
        if let Ok(mut locked) = state.lock() {
            if locked.registry.registry_revision == document.registry_revision {
                locked.registry = previous;
            }
            locked.standby = Some(standby);
        }
        return Err(error);
    }
    {
        let mut locked = lock_state(&state)?;
        locked
            .launches
            .insert(standby.tab_id.clone(), start.clone());
        let mut core_tab = crate::core::server::TabState::new((start.columns, start.rows));
        core_tab.incarnation = standby.incarnation;
        core_tab.holder_pid = Some(holder.identity.pid);
        locked.core.tabs.insert(standby.tab_id.clone(), core_tab);
    }
    holder
        .peer
        .offer_control(wire::frame(
            "resize",
            None,
            Resize {
                columns: start.columns,
                rows: start.rows,
                epoch: 0,
                geometry_generation: 1,
            },
        )?)
        .map_err(str::to_owned)?;
    holder
        .peer
        .offer_control(wire::frame("holder.promote", None, wire::ResultBody::ok())?)
        .map_err(str::to_owned)?;
    Ok(Some(standby.tab_id))
}

pub(super) fn discard_standby(state: &Arc<Mutex<RuntimeState>>) {
    let discarded = state.lock().ok().and_then(|mut locked| {
        let standby = locked.standby.take()?;
        locked.surfaces.remove(&standby.tab_id);
        Some((locked.holders.get(&standby.tab_id).cloned(), standby.holder))
    });
    let Some((holder, identity)) = discarded else {
        return;
    };
    if let Some(holder) = holder {
        let _ = holder.peer.offer_control(
            wire::frame(
                "shutdown",
                None,
                wire::ResultBody::accepted("standby retarget".into()),
            )
            .unwrap_or_default(),
        );
    }
    // Invariant: a standby never outlives its server. A holder that never connected received no
    // offer, and one that ignores the offer would otherwise ask every later server for a record it
    // cannot have; the identity recorded at launch bounds both.
    if let Some(identity) = identity {
        end_standby_holder(&identity);
    }
}

pub(super) fn launch_standby(
    state: &Arc<Mutex<RuntimeState>>,
    mut start: AttachStart,
) -> Result<(), String> {
    sanitize_tab_environment(&mut start.environment);
    start.client_id = "standby".into();
    start.session_file = None;
    start.session_dir = None;
    let tab_id = format!("standby-{:016x}", rand::random::<u64>());
    let incarnation = 1;
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(40);
    let (profile, context) = loop {
        let mut locked = lock_state(&state)?;
        if locked.standby.is_some() {
            return Ok(());
        }
        if locked.core.starting_tabs().next().is_some() || locked.active_starts > 0 {
            drop(locked);
            if std::time::Instant::now() >= deadline {
                return Err("standby launch remained blocked by an active start".into());
            }
            thread::sleep(std::time::Duration::from_millis(10));
            continue;
        }
        locked.standby = Some(StandbyTab {
            tab_id: tab_id.clone(),
            start: start.clone(),
            incarnation,
            holder: None,
        });
        let context = HolderLaunchConfig {
            endpoint: locked.endpoint.clone(),
            tab_id: tab_id.clone(),
            incarnation,
            token: locked
                .credentials
                .derive("holder", &tab_id, incarnation)
                .to_vec(),
            bridge_token: locked
                .credentials
                .derive("bridge", &tab_id, incarnation)
                .to_vec(),
            cwd: start.cwd.clone(),
            columns: start.columns,
            rows: start.rows,
            release_root: start.release_root.clone(),
            node_executable: start.node_executable.clone(),
            environment: start.environment.clone(),
            session_file: None,
            session_dir: None,
            recovery_journals: Vec::new(),
            standby: true,
            server: locked.server_config.clone(),
        };
        break (locked.profile.clone(), context);
    };
    let gate_timeout = deadline.saturating_duration_since(std::time::Instant::now());
    if gate_timeout.is_zero() || !acquire_start_gate(state, gate_timeout) {
        if let Ok(mut locked) = state.lock()
            && locked
                .standby
                .as_ref()
                .is_some_and(|value| value.tab_id == tab_id)
        {
            locked.standby = None;
        }
        return Err("standby start gate timed out".into());
    }
    let result = launch_verified_standby_holder(&profile, &context);
    release_start_gate(state);
    record_standby_launch(state, &tab_id, &result);
    result.map(|_| ())
}

/// Launches the standby holder and confirms the identity the launch observed, ending a holder
/// whose identity cannot be confirmed.
fn launch_verified_standby_holder(
    profile: &std::path::Path,
    context: &HolderLaunchConfig,
) -> Result<ProcessIdentity, String> {
    let (mut process, observation) =
        launch::launch_resident_with_config(ResidentRole::Holder, profile, context)
            .map_err(|error| error.to_string())?;
    match inspect_identity_bounded(observation.process.pid) {
        Ok(Some(identity)) if identity.start == observation.process.start => Ok(identity),
        Ok(_) => {
            let _ = process.terminate();
            Err("standby holder identity could not be verified".into())
        }
        Err(error) => {
            let _ = process.terminate();
            Err(error)
        }
    }
}

/// Records a launched standby holder's identity on its standby record, or drops the record when
/// the launch failed.
fn record_standby_launch(
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: &str,
    result: &Result<ProcessIdentity, String>,
) {
    let Ok(mut locked) = state.lock() else {
        return;
    };
    if !locked
        .standby
        .as_ref()
        .is_some_and(|standby| standby.tab_id == tab_id)
    {
        return;
    }
    match result {
        // Invariant: the server that launched a standby can always end it; the identity is
        // recorded before the holder has connected, so a holder that never connects is not left
        // behind when the standby is discarded or the server exits.
        Ok(identity) => {
            if let Some(standby) = locked.standby.as_mut() {
                standby.holder = Some(identity.clone());
            }
        }
        Err(_) => {
            locked.standby = None;
            remove_holder_session(&mut locked, tab_id);
        }
    }
}

/// How long a discarded standby holder gets to leave after the shutdown offer before it is ended
/// by its verified identity, and how long the forced end may take.
const STANDBY_END_GRACE: std::time::Duration = std::time::Duration::from_secs(2);

/// Ends a discarded standby holder by the identity recorded at launch. The shutdown offer that
/// preceded this lets a connected holder leave on its own; verification keeps a reused pid safe.
fn end_standby_holder(identity: &ProcessIdentity) {
    let _ = crate::identity::terminate_verified(identity, STANDBY_END_GRACE, STANDBY_END_GRACE);
}
