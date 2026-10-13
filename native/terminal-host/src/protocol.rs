use std::fmt;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize, de::DeserializeOwned};
use sha2::{Digest, Sha256};

pub const GENERATION: u16 = 1;
pub const MAX_FRAME_BYTES: usize = 2 * 1024 * 1024;
pub const MAX_INPUT_BYTES: usize = 1024 * 1024;
pub const MAX_NESTING: usize = 64;
pub const MAX_COLLECTION_ITEMS: usize = 65_536;
pub const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(4);

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProtocolError {
    FrameTooLarge(usize),
    InputTooLarge(usize),
    Incomplete,
    TrailingBytes,
    NestingLimit,
    CollectionLimit(usize),
    InvalidMessagePack(String),
    HandshakeTimeout,
    IncompatibleGeneration { offered: u16, supported: u16 },
}

impl fmt::Display for ProtocolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FrameTooLarge(size) => write!(f, "frame length {size} exceeds {MAX_FRAME_BYTES}"),
            Self::InputTooLarge(size) => write!(f, "input length {size} exceeds {MAX_INPUT_BYTES}"),
            Self::Incomplete => write!(f, "incomplete frame"),
            Self::TrailingBytes => write!(f, "message contains trailing bytes"),
            Self::NestingLimit => write!(f, "message exceeds nesting limit {MAX_NESTING}"),
            Self::CollectionLimit(size) => {
                write!(f, "collection length {size} exceeds {MAX_COLLECTION_ITEMS}")
            }
            Self::InvalidMessagePack(reason) => write!(f, "invalid MessagePack: {reason}"),
            Self::HandshakeTimeout => write!(f, "handshake exceeded four seconds"),
            Self::IncompatibleGeneration { offered, supported } => {
                write!(
                    f,
                    "incompatible generation {offered}; supported generation is {supported}"
                )
            }
        }
    }
}

