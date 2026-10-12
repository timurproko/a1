use std::collections::{HashMap, VecDeque};
use std::time::Duration;

use super::{Completion, Effect, Timer};

pub const HOLDER_HEARTBEAT: Duration = Duration::from_secs(5);
pub const HOLDER_MISSES: u8 = 3;
pub const RECONCILE_INTERVAL: Duration = Duration::from_secs(1);
pub const START_SPACING: Duration = Duration::from_millis(250);
pub const DEFAULT_MAX_CONCURRENT_STARTS: usize = 2;
pub const HARD_MAX_CONCURRENT_STARTS: usize = 8;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Desired {
    Running,
    Stopped,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lifecycle {
    Pending,
    Starting,
    Running,
    Stopping,
    Stopped,
    HolderLost,
    Failed,
}

#[derive(Debug, Clone)]
pub struct TabState {
    pub desired: Desired,
    pub lifecycle: Lifecycle,
    pub incarnation: u64,
    pub holder_pid: Option<u32>,
    pub missed_heartbeats: u8,
    pub start_attempts: u8,
    pub desired_size: (u16, u16),
    pub observed_size: Option<(u16, u16)>,
}
impl TabState {
    pub fn new(size: (u16, u16)) -> Self {
        Self {
            desired: Desired::Running,
            lifecycle: Lifecycle::Pending,
            incarnation: 0,
            holder_pid: None,
            missed_heartbeats: 0,
            start_attempts: 0,
            desired_size: size,
            observed_size: None,
        }
    }
}

#[derive(Debug)]
pub struct State {
    pub epoch: u64,
    pub revision: u64,
    pub tabs: HashMap<String, TabState>,
    pub max_concurrent_starts: usize,
    pub starts_in_flight: usize,
    pub server_loop_healthy: bool,
    start_queue: VecDeque<String>,
}
impl State {
    pub fn new(epoch: u64, max_concurrent_starts: usize) -> Self {
        Self {
            epoch,
            revision: 0,
            tabs: HashMap::new(),
            max_concurrent_starts: max_concurrent_starts.clamp(1, HARD_MAX_CONCURRENT_STARTS),
            starts_in_flight: 0,
            server_loop_healthy: true,
            start_queue: VecDeque::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub enum Event {
    Create { tab_id: String, size: (u16, u16) },
    SetDesired { tab_id: String, desired: Desired },
    Resize { tab_id: String, size: (u16, u16) },
    HolderHeartbeat { tab_id: String, incarnation: u64 },
    HolderConnectionLost { tab_id: String, incarnation: u64 },
    Tick { loop_healthy: bool },
    Completed(Completion),
    DeadlineMissed { tab_id: String, incarnation: u64 },
}

pub fn step(state: &mut State, event: Event) -> Vec<Effect> {
    let mut effects = Vec::new();
    match event {
        Event::Create { tab_id, size } => {
            if !state.tabs.contains_key(&tab_id) {
                state.tabs.insert(tab_id.clone(), TabState::new(size));
                state.start_queue.push_back(tab_id);
                state.revision = state.revision.saturating_add(1);
                effects.push(Effect::Persist {
                    revision: state.revision,
                    deadline: Duration::from_secs(5),
                });
            }
        }
        Event::SetDesired { tab_id, desired } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                tab.desired = desired;
                state.revision = state.revision.saturating_add(1);
                effects.push(Effect::Persist {
                    revision: state.revision,
                    deadline: Duration::from_secs(5),
                });
                if desired == Desired::Stopped {
                    if let Some(process_id) = tab.holder_pid {
                        tab.lifecycle = Lifecycle::Stopping;
                        effects.push(Effect::Terminate {
                            process_id,
                            graceful_deadline: Duration::from_secs(5),
                            forced_deadline: Duration::from_secs(5),
                        });
                    } else {
                        tab.lifecycle = Lifecycle::Stopped;
                    }
                }
            }
        }
        Event::Resize { tab_id, size } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                tab.desired_size = size;
                if tab.observed_size != Some(size) && tab.lifecycle == Lifecycle::Running {
                    effects.push(Effect::Send {
                        peer: tab_id,
                        message: format!("resize:{}x{}", size.0, size.1),
                    });
                }
            }
        }
        Event::HolderHeartbeat {
            tab_id,
            incarnation,
        } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                if tab.incarnation == incarnation {
                    tab.missed_heartbeats = 0;
                }
            }
        }
        Event::HolderConnectionLost {
            tab_id,
            incarnation,
        } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                if tab.incarnation == incarnation {
                    tab.lifecycle = Lifecycle::HolderLost;
                    tab.holder_pid = None;
                }
            }
        }
        Event::Tick { loop_healthy } => {
            state.server_loop_healthy = loop_healthy;
            if loop_healthy {
                for (tab_id, tab) in &mut state.tabs {
                    if tab.lifecycle != Lifecycle::Running {
                        continue;
                    }
                    tab.missed_heartbeats = tab.missed_heartbeats.saturating_add(1);
                    if tab.missed_heartbeats >= HOLDER_MISSES {
                        if let Some(process_id) = tab.holder_pid {
                            effects.push(Effect::InspectIdentity {
                                process_id,
                                deadline: Duration::from_secs(2),
                            });
                        }
                        tab.lifecycle = Lifecycle::HolderLost;
                        effects.push(Effect::Send {
                            peer: tab_id.clone(),
                            message: "holder-lost".into(),
                        });
                    }
                }
            } else {
                for tab in state.tabs.values_mut() {
                    tab.missed_heartbeats = 0;
                }
            }
            effects.push(Effect::ArmTimer {
                timer: Timer::Reconcile,
                after: RECONCILE_INTERVAL,
            });
        }
        Event::Completed(completion) => match completion {
            Completion::Spawned {
                tab_id,
                incarnation,
                process_id,
            } => {
                if let Some(tab) = state.tabs.get_mut(&tab_id) {
                    if tab.incarnation == incarnation {
                        state.starts_in_flight = state.starts_in_flight.saturating_sub(1);
                        tab.holder_pid = Some(process_id);
                        tab.lifecycle = Lifecycle::Running;
                        tab.start_attempts = 0;
                        effects.push(Effect::ArmTimer {
                            timer: Timer::HolderHeartbeat(tab_id),
                            after: HOLDER_HEARTBEAT,
                        });
                    }
                }
            }
            Completion::Terminated {
                process_id,
                verified,
            } if verified => {
                for tab in state
                    .tabs
                    .values_mut()
                    .filter(|tab| tab.holder_pid == Some(process_id))
                {
                    tab.holder_pid = None;
                    tab.lifecycle = Lifecycle::Stopped;
                }
            }
            _ => {}
        },
        Event::DeadlineMissed {
            tab_id,
            incarnation,
        } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                if tab.incarnation == incarnation {
                    state.starts_in_flight = state.starts_in_flight.saturating_sub(1);
                    tab.start_attempts = tab.start_attempts.saturating_add(1);
                    if tab.start_attempts >= 3 {
                        tab.lifecycle = Lifecycle::Failed;
                    } else {
                        tab.lifecycle = Lifecycle::Pending;
                        state.start_queue.push_back(tab_id);
                    }
                }
            }
        }
    }
    reconcile(state, &mut effects);
    effects
}

