use std::collections::{HashMap, VecDeque};
use std::time::Duration;

use super::{Completion, Effect, Timer};

pub const HOLDER_HEARTBEAT: Duration = Duration::from_secs(5);
pub const HOLDER_MISSES: u8 = 3;
pub const RECONCILE_INTERVAL: Duration = Duration::from_secs(1);
/// Keep heartbeat supervision one full heartbeat behind the role-local watchdog. A one-tick
/// margin races under scheduler jitter and can erase the frozen holder's own crash record.
pub const HOLDER_MISS_GRACE: Duration = HOLDER_HEARTBEAT;
pub const START_SPACING: Duration = Duration::from_millis(250);
pub const DEFAULT_MAX_CONCURRENT_STARTS: usize = 2;
pub const HARD_MAX_CONCURRENT_STARTS: usize = 8;
pub const RESTART_WINDOW: Duration = Duration::from_secs(10 * 60);
pub const CHILD_UNRESPONSIVE_NOTICE: Duration = Duration::from_secs(30);
pub const RESTART_BACKOFF: [Duration; 3] = [
    Duration::from_secs(1),
    Duration::from_secs(5),
    Duration::from_secs(30),
];

/// A server with no attached client and no live user tab exits after this long.
pub const IDLE_EXIT: Duration = Duration::from_secs(10 * 60);

/// What the shell observes when it asks whether the server is idle. The prewarmed standby tab is
/// deliberately absent: it never keeps a server alive.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IdleObservation {
    pub clients: usize,
    pub bridges: usize,
    pub user_holders: usize,
    pub starting_holders: usize,
    pub since_activity: Duration,
}

