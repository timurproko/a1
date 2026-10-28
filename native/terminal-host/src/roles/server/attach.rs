use super::*;

fn attach_admission(
    tabs: &[TabRecord],
    viewed_tab: &str,
    client_id: &str,
    controller_revision: u64,
    registry_revision: u64,
) -> BridgeAttachment {
    // Invariant: an empty registry has only a provisional default, and a stopped record is no
    // better. Let the first real surface choose the view after attach.start creates the tab
    // instead of pinning an absent or exited tab.
    let mut admission = if tabs
        .iter()
        .any(|tab| tab.tab_id == viewed_tab && tab.desired != "stopped")
    {
        BridgeAttachment::selected(client_id, controller_revision, viewed_tab.to_owned())
    } else {
        BridgeAttachment::new(client_id, controller_revision)
    };
    let mut listed = tabs
        .iter()
        .filter(|tab| tab.desired != "stopped")
        .collect::<Vec<_>>();
    listed.sort_by_key(|tab| tab.order);
    if !listed.is_empty() {
        admission.initial_tabs = Some(protocol::InitialTabs {
            revision: registry_revision,
            tabs: listed
                .into_iter()
                .map(|tab| protocol::InitialTab {
                    tab_id: tab.tab_id.clone(),
                    name: tab.display_name.clone(),
                    name_source: tab.name_source.clone(),
                    lifecycle: tab.lifecycle.clone(),
                    cwd: tab.cwd.clone(),
                })
                .collect(),
        });
    }
    admission
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn readonly_resize_is_ignored_without_triggering_input_claim() {
        assert_eq!(unroutable_input_rejection("resize"), None);
        assert_eq!(
            unroutable_input_rejection("input"),
            Some(INPUT_REJECTED_READ_ONLY)
        );
    }

    #[test]
    fn background_resize_only_targets_hidden_unclaimed_tabs() {
        assert!(background_resize_eligible(
            "tab-hidden",
            "tab-selected",
            false,
            false
        ));
        assert!(!background_resize_eligible(
            "tab-selected",
            "tab-selected",
            true,
            true
        ));
        assert!(!background_resize_eligible(
            "tab-viewed",
            "tab-selected",
            true,
            false
        ));
        assert!(!background_resize_eligible(
            "tab-controlled",
            "tab-selected",
            false,
            true
        ));
    }

    #[test]
    fn activation_queues_resize_before_surface_subscription() {
        let frames = activation_holder_frames(
            Some(Resize {
                columns: 132,
                rows: 40,
                epoch: 0,
                geometry_generation: 9,
            }),
            4,
            wire::SurfaceSubscription {
                enabled: true,
                effects: true,
                structured: true,
                legacy: false,
            },
        )
        .unwrap();
        let resize: protocol::Envelope<Resize> = protocol::decode_frame(&frames[0]).unwrap();
        let subscription: protocol::Envelope<wire::SurfaceSubscription> =
            protocol::decode_frame(&frames[1]).unwrap();
        assert_eq!(resize.message_type, "resize");
        assert_eq!(resize.body.epoch, 4);
        assert_eq!(subscription.message_type, "surface.subscription");

        let geometry = HolderGeometry {
            incarnation: 3,
            columns: 132,
            rows: 40,
        };
        assert!(holder_geometry_matches(Some(&geometry), 3, &resize.body));
        let prefitted = activation_holder_frames(None, 4, subscription.body).unwrap();
        assert_eq!(prefitted.len(), 1);
        let subscription: protocol::Envelope<wire::SurfaceSubscription> =
            protocol::decode_frame(&prefitted[0]).unwrap();
        assert_eq!(subscription.message_type, "surface.subscription");
    }

    #[test]
    fn admission_selects_only_a_registered_tab() {
        assert_eq!(
            attach_admission(&[], "tab-1", "client", 1, 2).selected_tab,
            None
        );
        let tab = super::super::tests::record("tab-1", 1, "running", None);
        let admission = attach_admission(&[tab], "tab-1", "client", 1, 2);
        assert_eq!(admission.selected_tab.as_deref(), Some("tab-1"));
        let initial = admission.initial_tabs.expect("registered tab snapshot");
        assert_eq!(initial.revision, 2);
        assert_eq!(initial.tabs[0].tab_id, "tab-1");
        // Invariant: a stopped record is as provisional as no record; attach.start replaces it.
        let stopped = super::super::tests::record("tab-1", 1, "stopped", None);
        let admission = attach_admission(&[stopped], "tab-1", "client", 1, 3);
        assert_eq!(admission.selected_tab, None);
        assert!(admission.initial_tabs.is_none());
    }
}

