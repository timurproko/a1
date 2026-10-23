use super::*;

// Platform: the causal boundary travels through the PTY, which Windows ConPTY may filter; an
// unacknowledged boundary releases held input after this bound instead of holding it forever.
pub(super) const CONTROLLER_BOUNDARY_TIMEOUT: std::time::Duration =
    std::time::Duration::from_secs(1);

/// Grants control to the pending client and releases its held input once the boundary settles.
pub(super) fn complete_controller_transfer(
    locked: &mut RuntimeState,
    tab_id: &str,
    pending: PendingControllerTransfer,
) -> Result<(), String> {
    if locked.attachment.current(tab_id) != Some((pending.client_id.as_str(), pending.revision)) {
        return Ok(());
    }
    let Some(client) = locked.clients.get_mut(&pending.client_id) else {
        return Ok(());
    };
    client.controller = true;
    client.controller_revision = pending.revision;
    if let Some(bridge) = locked.bridges.get(tab_id) {
        let _ = bridge.peer.offer_control(wire::frame(
            "attachment",
            None,
            BridgeAttachment::new(pending.client_id, pending.revision),
        )?);
    }
    refresh_surface_subscription(locked, tab_id)?;
    if let Some(holder) = locked.holders.get(tab_id) {
        for frame in pending.held_frames {
            holder.peer.offer_control(frame).map_err(str::to_owned)?;
        }
    }
    Ok(())
}

pub(super) fn expire_controller_boundaries(locked: &mut RuntimeState) {
    let expired = locked
        .pending_controller_transfers
        .iter()
        .filter(|(_, pending)| pending.started.elapsed() >= CONTROLLER_BOUNDARY_TIMEOUT)
        .map(|(tab_id, _)| tab_id.clone())
        .collect::<Vec<_>>();
    for tab_id in expired {
        if let Some(pending) = locked.pending_controller_transfers.remove(&tab_id) {
            let _ = complete_controller_transfer(locked, &tab_id, pending);
        }
    }
}

pub(super) fn claim_client_control(
    locked: &mut RuntimeState,
    client_id: &str,
    allow_control: bool,
) -> Result<ControlClaim, String> {
    if !allow_control {
        return Ok(ControlClaim {
            attachment: None,
            pending: false,
        });
    }
    let Some(viewed_tab) = locked
        .clients
        .get(client_id)
        .map(|client| client.viewed_tab.clone())
    else {
        return Ok(ControlClaim {
            attachment: None,
            pending: false,
        });
    };
    if locked
        .clients
        .get(client_id)
        .is_some_and(|client| client.controller)
    {
        return Ok(ControlClaim {
            attachment: None,
            pending: false,
        });
    }
    if let Some(pending) = locked.pending_controller_transfers.get(&viewed_tab) {
        return Ok(ControlClaim {
            attachment: None,
            pending: pending.client_id == client_id,
        });
    }
    let previous = locked
        .attachment
        .current(&viewed_tab)
        .map(|(id, revision)| (id.to_owned(), revision));
    let revision = locked
        .attachment
        .transfer(&viewed_tab, client_id.to_owned());
    if let Some((previous_id, _)) = previous.as_ref()
        && let Some(client) = locked.clients.get_mut(previous_id)
    {
        client.controller = false;
        client.controller_revision = 0;
        let _ =
            client
                .peer
                .offer_control(wire::frame("viewer.status", None, wire::ResultBody::ok())?);
    }
    // Concurrency: revoke one-shot effect authority before beginning a controller handoff. Visual
    // subscriptions remain independent and may stay active for both viewers.
    refresh_surface_subscription(locked, &viewed_tab)?;
    let can_boundary = previous.is_some()
        && locked.holders.contains_key(&viewed_tab)
        && locked
            .bridges
            .get(&viewed_tab)
            .is_some_and(|bridge| bridge.controller_boundary);
    if can_boundary {
        let old_revision = previous.as_ref().map_or(0, |(_, revision)| *revision);
        let nonce = rand::random::<[u8; 16]>();
        let mut core = crate::controller::ControllerCore::new(old_revision);
        core.freeze(old_revision, revision)
            .map_err(|error| error.to_string())?;
        core.begin_drain().map_err(|error| error.to_string())?;
        let _ = core
            .write_boundary(nonce)
            .map_err(|error| error.to_string())?;
        let holder = locked
            .holders
            .get(&viewed_tab)
            .expect("checked holder")
            .peer
            .clone();
        holder
            .offer_control(wire::frame(
                "controller-boundary",
                None,
                protocol::ControllerBoundary {
                    generation: revision,
                    nonce,
                },
            )?)
            .map_err(str::to_owned)?;
        locked.pending_controller_transfers.insert(
            viewed_tab,
            PendingControllerTransfer {
                client_id: client_id.to_owned(),
                revision,
                previous_client_id: previous.as_ref().map(|(id, _)| id.clone()),
                nonce,
                core,
                held_frames: Vec::new(),
                held_bytes: 0,
                started: std::time::Instant::now(),
            },
        );
        if let Some(client) = locked.clients.get_mut(client_id) {
            client.controller = false;
            client.controller_revision = revision;
        }
        return Ok(ControlClaim {
            attachment: None,
            pending: true,
        });
    }
    if let Some(client) = locked.clients.get_mut(client_id) {
        client.controller = true;
        client.controller_revision = revision;
    }
    refresh_surface_subscription(locked, &viewed_tab)?;
    Ok(ControlClaim {
        attachment: locked.bridges.get(&viewed_tab).map(|bridge| {
            (
                bridge.peer.clone(),
                BridgeAttachment::new(client_id, revision),
            )
        }),
        pending: false,
    })
}

pub(super) fn cancel_controller_transfer(
    locked: &mut RuntimeState,
    tab_id: &str,
    client_id: &str,
) -> Result<(), String> {
    let Some(mut pending) = locked.pending_controller_transfers.remove(tab_id) else {
        return Ok(());
    };
    if pending.client_id != client_id {
        locked
            .pending_controller_transfers
            .insert(tab_id.to_owned(), pending);
        return Ok(());
    }
    let _ = pending.core.cancel_transfer();
    if let Some(previous) = pending
        .previous_client_id
        .filter(|previous| locked.clients.contains_key(previous))
    {
        let revision = locked.attachment.transfer(tab_id, previous.clone());
        if let Some(client) = locked.clients.get_mut(&previous) {
            client.controller = true;
            client.controller_revision = revision;
        }
        if let Some(bridge) = locked.bridges.get(tab_id) {
            let _ = bridge.peer.offer_control(wire::frame(
                "attachment",
                None,
                BridgeAttachment::new(previous, revision),
            )?);
        }
    } else {
        locked
            .attachment
            .detach(tab_id, client_id, pending.revision);
    }
    refresh_surface_subscription(locked, tab_id)?;
    Ok(())
}
