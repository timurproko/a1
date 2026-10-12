use std::collections::VecDeque;
use std::time::Duration;

use super::{Effect, Timer};

pub const INPUT_CAPACITY: usize = 1024 * 1024;

#[derive(Debug)]
pub struct State {
    pub tab_id: String,
    pub incarnation: u64,
    pub highest_epoch: u64,
    pub pty_ready: bool,
    pub queued_bytes: usize,
    pub admitted_bytes: u64,
    pub written_bytes: u64,
    writer_busy: bool,
    queue: VecDeque<Vec<u8>>,
}
impl State {
    pub fn new(tab_id: String, incarnation: u64, epoch: u64) -> Self {
        Self {
            tab_id,
            incarnation,
            highest_epoch: epoch,
            pty_ready: false,
            queued_bytes: 0,
            admitted_bytes: 0,
            written_bytes: 0,
            writer_busy: false,
            queue: VecDeque::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub enum Event {
    Start,
    PtyReady,
    Input {
        epoch: u64,
        bytes: Vec<u8>,
        paste: bool,
    },
    Written {
        bytes: usize,
    },
    WriterFailed,
    ServerEpoch(u64),
    Tick,
}

pub fn step(state: &mut State, event: Event, _now: Duration) -> Vec<Effect> {
    let mut effects = Vec::new();
    match event {
        Event::Start => effects.push(Effect::CreatePty {
            tab_id: state.tab_id.clone(),
            incarnation: state.incarnation,
            deadline: Duration::from_secs(5),
        }),
        Event::PtyReady => {
            state.pty_ready = true;
            flush(state, &mut effects);
        }
        Event::Input {
            epoch,
            bytes,
            paste: _,
        } => {
            if epoch < state.highest_epoch {
                effects.push(Effect::Send {
                    peer: "server".into(),
                    message: "stale-epoch".into(),
                });
            } else if bytes.len() > INPUT_CAPACITY.saturating_sub(state.queued_bytes) {
                effects.push(Effect::Send {
                    peer: "server".into(),
                    message: "input-rejected:not-accepting-input".into(),
                });
            } else {
                state.highest_epoch = epoch;
                state.queued_bytes += bytes.len();
                state.admitted_bytes = state.admitted_bytes.saturating_add(bytes.len() as u64);
                state.queue.push_back(bytes);
                flush(state, &mut effects);
            }
        }
        Event::Written { bytes } => {
            state.writer_busy = false;
            state.queued_bytes = state.queued_bytes.saturating_sub(bytes);
            state.written_bytes = state.written_bytes.saturating_add(bytes as u64);
            flush(state, &mut effects);
        }
        Event::WriterFailed => effects.push(Effect::Send {
            peer: "server".into(),
            message: format!(
                "input-uncertain:{}:{}",
                state.admitted_bytes, state.written_bytes
            ),
        }),
        Event::ServerEpoch(epoch) => {
            if epoch >= state.highest_epoch {
                state.highest_epoch = epoch;
            }
        }
        Event::Tick => {
            effects.push(Effect::Send {
                peer: "server".into(),
                message: format!("heartbeat:{}", state.incarnation),
            });
            effects.push(Effect::ArmTimer {
                timer: Timer::HolderHeartbeat(state.tab_id.clone()),
                after: Duration::from_secs(5),
            });
        }
    }
    effects
}

fn flush(state: &mut State, effects: &mut Vec<Effect>) {
    if !state.pty_ready || state.writer_busy {
        return;
    }
    if let Some(bytes) = state.queue.pop_front() {
        state.writer_busy = true;
        effects.push(Effect::WritePty { bytes });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn paste_is_rejected_whole_and_old_epoch_is_fenced() {
        let mut state = State::new("tab".into(), 1, 4);
        let rejected = step(
            &mut state,
            Event::Input {
                epoch: 4,
                bytes: vec![0; INPUT_CAPACITY + 1],
                paste: true,
            },
            Duration::ZERO,
        );
        assert_eq!(state.admitted_bytes, 0);
        assert!(
            matches!(&rejected[0], Effect::Send { message, .. } if message.contains("input-rejected"))
        );
        let stale = step(
            &mut state,
            Event::Input {
                epoch: 3,
                bytes: b"x".to_vec(),
                paste: false,
            },
            Duration::ZERO,
        );
        assert!(matches!(&stale[0], Effect::Send { message, .. } if message == "stale-epoch"));
    }
}
