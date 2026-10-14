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
    SurfaceReplacement,
    PersistenceDegraded,
    BridgeDegraded,
}

const EVENTS: usize = 9;
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
    /// An unsent surface replaced by a newer full surface for a slow client.
    pub surface_replacements: u64,
    pub persistence_degraded: u64,
    /// Entries into a bridge-reported degraded state, including failed draft checkpoints.
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
        surface_replacements: read(Event::SurfaceReplacement),
        persistence_degraded: read(Event::PersistenceDegraded),
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
            Event::SurfaceReplacement,
            Event::PersistenceDegraded,
            Event::BridgeDegraded,
        ] {
            record(event);
        }
        record(Event::CrashRestart);
        let after = snapshot(4);
        // Concurrency: other tests in this process may record events too, so deltas are lower bounds.
        assert!(after.crash_restarts - before.crash_restarts >= 2);
        assert!(after.failed_tabs > before.failed_tabs);
        assert!(after.surface_replacements > before.surface_replacements);
        assert!(after.bridge_degraded > before.bridge_degraded);
        assert_eq!(after.server_replacements, 3);
    }
}
