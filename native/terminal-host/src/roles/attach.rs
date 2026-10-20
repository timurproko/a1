use std::collections::{HashMap, VecDeque};
use std::io::{Write, stdout};
use std::path::{Path, PathBuf};
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, AtomicUsize, Ordering},
    mpsc,
};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

use crossterm::event::{
    self, Event, KeyCode, KeyEventKind, KeyModifiers, MouseButton, MouseEventKind,
};
use crossterm::terminal::{disable_raw_mode, enable_raw_mode};

use crate::core::attach::{
    self as core_attach, Context, Effect, Hover, KeyForward, PopupItem, PopupMenu, RenameEditor,
    Request, ServerEvent, ShortcutLabels, State, StripLayout, StripSnapshot, TabView,
    debounce_starting_glyphs, drag_marker_column, hold_status_glyphs, holder_idle_precedes_bridge,
    shown_tabs,
};
use crate::endpoint;
use crate::protocol::{
    self, BridgeAttachment, EffectKind, InputEvent, MAX_INPUT_BYTES, TerminalEffect, TerminalModes,
    Welcome,
};
use crate::roles::credentials::ProfileCredentials;
use crate::roles::outer_input::{self, InputChannel, Outgoing};
#[cfg(test)]
use crate::roles::presentation::Frame;
use crate::roles::presentation::{
    DesiredPresentation, FinalCursor, Offer, PresentationComposer, TopologyAction, ViewModel,
};
use crate::roles::progress_observation::{self, ProgressMetadata};
use crate::roles::strip::{self, StripHit, StripHover, StripTab, TimeFormat};
use crate::roles::wire::{
    self, AttachStart, Input, PasteStart, Resize, RoleHello, Surface, TabCreate, TabList,
    TabRename, TabReorder, TabStatus, TabTarget, ViewTarget,
};

pub const ENTER_OUTER_MODES: &[u8] =
    b"\x1b[?1049h\x1b[?2004h\x1b[?1004h\x1b[?1000h\x1b[?1003h\x1b[?1006h";
pub const RESTORE_OUTER_MODES: &[u8] =
    b"\x1b[?1006l\x1b[?1003l\x1b[?1000l\x1b[?1004l\x1b[?2004l\x1b[?1049l";
pub const RESET_OUTER_COLORS: &[u8] = b"\x1b]104\x07\x1b]110\x07\x1b]111\x07\x1b]112\x07";
const ATTACH_SERVER_QUEUE_BYTES: usize = 4 * 1024 * 1024;
const ATTACH_SERVER_QUEUE_FRAMES: usize = 64;
const ATTACH_INGRESS_BYTES: usize = 4 * 1024 * 1024;
const ATTACH_INGRESS_FRAMES: usize = 8;
const OUTER_EFFECT_QUEUE_BYTES: usize = 4 * 1024 * 1024;
const OUTER_CONTROL_QUEUE_FRAMES: usize = 8;
#[cfg(test)]
const BEGIN_SYNCHRONIZED_UPDATE: &[u8] = b"\x1b[?2026h";
#[cfg(test)]
const END_SYNCHRONIZED_UPDATE: &[u8] = b"\x1b[?2026l";

/// The global tab declarations in the order that decides which action keeps a duplicated key;
/// it mirrors the owned feature's declaration list, which the child projects and publishes.
pub const TAB_SHORTCUT_DECLARATIONS: [(&str, Option<&str>); 18] = [
    ("tabs.new", Some("alt+a")),
    ("tabs.close", Some("alt+w")),
    ("tabs.rename", Some("f2")),
    ("tabs.settings", Some("alt+,")),
    ("tabs.jump1", Some("alt+1")),
    ("tabs.jump2", Some("alt+2")),
    ("tabs.jump3", Some("alt+3")),
    ("tabs.jump4", Some("alt+4")),
    ("tabs.jump5", Some("alt+5")),
    ("tabs.jump6", Some("alt+6")),
    ("tabs.jump7", Some("alt+7")),
    ("tabs.jump8", Some("alt+8")),
    ("tabs.jump9", Some("alt+9")),
    ("tabs.jump10", Some("alt+0")),
    ("tabs.next", None),
    ("tabs.previous", None),
    ("tabs.moveRight", None),
    ("tabs.moveLeft", None),
];

/// Shortcut bindings as `keybindings.json` expresses them: a key, a list of keys, or `null`.
pub type ShortcutBindings = HashMap<String, Option<Vec<String>>>;

fn binding_keys(value: &serde_json::Value) -> Option<Option<Vec<String>>> {
    match value {
        serde_json::Value::String(key) => Some(Some(vec![key.trim().to_lowercase()])),
        serde_json::Value::Array(values) => Some(Some(
            values
                .iter()
                .filter_map(|value| value.as_str().map(|key| key.trim().to_lowercase()))
                .collect(),
        )),
        serde_json::Value::Null => Some(None),
        _ => None,
    }
}

/// Reads shortcut bindings from a `keybindings.json` document, ignoring malformed entries.
pub fn shortcut_bindings(document: &serde_json::Value) -> ShortcutBindings {
    document
        .as_object()
        .map(|object| {
            object
                .iter()
                .filter(|(action, _)| action.as_str() != "$schema")
                .filter_map(|(action, value)| {
                    binding_keys(value).map(|keys| (action.clone(), keys))
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Projects declarations, the user's customization, and the keys A1 actions hold into one
/// assignment per tab action: a key an A1 action holds never becomes a tab shortcut, and the
/// earlier declaration keeps a key two tab actions share. The owned child runs the same rule.
pub fn project_tab_shortcuts(
    configured: &ShortcutBindings,
    reserved: &ShortcutBindings,
) -> Vec<(String, Option<String>)> {
    let mut held_by_owned_actions: HashMap<&str, Vec<String>> = reserved
        .iter()
        .filter(|(action, _)| !action.starts_with("tabs."))
        .map(|(action, keys)| (action.as_str(), keys.clone().unwrap_or_default()))
        .collect();
    for (action, keys) in configured {
        if !action.starts_with("tabs.") {
            held_by_owned_actions.insert(action.as_str(), keys.clone().unwrap_or_default());
        }
    }
    let reserved_keys = held_by_owned_actions
        .values()
        .flatten()
        .cloned()
        .collect::<std::collections::HashSet<_>>();
    let mut claimed = std::collections::HashSet::new();
    TAB_SHORTCUT_DECLARATIONS
        .iter()
        .map(|(action, default)| {
            let candidates = match configured.get(*action) {
                Some(Some(keys)) => keys.clone(),
                Some(None) => Vec::new(),
                None => default.map(str::to_owned).into_iter().collect(),
            };
            let assigned = candidates.into_iter().find(|candidate| {
                !candidate.is_empty()
                    && !reserved_keys.contains(candidate)
                    && claimed.insert(candidate.clone())
            });
            ((*action).to_owned(), assigned)
        })
        .collect()
}

#[derive(Debug, Default)]
struct TabBindings {
    by_key: HashMap<String, String>,
    by_action: HashMap<String, String>,
}

impl TabBindings {
    /// The resolver used until a child publishes the effective projection: declarations plus
    /// the user's file, without the A1 keys only the owned keybinding manager knows.
    fn load(profile: &Path) -> Self {
        let configured = std::fs::read(profile.join("keybindings.json"))
            .ok()
            .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
            .map(|document| shortcut_bindings(&document))
            .unwrap_or_default();
        Self::from_assignments(&project_tab_shortcuts(
            &configured,
            &ShortcutBindings::new(),
        ))
    }

    /// Bindings from one assignment per action; unknown actions and empty keys are ignored.
    fn from_assignments(assignments: &[(String, Option<String>)]) -> Self {
        let mut by_key = HashMap::new();
        let mut by_action = HashMap::new();
        for (action, key) in assignments {
            if !TAB_SHORTCUT_DECLARATIONS
                .iter()
                .any(|(declared, _)| declared == action)
            {
                continue;
            }
            if let Some(key) = key.as_deref().filter(|key| !key.is_empty())
                && !by_key.contains_key(key)
            {
                by_key.insert(key.to_owned(), action.clone());
                by_action.insert(action.clone(), key.to_owned());
            }
        }
        Self { by_key, by_action }
    }

    fn action(&self, key: &crossterm::event::KeyEvent) -> Option<&str> {
        self.by_key
            .get(&key_token(key.code, key.modifiers))
            .map(String::as_str)
    }

    fn label(&self, action: &str) -> String {
        self.by_action
            .get(action)
            .map_or_else(String::new, |key| shortcut_label(key))
    }
}

fn shortcut_label(key: &str) -> String {
    key.split('+')
        .map(|part| match part {
            "alt" => "Alt".into(),
            "ctrl" => "Ctrl".into(),
            "shift" => "Shift".into(),
            value if value.starts_with('f') && value[1..].chars().all(|ch| ch.is_ascii_digit()) => {
                value.to_uppercase()
            }
            value if value.len() == 1 => value.to_uppercase(),
            value => value.to_owned(),
        })
        .collect::<Vec<_>>()
        .join("+")
}

fn clip_cells(value: &str, width: usize) -> String {
    let mut output = String::new();
    let mut used = 0usize;
    for grapheme in value.graphemes(true) {
        let next = UnicodeWidthStr::width(grapheme);
        if used + next > width {
            break;
        }
        output.push_str(grapheme);
        used += next;
    }
    output
}

fn menu_text_parts(item: &PopupItem, inner: usize) -> (String, usize, String) {
    let shortcut = clip_cells(&item.shortcut, inner);
    let shortcut_width = UnicodeWidthStr::width(shortcut.as_str());
    if shortcut_width > 0 && shortcut_width < inner {
        let label = clip_cells(&item.label, inner.saturating_sub(shortcut_width + 1));
        let label_width = UnicodeWidthStr::width(label.as_str());
        return (
            label,
            inner.saturating_sub(label_width + shortcut_width),
            shortcut,
        );
    }
    let label = clip_cells(&item.label, inner);
    let label_width = UnicodeWidthStr::width(label.as_str());
    (label, inner.saturating_sub(label_width), String::new())
}

fn key_token(code: KeyCode, modifiers: KeyModifiers) -> String {
    let key = match code {
        KeyCode::Char(value) => value.to_ascii_lowercase().to_string(),
        KeyCode::F(number) => format!("f{number}"),
        KeyCode::Left => "left".into(),
        KeyCode::Right => "right".into(),
        KeyCode::Up => "up".into(),
        KeyCode::Down => "down".into(),
        _ => return String::new(),
    };
    let mut parts = Vec::new();
    if modifiers.contains(KeyModifiers::CONTROL) {
        parts.push("ctrl");
    }
    if modifiers.contains(KeyModifiers::ALT) {
        parts.push("alt");
    }
    if modifiers.contains(KeyModifiers::SHIFT) {
        parts.push("shift");
    }
    parts.push(&key);
    parts.join("+")
}
#[cfg(unix)]
const KITTY_QUERY: &[u8] = b"\x1b[?u\x1b[c";
const KITTY_ENABLE: &[u8] = b"\x1b[>1u";
const KITTY_RESTORE: &[u8] = b"\x1b[<1u";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CtrlCDisposition {
    Forward,
    Detach,
}
#[derive(Debug)]
pub struct DoubleCtrlC {
    // Invariant: only a forwarded Ctrl+C arms the chord; any other completed input disarms it.
    interval_ms: u64,
    last_forwarded_ms: Option<u64>,
}
impl DoubleCtrlC {
    pub fn new(interval_ms: u64) -> Self {
        Self {
            interval_ms,
            last_forwarded_ms: None,
        }
    }
    /// A paste or pointer activation completed another input sequence, so a later Ctrl+C
    /// starts a fresh chord.
    pub fn reset(&mut self) {
        self.last_forwarded_ms = None;
    }
    pub fn admit(&mut self, now_ms: u64, ctrl_c: bool) -> CtrlCDisposition {
        if !ctrl_c {
            self.last_forwarded_ms = None;
            return CtrlCDisposition::Forward;
        }
        if self
            .last_forwarded_ms
            .is_some_and(|last| now_ms.saturating_sub(last) < self.interval_ms)
        {
            self.last_forwarded_ms = None;
            CtrlCDisposition::Detach
        } else {
            self.last_forwarded_ms = Some(now_ms);
            CtrlCDisposition::Forward
        }
    }
}

pub fn is_ctrl_c_bytes(bytes: &[u8]) -> bool {
    bytes == [0x03]
        || matches!(
            std::str::from_utf8(bytes),
            Ok("\x1b[99;5u" | "\x1b[99;5:1u" | "\x1b[67;5u" | "\x1b[67;5:1u")
        )
}
pub fn is_ctrl_c_console(character: char, control: bool, key_down: bool) -> bool {
    key_down && control && matches!(character, 'c' | 'C' | '\u{3}')
}

/// The notice for a refused or failed new-tab request.
pub fn tab_create_failure_notice(reason: Option<&str>) -> String {
    let reason = match reason {
        Some("tab-start-busy") => "tab starts are busy, try again shortly",
        Some("busy") => "a tab change is still running, try again shortly",
        Some(reason) if !reason.trim().is_empty() => reason,
        _ => "the tab could not start",
    };
    format!("Could not open a tab: {reason}")
}

/// Most characters remembered as pressed; a stuck set is cleared rather than grown.
const MAX_PRESSED_CHARS: usize = 64;

/// Platform: on Windows, a character the keyboard layout cannot produce, such as a lone combining
/// accent, arrives as console Alt-code input that crossterm reports only as a key release. A
/// non-ASCII character released without a matching press is that input and is admitted as a
/// press; every other release stays ignored, as on other platforms.
fn admit_alt_code_input(
    windows: bool,
    pressed: &mut std::collections::HashSet<char>,
    event: Event,
) -> Event {
    let Event::Key(mut key) = event else {
        return event;
    };
    if !windows {
        return Event::Key(key);
    }
    // Platform: on Windows, crossterm can report a plain Ctrl+C as `Char('C')` with Shift and
    // Control (observed in Windows Terminal), so neither the detach chord nor the child would see
    // an interrupt. Windows Terminal binds a real Ctrl+Shift+C to copy before it reaches the
    // program, so this report always means Ctrl+C.
    if key.code == KeyCode::Char('C')
        && key.modifiers == KeyModifiers::SHIFT | KeyModifiers::CONTROL
    {
        key.code = KeyCode::Char('c');
        key.modifiers = KeyModifiers::CONTROL;
    }
    if let KeyCode::Char(character) = key.code {
        let folded = character.to_lowercase().next().unwrap_or(character);
        match key.kind {
            KeyEventKind::Press | KeyEventKind::Repeat => {
                if pressed.len() >= MAX_PRESSED_CHARS {
                    pressed.clear();
                }
                pressed.insert(folded);
            }
            KeyEventKind::Release => {
                if !pressed.remove(&folded) && !character.is_ascii() && !character.is_control() {
                    key.kind = KeyEventKind::Press;
                }
            }
        }
    }
    Event::Key(key)
}

fn render_drag_marker(column: u16, columns: u16) -> String {
    render_drag_marker_configured(column, columns, !palette_fallback_requested())
}

fn render_drag_marker_configured(column: u16, columns: u16, truecolor: bool) -> String {
    if columns == 0 {
        return String::new();
    }
    let style = if truecolor {
        "\x1b[0m\x1b[48;2;38;38;38m\x1b[38;2;255;255;255m"
    } else {
        "\x1b[0m\x1b[48;5;235m\x1b[38;5;15m"
    };
    format!(
        "\x1b[s\x1b[1;{}H{style}│\x1b[0m\x1b[u",
        column.min(columns - 1) + 1
    )
}

pub fn render_notice(message: &str, columns: u16) -> String {
    let mut notice = format!(" ! {message} ");
    notice.retain(|value| !value.is_control());
    let maximum = usize::from(columns);
    if notice.chars().count() > maximum {
        notice = notice
            .chars()
            .take(maximum.saturating_sub(1))
            .collect::<String>()
            + "…";
    }
    format!(
        "\x1b[s\x1b[2;1H\x1b[48;2;38;38;38m\x1b[38;2;220;220;220m{notice:<width$}\x1b[0m\x1b[u",
        width = maximum
    )
}

const MAX_SETTINGS_BYTES: u64 = 256 * 1024;
const SETTINGS_POLL_INTERVAL: Duration = Duration::from_millis(250);

fn read_time_format(path: &Path) -> TimeFormat {
    let Ok(metadata) = std::fs::metadata(path) else {
        return TimeFormat::Twelve;
    };
    if metadata.len() > MAX_SETTINGS_BYTES {
        return TimeFormat::Twelve;
    }
    let Ok(bytes) = std::fs::read(path) else {
        return TimeFormat::Twelve;
    };
    let Ok(document) = serde_json::from_slice::<serde_json::Value>(&bytes) else {
        return TimeFormat::Twelve;
    };
    TimeFormat::from_setting(
        document
            .get("a1")
            .and_then(|value| value.get("timeFormat"))
            .and_then(serde_json::Value::as_str),
    )
}

/// Development diagnostics: when `A1_ATTACH_KEY_TRACE` names a file, the attach client appends
/// every outer key event and each detach-chord decision, so a terminal's key reporting can be
/// compared with what the chord expects. Key codes only; never pasted text or child output.
fn key_trace(path: Option<&Path>, line: &str) {
    let Some(path) = path else {
        return;
    };
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        let _ = writeln!(file, "{line}");
    }
}

/// Reads the owned `quitAnimation` setting, which defaults to on, from the canonical profile.
fn read_quit_animation(path: &Path) -> bool {
    std::fs::metadata(path)
        .ok()
        .filter(|metadata| metadata.len() <= MAX_SETTINGS_BYTES)
        .and_then(|_| std::fs::read(path).ok())
        .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
        .and_then(|document| {
            document
                .get("a1")
                .and_then(|value| value.get("quitAnimation"))
                .and_then(serde_json::Value::as_bool)
        })
        .unwrap_or(true)
}

/// The owned theme's dark `selectedBg` for each A1 accent, derived by
/// `derivePiAccentProjection(accent, "dark")`; popups hover with it like owned menus.
fn accent_selected_background(accent: Option<&str>) -> [u8; 3] {
    match accent {
        Some("blue") => [52, 57, 69],
        Some("cyan") => [48, 60, 61],
        Some("green") => [50, 60, 54],
        Some("orange") => [67, 54, 48],
        Some("pink") => [65, 53, 62],
        _ => [58, 56, 66],
    }
}

/// Reads the owned accent's popup hover background, defaulting to the purple accent's.
fn read_accent_hover(path: &Path) -> [u8; 3] {
    let accent = std::fs::metadata(path)
        .ok()
        .filter(|metadata| metadata.len() <= MAX_SETTINGS_BYTES)
        .and_then(|_| std::fs::read(path).ok())
        .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
        .and_then(|document| {
            document
                .get("a1")
                .and_then(|value| value.get("accentColor"))
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned)
        });
    accent_selected_background(accent.as_deref())
}

#[derive(Debug)]
struct TimeFormatWatch {
    path: PathBuf,
    signature: Option<(std::time::SystemTime, u64)>,
    value: TimeFormat,
    accent_hover: [u8; 3],
    checked_at: Instant,
}

impl TimeFormatWatch {
    fn new(path: &Path) -> Self {
        Self {
            path: path.to_owned(),
            signature: settings_signature(path),
            value: read_time_format(path),
            accent_hover: read_accent_hover(path),
            checked_at: Instant::now(),
        }
    }

    /// Re-reads the settings document after it changed; true when the strip format changed.
    fn refresh(&mut self) -> bool {
        if self.checked_at.elapsed() < SETTINGS_POLL_INTERVAL {
            return false;
        }
        self.checked_at = Instant::now();
        let signature = settings_signature(&self.path);
        if signature == self.signature {
            return false;
        }
        self.signature = signature;
        self.accent_hover = read_accent_hover(&self.path);
        let value = read_time_format(&self.path);
        if value == self.value {
            return false;
        }
        self.value = value;
        true
    }
}

fn clock_minute() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        / 60
}

fn settings_signature(path: &Path) -> Option<(std::time::SystemTime, u64)> {
    let metadata = std::fs::metadata(path).ok()?;
    Some((metadata.modified().ok()?, metadata.len()))
}

/// The v2 neutral hover background, used where no accent applies.
#[cfg(test)]
const POPUP_HOVER_NEUTRAL: [u8; 3] = [48, 48, 48];

impl PopupMenu {
    #[cfg(test)]
    fn render(&self) -> String {
        self.render_with_color(!palette_fallback_requested())
    }

    #[cfg(test)]
    fn render_with_color(&self, truecolor: bool) -> String {
        self.render_styled(truecolor, POPUP_HOVER_NEUTRAL)
    }

    /// Renders with `hover` as the hovered row's truecolor background, the accent's
    /// `selectedBg` in live use so popups hover like owned menus.
    fn render_styled(&self, truecolor: bool, hover: [u8; 3]) -> String {
        let inner = usize::from(self.width).saturating_sub(2);
        let mut output = String::from("\x1b[s");
        for (index, item) in self.items.iter().enumerate() {
            let row = index + 2;
            output.push_str(&format!("\x1b[{row};{}H", self.column.saturating_add(1)));
            if truecolor {
                let hovered_background = format!("{};{};{}", hover[0], hover[1], hover[2]);
                let background = if self.hovered == Some(index) && item.action.is_some() {
                    hovered_background.as_str()
                } else {
                    "38;38;38"
                };
                let foreground = if item.action.is_some() {
                    "255;255;255"
                } else {
                    "140;140;140"
                };
                output.push_str(&format!(
                    "\x1b[0m\x1b[48;2;{background}m\x1b[38;2;{foreground}m "
                ));
                if item.separator {
                    output.push_str(&"─".repeat(inner));
                } else {
                    let (label, gap, shortcut) = menu_text_parts(item, inner);
                    output.push_str(&label);
                    output.push_str(&" ".repeat(gap));
                    if !shortcut.is_empty() {
                        output.push_str("\x1b[38;2;110;110;110m");
                        output.push_str(&shortcut);
                    }
                }
                output.push_str(" \x1b[0m");
            } else {
                let background = if self.hovered == Some(index) && item.action.is_some() {
                    236
                } else {
                    235
                };
                let foreground = if item.action.is_some() { 15 } else { 245 };
                let label = if item.separator {
                    "─".repeat(inner)
                } else {
                    let (mut label, gap, shortcut) = menu_text_parts(item, inner);
                    label.push_str(&" ".repeat(gap));
                    if !shortcut.is_empty() {
                        // Compatibility: The palette counterpart of the truecolor muted shortcut.
                        label.push_str("\x1b[38;5;242m");
                        label.push_str(&shortcut);
                    }
                    label
                };
                output.push_str(&format!(
                    "\x1b[0;48;5;{background};38;5;{foreground}m {label} \x1b[0m"
                ));
            }
        }
        output.push_str("\x1b[u");
        output
    }
}

fn palette_fallback_requested() -> bool {
    strip::palette_fallback_requested()
}

impl RenameEditor {
    fn display(&self) -> strip::StripRename {
        strip::StripRename {
            tab_id: self.tab_id.clone(),
            text: self.text.clone(),
            cursor: self.cursor,
            selection: self.selection(),
        }
    }
}

/// BEL is attention data and never reaches the outer terminal. Other bytes, including OSC 8/52
/// and cursor-shape controls, stay in the native terminal stream.
pub fn without_bell(bytes: &[u8]) -> Vec<u8> {
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes.get(index..index + 2) == Some(b"\x1b]") {
            let start = index;
            index += 2;
            let command_start = index;
            while index < bytes.len() && bytes[index] != b';' && bytes[index] != 0x07 {
                index += 1;
            }
            let notification = matches!(&bytes[command_start..index], b"9" | b"777");
            while index < bytes.len() {
                if bytes[index] == 0x07 {
                    index += 1;
                    break;
                }
                if bytes.get(index..index + 2) == Some(b"\x1b\\") {
                    index += 2;
                    break;
                }
                index += 1;
            }
            if !notification {
                output.extend_from_slice(&bytes[start..index]);
            }
            continue;
        }
        if bytes[index] != 0x07 {
            output.push(bytes[index]);
        }
        index += 1;
    }
    output
}

fn admit_terminal_effect(
    applied: &mut HashMap<(String, u64), u64>,
    effect: &TerminalEffect,
) -> bool {
    let sequence = if effect.sequence == 0 {
        effect.revision
    } else {
        effect.sequence
    };
    let last = applied
        .entry((effect.tab_id.clone(), effect.incarnation))
        .or_default();
    if sequence <= *last {
        return false;
    }
    *last = sequence;
    true
}

pub fn tab_rows(outer_rows: u16) -> Result<u16, &'static str> {
    outer_rows
        .checked_sub(1)
        .filter(|rows| *rows > 0)
        .ok_or("resident attach requires at least two rows")
}
pub fn child_mouse_row(outer_row: u16) -> Option<u16> {
    outer_row.checked_sub(1)
}

