use super::*;

/// Asks a tab's bridge and holder to stop gracefully and records it as stopping. Returns false
/// for an unknown tab.
pub(super) fn close_tab(
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: &str,
    request_id: Option<u64>,
) -> Result<bool, String> {
    let mut locked = lock_state(&state)?;
    if let Some(bridge) = locked.bridges.get(tab_id) {
        let _ = bridge.peer.offer_control(wire::frame(
            "bridge.stop",
            request_id,
            serde_json::json!({ "deadlineMs": 5000 }),
        )?);
    }
    if let Some(holder) = locked.holders.get(tab_id) {
        let _ = holder.peer.offer_control(wire::frame(
            "shutdown",
            request_id,
            TabTarget {
                tab_id: tab_id.to_owned(),
            },
        )?);
    }
    let commit = if let Some(tab) = locked
        .registry
        .tabs
        .iter_mut()
        .find(|tab| tab.tab_id == tab_id)
    {
        tab.desired = "stopped".into();
        tab.lifecycle = "stopping".into();
        bump_registry_revision(&mut locked.registry);
        Some(registry_snapshot(&locked))
    } else {
        None
    };
    drop(locked);
    let known = commit.is_some();
    commit_staged(commit)?;
    Ok(known)
}

/// How long a maintenance stop waits for graceful holder exit before verified termination.
pub(super) const MAINTENANCE_STOP_GRACE: std::time::Duration = std::time::Duration::from_secs(15);

/// The additional bound for verified termination of holders that ignored the graceful stop.
pub(super) const MAINTENANCE_STOP_FORCE: std::time::Duration = std::time::Duration::from_secs(12);

