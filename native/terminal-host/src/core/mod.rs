use std::time::Duration;

pub mod holder;
pub mod server;
pub mod sim;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Effect {
    Spawn {
        tab_id: String,
        incarnation: u64,
        deadline: Duration,
    },
    CreatePty {
        tab_id: String,
        incarnation: u64,
        deadline: Duration,
    },
    InspectIdentity {
        process_id: u32,
        deadline: Duration,
    },
    Terminate {
        process_id: u32,
        graceful_deadline: Duration,
        forced_deadline: Duration,
    },
    Persist {
        revision: u64,
        deadline: Duration,
    },
    Send {
        peer: String,
        message: String,
    },
    ArmTimer {
        timer: Timer,
        after: Duration,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Timer {
    Reconcile,
    HolderHeartbeat(String),
    EffectDeadline(u64),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Completion {
    Spawned {
        tab_id: String,
        incarnation: u64,
        process_id: u32,
    },
    PtyCreated {
        tab_id: String,
        incarnation: u64,
    },
    Persisted {
        revision: u64,
    },
    Identity {
        process_id: u32,
        verified: bool,
    },
    Terminated {
        process_id: u32,
        verified: bool,
    },
}