impl std::error::Error for ProtocolError {}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Envelope<T> {
    #[serde(rename = "type")]
    pub message_type: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<u64>,
    pub body: T,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Hello {
    pub role: String,
    pub generation: u16,
    pub build: String,
    #[serde(default)]
    pub features: Vec<String>,
    pub token: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Welcome {
    pub generation: u16,
    pub build: String,
    #[serde(default)]
    pub features: Vec<String>,
    pub frame_limit: u32,
    pub input_limit: u32,
    #[serde(default, skip_serializing_if = "is_zero")]
    pub epoch: u64,
}

fn is_zero(value: &u64) -> bool {
    *value == 0
}
fn is_zero_usize(value: &usize) -> bool {
    *value == 0
}

fn is_false(value: &bool) -> bool {
    !*value
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncompatibleGeneration {
    pub offered: u16,
    pub supported: u16,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ControllerBoundary {
    pub generation: u64,
    pub nonce: [u8; 16],
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeAttachment {
    pub client_id: String,
    pub controller_revision: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeRequest {
    pub action: String,
    pub client_id: String,
    pub controller_revision: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeHeartbeat {
    pub seq: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeStatus {
    pub seq: u64,
    pub state: String,
    #[serde(default, skip_serializing_if = "is_zero_usize")]
    pub pending_requests: usize,
    #[serde(default, skip_serializing_if = "is_zero_usize")]
    pub queued_input: usize,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accent: Option<String>,
    #[serde(default, skip_serializing_if = "is_false")]
    pub degraded: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeSession {
    pub file: Option<String>,
    pub name: Option<String>,
    pub name_source: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BridgePrompt {
    pub interrupted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BridgeVisibility {
    pub visible: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeRename {
    pub name: String,
    pub name_source: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeStop {
    pub deadline_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolderRespawn {
    pub tab_id: String,
    pub incarnation: u64,
    pub session_file: Option<String>,
    #[serde(default)]
    pub recovery_journals: Vec<String>,
    #[serde(default)]
    pub start_fresh: bool,
    #[serde(default)]
    pub holder_token: Vec<u8>,
    #[serde(default)]
    pub bridge_token: Vec<u8>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolderSnapshot {
    pub tab_id: String,
    pub incarnation: u64,
    pub status: String,
}

pub fn encode_frame<T: Serialize>(value: &T) -> Result<Vec<u8>, ProtocolError> {
    let payload = rmp_serde::to_vec_named(value)
        .map_err(|error| ProtocolError::InvalidMessagePack(error.to_string()))?;
    if payload.len() > MAX_FRAME_BYTES {
        return Err(ProtocolError::FrameTooLarge(payload.len()));
    }
    let mut frame = Vec::with_capacity(4 + payload.len());
    frame.extend_from_slice(&(payload.len() as u32).to_le_bytes());
    frame.extend_from_slice(&payload);
    Ok(frame)
}

pub fn decode_payload<T: DeserializeOwned>(payload: &[u8]) -> Result<T, ProtocolError> {
    if payload.len() > MAX_FRAME_BYTES {
        return Err(ProtocolError::FrameTooLarge(payload.len()));
    }
    validate_messagepack_shape(payload)?;
    let mut decoder = rmp_serde::Deserializer::new(payload);
    let value = T::deserialize(&mut decoder)
        .map_err(|error| ProtocolError::InvalidMessagePack(error.to_string()))?;
    if decoder.get_ref().len() != 0 {
        return Err(ProtocolError::TrailingBytes);
    }
    Ok(value)
}

pub fn decode_frame<T: DeserializeOwned>(frame: &[u8]) -> Result<T, ProtocolError> {
    if frame.len() < 4 {
        return Err(ProtocolError::Incomplete);
    }
    let size = u32::from_le_bytes(frame[..4].try_into().expect("four byte frame header")) as usize;
    if size > MAX_FRAME_BYTES {
        return Err(ProtocolError::FrameTooLarge(size));
    }
    if frame.len() != size + 4 {
        return if frame.len() < size + 4 {
            Err(ProtocolError::Incomplete)
        } else {
            Err(ProtocolError::TrailingBytes)
        };
    }
    decode_payload(&frame[4..])
}

pub fn validate_input_size(bytes: &[u8]) -> Result<(), ProtocolError> {
    if bytes.len() > MAX_INPUT_BYTES {
        return Err(ProtocolError::InputTooLarge(bytes.len()));
    }
    Ok(())
}

pub fn check_handshake(started: Instant, offered_generation: u16) -> Result<(), ProtocolError> {
    if started.elapsed() > HANDSHAKE_TIMEOUT {
        return Err(ProtocolError::HandshakeTimeout);
    }
    if offered_generation != GENERATION {
        return Err(ProtocolError::IncompatibleGeneration {
            offered: offered_generation,
            supported: GENERATION,
        });
    }
    Ok(())
}

/// Incremental framing that refuses an oversized declaration before reserving its payload.
#[derive(Default)]
pub struct FrameDecoder {
    header: Vec<u8>,
    payload: Vec<u8>,
    expected: Option<usize>,
}

impl FrameDecoder {
    pub fn push(&mut self, mut bytes: &[u8]) -> Result<Vec<Vec<u8>>, ProtocolError> {
        let mut frames = Vec::new();
        while !bytes.is_empty() {
            if self.expected.is_none() {
                let take = (4 - self.header.len()).min(bytes.len());
                self.header.extend_from_slice(&bytes[..take]);
                bytes = &bytes[take..];
                if self.header.len() < 4 {
                    continue;
                }
                let expected =
                    u32::from_le_bytes(self.header[..4].try_into().expect("four byte header"))
                        as usize;
                self.header.clear();
                if expected > MAX_FRAME_BYTES {
                    return Err(ProtocolError::FrameTooLarge(expected));
                }
                self.payload = Vec::with_capacity(expected.min(64 * 1024));
                self.expected = Some(expected);
            }
            let expected = self.expected.expect("expected set");
            let take = (expected - self.payload.len()).min(bytes.len());
            self.payload.extend_from_slice(&bytes[..take]);
            bytes = &bytes[take..];
            if self.payload.len() == expected {
                validate_messagepack_shape(&self.payload)?;
                frames.push(std::mem::take(&mut self.payload));
                self.expected = None;
            }
        }
        Ok(frames)
    }
}

pub fn fixture_set() -> Result<Vec<(String, Vec<u8>)>, ProtocolError> {
    let fixtures = vec![
        (
            "hello.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "hello".to_owned(),
                request_id: Some(1),
                body: Hello {
                    role: "attach".to_owned(),
                    generation: GENERATION,
                    build: "fixture".to_owned(),
                    features: vec!["controller-boundary".to_owned()],
                    token: vec![0, 1, 2, 3],
                },
            })?,
        ),
        (
            "welcome.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "welcome".to_owned(),
                request_id: Some(1),
                body: Welcome {
                    generation: GENERATION,
                    build: "fixture".to_owned(),
                    features: vec!["controller-boundary".to_owned()],
                    frame_limit: MAX_FRAME_BYTES as u32,
                    input_limit: MAX_INPUT_BYTES as u32,
                    epoch: 0,
                },
            })?,
        ),
        (
            "incompatible-generation.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "incompatible-generation".to_owned(),
                request_id: Some(1),
                body: IncompatibleGeneration {
                    offered: 2,
                    supported: GENERATION,
                },
            })?,
        ),
        (
            "controller-boundary.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "controller-boundary".to_owned(),
                request_id: None,
                body: ControllerBoundary {
                    generation: 2,
                    nonce: [0x5a; 16],
                },
            })?,
        ),
        (
            "bridge-boundary.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.boundary".to_owned(),
                request_id: None,
                body: ControllerBoundary {
                    generation: 7,
                    nonce: [0x07; 16],
                },
            })?,
        ),
        (
            "bridge-attachment.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "attachment".to_owned(),
                request_id: None,
                body: BridgeAttachment {
                    client_id: "client-1".to_owned(),
                    controller_revision: 7,
                },
            })?,
        ),
        (
            "bridge-request-detach.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.request".to_owned(),
                request_id: Some(9),
                body: BridgeRequest {
                    action: "detach".to_owned(),
                    client_id: "client-1".to_owned(),
                    controller_revision: 7,
                },
            })?,
        ),
        (
            "bridge-request-restart.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.request".to_owned(),
                request_id: Some(10),
                body: BridgeRequest {
                    action: "restart".to_owned(),
                    client_id: "client-1".to_owned(),
                    controller_revision: 7,
                },
            })?,
        ),
        (
            "bridge-heartbeat.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.heartbeat".to_owned(),
                request_id: None,
                body: BridgeHeartbeat { seq: 11 },
            })?,
        ),
        (
            "bridge-status-unresponsive.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.status".to_owned(),
                request_id: None,
                body: BridgeStatus {
                    seq: 12,
                    state: "unresponsive".to_owned(),
                    pending_requests: 0,
                    queued_input: 0,
                    accent: None,
                    degraded: false,
                },
            })?,
        ),
        (
            "bridge-status-complete.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.status".to_owned(),
                request_id: None,
                body: BridgeStatus {
                    seq: 13,
                    state: "needs-input".to_owned(),
                    pending_requests: 2,
                    queued_input: 1,
                    accent: Some("orange".to_owned()),
                    degraded: true,
                },
            })?,
        ),
        (
            "bridge-session.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.session".to_owned(),
                request_id: None,
                body: BridgeSession {
                    file: Some("session.jsonl".to_owned()),
                    name: Some("fix-login".to_owned()),
                    name_source: "auto".to_owned(),
                },
            })?,
        ),
        (
            "bridge-prompt.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.prompt".to_owned(),
                request_id: None,
                body: BridgePrompt { interrupted: true },
            })?,
        ),
        (
            "bridge-visibility.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.visibility".to_owned(),
                request_id: None,
                body: BridgeVisibility { visible: false },
            })?,
        ),
        (
            "bridge-rename.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.rename".to_owned(),
                request_id: None,
                body: BridgeRename {
                    name: "user-name".to_owned(),
                    name_source: "user".to_owned(),
                },
            })?,
        ),
        (
            "bridge-stop.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.stop".to_owned(),
                request_id: Some(14),
                body: BridgeStop { deadline_ms: 5_000 },
            })?,
        ),
        (
            "holder-respawn.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "holder.respawn".to_owned(),
                request_id: Some(13),
                body: HolderRespawn {
                    tab_id: "tab-1".to_owned(),
                    incarnation: 2,
                    session_file: Some("session.jsonl".to_owned()),
                    recovery_journals: vec!["journal.jsonl".to_owned()],
                    start_fresh: false,
                    holder_token: vec![1, 2, 3],
                    bridge_token: vec![4, 5, 6],
                },
            })?,
        ),
        (
            "holder-snapshot.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "holder.snapshot".to_owned(),
                request_id: None,
                body: HolderSnapshot {
                    tab_id: "tab-1".to_owned(),
                    incarnation: 1,
                    status: "crashed".to_owned(),
                },
            })?,
        ),
    ];
    Ok(fixtures)
}