/// Stops the named tabs, waits for their holders to leave, terminates any holder that ignored the
/// request after verifying its identity, and removes the stopped records. Sessions stay on disk,
/// so each one remains resumable.
pub(super) fn stop_tabs(
    state: &Arc<Mutex<RuntimeState>>,
    tab_ids: &[String],
    request_id: Option<u64>,
) -> Result<serde_json::Value, String> {
    for tab_id in tab_ids {
        close_tab(state, tab_id, request_id)?;
    }
    type LiveTab = (String, Option<ProcessIdentity>, Option<ProcessIdentity>);
    let live =
        |state: &Arc<Mutex<RuntimeState>>| -> Result<Vec<LiveTab>, String> {
            let locked = lock_state(&state)?;
            Ok(tab_ids
                .iter()
                .filter(|tab_id| {
                    // Invariant: a tab whose holder has not started has no process to stop; its
                    // pending start sees the tab is no longer wanted and never launches one.
                    locked.holders.contains_key(*tab_id)
                        || (locked.core.is_starting(*tab_id)
                            && locked.registry.tabs.iter().any(|record| {
                                &record.tab_id == *tab_id && record.holder_pid.is_some()
                            }))
                })
                .map(|tab_id| {
                    let record = locked
                        .registry
                        .tabs
                        .iter()
                        .find(|record| &record.tab_id == tab_id);
                    // Invariant: a recorded holder that has not reconnected is stopped by the identity
                    // its registry record holds.
                    let recorded = || {
                        Some(ProcessIdentity {
                            pid: record?.holder_pid?,
                            start: record?.holder_start_identity.clone()?,
                        })
                    };
                    let child = record.and_then(|record| {
                        Some(ProcessIdentity {
                            pid: record.child_pid?,
                            start: record.child_start_identity.clone()?,
                        })
                    });
                    (
                        tab_id.clone(),
                        locked
                            .holders
                            .get(tab_id)
                            .map(|holder| holder.identity.clone())
                            .or_else(recorded),
                        child,
                    )
                })
                .collect())
        };
    let deadline = std::time::Instant::now() + MAINTENANCE_STOP_GRACE;
    let mut remaining = live(state)?;
    while !remaining.is_empty() && std::time::Instant::now() < deadline {
        thread::sleep(std::time::Duration::from_millis(100));
        remaining = live(state)?;
    }
    let mut forced = Vec::new();
    for (tab_id, identity, child) in &remaining {
        if let Some(identity) = identity {
            counters::record(CounterEvent::HolderHangRecovery);
            // Security: termination targets only the identity this server admitted, never a pid alone.
            if crate::identity::terminate_verified(
                identity,
                MAINTENANCE_STOP_FORCE / 2,
                MAINTENANCE_STOP_FORCE / 2,
            )
            .is_ok()
            {
                forced.push(tab_id.clone());
                // Invariant: an unconnected recorded holder has no connection whose close would
                // release its start slot, so its verified termination releases it.
                if let Ok(mut locked) = state.lock()
                    && !locked.holders.contains_key(tab_id)
                {
                    locked.core.set_starting(tab_id, false);
                }
            }
        }
        // Invariant: a holder that had to be forced never stopped its child, so the child the
        // registry records for the tab is terminated by its own verified identity; its session
        // stays on disk.
        if let Some(child) = child {
            let _ = crate::identity::terminate_verified(
                child,
                MAINTENANCE_STOP_FORCE / 4,
                MAINTENANCE_STOP_FORCE / 4,
            );
        }
    }
    let force_deadline = std::time::Instant::now() + std::time::Duration::from_secs(2);
    remaining = live(state)?;
    while !remaining.is_empty() && std::time::Instant::now() < force_deadline {
        thread::sleep(std::time::Duration::from_millis(100));
        remaining = live(state)?;
    }
    // Invariant: a tab still tracked after verified termination whose holder and child are both
    // gone has no process left to stop; only its bookkeeping is released, and no pid is signalled.
    let mut released = Vec::new();
    let mut remaining_reasons = serde_json::Map::new();
    for (tab_id, identity, child) in &remaining {
        let disposition = stop_disposition(
            process_state(identity.as_ref()),
            process_state(child.as_ref()),
        );
        match disposition {
            StopDisposition::Release if release_gone_tab(state, tab_id, identity.as_ref())? => {
                released.push(tab_id.clone());
            }
            StopDisposition::Release => {
                remaining_reasons.insert(tab_id.clone(), "holder-live".into());
            }
            StopDisposition::Remain(reason) => {
                remaining_reasons.insert(tab_id.clone(), reason.into());
            }
        }
    }
    let remaining = remaining
        .into_iter()
        .map(|(tab_id, _, _)| tab_id)
        .filter(|tab_id| !released.contains(tab_id))
        .collect::<Vec<_>>();
    let stopped = tab_ids
        .iter()
        .filter(|tab_id| !remaining.contains(tab_id))
        .cloned()
        .collect::<Vec<_>>();
    let commit = {
        let mut locked = lock_state(&state)?;
        let before = locked.registry.tabs.len();
        locked
            .registry
            .tabs
            .retain(|tab| !stopped.contains(&tab.tab_id));
        for tab_id in &stopped {
            locked.surfaces.remove(tab_id);
            locked.launches.remove(tab_id);
        }
        (locked.registry.tabs.len() != before).then(|| {
            bump_registry_revision(&mut locked.registry);
            registry_snapshot(&locked)
        })
    };
    commit_staged(commit)?;
    Ok(serde_json::json!({
        "accepted": remaining.is_empty(),
        "stopped": stopped,
        "forced": forced,
        "released": released,
        "remaining": remaining,
        "remainingReasons": remaining_reasons,
    }))
}

pub(super) fn stop_disposition(holder: ProcessState, child: ProcessState) -> StopDisposition {
    match (holder, child) {
        (ProcessState::Live, _) => StopDisposition::Remain("holder-live"),
        (_, ProcessState::Live) => StopDisposition::Remain("child-live"),
        // Invariant: a process whose state cannot be verified may still exist, so it is never
        // released.
        (ProcessState::Unverifiable, _) | (_, ProcessState::Unverifiable) => {
            StopDisposition::Remain("unverifiable")
        }
        _ => StopDisposition::Release,
    }
}

pub(super) fn process_state(identity: Option<&ProcessIdentity>) -> ProcessState {
    let Some(identity) = identity else {
        return ProcessState::Unknown;
    };
    match inspect_identity_bounded(identity.pid) {
        Ok(Some(observed)) if observed.start == identity.start => ProcessState::Live,
        Ok(_) => ProcessState::Gone,
        Err(_) => ProcessState::Unverifiable,
    }
}

