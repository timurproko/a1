//! Creation intent owns its position before a source assigns an ID. Metadata never reorders intent.
use super::*;
use crate::core::tab_bar::TabKind;

#[derive(Default)]
pub(super) struct Creations {
    sequence: u64,
    pending: HashMap<u64, Creation>,
}
struct Creation {
    original: Option<u64>,
    kind: TabKind,
    reveal: bool,
    slot: Option<String>,
}
impl Creations {
    pub(super) fn track(
        &mut self,
        frame: &mut Envelope,
        order: &mut Vec<String>,
    ) -> Result<(), String> {
        if frame.message_type == "tab.cancel-create" {
            let original = frame.body.get("requestId").and_then(number);
            if let Some((id, creation)) = self.pending.iter().find(|(_, creation)| {
                creation.kind == TabKind::Agent && creation.original == original
            }) {
                if let Some(slot) = &creation.slot {
                    order.retain(|id| id != slot);
                }
                if let Some(value) = frame.body.get_mut("requestId") {
                    *value = Value::U64(*id);
                }
            }
            return Ok(());
        }
        let (kind, reveal) = if frame.message_type == "tab.create" {
            (TabKind::Agent, true)
        } else if let Some(request) = TabKind::from_singleton_message(&frame.message_type) {
            request
        } else {
            return Ok(());
        };
        if self.pending.len() >= 128 {
            return Err("workspace creation intent bound exceeded".into());
        }
        self.sequence = self
            .sequence
            .checked_add(1)
            .ok_or("workspace creation sequence exhausted")?;
        let id = (1_u64 << 63)
            .checked_add(self.sequence)
            .ok_or("workspace creation identity exhausted")?;
        let slot = reveal.then(|| format!("pending-workspace-{id}"));
        if let Some(slot) = &slot {
            order.push(slot.clone());
        }
        self.pending.insert(
            id,
            Creation {
                original: frame.request_id,
                kind,
                reveal,
                slot,
            },
        );
        frame.request_id = Some(id);
        Ok(())
    }
    pub(super) fn revealing(&self, frame: &Envelope) -> bool {
        frame
            .request_id
            .and_then(|id| self.pending.get(&id))
            .is_some_and(|creation| creation.reveal)
    }
    /// Restores the caller's request identity and suppresses a prewarm superseded by an explicit open.
    pub(super) fn complete(
        &mut self,
        frame: &mut Envelope,
        id: &str,
        order: &mut Vec<String>,
    ) -> bool {
        let Some(creation) = frame
            .request_id
            .and_then(|request| self.pending.remove(&request))
        else {
            remember(order, id);
            return true;
        };
        frame.request_id = creation.original;
        if let Some(slot) = creation.slot {
            order.retain(|entry| entry != id);
            if let Some(position) = order.iter().position(|entry| entry == &slot) {
                order[position] = id.into();
            } else {
                remember(order, id);
            }
        } else {
            remember(order, id);
        }
        creation.reveal
            || !self
                .pending
                .values()
                .any(|later| later.kind == creation.kind && later.reveal)
    }
    pub(super) fn failed(&mut self, frame: &mut Envelope, order: &mut Vec<String>) {
        if let Some(creation) = frame
            .request_id
            .and_then(|request| self.pending.remove(&request))
        {
            frame.request_id = creation.original;
            if let Some(slot) = creation.slot {
                order.retain(|id| id != &slot);
            }
        }
    }
}
fn number(value: &Value) -> Option<u64> {
    match value {
        Value::U64(value) => Some(*value),
        Value::I64(value) if *value >= 0 => Some(*value as u64),
        _ => None,
    }
}
/// Reorder indexes address the published strip topology, not hidden foreign singleton records.
pub(super) fn move_tab(order: &mut Vec<String>, presented: &[String], id: &str, target: usize) {
    let remaining = presented
        .iter()
        .filter(|entry| entry.as_str() != id)
        .collect::<Vec<_>>();
    order.retain(|entry| entry != id);
    let index = remaining
        .get(target)
        .and_then(|next| order.iter().position(|entry| entry == *next))
        .or_else(|| {
            remaining
                .last()
                .and_then(|last| order.iter().position(|entry| entry == *last))
                .map(|index| index + 1)
        })
        .unwrap_or(order.len());
    order.insert(index, id.into());
}
pub(super) fn remember(order: &mut Vec<String>, id: &str) {
    if !order.iter().any(|entry| entry == id) {
        order.push(id.into());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn message(kind: &str, request: Option<u64>) -> Envelope {
        Envelope {
            message_type: kind.into(),
            request_id: request,
            body: Value::Map(vec![]),
        }
    }
    #[test]
    fn drag_indexes_ignore_foreign_hidden_singletons_and_keep_pending_slots() {
        let mut order = vec![
            "old-settings".into(),
            "agent-a".into(),
            "agent-b".into(),
            "settings".into(),
            "pending".into(),
        ];
        let shown = vec!["agent-a".into(), "agent-b".into(), "settings".into()];
        move_tab(&mut order, &shown, "settings", 1);
        assert_eq!(
            order,
            ["old-settings", "agent-a", "settings", "agent-b", "pending"]
        );
        let shown = vec!["agent-a".into(), "settings".into(), "agent-b".into()];
        move_tab(&mut order, &shown, "settings", 2);
        assert_eq!(
            order,
            ["old-settings", "agent-a", "agent-b", "settings", "pending"]
        );
    }
    #[test]
    fn late_agent_identity_keeps_its_slot_before_a_later_utility() {
        let mut creations = Creations::default();
        let mut order = vec!["old-agent".into(), "settings".into()];
        let mut agent = message("tab.create", Some(7));
        creations.track(&mut agent, &mut order).unwrap();
        let mut settings = message("tab.open-settings", None);
        creations.track(&mut settings, &mut order).unwrap();
        assert!(creations.complete(&mut settings, "settings", &mut order));
        // Concurrency: a registry can announce the real ID before the corresponding creation acknowledgement.
        remember(&mut order, "new-agent");
        assert!(creations.complete(&mut agent, "new-agent", &mut order));
        assert_eq!(order, ["old-agent", "new-agent", "settings"]);
        assert_eq!(agent.request_id, Some(7));
        assert_eq!(settings.request_id, None);
    }
    #[test]
    fn hidden_utility_reveal_appends_after_all_kinds_and_reveal_appends_again() {
        for kind in TabKind::SINGLETONS {
            let mut creations = Creations::default();
            let mut order = vec!["utility".into(), "agent-a".into(), "agent-b".into()];
            for _ in 0..2 {
                let mut open = message(&kind.open_message(), None);
                creations.track(&mut open, &mut order).unwrap();
                creations.complete(&mut open, "utility", &mut order);
                assert_eq!(order, ["agent-a", "agent-b", "utility"]);
            }
        }
    }
    #[test]
    fn prewarm_never_reserves_a_visible_slot_or_steals_an_explicit_open() {
        let mut creations = Creations::default();
        let mut order = vec!["agent".into()];
        let mut prewarm = message("tab.prewarm-settings", None);
        creations.track(&mut prewarm, &mut order).unwrap();
        assert_eq!(order, ["agent"]);
        let mut open = message("tab.open-settings", None);
        creations.track(&mut open, &mut order).unwrap();
        assert!(!creations.complete(&mut prewarm, "settings", &mut order));
        assert!(creations.complete(&mut open, "settings", &mut order));
        assert_eq!(order, ["agent", "settings"]);
    }
    #[test]
    fn cancel_uses_the_exact_source_request_without_retargeting_another_creation() {
        let mut creations = Creations::default();
        let mut order = vec!["agent".into()];
        let mut first = message("tab.create", Some(9));
        let mut second = message("tab.create", Some(10));
        creations.track(&mut first, &mut order).unwrap();
        creations.track(&mut second, &mut order).unwrap();
        let mut cancel = Envelope {
            message_type: "tab.cancel-create".into(),
            request_id: None,
            body: Value::Map(vec![(Value::String("requestId".into()), Value::U64(9))]),
        };
        creations.track(&mut cancel, &mut order).unwrap();
        assert_eq!(
            cancel.body.get("requestId").and_then(number),
            first.request_id
        );
        creations.complete(&mut second, "second", &mut order);
        assert_eq!(order, ["agent", "second"]);
        creations.complete(&mut first, "cancelled", &mut order);
        assert_eq!(first.request_id, Some(9));
        assert_eq!(second.request_id, Some(10));
    }
    #[test]
    fn failure_removes_only_its_reserved_slot_and_restores_request_identity() {
        let mut creations = Creations::default();
        let mut order = vec!["agent".into()];
        let mut create = message("tab.create", Some(9));
        creations.track(&mut create, &mut order).unwrap();
        creations.failed(&mut create, &mut order);
        assert_eq!(order, ["agent"]);
        assert_eq!(create.request_id, Some(9));
    }
}
