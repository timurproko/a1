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

/// Generation-1 feature advertised by a peer that produces or consumes normalized input events
/// (`input.event`) instead of pre-encoded child bytes.
pub const FEATURE_SEMANTIC_INPUT: &str = "semantic-input";
/// Generation-1 feature advertised by a peer that forwards or applies typed child terminal
/// effects (`terminal.effect`) and presentation modes on surfaces.
pub const FEATURE_TERMINAL_EFFECTS: &str = "terminal-effects";
/// Generation-1 feature for complete bounded row/cell snapshots. It is negotiated separately on
/// holder/server and server/attach links; peers without it keep the complete legacy ANSI route.
pub const FEATURE_STRUCTURED_SURFACE: &str = "structured-surface";
/// Largest supported retained viewport. Bounds are checked before multiplying dimensions and
/// before a decoded snapshot can replace the last coherent surface.
pub const MAX_SURFACE_COLUMNS: usize = 512;
pub const MAX_SURFACE_ROWS: usize = 256;
pub const MAX_SURFACE_CELLS: usize = 65_536;
pub const MAX_SURFACE_STYLES: usize = 4_096;
pub const MAX_SURFACE_LINKS: usize = 4_096;
pub const MAX_CELL_TEXT_BYTES: usize = 64;
pub const MAX_LINK_ID_BYTES: usize = 256;
pub const MAX_LINK_URI_BYTES: usize = 4_096;
/// Maximum retained heap represented by one decoded surface, independent of the encoded 2 MiB
/// frame ceiling. This includes collection elements and owned string payloads.
pub const MAX_SURFACE_DECODED_BYTES: usize = 8 * 1024 * 1024;
/// Largest clipboard payload one typed effect may carry across the resident boundary.
pub const MAX_CLIPBOARD_BYTES: usize = 256 * 1024;
/// Longest key name or key text one normalized key event may carry.
pub const MAX_KEY_TEXT_BYTES: usize = 64;
/// Longest MIME type one clipboard effect may name.
pub const MAX_MIME_BYTES: usize = 64;

pub const MOD_SHIFT: u8 = 1 << 0;
pub const MOD_CTRL: u8 = 1 << 1;
pub const MOD_ALT: u8 = 1 << 2;
pub const MOD_SUPER: u8 = 1 << 3;
const MOD_MASK: u8 = MOD_SHIFT | MOD_CTRL | MOD_ALT | MOD_SUPER;

/// True when a negotiated feature list names `feature`.
pub fn negotiated(features: &[String], feature: &str) -> bool {
    features.iter().any(|candidate| candidate == feature)
}

/// Serde adapter that writes `Vec<u8>` as a MessagePack `bin` value and reads either `bin` or an
/// integer array, so byte payloads longer than the collection item bound still cross the wire.
pub mod bytes {
    use serde::de::{Error as _, SeqAccess, Visitor};
    use serde::{Deserializer, Serializer};
    use std::fmt;

    pub fn serialize<S: Serializer>(value: &[u8], serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_bytes(value)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Vec<u8>, D::Error> {
        struct BytesVisitor;
        impl<'de> Visitor<'de> for BytesVisitor {
            type Value = Vec<u8>;
            fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str("bytes or a byte array")
            }
            fn visit_bytes<E: serde::de::Error>(self, value: &[u8]) -> Result<Vec<u8>, E> {
                Ok(value.to_vec())
            }
            fn visit_byte_buf<E: serde::de::Error>(self, value: Vec<u8>) -> Result<Vec<u8>, E> {
                Ok(value)
            }
            fn visit_str<E: serde::de::Error>(self, value: &str) -> Result<Vec<u8>, E> {
                Ok(value.as_bytes().to_vec())
            }
            fn visit_seq<A: SeqAccess<'de>>(self, mut sequence: A) -> Result<Vec<u8>, A::Error> {
                let mut output = Vec::with_capacity(sequence.size_hint().unwrap_or(0).min(1 << 16));
                while let Some(byte) = sequence.next_element::<u8>()? {
                    if output.len() >= super::MAX_FRAME_BYTES {
                        return Err(A::Error::custom("byte array exceeds the frame limit"));
                    }
                    output.push(byte);
                }
                Ok(output)
            }
        }
        deserializer.deserialize_byte_buf(BytesVisitor)
    }
}

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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub selected_tab: Option<String>,
}

impl BridgeAttachment {
    pub fn new(client_id: impl Into<String>, controller_revision: u64) -> Self {
        Self {
            client_id: client_id.into(),
            controller_revision,
            selected_tab: None,
        }
    }