/// Clears the server's tracking of a stopping tab whose holder and child are gone. Returns false,
/// changing nothing, when a different holder connected for the tab after it was inspected.
pub(super) fn release_gone_tab(
    state: &Arc<Mutex<RuntimeState>>,
    tab_id: &str,
    inspected: Option<&ProcessIdentity>,
) -> Result<bool, String> {
    let mut locked = lock_state(&state)?;
    if locked
        .holders
        .get(tab_id)
        .is_some_and(|holder| Some(&holder.identity) != inspected)
    {
        return Ok(false);
    }
    remove_holder_session(&mut locked, tab_id);
    locked.core.set_starting(tab_id, false);
    locked.core.set_terminating(tab_id, false);
    release_recovery_slot(&mut locked, tab_id);
    let diagnostics_root = locked.diagnostics_root.clone();
    drop(locked);
    let _ = crate::roles::diagnostics::append_log(
        &diagnostics_root,
        "server",
        "maintenance-stop-released",
    );
    Ok(true)
}

pub(super) fn host_status(state: &Arc<Mutex<RuntimeState>>) -> Result<serde_json::Value, String> {
    let locked = lock_state(&state)?;
    let root = locked
        .diagnostics_root
        .parent()
        .map(std::path::Path::to_path_buf);
    let marker = root
        .as_ref()
        .and_then(|root| std::fs::read(root.join("server.json")).ok())
        .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok());
    let mut by_status = std::collections::BTreeMap::<String, usize>::new();
    for tab in &locked.registry.tabs {
        *by_status.entry(tab.lifecycle.clone()).or_default() += 1;
    }
    let logs = std::fs::read_dir(&locked.diagnostics_root)
        .map(|entries| {
            let mut logs = entries
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .filter(|path| {
                    path.file_name()
                        .and_then(|name| name.to_str())
                        .is_some_and(|name| {
                            name.starts_with("terminal-host-") && name.contains(".log")
                        })
                })
                .map(|path| path.to_string_lossy().into_owned())
                .collect::<Vec<_>>();
            logs.sort();
            logs.truncate(64);
            logs
        })
        .unwrap_or_default();
    let own = crate::identity::inspect_process(std::process::id())
        .ok()
        .flatten();
    let verified = marker
        .as_ref()
        .and_then(|value| value.get("verified"))
        .and_then(serde_json::Value::as_bool);
    Ok(serde_json::json!({
        "serverId": own.map(|identity| format!("{}:{}", identity.pid, identity.start)),
        "pid": std::process::id(),
        "build": env!("CARGO_PKG_VERSION"),
        "release": crate::roles::release_holds::own_release_root(),
        "generation": protocol::GENERATION,
        "epoch": locked.registry.epoch,
        "uptimeSeconds": locked.core_started.elapsed().as_secs(),
        "endpoint": locked.endpoint,
        "detachmentMode": marker.as_ref().and_then(|value| value.get("detachmentMode")).cloned(),
        "detachmentVerified": verified,
        "detachmentVerificationFailure": match verified {
            Some(true) => serde_json::Value::Null,
            Some(false) => marker
                .as_ref()
                .and_then(|value| value.get("reason"))
                .cloned()
                .unwrap_or_else(|| "the owner marker records an unverified detachment".into()),
            None => "the owner marker is missing or unreadable".into(),
        },
        "tabs": locked.registry.tabs.len(),
        "tabsByStatus": by_status,
        "standby": locked.standby.is_some(),
        "clients": locked.clients.len(),
        "starts": {
            "active": locked.active_starts,
            "interactiveWaiting": locked.interactive_start_waiters,
            "recoverySlots": locked.recovery_slots.len(),
        },
        "lifecycle": lifecycle_status(&locked.lifecycle, std::time::Instant::now()),
        "limits": {
            "maxConcurrentStarts": locked.max_concurrent_starts,
            "maxConcurrentStartsHard": crate::core::server::HARD_MAX_CONCURRENT_STARTS,
            "idleExitSeconds": crate::core::server::IDLE_EXIT.as_secs(),
        },
        "counters": counters::snapshot(locked.registry.epoch),
        "logs": logs,
    }))
}

/// Removes the owner marker on exit, but only while it still names this process.
pub(super) fn remove_owned_marker(state: &Arc<Mutex<RuntimeState>>) {
    let Some(root) = state.lock().ok().and_then(|locked| {
        locked
            .diagnostics_root
            .parent()
            .map(std::path::Path::to_path_buf)
    }) else {
        return;
    };
    let Ok(Some(own)) = crate::identity::inspect_process(std::process::id()) else {
        return;
    };
    remove_marker_if_owned(&root.join("server.json"), &own);
}

