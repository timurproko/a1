use super::*;

pub(super) fn canonical_session_identity(value: &str) -> String {
    crate::session_lock::session_identity(Path::new(value)).unwrap_or_else(|_| {
        std::fs::canonicalize(value)
            .unwrap_or_else(|_| Path::new(value).to_path_buf())
            .to_string_lossy()
            .replace('\\', "/")
            .to_lowercase()
    })
}

pub(super) fn accepts_bridge_sequence(
    seen: Option<(u64, u64)>,
    incarnation: u64,
    sequence: u64,
) -> bool {
    !seen.is_some_and(|(seen_incarnation, seen_sequence)| {
        seen_incarnation == incarnation && sequence <= seen_sequence
    })
}

pub(super) fn bridge_surface_status(
    previous: &str,
    reported: String,
    pending_requests: usize,
    queued_input: usize,
    degraded: bool,
    viewed: bool,
) -> String {
    let reported = match reported.as_str() {
        "starting" | "restoring" | "working" | "needs-input" | "idle" | "done" | "aborted"
        | "done-unseen" | "error" | "failed" | "crashed" | "restarting" | "unresponsive"
        | "ended" => reported,
        _ => "idle".into(),
    };
    let mut next = if degraded {
        "degraded".into()
    } else if pending_requests > 0 {
        "needs-input".into()
    } else if queued_input > 0 {
        "working".into()
    } else {
        reported
    };
    if next == "idle" && matches!(previous, "working" | "needs-input") && !viewed {
        next = "done-unseen".into();
    } else if next == "done-unseen" && viewed {
        next = "idle".into();
    }
    next
}

pub(super) fn mark_attention(attention_seq: &mut u64) {
    *attention_seq = attention_seq.saturating_add(1);
}

pub(super) fn mark_seen(attention_seq: u64, seen_seq: &mut u64) -> bool {
    if *seen_seq >= attention_seq {
        return false;
    }
    *seen_seq = attention_seq;
    true
}

pub(super) fn plan_status_persist(
    locked: &mut RuntimeState,
    tab_id: &str,
) -> Option<std::time::Duration> {
    let now = locked.core_started.elapsed();
    locked
        .core
        .plan_status_persist(tab_id, now, std::time::Duration::from_secs(1))
}

pub(super) fn persist_status_after(
    state: Arc<Mutex<RuntimeState>>,
    tab_id: String,
    delay: std::time::Duration,
) {
    thread::spawn(move || {
        if !delay.is_zero() {
            thread::sleep(delay);
        }
        let commit = state.lock().ok().map(|mut locked| {
            let now = locked.core_started.elapsed();
            locked.core.status_persisted(&tab_id, now);
            registry_snapshot(&locked)
        });
        if let Some((store, document)) = commit {
            let _ = commit_registry(store, document);
        }
    });
}

pub(super) fn broadcast_tab_status(locked: &RuntimeState, surface: &Surface) -> Result<(), String> {
    let frame = wire::frame(
        "tab.status",
        None,
        TabStatus {
            tab_id: surface.tab_id.clone(),
            status: surface.status.clone(),
            accent: surface.accent.clone(),
        },
    )?;
    for client in locked.clients.values() {
        let _ = client.peer.offer_control(frame.clone());
    }
    Ok(())
}

