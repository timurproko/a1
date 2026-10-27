use std::io::{Read, Write};

use serde::{Deserialize, Serialize, de::IgnoredAny};

use crate::endpoint;
use crate::protocol::{self, Envelope, ProtocolError};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub release_id: String,
    #[serde(default)]
    pub features: Vec<String>,
    pub token: Vec<u8>,
    #[serde(default)]
    pub tab_id: Option<String>,
    #[serde(default)]
    pub pid: Option<u32>,
    #[serde(default)]
    pub start_identity: Option<String>,
    #[serde(default)]
    pub incarnation: u64,
    #[serde(default)]
    pub child_pid: Option<u32>,
    #[serde(default)]
    pub child_start_identity: Option<String>,
    #[serde(default)]
    pub highest_epoch: u64,
}

impl RoleHello {
    /// Common native-role admission fields, including exact immutable release identity.
    pub fn resident(role: &str, token: &[u8]) -> Result<Self, String> {
        Ok(Self {
            role: role.into(), generation: protocol::GENERATION, build: "a1-terminal-host".into(),
            release_id: super::scope::release_id()?, features: Vec::new(), token: token.to_vec(),
            tab_id: None, pid: Some(std::process::id()), start_identity: None, incarnation: 0,
            child_pid: None, child_start_identity: None, highest_epoch: 0,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachStart {
    pub client_id: String,
    #[serde(default = "default_tabs_max")]
    pub tabs_max: usize,
    pub cwd: String,
    pub columns: u16,
    pub rows: u16,
    pub release_root: String,
    pub node_executable: String,
    pub environment: Vec<(String, String)>,
    #[serde(default)]
    pub session_file: Option<String>,
    #[serde(default)]
    pub session_dir: Option<String>,
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
    #[serde(default)]
    pub session_file: Option<String>,
    #[serde(default)]
    pub session_dir: Option<String>,
    #[serde(default)]
    pub recovery_journals: Vec<String>,
    #[serde(default)]
    pub standby: bool,
    pub server: ServerLaunchConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerLaunchConfig {
    pub profile: String,
    pub os_session_identity: String,
    pub data_dir: String,
    pub runtime_dir: String,
    pub endpoint: String,
    #[serde(default = "default_max_concurrent_starts")]
    pub max_concurrent_starts: usize,
    #[serde(default = "default_unresponsive_restart_seconds")]
    pub unresponsive_restart_seconds: u64,
    #[serde(default)]
    pub fault_environment: Vec<(String, String)>,
}
fn default_tabs_max() -> usize {
    10
}

fn default_max_concurrent_starts() -> usize {
    2
}
fn default_unresponsive_restart_seconds() -> u64 {
    120
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Surface {
    #[serde(default)]
    pub tab_id: String,
    #[serde(default)]
    pub incarnation: u64,
    pub revision: u64,
    /// The client's generation for the view request this response answers. The server stamps it
    /// per destination; holder-produced live surfaces leave it zero.
    #[serde(default)]
    pub request_generation: u64,
    #[serde(with = "protocol::bytes")]
    pub bytes: Vec<u8>,
    /// Present only when both hops negotiated `structured-surface`. `bytes` remains the complete
    /// legacy fallback and is empty on a structured-only delivery.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub structured: Option<protocol::StructuredSurface>,
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accent: Option<String>,
    /// True when the server re-offers a retained surface that the holder produced earlier; a
    /// view switch commits a stale surface only after its bounded fresh-frame wait expires.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub stale: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modes: Option<protocol::TerminalModes>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cursor: Option<protocol::SurfaceCursor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabStatus {
    pub tab_id: String,
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub accent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SurfaceSubscription {
    pub enabled: bool,
    /// True only while the input controller for this tab negotiated one-shot terminal effects.
    /// Read-only viewers and visual subscriptions never grant clipboard authority.
    #[serde(default)]
    pub effects: bool,
    /// True only when holder/server and every currently interested server/attach route support
    /// complete row/cell snapshots. A legacy viewer keeps the complete ANSI fallback available.
    #[serde(default)]
    pub structured: bool,
    /// A complete ANSI fallback is required while any interested route lacks structured support.
    #[serde(default = "default_true")]
    pub legacy: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabCreate {
    pub cwd: String,
    pub columns: u16,
    pub rows: u16,
    pub release_root: String,
    pub node_executable: String,
    #[serde(default)]
    pub environment: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabTarget {
    pub tab_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewTarget {
    pub tab_id: String,
    #[serde(default)]
    pub request_generation: u64,
    /// Current attach geometry, applied by the server before the target publishes a fresh surface.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resize: Option<Resize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabRename {
    pub tab_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabReorder {
    pub tab_id: String,
    pub target_index: usize,
    pub expected_revision: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TabSummary {
    pub tab_id: String,
    pub name: String,
    pub name_source: String,
    pub lifecycle: String,
    pub cwd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabList {
    pub revision: u64,
    pub tabs: Vec<TabSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasteStart {
    pub bytes: usize,
    #[serde(default)]
    pub epoch: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Input {
    #[serde(with = "protocol::bytes")]
    pub bytes: Vec<u8>,
    #[serde(default)]
    pub paste: bool,
    #[serde(default)]
    pub epoch: u64,
}

pub type SemanticInput = protocol::SemanticInput;
pub type TerminalEffect = protocol::TerminalEffect;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resize {
    pub columns: u16,
    pub rows: u16,
    #[serde(default)]
    pub epoch: u64,
    #[serde(default)]
    pub geometry_generation: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HolderReady {
    pub tab_id: String,
    pub pid: u32,
    pub incarnation: u64,
    pub child_pid: u32,
    pub child_start_identity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HolderExit {
    pub code: Option<i32>,
    pub signal: Option<String>,
}

pub type BridgeStatus = protocol::BridgeStatus;
pub type BridgeHeartbeat = protocol::BridgeHeartbeat;
pub type HolderRespawn = protocol::HolderRespawn;
pub type HolderSnapshot = protocol::HolderSnapshot;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeSession {
    pub file: Option<String>,
    pub name: Option<String>,
    /// Protocol: the child sends `nameSource`; without it every name defaulted to `user`, so
    /// generated names never ran the strip's automatic title transition.
    #[serde(default, alias = "name_source")]
    pub name_source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultBody {
    pub accepted: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl ResultBody {
    /// Accepted with nothing to report.
    pub fn ok() -> Self {
        Self {
            accepted: true,
            message: None,
        }
    }

    /// Accepted with a message for the peer.
    pub fn accepted(message: String) -> Self {
        Self {
            accepted: true,
            message: Some(message),
        }
    }

    /// Refused with the reason the peer reports.
    pub fn refused(message: String) -> Self {
        Self {
            accepted: false,
            message: Some(message),
        }
    }
}

pub fn read_payload(stream: &mut endpoint::EndpointStream) -> Result<Option<Vec<u8>>, String> {
    let waiting = std::time::Instant::now();
    let mut header = [0_u8; 4];
    let first = loop {
        match stream.read(&mut header) {
            Ok(0) => return Ok(None),
            Ok(count) => break count,
            Err(error) if error.kind() == std::io::ErrorKind::Interrupted => continue,
            Err(error) => return Err(format!("read resident frame header: {error}")),
        }
    };
    // Performance: idle waiting is not delivery latency. Measure assembly only after
    // the first bytes arrived, retaining idle duration as explicitly separate diagnostic data.
    let assembling = std::time::Instant::now();
    stream
        .read_exact(&mut header[first..])
        .map_err(|error| format!("read resident frame header: {error}"))?;
    let size = u32::from_le_bytes(header) as usize;
    if size > protocol::MAX_FRAME_BYTES {
        return Err(ProtocolError::FrameTooLarge(size).to_string());
    }
    let mut payload = vec![0_u8; size];
    stream
        .read_exact(&mut payload)
        .map_err(|error| format!("read resident frame payload: {error}"))?;
    crate::roles::progress_observation::observe(
        "transport",
        "pipe-frame-read",
        crate::roles::progress_observation::ProgressMetadata {
            bytes: size,
            duration_us: Some(assembling.elapsed().as_micros().min(u128::from(u64::MAX)) as u64),
            idle_wait_us: Some(
                assembling
                    .duration_since(waiting)
                    .as_micros()
                    .min(u128::from(u64::MAX)) as u64,
            ),
            ..Default::default()
        },
    );
    crate::fault_injection::crash_at("frame-after-receive");
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
    crate::fault_injection::crash_at("frame-before-send");
    stream
        .write_all(&frame)
        .and_then(|()| stream.flush())
        .map_err(|error| format!("write resident frame: {error}"))?;
    crate::fault_injection::crash_at("frame-after-send");
    Ok(())
}