struct AttachServerWriter {
    sender: mpsc::SyncSender<Vec<u8>>,
    reserved_bytes: Arc<AtomicUsize>,
    failed: Arc<Mutex<Option<String>>>,
}

impl AttachServerWriter {
    fn start(mut stream: endpoint::EndpointStream) -> Self {
        let (sender, receiver) = mpsc::sync_channel::<Vec<u8>>(ATTACH_SERVER_QUEUE_FRAMES);
        let reserved_bytes = Arc::new(AtomicUsize::new(0));
        let failed = Arc::new(Mutex::new(None));
        let writer_bytes = reserved_bytes.clone();
        let writer_failed = failed.clone();
        thread::spawn(move || {
            while let Ok(frame) = receiver.recv() {
                let result = stream
                    .write_all(&frame)
                    .and_then(|()| stream.flush())
                    .map_err(|error| format!("write resident frame: {error}"));
                writer_bytes.fetch_sub(frame.len(), Ordering::SeqCst);
                if let Err(error) = result {
                    if let Ok(mut failed) = writer_failed.lock() {
                        *failed = Some(error);
                    }
                    return;
                }
            }
        });
        Self {
            sender,
            reserved_bytes,
            failed,
        }
    }

    fn failure(&self) -> Option<String> {
        self.failed.lock().ok().and_then(|value| value.clone())
    }
}

impl Write for AttachServerWriter {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        if let Some(error) = self.failure() {
            return Err(std::io::Error::new(std::io::ErrorKind::BrokenPipe, error));
        }
        self.reserved_bytes
            .try_update(Ordering::SeqCst, Ordering::SeqCst, |reserved| {
                reserved
                    .checked_add(bytes.len())
                    .filter(|next| *next <= ATTACH_SERVER_QUEUE_BYTES)
            })
            .map_err(|_| {
                std::io::Error::new(
                    std::io::ErrorKind::WouldBlock,
                    "resident server writer byte limit reached",
                )
            })?;
        match self.sender.try_send(bytes.to_vec()) {
            Ok(()) => Ok(bytes.len()),
            Err(error) => {
                self.reserved_bytes.fetch_sub(bytes.len(), Ordering::SeqCst);
                Err(std::io::Error::new(
                    if matches!(error, mpsc::TrySendError::Full(_)) {
                        std::io::ErrorKind::WouldBlock
                    } else {
                        std::io::ErrorKind::BrokenPipe
                    },
                    "resident server writer queue is unavailable",
                ))
            }
        }
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.failure().map_or(Ok(()), |error| {
            Err(std::io::Error::new(std::io::ErrorKind::BrokenPipe, error))
        })
    }
}

enum ServerIngress {
    Frame(Vec<u8>),
    Failed(String),
}

struct IngressReservation {
    bytes: Arc<AtomicUsize>,
    len: usize,
}

impl Drop for IngressReservation {
    fn drop(&mut self) {
        self.bytes.fetch_sub(self.len, Ordering::SeqCst);
    }
}

impl From<KeyModifiers> for core_attach::Modifiers {
    fn from(modifiers: KeyModifiers) -> Self {
        Self {
            shift: modifiers.contains(KeyModifiers::SHIFT),
            control: modifiers.contains(KeyModifiers::CONTROL),
            alt: modifiers.contains(KeyModifiers::ALT),
            other: modifiers
                .intersects(KeyModifiers::SUPER | KeyModifiers::HYPER | KeyModifiers::META),
        }
    }
}

impl From<KeyCode> for core_attach::KeyCode {
    fn from(code: KeyCode) -> Self {
        match code {
            KeyCode::Char(character) => Self::Char(character),
            KeyCode::F(number) => Self::F(number),
            KeyCode::Enter => Self::Enter,
            KeyCode::Tab => Self::Tab,
            KeyCode::BackTab => Self::BackTab,
            KeyCode::Backspace => Self::Backspace,
            KeyCode::Esc => Self::Esc,
            KeyCode::Delete => Self::Delete,
            KeyCode::Insert => Self::Insert,
            KeyCode::Up => Self::Up,
            KeyCode::Down => Self::Down,
            KeyCode::Left => Self::Left,
            KeyCode::Right => Self::Right,
            KeyCode::Home => Self::Home,
            KeyCode::End => Self::End,
            KeyCode::PageUp => Self::PageUp,
            KeyCode::PageDown => Self::PageDown,
            _ => Self::Other,
        }
    }
}

impl From<&crossterm::event::KeyEvent> for core_attach::AttachKey {
    fn from(key: &crossterm::event::KeyEvent) -> Self {
        Self {
            code: key.code.into(),
            modifiers: key.modifiers.into(),
            kind: match key.kind {
                KeyEventKind::Press => core_attach::KeyKind::Press,
                KeyEventKind::Repeat => core_attach::KeyKind::Repeat,
                KeyEventKind::Release => core_attach::KeyKind::Release,
            },
        }
    }
}

impl From<MouseButton> for core_attach::MouseButton {
    fn from(button: MouseButton) -> Self {
        match button {
            MouseButton::Left => Self::Left,
            MouseButton::Right => Self::Right,
            MouseButton::Middle => Self::Middle,
        }
    }
}

impl From<&crossterm::event::MouseEvent> for core_attach::AttachMouse {
    fn from(mouse: &crossterm::event::MouseEvent) -> Self {
        use core_attach::MouseKind;
        Self {
            kind: match mouse.kind {
                MouseEventKind::Down(button) => MouseKind::Down(button.into()),
                MouseEventKind::Up(button) => MouseKind::Up(button.into()),
                MouseEventKind::Drag(button) => MouseKind::Drag(button.into()),
                MouseEventKind::Moved => MouseKind::Moved,
                MouseEventKind::ScrollDown => MouseKind::ScrollDown,
                MouseEventKind::ScrollUp => MouseKind::ScrollUp,
                MouseEventKind::ScrollLeft => MouseKind::ScrollLeft,
                MouseEventKind::ScrollRight => MouseKind::ScrollRight,
            },
            column: mouse.column,
            row: mouse.row,
            modifiers: mouse.modifiers.into(),
        }
    }
}