    pub fn selected(
        client_id: impl Into<String>,
        controller_revision: u64,
        tab_id: String,
    ) -> Self {
        Self {
            selected_tab: Some(tab_id),
            ..Self::new(client_id, controller_revision)
        }
    }
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

/// One outer-terminal event normalized by the attach client and encoded by the holder against
/// the viewed child's terminal modes. The `seq` is per client and strictly increasing so the
/// holder can report exact-once delivery; `epoch` is stamped by the server.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticInput {
    #[serde(default)]
    pub epoch: u64,
    #[serde(default)]
    pub seq: u64,
    pub event: InputEvent,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum InputEvent {
    /// A key press or repeat. `key` is a physical key name from the libghostty key table
    /// (`a`, `digit-1`, `enter`, `arrow-left`, `f3`, ... or `unidentified`); `text` carries the
    /// produced text when the key produces any; `mods` is a `MOD_*` mask.
    #[serde(rename_all = "camelCase")]
    Key {
        key: String,
        #[serde(default)]
        mods: u8,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        text: Option<String>,
        #[serde(default)]
        repeat: bool,
    },
    /// Outer terminal focus change.
    Focus { gained: bool },
    /// A pointer event already translated to child coordinates (zero-based cells).
    #[serde(rename_all = "camelCase")]
    Mouse {
        action: MouseEventAction,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        button: Option<u8>,
        #[serde(default)]
        mods: u8,
        column: u16,
        row: u16,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum MouseEventAction {
    Press,
    Release,
    Motion,
    ScrollUp,
    ScrollDown,
}

/// Rejects an input event that violates the bounded wire contract before it reaches a child.
pub fn validate_input_event(event: &InputEvent) -> Result<(), String> {
    match event {
        InputEvent::Key {
            key, mods, text, ..
        } => {
            if key.is_empty() || key.len() > MAX_KEY_TEXT_BYTES {
                return Err("key name length is out of bounds".into());
            }
            if !key
                .bytes()
                .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
            {
                return Err("key name contains unsupported characters".into());
            }
            if mods & !MOD_MASK != 0 {
                return Err("key modifiers use unsupported bits".into());
            }
            if let Some(text) = text {
                if text.is_empty() || text.len() > MAX_KEY_TEXT_BYTES {
                    return Err("key text length is out of bounds".into());
                }
                if text.chars().any(|value| value.is_control()) {
                    return Err("key text contains control characters".into());
                }
            }
            Ok(())
        }
        InputEvent::Focus { .. } => Ok(()),
        InputEvent::Mouse { button, mods, .. } => {
            if button.is_some_and(|button| !(1..=5).contains(&button)) {
                return Err("mouse button is out of bounds".into());
            }
            if mods & !MOD_MASK != 0 {
                return Err("mouse modifiers use unsupported bits".into());
            }
            Ok(())
        }
    }
}

/// Cursor and interaction modes of a child terminal model, published with each surface so the
/// attach client can apply the viewed tab's outer effects and restore its own on exit.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TerminalModes {
    #[serde(default)]
    pub cursor_visible: bool,
    /// `block`, `underline`, `bar`, or `block-hollow`; blink is carried separately.
    #[serde(default)]
    pub cursor_style: String,
    #[serde(default)]
    pub cursor_blink: bool,
    #[serde(default)]
    pub mouse_tracking: bool,
    #[serde(default)]
    pub focus_events: bool,
    #[serde(default)]
    pub bracketed_paste: bool,
    #[serde(default)]
    pub kitty_keyboard_flags: u8,
    #[serde(default)]
    pub alternate_screen: bool,
    #[serde(default)]
    pub synchronized_output: bool,
}

/// The child cursor cell in zero-based child coordinates; absent when the cursor is hidden or
/// scrolled out of the viewport.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceCursor {
    pub column: u16,
    pub row: u16,
}

/// A color retains whether the child selected the outer default, a palette entry, or exact RGB.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(tag = "kind", content = "value", rename_all = "kebab-case")]
pub enum SurfaceColor {
    #[default]
    Default,
    Palette(u8),
    Rgb([u8; 3]),
}

/// Complete semantics shared by cells that reference this interned style.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceStyle {
    #[serde(default)]
    pub foreground: SurfaceColor,
    #[serde(default)]
    pub background: SurfaceColor,
    #[serde(default)]
    pub underline_color: SurfaceColor,
    #[serde(default)]
    pub bold: bool,
    #[serde(default)]
    pub faint: bool,
    #[serde(default)]
    pub italic: bool,
    #[serde(default)]
    pub blink: bool,
    #[serde(default)]
    pub inverse: bool,
    #[serde(default)]
    pub conceal: bool,
    #[serde(default)]
    pub strikethrough: bool,
    #[serde(default)]
    pub overline: bool,
    /// Ghostty's SGR underline value: 0 none, 1 single, 2 double, 3 curly, 4 dotted, 5 dashed.
    #[serde(default)]
    pub underline: u8,
    #[serde(default)]
    pub selected: bool,
}