pub fn fixture_manifest_digest(fixtures: &[(String, Vec<u8>)]) -> String {
    let mut ordered = fixtures.iter().collect::<Vec<_>>();
    ordered.sort_by(|left, right| left.0.cmp(&right.0));
    let mut digest = Sha256::new();
    for (name, bytes) in ordered {
        digest.update((name.len() as u32).to_le_bytes());
        digest.update(name.as_bytes());
        digest.update((bytes.len() as u32).to_le_bytes());
        digest.update(bytes);
    }
    hex::encode(digest.finalize())
}

pub fn fixture_manifest_json() -> Result<String, ProtocolError> {
    let mut fixtures = fixture_set()?;
    fixtures.sort_by(|left, right| left.0.cmp(&right.0));
    let digest = fixture_manifest_digest(&fixtures);
    let mut output = String::from(
        "{\n  \"schema\": \"a1-terminal-host-protocol-fixtures-v1\",\n  \"generation\": 1,\n  \"fixtures\": [\n",
    );
    for (index, (name, bytes)) in fixtures.iter().enumerate() {
        let sha = hex::encode(Sha256::digest(bytes));
        output.push_str(&format!(
            "    {{\"name\":\"{name}\",\"sha256\":\"{sha}\",\"bytes\":\"{}\"}}{}\n",
            hex::encode(bytes),
            if index + 1 == fixtures.len() { "" } else { "," }
        ));
    }
    output.push_str(&format!("  ],\n  \"digest\": \"{digest}\"\n}}\n"));
    Ok(output)
}

