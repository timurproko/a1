//! Authenticated raw IDs are cached separately; caller IDs are never parsed into authority.
use super::*;

pub(super) fn target(sources: &[Source], id: &str) -> Option<(usize, String)> {
    sources.iter().enumerate().find_map(|(index, source)| {
        if !source.tabs.iter().any(|tab| tab.tab_id == id) && !source.created.contains(id) {
            return None;
        }
        source.raw_ids.get(id).map(|raw| (index, raw.clone()))
    })
}
pub(super) fn aggregate(
    sources: &[Source],
    layout: &WorkspaceDocument,
    revision: u64,
) -> wire::TabList {
    let mut tabs = sources
        .iter()
        .flat_map(|source| source.tabs.iter().cloned())
        .collect::<Vec<_>>();
    tabs.sort_by_key(|tab| {
        layout
            .tabs
            .iter()
            .position(|entry| entry.id == tab.tab_id)
            .unwrap_or(usize::MAX)
    });
    wire::TabList { revision, tabs }
}
fn qualify(body: &mut Value, scope: &str) {
    for field in ["tabId", "selectedTab"] {
        if let Some(raw) = body.get(field).and_then(Value::text).map(str::to_owned) {
            body.set_text(field, WorkspaceTab::id_for(scope, &raw));
        }
    }
}
impl Context {
    fn list(&mut self, request: Option<u64>) -> Result<(), String> {
        let mut list = aggregate(&self.sources, &self.model.layout, self.model.revision);
        list.tabs.sort_by_key(|tab| {
            self.model
                .order
                .iter()
                .position(|id| id == &tab.tab_id)
                .unwrap_or(usize::MAX)
        });
        self.model.order = list.tabs.iter().map(|tab| tab.tab_id.clone()).collect();
        wire::send(&mut self.output, "tab.list", request, list)
    }
    fn source_list(&mut self, index: usize, payload: &[u8]) -> Result<(), String> {
        let (request, list): (_, wire::TabList) = wire::body(payload)?;
        let source = &mut self.sources[index];
        if list.revision < source.revision {
            return Ok(());
        }
        let changed = source.revision != list.revision;
        source.revision = list.revision;
        source.tabs = list
            .tabs
            .into_iter()
            .map(|mut tab| {
                let id = WorkspaceTab::id_for(source.route.source_scope(), &tab.tab_id);
                source.raw_ids.insert(id.clone(), tab.tab_id);
                source.created.remove(&id);
                tab.tab_id = id;
                tab
            })
            .collect();
        source.raw_ids.retain(|id, _| {
            source.tabs.iter().any(|tab| &tab.tab_id == id) || source.created.contains(id)
        });
        if source.tabs.is_empty() && index != self.routing.local {
            source.disconnect();
        }
        self.model.revision = self
            .model
            .revision
            .checked_add(1)
            .ok_or("workspace revision exhausted")?;
        self.list(request)?;
        self.cancel_closed_view()?;
        if changed {
            let selected = self
                .model
                .viewed
                .clone()
                .filter(|id| self.sources[index].tabs.iter().any(|tab| &tab.tab_id == id));
            self.save(selected, vec![], Some(index), None)?;
        }
        Ok(())
    }
    pub(super) fn source_message(
        &mut self,
        index: usize,
        generation: u64,
        payload: Vec<u8>,
    ) -> Result<(), String> {
        if generation != self.sources[index].generation {
            return Ok(());
        }
        if wire::kind(&payload)?.message_type == "tab.list" {
            return self.source_list(index, &payload);
        }
        let mut frame: Envelope =
            protocol::decode_payload(&payload).map_err(|error| error.to_string())?;
        if frame.message_type == "tab.created" {
            if let Some(raw) = frame
                .body
                .get("tabId")
                .and_then(Value::text)
                .map(str::to_owned)
            {
                let source = &mut self.sources[index];
                if source.raw_ids.len() >= 16384 {
                    return Err("workspace routing identity bound exceeded".into());
                }
                let id = WorkspaceTab::id_for(source.route.source_scope(), &raw);
                source.raw_ids.insert(id.clone(), raw);
                source.created.insert(id);
                self.save(None, vec![], Some(index), None)?;
            }
        }
        qualify(&mut frame.body, self.sources[index].route.source_scope());
        if frame.message_type == "surface" {
            if index != self.routing.active {
                if let (Some(tab), Some(status)) = (
                    frame.body.get("tabId").and_then(Value::text),
                    frame.body.get("status").and_then(Value::text),
                ) {
                    wire::send(
                        &mut self.output,
                        "tab.status",
                        None,
                        wire::TabStatus {
                            tab_id: tab.into(),
                            status: status.into(),
                            accent: None,
                        },
                    )?;
                }
                return Ok(());
            }
            self.view_observed(index, &frame)?;
            if self.pending.is_some() {
                return Ok(());
            }
        }
        if matches!(
            frame.message_type.as_str(),
            "terminal.effect"
                | "input.rejected"
                | "input.uncertain"
                | "viewer.status"
                | "detach"
                | "holder.exit"
        ) && index != self.routing.active
        {
            return Ok(());
        }
        if frame.message_type == "tabs.shortcuts" && index != self.routing.local {
            return Ok(());
        }
        send_value(&mut self.output, &frame)
    }
    fn explicit_session(&self, frame: &Envelope) -> Option<(usize, String)> {
        let file = frame.body.get("sessionFile").and_then(Value::text)?;
        self.sources.iter().enumerate().find_map(|(index, source)| {
            source
                .sessions
                .iter()
                .find(|(path, _)| {
                    path.as_str() == file
                        || std::fs::canonicalize(path)
                            .ok()
                            .zip(std::fs::canonicalize(file).ok())
                            .is_some_and(|(a, b)| a == b)
                })
                .map(|(_, raw)| {
                    (
                        index,
                        WorkspaceTab::id_for(source.route.source_scope(), raw),
                    )
                })
        })
    }
    fn reorder(&mut self, payload: &[u8]) -> Result<(), String> {
        let (request, reorder): (_, wire::TabReorder) = wire::body(payload)?;
        let accepted = reorder.expected_revision == self.model.revision
            && self.model.order.contains(&reorder.tab_id);
        if accepted {
            self.model.order.retain(|id| id != &reorder.tab_id);
            self.model.order.insert(
                reorder.target_index.min(self.model.order.len()),
                reorder.tab_id,
            );
            self.model.revision = self
                .model
                .revision
                .checked_add(1)
                .ok_or("workspace revision exhausted")?;
            self.list(None)?;
            self.save(None, self.model.order.clone(), None, None)?;
        }
        wire::send(
            &mut self.output,
            "tab.reordered",
            request,
            wire::ResultBody {
                accepted,
                message: None,
            },
        )
    }
    fn attach_start(&mut self, frame: &Envelope) -> Result<bool, String> {
        if let Some((_, id)) = self.explicit_session(frame) {
            wire::send(
                &mut self.output,
                "tab.selected",
                frame.request_id,
                wire::TabTarget { tab_id: id },
            )?;
            return Ok(false);
        }
        if frame
            .body
            .get("sessionFile")
            .is_none_or(|value| matches!(value, Value::Nil))
            && self.sources.iter().any(|source| {
                source.tabs.iter().any(|tab| {
                    crate::core::tab_bar::TabKind::of_id(&tab.tab_id)
                        .provider()
                        .owns_session
                })
            })
        {
            return Ok(false);
        }
        Ok(true)
    }
    pub(super) fn client_message(&mut self, payload: Vec<u8>) -> Result<bool, String> {
        let mut frame: Envelope =
            protocol::decode_payload(&payload).map_err(|error| error.to_string())?;
        let mut destination = self.routing.active;
        match frame.message_type.as_str() {
            "detach" => return Ok(false),
            "tab.list" => {
                self.discover();
                for source in &mut self.sources {
                    if source.connected {
                        wire::send(
                            &mut source.writer,
                            "tab.list",
                            frame.request_id,
                            wire::ResultBody::ok(),
                        )?;
                    }
                }
                return Ok(true);
            }
            "tab.reorder" => {
                self.reorder(&payload)?;
                return Ok(true);
            }
            "attach.start" => {
                if !self.attach_start(&frame)? {
                    return Ok(true);
                }
                destination = self.routing.local;
                self.routing.active = destination;
                self.routing.signal.store(destination, Ordering::Release);
            }
            "tab.create" | "tab.cancel-create" => destination = self.routing.local,
            message if crate::core::tab_bar::TabKind::from_singleton_message(message).is_some() => {
                destination = self.routing.local
            }
            _ => {}
        }
        let field = if frame.message_type == "tab.view" {
            "tab_id"
        } else {
            "tabId"
        };
        if let Some(id) = frame
            .body
            .get(field)
            .and_then(Value::text)
            .map(str::to_owned)
        {
            let Some((index, raw)) = target(&self.sources, &id) else {
                self.refused("Unknown workspace tab.")?;
                return Ok(true);
            };
            destination = index;
            frame.body.set_text(field, raw);
            if frame.message_type == "tab.view" {
                self.stage_view(index, id, frame)?;
                return Ok(true);
            }
        }
        if frame.message_type == "resize" {
            self.routing.resizes.insert(destination, frame.clone());
        }
        if self.hold_input(&frame)? {
            return Ok(true);
        }
        if matches!(
            frame.message_type.as_str(),
            "input" | "input.event" | "paste.start"
        ) && !self.routing.admitted
        {
            self.refused("Requested view is not ready; input was not delivered.")?;
            return Ok(true);
        }
        if !self.sources[destination].connected
            || send_value(&mut self.sources[destination].writer, &frame).is_err()
        {
            self.uncertain(frame.request_id)?;
        }
        Ok(true)
    }
}