/// Removes the owner marker only while it still names own; a replacement's marker is kept.
pub(super) fn remove_marker_if_owned(path: &Path, own: &ProcessIdentity) -> bool {
    let Some(marker) = std::fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
    else {
        return false;
    };
    let owned = marker.get("pid").and_then(serde_json::Value::as_u64) == Some(u64::from(own.pid))
        && marker
            .get("startIdentity")
            .and_then(serde_json::Value::as_str)
            == Some(own.start.as_str());
    owned && std::fs::remove_file(path).is_ok()
}

/// Non-interactive maintenance for `a1 tabs`: never a viewing client, never a controller.
pub(super) fn serve_maintain(
    mut stream: endpoint::EndpointStream,
    state: Arc<Mutex<RuntimeState>>,
) -> Result<(), String> {
    while let Some(payload) = wire::read_payload(&mut stream)? {
        let kind = wire::kind(&payload)?;
        let request_id = kind.request_id;
        match kind.message_type.as_str() {
            "host.status" => {
                let status = host_status(&state)?;
                wire::send(&mut stream, "host.status", request_id, status)?;
            }
            "tab.list" => {
                let tabs = {
                    let locked = lock_state(&state)?;
                    let mut tabs = locked.registry.tabs.clone();
                    tabs.sort_by_key(|tab| tab.order);
                    tabs.into_iter()
                        .map(|tab| {
                            serde_json::json!({
                                "tabId": tab.tab_id,
                                "name": tab.display_name,
                                "status": locked
                                    .surfaces
                                    .get(&tab.tab_id)
                                    .map_or_else(|| tab.lifecycle.clone(), |surface| surface.status.clone()),
                                "lifecycle": tab.lifecycle,
                                "desired": tab.desired,
                                "cwd": tab.cwd,
                                "release": tab.release,
                                "holderPid": tab.holder_pid,
                                "restarts": tab.restarts,
                            })
                        })
                        .collect::<Vec<_>>()
                };
                wire::send(
                    &mut stream,
                    "tab.list",
                    request_id,
                    serde_json::json!({ "tabs": tabs }),
                )?;
            }
            "tab.stop" => {
                let (_, target): (_, TabTarget) = wire::body(&payload)?;
                let known = lock_state(&state)?
                    .registry
                    .tabs
                    .iter()
                    .any(|tab| tab.tab_id == target.tab_id);
                let result = if known {
                    stop_tabs(&state, &[target.tab_id], request_id)?
                } else {
                    serde_json::json!({ "accepted": false, "message": "unknown tab" })
                };
                wire::send(&mut stream, "tab.stopped", request_id, result)?;
            }
            "tab.stopAll" | "host.stop" => {
                let tab_ids = lock_state(&state)?
                    .registry
                    .tabs
                    .iter()
                    .map(|tab| tab.tab_id.clone())
                    .collect::<Vec<_>>();
                let result = stop_tabs(&state, &tab_ids, request_id)?;
                if kind.message_type == "host.stop" {
                    let accepted = result["accepted"] == serde_json::Value::Bool(true);
                    // Concurrency: the answer is sent before shutdown is requested, so the main loop
                    // cannot exit and close this connection before the caller learns the outcome.
                    let sent = wire::send(&mut stream, "host.stopping", request_id, result);
                    // Invariant: the server leaves only after every tab it could verify has stopped;
                    // a tab that could not be stopped keeps the host running for a retry.
                    if accepted {
                        lock_state(&state)?.shutdown_requested = true;
                    }
                    sent?;
                } else {
                    wire::send(&mut stream, "tab.stopped", request_id, result)?;
                }
            }
            other => {
                wire::send(
                    &mut stream,
                    "maintain.refused",
                    request_id,
                    wire::ResultBody::refused(format!("unsupported maintenance request {other}")),
                )?;
            }
        }
    }
    Ok(())
}

/// Lifecycle requests one attached client may queue before further ones are refused as busy.
pub(super) const LIFECYCLE_QUEUE: usize = 32;

/// A lifecycle request that runs longer than this is logged as slow.
pub(super) const LIFECYCLE_SLOW: std::time::Duration = std::time::Duration::from_secs(5);

/// The reply frame type that reports a refused or failed lifecycle request to its client.
pub(super) fn lifecycle_refusal(message_type: &str) -> &'static str {
    match message_type {
        "attach.start" => "error",
        "tab.create" => "tab.create-failed",
        "tab.close" => "tab.closed",
        "tab.restart" => "tab.restarted",
        "tab.rename" => "tab.rename-refused",
        _ => "tab.reordered",
    }
}