/// One interned OSC 8 target. `id` preserves explicit identity independently of the URI.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceLink {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub uri: String,
}

/// One viewport cell. Wide spacer tails carry width zero and no text; ordinary and wide heads
/// carry width one or two. Style and link indexes refer to the snapshot's bounded intern tables.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceCell {
    #[serde(default = "default_cell_text")]
    pub text: String,
    #[serde(default = "default_cell_width")]
    pub width: u8,
    #[serde(default)]
    pub style: u16,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub link: Option<u16>,
}

fn default_cell_text() -> String {
    " ".into()
}

fn default_cell_width() -> u8 {
    1
}

impl Default for SurfaceCell {
    fn default() -> Self {
        Self {
            text: default_cell_text(),
            width: 1,
            style: 0,
            link: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceRow {
    #[serde(default)]
    pub cells: Vec<SurfaceCell>,
}

/// Why this immutable complete state became publishable.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "kebab-case")]
pub enum SurfaceCommitKind {
    #[default]
    Complete,
    /// A malformed synchronized update exceeded its non-renewable local deadline.
    Recovery,
    /// Geometry changed and the child had not yet repainted before the local bound.
    ProvisionalGeometry,
}

/// A complete immutable viewport. Rows are full retained state even though the holder shares
/// unchanged rows in memory and attach later paints only rows that differ from completed output.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StructuredSurface {
    pub columns: u16,
    pub rows: u16,
    #[serde(default)]
    pub geometry_generation: u64,
    #[serde(default)]
    pub commit_kind: SurfaceCommitKind,
    #[serde(default)]
    pub row_data: Vec<SurfaceRow>,
    #[serde(default)]
    pub styles: Vec<SurfaceStyle>,
    #[serde(default)]
    pub links: Vec<SurfaceLink>,
    /// The child terminal's effective defaults and 256-entry palette. Empty entries are accepted
    /// only as the additive legacy form; native structured producers always publish all entries.
    #[serde(default)]
    pub palette: Vec<[u8; 3]>,
    #[serde(default)]
    pub default_foreground: [u8; 3],
    #[serde(default)]
    pub default_background: [u8; 3],
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cursor_color: Option<[u8; 3]>,
    /// Colors the child never set: they still hold the emulator's initial values, so the outer
    /// terminal keeps its own theme for them. Absent from producers that predate the field.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub inherited_colors: Option<InheritedColors>,
}

/// Which default colors and palette entries a child left at the emulator's initial values.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct InheritedColors {
    #[serde(default)]
    pub foreground: bool,
    #[serde(default)]
    pub background: bool,
    /// A 256-bit little-endian bitmap of inherited palette indexes, empty when none inherit.
    #[serde(default)]
    pub palette: Vec<u8>,
}

impl InheritedColors {
    pub const PALETTE_BITMAP_BYTES: usize = 32;

    pub fn palette_entry(&self, index: usize) -> bool {
        self.palette
            .get(index / 8)
            .is_some_and(|byte| byte & (1 << (index % 8)) != 0)
    }
}

impl StructuredSurface {
    pub fn background_inherited(&self) -> bool {
        self.inherited_colors
            .as_ref()
            .is_some_and(|colors| colors.background)
    }

    pub fn foreground_inherited(&self) -> bool {
        self.inherited_colors
            .as_ref()
            .is_some_and(|colors| colors.foreground)
    }

    pub fn palette_inherited(&self, index: usize) -> bool {
        self.inherited_colors
            .as_ref()
            .is_some_and(|colors| colors.palette_entry(index))
    }

