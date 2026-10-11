use std::collections::HashMap;

use crate::identity::ProcessIdentity;

/// One non-blocking render slot per attached client. Replacing an unsent patch forces the
/// next delivery to be a full surface so no skipped revision can corrupt client state.
#[derive(Debug, Default)]
pub struct SingleSlotRenderLane {
    pending: Option<(u64, Vec<u8>)>,
    needs_full: bool,
}

impl SingleSlotRenderLane {
    pub fn offer(&mut self, revision: u64, patch: Vec<u8>) {
        if self.pending.replace((revision, patch)).is_some() {
            self.needs_full = true;
        }
    }

    pub fn drain(&mut self, full_surface: impl FnOnce() -> Vec<u8>) -> Option<RenderDelivery> {
        let (revision, patch) = self.pending.take()?;
        let full = std::mem::take(&mut self.needs_full);
        Some(RenderDelivery {
            revision,
            full,
            bytes: if full { full_surface() } else { patch },
        })
    }
}

#[derive(Debug, PartialEq, Eq)]
pub struct RenderDelivery {
    pub revision: u64,
    pub full: bool,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Default)]
pub struct AttachmentState {
    attached: Option<String>,
    revision: u64,
}

impl AttachmentState {
    pub fn attach(&mut self, client_id: String) -> Result<u64, &'static str> {
        if self.attached.is_some() {
            return Err("a1 is attached in another terminal");
        }
        self.revision = self.revision.saturating_add(1);
        self.attached = Some(client_id);
        Ok(self.revision)
    }

    pub fn detach(&mut self, client_id: &str, revision: u64) -> bool {
        if self.attached.as_deref() != Some(client_id) || self.revision != revision {
            return false;
        }
        self.attached = None;
        self.revision = self.revision.saturating_add(1);
        true
    }

    pub fn current(&self) -> Option<(&str, u64)> {
        self.attached
            .as_deref()
            .map(|client| (client, self.revision))
    }
}

#[derive(Debug, Clone)]
pub struct RecordedHolder {
    pub tab_id: String,
    pub incarnation: u64,
    pub identity: ProcessIdentity,
    pub boot_identity: String,
    pub credential: [u8; 32],
}

pub fn adopt_verified_holder(
    record: &RecordedHolder,
    observed: Option<&ProcessIdentity>,
    boot_identity: &str,
    presented_credential: &[u8],
    expected_credential: &[u8; 32],
) -> bool {
    observed.is_some_and(|identity| identity == &record.identity)
        && record.boot_identity == boot_identity
        && record.credential == *expected_credential
        && presented_credential == expected_credential
}

#[derive(Default)]
pub struct ClientRenderLanes {
    lanes: HashMap<String, SingleSlotRenderLane>,
}

impl ClientRenderLanes {
    pub fn lane(&mut self, client_id: &str) -> &mut SingleSlotRenderLane {
        self.lanes.entry(client_id.to_owned()).or_default()
    }
    pub fn remove(&mut self, client_id: &str) {
        self.lanes.remove(client_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stalled_client_gets_one_full_current_surface() {
        let mut lane = SingleSlotRenderLane::default();
        lane.offer(1, b"patch-1".to_vec());
        lane.offer(2, b"patch-2".to_vec());
        assert_eq!(
            lane.drain(|| b"full-2".to_vec()),
            Some(RenderDelivery {
                revision: 2,
                full: true,
                bytes: b"full-2".to_vec()
            })
        );
        assert_eq!(lane.drain(Vec::new), None);
    }

    #[test]
    fn second_client_is_refused_and_stale_detach_does_nothing() {
        let mut state = AttachmentState::default();
        let revision = state.attach("one".into()).unwrap();
        assert_eq!(
            state.attach("two".into()),
            Err("a1 is attached in another terminal")
        );
        assert!(!state.detach("one", revision + 1));
        assert!(state.detach("one", revision));
    }
}