/// The message shown for a failed lifecycle request. Only a tab start's typed reasons pass through;
/// other errors may name paths, so they are summarized.
pub(super) fn lifecycle_failure_message(message_type: &str, error: &str) -> String {
    match message_type {
        "attach.start" | "tab.create" => error.to_owned(),
        _ => "Tab change could not be completed".to_owned(),
    }
}

pub(super) fn refuse_lifecycle(tx: &Peer, request: &LifecycleRequest, message: String) {
    if let Ok(frame) = wire::frame(
        lifecycle_refusal(&request.message_type),
        request.request_id,
        wire::ResultBody::refused(message),
    ) {
        let _ = tx.offer_control(frame);
    }
}

/// Queues a lifecycle request for the client's worker, or refuses it at once when the queue is
/// full. Never waits, so the input path keeps reading.
pub(super) fn enqueue_lifecycle(
    state: &Arc<Mutex<RuntimeState>>,
    queue: &mpsc::SyncSender<LifecycleRequest>,
    tx: &Peer,
    client_id: &str,
    request: LifecycleRequest,
) -> Result<(), String> {
    lock_state(&state)?
        .lifecycle
        .entry(client_id.to_owned())
        .or_default()
        .pending += 1;
    if let Err(error) = queue.try_send(request) {
        let request = match error {
            mpsc::TrySendError::Full(request) | mpsc::TrySendError::Disconnected(request) => {
                request
            }
        };
        if let Ok(mut locked) = state.lock()
            && let Some(backlog) = locked.lifecycle.get_mut(client_id)
        {
            backlog.pending = backlog.pending.saturating_sub(1);
        }
        refuse_lifecycle(tx, &request, "busy".into());
    }
    Ok(())
}

/// Runs a client's lifecycle requests in arrival order until its connection's read loop ends and
/// the queue drains.
pub(super) fn run_lifecycle_worker(
    queue: mpsc::Receiver<LifecycleRequest>,
    state: Arc<Mutex<RuntimeState>>,
    profile: std::path::PathBuf,
    tx: Peer,
    client_id: String,
) {
    while let Ok(request) = queue.recv() {
        let started = std::time::Instant::now();
        if let Ok(mut locked) = state.lock() {
            locked
                .lifecycle
                .entry(client_id.clone())
                .or_default()
                .running_since = Some(started);
        }
        let result = handle_lifecycle(&state, &profile, &tx, &client_id, &request);
        let diagnostics_root = state.lock().ok().map(|mut locked| {
            if let Some(backlog) = locked.lifecycle.get_mut(&client_id) {
                backlog.pending = backlog.pending.saturating_sub(1);
                backlog.running_since = None;
            }
            locked.diagnostics_root.clone()
        });
        if started.elapsed() >= LIFECYCLE_SLOW
            && let Some(root) = diagnostics_root
        {
            let _ = crate::roles::diagnostics::append_log(&root, "server", "attach-lifecycle-slow");
        }
        if let Err(error) = result {
            let message = lifecycle_failure_message(&request.message_type, &error);
            refuse_lifecycle(&tx, &request, message);
        }
    }
    if let Ok(mut locked) = state.lock() {
        locked.lifecycle.remove(&client_id);
    }
}

/// Totals the lifecycle backlog of every attached client for host status.
pub(super) fn lifecycle_status(
    backlog: &HashMap<String, LifecycleBacklog>,
    now: std::time::Instant,
) -> serde_json::Value {
    let pending = backlog.values().map(|entry| entry.pending).sum::<usize>();
    let oldest_ms = backlog
        .values()
        .filter_map(|entry| entry.running_since)
        .map(|since| now.saturating_duration_since(since).as_millis() as u64)
        .max()
        .unwrap_or(0);
    serde_json::json!({ "pending": pending, "oldestMs": oldest_ms })
}

