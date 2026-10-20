use super::*;

pub(super) fn start_holder(
    profile: &Path,
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: String,
    mut start: AttachStart,
) -> Result<(), String> {
    let (_permit, spacing) = acquire_start_permit(state, &tab_id)?;
    crate::fault_injection::delay("A1_TABS_FAULT_DELAY_TAB_START_MS");
    sanitize_tab_environment(&mut start.environment);
    if !spacing.is_zero() {
        std::thread::sleep(spacing);
    }
    // Invariant: a tab told to stop while its start waited for a slot never launches a holder;
    // the permit's release takes the tab out of the starting set, so a stop can complete.
    let stopped_meanwhile = state.lock().ok().is_some_and(|locked| {
        locked
            .registry
            .tabs
            .iter()
            .any(|tab| tab.tab_id == tab_id && tab.desired == "stopped")
    });
    if stopped_meanwhile {
        return Ok(());
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
        let mut locked = lock_state(&state)?;
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
        let display_name = if is_settings_tab_id(&tab_id) {
            "Settings".into()
        } else {
            DEFAULT_AGENT_TAB_NAME.to_owned()
        };
        let created_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string();
        locked.launches.insert(tab_id.clone(), start.clone());
        locked.registry.tabs.retain(|tab| tab.tab_id != tab_id);
        prune_stopped_records(&mut locked.registry.tabs);
        locked.registry.tabs.push(TabRecord {
            tab_id: tab_id.clone(),
            kind: if is_settings_tab_id(&tab_id) {
                "settings"
            } else {
                "agent"
            }
            .into(),
            created_at,
            display_name,
            name_source: if is_settings_tab_id(&tab_id) {
                "system"
            } else {
                "default"
            }
            .into(),
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
            attention_seq: 0,
            seen_seq: 0,
        });
        bump_registry_revision(&mut locked.registry);
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
        standby: false,
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
    let mut locked = lock_state(&state)?;
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
            bump_registry_revision(&mut locked.registry);
            let document = locked.registry.clone();
            let store = locked.registry_store.clone();
            drop(locked);
            commit_registry(store, document)?;
            return Err(reason);
        }
    }
    bump_registry_revision(&mut locked.registry);
    let document = locked.registry.clone();
    let registry_store = locked.registry_store.clone();
    drop(locked);
    commit_registry(registry_store, document)
}