fn reconcile(state: &mut State, effects: &mut Vec<Effect>) {
    while state.starts_in_flight < state.max_concurrent_starts {
        let Some(tab_id) = state.start_queue.pop_front() else {
            break;
        };
        let Some(tab) = state.tabs.get_mut(&tab_id) else {
            continue;
        };
        if tab.desired != Desired::Running || tab.lifecycle != Lifecycle::Pending {
            continue;
        }
        tab.incarnation = tab.incarnation.saturating_add(1);
        tab.lifecycle = Lifecycle::Starting;
        state.starts_in_flight += 1;
        effects.push(Effect::Spawn {
            tab_id,
            incarnation: tab.incarnation,
            deadline: Duration::from_secs(10),
        });
        effects.push(Effect::ArmTimer {
            timer: Timer::Reconcile,
            after: START_SPACING,
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn limits_starts_and_drops_stale_completion() {
        let mut state = State::new(1, 2);
        for index in 0..3 {
            step(
                &mut state,
                Event::Create {
                    tab_id: format!("tab-{index}"),
                    size: (80, 24),
                },
            );
        }
        assert_eq!(state.starts_in_flight, 2);
        let before = state.tabs["tab-0"].lifecycle;
        step(
            &mut state,
            Event::Completed(Completion::Spawned {
                tab_id: "tab-0".into(),
                incarnation: 99,
                process_id: 4,
            }),
        );
        assert_eq!(state.tabs["tab-0"].lifecycle, before);
    }
    #[test]
    fn unhealthy_server_never_accuses_holder() {
        let mut state = State::new(1, 2);
        step(
            &mut state,
            Event::Create {
                tab_id: "tab".into(),
                size: (80, 24),
            },
        );
        step(
            &mut state,
            Event::Completed(Completion::Spawned {
                tab_id: "tab".into(),
                incarnation: 1,
                process_id: 9,
            }),
        );
        for _ in 0..5 {
            step(
                &mut state,
                Event::Tick {
                    loop_healthy: false,
                },
            );
        }
        assert_eq!(state.tabs["tab"].lifecycle, Lifecycle::Running);
    }
}