/// True once the server has been idle for [`IDLE_EXIT`]; any client, bridge, live or starting user
/// tab, or recent activity keeps it running.
pub fn idle_exit_due(observation: IdleObservation) -> bool {
    observation.clients == 0
        && observation.bridges == 0
        && observation.user_holders == 0
        && observation.starting_holders == 0
        && observation.since_activity >= IDLE_EXIT
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RestartDecision {
    Schedule {
        delay: Duration,
        restarts: u8,
        window_start: Duration,
    },
    Failed {
        restarts: u8,
        window_start: Duration,
    },
}

pub fn decide_restart(
    restarts: u8,
    window_start: Option<Duration>,
    now: Duration,
) -> RestartDecision {
    let (restarts, window_start) = match window_start {
        Some(start) if now.saturating_sub(start) < RESTART_WINDOW => (restarts, start),
        _ => (0, now),
    };
    match RESTART_BACKOFF.get(restarts as usize).copied() {
        Some(delay) => RestartDecision::Schedule {
            delay,
            restarts: restarts.saturating_add(1),
            window_start,
        },
        None => RestartDecision::Failed {
            restarts,
            window_start,
        },
    }
}

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
    Crashed,
    Restarting,
    Unresponsive,
    Stalled,
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
    pub restarts: u8,
    pub restart_window_start: Option<Duration>,
    pub restart_due_at: Option<Duration>,
    pub last_exit: Option<String>,
    pub desired_size: (u16, u16),
    pub observed_size: Option<(u16, u16)>,
    pub last_heartbeat_at: Duration,
    pub child_pid: Option<u32>,
    pub child_alive: bool,
    pub bridge_connected: bool,
    pub last_child_heartbeat_at: Option<Duration>,
    pub unresponsive_termination_requested: bool,
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
            restarts: 0,
            restart_window_start: None,
            restart_due_at: None,
            last_exit: None,
            desired_size: size,
            observed_size: None,
            last_heartbeat_at: Duration::ZERO,
            child_pid: None,
            child_alive: false,
            bridge_connected: false,
            last_child_heartbeat_at: None,
            unresponsive_termination_requested: false,
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
    pub next_start_at: Duration,
    pub unresponsive_notice_after: Duration,
    pub unresponsive_restart_after: Duration,
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
            next_start_at: Duration::ZERO,
            unresponsive_notice_after: CHILD_UNRESPONSIVE_NOTICE,
            unresponsive_restart_after: Duration::from_secs(120),
            start_queue: VecDeque::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub enum Event {
    Create {
        tab_id: String,
        size: (u16, u16),
    },
    SetDesired {
        tab_id: String,
        desired: Desired,
    },
    Resize {
        tab_id: String,
        size: (u16, u16),
    },
    HolderHeartbeat {
        tab_id: String,
        incarnation: u64,
    },
    ChildObserved {
        tab_id: String,
        incarnation: u64,
        process_id: u32,
        alive: bool,
    },
    BridgeConnection {
        tab_id: String,
        incarnation: u64,
        connected: bool,
    },
    ChildHeartbeat {
        tab_id: String,
        incarnation: u64,
    },
    HolderConnectionLost {
        tab_id: String,
        incarnation: u64,
    },
    ChildExited {
        tab_id: String,
        incarnation: u64,
        reason: String,
    },
    Retry {
        tab_id: String,
        start_fresh: bool,
    },
    Tick {
        loop_healthy: bool,
    },
    Completed(Completion),
    DeadlineMissed {
        tab_id: String,
        incarnation: u64,
    },
}

pub fn step(state: &mut State, event: Event, now: Duration) -> Vec<Effect> {
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
                    tab.last_heartbeat_at = now;
                }
            }
        }
        Event::ChildObserved {
            tab_id,
            incarnation,
            process_id,
            alive,
        } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                if tab.incarnation == incarnation {
                    tab.child_pid = alive.then_some(process_id);
                    tab.child_alive = alive;
                    if !alive {
                        tab.last_child_heartbeat_at = None;
                        tab.unresponsive_termination_requested = false;
                    }
                }
            }
        }
        Event::BridgeConnection {
            tab_id,
            incarnation,
            connected,
        } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                if tab.incarnation == incarnation {
                    tab.bridge_connected = connected;
                    tab.last_child_heartbeat_at = connected.then_some(now);
                    tab.unresponsive_termination_requested = false;
                    if !connected && tab.lifecycle == Lifecycle::Unresponsive {
                        tab.lifecycle = Lifecycle::Running;
                        effects.push(Effect::Send {
                            peer: tab_id,
                            message: "child-responsive".into(),
                        });
                    }
                }
            }
        }
        Event::ChildHeartbeat {
            tab_id,
            incarnation,
        } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                if tab.incarnation == incarnation && tab.bridge_connected {
                    tab.last_child_heartbeat_at = Some(now);
                    tab.unresponsive_termination_requested = false;
                    if tab.lifecycle == Lifecycle::Unresponsive {
                        tab.lifecycle = Lifecycle::Running;
                        effects.push(Effect::Send {
                            peer: tab_id,
                            message: "child-responsive".into(),
                        });
                    }
                }
            }
        }
        Event::HolderConnectionLost {
            tab_id,
            incarnation,
        } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                if tab.incarnation == incarnation
                    && matches!(tab.lifecycle, Lifecycle::Running | Lifecycle::Unresponsive)
                {
                    tab.lifecycle = Lifecycle::HolderLost;
                    tab.holder_pid = None;
                    tab.child_alive = false;
                    tab.bridge_connected = false;
                    tab.last_child_heartbeat_at = None;
                }
            }
        }
        Event::ChildExited {
            tab_id,
            incarnation,
            reason,
        } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                if tab.incarnation == incarnation
                    && tab.desired == Desired::Running
                    && matches!(tab.lifecycle, Lifecycle::Running | Lifecycle::Unresponsive)
                {
                    tab.last_exit = Some(reason);
                    match decide_restart(tab.restarts, tab.restart_window_start, now) {
                        RestartDecision::Schedule {
                            delay,
                            restarts,
                            window_start,
                        } => {
                            tab.restarts = restarts;
                            tab.restart_window_start = Some(window_start);
                            tab.restart_due_at = Some(now.saturating_add(delay));
                            tab.lifecycle = Lifecycle::Crashed;
                            state.revision = state.revision.saturating_add(1);
                            effects.push(Effect::Persist {
                                revision: state.revision,
                                deadline: Duration::from_secs(5),
                            });
                            effects.push(Effect::ArmTimer {
                                timer: Timer::Reconcile,
                                after: delay,
                            });
                        }
                        RestartDecision::Failed {
                            restarts,
                            window_start,
                        } => {
                            tab.restarts = restarts;
                            tab.restart_window_start = Some(window_start);
                            tab.restart_due_at = None;
                            tab.lifecycle = Lifecycle::Failed;
                            state.revision = state.revision.saturating_add(1);
                            effects.push(Effect::Persist {
                                revision: state.revision,
                                deadline: Duration::from_secs(5),
                            });
                        }
                    }
                }
            }
        }
        Event::Retry {
            tab_id,
            start_fresh: _,
        } => {
            if let Some(tab) = state.tabs.get_mut(&tab_id) {
                if tab.lifecycle == Lifecycle::Failed || tab.lifecycle == Lifecycle::Crashed {
                    tab.restarts = 0;
                    tab.restart_window_start = Some(now);
                    tab.restart_due_at = None;
                    tab.lifecycle = Lifecycle::Pending;
                    state.start_queue.push_back(tab_id);
                    state.revision = state.revision.saturating_add(1);
                    effects.push(Effect::Persist {
                        revision: state.revision,
                        deadline: Duration::from_secs(5),
                    });
                }
            }
        }
        Event::Tick { loop_healthy } => {
            state.server_loop_healthy = loop_healthy;
            if loop_healthy {
                for (tab_id, tab) in &mut state.tabs {
                    if tab.lifecycle == Lifecycle::Crashed
                        && tab.restart_due_at.is_some_and(|deadline| now >= deadline)
                    {
                        tab.restart_due_at = None;
                        tab.lifecycle = Lifecycle::Pending;
                        state.start_queue.push_back(tab_id.clone());
                    }
                    if matches!(tab.lifecycle, Lifecycle::Running | Lifecycle::Unresponsive) {
                        let holder_current = now.saturating_sub(tab.last_heartbeat_at)
                            <= HOLDER_HEARTBEAT
                                .saturating_mul(u32::from(HOLDER_MISSES))
                                .saturating_add(HOLDER_MISS_GRACE);
                        let healthy = tab.bridge_connected && tab.child_alive && holder_current;
                        if healthy {
                            let silence =
                                now.saturating_sub(tab.last_child_heartbeat_at.unwrap_or(now));
                            if silence >= state.unresponsive_notice_after
                                && tab.lifecycle == Lifecycle::Running
                            {
                                tab.lifecycle = Lifecycle::Unresponsive;
                                effects.push(Effect::Send {
                                    peer: tab_id.clone(),
                                    message: "child-unresponsive".into(),
                                });
                            }
                            if silence >= state.unresponsive_restart_after
                                && !tab.unresponsive_termination_requested
                            {
                                tab.unresponsive_termination_requested = true;
                                effects.push(Effect::Send {
                                    peer: tab_id.clone(),
                                    message: "terminate-unresponsive-child".into(),
                                });
                            }
                        } else {
                            tab.last_child_heartbeat_at = Some(now);
                            tab.unresponsive_termination_requested = false;
                            if tab.lifecycle == Lifecycle::Unresponsive {
                                tab.lifecycle = Lifecycle::Running;
                            }
                        }
                    }
                    if !matches!(tab.lifecycle, Lifecycle::Running | Lifecycle::Unresponsive) {
                        continue;
                    }
                    let expected =
                        tab.last_heartbeat_at
                            .saturating_add(HOLDER_HEARTBEAT.saturating_mul(u32::from(
                                tab.missed_heartbeats.saturating_add(1),
                            )));
                    if now < expected.saturating_add(HOLDER_MISS_GRACE) {
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
                    tab.last_child_heartbeat_at = Some(now);
                    tab.unresponsive_termination_requested = false;
                    if tab.lifecycle == Lifecycle::Unresponsive {
                        tab.lifecycle = Lifecycle::Running;
                    }
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
                    if tab.incarnation == incarnation && tab.lifecycle == Lifecycle::Starting {
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
                if tab.incarnation == incarnation && tab.lifecycle == Lifecycle::Starting {
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
    reconcile(state, &mut effects, now);
    effects
}

fn reconcile(state: &mut State, effects: &mut Vec<Effect>, now: Duration) {
    if state.starts_in_flight >= state.max_concurrent_starts {
        return;
    }
    if now < state.next_start_at {
        effects.push(Effect::ArmTimer {
            timer: Timer::Reconcile,
            after: state.next_start_at - now,
        });
        return;
    }
    while let Some(tab_id) = state.start_queue.pop_front() {
        let Some(tab) = state.tabs.get_mut(&tab_id) else {
            continue;
        };
        if tab.desired != Desired::Running || tab.lifecycle != Lifecycle::Pending {
            continue;
        }
        tab.incarnation = tab.incarnation.saturating_add(1);
        tab.lifecycle = Lifecycle::Starting;
        state.starts_in_flight += 1;
        state.next_start_at = now.saturating_add(START_SPACING);
        effects.push(Effect::Spawn {
            tab_id,
            incarnation: tab.incarnation,
            deadline: Duration::from_secs(10),
        });
        effects.push(Effect::ArmTimer {
            timer: Timer::Reconcile,
            after: START_SPACING,
        });
        break;
    }
}

#[cfg(test)]
mod idle_tests {
    use super::{IDLE_EXIT, IdleObservation, idle_exit_due};
    use std::time::Duration;

    fn idle(since_activity: Duration) -> IdleObservation {
        IdleObservation {
            clients: 0,
            bridges: 0,
            user_holders: 0,
            starting_holders: 0,
            since_activity,
        }
    }

    #[test]
    fn a_standby_only_server_exits_after_ten_idle_minutes() {
        assert!(!idle_exit_due(idle(IDLE_EXIT - Duration::from_secs(1))));
        assert!(idle_exit_due(idle(IDLE_EXIT)));
    }

    #[test]
    fn a_client_at_nine_fifty_nine_restarts_the_interval() {
        let attached = IdleObservation {
            clients: 1,
            ..idle(Duration::from_secs(9 * 60 + 59))
        };
        assert!(!idle_exit_due(attached));
        // Invariant: a client that just left restarted activity, so the server is not yet idle.
        assert!(!idle_exit_due(idle(Duration::from_secs(1))));
        assert!(idle_exit_due(idle(IDLE_EXIT + Duration::from_secs(1))));
    }

    #[test]
    fn live_or_starting_user_tabs_and_bridges_keep_the_server() {
        let long = IDLE_EXIT * 3;
        assert!(!idle_exit_due(IdleObservation {
            user_holders: 1,
            ..idle(long)
        }));
        assert!(!idle_exit_due(IdleObservation {
            starting_holders: 1,
            ..idle(long)
        }));
        assert!(!idle_exit_due(IdleObservation {
            bridges: 1,
            ..idle(long)
        }));
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
                Duration::ZERO,
            );
        }
        assert_eq!(state.starts_in_flight, 1);
        let before = state.tabs["tab-0"].lifecycle;
        step(
            &mut state,
            Event::Completed(Completion::Spawned {
                tab_id: "tab-0".into(),
                incarnation: 99,
                process_id: 4,
            }),
            Duration::from_millis(100),
        );
        assert_eq!(state.tabs["tab-0"].lifecycle, before);
        assert_eq!(state.starts_in_flight, 1);
        step(
            &mut state,
            Event::Tick { loop_healthy: true },
            START_SPACING,
        );
        assert_eq!(state.starts_in_flight, 2);
    }
    #[test]
    fn holder_watchdog_precedes_server_termination() {
        let mut state = State::new(1, 2);
        step(
            &mut state,
            Event::Create {
                tab_id: "tab".into(),
                size: (80, 24),
            },
            Duration::ZERO,
        );
        step(
            &mut state,
            Event::Completed(Completion::Spawned {
                tab_id: "tab".into(),
                incarnation: 1,
                process_id: 9,
            }),
            Duration::ZERO,
        );
        for miss in 1..HOLDER_MISSES {
            step(
                &mut state,
                Event::Tick { loop_healthy: true },
                HOLDER_HEARTBEAT
                    .saturating_mul(u32::from(miss))
                    .saturating_add(HOLDER_MISS_GRACE),
            );
        }
        let at_watchdog_limit = step(
            &mut state,
            Event::Tick { loop_healthy: true },
            HOLDER_HEARTBEAT.saturating_mul(u32::from(HOLDER_MISSES)),
        );
        assert!(
            !at_watchdog_limit
                .iter()
                .any(|effect| matches!(effect, Effect::InspectIdentity { process_id: 9, .. }))
        );
        let after_grace = step(
            &mut state,
            Event::Tick { loop_healthy: true },
            HOLDER_HEARTBEAT
                .saturating_mul(u32::from(HOLDER_MISSES))
                .saturating_add(HOLDER_MISS_GRACE),
        );
        assert!(
            after_grace
                .iter()
                .any(|effect| matches!(effect, Effect::InspectIdentity { process_id: 9, .. }))
        );
    }

    #[test]
    fn restart_budget_uses_one_five_thirty_then_fails_and_retry_resets() {
        assert_eq!(
            decide_restart(0, None, Duration::from_secs(100)),
            RestartDecision::Schedule {
                delay: Duration::from_secs(1),
                restarts: 1,
                window_start: Duration::from_secs(100),
            }
        );
        assert_eq!(
            decide_restart(1, Some(Duration::from_secs(100)), Duration::from_secs(101)),
            RestartDecision::Schedule {
                delay: Duration::from_secs(5),
                restarts: 2,
                window_start: Duration::from_secs(100),
            }
        );
        assert_eq!(
            decide_restart(2, Some(Duration::from_secs(100)), Duration::from_secs(106)),
            RestartDecision::Schedule {
                delay: Duration::from_secs(30),
                restarts: 3,
                window_start: Duration::from_secs(100),
            }
        );
        assert_eq!(
            decide_restart(3, Some(Duration::from_secs(100)), Duration::from_secs(140)),
            RestartDecision::Failed {
                restarts: 3,
                window_start: Duration::from_secs(100)
            }
        );
        assert!(matches!(
            decide_restart(3, Some(Duration::from_secs(100)), Duration::from_secs(701)),
            RestartDecision::Schedule { delay, restarts: 1, .. }
                if delay == Duration::from_secs(1)
        ));
    }

    #[test]
    fn child_exit_is_persisted_before_restart_and_stale_exit_is_ignored() {
        let mut state = State::new(1, 2);
        step(
            &mut state,
            Event::Create {
                tab_id: "tab".into(),
                size: (80, 24),
            },
            Duration::ZERO,
        );
        step(
            &mut state,
            Event::Completed(Completion::Spawned {
                tab_id: "tab".into(),
                incarnation: 1,
                process_id: 9,
            }),
            Duration::ZERO,
        );
        let effects = step(
            &mut state,
            Event::ChildExited {
                tab_id: "tab".into(),
                incarnation: 1,
                reason: "exit 1".into(),
            },
            Duration::from_secs(10),
        );
        assert_eq!(state.tabs["tab"].lifecycle, Lifecycle::Crashed);
        assert!(matches!(effects.first(), Some(Effect::Persist { .. })));
        assert!(
            !effects
                .iter()
                .any(|effect| matches!(effect, Effect::Spawn { .. }))
        );
        step(
            &mut state,
            Event::Tick { loop_healthy: true },
            Duration::from_secs(11),
        );
        assert_eq!(state.tabs["tab"].lifecycle, Lifecycle::Starting);
        let before = state.tabs["tab"].restarts;
        step(
            &mut state,
            Event::ChildExited {
                tab_id: "tab".into(),
                incarnation: 1,
                reason: "late".into(),
            },
            Duration::from_secs(12),
        );
        assert_eq!(state.tabs["tab"].restarts, before);
    }

    #[test]
    fn child_silence_requires_continuously_healthy_supervision() {
        let mut state = State::new(1, 2);
        state.unresponsive_restart_after = Duration::from_secs(60);
        step(
            &mut state,
            Event::Create {
                tab_id: "tab".into(),
                size: (80, 24),
            },
            Duration::ZERO,
        );
        step(
            &mut state,
            Event::Completed(Completion::Spawned {
                tab_id: "tab".into(),
                incarnation: 1,
                process_id: 9,
            }),
            Duration::ZERO,
        );
        step(
            &mut state,
            Event::HolderHeartbeat {
                tab_id: "tab".into(),
                incarnation: 1,
            },
            Duration::ZERO,
        );
        step(
            &mut state,
            Event::ChildObserved {
                tab_id: "tab".into(),
                incarnation: 1,
                process_id: 10,
                alive: true,
            },
            Duration::ZERO,
        );
        step(
            &mut state,
            Event::BridgeConnection {
                tab_id: "tab".into(),
                incarnation: 1,
                connected: true,
            },
            Duration::ZERO,
        );
        step(
            &mut state,
            Event::HolderHeartbeat {
                tab_id: "tab".into(),
                incarnation: 1,
            },
            Duration::from_secs(30),
        );
        step(
            &mut state,
            Event::Tick { loop_healthy: true },
            Duration::from_secs(30),
        );
        assert_eq!(state.tabs["tab"].lifecycle, Lifecycle::Unresponsive);
        step(
            &mut state,
            Event::HolderHeartbeat {
                tab_id: "tab".into(),
                incarnation: 1,
            },
            Duration::from_secs(60),
        );
        let effects = step(
            &mut state,
            Event::Tick { loop_healthy: true },
            Duration::from_secs(60),
        );
        assert!(effects.iter().any(|effect| matches!(effect, Effect::Send { message, .. } if message == "terminate-unresponsive-child")));

        step(
            &mut state,
            Event::BridgeConnection {
                tab_id: "tab".into(),
                incarnation: 1,
                connected: false,
            },
            Duration::from_secs(61),
        );
        step(
            &mut state,
            Event::BridgeConnection {
                tab_id: "tab".into(),
                incarnation: 1,
                connected: true,
            },
            Duration::from_secs(90),
        );
        step(
            &mut state,
            Event::HolderHeartbeat {
                tab_id: "tab".into(),
                incarnation: 1,
            },
            Duration::from_secs(119),
        );
        let effects = step(
            &mut state,
            Event::Tick { loop_healthy: true },
            Duration::from_secs(119),
        );
        assert_eq!(state.tabs["tab"].lifecycle, Lifecycle::Running);
        assert!(!effects.iter().any(|effect| matches!(effect, Effect::Send { message, .. } if message == "terminate-unresponsive-child")));
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
            Duration::ZERO,
        );
        step(
            &mut state,
            Event::Completed(Completion::Spawned {
                tab_id: "tab".into(),
                incarnation: 1,
                process_id: 9,
            }),
            Duration::ZERO,
        );
        for tick in 1..=5 {
            step(
                &mut state,
                Event::Tick {
                    loop_healthy: false,
                },
                Duration::from_secs(tick),
            );
        }
        assert_eq!(state.tabs["tab"].lifecycle, Lifecycle::Running);
    }
}
