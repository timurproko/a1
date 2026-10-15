//! Volatile host health counters since this server process started.
//!
//! They are process-wide atomics so any role thread can record an event without taking the
//! runtime lock. They are reported by `a1 tabs host status`, never persisted, and carry no prompt
//! text, terminal content, or credentials.

use std::sync::atomic::{AtomicU64, Ordering};

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Event {
    CrashRestart,
    FailedTab,
    HolderHangRecovery,
    ChildHangRecovery,
    UnresponsiveTransition,
    StalledTransition,
    RenderLaneReplacement,
    FullSurfaceResync,
    PersistenceDegraded,
    CheckpointDegraded,
    BridgeDegraded,
}

const EVENTS: usize = 11;
static COUNTS: [AtomicU64; EVENTS] = [const { AtomicU64::new(0) }; EVENTS];

pub fn record(event: Event) {
    COUNTS[event as usize].fetch_add(1, Ordering::Relaxed);
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub crash_restarts: u64,
    pub failed_tabs: u64,
    pub holder_hang_recoveries: u64,
    pub child_hang_recoveries: u64,
    pub unresponsive_transitions: u64,
    pub stalled_transitions: u64,
    /// An unsent surface in a client's single render slot replaced by a newer one.
    pub render_lane_replacements: u64,
    /// Full surfaces delivered to a slow client after one or more of its updates were replaced.
    pub full_surface_resyncs: u64,
    pub persistence_degraded: u64,
    /// Entries into the bridge-reported degraded recovery state: late or failed draft checkpoints
    /// or prompt journals.
    pub checkpoint_degraded: u64,
    /// Bridges lost while their tab was still meant to run.
    pub bridge_degraded: u64,
    /// Earlier servers this profile's registry has seen, from its epoch.
    pub server_replacements: u64,
}

pub fn snapshot(epoch: u64) -> Snapshot {
    let read = |event: Event| COUNTS[event as usize].load(Ordering::Relaxed);
    Snapshot {
        crash_restarts: read(Event::CrashRestart),
        failed_tabs: read(Event::FailedTab),
        holder_hang_recoveries: read(Event::HolderHangRecovery),
        child_hang_recoveries: read(Event::ChildHangRecovery),
        unresponsive_transitions: read(Event::UnresponsiveTransition),
        stalled_transitions: read(Event::StalledTransition),
        render_lane_replacements: read(Event::RenderLaneReplacement),
        full_surface_resyncs: read(Event::FullSurfaceResync),
        persistence_degraded: read(Event::PersistenceDegraded),
        checkpoint_degraded: read(Event::CheckpointDegraded),
        bridge_degraded: read(Event::BridgeDegraded),
        server_replacements: epoch.saturating_sub(1),
    }
}

#[cfg(test)]
mod tests {
    use super::{Event, record, snapshot};

    #[test]
    fn each_event_increments_only_its_own_counter() {
        let before = snapshot(1);
        for event in [
            Event::CrashRestart,
            Event::FailedTab,
            Event::HolderHangRecovery,
            Event::ChildHangRecovery,
            Event::UnresponsiveTransition,
            Event::StalledTransition,
            Event::RenderLaneReplacement,
            Event::FullSurfaceResync,
            Event::PersistenceDegraded,
            Event::CheckpointDegraded,
            Event::BridgeDegraded,
        ] {
            record(event);
        }
        record(Event::CrashRestart);
        let after = snapshot(4);
        // Concurrency: other tests in this process may record events too, so deltas are lower bounds.
        assert!(after.crash_restarts - before.crash_restarts >= 2);
        assert!(after.failed_tabs > before.failed_tabs);
        assert!(after.render_lane_replacements > before.render_lane_replacements);
        assert!(after.full_surface_resyncs > before.full_surface_resyncs);
        assert!(after.checkpoint_degraded > before.checkpoint_degraded);
        assert!(after.bridge_degraded > before.bridge_degraded);
        assert_eq!(after.server_replacements, 3);
    }
}
