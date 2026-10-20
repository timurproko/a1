use super::*;

pub(super) fn serve_attach(
    mut stream: endpoint::EndpointStream,
    tx: Peer,
    state: Arc<Mutex<RuntimeState>>,
    profile: std::path::PathBuf,
    requested_tab: Option<String>,
    allow_control: bool,
    terminal_effects: bool,
    structured_surface: bool,
) -> Result<(), String> {
    let client_id = format!("client-{:016x}", rand::random::<u64>());
    let (_controller, startup_notice, initial_surface) = {
        let mut locked = lock_state(&state)?;
        if !client_slot_available(locked.clients.len()) {
            return Err("attached client limit reached".to_owned());
        }
        let viewed_tab = requested_tab
            .filter(|tab_id| locked.registry.tabs.iter().any(|tab| &tab.tab_id == tab_id))
            .unwrap_or_else(|| locked.default_tab());
        let (revision, controller) =
            if allow_control && locked.attachment.current(&viewed_tab).is_none() {
                (
                    locked.attachment.attach(&viewed_tab, client_id.clone())?,
                    true,
                )
            } else {
                (
                    locked
                        .attachment
                        .current(&viewed_tab)
                        .map_or(0, |(_, revision)| revision),
                    false,
                )
            };
        // Protocol: admission must precede every surface or notice; queue it before the client
        // becomes visible to holders whose surface offers wake this writer immediately.
        tx.offer_control(wire::frame(
            "attached",
            None,
            BridgeAttachment {
                client_id: client_id.clone(),
                controller_revision: revision,
            },
        )?)
        .map_err(str::to_owned)?;
        locked.clients.insert(
            client_id.clone(),
            ClientSession {
                peer: tx.clone(),
                viewed_tab: viewed_tab.clone(),
                controller,
                controller_revision: revision,
                terminal_effects,
                structured_surface,
                view_generation: 1,
            },
        );
        refresh_surface_subscription(&locked, &viewed_tab)?;
        offer_bridge_visibility(&locked, &viewed_tab, true)?;
        if let Some(shortcuts) = locked.shortcuts.clone() {
            let _ = tx.offer_control(wire::frame("tabs.shortcuts", None, shortcuts)?);
        }
        let initial_surface = locked.surfaces.get(&viewed_tab).cloned();
        if controller && let Some(bridge) = locked.bridges.get(&viewed_tab) {
            let _ = bridge.peer.offer_control(wire::frame(
                "attachment",
                None,
                BridgeAttachment {
                    client_id: client_id.clone(),
                    controller_revision: revision,
                },
            )?);
        }
        let startup_notice = locked
            .startup_notice
            .clone()
            .or_else(|| locked.registry_store.failure());
        (controller, startup_notice, initial_surface)
    };
    if let Some(surface) = initial_surface {
        let mut surface = surface.as_ref().clone();
        surface.stale = true;
        tx.offer_surface(wire::frame(
            "surface",
            None,
            surface_for_client(surface, structured_surface, 1)?,
        )?);
    }
    if let Some(message) = startup_notice {
        tx.offer_control(wire::frame(
            "recovery.notice",
            None,
            wire::ResultBody::accepted(message),
        )?)
        .map_err(str::to_owned)?;
    }
    // Invariant: once attach start returns, this loop reads the client's input and never waits on
    // tab lifecycle work; tab starts, stops, and registry commits run in order on the client's
    // lifecycle worker.
    let (lifecycle_tx, lifecycle_rx) = mpsc::sync_channel::<LifecycleRequest>(LIFECYCLE_QUEUE);
    thread::spawn({
        let state = state.clone();
        let profile = profile.clone();
        let tx = tx.clone();
        let client_id = client_id.clone();
        move || run_lifecycle_worker(lifecycle_rx, state, profile, tx, client_id)
    });
    while let Some(payload) = wire::read_payload(&mut stream)? {
        let kind = wire::kind(&payload)?;
        match kind.message_type.as_str() {
            // Protocol: attach start completes before the client's first tab list is answered,
            // so that list already holds the tab it started. It runs before the terminal views
            // any tab, and its start-slot wait is bounded, so no tab's input waits on it.
            "attach.start" => {
                let request = LifecycleRequest {
                    message_type: kind.message_type.clone(),
                    request_id: kind.request_id,
                    payload,
                };
                if let Err(error) = handle_lifecycle(&state, &profile, &tx, &client_id, &request) {
                    let message = lifecycle_failure_message(&request.message_type, &error);
                    refuse_lifecycle(&tx, &request, message);
                }
            }
            "tab.create" | "tab.close" | "tab.restart" | "tab.rename" | "tab.reorder" => {
                enqueue_lifecycle(
                    &state,
                    &lifecycle_tx,
                    &tx,
                    &client_id,
                    LifecycleRequest {
                        message_type: kind.message_type.clone(),
                        request_id: kind.request_id,
                        payload,
                    },
                )?;
            }
            "tab.list" => {
                let (revision, tabs) = {
                    let locked = lock_state(&state)?;
                    let mut tabs = locked
                        .registry
                        .tabs
                        .iter()
                        .filter(|tab| tab.desired != "stopped")
                        .map(|tab| TabSummary {
                            tab_id: tab.tab_id.clone(),
                            name: tab.display_name.clone(),
                            name_source: tab.name_source.clone(),
                            lifecycle: tab.lifecycle.clone(),
                            cwd: tab.cwd.clone(),
                        })
                        .collect::<Vec<_>>();
                    tabs.sort_by_key(|tab| {
                        locked
                            .registry
                            .tabs
                            .iter()
                            .find(|record| record.tab_id == tab.tab_id)
                            .map_or(u32::MAX, |record| record.order)
                    });
                    (locked.registry.registry_revision, tabs)
                };
                tx.offer_control(wire::frame(
                    "tab.list",
                    kind.request_id,
                    TabList { revision, tabs },
                )?)
                .map_err(str::to_owned)?;
            }
            "tab.open-settings" => {
                let (_, create): (_, TabCreate) = wire::body(&payload)?;
                let (settings_tab_id, should_start) = {
                    let mut locked = lock_state(&state)?;
                    let existing = locked
                        .registry
                        .tabs
                        .iter()
                        .find(|tab| is_settings_tab_id(&tab.tab_id) && tab.desired != "stopped")
                        .map(|tab| tab.tab_id.clone())
                        .or_else(|| {
                            locked
                                .holders_starting
                                .iter()
                                .find(|tab_id| is_settings_tab_id(tab_id))
                                .cloned()
                        });
                    if let Some(tab_id) = existing {
                        (tab_id, false)
                    } else {
                        let tab_id = format!("{SETTINGS_TAB_PREFIX}{:016x}", rand::random::<u64>());
                        let inserted = locked.holders_starting.insert(tab_id.clone());
                        (tab_id, inserted)
                    }
                };
                if should_start {
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
                    if let Err(error) =
                        start_holder(&profile, &state, settings_tab_id.clone(), start)
                    {
                        if let Ok(mut locked) = state.lock() {
                            locked.holders_starting.remove(&settings_tab_id);
                        }
                        return Err(error);
                    }
                }
                tx.offer_control(wire::frame(
                    if should_start {
                        "tab.created"
                    } else {
                        "tab.selected"
                    },
                    kind.request_id,
                    TabTarget {
                        tab_id: settings_tab_id,
                    },
                )?)
                .map_err(str::to_owned)?;
            }
            "tab.view" => {
                let (_, target): (_, ViewTarget) = wire::body(&payload)?;
                let mut locked = lock_state(&state)?;
                if !locked
                    .registry
                    .tabs
                    .iter()
                    .any(|tab| tab.tab_id == target.tab_id)
                {
                    continue;
                }
                let seen = locked.surfaces.get_mut(&target.tab_id).and_then(|surface| {
                    if surface.status == "done-unseen" {
                        Arc::make_mut(surface).status = "idle".into();
                        Some(surface.clone())
                    } else {
                        None
                    }
                });
                if let Some(surface) = seen.as_ref() {
                    broadcast_tab_status(&locked, surface)?;
                }
                let seen_changed = locked
                    .registry
                    .tabs
                    .iter_mut()
                    .find(|tab| tab.tab_id == target.tab_id)
                    .is_some_and(|tab| mark_seen(tab.attention_seq, &mut tab.seen_seq));
                let status_persist = if seen_changed {
                    bump_registry_revision(&mut locked.registry);
                    plan_status_persist(&mut locked, &target.tab_id)
                } else {
                    None
                };
                let previous = locked.clients.get(&client_id).map(|client| {
                    (
                        client.viewed_tab.clone(),
                        client.controller,
                        client.controller_revision,
                    )
                });
                if let Some((previous_tab, _, _)) = previous.as_ref()
                    && previous_tab != &target.tab_id
                {
                    cancel_controller_transfer(&mut locked, previous_tab, &client_id)?;
                }
                if let Some((previous_tab, true, previous_revision)) = previous.as_ref() {
                    locked
                        .attachment
                        .detach(previous_tab, &client_id, *previous_revision);
                }
                let next_revision =
                    if allow_control && locked.attachment.current(&target.tab_id).is_none() {
                        Some(
                            locked
                                .attachment
                                .attach(&target.tab_id, client_id.clone())?,
                        )
                    } else {
                        None
                    };
                let (view_generation, client_structured) =
                    if let Some(client) = locked.clients.get_mut(&client_id) {
                        client.viewed_tab = target.tab_id.clone();
                        client.controller = next_revision.is_some();
                        client.controller_revision = next_revision.unwrap_or(0);
                        client.view_generation = target
                            .request_generation
                            .max(client.view_generation.saturating_add(1));
                        (client.view_generation, client.structured_surface)
                    } else {
                        continue;
                    };
                if let Some((previous_tab, _, _)) = previous.as_ref()
                    && previous_tab != &target.tab_id
                {
                    if !is_viewed(&locked, previous_tab) {
                        offer_bridge_visibility(&locked, previous_tab, false)?;
                    }
                    refresh_surface_subscription(&locked, previous_tab)?;
                }
                refresh_surface_subscription(&locked, &target.tab_id)?;
                offer_bridge_visibility(&locked, &target.tab_id, true)?;
                // Protocol: the retained surface is offered at once so a view can commit even
                // when the holder is slow, but it is marked stale so the client prefers the
                // fresh frame the new subscription produces. Keep only an Arc under the routing
                // lock; fallback reconstruction and encoding happen after it is released.
                let stale_surface = locked.surfaces.get(&target.tab_id).cloned();
                if let Some(controller_revision) = next_revision
                    && let Some(bridge) = locked.bridges.get(&target.tab_id)
                {
                    let _ = bridge.peer.offer_control(wire::frame(
                        "attachment",
                        None,
                        BridgeAttachment {
                            client_id: client_id.clone(),
                            controller_revision,
                        },
                    )?);
                }
                drop(locked);
                if let Some(surface) = stale_surface {
                    let mut surface = surface.as_ref().clone();
                    surface.stale = true;
                    tx.offer_surface(wire::frame(
                        "surface",
                        None,
                        surface_for_client(surface, client_structured, view_generation)?,
                    )?);
                }
                if let Some(delay) = status_persist {
                    persist_status_after(state.clone(), target.tab_id, delay);
                }
            }
            "tab.claimInput" => {
                let claim = {
                    let mut locked = lock_state(&state)?;
                    claim_client_control(&mut locked, &client_id, allow_control)?
                };
                if let Some((peer, attachment)) = claim.attachment {
                    let _ = peer.offer_control(wire::frame("attachment", None, attachment)?);
                }
                tx.offer_control(wire::frame(
                    "tab.inputClaimed",
                    kind.request_id,
                    wire::ResultBody::ok(),
                )?)
                .map_err(str::to_owned)?;
            }
            "paste.start" | "input" | "input.event" | "resize" => {
                // Protocol: a semantic event is validated before it is attributed so a malformed
                // frame never reaches a holder or claims control.
                let semantic = kind.message_type == "input.event";
                let semantic_body = if semantic {
                    let (_, body): (_, protocol::SemanticInput) = wire::body(&payload)?;
                    if protocol::validate_input_event(&body.event).is_err() {
                        tx.offer_control(wire::frame(
                            "input.rejected",
                            kind.request_id,
                            wire::ResultBody::refused(INPUT_REJECTED_MALFORMED.into()),
                        )?)
                        .map_err(str::to_owned)?;
                        continue;
                    }
                    Some(body)
                } else {
                    None
                };
                let rejection = {
                    let mut locked = lock_state(&state)?;
                    let claim = if kind.message_type == "resize" {
                        ControlClaim {
                            attachment: None,
                            pending: false,
                        }
                    } else {
                        claim_client_control(&mut locked, &client_id, allow_control)?
                    };
                    if let Some((peer, attachment)) = claim.attachment {
                        let _ = peer.offer_control(wire::frame("attachment", None, attachment)?);
                    }
                    let viewed_tab = locked
                        .clients
                        .get(&client_id)
                        .map(|client| client.viewed_tab.clone());
                    let epoch = locked.registry.epoch;
                    let frame = match kind.message_type.as_str() {
                        "paste.start" => {
                            let (_, mut body): (_, PasteStart) = wire::body(&payload)?;
                            body.epoch = epoch;
                            wire::frame("paste.start", kind.request_id, body)?
                        }
                        "input" => {
                            let (_, mut body): (_, Input) = wire::body(&payload)?;
                            body.epoch = epoch;
                            wire::frame("input", kind.request_id, body)?
                        }
                        "input.event" => {
                            let mut body = semantic_body.expect("validated semantic body");
                            body.epoch = epoch;
                            wire::frame("input.event", kind.request_id, body)?
                        }
                        _ => {
                            let (_, mut body): (_, Resize) = wire::body(&payload)?;
                            body.epoch = epoch;
                            wire::frame("resize", kind.request_id, body)?
                        }
                    };
                    if claim.pending {
                        let held = viewed_tab
                            .as_ref()
                            .and_then(|tab_id| locked.pending_controller_transfers.get_mut(tab_id))
                            .filter(|pending| pending.client_id == client_id)
                            .is_some_and(|pending| {
                                let Some(total) = pending.held_bytes.checked_add(frame.len())
                                else {
                                    return false;
                                };
                                if total > 1024 * 1024 {
                                    return false;
                                }
                                pending.held_bytes = total;
                                pending.held_frames.push(frame);
                                true
                            });
                        (!held).then_some(INPUT_REJECTED_READ_ONLY)
                    } else {
                        let holder = viewed_tab.as_ref().and_then(|tab_id| {
                            locked
                                .clients
                                .get(&client_id)
                                .filter(|client| client.controller)
                                .and_then(|_| locked.holders.get(tab_id))
                        });
                        match holder {
                            None => Some(INPUT_REJECTED_READ_ONLY),
                            // Compatibility: an older same-generation holder cannot encode
                            // semantic events; the client re-sends the event as bytes.
                            Some(holder) if semantic && !holder.semantic_input => {
                                Some(INPUT_REJECTED_LEGACY_HOLDER)
                            }
                            Some(holder) => holder
                                .peer
                                .offer_control(frame)
                                .err()
                                .map(|_| INPUT_REJECTED_READ_ONLY),
                        }
                    }
                };
                if let Some(message) = rejection {
                    tx.offer_control(wire::frame(
                        "input.rejected",
                        kind.request_id,
                        wire::ResultBody::refused(message.into()),
                    )?)
                    .map_err(str::to_owned)?;
                }
            }
            "detach" => break,
            _ => {}
        }
    }
    let mut locked = lock_state(&state)?;
    if let Some(session) = locked.clients.remove(&client_id) {
        if session.controller {
            locked
                .attachment
                .detach(&session.viewed_tab, &client_id, session.controller_revision);
        }
        cancel_controller_transfer(&mut locked, &session.viewed_tab, &client_id)?;
        if let Some(holder) = locked.holders.get(&session.viewed_tab) {
            let subscription = desired_surface_subscription(
                &locked,
                &session.viewed_tab,
                holder.structured_surface,
            );
            let _ =
                holder
                    .peer
                    .offer_control(wire::frame("surface.subscription", None, subscription)?);
        }
    }
    locked.last_activity = std::time::Instant::now();
    Ok(())
}