pub(super) fn launch_replacement_holder(
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: &str,
) -> Result<(), String> {
    let (context, profile) = {
        let locked = lock_state(&state)?;
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
            standby: false,
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

pub(super) fn serve_holder(
    mut stream: endpoint::EndpointStream,
    tx: Peer,
    state: Arc<Mutex<RuntimeState>>,
    tab_id: String,
    identity: ProcessIdentity,
    child_identity: Option<ProcessIdentity>,
    connection_incarnation: u64,
    semantic_input: bool,
    structured_surface: bool,
) -> Result<(), String> {
    let connection_id = rand::random::<u64>();
    {
        let mut locked = lock_state(&state)?;
        // Performance: hidden holders continue parsing and committing locally but do no full-surface
        // serialization or delivery until at least one client views this tab.
        tx.offer_control(wire::frame(
            "surface.subscription",
            None,
            desired_surface_subscription(&locked, &tab_id, structured_surface),
        )?)
        .map_err(str::to_owned)?;
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
            .map(|record| {
                holder_respawn(
                    &locked.credentials,
                    &tab_id,
                    record.incarnation,
                    record.session_file.clone(),
                    false,
                )
            });
        locked.holders.insert(
            tab_id.clone(),
            HolderSession {
                peer: tx,
                identity,
                incarnation: connection_incarnation,
                connection_id,
                semantic_input,
                structured_surface,
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
        // Invariant: only a slot this tab's recovery took is returned; a holder re-adopted by a
        // replacement server while restarting never took one.
        if recovering {
            release_recovery_slot(&mut locked, &tab_id);
        }
        let registry_commit = recovering.then(|| {
            bump_registry_revision(&mut locked.registry);
            registry_snapshot(&locked)
        });
        // Invariant: a holder that connects after its tab was told to stop is stopped at once.
        let stop_now = locked
            .registry
            .tabs
            .iter()
            .any(|record| record.tab_id == tab_id && record.desired == "stopped");
        locked.holders_terminating.remove(&tab_id);
        locked.holders_starting.remove(&tab_id);
        locked.last_activity = std::time::Instant::now();
        drop(locked);
        commit_staged(registry_commit)?;
        if stop_now {
            let _ = holder_peer.offer_control(wire::frame(
                "shutdown",
                None,
                TabTarget {
                    tab_id: tab_id.clone(),
                },
            )?);
        } else if let Some(respawn) = pending_respawn {
            if !acquire_recovery_slot(&state, &tab_id, std::time::Duration::from_secs(40)) {
                return Err("resident restart start gate timed out".into());
            }
            if let Err(error) =
                holder_peer.offer_control(wire::frame("holder.respawn", None, respawn)?)
            {
                release_recovery_slot_of(&state, &tab_id);
                return Err(error.to_owned());
            }
        }
    }
    let mut last_exit = None;
    // Invariant: however the connection ends, including a failed request, the holder is
    // released below; returning early would leave it recorded as connected and its tab stuck.
    let served = (|| -> Result<(), String> {
        while let Some(payload) = wire::read_payload(&mut stream)? {
            let kind = wire::kind(&payload)?;
            let current_connection = state.lock().ok().is_some_and(|locked| {
                locked
                    .holders
                    .get(&tab_id)
                    .is_some_and(|holder| holder.connection_id == connection_id)
            });
            if !current_connection {
                continue;
            }
            match kind.message_type.as_str() {
                "surface" => {
                    let (_, mut surface): (_, Surface) = wire::body(&payload)?;
                    if surface.incarnation != 0 && surface.incarnation != connection_incarnation {
                        continue;
                    }
                    if let Some(structured) = surface.structured.as_ref()
                        && structured.validate().is_err()
                    {
                        continue;
                    }
                    if surface.structured.is_none() && surface.bytes.is_empty() {
                        continue;
                    }
                    surface.tab_id = tab_id.clone();
                    surface.incarnation = connection_incarnation;
                    let routed = {
                        let mut locked = lock_state(&state)?;
                        if !locked
                            .holders
                            .get(&tab_id)
                            .is_some_and(|holder| holder.incarnation == connection_incarnation)
                            || !accepts_holder_surface(
                                locked.surfaces.get(&tab_id).map(Arc::as_ref),
                                &surface,
                            )
                        {
                            None
                        } else {
                            if locked.bridge_status_sequences.get(&tab_id).is_some_and(
                                |(seen_incarnation, _)| *seen_incarnation == connection_incarnation,
                            ) && let Some(existing) = locked.surfaces.get(&tab_id)
                            {
                                surface.status = existing.status.clone();
                                surface.accent = existing.accent.clone();
                            } else if locked
                                .registry
                                .tabs
                                .iter()
                                .find(|record| record.tab_id == tab_id)
                                .is_some_and(|record| record.attention_seq > record.seen_seq)
                            {
                                surface.status = "done-unseen".into();
                            }
                            let surface = Arc::new(surface);
                            locked.surfaces.insert(tab_id.clone(), surface.clone());
                            let clients = viewers(&locked, &tab_id)
                                .map(|client| {
                                    (
                                        client.peer.clone(),
                                        client.structured_surface,
                                        client.view_generation,
                                    )
                                })
                                .collect::<Vec<_>>();
                            Some((clients, surface))
                        }
                    };
                    let Some((clients, surface)) = routed else {
                        continue;
                    };
                    // Concurrency: serialization and fallback reconstruction are intentionally outside the
                    // shared server-state lock; one large surface cannot delay unrelated tabs.
                    for (client, structured, generation) in clients {
                        let offered =
                            surface_for_client(surface.as_ref().clone(), structured, generation)?;
                        client.offer_surface(wire::frame("surface", None, offered)?);
                    }
                }
                "input.rejected" | "input.uncertain" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    let locked = lock_state(&state)?;
                    for client in viewers(&locked, &tab_id) {
                        let _ = client.peer.offer_control(wire::frame(
                            &kind.message_type,
                            kind.request_id,
                            result.clone(),
                        )?);
                    }
                }
                // Invariant: a typed effect reaches only clients viewing this tab that apply
                // effects; the server never applies, logs, or retains its payload.
                "terminal.effect" => {
                    let (_, mut effect): (_, protocol::TerminalEffect) = wire::body(&payload)?;
                    if protocol::validate_effect(&effect.effect).is_err()
                        || (effect.incarnation != 0 && effect.incarnation != connection_incarnation)
                    {
                        continue;
                    }
                    effect.tab_id = tab_id.clone();
                    effect.incarnation = connection_incarnation;
                    let clients = lock_state(&state)?
                        .clients
                        .values()
                        .filter(|client| {
                            client.viewed_tab == tab_id
                                && client.controller
                                && client.terminal_effects
                        })
                        .map(|client| client.peer.clone())
                        .collect::<Vec<_>>();
                    let frame = wire::frame("terminal.effect", None, effect)?;
                    for client in clients {
                        let _ = client.offer_control(frame.clone());
                    }
                }
                "holder.heartbeat" => {
                    let (_, ready): (_, wire::HolderReady) = wire::body(&payload)?;
                    let child = inspect_identity_bounded(ready.child_pid)?
                        .filter(|identity| identity.start == ready.child_start_identity);
                    let mut locked = lock_state(&state)?;
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
                        bump_registry_revision(&mut locked.registry);
                        Some(registry_snapshot(&locked))
                    } else {
                        None
                    };
                    drop(locked);
                    commit_staged(commit)?;
                }
                "holder.recovery-action" => {
                    let (_, request): (_, wire::ResultBody) = wire::body(&payload)?;
                    let action = request.message.as_deref().unwrap_or("");
                    let (store, document, peer, respawn) = {
                        let mut locked = lock_state(&state)?;
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
                        bump_registry_revision(&mut locked.registry);
                        let peer = locked
                            .holders
                            .get(&tab_id)
                            .map(|holder| holder.peer.clone());
                        let respawn = next.map(|start_fresh| {
                            holder_respawn(
                                &locked.credentials,
                                &tab_id,
                                incarnation,
                                session_file,
                                start_fresh,
                            )
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
                            let session_ok =
                                respawn.session_file.as_deref().map_or(Ok(()), |file| {
                                    verify_session_writer_released(
                                        Path::new(file),
                                        std::time::Duration::from_secs(5),
                                    )
                                });
                            if let Err(error) = session_ok {
                                let commit = {
                                    let mut locked = lock_state(&state)?;
                                    if let Some(record) = locked
                                        .registry
                                        .tabs
                                        .iter_mut()
                                        .find(|record| record.tab_id == tab_id)
                                    {
                                        record.lifecycle = "failed".into();
                                        record.last_exit = Some(error);
                                    }
                                    bump_registry_revision(&mut locked.registry);
                                    registry_snapshot(&locked)
                                };
                                commit_registry(commit.0, commit.1)?;
                            } else {
                                if !acquire_recovery_slot(
                                    &state,
                                    &tab_id,
                                    std::time::Duration::from_secs(40),
                                ) {
                                    return Err("resident restart start gate timed out".into());
                                }
                                if let Err(error) = peer.offer_control(wire::frame(
                                    "holder.respawn",
                                    None,
                                    respawn,
                                )?) {
                                    release_recovery_slot_of(&state, &tab_id);
                                    return Err(error.to_owned());
                                }
                            }
                        } else {
                            peer.offer_control(wire::frame(
                                "shutdown",
                                None,
                                wire::ResultBody::ok(),
                            )?)
                            .map_err(str::to_owned)?;
                        }
                    }
                }
                "holder.exit" => {
                    let (_, exit): (_, HolderExit) = wire::body(&payload)?;
                    let standby_exit = state.lock().ok().is_some_and(|locked| {
                        locked
                            .standby
                            .as_ref()
                            .is_some_and(|standby| standby.tab_id == tab_id)
                            && !locked
                                .registry
                                .tabs
                                .iter()
                                .any(|record| record.tab_id == tab_id)
                    });
                    if standby_exit {
                        last_exit = Some("standby child ended".into());
                        break;
                    }
                    let reason = exit.signal.clone().unwrap_or_else(|| {
                        exit.code
                            .map_or_else(|| "ended".into(), |code| format!("exit {code}"))
                    });
                    last_exit = Some(reason.clone());
                    let (store, document, respawn, restart_delivery) = {
                        let mut locked = lock_state(&state)?;
                        for client in viewers(&locked, &tab_id) {
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
                            } else if let Some(delay) = apply_restart_budget(record, now) {
                                next_incarnation = record.incarnation;
                                session_file = record.session_file.clone();
                                restart = Some(delay.as_secs());
                            } else {
                                failed = true;
                            }
                        }
                        bump_registry_revision(&mut locked.registry);
                        let respawn = restart.map(|delay| {
                            (
                                delay,
                                holder_respawn(
                                    &locked.credentials,
                                    &tab_id,
                                    next_incarnation,
                                    session_file,
                                    false,
                                ),
                            )
                        });
                        let restart_delivery = if respawn.is_some() {
                            let clients = viewers(&locked, &tab_id)
                                .map(|client| {
                                    (
                                        client.peer.clone(),
                                        client.structured_surface,
                                        client.view_generation,
                                    )
                                })
                                .collect::<Vec<_>>();
                            locked.surfaces.get_mut(&tab_id).map(|surface| {
                                Arc::make_mut(surface).status = "restarting".into();
                                (surface.clone(), clients)
                            })
                        } else {
                            None
                        };
                        if failed {
                            if let Some(surface) = locked.surfaces.get_mut(&tab_id) {
                                Arc::make_mut(surface).status = "failed".into();
                            }
                            for client in viewers(&locked, &tab_id) {
                                let _ = client.peer.offer_control(wire::frame(
                                    "failure.status",
                                    None,
                                    wire::ResultBody::refused(reason.clone()),
                                )?);
                            }
                        }
                        (
                            locked.registry_store.clone(),
                            locked.registry.clone(),
                            respawn,
                            restart_delivery,
                        )
                    };
                    if let Some((surface, clients)) = restart_delivery {
                        for (client, structured, generation) in clients {
                            let surface = surface_for_client(
                                surface.as_ref().clone(),
                                structured,
                                generation,
                            )?;
                            client.offer_surface(wire::frame("surface", None, surface)?);
                        }
                    }
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
                        let session_check =
                            respawn.session_file.as_deref().map_or(Ok(()), |file| {
                                verify_session_writer_released(
                                    Path::new(file),
                                    std::time::Duration::from_secs(5),
                                )
                            });
                        if let Err(error) = session_check {
                            let commit = {
                                let mut locked = lock_state(&state)?;
                                if let Some(record) =
                                    locked.registry.tabs.iter_mut().find(|record| {
                                        record.tab_id == tab_id
                                            && record.incarnation == respawn.incarnation
                                    })
                                {
                                    record.lifecycle = "failed".into();
                                    record.last_exit = Some(error);
                                }
                                bump_registry_revision(&mut locked.registry);
                                registry_snapshot(&locked)
                            };
                            commit_registry(commit.0, commit.1)?;
                        } else {
                            let peer = state.lock().ok().and_then(|locked| {
                                locked
                                    .holders
                                    .get(&tab_id)
                                    .filter(|holder| holder.connection_id == connection_id)
                                    .map(|holder| holder.peer.clone())
                            });
                            if !acquire_recovery_slot(
                                &state,
                                &tab_id,
                                std::time::Duration::from_secs(40),
                            ) {
                                return Err("resident restart start gate timed out".into());
                            }
                            if let Some(peer) = peer {
                                if let Err(error) = peer.offer_control(wire::frame(
                                    "holder.respawn",
                                    None,
                                    respawn,
                                )?) {
                                    release_recovery_slot_of(&state, &tab_id);
                                    return Err(error.to_owned());
                                }
                            } else {
                                release_recovery_slot_of(&state, &tab_id);
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        Ok(())
    })();
    let mut locked = lock_state(&state)?;
    if !locked
        .holders
        .get(&tab_id)
        .is_some_and(|holder| holder.connection_id == connection_id)
    {
        return served;
    }
    locked.holders.remove(&tab_id);
    let was_standby = locked
        .standby
        .as_ref()
        .is_some_and(|standby| standby.tab_id == tab_id)
        && !locked
            .registry
            .tabs
            .iter()
            .any(|record| record.tab_id == tab_id);
    if was_standby {
        locked.standby = None;
        locked.surfaces.remove(&tab_id);
        locked.last_activity = std::time::Instant::now();
        return served;
    }
    let lost = holder_lost(&state, locked, &tab_id, last_exit);
    served.and(lost)
}

/// Records a tab whose holder is gone or unreachable and schedules its restart under the restart
/// policy, exactly as for a holder whose connection closed.
pub(super) fn holder_lost(
    state: &Arc<Mutex<RuntimeState>>,
    mut locked: std::sync::MutexGuard<'_, RuntimeState>,
    tab_id: &str,
    last_exit: Option<String>,
) -> Result<(), String> {
    let incarnation = locked
        .core
        .tabs
        .get(tab_id)
        .map_or(0, |tab| tab.incarnation);
    let now = locked.core_started.elapsed();
    let _ = crate::core::server::step(
        &mut locked.core,
        crate::core::server::Event::HolderConnectionLost {
            tab_id: tab_id.to_owned(),
            incarnation,
        },
        now,
    );
    locked.holders_terminating.remove(tab_id);
    locked.holders_starting.remove(tab_id);
    locked.surfaces.remove(tab_id);
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
        } else if let Some(delay) = apply_restart_budget(record, now_epoch) {
            counters::record(CounterEvent::CrashRestart);
            restart_delay = Some(delay);
        } else {
            counters::record(CounterEvent::FailedTab);
        }
    }
    bump_registry_revision(&mut locked.registry);
    let document = locked.registry.clone();
    let registry_store = locked.registry_store.clone();
    drop(locked);
    commit_registry(registry_store, document)?;
    if let Some(delay) = restart_delay {
        thread::sleep(delay);
        let record = state.lock().ok().and_then(|locked| {
            locked
                .registry
                .tabs
                .iter()
                .find(|record| record.tab_id == tab_id)
                .map(|record| (record.desired.clone(), record.session_file.clone()))
        });
        // Invariant: a tab stopped or removed while its restart waited out the backoff stays
        // stopped; the backoff never resurrects it.
        let Some((desired, session_file)) = record else {
            return Ok(());
        };
        if desired != "running" {
            return Ok(());
        }
        if let Some(session_file) = session_file {
            if let Err(error) = verify_session_writer_released(
                Path::new(&session_file),
                std::time::Duration::from_secs(5),
            ) {
                let commit = {
                    let mut locked = lock_state(&state)?;
                    if let Some(record) = locked
                        .registry
                        .tabs
                        .iter_mut()
                        .find(|record| record.tab_id == tab_id)
                    {
                        record.lifecycle = "failed".into();
                        record.last_exit = Some(error);
                    }
                    bump_registry_revision(&mut locked.registry);
                    registry_snapshot(&locked)
                };
                commit_registry(commit.0, commit.1)?;
                return Ok(());
            }
        }
        if !acquire_recovery_slot(state, tab_id, std::time::Duration::from_secs(40)) {
            return Err("replacement holder start gate timed out".into());
        }
        if let Err(error) = launch_replacement_holder(state, tab_id) {
            release_recovery_slot_of(state, tab_id);
            let commit = {
                let mut locked = lock_state(&state)?;
                if let Some(record) = locked
                    .registry
                    .tabs
                    .iter_mut()
                    .find(|record| record.tab_id == tab_id)
                {
                    record.lifecycle = "failed".into();
                    record.last_exit = Some("holder restart failed".into());
                }
                bump_registry_revision(&mut locked.registry);
                registry_snapshot(&locked)
            };
            commit_registry(commit.0, commit.1)?;
            return Err(error);
        }
    }
    Ok(())
}

/// How long a replacement server waits for a recorded live holder to reconnect before treating it
/// as lost.
pub(super) const HOLDER_ADMISSION_DEADLINE: std::time::Duration =
    std::time::Duration::from_secs(30);

/// Treats every recorded holder that has not reconnected by the admission deadline as lost: a live
/// one is terminated by its recorded identity first, then the tab follows the restart policy.
pub(super) fn expire_unadmitted_holders(
    state: &Arc<Mutex<RuntimeState>>,
    adopting: std::collections::HashSet<String>,
) {
    thread::sleep(HOLDER_ADMISSION_DEADLINE);
    for tab_id in adopting {
        // Concurrency: each tab verifies, terminates, and waits out its restart backoff on its
        // own thread, so one tab's backoff never delays another's recovery.
        let state = state.clone();
        thread::spawn(move || expire_unadmitted_holder(&state, &tab_id));
    }
}

pub(super) fn expire_unadmitted_holder(state: &Arc<Mutex<RuntimeState>>, tab_id: &str) {
    let Ok(locked) = state.lock() else {
        return;
    };
    if locked.holders.contains_key(tab_id) || !locked.holders_starting.contains(tab_id) {
        return;
    }
    let recorded = locked
        .registry
        .tabs
        .iter()
        .find(|record| record.tab_id == tab_id)
        .and_then(|record| {
            Some(ProcessIdentity {
                pid: record.holder_pid?,
                start: record.holder_start_identity.clone()?,
            })
        });
    let diagnostics_root = locked.diagnostics_root.clone();
    drop(locked);
    let _ = crate::roles::diagnostics::append_log(
        &diagnostics_root,
        "server",
        "holder-admission-expired",
    );
    if let Some(identity) = recorded {
        counters::record(CounterEvent::HolderHangRecovery);
        // Security: only the identity recorded for this tab is terminated, never a pid alone.
        let _ = crate::identity::terminate_verified(
            &identity,
            std::time::Duration::from_secs(5),
            std::time::Duration::from_secs(5),
        );
    }
    let Ok(locked) = state.lock() else {
        return;
    };
    // Invariant: a holder that reconnected while it was being verified keeps its tab.
    if locked.holders.contains_key(tab_id) {
        return;
    }
    let _ = holder_lost(state, locked, tab_id, Some("holder not readmitted".into()));
}

/// How often recorded holders that are neither connected nor starting are checked.
pub(super) const UNCONNECTED_HOLDER_CHECK: std::time::Duration = std::time::Duration::from_secs(5);

/// Releases tabs whose recorded holder is neither connected nor starting: a gone holder at once,
/// and a live but unreachable one after the admission deadline, by its recorded identity. A tab
/// whose holder outlived its server in any lifecycle therefore never stays stale.
pub(super) fn reconcile_unconnected_holders(state: &Arc<Mutex<RuntimeState>>) {
    let mut unconnected_since = HashMap::<String, std::time::Instant>::new();
    loop {
        thread::sleep(UNCONNECTED_HOLDER_CHECK);
        let candidates = {
            let Ok(locked) = state.lock() else {
                return;
            };
            locked
                .registry
                .tabs
                .iter()
                .filter(|record| {
                    !locked.holders.contains_key(&record.tab_id)
                        && !locked.holders_starting.contains(&record.tab_id)
                        && !locked.holders_terminating.contains(&record.tab_id)
                })
                .filter_map(|record| {
                    Some((
                        record.tab_id.clone(),
                        ProcessIdentity {
                            pid: record.holder_pid?,
                            start: record.holder_start_identity.clone()?,
                        },
                    ))
                })
                .collect::<Vec<_>>()
        };
        unconnected_since.retain(|tab_id, _| candidates.iter().any(|(tab, _)| tab == tab_id));
        for (tab_id, identity) in candidates {
            let since = *unconnected_since
                .entry(tab_id.clone())
                .or_insert_with(std::time::Instant::now);
            let live = inspect_identity_bounded(identity.pid)
                .ok()
                .flatten()
                .is_some_and(|observed| observed.start == identity.start);
            if live && since.elapsed() < HOLDER_ADMISSION_DEADLINE {
                continue;
            }
            if live {
                counters::record(CounterEvent::HolderHangRecovery);
                // Security: only the identity recorded for this tab is terminated, never a pid alone.
                let _ = crate::identity::terminate_verified(
                    &identity,
                    std::time::Duration::from_secs(5),
                    std::time::Duration::from_secs(5),
                );
            }
            unconnected_since.remove(&tab_id);
            let state = state.clone();
            // Concurrency: the restart backoff runs on its own thread, never in this check.
            thread::spawn(move || {
                let Ok(locked) = state.lock() else {
                    return;
                };
                let still_unconnected = !locked.holders.contains_key(&tab_id)
                    && !locked.holders_starting.contains(&tab_id)
                    && locked.registry.tabs.iter().any(|record| {
                        record.tab_id == tab_id && record.holder_pid == Some(identity.pid)
                    });
                if still_unconnected {
                    let _ =
                        holder_lost(&state, locked, &tab_id, Some("holder not connected".into()));
                }
            });
        }
    }
}

/// The diagnostic event for a peer connection the server refused, without any peer-supplied text.
pub(super) fn peer_refusal_event(error: &str) -> Option<&'static str> {
    Some(match error {
        "resident credential rejected" => "peer-refused-credential",
        "peer has observed a newer server epoch" => "peer-refused-epoch",
        "holder has no registry or standby record" => "peer-refused-no-record",
        "holder incarnation does not match the registry" => "peer-refused-incarnation",
        "holder identity does not match the registry" => "peer-refused-holder-identity",
        "holder child identity does not match the registry" => "peer-refused-child-identity",
        "holder process is not live" | "holder child process is not live" => {
            "peer-refused-not-live"
        }
        "holder did not present a pid" | "holder did not present its child pid" => {
            "peer-refused-missing-pid"
        }
        "unapproved resident peer role" => "peer-refused-role",
        "identity inspection deadline exceeded" | "identity inspection worker limit reached" => {
            "peer-refused-inspection-timeout"
        }
        _ => return None,
    })
}