/// Applies one revision-guarded durable tab move; no-op and stale requests leave no mutation.
pub(super) fn reorder_registry(
    registry: &mut RegistryDocument,
    reorder: &wire::TabReorder,
) -> bool {
    if registry.registry_revision != reorder.expected_revision {
        return false;
    }
    // Protocol: the client sends an index in its tab.list (only live records), not an index
    // into the durable registry, which may contain arbitrarily many interleaved stopped tabs.
    let live = registry
        .tabs
        .iter()
        .filter(|tab| tab.desired != "stopped")
        .map(|tab| tab.tab_id.as_str())
        .collect::<Vec<_>>();
    let Some(from) = live.iter().position(|id| *id == reorder.tab_id) else {
        return false;
    };
    let target = reorder.target_index.min(live.len().saturating_sub(1));
    if target == from {
        return false;
    }
    let Some(raw_from) = registry
        .tabs
        .iter()
        .position(|tab| tab.tab_id == reorder.tab_id)
    else {
        return false;
    };
    let tab = registry.tabs.remove(raw_from);
    let raw_target = registry
        .tabs
        .iter()
        .enumerate()
        .filter(|(_, tab)| tab.desired != "stopped")
        .nth(target)
        .map(|(index, _)| index)
        .unwrap_or_else(|| {
            registry
                .tabs
                .iter()
                .rposition(|tab| tab.desired != "stopped")
                .map_or(0, |index| index + 1)
        });
    registry.tabs.insert(raw_target, tab);
    for (index, tab) in registry.tabs.iter_mut().enumerate() {
        tab.order = index as u32;
    }
    bump_registry_revision(registry);
    true
}

/// Restores Settings to the last live slot on an explicit open, not while prewarming or dragging.
pub(super) fn move_settings_last(registry: &mut RegistryDocument, tab_id: &str) -> bool {
    let last = registry
        .tabs
        .iter()
        .filter(|tab| tab.desired != "stopped")
        .count()
        .saturating_sub(1);
    let expected_revision = registry.registry_revision;
    reorder_registry(
        registry,
        &wire::TabReorder {
            tab_id: tab_id.to_owned(),
            target_index: last,
            expected_revision,
        },
    )
}

/// The tab an `attach.start` views and whether it starts that tab's holder: the tab holding the
/// selected session, a new tab for a session no tab holds, or the default tab, started when the
/// profile has no Agent.
fn attach_start_tab(locked: &mut RuntimeState, selected: Option<&str>) -> (String, bool) {
    if let Some(selected) = selected
        && let Some(tab) = locked.registry.tabs.iter().find(|tab| {
            tab.session_file
                .as_deref()
                .map(canonical_session_identity)
                .as_deref()
                == Some(selected)
        })
    {
        return (tab.tab_id.clone(), false);
    }
    if selected.is_some() && !locked.registry.tabs.is_empty() {
        let tab_id = format!("tab-{:016x}", rand::random::<u64>());
        let start = locked.core.set_starting(&tab_id, true);
        return (tab_id, start);
    }
    let tab_id = locked.default_tab();
    let start = locked.agentless() && locked.core.set_starting(&tab_id, true);
    (tab_id, start)
}