impl From<&StripHit> for core_attach::StripHitKind {
    fn from(hit: &StripHit) -> Self {
        match hit {
            StripHit::View(id) => Self::View(id.clone()),
            StripHit::Overflow => Self::Overflow,
            StripHit::New => Self::New,
        }
    }
}

impl From<&strip::StripFrame> for core_attach::StripSnapshot {
    fn from(frame: &strip::StripFrame) -> Self {
        Self {
            hits: frame
                .hits
                .iter()
                .map(|(start, end, hit)| (*start, *end, hit.into()))
                .collect(),
            hidden_tabs: frame.hidden_tabs.clone(),
        }
    }
}

impl TabView for StripTab {
    fn id(&self) -> &str {
        &self.id
    }

    fn name(&self) -> &str {
        &self.name
    }

    fn status(&self) -> &str {
        &self.status
    }

    fn set_status(&mut self, status: String) {
        self.status = status;
    }
}

impl StripLayout for strip::StripFrame {
    fn tab_spans(&self) -> Vec<(u16, u16, &str)> {
        self.hits
            .iter()
            .filter_map(|(start, end, hit)| match hit {
                StripHit::View(id) => Some((*start, *end, id.as_str())),
                _ => None,
            })
            .collect()
    }
}

impl ShortcutLabels for TabBindings {
    fn label(&self, action: &str) -> String {
        TabBindings::label(self, action)
    }
}

fn hold_glyphs(
    shown: &mut [StripTab],
    held: &mut HashMap<String, (String, Duration)>,
    now: Duration,
) -> Option<Duration> {
    hold_status_glyphs(shown, held, now, strip::status_has_glyph)
}

impl From<&StripTab> for core_attach::AttachTab {
    fn from(tab: &StripTab) -> Self {
        Self {
            id: tab.id.clone(),
            name: tab.name.clone(),
            name_source: tab.name_source.clone(),
            status: tab.status.clone(),
            accent: tab.accent.clone(),
        }
    }
}

pub struct AttachOptions<'a> {
    pub endpoint: &'a str,
    pub cwd: &'a str,
    pub clear_exit_ms: u64,
    pub tabs_max: usize,
    pub profile: &'a Path,
    pub settings_file: &'a Path,
    pub data_dir: &'a Path,
    pub runtime_dir: &'a Path,
    pub release_root: &'a str,
    pub node_executable: &'a str,
    pub session_file: Option<&'a str>,
    pub session_dir: Option<&'a str>,
    pub view_tab: Option<&'a str>,
}

struct Handshake {
    stream: endpoint::EndpointStream,
    channel: InputChannel,
    apply_effects: bool,
    request_generation: u64,
    columns: u16,
    outer_rows: u16,
    create: TabCreate,
}

/// Registers this terminal with the resident server, starts the session, and asks for the tab
/// registry; returns once the server admitted this client.
fn handshake(options: &AttachOptions<'_>) -> Result<Handshake, String> {
    let token =
        crate::endpoint::endpoint_token(options.profile).map_err(|error| error.to_string())?;
    let credentials =
        ProfileCredentials::load_or_create(&options.data_dir.join("tabs").join(token))?;
    let mut stream = endpoint::connect(options.endpoint).map_err(|error| error.to_string())?;
    wire::send(
        &mut stream,
        "hello",
        Some(1),
        RoleHello {
            role: "attach".into(),
            generation: protocol::GENERATION,
            build: "a1-terminal-host".into(),
            features: vec![
                "double-ctrl-c".into(),
                protocol::FEATURE_SEMANTIC_INPUT.into(),
                protocol::FEATURE_TERMINAL_EFFECTS.into(),
                protocol::FEATURE_STRUCTURED_SURFACE.into(),
            ],
            token: credentials.client_token.to_vec(),
            tab_id: options.view_tab.map(str::to_owned),
            pid: Some(std::process::id()),
            start_identity: None,
            incarnation: 0,
            child_pid: None,
            child_start_identity: None,
            highest_epoch: 0,
        },
    )?;
    let payload = wire::read_payload(&mut stream)?
        .ok_or_else(|| "server closed attach handshake".to_owned())?;
    if wire::kind(&payload)?.message_type != "welcome" {
        return Err("resident server refused attach".to_owned());
    }
    let (_, welcome): (Option<u64>, Welcome) = wire::body(&payload)?;
    // Compatibility: semantic input and typed effects are generation-1 features; a server that
    // lacks them keeps the byte path and applies no child terminal effects.
    let channel = InputChannel::new(protocol::negotiated(
        &welcome.features,
        protocol::FEATURE_SEMANTIC_INPUT,
    ));
    let apply_effects = protocol::negotiated(&welcome.features, protocol::FEATURE_TERMINAL_EFFECTS);
    let attachment = wire::read_payload(&mut stream)?
        .ok_or_else(|| "server closed before attach admission".to_owned())?;
    match wire::kind(&attachment)?.message_type.as_str() {
        "attached" => {
            let _: (Option<u64>, BridgeAttachment) = wire::body(&attachment)?;
        }
        "refused" => return Err("a1 is attached in another terminal".to_owned()),
        message => return Err(format!("unexpected attach admission message: {message}")),
    }
    let (columns, outer_rows) = outer_size()?;
    let request_generation = start_session(&mut stream, options, columns, outer_rows)?;
    let rows = tab_rows(outer_rows).map_err(str::to_owned)?;
    let create = TabCreate {
        cwd: options.cwd.into(),
        columns,
        rows,
        release_root: options.release_root.into(),
        node_executable: options.node_executable.into(),
        environment: std::env::vars().collect(),
    };
    Ok(Handshake {
        stream,
        channel,
        apply_effects,
        request_generation,
        columns,
        outer_rows,
        create,
    })
}

/// Starts the attach session, requests the initial view, and asks for the registry; returns the
/// view request generation.
fn start_session(
    stream: &mut endpoint::EndpointStream,
    options: &AttachOptions<'_>,
    columns: u16,
    outer_rows: u16,
) -> Result<u64, String> {
    let rows = tab_rows(outer_rows).map_err(str::to_owned)?;
    let mut request_generation = 1u64;
    wire::send(
        stream,
        "attach.start",
        None,
        AttachStart {
            client_id: String::new(),
            tabs_max: options.tabs_max,
            cwd: options.cwd.into(),
            columns,
            rows,
            release_root: options.release_root.into(),
            node_executable: options.node_executable.into(),
            environment: std::env::vars().collect(),
            session_file: options.session_file.map(str::to_owned),
            session_dir: options.session_dir.map(str::to_owned),
        },
    )?;
    if let Some(tab_id) = options.view_tab {
        request_generation = request_generation.saturating_add(1);
        wire::send(
            stream,
            "tab.view",
            None,
            ViewTarget {
                tab_id: tab_id.into(),
                request_generation,
            },
        )?;
    }
    wire::send(stream, "tab.list", None, wire::ResultBody::ok())?;
    Ok(request_generation)
}

/// Reads server frames on their own thread under the ingress byte budget, waking the main loop
/// after each one.
fn spawn_server_reader(
    mut reader: endpoint::EndpointStream,
    wake: mpsc::SyncSender<()>,
) -> (mpsc::Receiver<ServerIngress>, Arc<AtomicUsize>) {
    let (message_tx, message_rx) = mpsc::sync_channel::<ServerIngress>(ATTACH_INGRESS_FRAMES);
    let ingress_bytes = Arc::new(AtomicUsize::new(0));
    let reader_ingress_bytes = ingress_bytes.clone();
    thread::spawn(move || {
        loop {
            let payload = match wire::read_payload(&mut reader) {
                Ok(Some(payload)) => payload,
                Ok(None) => {
                    let _ = message_tx.send(ServerIngress::Failed(
                        "resident server connection closed".into(),
                    ));
                    let _ = wake.try_send(());
                    return;
                }
                Err(error) => {
                    let _ = message_tx.send(ServerIngress::Failed(error));
                    let _ = wake.try_send(());
                    return;
                }
            };
            let reserved =
                reader_ingress_bytes.try_update(Ordering::SeqCst, Ordering::SeqCst, |current| {
                    current
                        .checked_add(payload.len())
                        .filter(|next| *next <= ATTACH_INGRESS_BYTES)
                });
            if reserved.is_err() {
                let _ = message_tx.send(ServerIngress::Failed(
                    "resident server ingress byte limit reached".into(),
                ));
                let _ = wake.try_send(());
                return;
            }
            let len = payload.len();
            if message_tx.send(ServerIngress::Frame(payload)).is_err() {
                reader_ingress_bytes.fetch_sub(len, Ordering::SeqCst);
                return;
            }
            let _ = wake.try_send(());
        }
    });
    (message_rx, ingress_bytes)
}

/// Reads outer terminal events on their own thread, waking the main loop after each one.
fn spawn_input_reader(wake: mpsc::SyncSender<()>) -> mpsc::Receiver<Result<Event, String>> {
    let (input_tx, input_rx) = mpsc::sync_channel::<Result<Event, String>>(1024);
    thread::spawn(move || {
        loop {
            let event = event::read().map_err(|error| format!("read outer terminal: {error}"));
            let failed = event.is_err();
            if input_tx.send(event).is_err() {
                return;
            }
            let _ = wake.try_send(());
            if failed {
                return;
            }
        }
    });
    input_rx
}

pub fn run_attach(options: AttachOptions<'_>) -> Result<(), String> {
    crate::fault_injection::validate_environment()?;
    let watchdog = crate::shell::watchdog::start(
        "attach",
        &options.runtime_dir.join("tabs").join("crashes"),
        Duration::from_secs(15),
        vec!["attach-main".into(), "attach-reader".into()],
    );
    crate::fault_injection::freeze_role("attach");
    let handshake = handshake(&options)?;
    let reader = handshake
        .stream
        .try_clone()
        .map_err(|error| format!("clone attach stream: {error}"))?;
    // Performance: server frames and outer input both wake the loop directly, so neither waits
    // out the other side's idle poll; capacity one keeps wakes coalesced.
    let (wake_tx, wake_rx) = mpsc::sync_channel::<()>(1);
    let (message_rx, ingress_bytes) = spawn_server_reader(reader, wake_tx.clone());
    let terminal = OuterTerminal::enter()?;
    let input_rx = spawn_input_reader(wake_tx);
    let mut core = State::new(options.view_tab.map(str::to_owned), handshake.columns);
    let mut client = Client::start(&options, handshake, terminal)?;
    loop {
        watchdog.bump();
        if let Some(error) = client.stream.failure() {
            return Err(error);
        }
        if client.drain_server(&mut core, &message_rx, &ingress_bytes)? {
            return Ok(());
        }
        client.tick(&mut core)?;
        let next = match input_rx.try_recv() {
            Ok(next) => next?,
            Err(mpsc::TryRecvError::Empty) => {
                let _ = wake_rx.recv_timeout(Duration::from_millis(8));
                continue;
            }
            Err(mpsc::TryRecvError::Disconnected) => {
                return Err("outer terminal input stopped".to_owned());
            }
        };
        if client.input(&mut core, next)? {
            return Ok(());
        }
    }
}

/// The child surface this client presents and the frame state it was committed with.
struct Presented {
    surface: Vec<u8>,
    structured: Option<protocol::StructuredSurface>,
    incarnation: u64,
    revision: u64,
    geometry_generation: u64,
    modes: Option<TerminalModes>,
    cursor: Option<FinalCursor>,
}

impl Presented {
    /// Invariant: no cursor shows until a committed child surface places one.
    fn new() -> Self {
        Self {
            surface: Vec::new(),
            structured: None,
            incarnation: 0,
            revision: 0,
            geometry_generation: 0,
            modes: None,
            cursor: Some(FinalCursor::Hidden),
        }
    }

    fn install(&mut self, surface: &Surface) {
        self.surface = without_bell(&surface.bytes);
        self.structured = surface.structured.clone();
        self.incarnation = surface.incarnation;
        self.revision = surface.revision;
        self.geometry_generation = surface
            .structured
            .as_ref()
            .map_or(self.geometry_generation, |structured| {
                structured.geometry_generation
            });
        self.modes = surface.modes.clone();
        self.cursor = surface
            .cursor
            .map(FinalCursor::At)
            .or_else(|| surface.modes.as_ref().map(|_| FinalCursor::Hidden));
    }

    /// Invariant: the old viewport is never combined with new strip/overlay coordinates.
    fn clear_body(&mut self) {
        self.surface.clear();
        self.structured = None;
        self.cursor = Some(FinalCursor::Hidden);
    }
}

#[derive(Default)]
struct GlyphState {
    starting_since: HashMap<String, Duration>,
    held: HashMap<String, (String, Duration)>,
    expires: Option<Duration>,
}

/// The attach role's side of a session: the server connection, the outer terminal, and what it
/// presents. Core attach state decides; the client applies its effects.
struct Client {
    stream: AttachServerWriter,
    terminal: OuterTerminal,
    view: ViewModel,
    tabs: Vec<StripTab>,
    bindings: TabBindings,
    channel: InputChannel,
    chord: DoubleCtrlC,
    create: TabCreate,
    request_generation: u64,
    geometry_generation: u64,
    columns: u16,
    outer_rows: u16,
    time_format: TimeFormatWatch,
    strip_frame: strip::StripFrame,
    presented: Presented,
    apply_effects: bool,
    pending_terminal_effects: VecDeque<TerminalEffect>,
    applied_terminal_effects: HashMap<(String, u64), u64>,
    glyphs: GlyphState,
    started: Instant,
    last_strip_frame: Instant,
    displayed_clock_minute: u64,
    last_list: Instant,
    pressed_chars: std::collections::HashSet<char>,
    key_trace_path: Option<PathBuf>,
    settings_file: PathBuf,
}

impl Client {
    fn start(
        options: &AttachOptions<'_>,
        handshake: Handshake,
        terminal: OuterTerminal,
    ) -> Result<Self, String> {
        let mut view = ViewModel::new(options.view_tab.map(str::to_owned));
        view.expect_request_generation(handshake.request_generation);
        let time_format = TimeFormatWatch::new(options.settings_file);
        let strip_frame = strip::render_configured(
            &[],
            view.viewed.as_deref(),
            handshake.columns,
            None,
            time_format.value,
        );
        let client = Self {
            stream: AttachServerWriter::start(handshake.stream),
            terminal,
            view,
            tabs: Vec::new(),
            bindings: TabBindings::load(options.profile),
            channel: handshake.channel,
            chord: DoubleCtrlC::new(options.clear_exit_ms),
            create: handshake.create,
            request_generation: handshake.request_generation,
            geometry_generation: 0,
            columns: handshake.columns,
            outer_rows: handshake.outer_rows,
            time_format,
            strip_frame,
            presented: Presented::new(),
            apply_effects: handshake.apply_effects,
            pending_terminal_effects: VecDeque::new(),
            applied_terminal_effects: HashMap::new(),
            glyphs: GlyphState::default(),
            started: Instant::now(),
            last_strip_frame: Instant::now(),
            displayed_clock_minute: clock_minute(),
            last_list: Instant::now(),
            pressed_chars: std::collections::HashSet::new(),
            key_trace_path: std::env::var_os("A1_ATTACH_KEY_TRACE").map(PathBuf::from),
            settings_file: options.settings_file.to_owned(),
        };
        // Invariant: the launch frame hides the cursor until the first child surface places it.
        client.present(None, true)?;
        Ok(client)
    }

