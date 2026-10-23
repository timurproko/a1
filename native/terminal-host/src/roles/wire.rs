use std::io::{Read, Write};

use serde::{Deserialize, Serialize, de::IgnoredAny};

use crate::endpoint;
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
    #[serde(default)]
    pub incarnation: u64,
    #[serde(default)]
    pub child_pid: Option<u32>,
    #[serde(default)]
    pub child_start_identity: Option<String>,
    #[serde(default)]
    pub highest_epoch: u64,
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
    /// The seeded first prompt, at most [`MAX_INITIAL_PROMPT_BYTES`]. Security: the server
    /// writes it only to the tab's private seed file, never to a bridge message or record.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub initial_prompt: Option<String>,
}

/// The largest seeded first prompt a `tab.create` request may carry.
pub const MAX_INITIAL_PROMPT_BYTES: usize = 64 * 1024;

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
    #[cfg(windows)]
    if !wait_for_pipe_data(stream)? {
        return Ok(None);
    }
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
    crate::fault_injection::crash_at("frame-after-receive");
    Ok(Some(payload))
}

#[cfg(windows)]
fn wait_for_pipe_data(stream: &endpoint::EndpointStream) -> Result<bool, String> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::System::Pipes::PeekNamedPipe;
    // Performance: synchronous pipe handles cannot block in a read without stalling writes on the
    // same handle, so readiness is polled; polling tightly just after traffic keeps interactive
    // hops near 1 ms while an idle connection backs off.
    let started = std::time::Instant::now();
    loop {
        let mut available = 0_u32;
        if unsafe {
            PeekNamedPipe(
                stream.as_raw_handle(),
                std::ptr::null_mut(),
                0,
                std::ptr::null_mut(),
                &mut available,
                std::ptr::null_mut(),
            )
        } == 0
        {
            let error = std::io::Error::last_os_error();
            if matches!(
                error.kind(),
                std::io::ErrorKind::BrokenPipe | std::io::ErrorKind::NotConnected
            ) {
                return Ok(false);
            }
            return Err(format!("inspect resident pipe: {error}"));
        }
        if available > 0 {
            return Ok(true);
        }
        let pause = if started.elapsed() < std::time::Duration::from_secs(1) {
            std::time::Duration::from_millis(1)
        } else {
            std::time::Duration::from_millis(8)
        };
        std::thread::sleep(pause);
    }
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