fn unroutable_input_rejection(message_type: &str) -> Option<&'static str> {
    // Invariant: a spectator's geometry never controls the shared child. Unlike typed input,
    // silently ignoring its resize must not make the attach client interpret the refusal as a
    // lost input claim and take control merely because it switched views.
    (message_type != "resize").then_some(INPUT_REJECTED_READ_ONLY)
}

fn background_resize_eligible(
    tab_id: &str,
    selected_tab: &str,
    viewed: bool,
    controlled: bool,
) -> bool {
    tab_id != selected_tab && !viewed && !controlled
}

fn holder_geometry_matches(
    geometry: Option<&HolderGeometry>,
    incarnation: u64,
    resize: &Resize,
) -> bool {
    geometry.is_some_and(|geometry| {
        geometry.incarnation == incarnation
            && geometry.columns == resize.columns
            && geometry.rows == resize.rows
    })
}

fn activation_holder_frames(
    mut resize: Option<Resize>,
    epoch: u64,
    subscription: wire::SurfaceSubscription,
) -> Result<Vec<Vec<u8>>, String> {
    let mut frames = Vec::with_capacity(usize::from(resize.is_some()) + 1);
    if let Some(resize) = resize.as_mut() {
        resize.epoch = epoch;
        frames.push(wire::frame("resize", None, resize.clone())?);
    }
    frames.push(wire::frame("surface.subscription", None, subscription)?);
    Ok(frames)
}

fn activate_target_holder(
    locked: &mut RuntimeState,
    target: &ViewTarget,
    client_id: &str,
    next_revision: Option<u64>,
) -> Result<(), String> {
    if let Some(controller_revision) = next_revision
        && let Some(bridge) = locked.bridges.get(&target.tab_id)
    {
        let _ = bridge.peer.offer_control(wire::frame(
            "attachment",
            None,
            BridgeAttachment::new(client_id.to_owned(), controller_revision),
        )?);
    }
    // Protocol: resize precedes subscription on the holder's ordered control lane, so the first
    // fresh target surface has current geometry; a pre-fitted holder skips redundant PTY reflow.
    let Some(holder) = locked.holders.get(&target.tab_id) else {
        return Ok(());
    };
    let holder_peer = holder.peer.clone();
    let holder_incarnation = holder.incarnation;
    let activation_resize = next_revision
        .and_then(|_| target.resize.clone())
        .filter(|resize| {
            !holder_geometry_matches(
                locked.holder_geometries.get(&target.tab_id),
                holder_incarnation,
                resize,
            )
        });
    let subscription =
        desired_surface_subscription(locked, &target.tab_id, holder.structured_surface);
    let frames = activation_holder_frames(
        activation_resize.clone(),
        locked.registry.epoch,
        subscription,
    )?;
    for (index, frame) in frames.into_iter().enumerate() {
        if holder_peer.offer_control(frame).is_err() {
            break;
        }
        if index == 0
            && let Some(resize) = activation_resize.as_ref()
        {
            locked.holder_geometries.insert(
                target.tab_id.clone(),
                HolderGeometry {
                    incarnation: holder_incarnation,
                    columns: resize.columns,
                    rows: resize.rows,
                },
            );
        }
    }
    Ok(())
}

