use std::collections::VecDeque;
use std::fmt;

const MARKER_PREFIX: &[u8] = b"\x1bP+a1;controller=";
const MARKER_SUFFIX: &[u8] = b"\x1b\\";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdmittedInput {
    pub generation: u64,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransferState {
    Active { generation: u64 },
    Frozen { old: u64, new: u64 },
    Draining { old: u64, new: u64 },
    AwaitingBoundary { old: u64, new: u64, nonce: [u8; 16] },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ControllerError {
    StaleController { offered: u64, active: u64 },
    AdmissionFrozen,
    InvalidTransition,
    PendingInput(usize),
    StaleBoundary,
    SupersededCommand { admitted: u64, active: u64 },
    InvalidMarker,
}

impl fmt::Display for ControllerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::StaleController { offered, active } => write!(
                f,
                "controller generation {offered} is stale; active is {active}"
            ),
            Self::AdmissionFrozen => {
                write!(f, "input admission is frozen during controller transfer")
            }
            Self::InvalidTransition => write!(f, "controller transfer transition is invalid"),
            Self::PendingInput(count) => write!(f, "{count} admitted input items remain undrained"),
            Self::StaleBoundary => write!(
                f,
                "controller boundary acknowledgement is stale or mismatched"
            ),
            Self::SupersededCommand { admitted, active } => write!(
                f,
                "command generation {admitted} was superseded by {active}"
            ),
            Self::InvalidMarker => write!(f, "controller marker is malformed"),
        }
    }
}

impl std::error::Error for ControllerError {}

#[derive(Debug)]
pub struct ControllerCore {
    state: TransferState,
    admitted: VecDeque<AdmittedInput>,
}

impl ControllerCore {
    pub fn new(generation: u64) -> Self {
        Self {
            state: TransferState::Active { generation },
            admitted: VecDeque::new(),
        }
    }

    pub fn state(&self) -> TransferState {
        self.state
    }

    pub fn active_generation(&self) -> u64 {
        match self.state {
            TransferState::Active { generation } => generation,
            TransferState::Frozen { old, .. }
            | TransferState::Draining { old, .. }
            | TransferState::AwaitingBoundary { old, .. } => old,
        }
    }

    pub fn admit(&mut self, generation: u64, bytes: Vec<u8>) -> Result<(), ControllerError> {
        match self.state {
            TransferState::Active { generation: active } if generation == active => {
                self.admitted.push_back(AdmittedInput { generation, bytes });
                Ok(())
            }
            TransferState::Active { generation: active } => Err(ControllerError::StaleController {
                offered: generation,
                active,
            }),
            _ => Err(ControllerError::AdmissionFrozen),
        }
    }

    pub fn freeze(&mut self, old: u64, new: u64) -> Result<(), ControllerError> {
        match self.state {
            TransferState::Active { generation } if generation == old && new > old => {
                self.state = TransferState::Frozen { old, new };
                Ok(())
            }
            _ => Err(ControllerError::InvalidTransition),
        }
    }

    pub fn begin_drain(&mut self) -> Result<(), ControllerError> {
        match self.state {
            TransferState::Frozen { old, new } => {
                self.state = TransferState::Draining { old, new };
                Ok(())
            }
            _ => Err(ControllerError::InvalidTransition),
        }
    }

    /// Removes the next accepted item for the holder's single ordered PTY writer.
    pub fn next_for_writer(&mut self) -> Result<Option<AdmittedInput>, ControllerError> {
        if !matches!(
            self.state,
            TransferState::Draining { .. } | TransferState::Active { .. }
        ) {
            return Err(ControllerError::InvalidTransition);
        }
        Ok(self.admitted.pop_front())
    }

    pub fn write_boundary(&mut self, nonce: [u8; 16]) -> Result<Vec<u8>, ControllerError> {
        match self.state {
            TransferState::Draining { old, new } => {
                if !self.admitted.is_empty() {
                    return Err(ControllerError::PendingInput(self.admitted.len()));
                }
                self.state = TransferState::AwaitingBoundary { old, new, nonce };
                Ok(encode_boundary_marker(new, nonce))
            }
            _ => Err(ControllerError::InvalidTransition),
        }
    }

