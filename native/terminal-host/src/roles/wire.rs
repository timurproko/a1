use std::io::{Read, Write};

use serde::{Deserialize, Serialize, de::IgnoredAny};

use crate::protocol::{self, Envelope, ProtocolError};

#[derive(Debug, Deserialize)]
pub struct EnvelopeKind {
    #[serde(rename = "type")]
    pub message_type: String,
    #[serde(default)]
    pub request_id: Option<u64>,
    pub body: IgnoredAny,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleHello {
    pub role: String,
    pub generation: u16,
    pub build: String,
    #[serde(default)]
    pub features: Vec<String>,
    pub token: Vec<u8>,
    #[serde(default)]
    pub tab_id: Option<String>,
    #[serde(default)]
    pub pid: Option<u32>,
    #[serde(default)]
    pub start_identity: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachStart {
    pub client_id: String,
    pub cwd: String,
    pub columns: u16,
    pub rows: u16,
    pub release_root: String,
    pub node_executable: String,
    pub environment: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolderLaunchConfig {
    pub endpoint: String,
    pub tab_id: String,
    pub incarnation: u64,
    pub token: Vec<u8>,
    pub bridge_token: Vec<u8>,
    pub cwd: String,
    pub columns: u16,
    pub rows: u16,
    pub release_root: String,
    pub node_executable: String,
    pub environment: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerLaunchConfig {
    pub profile: String,
    pub data_dir: String,
    pub runtime_dir: String,
    pub endpoint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Surface {
    pub revision: u64,
    pub bytes: Vec<u8>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasteStart {
    pub bytes: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Input {
    pub bytes: Vec<u8>,
    #[serde(default)]
    pub paste: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resize {
    pub columns: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolderReady {
    pub tab_id: String,
    pub pid: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HolderExit {
    pub code: Option<i32>,
    pub signal: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeStatus {
    pub seq: u64,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeSession {
    pub file: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultBody {
    pub accepted: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

pub fn read_payload(stream: &mut impl Read) -> Result<Option<Vec<u8>>, String> {
    let mut header = [0_u8; 4];
    match stream.read_exact(&mut header) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::UnexpectedEof => return Ok(None),
        Err(error) => return Err(format!("read resident frame header: {error}")),
    }
    let size = u32::from_le_bytes(header) as usize;
    if size > protocol::MAX_FRAME_BYTES {
        return Err(ProtocolError::FrameTooLarge(size).to_string());
    }
    let mut payload = vec![0_u8; size];
    stream
        .read_exact(&mut payload)
        .map_err(|error| format!("read resident frame payload: {error}"))?;
    Ok(Some(payload))
}

pub fn kind(payload: &[u8]) -> Result<EnvelopeKind, String> {
    protocol::decode_payload(payload).map_err(|error| error.to_string())
}

pub fn body<T: for<'de> Deserialize<'de>>(payload: &[u8]) -> Result<(Option<u64>, T), String> {
    let envelope: Envelope<T> =
        protocol::decode_payload(payload).map_err(|error| error.to_string())?;
    Ok((envelope.request_id, envelope.body))
}

pub fn frame<T: Serialize>(
    message_type: &str,
    request_id: Option<u64>,
    body: T,
) -> Result<Vec<u8>, String> {
    protocol::encode_frame(&Envelope {
        message_type: message_type.to_owned(),
        request_id,
        body,
    })
    .map_err(|error| error.to_string())
}

pub fn send<T: Serialize>(
    stream: &mut impl Write,
    message_type: &str,
    request_id: Option<u64>,
    body: T,
) -> Result<(), String> {
    let frame = frame(message_type, request_id, body)?;
    stream
        .write_all(&frame)
        .and_then(|()| stream.flush())
        .map_err(|error| format!("write resident frame: {error}"))
}