fn route_controller_resize(
    locked: &mut RuntimeState,
    client_id: &str,
    resize: &Resize,
    frame: &[u8],
) -> Option<&'static str> {
    let (selected_tab, controller) = locked
        .clients
        .get(client_id)
        .map(|client| (client.viewed_tab.clone(), client.controller))?;
    if !controller {
        return None;
    }
    let selected = locked.holders.get(&selected_tab).map(|holder| {
        (
            selected_tab.clone(),
            holder.peer.clone(),
            holder.incarnation,
        )
    });
    let background = locked
        .holders
        .iter()
        .filter(|(tab_id, _)| {
            background_resize_eligible(
                tab_id,
                &selected_tab,
                is_viewed(locked, tab_id),
                locked.attachment.current(tab_id).is_some(),
            )
        })
        .map(|(tab_id, holder)| (tab_id.clone(), holder.peer.clone(), holder.incarnation))
        .collect::<Vec<_>>();
    let selected_rejection = selected.and_then(|(tab_id, holder, incarnation)| {
        if holder.offer_control(frame.to_vec()).is_err() {
            return Some(INPUT_REJECTED_READ_ONLY);
        }
        locked.holder_geometries.insert(
            tab_id,
            HolderGeometry {
                incarnation,
                columns: resize.columns,
                rows: resize.rows,
            },
        );
        None
    });
    // Performance: hidden holders have surface publication disabled, so this reflows retained
    // state in the background without painting any client.
    for (tab_id, holder, incarnation) in background {
        if holder.offer_control(frame.to_vec()).is_ok() {
            locked.holder_geometries.insert(
                tab_id,
                HolderGeometry {
                    incarnation,
                    columns: resize.columns,
                    rows: resize.rows,
                },
            );
        }
    }
    selected_rejection
}

fn registry_tab_list(registry: &RegistryDocument) -> TabList {
    let mut records = registry
        .tabs
        .iter()
        .filter(|tab| tab.desired != "stopped")
        .collect::<Vec<_>>();
    records.sort_by_key(|tab| tab.order);
    TabList {
        revision: registry.registry_revision,
        tabs: records
            .into_iter()
            .map(|tab| TabSummary {
                tab_id: tab.tab_id.clone(),
                name: tab.display_name.clone(),
                name_source: tab.name_source.clone(),
                lifecycle: tab.lifecycle.clone(),
                cwd: tab.cwd.clone(),
            })
            .collect(),
    }
}

/// Reserves the singleton utility process with this id prefix. Only revealing it, not prewarming
/// it, restores its last live position; selecting an already visible tab bypasses this request entirely.
fn reserve_utility_tab(
    state: &Arc<Mutex<RuntimeState>>,
    kind: TabKind,
    opening: bool,
) -> Result<(String, bool, Option<(RegistryStore, RegistryDocument)>), String> {
    let prefix = kind.id_prefix();
    let mut locked = lock_state(state)?;
    let existing = locked
        .registry
        .tabs
        .iter()
        .find(|tab| tab.tab_id.starts_with(prefix) && tab.desired != "stopped")
        .map(|tab| tab.tab_id.clone())
        .or_else(|| {
            locked
                .core
                .starting_tabs()
                .find(|tab_id| tab_id.starts_with(prefix))
                .map(str::to_owned)
        });
    if let Some(tab_id) = existing {
        let reordered = (opening && lifecycle::move_live_tab_last(&mut locked.registry, &tab_id))
            .then(|| registry_snapshot(&locked));
        Ok((tab_id, false, reordered))
    } else {
        let tab_id = format!("{prefix}{:016x}", rand::random::<u64>());
        let inserted = locked.core.set_starting(&tab_id, true);
        Ok((tab_id, inserted, None))
    }
}