    /// Invariant: core attach state is timed against this one monotonic clock.
    fn now(&self) -> Duration {
        self.started.elapsed()
    }

    fn with_context<R>(&self, step: impl FnOnce(&Context<'_, StripTab>) -> R) -> R {
        let strip = StripSnapshot::from(&self.strip_frame);
        step(&Context {
            tabs: &self.tabs,
            viewed: self.view.viewed.as_deref(),
            requested: self.view.requested.as_deref(),
            strip: &strip,
            shortcuts: &self.bindings,
            mouse_tracking: self
                .presented
                .modes
                .as_ref()
                .map(|modes| modes.mouse_tracking),
        })
    }

    /// Steps the core and applies its effects in order; returns the forwarded-input effects,
    /// which the caller delivers with the original terminal event.
    fn run(&mut self, core: &mut State, event: core_attach::Event) -> Result<Vec<Effect>, String> {
        let now = self.now();
        let effects = self.with_context(|context| core.step(context, event, now));
        let mut forwarded = Vec::new();
        for effect in effects {
            match effect {
                Effect::Send(request) => self.send(request)?,
                Effect::View(tab_id) => self.request_view(tab_id)?,
                Effect::AwaitFirstDraw(tab_id) => self.view.await_first_draw(&tab_id),
                Effect::CancelViewRequest => self.view.cancel_request(),
                Effect::Renamed { tab_id, name } => {
                    if let Some(tab) = self.tabs.iter_mut().find(|tab| tab.id == tab_id) {
                        tab.name = name;
                        tab.name_source = "user".into();
                        tab.title_animation = None;
                    }
                }
                Effect::Write(frames) => {
                    for frame in frames {
                        self.stream
                            .write_all(&frame)
                            .map_err(|error| format!("queue deferred resident input: {error}"))?;
                    }
                }
                Effect::Paint { clear } => self.paint(core, clear)?,
                forward => forwarded.push(forward),
            }
        }
        Ok(forwarded)
    }

    fn send(&mut self, request: Request) -> Result<(), String> {
        let stream = &mut self.stream;
        match request {
            Request::Create => wire::send(stream, "tab.create", None, self.create.clone()),
            Request::OpenSettings => {
                wire::send(stream, "tab.open-settings", None, self.create.clone())
            }
            Request::Close(tab_id) => wire::send(stream, "tab.close", None, TabTarget { tab_id }),
            Request::Restart(tab_id) => {
                wire::send(stream, "tab.restart", None, TabTarget { tab_id })
            }
            Request::Rename { tab_id, name } => {
                wire::send(stream, "tab.rename", None, TabRename { tab_id, name })
            }
            Request::Reorder {
                tab_id,
                target_index,
                expected_revision,
            } => wire::send(
                stream,
                "tab.reorder",
                None,
                TabReorder {
                    tab_id,
                    target_index,
                    expected_revision,
                },
            ),
            Request::List => wire::send(stream, "tab.list", None, wire::ResultBody::ok()),
            Request::ClaimInput => {
                wire::send(stream, "tab.claimInput", None, wire::ResultBody::ok())
            }
        }
    }

    fn request_view(&mut self, tab_id: String) -> Result<(), String> {
        self.request_generation = self.request_generation.saturating_add(1);
        self.view.request(&tab_id);
        self.view.expect_request_generation(self.request_generation);
        wire::send(
            &mut self.stream,
            "tab.view",
            None,
            ViewTarget {
                tab_id,
                request_generation: self.request_generation,
            },
        )
    }

    fn send_frames(&mut self, core: &mut State, frames: Vec<Vec<u8>>) -> Result<(), String> {
        if let Some(frames) = core.route_input(self.view.requested.as_deref(), frames) {
            for frame in frames {
                self.stream
                    .write_all(&frame)
                    .map_err(|error| format!("queue resident frame: {error}"))?;
            }
        }
        Ok(())
    }

    fn send_input(
        &mut self,
        core: &mut State,
        event: Option<InputEvent>,
        legacy: Vec<u8>,
    ) -> Result<(), String> {
        let frame = match self.channel.outgoing(event, legacy) {
            Some(Outgoing::Semantic(input)) => wire::frame("input.event", None, input)?,
            Some(Outgoing::Legacy(input)) => wire::frame("input", None, input)?,
            None => return Ok(()),
        };
        self.send_frames(core, vec![frame])
    }

    fn paint(&mut self, core: &mut State, clear: bool) -> Result<(), String> {
        let rename = core.mode.rename().map(RenameEditor::display);
        let mut shown = shown_tabs(
            &self.tabs,
            self.view.viewed.as_deref(),
            core.view.settings_shown,
        );
        let now = self.now();
        debounce_starting_glyphs(&mut shown, &mut self.glyphs.starting_since, now);
        self.glyphs.expires = hold_glyphs(&mut shown, &mut self.glyphs.held, now);
        let render = |hovered: Option<&StripHover>| {
            strip::render_interactive(
                &shown,
                self.view.viewed.as_deref(),
                self.columns,
                hovered,
                self.time_format.value,
                rename.as_ref(),
            )
        };
        let hovered = core.hovered.as_ref().map(StripHover::from);
        let mut strip_frame = render(hovered.as_ref());
        if hovered
            .as_ref()
            .is_some_and(|target| !strip_hover_present(&strip_frame, target))
        {
            core.hovered = None;
            strip_frame = render(None);
        }
        self.strip_frame = strip_frame;
        let overlay = self.overlay(core, &shown);
        self.present(overlay, clear)
    }

    fn overlay(&self, core: &State, shown: &[StripTab]) -> Option<String> {
        let status_notice = self
            .view
            .viewed
            .as_ref()
            .and_then(|id| self.tabs.iter().find(|tab| &tab.id == id))
            .and_then(|tab| {
                if matches!(tab.status.as_str(), "stalled" | "unresponsive") {
                    Some("Agent stalled · R restart · Alt+W close".to_owned())
                } else if tab.status == "failed" {
                    Some("Tab failed · R retry · F start fresh · Alt+W close".to_owned())
                } else {
                    None
                }
            });
        if let Some(menu) = core.mode.popup() {
            Some(menu.render_styled(!palette_fallback_requested(), self.time_format.accent_hover))
        } else if let Some(column) = core
            .mode
            .drag()
            .and_then(|drag| drag_marker_column(drag, shown, &self.strip_frame))
        {
            Some(render_drag_marker(column, self.columns))
        } else {
            core.notice
                .as_deref()
                .or(status_notice.as_deref())
                .map(|notice| render_notice(notice, self.columns))
        }
    }

    fn present(&self, overlay: Option<String>, clear: bool) -> Result<(), String> {
        self.terminal.present(DesiredPresentation {
            tab_id: self.view.viewed.clone(),
            incarnation: self.presented.incarnation,
            revision: self.presented.revision,
            geometry_generation: self.presented.geometry_generation,
            strip: self.strip_frame.bytes.clone(),
            structured: self.presented.structured.clone(),
            legacy_body: self.presented.surface.clone(),
            overlay,
            cursor: self.presented.cursor,
            modes: self.presented.modes.clone(),
            columns: self.columns,
            outer_rows: self.outer_rows,
            clear,
        })
    }

    fn apply_terminal_effect(&mut self, effect: &TerminalEffect) -> Result<(), String> {
        if admit_terminal_effect(&mut self.applied_terminal_effects, effect) {
            match &effect.effect {
                EffectKind::ClipboardWrite { location, data, .. } => {
                    self.terminal.write(&outer_input::osc52(*location, data))?;
                }
            }
        }
        Ok(())
    }

    /// Invariant: a commit the view model approved installs its staged topology, the complete
    /// child surface, the child's modes, and the final cursor together in one frame.
    fn apply_commit(
        &mut self,
        core: &mut State,
        surface: Surface,
        staged: Option<Vec<StripTab>>,
        requested: bool,
    ) -> Result<(), String> {
        if let Some(next) = staged {
            self.tabs = next;
        }
        self.run(
            core,
            core_attach::Event::Server(ServerEvent::Commit {
                tab_id: surface.tab_id.clone(),
                status: surface.status.clone(),
                requested,
            }),
        )?;
        if let Some(tab) = self.tabs.iter_mut().find(|tab| tab.id == surface.tab_id) {
            if !holder_idle_precedes_bridge(&tab.status, &surface.status) {
                tab.status = surface.status.clone();
            }
            tab.accent = surface.accent.clone();
        }
        self.presented.install(&surface);
        let mut deferred = VecDeque::new();
        for effect in std::mem::take(&mut self.pending_terminal_effects) {
            if effect.tab_id != surface.tab_id || effect.incarnation != surface.incarnation {
                continue;
            }
            if effect.revision <= surface.revision {
                self.apply_terminal_effect(&effect)?;
            } else {
                deferred.push_back(effect);
            }
        }
        self.pending_terminal_effects = deferred;
        self.paint(core, false)
    }

    /// Handles up to one bounded round of server frames; returns `true` when the session ended.
    fn drain_server(
        &mut self,
        core: &mut State,
        messages: &mpsc::Receiver<ServerIngress>,
        ingress_bytes: &Arc<AtomicUsize>,
    ) -> Result<bool, String> {
        let round_started = Instant::now();
        let mut round_bytes = 0usize;
        for _ in 0..8 {
            let Ok(message) = messages.try_recv() else {
                break;
            };
            let payload = match message {
                ServerIngress::Frame(payload) => payload,
                ServerIngress::Failed(error) => return Err(error),
            };
            let _reservation = IngressReservation {
                bytes: ingress_bytes.clone(),
                len: payload.len(),
            };
            round_bytes = round_bytes.saturating_add(payload.len());
            if self.server_message(core, &payload)? {
                return Ok(true);
            }
            if round_bytes >= 64 * 1024 || round_started.elapsed() >= Duration::from_millis(2) {
                break;
            }
        }
        Ok(false)
    }

    /// Returns `true` when the message ended the session.
    fn server_message(&mut self, core: &mut State, payload: &[u8]) -> Result<bool, String> {
        let kind = wire::kind(payload)?;
        match kind.message_type.as_str() {
            "surface" => self.surface(core, payload)?,
            "terminal.effect" => self.terminal_effect(payload)?,
            "tab.list" => self.tab_list(core, payload)?,
            "detach" => {
                core.exit();
                wire::send(&mut self.stream, "detach", None, wire::ResultBody::ok())?;
                self.terminal.restore()?;
                print_hint(running_agent_count(&self.tabs));
                return Ok(true);
            }
            "refused" => {
                core.exit();
                self.terminal.restore()?;
                return Err("a1 is attached in another terminal".to_owned());
            }
            "error" => {
                let (_, result): (_, wire::ResultBody) = wire::body(payload)?;
                return Err(result
                    .message
                    .unwrap_or_else(|| "resident tab failed to start".to_owned()));
            }
            "attached" => {
                let _: (Option<u64>, BridgeAttachment) = wire::body(payload)?;
            }
            message_type => {
                if let Some(event) = self.server_event(message_type, payload)? {
                    self.run(core, core_attach::Event::Server(event))?;
                }
            }
        }
        Ok(false)
    }

    /// Decodes a server message into its core event after applying its presentation side.
    fn server_event(
        &mut self,
        message_type: &str,
        payload: &[u8],
    ) -> Result<Option<ServerEvent>, String> {
        let result = || -> Result<wire::ResultBody, String> { Ok(wire::body(payload)?.1) };
        Ok(Some(match message_type {
            // Protocol: the owned child projects the effective A1 declarations plus the user's
            // customization and publishes one assignment per tab action; attach dispatches and
            // labels exactly that projection.
            "tabs.shortcuts" => {
                let (_, shortcuts): (_, protocol::TabShortcuts) = wire::body(payload)?;
                if protocol::validate_shortcuts(&shortcuts).is_err() {
                    return Ok(None);
                }
                self.bindings = TabBindings::from_assignments(&shortcuts.assignments);
                ServerEvent::ShortcutsChanged
            }
            "tab.status" => {
                let (_, status): (_, TabStatus) = wire::body(payload)?;
                self.apply_status(&status);
                ServerEvent::Status {
                    tab_id: status.tab_id,
                    status: status.status,
                }
            }
            "tab.created" | "tab.selected" => {
                let (_, target): (_, TabTarget) = wire::body(payload)?;
                ServerEvent::Created {
                    tab_id: target.tab_id,
                    created: message_type == "tab.created",
                }
            }
            "tab.create-failed" | "tab.create-refused" => ServerEvent::CreateFailed {
                notice: tab_create_failure_notice(result()?.message.as_deref()),
            },
            "tab.renamed" => {
                let wire::ResultBody { accepted, message } = result()?;
                ServerEvent::Renamed { accepted, message }
            }
            "tab.rename-refused" => ServerEvent::RenameRefused {
                message: result()?.message,
            },
            "tab.reordered" => {
                let wire::ResultBody { accepted, message } = result()?;
                ServerEvent::Reordered { accepted, message }
            }
            "tab.restarted" | "tab.route-opened" => {
                let wire::ResultBody { accepted, message } = result()?;
                ServerEvent::Answered { accepted, message }
            }
            "tab.closed" => {
                let wire::ResultBody { accepted, message } = result()?;
                ServerEvent::Closed { accepted, message }
            }
            "holder.exit" => {
                if let Some(tab) = self
                    .view
                    .viewed
                    .as_ref()
                    .and_then(|id| self.tabs.iter_mut().find(|tab| &tab.id == id))
                {
                    tab.status = "crashed".into();
                }
                ServerEvent::HolderExit
            }
            "failure.status" => ServerEvent::Failure {
                message: result()?.message,
            },
            "input.rejected" => return self.input_rejected(result()?.message),
            "viewer.status" | "input.uncertain" | "recovery.notice" => ServerEvent::Notice {
                message: result()?.message,
            },
            _ => return Ok(None),
        }))
    }

    fn input_rejected(&mut self, message: Option<String>) -> Result<Option<ServerEvent>, String> {
        if message.as_deref() == Some(crate::roles::server::INPUT_REJECTED_LEGACY_HOLDER) {
            if let Some(replay) = self.channel.fall_back() {
                wire::send(&mut self.stream, "input", None, replay)?;
            }
            return Ok(None);
        }
        if message.as_deref() == Some(crate::roles::server::INPUT_REJECTED_READ_ONLY) {
            return Ok(Some(ServerEvent::InputClaimLost));
        }
        Ok(Some(ServerEvent::InputRejected { message }))
    }

    fn apply_status(&mut self, status: &TabStatus) {
        if let Some(tab) = self.tabs.iter_mut().find(|tab| tab.id == status.tab_id) {
            tab.status = status.status.clone();
            tab.accent = status.accent.clone();
        }
        if let Some(staged) = self.view.staged_tabs_mut()
            && let Some(tab) = staged.iter_mut().find(|tab| tab.id == status.tab_id)
        {
            tab.status = status.status.clone();
            tab.accent = status.accent.clone();
        }
    }

    fn surface(&mut self, core: &mut State, payload: &[u8]) -> Result<(), String> {
        let (_, surface): (_, Surface) = wire::body(payload)?;
        if let Some(structured) = surface.structured.as_ref()
            && (structured.validate().is_err()
                || (self.view.viewed.as_deref() == Some(surface.tab_id.as_str())
                    && surface.incarnation == self.presented.incarnation
                    && structured.geometry_generation < self.presented.geometry_generation))
        {
            return Ok(());
        }
        crate::roles::fixture_control::delay(
            "attach-receipt",
            &surface.tab_id,
            Duration::from_millis(35),
        );
        progress_observation::observe(
            "attach",
            "attach-receipt",
            ProgressMetadata {
                tab_id: Some(&surface.tab_id),
                incarnation: surface.incarnation,
                revision: surface.revision,
                geometry_generation: surface
                    .structured
                    .as_ref()
                    .map_or(0, |structured| structured.geometry_generation),
                bytes: payload.len(),
                count: 1,
                ..ProgressMetadata::default()
            },
        );
        let listed = self.tabs.iter().any(|tab| tab.id == surface.tab_id);
        if let Offer::Commit {
            surface,
            tabs,
            requested,
        } = self.view.offer(surface, Instant::now(), listed)
        {
            self.apply_commit(core, surface, tabs, requested)?;
        }
        Ok(())
    }

    /// Concurrency: the control lane may overtake a replaceable surface slot. An effect waits
    /// until its coherent revision is committed, then is deduplicated by incarnation and
    /// sequence; reconstruction and stale re-offers can never replay it.
    fn terminal_effect(&mut self, payload: &[u8]) -> Result<(), String> {
        let (_, effect): (_, TerminalEffect) = wire::body(payload)?;
        if self.apply_effects
            && self.view.viewed.as_deref() == Some(effect.tab_id.as_str())
            && protocol::validate_effect(&effect.effect).is_ok()
        {
            if effect.incarnation == self.presented.incarnation
                && effect.revision <= self.presented.revision
            {
                self.apply_terminal_effect(&effect)?;
            } else if self.pending_terminal_effects.len() < 256 {
                self.pending_terminal_effects.push_back(effect);
            }
        }
        Ok(())
    }

    fn tab_list(&mut self, core: &mut State, payload: &[u8]) -> Result<(), String> {
        let (_, list): (_, TabList) = wire::body(payload)?;
        let revision = list.revision;
        core.registry_revision = revision;
        let name_confirmed = core.pending_manual_name.as_ref().is_some_and(|(id, name)| {
            list.tabs
                .iter()
                .any(|tab| &tab.tab_id == id && &tab.name == name && tab.name_source == "user")
        });
        let mut next_tabs = self.registry_tabs(core, list.tabs);
        // Invariant: a hidden Settings tab never surfaces by itself. When it is all that
        // remains, it closes with the last visible tab instead of taking the view.
        let settings_visible = core.settings_visible(self.view.viewed.as_deref());
        if !settings_visible
            && !next_tabs.is_empty()
            && next_tabs.iter().all(|tab| tab.id.starts_with("settings-"))
        {
            for tab in next_tabs.drain(..) {
                self.send(Request::Close(tab.id))?;
            }
        }
        if name_confirmed {
            core.pending_manual_name = None;
        }
        if let Some(tab_id) = core.resolve_pending_jump(&next_tabs, revision) {
            self.request_view(tab_id)?;
        }
        let outcome = self.view.topology(&self.tabs, next_tabs, |candidates| {
            core.fallback_view(candidates, settings_visible)
        });
        core.drop_request(outcome.dropped_request.as_deref());
        if let Some(tab_id) = outcome.view_request {
            self.request_view(tab_id)?;
        }
        match outcome.action {
            TopologyAction::Commit { surface, tabs } => {
                self.apply_commit(core, surface, Some(tabs), true)
            }
            TopologyAction::Staged => Ok(()),
            TopologyAction::Install { tabs, changed } => {
                self.tabs = tabs;
                core.installed(&self.tabs, changed);
                if self.tabs.is_empty() {
                    self.view.clear();
                    self.presented = Presented::new();
                    self.pending_terminal_effects.clear();
                    self.paint(core, true)
                } else if changed {
                    self.paint(core, false)
                } else {
                    Ok(())
                }
            }
        }
    }

    /// The registry's running tabs as presented, keeping known status, accent, title
    /// animation, and a submitted manual name until the registry confirms it.
    fn registry_tabs(&self, core: &State, listed: Vec<wire::TabSummary>) -> Vec<StripTab> {
        let previous_tabs = self.view.staged_tabs().unwrap_or(&self.tabs);
        listed
            .into_iter()
            .filter(|tab| tab.lifecycle != "stopped")
            .map(|tab| {
                let previous = previous_tabs
                    .iter()
                    .find(|current| current.id == tab.tab_id);
                let (name, name_source) = core
                    .pending_manual_name
                    .as_ref()
                    .filter(|(id, _)| id == &tab.tab_id)
                    .map_or((tab.name, tab.name_source), |(_, name)| {
                        (name.clone(), "user".into())
                    });
                let title_animation =
                    strip::reconcile_title_animation(previous, &name, &name_source, Instant::now());
                StripTab {
                    id: tab.tab_id,
                    name,
                    name_source,
                    status: previous.map_or(tab.lifecycle, |current| current.status.clone()),
                    accent: previous.and_then(|current| current.accent.clone()),
                    title_animation,
                }
            })
            .collect()
    }

    fn tick(&mut self, core: &mut State) -> Result<(), String> {
        if let Some(Offer::Commit {
            surface,
            tabs,
            requested,
        }) = self.view.expire(Instant::now(), |id| {
            self.tabs.iter().any(|tab| tab.id == id)
        }) {
            self.apply_commit(core, surface, tabs, requested)?;
        }
        if strip::animations_active(&self.tabs)
            && self.last_strip_frame.elapsed() >= strip::animation_interval(&self.tabs)
        {
            self.paint(core, false)?;
            self.last_strip_frame = Instant::now();
        }
        if self.time_format.refresh() {
            self.paint(core, false)?;
        }
        // Invariant: A held glyph that no status replaced is released once its hold ends.
        if self.glyphs.expires.is_some_and(|until| self.now() >= until) {
            self.paint(core, false)?;
        }
        let current_clock_minute = clock_minute();
        if current_clock_minute != self.displayed_clock_minute {
            self.displayed_clock_minute = current_clock_minute;
            self.paint(core, false)?;
        }
        self.run(core, core_attach::Event::Tick)?;
        if self.last_list.elapsed() >= Duration::from_millis(500) {
            self.send(Request::List)?;
            self.last_list = Instant::now();
        }
        Ok(())
    }

    /// Handles one outer terminal event; returns `true` when it ended the session.
    fn input(&mut self, core: &mut State, next: Event) -> Result<bool, String> {
        let next = admit_alt_code_input(cfg!(windows), &mut self.pressed_chars, next);
        self.trace_input(&next);
        match next {
            Event::Key(key) => return self.key(core, key),
            Event::Mouse(mouse) => self.mouse(core, mouse)?,
            Event::Paste(text) => {
                for forward in self.run(core, core_attach::Event::Paste(text))? {
                    if let Effect::ForwardPaste(text) = forward {
                        self.paste(core, text)?;
                    }
                }
            }
            Event::Resize(columns, rows) => self.resize(core, columns, rows)?,
            Event::FocusGained | Event::FocusLost => {
                let gained = matches!(next, Event::FocusGained);
                for forward in self.run(core, core_attach::Event::Focus { gained })? {
                    if let Effect::ForwardFocus { gained } = forward {
                        let legacy = if gained { b"\x1b[I" } else { b"\x1b[O" };
                        self.send_input(core, Some(InputEvent::Focus { gained }), legacy.to_vec())?;
                    }
                }
            }
        }
        Ok(false)
    }

    fn trace_input(&self, next: &Event) {
        if self.key_trace_path.is_none() {
            return;
        }
        let at = format!(
            "{} {}",
            self.started.elapsed().as_millis(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_or(0, |elapsed| elapsed.as_micros())
        );
        let line = match next {
            Event::Mouse(mouse) if !matches!(mouse.kind, MouseEventKind::Moved) => format!(
                "{at} mouse kind={:?} row={} column={} mods={:?} viewed={:?}",
                mouse.kind, mouse.row, mouse.column, mouse.modifiers, self.view.viewed
            ),
            Event::Key(key) => {
                // Security: ordinary typed characters are recorded only as `Char(_)`.
                let code = match key.code {
                    KeyCode::Char(character)
                        if !character.is_control()
                            && !key
                                .modifiers
                                .intersects(KeyModifiers::CONTROL | KeyModifiers::ALT) =>
                    {
                        "Char(_)".to_owned()
                    }
                    code => format!("{code:?}"),
                };
                format!(
                    "{at} key kind={:?} code={code} mods={:?} state={:?}",
                    key.kind, key.modifiers, key.state
                )
            }
            _ => return,
        };
        key_trace(self.key_trace_path.as_deref(), &line);
    }

    /// Returns `true` when the key detached this client.
    fn key(&mut self, core: &mut State, key: crossterm::event::KeyEvent) -> Result<bool, String> {
        let action = self.bindings.action(&key).map(str::to_owned);
        let event = core_attach::Event::Key {
            key: (&key).into(),
            action,
        };
        if !self.run(core, event)?.contains(&Effect::ForwardKey) {
            return Ok(false);
        }
        let event = outer_input::normalize_key(&key);
        let bytes = encode_key(key.code, key.modifiers);
        if bytes.is_empty() && (event.is_none() || !self.channel.semantic) {
            return Ok(false);
        }
        let now = self.started.elapsed().as_millis() as u64;
        // Invariant: the chord is judged on the key's identity, not on the bytes a particular
        // terminal protocol produced for it.
        let ctrl_c = event.as_ref().is_some_and(outer_input::is_ctrl_c_event)
            || (event.is_none() && is_ctrl_c_bytes(&bytes));
        let disposition = self.chord.admit(now, ctrl_c);
        key_trace(
            self.key_trace_path.as_deref(),
            &format!("{now} chord ctrl_c={ctrl_c} -> {disposition:?}"),
        );
        if disposition == CtrlCDisposition::Detach {
            core.exit();
            self.detach()?;
            return Ok(true);
        }
        match self.with_context(|context| core.forward_key(context, (&key).into())) {
            None => {}
            Some(KeyForward::Restart(tab_id)) => self.send(Request::Restart(tab_id))?,
            Some(KeyForward::Typed) => self.send_input(core, event, bytes)?,
            Some(KeyForward::Plain { name, byte }) => {
                self.send_input(core, Some(outer_input::plain_key(&name)), vec![byte])?
            }
        }
        Ok(false)
    }

    /// Invariant: double Ctrl+C leaves from any tab with solo's quit animation when it is
    /// enabled; restoration follows whether or not it played.
    fn detach(&mut self) -> Result<(), String> {
        wire::send(&mut self.stream, "detach", None, wire::ResultBody::ok())?;
        if read_quit_animation(&self.settings_file) {
            self.terminal
                .play_quit_outro(&crate::roles::quit_outro::presented_row_widths(
                    self.columns,
                    self.outer_rows,
                    self.presented.structured.as_ref(),
                ));
        }
        self.terminal.restore()?;
        print_hint(running_agent_count(&self.tabs));
        Ok(())
    }

    fn mouse(
        &mut self,
        core: &mut State,
        mouse: crossterm::event::MouseEvent,
    ) -> Result<(), String> {
        let forwarded = self.run(core, core_attach::Event::Mouse((&mouse).into()))?;
        if !forwarded.contains(&Effect::ForwardMouse) {
            return Ok(());
        }
        let event =
            outer_input::normalize_mouse(mouse.kind, mouse.column, mouse.row, mouse.modifiers);
        if event.as_ref().is_some_and(outer_input::resets_chord) {
            self.chord.reset();
        }
        let bytes = encode_mouse(mouse.kind, mouse.column, mouse.row).unwrap_or_default();
        if event.is_some() || !bytes.is_empty() {
            core.user_input_pending = true;
            self.send_input(core, event, bytes)?;
        }
        Ok(())
    }

    fn paste(&mut self, core: &mut State, text: String) -> Result<(), String> {
        self.chord.reset();
        let bytes = text.into_bytes();
        let mut frames = vec![wire::frame(
            "paste.start",
            None,
            PasteStart {
                bytes: bytes.len(),
                epoch: 0,
            },
        )?];
        for chunk in bytes.chunks(MAX_INPUT_BYTES) {
            frames.push(wire::frame(
                "input",
                None,
                Input {
                    bytes: chunk.to_vec(),
                    paste: true,
                    epoch: 0,
                },
            )?);
        }
        self.send_frames(core, frames)
    }

    fn resize(&mut self, core: &mut State, columns: u16, outer_rows: u16) -> Result<(), String> {
        self.outer_rows = outer_rows;
        let rows = tab_rows(outer_rows).map_err(str::to_owned)?;
        self.geometry_generation = self.geometry_generation.saturating_add(1);
        self.columns = columns;
        self.create.columns = columns;
        self.create.rows = rows;
        self.presented.clear_body();
        self.run(core, core_attach::Event::Resize { columns })?;
        let resize = wire::frame(
            "resize",
            None,
            Resize {
                columns,
                rows,
                epoch: 0,
                geometry_generation: self.geometry_generation,
            },
        )?;
        self.send_frames(core, vec![resize])
    }
}

impl From<&Hover> for StripHover {
    fn from(hover: &Hover) -> Self {
        match hover {
            Hover::Tab(id) => Self::Tab(id.clone()),
            Hover::Overflow => Self::Overflow,
            Hover::New => Self::New,
        }
    }
}

fn strip_hover_present(frame: &strip::StripFrame, hovered: &StripHover) -> bool {
    frame.hits.iter().any(|(_, _, hit)| match (hovered, hit) {
        (StripHover::Tab(hovered), StripHit::View(id)) => hovered == id,
        (StripHover::Overflow, StripHit::Overflow) | (StripHover::New, StripHit::New) => true,
        _ => false,
    })
}

fn outer_size() -> Result<(u16, u16), String> {
    #[cfg(feature = "resident-fixtures")]
    if let Some((columns, rows)) = std::env::var("TERMINAL_HOST_FIXTURE_SIZE")
        .ok()
        .and_then(|value| {
            value
                .split_once('x')
                .map(|(left, right)| (left.parse::<u16>().ok(), right.parse::<u16>().ok()))
        })
        .and_then(|(columns, rows)| columns.zip(rows))
    {
        return Ok((columns, rows));
    }
    crossterm::terminal::size().map_err(|error| format!("read outer terminal size: {error}"))
}

#[cfg(unix)]
fn query_kitty_keyboard(timeout: Duration) -> Result<bool, String> {
    use std::os::fd::AsRawFd;
    let mut output = stdout().lock();
    output
        .write_all(KITTY_QUERY)
        .and_then(|()| output.flush())
        .map_err(|error| format!("query outer keyboard protocol: {error}"))?;
    drop(output);
    let stdin = std::io::stdin();
    let fd = stdin.as_raw_fd();
    let deadline = Instant::now() + timeout;
    let mut response = Vec::new();
    while Instant::now() < deadline && response.len() < 1024 {
        let remaining = deadline.saturating_duration_since(Instant::now());
        let mut descriptor = libc::pollfd {
            fd,
            events: libc::POLLIN,
            revents: 0,
        };
        let ready = unsafe {
            libc::poll(
                &mut descriptor,
                1,
                remaining.as_millis().clamp(1, i32::MAX as u128) as i32,
            )
        };
        if ready < 0 {
            return Err(format!(
                "poll outer keyboard protocol: {}",
                std::io::Error::last_os_error()
            ));
        }
        if ready == 0 {
            break;
        }
        let mut bytes = [0_u8; 128];
        let count = unsafe { libc::read(fd, bytes.as_mut_ptr().cast(), bytes.len()) };
        if count <= 0 {
            break;
        }
        response.extend_from_slice(&bytes[..count as usize]);
        if kitty_query_answered(&response) {
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg(windows)]
fn query_kitty_keyboard(_timeout: Duration) -> Result<bool, String> {
    Ok(false)
}

#[cfg(any(unix, test))]
fn kitty_query_answered(bytes: &[u8]) -> bool {
    bytes.windows(3).enumerate().any(|(index, prefix)| {
        if prefix != b"\x1b[?" {
            return false;
        }
        let value = &bytes[index + 3..];
        value
            .iter()
            .position(|byte| *byte == b'u')
            .is_some_and(|end| end > 0 && value[..end].iter().all(u8::is_ascii_digit))
    })
}

enum OuterWrite {
    Wake,
    Bytes(Vec<u8>),
    Finish(Vec<u8>, mpsc::SyncSender<Result<(), String>>),
}

struct OuterWriter {
    control: mpsc::SyncSender<OuterWrite>,
    latest: Arc<Mutex<Option<DesiredPresentation>>>,
    signaled: Arc<AtomicBool>,
    effect_bytes: Arc<AtomicUsize>,
    failed: Arc<Mutex<Option<String>>>,
}

impl OuterWriter {
    fn start() -> Self {
        let (control, receiver) = mpsc::sync_channel::<OuterWrite>(OUTER_CONTROL_QUEUE_FRAMES);
        let latest = Arc::new(Mutex::new(None::<DesiredPresentation>));
        let signaled = Arc::new(AtomicBool::new(false));
        let effect_bytes = Arc::new(AtomicUsize::new(0));
        let failed = Arc::new(Mutex::new(None));
        let thread_latest = latest.clone();
        let thread_signaled = signaled.clone();
        let thread_effect_bytes = effect_bytes.clone();
        let thread_failed = failed.clone();
        thread::spawn(move || {
            let mut composer = PresentationComposer::default();
            let mut out = stdout().lock();
            loop {
                let command = receiver.recv_timeout(Duration::from_millis(8));
                let result = match command {
                    Ok(OuterWrite::Bytes(bytes)) => {
                        let len = bytes.len();
                        let result = out
                            .write_all(&bytes)
                            .and_then(|()| out.flush())
                            .map_err(|error| format!("write outer terminal: {error}"));
                        thread_effect_bytes.fetch_sub(len, Ordering::SeqCst);
                        result
                    }
                    Ok(OuterWrite::Finish(bytes, done)) => {
                        let result = out
                            .write_all(&bytes)
                            .and_then(|()| out.flush())
                            .map_err(|error| format!("restore outer terminal: {error}"));
                        let _ = done.send(result.clone());
                        return;
                    }
                    Ok(OuterWrite::Wake) | Err(mpsc::RecvTimeoutError::Timeout) => Ok(()),
                    Err(mpsc::RecvTimeoutError::Disconnected) => return,
                };
                if let Err(error) = result {
                    if let Ok(mut failed) = thread_failed.lock() {
                        *failed = Some(error);
                    }
                    return;
                }
                thread_signaled.store(false, Ordering::SeqCst);
                let desired = thread_latest.lock().ok().and_then(|mut slot| slot.take());
                if let Some(desired) = desired {
                    if desired.tab_id.as_deref().is_some_and(|tab_id| {
                        crate::roles::fixture_control::stopped("outer-paint", tab_id)
                    }) {
                        continue;
                    }
                    match composer.prepare(&desired) {
                        Ok(Some(prepared)) => {
                            let result = out
                                .write_all(&prepared.bytes)
                                .and_then(|()| out.flush())
                                .map_err(|error| format!("write outer presentation: {error}"));
                            if let Err(error) = result {
                                if let Ok(mut failed) = thread_failed.lock() {
                                    *failed = Some(error);
                                }
                                return;
                            }
                            if let Some(tab_id) = prepared.tab_id.as_deref() {
                                progress_observation::observe(
                                    "attach",
                                    "outer-paint",
                                    ProgressMetadata {
                                        tab_id: Some(tab_id),
                                        incarnation: prepared.incarnation,
                                        revision: prepared.revision,
                                        geometry_generation: prepared.geometry_generation,
                                        bytes: prepared.bytes.len(),
                                        count: 1,
                                        ..ProgressMetadata::default()
                                    },
                                );
                            }
                            prepared.acknowledge(&mut composer);
                        }
                        Ok(None) => {}
                        Err(error) => {
                            if let Ok(mut failed) = thread_failed.lock() {
                                *failed = Some(error);
                            }
                            return;
                        }
                    }
                }
            }
        });
        Self {
            control,
            latest,
            signaled,
            effect_bytes,
            failed,
        }
    }

    fn check(&self) -> Result<(), String> {
        if let Some(error) = self.failed.lock().ok().and_then(|error| error.clone()) {
            Err(error)
        } else {
            Ok(())
        }
    }

    fn offer(&self, desired: DesiredPresentation) -> Result<(), String> {
        self.check()?;
        if let Ok(mut latest) = self.latest.lock() {
            *latest = Some(desired);
        }
        if !self.signaled.swap(true, Ordering::SeqCst) {
            let _ = self.control.try_send(OuterWrite::Wake);
        }
        Ok(())
    }

    /// Drops a presentation not yet written, so nothing repaints over a quit outro.
    fn discard_presentation(&self) {
        if let Ok(mut latest) = self.latest.lock() {
            *latest = None;
        }
    }

    fn bytes(&self, bytes: &[u8]) -> Result<(), String> {
        self.check()?;
        self.effect_bytes
            .try_update(Ordering::SeqCst, Ordering::SeqCst, |reserved| {
                reserved
                    .checked_add(bytes.len())
                    .filter(|next| *next <= OUTER_EFFECT_QUEUE_BYTES)
            })
            .map_err(|_| "outer terminal effect byte limit reached".to_owned())?;
        match self.control.try_send(OuterWrite::Bytes(bytes.to_vec())) {
            Ok(()) => Ok(()),
            Err(_) => {
                self.effect_bytes.fetch_sub(bytes.len(), Ordering::SeqCst);
                Err("outer terminal writer queue is unavailable".into())
            }
        }
    }

    fn finish(&self, bytes: Vec<u8>) -> Result<(), String> {
        self.check()?;
        let (done, completed) = mpsc::sync_channel(1);
        self.control
            .send(OuterWrite::Finish(bytes, done))
            .map_err(|_| "outer terminal writer stopped".to_owned())?;
        completed
            .recv()
            .map_err(|_| "outer terminal writer stopped before restore".to_owned())?
    }
}

struct OuterTerminal {
    restored: bool,
    kitty_keyboard: bool,
    writer: OuterWriter,
}
impl OuterTerminal {
    fn enter() -> Result<Self, String> {
        enable_raw_mode().map_err(|error| format!("enable outer raw mode: {error}"))?;
        let kitty_keyboard = query_kitty_keyboard(Duration::from_millis(200)).unwrap_or(false);
        let mut initial = Vec::from(ENTER_OUTER_MODES);
        if kitty_keyboard {
            initial.extend_from_slice(KITTY_ENABLE);
        }
        {
            let mut out = stdout().lock();
            out.write_all(&initial)
                .and_then(|()| out.flush())
                .map_err(|error| format!("enter outer terminal: {error}"))?;
        }
        Ok(Self {
            restored: false,
            kitty_keyboard,
            writer: OuterWriter::start(),
        })
    }
    fn write(&self, bytes: &[u8]) -> Result<(), String> {
        self.writer.bytes(bytes)
    }
    fn present(&self, desired: DesiredPresentation) -> Result<(), String> {
        self.writer.offer(desired)
    }
    /// Plays bare A1's fall outro over the screen this client presented, before restoration.
    fn play_quit_outro(&self, row_widths: &[usize]) {
        self.writer.discard_presentation();
        let seed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_or(0, |elapsed| elapsed.subsec_nanos());
        crate::roles::quit_outro::play(row_widths, seed, |bytes| self.write(bytes).is_ok());
        let _ = self.write(b"\x1b[?25h");
    }
    fn restore_sequence(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(outer_input::RESET_CURSOR_STYLE);
        bytes.extend_from_slice(RESET_OUTER_COLORS);
        if self.kitty_keyboard {
            bytes.extend_from_slice(KITTY_RESTORE);
        }
        bytes.extend_from_slice(RESTORE_OUTER_MODES);
        bytes
    }
    fn restore(&mut self) -> Result<(), String> {
        if self.restored {
            return Ok(());
        }
        let sequence = self.restore_sequence();
        let write_result = self.writer.finish(sequence);
        let mode_result =
            disable_raw_mode().map_err(|error| format!("restore cooked input: {error}"));
        self.restored = true;
        write_result.and(mode_result)
    }
}
impl Drop for OuterTerminal {
    fn drop(&mut self) {
        if !self.restored {
            let sequence = self.restore_sequence();
            let _ = self.write(&sequence);
            let _ = disable_raw_mode();
            self.restored = true;
        }
    }
}

/// Agents left running after a detach; the global Settings tab is not an agent.
fn running_agent_count(tabs: &[StripTab]) -> usize {
    tabs.iter()
        .filter(|tab| !tab.id.starts_with("settings-"))
        .count()
}

fn print_hint(count: usize) {
    if count == 1 {
        println!("\x1b[2m1 agent still running run a1 to return.\x1b[0m");
    } else if count > 1 {
        println!("\x1b[2m{count} agents still running run a1 to return.\x1b[0m");
    }
}
/// Xterm modifier parameter for the supported Ctrl/Alt/Shift mask; `None` when unmodified.
/// Lock and other modifier state is deliberately ignored.
fn modifier_parameter(modifiers: KeyModifiers) -> Option<u8> {
    let mut bits = 0;
    if modifiers.contains(KeyModifiers::SHIFT) {
        bits |= 1;
    }
    if modifiers.contains(KeyModifiers::ALT) {
        bits |= 2;
    }
    if modifiers.contains(KeyModifiers::CONTROL) {
        bits |= 4;
    }
    (bits != 0).then_some(bits + 1)
}

fn csi_u(codepoint: u32, parameter: u8) -> Vec<u8> {
    format!("\x1b[{codepoint};{parameter}u").into_bytes()
}

/// Legacy control byte for Ctrl+character when that byte identifies the key losslessly.
fn legacy_control_byte(character: char) -> Option<u8> {
    match character.to_ascii_lowercase() {
        value @ ('a'..='z' | '@' | '[' | '\\' | ']' | '^' | '_') => Some(value as u8 & 0x1f),
        ' ' => Some(0),
        _ => None,
    }
}

fn encode_char(character: char, modifiers: KeyModifiers) -> Vec<u8> {
    let control = modifiers.contains(KeyModifiers::CONTROL);
    let alt = modifiers.contains(KeyModifiers::ALT);
    if !control {
        // Invariant: Shift is already reflected in the produced character, so ESC-prefixing keeps Alt lossless.
        let mut out = Vec::new();
        if alt {
            out.push(0x1b);
        }
        let mut encoded = [0_u8; 4];
        out.extend_from_slice(character.encode_utf8(&mut encoded).as_bytes());
        return out;
    }
    if !alt && !modifiers.contains(KeyModifiers::SHIFT) {
        if let Some(byte) = legacy_control_byte(character) {
            return vec![byte];
        }
    }
    let codepoint = if character.is_ascii_alphabetic() {
        character.to_ascii_lowercase()
    } else {
        character
    };
    csi_u(codepoint as u32, modifier_parameter(modifiers).unwrap_or(1))
}

fn encode_key(code: KeyCode, modifiers: KeyModifiers) -> Vec<u8> {
    let parameter = modifier_parameter(modifiers);
    let cursor = |letter: char| match parameter {
        Some(parameter) => format!("\x1b[1;{parameter}{letter}").into_bytes(),
        None => format!("\x1b[{letter}").into_bytes(),
    };
    let tilde = |number: u8| match parameter {
        Some(parameter) => format!("\x1b[{number};{parameter}~").into_bytes(),
        None => format!("\x1b[{number}~").into_bytes(),
    };
    let control = |legacy: &[u8], codepoint: u32| match parameter {
        Some(parameter) => csi_u(codepoint, parameter),
        None => legacy.to_vec(),
    };
    match code {
        KeyCode::Char(character) => encode_char(character, modifiers),
        // Platform: Windows terminals send LF for Ctrl+Enter and ConPTY reports LF as Ctrl+Enter,
        // so LF is the byte the direct prompt observes there.
        KeyCode::Enter if cfg!(windows) && parameter == Some(5) => b"\n".to_vec(),
        KeyCode::Enter => control(b"\r", 13),
        KeyCode::Tab if parameter == Some(2) => b"\x1b[Z".to_vec(),
        KeyCode::Tab => control(b"\t", 9),
        KeyCode::BackTab => match modifier_parameter(modifiers | KeyModifiers::SHIFT) {
            Some(2) => b"\x1b[Z".to_vec(),
            Some(parameter) => csi_u(9, parameter),
            None => unreachable!("BackTab always carries Shift"),
        },
        KeyCode::Backspace => control(&[0x7f], 127),
        KeyCode::Esc => control(&[0x1b], 27),
        KeyCode::Delete => tilde(3),
        KeyCode::Insert => tilde(2),
        KeyCode::Up => cursor('A'),
        KeyCode::Down => cursor('B'),
        KeyCode::Right => cursor('C'),
        KeyCode::Left => cursor('D'),
        KeyCode::Home => cursor('H'),
        KeyCode::End => cursor('F'),
        KeyCode::PageUp => tilde(5),
        KeyCode::PageDown => tilde(6),
        _ => Vec::new(),
    }
}
fn encode_mouse(kind: MouseEventKind, column: u16, outer_row: u16) -> Option<Vec<u8>> {
    let row = child_mouse_row(outer_row)?;
    let (code, suffix) = match kind {
        MouseEventKind::Down(MouseButton::Left) => (0, 'M'),
        MouseEventKind::Down(MouseButton::Middle) => (1, 'M'),
        MouseEventKind::Down(MouseButton::Right) => (2, 'M'),
        MouseEventKind::Up(_) => (3, 'm'),
        MouseEventKind::Drag(MouseButton::Left) => (32, 'M'),
        MouseEventKind::Drag(MouseButton::Middle) => (33, 'M'),
        MouseEventKind::Drag(MouseButton::Right) => (34, 'M'),
        MouseEventKind::Moved => (35, 'M'),
        MouseEventKind::ScrollUp => (64, 'M'),
        MouseEventKind::ScrollDown => (65, 'M'),
        _ => return None,
    };
    Some(format!("\x1b[<{code};{};{}{suffix}", column + 1, row + 1).into_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::attach::{PopupAction, TabDrag, update_drag};
    #[test]
    fn fast_double_ctrl_c_forwards_once_then_detaches() {
        let mut chord = DoubleCtrlC::new(500);
        assert_eq!(chord.admit(100, true), CtrlCDisposition::Forward);
        assert_eq!(chord.admit(599, true), CtrlCDisposition::Detach);
        assert_eq!(chord.admit(1_200, true), CtrlCDisposition::Forward);
        assert_eq!(chord.admit(1_700, true), CtrlCDisposition::Forward);
        assert!(is_ctrl_c_bytes(b"\x03"));
        assert!(is_ctrl_c_bytes(b"\x1b[99;5u"));
        assert!(is_ctrl_c_console('C', true, true));
    }
    #[test]
    fn notices_never_report_undelivered_input() {
        let source = include_str!("attach.rs");
        let phrase = ["Input was not sent", "; try again."].concat();
        assert!(!source.contains(&phrase));
    }
    #[test]
    fn outer_contract_offsets_rows_and_never_forwards_bell() {
        assert_eq!(tab_rows(24), Ok(23));
        assert_eq!(child_mouse_row(0), None);
        assert_eq!(child_mouse_row(1), Some(0));
        assert_eq!(encode_mouse(MouseEventKind::Moved, 4, 0), None);
        assert_eq!(
            encode_mouse(MouseEventKind::Moved, 4, 1),
            Some(b"\x1b[<35;5;1M".to_vec())
        );
        assert_eq!(
            encode_mouse(MouseEventKind::Down(MouseButton::Left), 2, 8),
            Some(b"\x1b[<0;3;8M".to_vec())
        );
        assert_eq!(without_bell(b"a\x07b"), b"ab");
        assert_eq!(
            without_bell(b"a\x1b]9;notify\x07b\x1b]777;alert\x1b\\c"),
            b"abc"
        );
        assert_eq!(
            without_bell(b"\x1b]8;;https://example.com\x07link\x1b]8;;\x07"),
            b"\x1b]8;;https://example.com\x07link\x1b]8;;\x07"
        );
        assert!(render_notice("input rejected", 40).contains("input rejected"));
    }
    #[test]
    fn tab_bindings_load_assignable_actions_and_disable_conflicts() {
        let profile = tempfile::tempdir().unwrap();
        std::fs::write(
            profile.path().join("keybindings.json"),
            br#"{"tabs.next":"alt+]","tabs.close":"ctrl+x","tui.editor.deleteToLineEnd":"ctrl+x"}"#,
        )
        .unwrap();
        let bindings = TabBindings::load(profile.path());
        assert_eq!(
            bindings.action(&crossterm::event::KeyEvent::new(
                KeyCode::Char(']'),
                KeyModifiers::ALT,
            )),
            Some("tabs.next")
        );
        assert_eq!(
            bindings.action(&crossterm::event::KeyEvent::new(
                KeyCode::Char('x'),
                KeyModifiers::CONTROL,
            )),
            None
        );
        assert_eq!(bindings.label("tabs.close"), "");
        assert_eq!(bindings.label("tabs.new"), "Alt+A");
    }

    // Invariant: the owned child's projection replays these same cases, so dispatch, labels, and
    // help agree on one contract.
    #[test]
    fn shortcut_projection_matches_the_shared_cases_and_published_assignments() {
        let cases: serde_json::Value = serde_json::from_str(include_str!(
            "../../../../test/fixtures/resident-tab-shortcuts/projection-cases.json"
        ))
        .expect("projection cases");
        assert_eq!(
            cases["schema"],
            "a1-resident-tab-shortcut-projection-cases-v1"
        );
        let entries = cases["cases"].as_array().expect("cases");
        assert!(entries.len() >= 6);
        for entry in entries {
            let name = entry["name"].as_str().unwrap_or("case");
            let projected = project_tab_shortcuts(
                &shortcut_bindings(&entry["configured"]),
                &shortcut_bindings(&entry["reserved"]),
            );
            let expected = entry["assignments"].as_object().expect("assignments");
            assert_eq!(projected.len(), expected.len(), "{name}");
            for (action, key) in &projected {
                assert_eq!(
                    key.as_deref(),
                    expected[action].as_str(),
                    "{name}: {action}"
                );
            }
        }
        let published = TabBindings::from_assignments(&[
            ("tabs.next".into(), Some("alt+]".into())),
            ("tabs.new".into(), None),
            ("tabs.close".into(), Some("alt+]".into())),
            ("tabs.unknown".into(), Some("alt+u".into())),
        ]);
        assert_eq!(
            published.action(&crossterm::event::KeyEvent::new(
                KeyCode::Char(']'),
                KeyModifiers::ALT,
            )),
            Some("tabs.next")
        );
        assert_eq!(
            published.action(&crossterm::event::KeyEvent::new(
                KeyCode::Char('a'),
                KeyModifiers::ALT,
            )),
            None
        );
        assert_eq!(published.label("tabs.new"), "");
        assert_eq!(published.label("tabs.close"), "");
        assert_eq!(
            published.action(&crossterm::event::KeyEvent::new(
                KeyCode::Char('u'),
                KeyModifiers::ALT,
            )),
            None
        );
    }

    const NONE: KeyModifiers = KeyModifiers::NONE;
    const SHIFT: KeyModifiers = KeyModifiers::SHIFT;
    const ALT: KeyModifiers = KeyModifiers::ALT;
    const CTRL: KeyModifiers = KeyModifiers::CONTROL;

    fn assert_encodes(cases: &[(KeyCode, KeyModifiers, &[u8])]) {
        for (code, modifiers, expected) in cases {
            assert_eq!(
                encode_key(*code, *modifiers),
                *expected,
                "{code:?} with {modifiers:?}"
            );
        }
    }

    #[test]
    fn character_chords_keep_every_modifier() {
        assert_encodes(&[
            (KeyCode::Char('a'), NONE, b"a"),
            (KeyCode::Char('A'), SHIFT, b"A"),
            (KeyCode::Char('é'), NONE, "é".as_bytes()),
            (KeyCode::Char('a'), CTRL, b"\x01"),
            (KeyCode::Char('C'), CTRL, b"\x03"),
            (KeyCode::Char(' '), CTRL, b"\x00"),
            (KeyCode::Char(']'), CTRL, b"\x1d"),
            (KeyCode::Char('b'), ALT, b"\x1bb"),
            (KeyCode::Char('B'), ALT | SHIFT, b"\x1bB"),
            (KeyCode::Char('1'), CTRL, b"\x1b[49;5u"),
            (KeyCode::Char('A'), CTRL | SHIFT, b"\x1b[97;6u"),
            (KeyCode::Char('z'), CTRL | ALT, b"\x1b[122;7u"),
            (KeyCode::Char('Z'), CTRL | ALT | SHIFT, b"\x1b[122;8u"),
            (KeyCode::Char('a'), CTRL | KeyModifiers::SUPER, b"\x01"),
        ]);
    }

    #[test]
    fn navigation_and_editing_keys_keep_every_modifier() {
        assert_encodes(&[
            (KeyCode::Left, NONE, b"\x1b[D"),
            (KeyCode::Home, NONE, b"\x1b[H"),
            (KeyCode::Delete, NONE, b"\x1b[3~"),
            (KeyCode::Enter, NONE, b"\r"),
            (KeyCode::Tab, NONE, b"\t"),
            (KeyCode::BackTab, SHIFT, b"\x1b[Z"),
            (KeyCode::Backspace, NONE, b"\x7f"),
            (KeyCode::Esc, NONE, b"\x1b"),
            (KeyCode::Left, CTRL, b"\x1b[1;5D"),
            (KeyCode::Right, CTRL, b"\x1b[1;5C"),
            (KeyCode::Left, ALT, b"\x1b[1;3D"),
            (KeyCode::Right, CTRL | SHIFT, b"\x1b[1;6C"),
            (KeyCode::Up, SHIFT, b"\x1b[1;2A"),
            (KeyCode::Down, ALT, b"\x1b[1;3B"),
            (KeyCode::Home, SHIFT, b"\x1b[1;2H"),
            (KeyCode::End, CTRL | SHIFT, b"\x1b[1;6F"),
            (KeyCode::Backspace, CTRL, b"\x1b[127;5u"),
            (KeyCode::Backspace, ALT, b"\x1b[127;3u"),
            (KeyCode::Delete, CTRL, b"\x1b[3;5~"),
            (KeyCode::Insert, SHIFT, b"\x1b[2;2~"),
            (KeyCode::Enter, SHIFT, b"\x1b[13;2u"),
            (KeyCode::Enter, ALT, b"\x1b[13;3u"),
            (
                KeyCode::Enter,
                CTRL,
                if cfg!(windows) {
                    &b"\n"[..]
                } else {
                    &b"\x1b[13;5u"[..]
                },
            ),
            (KeyCode::Enter, CTRL | SHIFT, b"\x1b[13;6u"),
            (KeyCode::Tab, SHIFT, b"\x1b[Z"),
            (KeyCode::Tab, CTRL, b"\x1b[9;5u"),
            (KeyCode::BackTab, NONE, b"\x1b[Z"),
            (KeyCode::BackTab, CTRL | SHIFT, b"\x1b[9;6u"),
            (KeyCode::Esc, ALT, b"\x1b[27;3u"),
            (KeyCode::PageUp, NONE, b"\x1b[5~"),
            (KeyCode::PageUp, SHIFT, b"\x1b[5;2~"),
            (KeyCode::PageDown, CTRL, b"\x1b[6;5~"),
        ]);
    }

    #[test]
    fn windows_shifted_uppercase_ctrl_c_is_a_plain_ctrl_c_and_arms_the_chord() {
        // Platform: Windows Terminal reports `Char('C')` with Shift and Control for a plain Ctrl+C.
        let reported = Event::Key(crossterm::event::KeyEvent::new_with_kind(
            KeyCode::Char('C'),
            KeyModifiers::SHIFT | KeyModifiers::CONTROL,
            KeyEventKind::Press,
        ));
        let mut pressed = std::collections::HashSet::new();
        let Event::Key(key) = admit_alt_code_input(true, &mut pressed, reported.clone()) else {
            panic!("key event expected");
        };
        assert_eq!(
            (key.code, key.modifiers),
            (KeyCode::Char('c'), KeyModifiers::CONTROL)
        );
        let event = outer_input::normalize_key(&key).expect("semantic key");
        assert!(outer_input::is_ctrl_c_event(&event));
        let mut chord = DoubleCtrlC::new(1_500);
        assert_eq!(chord.admit(0, true), CtrlCDisposition::Forward);
        assert_eq!(chord.admit(700, true), CtrlCDisposition::Detach);

        let Event::Key(other) = admit_alt_code_input(false, &mut pressed, reported) else {
            panic!("key event expected");
        };
        assert_eq!(
            other.code,
            KeyCode::Char('C'),
            "other platforms keep the report"
        );
    }

    #[test]
    fn windows_alt_code_characters_are_admitted_once_from_their_release() {
        let key = |code, kind| {
            Event::Key(crossterm::event::KeyEvent::new_with_kind(
                code,
                KeyModifiers::NONE,
                kind,
            ))
        };
        let kind = |event: Event| match event {
            Event::Key(key) => key.kind,
            _ => panic!("key event expected"),
        };
        let mut pressed = std::collections::HashSet::new();
        let accent = KeyCode::Char('\u{301}');
        assert_eq!(
            kind(admit_alt_code_input(
                true,
                &mut pressed,
                key(accent, KeyEventKind::Release)
            )),
            KeyEventKind::Press
        );
        let typed = KeyCode::Char('é');
        admit_alt_code_input(true, &mut pressed, key(typed, KeyEventKind::Press));
        assert_eq!(
            kind(admit_alt_code_input(
                true,
                &mut pressed,
                key(typed, KeyEventKind::Release)
            )),
            KeyEventKind::Release,
            "a layout key's own release is not input"
        );
        admit_alt_code_input(
            true,
            &mut pressed,
            key(KeyCode::Char('É'), KeyEventKind::Press),
        );
        assert_eq!(
            kind(admit_alt_code_input(
                true,
                &mut pressed,
                key(typed, KeyEventKind::Release)
            )),
            KeyEventKind::Release,
            "a release after Shift lifted still matches its press"
        );
        assert_eq!(
            kind(admit_alt_code_input(
                true,
                &mut pressed,
                key(KeyCode::Char('a'), KeyEventKind::Release)
            )),
            KeyEventKind::Release
        );
        assert_eq!(
            kind(admit_alt_code_input(
                false,
                &mut pressed,
                key(accent, KeyEventKind::Release)
            )),
            KeyEventKind::Release,
            "other platforms keep ignoring releases"
        );
    }

    #[test]
    fn strip_hover_survives_unrelated_updates_only_while_geometry_exists() {
        let tab = |id: &str| StripTab {
            id: id.into(),
            name: "long resident agent".into(),
            name_source: "default".into(),
            status: "idle".into(),
            accent: None,
            title_animation: None,
        };
        let many = (0..10)
            .map(|index| tab(&format!("tab-{index}")))
            .collect::<Vec<_>>();
        let crowded = strip::render(&many, Some("tab-0"), 40);
        assert!(strip_hover_present(
            &crowded,
            &StripHover::Tab("tab-0".into())
        ));
        assert!(strip_hover_present(&crowded, &StripHover::Overflow));
        assert!(strip_hover_present(&crowded, &StripHover::New));
        let changed = strip::render(&[tab("tab-1")], Some("tab-1"), 80);
        assert!(!strip_hover_present(
            &changed,
            &StripHover::Tab("tab-0".into())
        ));
        assert!(!strip_hover_present(&changed, &StripHover::Overflow));
        assert!(strip_hover_present(&changed, &StripHover::New));
    }

    #[test]
    fn modeled_overlays_match_v2_menu_style_and_actions() {
        let profile = tempfile::tempdir().unwrap();
        let bindings = TabBindings::load(profile.path());
        let mut menu = PopupMenu::context("tab-1".into(), 79, 80, &bindings);
        let rendered = menu.render_with_color(true);
        assert!(rendered.contains("Close"));
        assert!(rendered.contains("Alt+W"));
        assert!(rendered.contains("Rename"));
        assert!(rendered.contains("F2"));
        assert!(rendered.contains("\x1b[48;2;38;38;38m"));
        assert!(rendered.contains("\x1b[38;2;110;110;110m"));
        assert_eq!(menu.column + menu.width, 80);
        assert_eq!(menu.action_at(menu.column, 1), Some(PopupAction::Close));
        assert_eq!(menu.action_at(menu.column, 2), Some(PopupAction::Rename));
        assert_eq!(menu.action_at(menu.column, 0), None);
        assert_eq!(menu.action_at(menu.column.saturating_sub(1), 1), None);
        menu.hovered = Some(0);
        assert!(menu.render_with_color(true).contains("\x1b[48;2;48;48;48m"));
        let palette = menu.render_with_color(false);
        assert!(palette.contains("48;5;236"));
        assert!(!palette.contains("\x1b[7m"));
        menu.resize(8);
        assert_eq!(menu.column + menu.width, 8);
        menu.resize(80);
        assert_eq!(menu.column + menu.width, 80);

        let mut add = PopupMenu::add(0, 80, &bindings);
        assert_eq!(add.action_at(add.column, 1), Some(PopupAction::NewAgent));
        assert_eq!(add.action_at(add.column, 2), None);
        assert_eq!(add.action_at(add.column, 3), Some(PopupAction::Settings));
        add.move_hover(1);
        assert_eq!(add.hovered, Some(0));
        add.move_hover(1);
        assert_eq!(add.hovered, Some(2));
        let add_rendered = add.render();
        assert!(add_rendered.contains("+ Agent"));
        assert!(add_rendered.contains("  Settings"));
        assert!(add_rendered.contains("Alt+,"));
        for rendered in [add.render_with_color(true), add.render_with_color(false)] {
            let plain = rendered
                .split('\x1b')
                .map(|part| part.split_once('m').map_or(part, |(_, text)| text))
                .collect::<String>();
            let agent = plain.find("Agent").expect("agent label");
            let settings = plain.find("Settings").expect("settings label");
            let agent_row = plain[..agent].rfind('H').unwrap();
            let settings_row = plain[..settings].rfind('H').unwrap();
            assert_eq!(agent - agent_row, settings - settings_row, "{plain:?}");
        }
        let palette_add = add.render_with_color(false);
        assert!(palette_add.contains("\x1b[38;5;242mAlt+,"));
        assert!(add_rendered.contains('─'));
        let settings = PopupMenu::context("settings-1".into(), 0, 80, &bindings);
        assert_eq!(settings.items.len(), 1);
        assert_eq!(
            settings.action_at(settings.column, 1),
            Some(PopupAction::Close)
        );

        std::fs::write(
            profile.path().join("keybindings.json"),
            br#"{"tabs.close":"ctrl+x","tabs.rename":"alt+r"}"#,
        )
        .unwrap();
        let rebound = PopupMenu::context("tab-1".into(), 0, 80, &TabBindings::load(profile.path()));
        let rebound_rendered = rebound.render();
        assert!(rebound_rendered.contains("Ctrl+X"));
        assert!(rebound_rendered.contains("Alt+R"));
        let marker = render_drag_marker_configured(79, 80, true);
        assert!(marker.contains("│"));
        assert!(marker.contains("48;2;38;38;38"));
        assert!(!marker.contains("release to move"));
    }

    #[test]
    fn drag_uses_v2_threshold_destinations_and_no_op_suppression() {
        let tab = |id: &str| StripTab {
            id: id.into(),
            name: id.into(),
            name_source: "default".into(),
            status: "idle".into(),
            accent: None,
            title_animation: None,
        };
        let tabs = vec![tab("a"), tab("b"), tab("c")];
        let frame = strip::render(&tabs, Some("a"), 80);
        let snapshot = StripSnapshot::from(&frame);
        let now = Duration::from_secs(10);
        let last_end = frame
            .hits
            .iter()
            .find_map(|(_, end, hit)| {
                matches!(hit, StripHit::View(id) if id == "c").then_some(*end)
            })
            .unwrap();
        let mut drag = TabDrag {
            tab_id: "a".into(),
            start_column: 1,
            started_at: now,
            shown: false,
            drop_index: Some(0),
            expected_revision: 9,
        };
        let mut held = TabDrag {
            tab_id: "a".into(),
            start_column: 1,
            started_at: now - core_attach::DRAG_HOLD,
            shown: false,
            drop_index: Some(0),
            expected_revision: 9,
        };
        assert!(update_drag(&mut held, 1, true, &tabs, &snapshot, now));
        assert!(held.shown);
        assert_eq!(drag_marker_column(&held, &tabs, &snapshot), None);

        assert!(update_drag(
            &mut drag, last_end, true, &tabs, &snapshot, now
        ));
        assert!(drag.shown);
        assert_eq!(drag.drop_index, Some(2));
        assert_eq!(drag_marker_column(&drag, &tabs, &snapshot), Some(last_end));
        assert!(update_drag(
            &mut drag, last_end, false, &tabs, &snapshot, now
        ));
        assert_eq!(drag.drop_index, None);
    }

    #[test]
    fn popup_hover_uses_the_owned_accent_selected_background() {
        let profile = tempfile::tempdir().unwrap();
        let file = profile.path().join("settings.json");
        assert_eq!(
            read_accent_hover(&file),
            [58, 56, 66],
            "purple is the default accent"
        );
        std::fs::write(&file, br#"{"a1":{"accentColor":"cyan"}}"#).unwrap();
        assert_eq!(read_accent_hover(&file), [48, 60, 61]);
        let bindings = TabBindings::load(profile.path());
        let mut menu = PopupMenu::add(0, 80, &bindings);
        menu.hovered = Some(0);
        let rendered = menu.render_styled(true, read_accent_hover(&file));
        assert!(rendered.contains("\x1b[48;2;48;60;61m"));
        assert!(!rendered.contains("\x1b[48;2;48;48;48m"));
    }

    #[test]
    fn quit_animation_follows_the_owned_setting_and_defaults_on() {
        let profile = tempfile::tempdir().unwrap();
        let file = profile.path().join("settings.json");
        assert!(read_quit_animation(&file));
        std::fs::write(&file, br#"{"a1":{"quitAnimation":false}}"#).unwrap();
        assert!(!read_quit_animation(&file));
        std::fs::write(&file, br#"{"a1":{"quitAnimation":true}}"#).unwrap();
        assert!(read_quit_animation(&file));
        std::fs::write(&file, b"not json").unwrap();
        assert!(read_quit_animation(&file));
    }

    #[test]
    fn settings_time_format_is_bounded_and_observed_live() {
        let profile = tempfile::tempdir().unwrap();
        let file = profile.path().join("settings.json");
        assert_eq!(read_time_format(&file), TimeFormat::Twelve);
        std::fs::write(&file, br#"{"a1":{"timeFormat":"20:00"}}"#).unwrap();
        assert_eq!(read_time_format(&file), TimeFormat::TwentyFour);
        let mut watch = TimeFormatWatch::new(&file);
        std::fs::write(&file, br#"{"a1":{"timeFormat":"8:00 PM"}}"#).unwrap();
        watch.checked_at = Instant::now() - SETTINGS_POLL_INTERVAL;
        assert!(watch.refresh());
        assert_eq!(watch.value, TimeFormat::Twelve);

        std::fs::write(&file, br#"{"a1":{"timeFormat":"invalid"}}"#).unwrap();
        assert_eq!(read_time_format(&file), TimeFormat::Twelve);
        std::fs::write(&file, vec![b'x'; MAX_SETTINGS_BYTES as usize + 1]).unwrap();
        assert_eq!(read_time_format(&file), TimeFormat::Twelve);
    }

    #[test]
    fn presentation_is_one_ordered_synchronized_write() {
        let strip = strip::render(&[], None, 20);
        let frame = Frame {
            strip: &strip.bytes,
            body: Some(b"SURFACE"),
            overlay: Some("OVERLAY"),
            cursor: Some(FinalCursor::Hidden),
            clear: true,
        }
        .compose()
        .expect("complete frame");
        assert!(frame.starts_with(BEGIN_SYNCHRONIZED_UPDATE));
        assert!(frame.ends_with(END_SYNCHRONIZED_UPDATE));
        let text = String::from_utf8(frame).unwrap();
        assert!(text.find("\x1b[2J").unwrap() < text.find(" + ").unwrap());
        assert!(text.find(" + ").unwrap() < text.find("SURFACE").unwrap());
        assert!(text.find("SURFACE").unwrap() < text.find("OVERLAY").unwrap());
        assert!(text.find("OVERLAY").unwrap() < text.find("\x1b[?25l").unwrap());
    }

    #[test]
    fn new_tab_failures_name_their_reason() {
        assert_eq!(
            tab_create_failure_notice(Some("tab-start-busy")),
            "Could not open a tab: tab starts are busy, try again shortly"
        );
        assert_eq!(
            tab_create_failure_notice(Some("busy")),
            "Could not open a tab: a tab change is still running, try again shortly"
        );
        assert_eq!(
            tab_create_failure_notice(Some("holder launch failed")),
            "Could not open a tab: holder launch failed"
        );
        assert_eq!(
            tab_create_failure_notice(None),
            "Could not open a tab: the tab could not start"
        );
    }

    #[test]
    fn terminal_effect_sequences_reject_duplicates_and_restart_per_incarnation() {
        let effect = |incarnation, sequence, revision| TerminalEffect {
            tab_id: "tab-1".into(),
            incarnation,
            sequence,
            revision,
            effect: EffectKind::ClipboardWrite {
                location: protocol::ClipboardLocation::Standard,
                mime: "text/plain".into(),
                data: b"safe".to_vec(),
            },
        };
        let mut applied = HashMap::new();
        assert!(admit_terminal_effect(&mut applied, &effect(2, 1, 9)));
        assert!(!admit_terminal_effect(&mut applied, &effect(2, 1, 10)));
        assert!(!admit_terminal_effect(&mut applied, &effect(2, 0, 1)));
        assert!(admit_terminal_effect(&mut applied, &effect(2, 2, 9)));
        assert!(admit_terminal_effect(&mut applied, &effect(3, 1, 1)));
    }

    #[test]
    fn mode_restore_disables_every_enabled_outer_mode() {
        for mode in ["1049", "2004", "1004", "1000", "1003", "1006"] {
            assert!(String::from_utf8_lossy(ENTER_OUTER_MODES).contains(&format!("?{mode}h")));
            assert!(String::from_utf8_lossy(RESTORE_OUTER_MODES).contains(&format!("?{mode}l")));
        }
        assert_eq!(BEGIN_SYNCHRONIZED_UPDATE, b"\x1b[?2026h");
        assert_eq!(END_SYNCHRONIZED_UPDATE, b"\x1b[?2026l");
        assert_eq!(KITTY_ENABLE, b"\x1b[>1u");
        assert_eq!(KITTY_RESTORE, b"\x1b[<1u");
        for reset in [
            b"\x1b]104\x07".as_slice(),
            b"\x1b]110\x07",
            b"\x1b]111\x07",
            b"\x1b]112\x07",
        ] {
            assert!(
                RESET_OUTER_COLORS
                    .windows(reset.len())
                    .any(|window| window == reset)
            );
        }
        assert!(kitty_query_answered(b"noise\x1b[?3u\x1b[?1;2c"));
        assert!(!kitty_query_answered(b"\x1b[?1;2c"));
        assert!(!kitty_query_answered(b"\x1b[?u"));
    }

    #[test]
    fn key_events_convert_to_core_keys() {
        use core_attach::{AttachKey, KeyKind, Modifiers};
        let cases = [
            (KeyCode::Char('x'), core_attach::KeyCode::Char('x')),
            (KeyCode::F(5), core_attach::KeyCode::F(5)),
            (KeyCode::Enter, core_attach::KeyCode::Enter),
            (KeyCode::Tab, core_attach::KeyCode::Tab),
            (KeyCode::BackTab, core_attach::KeyCode::BackTab),
            (KeyCode::Backspace, core_attach::KeyCode::Backspace),
            (KeyCode::Esc, core_attach::KeyCode::Esc),
            (KeyCode::Delete, core_attach::KeyCode::Delete),
            (KeyCode::Insert, core_attach::KeyCode::Insert),
            (KeyCode::Up, core_attach::KeyCode::Up),
            (KeyCode::Down, core_attach::KeyCode::Down),
            (KeyCode::Left, core_attach::KeyCode::Left),
            (KeyCode::Right, core_attach::KeyCode::Right),
            (KeyCode::Home, core_attach::KeyCode::Home),
            (KeyCode::End, core_attach::KeyCode::End),
            (KeyCode::PageUp, core_attach::KeyCode::PageUp),
            (KeyCode::PageDown, core_attach::KeyCode::PageDown),
            (KeyCode::Null, core_attach::KeyCode::Other),
            (KeyCode::CapsLock, core_attach::KeyCode::Other),
        ];
        for (code, expected) in cases {
            assert_eq!(core_attach::KeyCode::from(code), expected, "{code:?}");
        }

        assert_eq!(Modifiers::from(KeyModifiers::NONE), Modifiers::NONE);
        assert_eq!(
            Modifiers::from(KeyModifiers::SHIFT | KeyModifiers::CONTROL | KeyModifiers::ALT),
            Modifiers {
                shift: true,
                control: true,
                alt: true,
                other: false,
            }
        );
        for extra in [KeyModifiers::SUPER, KeyModifiers::HYPER, KeyModifiers::META] {
            assert_eq!(
                Modifiers::from(extra),
                Modifiers {
                    other: true,
                    ..Modifiers::NONE
                }
            );
        }

        for (kind, expected) in [
            (KeyEventKind::Press, KeyKind::Press),
            (KeyEventKind::Repeat, KeyKind::Repeat),
            (KeyEventKind::Release, KeyKind::Release),
        ] {
            let event = crossterm::event::KeyEvent::new_with_kind(
                KeyCode::Char('r'),
                KeyModifiers::ALT,
                kind,
            );
            assert_eq!(
                AttachKey::from(&event),
                AttachKey {
                    code: core_attach::KeyCode::Char('r'),
                    modifiers: Modifiers {
                        alt: true,
                        ..Modifiers::NONE
                    },
                    kind: expected,
                }
            );
        }
    }

    #[test]
    fn mouse_events_convert_to_core_mouse() {
        use core_attach::{AttachMouse, Modifiers, MouseKind};
        let buttons = [
            (MouseButton::Left, core_attach::MouseButton::Left),
            (MouseButton::Right, core_attach::MouseButton::Right),
            (MouseButton::Middle, core_attach::MouseButton::Middle),
        ];
        let mut cases = vec![
            (MouseEventKind::Moved, MouseKind::Moved),
            (MouseEventKind::ScrollDown, MouseKind::ScrollDown),
            (MouseEventKind::ScrollUp, MouseKind::ScrollUp),
            (MouseEventKind::ScrollLeft, MouseKind::ScrollLeft),
            (MouseEventKind::ScrollRight, MouseKind::ScrollRight),
        ];
        for (button, core_button) in buttons {
            cases.push((MouseEventKind::Down(button), MouseKind::Down(core_button)));
            cases.push((MouseEventKind::Up(button), MouseKind::Up(core_button)));
            cases.push((MouseEventKind::Drag(button), MouseKind::Drag(core_button)));
        }
        for (kind, expected) in cases {
            let event = crossterm::event::MouseEvent {
                kind,
                column: 7,
                row: 3,
                modifiers: KeyModifiers::SHIFT,
            };
            assert_eq!(
                AttachMouse::from(&event),
                AttachMouse {
                    kind: expected,
                    column: 7,
                    row: 3,
                    modifiers: Modifiers {
                        shift: true,
                        ..Modifiers::NONE
                    },
                },
                "{kind:?}"
            );
        }
    }

    #[test]
    fn strip_values_convert_to_core_snapshots() {
        use core_attach::{AttachTab, StripHitKind, StripSnapshot};
        let frame = strip::StripFrame {
            bytes: "rendered".into(),
            hits: vec![
                (0, 5, StripHit::View("tab-a".into())),
                (5, 7, StripHit::Overflow),
                (7, 9, StripHit::New),
            ],
            hidden_tabs: vec!["tab-b".into()],
        };
        let snapshot = StripSnapshot::from(&frame);
        assert_eq!(
            snapshot,
            StripSnapshot {
                hits: vec![
                    (0, 5, StripHitKind::View("tab-a".into())),
                    (5, 7, StripHitKind::Overflow),
                    (7, 9, StripHitKind::New),
                ],
                hidden_tabs: vec!["tab-b".into()],
            }
        );
        for column in 0..10 {
            assert_eq!(
                snapshot.hit(column),
                strip::hit(&frame, column).map(StripHitKind::from).as_ref(),
                "column {column}"
            );
        }

        let tab = StripTab {
            id: "tab-a".into(),
            name: "Agent".into(),
            name_source: "manual".into(),
            status: "working".into(),
            accent: Some("blue".into()),
            title_animation: Some(strip::TitleAnimation {
                from: "Old".into(),
                started_at: Instant::now(),
            }),
        };
        assert_eq!(
            AttachTab::from(&tab),
            AttachTab {
                id: "tab-a".into(),
                name: "Agent".into(),
                name_source: "manual".into(),
                status: "working".into(),
                accent: Some("blue".into()),
            }
        );
    }
}