pub(super) fn serve_bridge(
    mut stream: endpoint::EndpointStream,
    tx: Peer,
    state: Arc<Mutex<RuntimeState>>,
    tab_id: String,
    incarnation: u64,
    heartbeat_supported: bool,
    controller_boundary: bool,
) -> Result<(), String> {
    crate::fault_injection::crash_at("bridge-before-admit");
    {
        let mut locked = lock_state(&state)?;
        locked.bridges.insert(
            tab_id.clone(),
            BridgePeer {
                peer: tx.clone(),
                incarnation,
                controller_boundary,
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
                BridgeAttachment::new(client, revision),
            )?)
            .map_err(str::to_owned)?;
        }
        let visible = is_viewed(&locked, &tab_id);
        tx.offer_control(wire::frame(
            "bridge.visibility",
            None,
            serde_json::json!({ "visible": visible }),
        )?)
        .map_err(str::to_owned)?;
        offer_utility_route(&tx, &tab_id)?;
    }
    crate::fault_injection::crash_at("bridge-after-admit");
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
                let mut locked = lock_state(&state)?;
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
        } else if kind.message_type == "bridge.shortcuts" {
            // Protocol: the newest projection any child publishes is the effective one; it is
            // validated, retained for later clients, and relayed to every attached client.
            let (_, shortcuts): (_, protocol::TabShortcuts) = wire::body(&payload)?;
            if protocol::validate_shortcuts(&shortcuts).is_err() {
                continue;
            }
            let mut locked = lock_state(&state)?;
            if locked.shortcuts.as_ref() == Some(&shortcuts) {
                continue;
            }
            let frame = wire::frame("tabs.shortcuts", None, shortcuts.clone())?;
            locked.shortcuts = Some(shortcuts);
            for client in locked.clients.values() {
                let _ = client.peer.offer_control(frame.clone());
            }
        } else if kind.message_type == "bridge.status" {
            let (_, status): (_, BridgeStatus) = wire::body(&payload)?;
            let mut locked = lock_state(&state)?;
            if !accepts_bridge_sequence(
                locked.core.bridge_status_sequence(&tab_id),
                incarnation,
                status.seq,
            ) {
                continue;
            }
            locked
                .core
                .set_bridge_status_sequence(&tab_id, Some((incarnation, status.seq)));
            let viewed = is_viewed(&locked, &tab_id);
            let (updated, attention_changed) = if let Some(entry) = locked.surfaces.get_mut(&tab_id)
            {
                let attention_changed = {
                    let surface = Arc::make_mut(entry);
                    let previous = surface.status.clone();
                    surface.status = bridge_surface_status(
                        &previous,
                        status.state,
                        status.pending_requests,
                        status.queued_input,
                        status.degraded,
                        viewed,
                    );
                    if surface.status != previous && surface.status == "degraded" {
                        counters::record(CounterEvent::CheckpointDegraded);
                    }
                    if status.accent.is_some() {
                        surface.accent = status.accent;
                    }
                    matches!(previous.as_str(), "working" | "needs-input")
                        && surface.status == "done-unseen"
                };
                (Some(entry.clone()), attention_changed)
            } else {
                (None, false)
            };
            let status_persist = if attention_changed {
                if let Some(record) = locked
                    .registry
                    .tabs
                    .iter_mut()
                    .find(|record| record.tab_id == tab_id)
                {
                    mark_attention(&mut record.attention_seq);
                    bump_registry_revision(&mut locked.registry);
                    plan_status_persist(&mut locked, &tab_id)
                } else {
                    None
                }
            } else {
                None
            };
            let delivery = updated.map(|surface| {
                let clients = viewers(&locked, &tab_id)
                    .map(|client| {
                        (
                            client.peer.clone(),
                            client.structured_surface,
                            client.view_generation,
                        )
                    })
                    .collect::<Vec<_>>();
                (surface, clients)
            });
            if let Some((surface, _)) = delivery.as_ref() {
                broadcast_tab_status(&locked, surface)?;
            }
            drop(locked);
            if let Some((surface, clients)) = delivery {
                for (client, structured, generation) in clients {
                    let surface =
                        surface_for_client(surface.as_ref().clone(), structured, generation)?;
                    client.offer_surface(wire::frame("surface", None, surface)?);
                }
            }
            if let Some(delay) = status_persist {
                persist_status_after(state.clone(), tab_id.clone(), delay);
            }
        } else if kind.message_type == "bridge.boundary" {
            let (_, boundary): (_, protocol::ControllerBoundary) = wire::body(&payload)?;
            let nonce = boundary.nonce;
            let mut locked = lock_state(&state)?;
            let Some(mut pending) = locked.pending_controller_transfers.remove(&tab_id) else {
                continue;
            };
            if pending.revision != boundary.generation || pending.nonce != nonce {
                locked
                    .pending_controller_transfers
                    .insert(tab_id.clone(), pending);
                continue;
            }
            pending
                .core
                .acknowledge_boundary(boundary.generation, nonce)
                .map_err(|error| error.to_string())?;
            complete_controller_transfer(&mut locked, &tab_id, pending)?;
        } else if kind.message_type == "bridge.session" {
            let (_, session): (_, BridgeSession) = wire::body(&payload)?;
            let mut locked = lock_state(&state)?;
            if let Some(record) = locked
                .registry
                .tabs
                .iter_mut()
                .find(|tab| tab.tab_id == tab_id && !is_utility_tab_id(&tab_id))
            {
                record.session_file = session.file.clone();
                record.session_dir = session
                    .file
                    .as_deref()
                    .and_then(|file| Path::new(file).parent())
                    .map(|path| path.to_string_lossy().into_owned());
                if let Some(name) = session.name.as_deref() {
                    apply_session_name(record, name, session.name_source.as_deref());
                }
            }
            bump_registry_revision(&mut locked.registry);
            let document = locked.registry.clone();
            let registry_store = locked.registry_store.clone();
            drop(locked);
            commit_registry(registry_store, document)?;
            let standby_start = state.lock().ok().and_then(|locked| {
                if locked.standby.is_none() {
                    locked.launches.get(&tab_id).cloned()
                } else {
                    None
                }
            });
            if let Some(start) = standby_start {
                let standby_state = state.clone();
                thread::spawn(move || {
                    let _ = launch_standby(&standby_state, start);
                });
            }
        } else if kind.message_type == "bridge.request" {
            let (_, request): (_, BridgeRequest) = wire::body(&payload)?;
            let accepted = if request.action == "detach" {
                let locked = lock_state(&state)?;
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
                            wire::ResultBody::ok(),
                        )?);
                    }
                    true
                } else {
                    false
                }
            } else if request.action == "close" {
                let authorized = state.lock().ok().is_some_and(|locked| {
                    locked.attachment.current(&tab_id)
                        == Some((request.client_id.as_str(), request.controller_revision))
                });
                if authorized {
                    close_tab(&state, &tab_id, kind.request_id)?
                } else {
                    false
                }
            } else if request.action == "restart" {
                request_child_restart(&state, &tab_id, |locked| {
                    locked.attachment.current(&tab_id)
                        == Some((request.client_id.as_str(), request.controller_revision))
                })?
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
    let mut locked = lock_state(&state)?;
    let removed_current = locked
        .bridges
        .get(&tab_id)
        .is_some_and(|bridge| bridge.incarnation == incarnation);
    if removed_current {
        locked.bridges.remove(&tab_id);
        if locked
            .registry
            .tabs
            .iter()
            .any(|tab| tab.tab_id == tab_id && tab.desired == "running")
            && locked.holders.contains_key(&tab_id)
        {
            counters::record(CounterEvent::BridgeDegraded);
        }
        if locked
            .core
            .bridge_status_sequence(&tab_id)
            .is_some_and(|(seen_incarnation, _)| seen_incarnation == incarnation)
        {
            locked.core.set_bridge_status_sequence(&tab_id, None);
        }
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
    if !removed_current {
        return Ok(());
    }
    if let Some(client_id) = locked
        .pending_controller_transfers
        .get(&tab_id)
        .map(|pending| pending.client_id.clone())
    {
        cancel_controller_transfer(&mut locked, &tab_id, &client_id)?;
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
    let fallback_status = locked
        .registry
        .tabs
        .iter()
        .find(|record| record.tab_id == tab_id)
        .map_or_else(
            || "idle".to_owned(),
            |record| {
                if record.attention_seq > record.seen_seq {
                    "done-unseen".to_owned()
                } else {
                    match record.lifecycle.as_str() {
                        "running" => "idle".to_owned(),
                        lifecycle => lifecycle.to_owned(),
                    }
                }
            },
        );
    let fallback_surface = locked.surfaces.get_mut(&tab_id).map(|surface| {
        Arc::make_mut(surface).status = fallback_status;
        surface.clone()
    });
    if let Some(surface) = fallback_surface.as_ref() {
        broadcast_tab_status(&locked, surface)?;
    }
    let commit = changed.then(|| {
        bump_registry_revision(&mut locked.registry);
        registry_snapshot(&locked)
    });
    locked.last_activity = std::time::Instant::now();
    drop(locked);
    commit_staged(commit)?;
    Ok(())
}

pub fn encoded_bridge_token(
    credentials: &ProfileCredentials,
    tab_id: &str,
    incarnation: u64,
) -> String {
    BASE64.encode(credentials.derive("bridge", tab_id, incarnation))
}

/// Sends an admitted utility tab's bridge the route its screen shows.
fn offer_utility_route(tx: &Peer, tab_id: &str) -> Result<(), String> {
    if let Some((route, _)) = utility_kind(tab_id) {
        tx.offer_control(wire::frame(
            "bridge.route",
            None,
            serde_json::json!({ "route": route }),
        )?)
        .map_err(str::to_owned)?;
    }
    Ok(())
}

/// Makes an Agent's session name its tab name. Invariant: a user name, from the strip or `/name`,
/// is never replaced by an automatic one; any other valid name replaces the tab name.
pub(super) fn apply_session_name(record: &mut TabRecord, name: &str, source: Option<&str>) {
    let name = name.trim();
    let source = match source.unwrap_or("user") {
        source @ ("default" | "auto" | "user") => source,
        _ => "user",
    };
    let valid =
        !name.is_empty() && name.chars().count() <= 64 && !name.chars().any(char::is_control);
    if valid && !(source == "auto" && record.name_source == "user") {
        record.display_name = name.to_owned();
        record.name_source = source.into();
    }
}