fn validate_messagepack_shape(payload: &[u8]) -> Result<(), ProtocolError> {
    let mut cursor = 0;
    scan_value(payload, &mut cursor, 0)?;
    if cursor != payload.len() {
        return Err(ProtocolError::TrailingBytes);
    }
    Ok(())
}

fn scan_value(bytes: &[u8], cursor: &mut usize, depth: usize) -> Result<(), ProtocolError> {
    if depth > MAX_NESTING {
        return Err(ProtocolError::NestingLimit);
    }
    let marker = take_byte(bytes, cursor)?;
    match marker {
        0x00..=0x7f | 0xe0..=0xff | 0xc0 | 0xc2 | 0xc3 => Ok(()),
        0x80..=0x8f => scan_map(bytes, cursor, (marker & 0x0f) as usize, depth),
        0x90..=0x9f => scan_array(bytes, cursor, (marker & 0x0f) as usize, depth),
        0xa0..=0xbf => skip(bytes, cursor, (marker & 0x1f) as usize),
        0xc4 => {
            let len = take_uint(bytes, cursor, 1)?;
            skip_collection_bytes(bytes, cursor, len)
        }
        0xc5 => {
            let len = take_uint(bytes, cursor, 2)?;
            skip_collection_bytes(bytes, cursor, len)
        }
        0xc6 => {
            let len = take_uint(bytes, cursor, 4)?;
            skip_collection_bytes(bytes, cursor, len)
        }
        0xc7 => {
            let len = take_uint(bytes, cursor, 1)?;
            skip(bytes, cursor, len + 1)
        }
        0xc8 => {
            let len = take_uint(bytes, cursor, 2)?;
            skip(bytes, cursor, len + 1)
        }
        0xc9 => {
            let len = take_uint(bytes, cursor, 4)?;
            skip(bytes, cursor, len + 1)
        }
        0xca => skip(bytes, cursor, 4),
        0xcb => skip(bytes, cursor, 8),
        0xcc | 0xd0 => skip(bytes, cursor, 1),
        0xcd | 0xd1 => skip(bytes, cursor, 2),
        0xce | 0xd2 => skip(bytes, cursor, 4),
        0xcf | 0xd3 => skip(bytes, cursor, 8),
        0xd4 => skip(bytes, cursor, 2),
        0xd5 => skip(bytes, cursor, 3),
        0xd6 => skip(bytes, cursor, 5),
        0xd7 => skip(bytes, cursor, 9),
        0xd8 => skip(bytes, cursor, 17),
        0xd9 => {
            let len = take_uint(bytes, cursor, 1)?;
            skip_collection_bytes(bytes, cursor, len)
        }
        0xda => {
            let len = take_uint(bytes, cursor, 2)?;
            skip_collection_bytes(bytes, cursor, len)
        }
        0xdb => {
            let len = take_uint(bytes, cursor, 4)?;
            skip_collection_bytes(bytes, cursor, len)
        }
        0xdc => {
            let len = take_uint(bytes, cursor, 2)?;
            scan_array(bytes, cursor, len, depth)
        }
        0xdd => {
            let len = take_uint(bytes, cursor, 4)?;
            scan_array(bytes, cursor, len, depth)
        }
        0xde => {
            let len = take_uint(bytes, cursor, 2)?;
            scan_map(bytes, cursor, len, depth)
        }
        0xdf => {
            let len = take_uint(bytes, cursor, 4)?;
            scan_map(bytes, cursor, len, depth)
        }
        0xc1 => Err(ProtocolError::InvalidMessagePack(
            "reserved marker".to_owned(),
        )),
    }
}