    /// Reject malformed or oversized decoded state before it becomes authoritative. The frame
    /// decoder already caps encoded memory at 2 MiB; these checks cap dimensions, collections,
    /// index references, and per-cell/link expansion inside that frame.
    pub fn validate(&self) -> Result<(), String> {
        let columns = usize::from(self.columns);
        let rows = usize::from(self.rows);
        if columns == 0 || columns > MAX_SURFACE_COLUMNS {
            return Err("surface columns are out of bounds".into());
        }
        if rows == 0 || rows > MAX_SURFACE_ROWS {
            return Err("surface rows are out of bounds".into());
        }
        let expected = columns
            .checked_mul(rows)
            .filter(|cells| *cells <= MAX_SURFACE_CELLS)
            .ok_or_else(|| "surface cell count is out of bounds".to_owned())?;
        if self.row_data.len() != rows || self.row_data.iter().any(|row| row.cells.len() != columns)
        {
            return Err("surface dimensions do not match its rows".into());
        }
        if self.styles.is_empty() || self.styles.len() > MAX_SURFACE_STYLES {
            return Err("surface style table is out of bounds".into());
        }
        if self.links.len() > MAX_SURFACE_LINKS {
            return Err("surface link table is out of bounds".into());
        }
        if !self.palette.is_empty() && self.palette.len() != 256 {
            return Err("surface palette must be empty or complete".into());
        }
        if self.inherited_colors.as_ref().is_some_and(|colors| {
            !colors.palette.is_empty()
                && colors.palette.len() != InheritedColors::PALETTE_BITMAP_BYTES
        }) {
            return Err("surface inherited palette bitmap must be empty or complete".into());
        }
        let mut decoded_bytes = expected
            .checked_mul(std::mem::size_of::<SurfaceCell>())
            .and_then(|value| {
                value.checked_add(rows.saturating_mul(std::mem::size_of::<SurfaceRow>()))
            })
            .and_then(|value| {
                value.checked_add(
                    self.styles
                        .len()
                        .saturating_mul(std::mem::size_of::<SurfaceStyle>()),
                )
            })
            .and_then(|value| {
                value.checked_add(
                    self.links
                        .len()
                        .saturating_mul(std::mem::size_of::<SurfaceLink>()),
                )
            })
            .and_then(|value| value.checked_add(self.palette.len().saturating_mul(3)))
            .filter(|value| *value <= MAX_SURFACE_DECODED_BYTES)
            .ok_or_else(|| "surface decoded memory is out of bounds".to_owned())?;
        let mut counted = 0usize;
        for row in &self.row_data {
            for cell in &row.cells {
                counted = counted.saturating_add(1);
                decoded_bytes = decoded_bytes
                    .checked_add(cell.text.len())
                    .filter(|value| *value <= MAX_SURFACE_DECODED_BYTES)
                    .ok_or_else(|| "surface decoded memory is out of bounds".to_owned())?;
                if cell.text.len() > MAX_CELL_TEXT_BYTES
                    || cell.text.chars().any(char::is_control)
                    || !matches!(cell.width, 0..=2)
                    || (cell.width == 0 && !cell.text.is_empty())
                    || (cell.width > 0 && cell.text.is_empty())
                    || usize::from(cell.style) >= self.styles.len()
                    || cell
                        .link
                        .is_some_and(|link| usize::from(link) >= self.links.len())
                {
                    return Err("surface cell is out of bounds".into());
                }
            }
        }
        if counted != expected {
            return Err("surface cell count does not match its geometry".into());
        }
        for row in &self.row_data {
            for (column, cell) in row.cells.iter().enumerate() {
                if cell.width == 2 && row.cells.get(column + 1).is_none_or(|tail| tail.width != 0) {
                    return Err("wide surface cell has no spacer tail".into());
                }
            }
        }
        for style in &self.styles {
            if style.underline > 5 {
                return Err("surface underline style is out of bounds".into());
            }
        }
        for link in &self.links {
            decoded_bytes = decoded_bytes
                .checked_add(link.uri.len())
                .and_then(|value| value.checked_add(link.id.as_ref().map_or(0, String::len)))
                .filter(|value| *value <= MAX_SURFACE_DECODED_BYTES)
                .ok_or_else(|| "surface decoded memory is out of bounds".to_owned())?;
            if link.uri.is_empty()
                || link.uri.len() > MAX_LINK_URI_BYTES
                || link.uri.chars().any(char::is_control)
                || link.id.as_ref().is_some_and(|id| {
                    id.len() > MAX_LINK_ID_BYTES
                        || id.is_empty()
                        || id.chars().any(char::is_control)
                        || id.bytes().any(|byte| matches!(byte, b':' | b';'))
                })
            {
                return Err("surface hyperlink is out of bounds".into());
            }
        }
        Ok(())
    }
}

/// A typed terminal side effect consumed by retained parsing whose direct effect belongs to the
/// outer terminal. Only the holder of the committed viewed tab may produce one that is applied.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalEffect {
    #[serde(default)]
    pub tab_id: String,
    #[serde(default)]
    pub incarnation: u64,
    #[serde(default)]
    pub sequence: u64,
    #[serde(default)]
    pub revision: u64,
    pub effect: EffectKind,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum EffectKind {
    /// A normalized OSC 52 / iTerm2 clipboard write. `location` is `standard`, `selection`, or
    /// `primary`; `data` is the decoded representation and is never logged.
    #[serde(rename_all = "camelCase")]
    ClipboardWrite {
        location: ClipboardLocation,
        mime: String,
        #[serde(with = "bytes")]
        data: Vec<u8>,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ClipboardLocation {
    Standard,
    Selection,
    Primary,
}

impl ClipboardLocation {
    /// The OSC 52 selection parameter for this location.
    pub fn osc52_selector(self) -> char {
        match self {
            Self::Standard => 'c',
            Self::Selection => 's',
            Self::Primary => 'p',
        }
    }
}

/// Most tab actions one shortcut projection may name.
pub const MAX_SHORTCUT_ASSIGNMENTS: usize = 32;
/// Longest key token one shortcut assignment may carry.
pub const MAX_SHORTCUT_KEY_BYTES: usize = 64;

/// The effective tab shortcut assignments the owned child publishes (`bridge.shortcuts`) and the
/// server relays to clients (`tabs.shortcuts`): one lowercase key token or `None` per action.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TabShortcuts {
    #[serde(default)]
    pub assignments: Vec<(String, Option<String>)>,
}

/// Rejects a shortcut projection that names too many actions, non-tab actions, or key tokens
/// outside the bounded printable contract.
pub fn validate_shortcuts(shortcuts: &TabShortcuts) -> Result<(), String> {
    if shortcuts.assignments.len() > MAX_SHORTCUT_ASSIGNMENTS {
        return Err("too many shortcut assignments".into());
    }
    for (action, key) in &shortcuts.assignments {
        if !action.starts_with("tabs.")
            || action.len() > MAX_SHORTCUT_KEY_BYTES
            || !action
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'.')
        {
            return Err("shortcut action is not a tab action".into());
        }
        if let Some(key) = key
            && (key.is_empty()
                || key.len() > MAX_SHORTCUT_KEY_BYTES
                || !key.bytes().all(|byte| byte.is_ascii_graphic()))
        {
            return Err("shortcut key token is out of bounds".into());
        }
    }
    Ok(())
}

/// Rejects a clipboard effect whose payload, MIME, or location exceeds the bounded contract.
pub fn validate_effect(effect: &EffectKind) -> Result<(), String> {
    match effect {
        EffectKind::ClipboardWrite { mime, data, .. } => {
            if mime.is_empty() || mime.len() > MAX_MIME_BYTES {
                return Err("clipboard MIME length is out of bounds".into());
            }
            if !mime
                .bytes()
                .all(|byte| byte.is_ascii_graphic() && byte != b';' && byte != 0x1b)
            {
                return Err("clipboard MIME contains unsupported characters".into());
            }
            if data.len() > MAX_CLIPBOARD_BYTES {
                return Err("clipboard payload exceeds the resident limit".into());
            }
            Ok(())
        }
    }
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
                body: BridgeAttachment::new("client-1", 7),
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
        (
            "input-event-key.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "input.event".to_owned(),
                request_id: None,
                body: SemanticInput {
                    epoch: 3,
                    seq: 41,
                    event: InputEvent::Key {
                        key: "c".to_owned(),
                        mods: MOD_CTRL,
                        text: None,
                        repeat: false,
                    },
                },
            })?,
        ),
        (
            "input-event-text.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "input.event".to_owned(),
                request_id: None,
                body: SemanticInput {
                    epoch: 3,
                    seq: 42,
                    event: InputEvent::Key {
                        key: "unidentified".to_owned(),
                        mods: 0,
                        text: Some("é".to_owned()),
                        repeat: true,
                    },
                },
            })?,
        ),
        (
            "input-event-focus.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "input.event".to_owned(),
                request_id: None,
                body: SemanticInput {
                    epoch: 3,
                    seq: 43,
                    event: InputEvent::Focus { gained: true },
                },
            })?,
        ),
        (
            "input-event-mouse.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "input.event".to_owned(),
                request_id: None,
                body: SemanticInput {
                    epoch: 3,
                    seq: 44,
                    event: InputEvent::Mouse {
                        action: MouseEventAction::Press,
                        button: Some(1),
                        mods: MOD_SHIFT,
                        column: 4,
                        row: 7,
                    },
                },
            })?,
        ),
        (
            "terminal-effect-clipboard.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "terminal.effect".to_owned(),
                request_id: None,
                body: TerminalEffect {
                    tab_id: "tab-1".to_owned(),
                    incarnation: 2,
                    sequence: 4,
                    revision: 9,
                    effect: EffectKind::ClipboardWrite {
                        location: ClipboardLocation::Standard,
                        mime: "text/plain".to_owned(),
                        data: b"fixture".to_vec(),
                    },
                },
            })?,
        ),
        (
            "bridge-shortcuts.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "bridge.shortcuts".to_owned(),
                request_id: None,
                body: TabShortcuts {
                    assignments: vec![
                        ("tabs.new".to_owned(), Some("alt+a".to_owned())),
                        ("tabs.next".to_owned(), None),
                    ],
                },
            })?,
        ),
        (
            "terminal-modes.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "terminal.modes".to_owned(),
                request_id: None,
                body: TerminalModes {
                    cursor_visible: true,
                    cursor_style: "bar".to_owned(),
                    cursor_blink: false,
                    mouse_tracking: true,
                    focus_events: true,
                    bracketed_paste: true,
                    kitty_keyboard_flags: 1,
                    alternate_screen: false,
                    synchronized_output: false,
                },
            })?,
        ),
        (
            "structured-surface.msgpack".to_owned(),
            encode_frame(&Envelope {
                message_type: "structured.surface".to_owned(),
                request_id: None,
                body: StructuredSurface {
                    columns: 2,
                    rows: 1,
                    geometry_generation: 3,
                    commit_kind: SurfaceCommitKind::Complete,
                    row_data: vec![SurfaceRow {
                        cells: vec![
                            SurfaceCell {
                                text: "界".into(),
                                width: 2,
                                style: 0,
                                link: Some(0),
                            },
                            SurfaceCell {
                                text: String::new(),
                                width: 0,
                                ..Default::default()
                            },
                        ],
                    }],
                    styles: vec![SurfaceStyle {
                        foreground: SurfaceColor::Rgb([1, 2, 3]),
                        underline: 3,
                        ..Default::default()
                    }],
                    links: vec![SurfaceLink {
                        id: Some("link-1".into()),
                        uri: "https://example.test".into(),
                    }],
                    palette: vec![[0, 0, 0]; 256],
                    default_foreground: [255, 255, 255],
                    default_background: [0, 0, 0],
                    cursor_color: Some([4, 5, 6]),
                    inherited_colors: None,
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

// Invariant: a `bin` or `str` payload is bounded by the frame it arrives in, so its length is
// checked against the frame limit rather than the item bound that protects arrays and maps.
fn skip_collection_bytes(
    bytes: &[u8],
    cursor: &mut usize,
    len: usize,
) -> Result<(), ProtocolError> {
    if len > MAX_FRAME_BYTES {
        return Err(ProtocolError::CollectionLimit(len));
    }
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
    fn bridge_attachment_selected_tab_is_optional_and_round_trips() {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct LegacyAttachment<'a> {
            client_id: &'a str,
            controller_revision: u64,
        }

        let legacy = rmp_serde::to_vec_named(&LegacyAttachment {
            client_id: "client-1",
            controller_revision: 7,
        })
        .expect("legacy attachment");
        assert_eq!(
            rmp_serde::from_slice::<BridgeAttachment>(&legacy).expect("decode legacy"),
            BridgeAttachment::new("client-1", 7)
        );

        let selected = BridgeAttachment::selected("client-1", 7, "tab-2".into());
        let encoded = rmp_serde::to_vec_named(&selected).expect("selected attachment");
        assert_eq!(
            rmp_serde::from_slice::<BridgeAttachment>(&encoded).expect("decode selected"),
            selected
        );
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

    #[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
    struct Payload {
        #[serde(with = "bytes")]
        data: Vec<u8>,
    }

    #[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
    struct ArrayPayload {
        data: Vec<u8>,
    }

    #[test]
    fn byte_payloads_larger_than_the_item_bound_round_trip_as_bin() {
        let data = (0..(MAX_COLLECTION_ITEMS + 10))
            .map(|index| (index & 0xff) as u8)
            .collect::<Vec<_>>();
        let frame = encode_frame(&Payload { data: data.clone() }).expect("encode");
        let decoded: Payload = decode_frame(&frame).expect("decode bin payload");
        assert_eq!(decoded.data, data);
        let as_array = encode_frame(&ArrayPayload {
            data: vec![1, 2, 3],
        })
        .expect("encode array");
        let decoded: Payload = decode_frame(&as_array).expect("decode array payload");
        assert_eq!(decoded.data, vec![1, 2, 3]);
        let oversized = encode_frame(&ArrayPayload { data: data.clone() }).expect("encode");
        assert!(matches!(
            decode_frame::<Payload>(&oversized),
            Err(ProtocolError::CollectionLimit(_))
        ));
    }

    #[test]
    fn semantic_input_and_effects_round_trip_with_additive_defaults() {
        for (name, bytes) in fixture_set().expect("fixtures") {
            if name.starts_with("input-event") {
                let decoded: Envelope<SemanticInput> = decode_frame(&bytes).expect(&name);
                assert_eq!(decoded.message_type, "input.event");
                validate_input_event(&decoded.body.event).expect(&name);
            } else if name.starts_with("terminal-effect") {
                let decoded: Envelope<TerminalEffect> = decode_frame(&bytes).expect(&name);
                validate_effect(&decoded.body.effect).expect(&name);
            } else if name.starts_with("terminal-modes") {
                let decoded: Envelope<TerminalModes> = decode_frame(&bytes).expect(&name);
                assert_eq!(decoded.body.kitty_keyboard_flags, 1);
            } else if name.starts_with("structured-surface") {
                let decoded: Envelope<StructuredSurface> = decode_frame(&bytes).expect(&name);
                assert_eq!(decoded.message_type, "structured.surface");
                decoded.body.validate().expect(&name);
            }
        }
        let minimal = rmp_serde::to_vec_named(&serde_json::json!({
            "type": "input.event",
            "body": { "event": { "kind": "focus", "gained": false } }
        }))
        .expect("encode minimal");
        let decoded: Envelope<SemanticInput> = decode_payload(&minimal).expect("decode minimal");
        assert_eq!(decoded.body.epoch, 0);
        assert_eq!(decoded.body.event, InputEvent::Focus { gained: false });
        let unknown_kind = rmp_serde::to_vec_named(&serde_json::json!({
            "type": "input.event",
            "body": { "event": { "kind": "gesture" } }
        }))
        .expect("encode unknown");
        assert!(decode_payload::<Envelope<SemanticInput>>(&unknown_kind).is_err());
        assert_eq!(ClipboardLocation::Primary.osc52_selector(), 'p');
        assert!(negotiated(
            &["a".into(), FEATURE_SEMANTIC_INPUT.into()],
            FEATURE_SEMANTIC_INPUT
        ));
        assert!(!negotiated(&[], FEATURE_TERMINAL_EFFECTS));
    }

    #[test]
    fn shortcut_projections_are_bounded_to_tab_actions_and_printable_keys() {
        let valid = TabShortcuts {
            assignments: vec![
                ("tabs.new".into(), Some("alt+a".into())),
                ("tabs.moveLeft".into(), None),
            ],
        };
        assert_eq!(validate_shortcuts(&valid), Ok(()));
        let frame = encode_frame(&Envelope {
            message_type: "bridge.shortcuts".to_owned(),
            request_id: None,
            body: valid.clone(),
        })
        .expect("encode");
        let decoded: Envelope<TabShortcuts> = decode_frame(&frame).expect("decode");
        assert_eq!(decoded.body, valid);
        let too_many = TabShortcuts {
            assignments: (0..=MAX_SHORTCUT_ASSIGNMENTS)
                .map(|index| (format!("tabs.jump{index}"), None))
                .collect(),
        };
        assert!(validate_shortcuts(&too_many).is_err());
        for assignments in [
            vec![("app.clear".to_owned(), Some("ctrl+c".to_owned()))],
            vec![("tabs.new".to_owned(), Some(String::new()))],
            vec![("tabs.new".to_owned(), Some("alt+\u{1b}".to_owned()))],
            vec![(
                "tabs.new".to_owned(),
                Some("a".repeat(MAX_SHORTCUT_KEY_BYTES + 1)),
            )],
            vec![("tabs.new line".to_owned(), None)],
        ] {
            assert!(
                validate_shortcuts(&TabShortcuts { assignments }).is_err(),
                "malformed projection accepted"
            );
        }
    }

    #[test]
    fn input_and_effect_validation_rejects_unbounded_or_malformed_values() {
        let key = |key: &str, mods: u8, text: Option<&str>| InputEvent::Key {
            key: key.into(),
            mods,
            text: text.map(str::to_owned),
            repeat: false,
        };
        assert!(validate_input_event(&key("arrow-left", MOD_CTRL | MOD_ALT, None)).is_ok());
        assert!(validate_input_event(&key("", 0, None)).is_err());
        assert!(validate_input_event(&key("Arrow", 0, None)).is_err());
        assert!(validate_input_event(&key(&"k".repeat(MAX_KEY_TEXT_BYTES + 1), 0, None)).is_err());
        assert!(validate_input_event(&key("a", 0x80, None)).is_err());
        assert!(validate_input_event(&key("a", 0, Some(""))).is_err());
        assert!(validate_input_event(&key("a", 0, Some("\u{1b}"))).is_err());
        assert!(validate_input_event(&key("unidentified", 0, Some("日本"))).is_ok());
        assert!(
            validate_input_event(&InputEvent::Mouse {
                action: MouseEventAction::Release,
                button: Some(9),
                mods: 0,
                column: 0,
                row: 0,
            })
            .is_err()
        );
        let clipboard = |mime: &str, len: usize| EffectKind::ClipboardWrite {
            location: ClipboardLocation::Selection,
            mime: mime.into(),
            data: vec![b'x'; len],
        };
        assert!(validate_effect(&clipboard("text/plain", MAX_CLIPBOARD_BYTES)).is_ok());
        assert!(validate_effect(&clipboard("text/plain", MAX_CLIPBOARD_BYTES + 1)).is_err());
        assert!(validate_effect(&clipboard("", 1)).is_err());
        assert!(validate_effect(&clipboard("text;plain", 1)).is_err());
        assert!(validate_effect(&clipboard("text/pl\u{1b}ain", 1)).is_err());
    }

    #[test]
    fn structured_surfaces_fail_closed_on_dimensions_indexes_and_control_injection() {
        let valid = StructuredSurface {
            columns: 2,
            rows: 1,
            geometry_generation: 3,
            commit_kind: SurfaceCommitKind::Complete,
            row_data: vec![SurfaceRow {
                cells: vec![
                    SurfaceCell {
                        text: "界".into(),
                        width: 2,
                        style: 0,
                        link: Some(0),
                    },
                    SurfaceCell {
                        text: String::new(),
                        width: 0,
                        ..Default::default()
                    },
                ],
            }],
            styles: vec![SurfaceStyle::default()],
            links: vec![SurfaceLink {
                id: Some("link-1".into()),
                uri: "https://example.test".into(),
            }],
            palette: vec![[0, 0, 0]; 256],
            default_foreground: [255, 255, 255],
            default_background: [0, 0, 0],
            cursor_color: None,
            inherited_colors: None,
        };
        assert!(valid.validate().is_ok());
        for malformed in [
            {
                let mut value = valid.clone();
                value.columns = MAX_SURFACE_COLUMNS.saturating_add(1) as u16;
                value
            },
            {
                let mut value = valid.clone();
                value.row_data[0].cells[0].style = 1;
                value
            },
            {
                let mut value = valid.clone();
                value.row_data[0].cells[0].text = "\u{1b}[2J".into();
                value
            },
            {
                let mut value = valid.clone();
                value.row_data[0].cells[1].width = 1;
                value
            },
            {
                let mut value = valid.clone();
                value.links[0].id = Some("bad;id".into());
                value
            },
        ] {
            assert!(malformed.validate().is_err(), "malformed surface accepted");
        }
    }

    #[test]
    fn mutated_semantic_fixtures_never_panic_and_only_decode_when_well_formed() {
        for (name, frame) in fixture_set().expect("fixtures") {
            if !name.starts_with("input-event") && !name.starts_with("terminal-") {
                continue;
            }
            for position in 0..frame.len() {
                for delta in [1u8, 0x7f, 0xff] {
                    let mut mutated = frame.clone();
                    mutated[position] = mutated[position].wrapping_add(delta);
                    let _ = decode_frame::<Envelope<SemanticInput>>(&mutated);
                    let _ = decode_frame::<Envelope<TerminalEffect>>(&mutated);
                    let _ = decode_frame::<Envelope<TerminalModes>>(&mutated);
                    let mut decoder = FrameDecoder::default();
                    let _ = decoder.push(&mutated);
                }
                let truncated = &frame[..position];
                assert!(decode_frame::<Envelope<SemanticInput>>(truncated).is_err());
            }
        }
    }
}