/// Runs one lifecycle request from an attached client on that client's lifecycle worker.
pub(super) fn handle_lifecycle(
    state: &Arc<Mutex<RuntimeState>>,
    profile: &Path,
    tx: &Peer,
    client_id: &str,
    request: &LifecycleRequest,
) -> Result<(), String> {
    let state = state.clone();
    let profile = profile.to_path_buf();
    let client_id = client_id.to_owned();
    let request_id = request.request_id;
    let payload = &request.payload;
    match request.message_type.as_str() {
        "attach.start" => {
            let (_, start): (_, AttachStart) = wire::body(payload)?;
            let selected = start
                .session_file
                .as_deref()
                .map(canonical_session_identity);
            let (tab_id, should_start) =
                attach_start_tab(&mut *lock_state(&state)?, selected.as_deref());
            if should_start
                && let Err(error) = start_holder(&profile, &state, tab_id.clone(), start)
            {
                if let Ok(mut locked) = state.lock() {
                    locked.core.set_starting(&tab_id, false);
                }
                return Err(error);
            }
            if selected.is_some() {
                tx.offer_control(wire::frame(
                    "tab.selected",
                    request_id,
                    TabTarget { tab_id },
                )?)
                .map_err(str::to_owned)?;
            }
        }
        "tab.create" => {
            let (_, create): (_, TabCreate) = wire::body(payload)?;
            let mut start = AttachStart {
                client_id: client_id.clone(),
                tabs_max: usize::MAX,
                cwd: create.cwd,
                columns: create.columns,
                rows: create.rows,
                release_root: create.release_root,
                node_executable: create.node_executable,
                environment: create.environment,
                session_file: None,
                session_dir: None,
            };
            sanitize_tab_environment(&mut start.environment);
            match promote_standby(&state, start.clone()) {
                Ok(Some(tab_id)) => {
                    tx.offer_control(wire::frame(
                        "tab.created",
                        request_id,
                        TabTarget { tab_id },
                    )?)
                    .map_err(str::to_owned)?;
                    return Ok(());
                }
                Ok(None) => discard_standby(&state),
                Err(error) => {
                    tx.offer_control(wire::frame(
                        "tab.create-failed",
                        request_id,
                        wire::ResultBody::refused(error),
                    )?)
                    .map_err(str::to_owned)?;
                    return Ok(());
                }
            }
            let tab_id = format!("tab-{:016x}", rand::random::<u64>());
            lock_state(&state)?.core.set_starting(&tab_id, true);
            match start_holder(&profile, &state, tab_id.clone(), start) {
                Ok(()) => {
                    tx.offer_control(wire::frame(
                        "tab.created",
                        request_id,
                        TabTarget { tab_id },
                    )?)
                    .map_err(str::to_owned)?;
                }
                Err(error) => {
                    if let Ok(mut locked) = state.lock() {
                        locked.core.set_starting(&tab_id, false);
                    }
                    tx.offer_control(wire::frame(
                        "tab.create-failed",
                        request_id,
                        wire::ResultBody::refused(error),
                    )?)
                    .map_err(str::to_owned)?;
                }
            }
        }
        "tab.reorder" => {
            let (_, reorder): (_, wire::TabReorder) = wire::body(payload)?;
            let commit = {
                let mut locked = lock_state(&state)?;
                reorder_registry(&mut locked.registry, &reorder).then(|| registry_snapshot(&locked))
            };
            let accepted = commit.is_some();
            commit_staged(commit)?;
            tx.offer_control(wire::frame(
                "tab.reordered",
                request_id,
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
            let (_, rename): (_, wire::TabRename) = wire::body(payload)?;
            let name = rename.name.trim();
            let valid = !is_settings_tab_id(&rename.tab_id)
                && !name.is_empty()
                && name.chars().count() <= 64
                && !name.chars().any(char::is_control);
            if !valid {
                tx.offer_control(wire::frame(
                    "tab.rename-refused",
                    request_id,
                    wire::ResultBody::refused(
                        "Tab names must be 1–64 printable characters.".into(),
                    ),
                )?)
                .map_err(str::to_owned)?;
                return Ok(());
            }
            let commit = {
                let mut locked = lock_state(&state)?;
                if let Some(tab) = locked
                    .registry
                    .tabs
                    .iter_mut()
                    .find(|tab| tab.tab_id == rename.tab_id)
                {
                    tab.display_name = name.to_owned();
                    tab.name_source = "user".into();
                    bump_registry_revision(&mut locked.registry);
                    Some(registry_snapshot(&locked))
                } else {
                    None
                }
            };
            let accepted = commit.is_some();
            commit_staged(commit)?;
            if accepted
                && let Ok(locked) = state.lock()
                && let Some(bridge) = locked.bridges.get(&rename.tab_id)
            {
                let _ = bridge.peer.offer_control(wire::frame(
                    "bridge.rename",
                    None,
                    serde_json::json!({ "name": name, "nameSource": "user" }),
                )?);
            }
            tx.offer_control(wire::frame(
                "tab.renamed",
                request_id,
                wire::ResultBody {
                    accepted,
                    message: None,
                },
            )?)
            .map_err(str::to_owned)?;
        }
        "tab.restart" => {
            let (_, target): (_, TabTarget) = wire::body(payload)?;
            let accepted = request_child_restart(&state, &target.tab_id, |locked| {
                locked
                    .clients
                    .get(&client_id)
                    .is_some_and(|client| client.controller && client.viewed_tab == target.tab_id)
            })?;
            tx.offer_control(wire::frame(
                "tab.restarted",
                request_id,
                wire::ResultBody {
                    accepted,
                    message: (!accepted).then(|| "restart is unavailable".into()),
                },
            )?)
            .map_err(str::to_owned)?;
        }
        "tab.close" => {
            let (_, target): (_, TabTarget) = wire::body(payload)?;
            close_tab(&state, &target.tab_id, request_id)?;
            tx.offer_control(wire::frame(
                "tab.closed",
                request_id,
                wire::ResultBody::ok(),
            )?)
            .map_err(str::to_owned)?;
        }
        _ => {}
    }
    Ok(())
}