fn scan_array(
    bytes: &[u8],
    cursor: &mut usize,
    len: usize,
    depth: usize,
) -> Result<(), ProtocolError> {
    collection_bound(len)?;
    for _ in 0..len {
        scan_value(bytes, cursor, depth + 1)?;
    }
    Ok(())
}

fn scan_map(
    bytes: &[u8],
    cursor: &mut usize,
    len: usize,
    depth: usize,
) -> Result<(), ProtocolError> {
    collection_bound(len)?;
    for _ in 0..len {
        scan_value(bytes, cursor, depth + 1)?;
        scan_value(bytes, cursor, depth + 1)?;
    }
    Ok(())
}

fn collection_bound(len: usize) -> Result<(), ProtocolError> {
    if len > MAX_COLLECTION_ITEMS {
        Err(ProtocolError::CollectionLimit(len))
    } else {
        Ok(())
    }
}

fn skip_collection_bytes(
    bytes: &[u8],
    cursor: &mut usize,
    len: usize,
) -> Result<(), ProtocolError> {
    collection_bound(len)?;
    skip(bytes, cursor, len)
}

fn take_byte(bytes: &[u8], cursor: &mut usize) -> Result<u8, ProtocolError> {
    let value = *bytes.get(*cursor).ok_or(ProtocolError::Incomplete)?;
    *cursor += 1;
    Ok(value)
}

fn take_uint(bytes: &[u8], cursor: &mut usize, width: usize) -> Result<usize, ProtocolError> {
    if width > std::mem::size_of::<usize>() {
        return Err(ProtocolError::CollectionLimit(usize::MAX));
    }
    let end = cursor.checked_add(width).ok_or(ProtocolError::Incomplete)?;
    let source = bytes.get(*cursor..end).ok_or(ProtocolError::Incomplete)?;
    *cursor = end;
    Ok(source
        .iter()
        .fold(0usize, |value, byte| (value << 8) | *byte as usize))
}

fn skip(bytes: &[u8], cursor: &mut usize, len: usize) -> Result<(), ProtocolError> {
    let end = cursor.checked_add(len).ok_or(ProtocolError::Incomplete)?;
    if end > bytes.len() {
        return Err(ProtocolError::Incomplete);
    }
    *cursor = end;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_named_handshake() {
        let envelope = Envelope {
            message_type: "hello".to_owned(),
            request_id: Some(7),
            body: Hello {
                role: "holder".to_owned(),
                generation: GENERATION,
                build: "test".to_owned(),
                features: vec!["one".to_owned()],
                token: vec![1, 2, 3],
            },
        };
        let frame = encode_frame(&envelope).expect("encode");
        let decoded: Envelope<Hello> = decode_frame(&frame).expect("decode");
        assert_eq!(decoded, envelope);
    }

    #[test]
    fn refuses_oversized_header_before_payload() {
        let mut decoder = FrameDecoder::default();
        let error = decoder
            .push(&((MAX_FRAME_BYTES as u32 + 1).to_le_bytes()))
            .expect_err("oversized");
        assert!(matches!(error, ProtocolError::FrameTooLarge(_)));
    }

    #[test]
    fn fixture_digest_is_order_independent() {
        let fixtures = fixture_set().expect("fixtures");
        let expected = fixture_manifest_digest(&fixtures);
        let mut reversed = fixtures;
        reversed.reverse();
        assert_eq!(fixture_manifest_digest(&reversed), expected);
    }

    #[test]
    fn committed_fixture_manifest_matches_the_pinned_encoder() {
        assert_eq!(
            include_str!("../protocol/fixtures.json"),
            fixture_manifest_json().expect("manifest")
        );
    }

    #[test]
    fn arbitrary_bytes_never_panic() {
        for length in 0..512usize {
            let bytes = (0..length)
                .map(|index| ((index * 131 + length) & 0xff) as u8)
                .collect::<Vec<_>>();
            let _ = validate_messagepack_shape(&bytes);
        }
    }
}