    /// Cancels a disconnected transfer before acknowledgement; the old generation stays owner.
    pub fn cancel_transfer(&mut self) -> Result<(), ControllerError> {
        match self.state {
            TransferState::Frozen { old, .. }
            | TransferState::Draining { old, .. }
            | TransferState::AwaitingBoundary { old, .. } => {
                self.state = TransferState::Active { generation: old };
                Ok(())
            }
            TransferState::Active { .. } => Err(ControllerError::InvalidTransition),
        }
    }

    pub fn acknowledge_boundary(
        &mut self,
        generation: u64,
        nonce: [u8; 16],
    ) -> Result<(), ControllerError> {
        match self.state {
            TransferState::AwaitingBoundary {
                new,
                nonce: expected,
                ..
            } if generation == new && nonce == expected => {
                self.state = TransferState::Active { generation: new };
                Ok(())
            }
            TransferState::AwaitingBoundary { .. } => Err(ControllerError::StaleBoundary),
            _ => Err(ControllerError::InvalidTransition),
        }
    }

    pub fn authorize_command(&self, admitted_generation: u64) -> Result<(), ControllerError> {
        match self.state {
            TransferState::Active { generation } if generation == admitted_generation => Ok(()),
            TransferState::Active { generation } => Err(ControllerError::SupersededCommand {
                admitted: admitted_generation,
                active: generation,
            }),
            _ => Err(ControllerError::AdmissionFrozen),
        }
    }
}

pub fn encode_boundary_marker(generation: u64, nonce: [u8; 16]) -> Vec<u8> {
    let mut marker = Vec::with_capacity(64);
    marker.extend_from_slice(MARKER_PREFIX);
    marker.extend_from_slice(generation.to_string().as_bytes());
    marker.push(b';');
    marker.extend_from_slice(hex::encode(nonce).as_bytes());
    marker.extend_from_slice(MARKER_SUFFIX);
    marker
}

pub fn decode_boundary_marker(bytes: &[u8]) -> Result<(u64, [u8; 16]), ControllerError> {
    if !bytes.starts_with(MARKER_PREFIX) || !bytes.ends_with(MARKER_SUFFIX) {
        return Err(ControllerError::InvalidMarker);
    }
    let body = &bytes[MARKER_PREFIX.len()..bytes.len() - MARKER_SUFFIX.len()];
    let separator = body
        .iter()
        .position(|byte| *byte == b';')
        .ok_or(ControllerError::InvalidMarker)?;
    let generation = std::str::from_utf8(&body[..separator])
        .ok()
        .and_then(|value| value.parse().ok())
        .ok_or(ControllerError::InvalidMarker)?;
    let nonce_bytes =
        hex::decode(&body[separator + 1..]).map_err(|_| ControllerError::InvalidMarker)?;
    let nonce: [u8; 16] = nonce_bytes
        .try_into()
        .map_err(|_| ControllerError::InvalidMarker)?;
    Ok((generation, nonce))
}

