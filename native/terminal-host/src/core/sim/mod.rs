use std::collections::{HashMap, HashSet};
use std::time::Duration;

use super::holder;
use super::server::{self, Event, IdleObservation, Lifecycle, State};
use crate::controller::{ControllerCore, ControllerError};
use crate::core::{Completion, Effect};

/// One simulated attached client: which tab it views and the controller generation it holds.
#[derive(Debug, Clone)]
struct SimClient {
    tab_id: String,
    generation: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SimulationFailure {
    pub seed: u64,
    pub events: Vec<String>,
    pub reason: String,
}

pub fn run(seed: u64, steps: usize) -> Result<(), SimulationFailure> {
    run_masked(seed, steps, &HashSet::new())
}

/// Replays `seed` with the given step indices skipped. Skipped steps still advance the random
/// stream and the clock, so the remaining schedule is unchanged and failures stay comparable.
pub fn run_masked(seed: u64, steps: usize, skip: &HashSet<usize>) -> Result<(), SimulationFailure> {
    execute(seed, steps, skip, None, &mut Vec::new())
}

/// The executed event sequence of a schedule, for coverage checks and failure reports.
pub fn trace(seed: u64, steps: usize) -> Result<Vec<String>, SimulationFailure> {
    let mut events = Vec::new();
    execute(seed, steps, &HashSet::new(), None, &mut events)?;
    Ok(events)
}

fn execute(
    seed: u64,
    steps: usize,
    skip: &HashSet<usize>,
    fail_on: Option<&str>,
    events: &mut Vec<String>,
) -> Result<(), SimulationFailure> {
    let mut random = seed | 1;
    let mut controllers = HashMap::<String, ControllerCore>::new();
    let mut next_generation = 1_u64;
    let mut clients = HashMap::<u64, SimClient>::new();
    let mut next_client = 1_u64;
    let mut last_activity = Duration::ZERO;
    let mut now = Duration::ZERO;
    let mut state = State::new(1, 2);
    let mut holders = HashMap::<String, holder::State>::new();
    let mut session_writers = HashSet::<String>::new();
    let mut committed_revision = 0_u64;
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
    for step in 0..steps {
        random = next(random);
        now = now.saturating_add(Duration::from_millis(25 + random % 500));
        if skip.contains(&step) {
            continue;
        }
        let index = (random % 3) as usize;
        let id = format!("tab-{index}");
        let incarnation = state.tabs.get(&id).map_or(0, |tab| tab.incarnation);
        match random % 20 {
            16 => {
                // Concurrency: client churn attaches a viewer, or detaches one and releases any control it held.
                if random & 32 == 0 || clients.is_empty() {
                    clients.insert(
                        next_client,
                        SimClient {
                            tab_id: id,
                            generation: None,
                        },
                    );
                    next_client += 1;
                    events.push("client-attach".into());
                } else {
                    let victim = *clients
                        .keys()
                        .nth((random >> 8) as usize % clients.len())
                        .unwrap();
                    clients.remove(&victim);
                    events.push("client-detach".into());
                }
                last_activity = now;
            }
            17 => {
                // Protocol: control moves to one viewer through the ordered boundary, sometimes cancelled.
                let candidates = clients
                    .iter()
                    .filter(|(_, client)| client.tab_id == id)
                    .map(|(client, _)| *client)
                    .collect::<Vec<_>>();
                if let Some(target) =
                    candidates.get((random >> 8) as usize % candidates.len().max(1))
                {
                    let core = controllers
                        .entry(id.clone())
                        .or_insert_with(|| ControllerCore::new(0));
                    let old = core.active_generation();
                    let new = next_generation.max(old + 1);
                    next_generation = new + 1;
                    let transferred = (|| -> Result<bool, ControllerError> {
                        core.freeze(old, new)?;
                        if random & 64 != 0 {
                            core.cancel_transfer()?;
                            return Ok(false);
                        }
                        core.begin_drain()?;
                        while core.next_for_writer()?.is_some() {}
                        let nonce = (random as u128).to_be_bytes();
                        core.write_boundary(nonce)?;
                        core.acknowledge_boundary(new, nonce)?;
                        Ok(true)
                    })();
                    match transferred {
                        Ok(true) => {
                            for client in clients.values_mut().filter(|client| client.tab_id == id)
                            {
                                client.generation = None;
                            }
                            if let Some(client) = clients.get_mut(target) {
                                client.generation = Some(new);
                            }
                            events.push("controller-transfer".into());
                        }
                        Ok(false) => events.push("controller-transfer-cancelled".into()),
                        Err(error) => {
                            return failure(
                                seed,
                                events,
                                &format!("controller transfer failed: {error}"),
                            );
                        }
                    }
                } else {
                    events.push("controller-transfer-without-viewer".into());
                }
                last_activity = now;
            }
            18 => {
                // Invariant: input from a random client must be attributable to the tab's active controller.
                if let Some((client_id, client)) = clients
                    .iter()
                    .nth((random >> 8) as usize % clients.len().max(1))
                    .map(|(client_id, client)| (*client_id, client.clone()))
                {
                    let core = controllers
                        .entry(client.tab_id.clone())
                        .or_insert_with(|| ControllerCore::new(0));
                    let offered = client.generation.unwrap_or(0);
                    let admitted = core.admit(offered, format!("client-{client_id}").into_bytes());
                    let active = core.active_generation();
                    if admitted.is_ok() && (client.generation != Some(active) && active != 0) {
                        return failure(
                            seed,
                            events,
                            "input admitted from a client that is not the controller",
                        );
                    }
                    if admitted.is_ok() && client.generation.is_none() && active != 0 {
                        return failure(seed, events, "unattributable input was admitted");
                    }
                    events.push("client-input".into());
                } else {
                    events.push("input-without-client".into());
                }
                last_activity = now;
            }
            19 => {
                now = now.saturating_add(server::IDLE_EXIT / 2);
                events.push("idle-gap".into());
            }
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
                if state.tabs.get(&id).is_some_and(|tab| {
                    tab.incarnation == incarnation && tab.lifecycle == Lifecycle::Running
                }) {
                    holders.insert(id.clone(), holder::State::new(id, incarnation, state.epoch));
                }
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
                        tab_id: id.clone(),
                        incarnation,
                    },
                    now,
                );
                holders.remove(&id);
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
                        return failure(seed, events, "lower epoch command was accepted");
                    }
                }
                events.push("stale-epoch".into());
            }
            10 => {
                events.push("slow-client-message-loss".into());
            }
            11 if incarnation > 0 => {
                server::step(
                    &mut state,
                    Event::ChildExited {
                        tab_id: id.clone(),
                        incarnation,
                        reason: "injected-exit".into(),
                    },
                    now,
                );
                holders.remove(&id);
                events.push("child-exit".into());
            }
            12 if incarnation > 0 => {
                server::step(
                    &mut state,
                    Event::ChildExited {
                        tab_id: id,
                        incarnation: incarnation.saturating_sub(1),
                        reason: "late-exit".into(),
                    },
                    now,
                );
                events.push("late-superseded-child-exit".into());
            }
            13 => {
                server::step(
                    &mut state,
                    Event::Retry {
                        tab_id: id.clone(),
                        start_fresh: random & 1 == 0,
                    },
                    now,
                );
                holders.remove(&id);
                events.push("retry-or-fresh".into());
            }
            14 => {
                server::step(
                    &mut state,
                    Event::BridgeConnection {
                        tab_id: id,
                        incarnation,
                        connected: random & 1 == 0,
                    },
                    now,
                );
                events.push("bridge-reconnect".into());
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
        if fail_on.is_some_and(|event| events.last().is_some_and(|last| last == event)) {
            return failure(seed, events, "injected failure");
        }
        committed_revision = committed_revision.max(state.revision);
        check_invariants(
            seed,
            events,
            &state,
            &holders,
            &session_writers,
            committed_revision,
        )?;
        let live_holders = holders.len();
        let idle = server::idle_exit_due(IdleObservation {
            clients: clients.len(),
            bridges: 0,
            user_holders: live_holders,
            starting_holders: 0,
            since_activity: now.saturating_sub(last_activity),
        });
        if idle && (!clients.is_empty() || live_holders > 0) {
            return failure(
                seed,
                events,
                "idle exit was due while clients or tabs were live",
            );
        }
        if controllers.values().any(|core| {
            clients
                .values()
                .filter(|client| {
                    client
                        .generation
                        .is_some_and(|generation| generation == core.active_generation())
                })
                .count()
                > 1
        }) {
            return failure(
                seed,
                events,
                "two clients held the same controller generation",
            );
        }
    }
    // Invariant: drive level-triggered reconciliation to quiescence after the randomized prefix.
    for _ in 0..16 {
        now = now.saturating_add(Duration::from_secs(30));
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
                | Lifecycle::Crashed
                | Lifecycle::Restarting
                | Lifecycle::Unresponsive
                | Lifecycle::Failed
        )
    }) {
        let states = state
            .tabs
            .iter()
            .map(|(id, tab)| format!("{id}:{:?}", tab.lifecycle))
            .collect::<Vec<_>>()
            .join(",");
        return Err(SimulationFailure {
            seed,
            events: events[events.len().saturating_sub(64)..].to_vec(),
            reason: format!("simulation did not converge to a terminal or live state: {states}"),
        });
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
        if let Err(failure) = run(seed, steps) {
            return Err(minimize(seed, steps).unwrap_or(failure));
        }
    }
    Ok(())
}

