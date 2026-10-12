use std::collections::{HashMap, HashSet};
use std::time::Duration;

use super::holder;
use super::server::{self, Event, Lifecycle, State};
use crate::core::{Completion, Effect};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SimulationFailure {
    pub seed: u64,
    pub events: Vec<String>,
    pub reason: String,
}

pub fn run(seed: u64, steps: usize) -> Result<(), SimulationFailure> {
    let mut random = seed | 1;
    let mut now = Duration::ZERO;
    let mut state = State::new(1, 2);
    let mut holders = HashMap::<String, holder::State>::new();
    let mut session_writers = HashSet::<String>::new();
    let mut committed_revision = 0_u64;
    let mut events = Vec::new();
    for index in 0..3 {
        let id = format!("tab-{index}");
        server::step(
            &mut state,
            Event::Create {
                tab_id: id.clone(),
                size: (80, 24),
            },
            now,
        );
        committed_revision = state.revision;
        session_writers.insert(id.clone());
        events.push(format!("create:{id}"));
        now = now.saturating_add(server::START_SPACING);
        server::step(&mut state, Event::Tick { loop_healthy: true }, now);
    }
    for _ in 0..steps {
        random = next(random);
        now = now.saturating_add(Duration::from_millis(25 + random % 500));
        let index = (random % 3) as usize;
        let id = format!("tab-{index}");
        let incarnation = state.tabs.get(&id).map_or(0, |tab| tab.incarnation);
        match random % 12 {
            0 => {
                server::step(
                    &mut state,
                    Event::Tick {
                        loop_healthy: random & 8 != 0,
                    },
                    now,
                );
                events.push("delay-or-tick".into());
            }
            1 => {
                server::step(
                    &mut state,
                    Event::HolderHeartbeat {
                        tab_id: id,
                        incarnation,
                    },
                    now,
                );
                events.push("heartbeat".into());
            }
            2 => {
                server::step(
                    &mut state,
                    Event::Resize {
                        tab_id: id,
                        size: (80 + index as u16, 24 + (random % 4) as u16),
                    },
                    now,
                );
                events.push("reordered-resize".into());
            }
            3 if incarnation > 0 => {
                server::step(
                    &mut state,
                    Event::Completed(Completion::Spawned {
                        tab_id: id.clone(),
                        incarnation,
                        process_id: 100 + index as u32,
                    }),
                    now,
                );
                holders
                    .entry(id.clone())
                    .or_insert_with(|| holder::State::new(id, incarnation, state.epoch));
                events.push("spawn-or-duplicate-start".into());
            }
            4 => {
                server::step(
                    &mut state,
                    Event::HolderConnectionLost {
                        tab_id: id,
                        incarnation: incarnation.saturating_sub(1),
                    },
                    now,
                );
                events.push("stale-holder-death".into());
            }
            5 if incarnation > 0 => {
                server::step(
                    &mut state,
                    Event::HolderConnectionLost {
                        tab_id: id.clone(),
                        incarnation,
                    },
                    now,
                );
                holders.remove(&id);
                events.push("holder-death".into());
            }
            6 if incarnation > 0 => {
                server::step(
                    &mut state,
                    Event::DeadlineMissed {
                        tab_id: id,
                        incarnation,
                    },
                    now,
                );
                events.push("start-budget-or-child-death".into());
            }
            7 => {
                server::step(
                    &mut state,
                    Event::Create {
                        tab_id: id,
                        size: (100, 30),
                    },
                    now,
                );
                events.push("duplicate-start-request".into());
            }
            8 => {
                state.epoch = state.epoch.saturating_add(1);
                for holder in holders.values_mut() {
                    holder::step(holder, holder::Event::ServerEpoch(state.epoch), now);
                }
                events.push("server-death-and-replacement".into());
            }
            9 => {
                if let Some(model) = holders.get_mut(&id) {
                    let effects = holder::step(
                        model,
                        holder::Event::Input {
                            epoch: state.epoch.saturating_sub(1),
                            bytes: b"stale".to_vec(),
                            paste: false,
                        },
                        now,
                    );
                    if !effects.iter().any(
                        |effect| matches!(effect, Effect::Send { message, .. } if message == "stale-epoch"),
                    ) {
                        return failure(seed, &events, "lower epoch command was accepted");
                    }
                }
                events.push("stale-epoch".into());
            }
            10 => {
                events.push("slow-client-message-loss".into());
            }
            _ => {
                server::step(
                    &mut state,
                    Event::HolderHeartbeat {
                        tab_id: id,
                        incarnation: incarnation.saturating_sub(1),
                    },
                    now,
                );
                events.push("reordered-stale-heartbeat".into());
            }
        }
        committed_revision = committed_revision.max(state.revision);
        check_invariants(
            seed,
            &events,
            &state,
            &holders,
            &session_writers,
            committed_revision,
        )?;
    }
    // Invariant: drive level-triggered reconciliation to quiescence after the randomized prefix.
    for _ in 0..16 {
        now = now.saturating_add(server::START_SPACING);
        server::step(&mut state, Event::Tick { loop_healthy: true }, now);
        let starting = state
            .tabs
            .iter()
            .filter(|(_, tab)| tab.lifecycle == Lifecycle::Starting)
            .map(|(tab_id, tab)| (tab_id.clone(), tab.incarnation))
            .collect::<Vec<_>>();
        for (index, (tab_id, incarnation)) in starting.into_iter().enumerate() {
            server::step(
                &mut state,
                Event::Completed(Completion::Spawned {
                    tab_id,
                    incarnation,
                    process_id: 1_000 + index as u32,
                }),
                now,
            );
        }
    }
    if state.tabs.values().any(|tab| {
        !matches!(
            tab.lifecycle,
            Lifecycle::Starting
                | Lifecycle::Running
                | Lifecycle::Stopped
                | Lifecycle::HolderLost
                | Lifecycle::Failed
        )
    }) {
        return failure(
            seed,
            &events,
            "simulation did not converge to a terminal or live state",
        );
    }
    Ok(())
}

fn check_invariants(
    seed: u64,
    events: &[String],
    state: &State,
    holders: &HashMap<String, holder::State>,
    session_writers: &HashSet<String>,
    committed_revision: u64,
) -> Result<(), SimulationFailure> {
    if state.starts_in_flight > state.max_concurrent_starts {
        return failure(seed, events, "concurrent start limit exceeded");
    }
    if state.revision > committed_revision {
        return failure(seed, events, "committed mutation was lost");
    }
    if holders.iter().any(|(tab_id, holder)| {
        state
            .tabs
            .get(tab_id)
            .is_none_or(|tab| tab.incarnation != holder.incarnation)
    }) {
        return failure(
            seed,
            events,
            "more than one live holder incarnation was observed",
        );
    }
    if session_writers.len() != state.tabs.len() {
        return failure(
            seed,
            events,
            "session writer authority diverged from tab authority",
        );
    }
    // Invariant: one simulator server state represents exactly one registry writer.
    Ok(())
}

fn failure(seed: u64, events: &[String], reason: &str) -> Result<(), SimulationFailure> {
    let keep = events.len().min(64);
    Err(SimulationFailure {
        seed,
        events: events[events.len().saturating_sub(keep)..].to_vec(),
        reason: reason.into(),
    })
}

fn next(mut value: u64) -> u64 {
    value ^= value << 13;
    value ^= value >> 7;
    value ^ (value << 17)
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
        run_seeds(10_000, 96).unwrap();
    }

    #[test]
    #[ignore = "manual million-seed evidence target"]
    fn million_schedules_preserve_invariants() {
        run_seeds(1_000_000, 96).unwrap();
    }
}