/// Fixture parser: returns all ordinary bytes before an exact complete boundary and its ack.
pub fn admit_fixture_stream(
    bytes: &[u8],
) -> Result<(Vec<u8>, Option<(u64, [u8; 16])>), ControllerError> {
    let Some(start) = bytes
        .windows(MARKER_PREFIX.len())
        .position(|window| window == MARKER_PREFIX)
    else {
        return Ok((bytes.to_vec(), None));
    };
    let marker_tail = &bytes[start..];
    let Some(end) = marker_tail
        .windows(MARKER_SUFFIX.len())
        .position(|window| window == MARKER_SUFFIX)
    else {
        return Ok((bytes[..start].to_vec(), None));
    };
    let marker_end = start + end + MARKER_SUFFIX.len();
    if marker_end != bytes.len() {
        return Err(ControllerError::InvalidMarker);
    }
    let ack = decode_boundary_marker(&bytes[start..marker_end])?;
    Ok((bytes[..start].to_vec(), Some(ack)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn transfer_waits_for_drain_and_matching_child_boundary() {
        let mut core = ControllerCore::new(3);
        core.admit(3, b"old-a".to_vec()).expect("admit a");
        core.admit(3, b"old-b".to_vec()).expect("admit b");
        core.freeze(3, 4).expect("freeze");
        assert_eq!(
            core.admit(3, b"late".to_vec()),
            Err(ControllerError::AdmissionFrozen)
        );
        core.begin_drain().expect("drain");
        assert_eq!(
            core.write_boundary([7; 16]),
            Err(ControllerError::PendingInput(2))
        );
        assert_eq!(
            core.next_for_writer().expect("first").expect("item").bytes,
            b"old-a"
        );
        assert_eq!(
            core.next_for_writer().expect("second").expect("item").bytes,
            b"old-b"
        );
        let marker = core.write_boundary([7; 16]).expect("boundary");
        let (prior, ack) =
            admit_fixture_stream(&[b"accepted".as_slice(), marker.as_slice()].concat())
                .expect("fixture");
        assert_eq!(prior, b"accepted");
        assert_eq!(ack, Some((4, [7; 16])));
        assert_eq!(
            core.acknowledge_boundary(4, [8; 16]),
            Err(ControllerError::StaleBoundary)
        );
        core.acknowledge_boundary(4, [7; 16]).expect("ack");
        assert_eq!(
            core.authorize_command(3),
            Err(ControllerError::SupersededCommand {
                admitted: 3,
                active: 4
            })
        );
        core.admit(4, b"new".to_vec()).expect("new input");
    }

    #[test]
    fn deterministic_interleavings_never_relabel_old_commands() {
        for old_items in 0..8 {
            for stale_ack in [false, true] {
                let mut core = ControllerCore::new(10);
                for index in 0..old_items {
                    core.admit(10, vec![index]).expect("admit");
                }
                core.freeze(10, 11).expect("freeze");
                core.begin_drain().expect("drain");
                while core.next_for_writer().expect("writer").is_some() {}
                core.write_boundary([9; 16]).expect("marker");
                if stale_ack {
                    assert!(core.acknowledge_boundary(10, [9; 16]).is_err());
                }
                core.acknowledge_boundary(11, [9; 16]).expect("correct ack");
                assert!(matches!(
                    core.authorize_command(10),
                    Err(ControllerError::SupersededCommand { .. })
                ));
            }
        }
    }

    #[test]
    fn disconnect_duplicate_ack_and_repeated_transfers_are_deterministic() {
        let mut core = ControllerCore::new(1);
        core.freeze(1, 2).expect("first freeze");
        core.cancel_transfer().expect("disconnect rollback");
        assert_eq!(core.state(), TransferState::Active { generation: 1 });

        for generation in 2..=8 {
            core.freeze(generation - 1, generation)
                .expect("repeat freeze");
            core.begin_drain().expect("repeat drain");
            let nonce = [generation as u8; 16];
            core.write_boundary(nonce).expect("repeat marker");
            core.acknowledge_boundary(generation, nonce)
                .expect("repeat ack");
            assert_eq!(
                core.acknowledge_boundary(generation, nonce),
                Err(ControllerError::InvalidTransition)
            );
            assert!(matches!(
                core.authorize_command(generation - 1),
                Err(ControllerError::SupersededCommand { .. })
            ));
        }
    }

    #[test]
    fn marker_round_trip_is_exact() {
        let marker = encode_boundary_marker(42, [0xab; 16]);
        assert_eq!(decode_boundary_marker(&marker), Ok((42, [0xab; 16])));
        assert_eq!(
            marker,
            b"\x1bP+a1;controller=42;abababababababababababababababab\x1b\\"
        );
    }
}