/// Shrinks a failing schedule by masking one step at a time while the same failure still
/// reproduces, and returns the smallest event sequence found with its seed.
pub fn minimize(seed: u64, steps: usize) -> Option<SimulationFailure> {
    minimize_with(seed, steps, None)
}

fn minimize_with(seed: u64, steps: usize, fail_on: Option<&str>) -> Option<SimulationFailure> {
    let mut skip = HashSet::new();
    let mut failure = execute(seed, steps, &skip, fail_on, &mut Vec::new()).err()?;
    let reason = failure.reason.clone();
    for step in 0..steps {
        skip.insert(step);
        match execute(seed, steps, &skip, fail_on, &mut Vec::new()) {
            Err(smaller) if smaller.reason == reason => failure = smaller,
            _ => {
                skip.remove(&step);
            }
        }
    }
    Some(failure)
}

/// Seeds for the per-change corpus, or a larger nightly budget from `TERMINAL_HOST_SIM_SEEDS`.
pub fn seed_budget(default: u64) -> u64 {
    std::env::var("TERMINAL_HOST_SIM_SEEDS")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(default)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ten_thousand_schedules_preserve_invariants() {
        run_seeds(seed_budget(10_000), 96).unwrap();
    }

    #[test]
    fn minimization_keeps_the_seed_and_shrinks_to_the_failing_steps() {
        assert!(
            minimize(7, 96).is_none(),
            "a passing schedule has nothing to minimize"
        );
        let seed = (0..512)
            .find(|seed| {
                trace(*seed, 96)
                    .unwrap()
                    .iter()
                    .filter(|event| *event == "controller-transfer")
                    .count()
                    >= 2
            })
            .expect("a schedule with two transfers");
        let minimized = minimize_with(seed, 96, Some("controller-transfer")).unwrap();
        assert_eq!(minimized.seed, seed);
        assert_eq!(minimized.reason, "injected failure");
        assert_eq!(minimized.events.last().unwrap(), "controller-transfer");
        let full = trace(seed, 96).unwrap();
        assert!(
            minimized.events.len() < full.len(),
            "minimized {} of {} events",
            minimized.events.len(),
            full.len()
        );
    }

    #[test]
    fn every_fault_kind_occurs_in_the_corpus() {
        let mut seen = HashSet::new();
        for seed in 0..512 {
            seen.extend(trace(seed, 96).unwrap());
        }
        for kind in [
            "client-attach",
            "client-detach",
            "controller-transfer",
            "controller-transfer-cancelled",
            "client-input",
            "idle-gap",
            "server-death-and-replacement",
            "holder-death",
            "stale-epoch",
            "child-exit",
            "reordered-stale-heartbeat",
            "duplicate-start-request",
        ] {
            assert!(seen.contains(kind), "corpus never exercised {kind}");
        }
    }

    #[test]
    #[ignore = "manual million-seed evidence target"]
    fn million_schedules_preserve_invariants() {
        run_seeds(1_000_000, 96).unwrap();
    }
}
