//! A view is committed before it can accept input. No queued event is retargeted or replayed.
use super::*;

pub(super) struct Pending {
    pub ticket: u64,
    destination: usize,
    id: String,
    generation: u64,
    ready: bool,
    frame: Envelope,
    resize: Option<Envelope>,
    input: Vec<Envelope>,
    bytes: usize,
}
impl Pending {
    fn observes(&self, index: usize, frame: &Envelope) -> bool {
        self.destination == index
            && self.ready
            && frame.body.get("tabId").and_then(Value::text) == Some(self.id.as_str())
            && number(frame.body.get("requestGeneration")) == self.generation
    }
}
fn number(value: Option<&Value>) -> u64 {
    match value {
        Some(Value::U64(value)) => *value,
        Some(Value::I64(value)) if *value >= 0 => *value as u64,
        _ => 0,
    }
}
fn surface_matches(id: Option<&str>, generation: Option<u64>, frame: &Envelope) -> bool {
    id.is_none_or(|id| frame.body.get("tabId").and_then(Value::text) == Some(id))
        && generation
            .is_none_or(|generation| number(frame.body.get("requestGeneration")) == generation)
}
impl Context {
    pub(super) fn accepts_surface(&self, index: usize, frame: &Envelope) -> bool {
        if let Some(pending) = &self.pending {
            return pending.observes(index, frame);
        }
        surface_matches(
            self.model.viewed.as_deref(),
            self.routing
                .views
                .get(&index)
                .map(|view| number(view.body.get("request_generation"))),
            frame,
        )
    }
    pub(super) fn stage_view(
        &mut self,
        index: usize,
        id: String,
        frame: Envelope,
    ) -> Result<(), String> {
        self.routing.admitted = false;
        if self
            .pending
            .take()
            .is_some_and(|pending| !pending.input.is_empty())
        {
            self.refused("Previous view was superseded; its queued input was not delivered.")?;
        }
        self.view_ticket = self
            .view_ticket
            .checked_add(1)
            .ok_or("view ticket exhausted")?;
        let ticket = self.view_ticket;
        let generation = number(frame.body.get("request_generation"));
        let snapshot = (!self.model.layout.tabs.iter().any(|tab| tab.id == id)).then_some(index);
        if !self.save(
            Some(id.clone()),
            self.model.order.clone(),
            snapshot,
            Some(ticket),
        )? {
            return self.refused("View was not admitted; input was not delivered.");
        }
        self.routing.active = index;
        self.routing.signal.store(index, Ordering::Release);
        self.model.viewed = Some(id.clone());
        if let Some(kind) = crate::core::tab_bar::TabKind::of(&id) {
            self.model.utilities.insert(kind, id.clone());
        }
        self.routing.views.insert(index, frame.clone());
        self.pending = Some(Pending {
            ticket,
            destination: index,
            id,
            generation,
            ready: false,
            frame,
            resize: None,
            input: vec![],
            bytes: 0,
        });
        Ok(())
    }
    pub(super) fn view_saved(&mut self, ticket: u64) -> Result<(), String> {
        let Some(pending) = self
            .pending
            .as_mut()
            .filter(|pending| pending.ticket == ticket)
        else {
            return Ok(());
        };
        let index = pending.destination;
        if !self.sources[index].connected {
            self.pending = None;
            return self.uncertain(None);
        }
        pending.ready = true;
        self.routing.views.insert(index, pending.frame.clone());
        send_value(&mut self.sources[index].writer, &pending.frame)?;
        if let Some(resize) = &pending.resize {
            send_value(&mut self.sources[index].writer, resize)?;
        }
        Ok(())
    }
    pub(super) fn hold_input(&mut self, frame: &Envelope) -> Result<bool, String> {
        let Some(pending) = self.pending.as_mut() else {
            return Ok(false);
        };
        if frame.message_type == "resize" {
            pending.resize = Some(frame.clone());
            return Ok(true);
        }
        if !matches!(
            frame.message_type.as_str(),
            "input" | "input.event" | "paste.start"
        ) {
            return Ok(false);
        }
        let size = protocol::encode_frame(frame)
            .map_err(|error| error.to_string())?
            .len();
        if pending.input.len() >= 1024
            || pending.bytes.saturating_add(size) > protocol::MAX_FRAME_BYTES
        {
            self.pending = None;
            self.refused("Pending view input exceeded its bound and was not delivered.")?;
        } else {
            pending.bytes += size;
            pending.input.push(frame.clone());
        }
        Ok(true)
    }
    pub(super) fn view_observed(&mut self, index: usize, frame: &Envelope) -> Result<(), String> {
        let Some(pending) = &self.pending else {
            return Ok(());
        };
        if !pending.observes(index, frame) {
            return Ok(());
        }
        let pending = self.pending.take().unwrap();
        self.routing.admitted = true;
        for input in pending.input {
            if send_value(&mut self.sources[index].writer, &input).is_err() {
                self.uncertain(input.request_id)?;
                break;
            }
        }
        Ok(())
    }
    /// Restore observation only. Input stays fenced until the exact restored view is observed.
    pub(super) fn restore_view(&mut self, index: usize) -> Result<(), String> {
        let resize = self.routing.resizes.get(&index).cloned();
        if index == self.routing.active {
            self.routing.admitted = false;
            let Some(id) = self.model.viewed.clone() else {
                return Ok(());
            };
            let Some((destination, raw)) = routing::target(&self.sources, &id) else {
                return Ok(());
            };
            if destination != index {
                return Ok(());
            }
            let mut frame = match self.routing.views.get(&index) {
                Some(frame) => frame.clone(),
                None => protocol::decode_frame(&wire::frame(
                    "tab.view",
                    None,
                    wire::ViewTarget {
                        tab_id: raw.clone(),
                        request_generation: 0,
                        resize: None,
                    },
                )?)
                .map_err(|error| error.to_string())?,
            };
            frame.body.set_text("tab_id", raw);
            self.stage_view(index, id, frame)?;
            if let Some(resize) = resize {
                self.hold_input(&resize)?;
            }
        } else {
            if let Some(view) = self.routing.views.get(&index) {
                send_value(&mut self.sources[index].writer, view)?;
            }
            if let Some(resize) = resize {
                send_value(&mut self.sources[index].writer, &resize)?;
            }
        }
        Ok(())
    }
    pub(super) fn cancel_closed_view(&mut self) -> Result<(), String> {
        if self
            .pending
            .as_ref()
            .is_some_and(|pending| routing::target(&self.sources, &pending.id).is_none())
        {
            self.pending = None;
            self.refused("Requested view closed; its queued input was not delivered.")?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn input_waits_for_the_exact_ready_source_tab_and_view_generation() {
        let frame = |id: &str, generation: u64| {
            protocol::decode_frame::<Envelope>(
                &wire::frame(
                    "surface",
                    None,
                    serde_json::json!({"tabId":id,"requestGeneration":generation}),
                )
                .unwrap(),
            )
            .unwrap()
        };
        let mut pending = Pending {
            ticket: 1,
            destination: 2,
            id: "requested".into(),
            generation: 7,
            ready: false,
            frame: frame("requested", 7),
            resize: None,
            input: vec![],
            bytes: 0,
        };
        assert!(!pending.observes(2, &frame("requested", 7)));
        pending.ready = true;
        assert!(!pending.observes(1, &frame("requested", 7)));
        assert!(!pending.observes(2, &frame("previous", 7)));
        assert!(!pending.observes(2, &frame("requested", 6)));
        assert!(!pending.observes(2, &frame("requested", 8)));
        assert!(pending.observes(2, &frame("requested", 7)));
    }
    #[test]
    fn committed_surface_fences_late_other_tabs_and_old_or_future_generations() {
        let frame = |tab: &str, generation: u64| {
            protocol::decode_frame::<Envelope>(
                &wire::frame(
                    "surface",
                    None,
                    serde_json::json!({"tabId":tab,"requestGeneration":generation}),
                )
                .unwrap(),
            )
            .unwrap()
        };
        assert!(surface_matches(
            Some("settings"),
            Some(4),
            &frame("settings", 4)
        ));
        assert!(!surface_matches(
            Some("settings"),
            Some(4),
            &frame("agent", 4)
        ));
        assert!(!surface_matches(
            Some("settings"),
            Some(4),
            &frame("settings", 3)
        ));
        assert!(!surface_matches(
            Some("settings"),
            Some(4),
            &frame("settings", 5)
        ));
    }
    #[test]
    fn view_generation_is_read_from_the_frozen_snake_case_request_field() {
        let frame = wire::frame(
            "tab.view",
            Some(3),
            wire::ViewTarget {
                tab_id: "tab".into(),
                request_generation: 17,
                resize: None,
            },
        )
        .unwrap();
        let value: Envelope = protocol::decode_frame(&frame).unwrap();
        assert_eq!(value.body.get("tab_id").and_then(Value::text), Some("tab"));
        assert_eq!(number(value.body.get("request_generation")), 17);
        assert!(value.body.get("tabId").is_none());
    }
}
