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
) -> Result<(StartPermit, std::time::Duration), String> {
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
    let holder = state.lock().ok().and_then(|mut locked| {
        let standby = locked.standby.take()?;
        locked.surfaces.remove(&standby.tab_id);
        locked.holders.get(&standby.tab_id).cloned()
    });
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
    let result = launch::launch_resident_with_config(ResidentRole::Holder, &profile, &context)
        .map_err(|error| error.to_string())
        .and_then(|(mut process, observation)| {
            match inspect_identity_bounded(observation.process.pid) {
                Ok(Some(identity)) if identity.start == observation.process.start => Ok(()),
                Ok(_) => {
                    let _ = process.terminate();
                    Err("standby holder identity could not be verified".into())
                }
                Err(error) => {
                    let _ = process.terminate();
                    Err(error)
                }
            }
        });
    release_start_gate(state);
    if result.is_err()
        && let Ok(mut locked) = state.lock()
        && locked
            .standby
            .as_ref()
            .is_some_and(|value| value.tab_id == tab_id)
    {
        locked.standby = None;
        remove_holder_session(&mut locked, &tab_id);
    }
    result
}
