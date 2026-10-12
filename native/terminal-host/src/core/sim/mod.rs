use std::collections::HashSet;

use super::server::{self, Event, Lifecycle, State};
use crate::core::Completion;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SimulationFailure {
    pub seed: u64,
    pub events: Vec<String>,
    pub reason: String,
}

pub fn run(seed: u64, steps: usize) -> Result<(), SimulationFailure> {
    let mut random = seed | 1;
    let mut state = State::new(1, 2);
    let mut events = Vec::new();
    for index in 0..3 {
        let id = format!("tab-{index}");
        server::step(
            &mut state,
            Event::Create {
                tab_id: id.clone(),
                size: (80, 24),
            },
        );
        events.push(format!("create:{id}"));
    }
    for _ in 0..steps {
        random ^= random << 13;
        random ^= random >> 7;
        random ^= random << 17;
        let index = (random % 3) as usize;
        let id = format!("tab-{index}");
        let incarnation = state.tabs.get(&id).map_or(0, |tab| tab.incarnation);
        match random % 5 {
            0 => {
                server::step(
                    &mut state,
                    Event::Tick {
                        loop_healthy: random & 8 != 0,
                    },
                );
                events.push("tick".into());
            }
            1 => {
                server::step(
                    &mut state,
                    Event::HolderHeartbeat {
                        tab_id: id,
                        incarnation,
                    },
                );
                events.push("heartbeat".into());
            }
            2 => {
                server::step(
                    &mut state,
                    Event::Resize {
                        tab_id: id,
                        size: (80 + index as u16, 24),
                    },
                );
                events.push("resize".into());
            }
            3 if incarnation > 0 => {
                server::step(
                    &mut state,
                    Event::Completed(Completion::Spawned {
                        tab_id: id,
                        incarnation,
                        process_id: 100 + index as u32,
                    }),
                );
                events.push("spawned".into());
            }
            _ => {
                server::step(
                    &mut state,
                    Event::HolderConnectionLost {
                        tab_id: id,
                        incarnation: incarnation.saturating_sub(1),
                    },
                );
                events.push("stale-exit".into());
            }
        }
        let live = state
            .tabs
            .values()
            .filter(|tab| matches!(tab.lifecycle, Lifecycle::Starting | Lifecycle::Running))
            .map(|tab| tab.incarnation)
            .collect::<HashSet<_>>();
        if state.starts_in_flight > state.max_concurrent_starts || live.contains(&0) {
            return Err(SimulationFailure {
                seed,
                events,
                reason: "start or incarnation invariant".into(),
            });
        }
    }
    Ok(())
}

pub fn run_seeds(count: u64, steps: usize) -> Result<(), SimulationFailure> {
    for seed in 0..count {
        run(seed, steps)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ten_thousand_schedules_preserve_invariants() {
        run_seeds(10_000, 64).unwrap();
    }
}
