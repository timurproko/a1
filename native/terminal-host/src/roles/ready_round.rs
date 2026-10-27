//! Coalesced wake notifications signal readiness, not the number of queued messages.
use std::sync::mpsc::{Receiver, TryRecvError};
use std::time::Duration;

/// A bounded reactor round must prove quiescence before waiting for another wake notification.
#[derive(Default)]
pub(super) struct ReadyRound {
    progressed: bool,
}

impl ReadyRound {
    pub(super) fn receive<T>(&mut self, receiver: &Receiver<T>) -> Result<T, TryRecvError> {
        let result = receiver.try_recv();
        self.progressed |= result.is_ok();
        result
    }

    pub(super) fn wait(self, wake: &Receiver<()>, timeout: Duration) {
        if !self.progressed {
            let _ = wake.recv_timeout(timeout);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    #[test]
    fn one_coalesced_wake_services_multiple_bounded_rounds_without_idle_waits() {
        let (sender, receiver) = mpsc::channel();
        let (wake_sender, wake) = mpsc::sync_channel(1);
        for value in 0..37 {
            sender.send(value).unwrap();
        }
        wake_sender.send(()).unwrap();
        let mut received = Vec::new();
        for _ in 0..5 {
            let mut round = ReadyRound::default();
            for _ in 0..8 {
                let Ok(value) = round.receive(&receiver) else {
                    break;
                };
                received.push(value);
            }
            round.wait(&wake, Duration::ZERO);
        }
        // Invariant: active rounds never consume the sole wake or need another producer pulse.
        assert_eq!(wake.try_recv(), Ok(()));
        assert_eq!(received, (0..37).collect::<Vec<_>>());
        wake_sender.send(()).unwrap();
        let mut empty = ReadyRound::default();
        assert_eq!(empty.receive(&receiver), Err(TryRecvError::Empty));
        empty.wait(&wake, Duration::ZERO);
        assert_eq!(wake.try_recv(), Err(TryRecvError::Empty));
    }

    #[test]
    fn progress_in_either_lane_prevents_wait_without_draining_the_other_lane() {
        let (commands, command_rx) = mpsc::channel();
        let (output, output_rx) = mpsc::channel();
        let (wake_sender, wake) = mpsc::sync_channel(1);
        for lane in 0..2 {
            if lane == 0 {
                commands.send(7).unwrap();
            } else {
                output.send(9).unwrap();
            }
            wake_sender.send(()).unwrap();
            let mut round = ReadyRound::default();
            let command = round.receive(&command_rx).ok();
            let frame = round.receive(&output_rx).ok();
            assert_eq!(
                (command, frame),
                if lane == 0 {
                    (Some(7), None)
                } else {
                    (None, Some(9))
                }
            );
            round.wait(&wake, Duration::ZERO);
            assert_eq!(wake.try_recv(), Ok(()));
        }
    }

    #[test]
    fn disconnected_lanes_do_not_keep_an_idle_reactor_spinning() {
        let (sender, receiver) = mpsc::channel::<()>();
        let (wake_sender, wake) = mpsc::sync_channel(1);
        drop(sender);
        wake_sender.send(()).unwrap();
        let mut round = ReadyRound::default();
        assert_eq!(round.receive(&receiver), Err(TryRecvError::Disconnected));
        round.wait(&wake, Duration::ZERO);
        assert_eq!(wake.try_recv(), Err(TryRecvError::Empty));
    }
}