/// Opens, reveals, or prewarms a singleton utility tab for a client, as `utility_request` reads
/// its message.
fn open_utility_tab(
    state: &Arc<Mutex<RuntimeState>>,
    profile: &Path,
    tx: &Peer,
    client_id: &str,
    message_type: &str,
    request_id: Option<u64>,
    payload: &[u8],
) -> Result<(), String> {
    let (_, create): (_, TabCreate) = wire::body(payload)?;
    let (kind, opening) =
        utility_request(message_type).ok_or_else(|| "unknown singleton tab request".to_owned())?;
    let (settings_tab_id, should_start, reordered) = reserve_utility_tab(state, kind, opening)?;
    commit_staged(reordered)?;
    if should_start {
        let mut start = AttachStart {
            client_id: client_id.to_owned(),
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
        if let Err(error) = start_holder(profile, state, settings_tab_id.clone(), start, None) {
            if let Ok(mut locked) = state.lock() {
                locked.core.set_starting(&settings_tab_id, false);
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
        request_id,
        TabTarget {
            tab_id: settings_tab_id,
        },
    )?)
    .map_err(str::to_owned)?;
    Ok(())
}

/// Protocol: only this connection can cancel the create with its exact request ID.
pub(super) fn begin_client_create(
    current: &Mutex<Option<(u64, Arc<AtomicBool>)>>,
    kind: &wire::EnvelopeKind,
) -> Option<Arc<AtomicBool>> {
    if kind.message_type != "tab.create" { return None; }
    kind.request_id.map(|id| {
        let flag = Arc::new(AtomicBool::new(false));
        *current.lock().unwrap_or_else(std::sync::PoisonError::into_inner) = Some((id, flag.clone()));
        flag
    })
}

pub(super) fn cancel_client_create(
    current: &Mutex<Option<(u64, Arc<AtomicBool>)>>,
    payload: &[u8],
) -> Result<(), String> {
    let (_, value): (_, serde_json::Value) = wire::body(payload)?;
    if let Some(request_id) = value.get("requestId").and_then(serde_json::Value::as_u64)
        && let Some((id, flag)) = current.lock().unwrap_or_else(std::sync::PoisonError::into_inner).as_ref()
        && *id == request_id
    {
        flag.store(true, Ordering::Release);
    }
    Ok(())
}

/// Protocol: each create's cancellation belongs to its authenticated attach connection.
fn enqueue_attached_lifecycle(
    state: &Arc<Mutex<RuntimeState>>,
    queue: &mpsc::SyncSender<LifecycleRequest>,
    tx: &Peer,
    client_id: &str,
    create_cancel: &Mutex<Option<(u64, Arc<AtomicBool>)>>,
    kind: wire::EnvelopeKind,
    payload: Vec<u8>,
) -> Result<(), String> {
    let cancelled = begin_client_create(create_cancel, &kind);
    enqueue_lifecycle(state, queue, tx, client_id, LifecycleRequest {
        message_type: kind.message_type,
        request_id: kind.request_id,
        payload,
        cancelled,
    })
}

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
            .unwrap_or_else(|| locked.attach_view_tab());
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
        let admission = attach_admission(
            &locked.registry.tabs,
            &viewed_tab,
            &client_id,
            revision,
            locked.registry.registry_revision,
        );
        tx.offer_control(wire::frame("attached", None, admission)?)
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
                BridgeAttachment::new(client_id.clone(), revision),
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
    let create_cancel = Mutex::new(None::<(u64, Arc<AtomicBool>)>);
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
                    cancelled: None,
                };
                if let Err(error) = handle_lifecycle(&state, &profile, &tx, &client_id, &request) {
                    let message = lifecycle_failure_message(&request.message_type, &error);
                    refuse_lifecycle(&tx, &request, message);
                }
            }
            "tab.create" | "tab.close" | "tab.restart" | "tab.rename" | "tab.reorder" => {
                enqueue_attached_lifecycle(&state, &lifecycle_tx, &tx, &client_id, &create_cancel, kind, payload)?;
            }
            "tab.cancel-create" => cancel_client_create(&create_cancel, &payload)?,
            "tab.list" => {
                let list = registry_tab_list(&lock_state(&state)?.registry);
                tx.offer_control(wire::frame("tab.list", kind.request_id, list)?)
                    .map_err(str::to_owned)?;
            }
            message if utility_request(message).is_some() => open_utility_tab(
                &state,
                &profile,
                &tx,
                &client_id,
                &kind.message_type,
                kind.request_id,
                &payload,
            )?,
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
                activate_target_holder(&mut locked, &target, &client_id, next_revision)?;
                offer_bridge_visibility(&locked, &target.tab_id, true)?;
                // Protocol: the retained surface is offered at once so a view can commit even
                // when the holder is slow, but it is marked stale so the client prefers the
                // fresh frame the new subscription produces. Keep only an Arc under the routing
                // lock; fallback reconstruction and encoding happen after it is released.
                let stale_surface = locked.surfaces.get(&target.tab_id).cloned();
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
                    let mut resize_body = None;
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
                            resize_body = Some(body.clone());
                            wire::frame("resize", kind.request_id, body)?
                        }
                    };
                    if let Some(resize) = resize_body {
                        route_controller_resize(&mut locked, &client_id, &resize, &frame)
                    } else if claim.pending {
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
                            None => unroutable_input_rejection(&kind.message_type),
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
