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

use crate::core::attach as core_attach;
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
const DEFERRED_INPUT_BYTES: usize = 4 * 1024 * 1024;
const DEFERRED_INPUT_FRAMES: usize = 1024;
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

/// True when the failed tab's restricted input rules apply: only while that tab is viewed.
pub fn failure_applies(failed_tab: Option<&str>, viewed: Option<&str>) -> bool {
    failed_tab.is_some() && failed_tab == viewed
}

/// Invariant: a rejection notice answers input the person typed, pasted, or clicked. Focus
/// traffic is forwarded too, and terminals such as ConPTY synthesize it on attach, so its
/// rejection stays silent and a read-only viewer's first frame keeps the child's top row.
fn rejection_notice(user_input_pending: &mut bool, message: Option<String>) -> Option<String> {
    let armed = std::mem::replace(user_input_pending, false);
    message.filter(|_| armed)
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

#[derive(Debug, Clone, PartialEq, Eq)]
enum PopupKind {
    Context,
    Add,
    Overflow,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum PopupAction {
    Close,
    Rename,
    NewAgent,
    Settings,
    View(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PopupItem {
    label: String,
    shortcut: String,
    action: Option<PopupAction>,
    separator: bool,
}

impl PopupItem {
    fn action(label: impl Into<String>, shortcut: String, action: PopupAction) -> Self {
        Self {
            label: label.into(),
            shortcut,
            action: Some(action),
            separator: false,
        }
    }

    fn separator() -> Self {
        Self {
            label: String::new(),
            shortcut: String::new(),
            action: None,
            separator: true,
        }
    }

    fn width(&self) -> usize {
        if self.separator {
            8
        } else {
            UnicodeWidthStr::width(self.label.as_str())
                + if self.shortcut.is_empty() {
                    0
                } else {
                    2 + UnicodeWidthStr::width(self.shortcut.as_str())
                }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PopupMenu {
    kind: PopupKind,
    tab_id: Option<String>,
    anchor_column: u16,
    column: u16,
    width: u16,
    hovered: Option<usize>,
    items: Vec<PopupItem>,
}

impl PopupMenu {
    fn context(tab_id: String, column: u16, columns: u16, bindings: &TabBindings) -> Self {
        let mut items = vec![PopupItem::action(
            "Close",
            bindings.label("tabs.close"),
            PopupAction::Close,
        )];
        if !tab_id.starts_with("settings-") {
            items.push(PopupItem::action(
                "Rename",
                bindings.label("tabs.rename"),
                PopupAction::Rename,
            ));
        }
        Self::new(PopupKind::Context, Some(tab_id), column, columns, items)
    }

    fn add(column: u16, columns: u16, bindings: &TabBindings) -> Self {
        Self::new(
            PopupKind::Add,
            None,
            column,
            columns,
            vec![
                PopupItem::action("+ Agent", bindings.label("tabs.new"), PopupAction::NewAgent),
                PopupItem::separator(),
                // Invariant: labels align after the `+ ` marker, so Settings starts under Agent.
                PopupItem::action(
                    "  Settings",
                    bindings.label("tabs.settings"),
                    PopupAction::Settings,
                ),
            ],
        )
    }

    fn overflow(
        column: u16,
        columns: u16,
        hidden_tabs: &[String],
        tabs: &[StripTab],
        viewed: Option<&str>,
    ) -> Self {
        let items = hidden_tabs
            .iter()
            .filter_map(|id| tabs.iter().find(|tab| &tab.id == id))
            .map(|tab| {
                let marker = if viewed == Some(tab.id.as_str()) {
                    "✓"
                } else {
                    " "
                };
                PopupItem::action(
                    format!("{marker} {}", tab.name),
                    String::new(),
                    PopupAction::View(tab.id.clone()),
                )
            })
            .collect();
        Self::new(PopupKind::Overflow, None, column, columns, items)
    }

    fn new(
        kind: PopupKind,
        tab_id: Option<String>,
        anchor_column: u16,
        columns: u16,
        items: Vec<PopupItem>,
    ) -> Self {
        let width = items
            .iter()
            .map(PopupItem::width)
            .max()
            .unwrap_or(1)
            .saturating_add(2)
            .min(usize::from(columns)) as u16;
        let column = anchor_column.min(columns.saturating_sub(width));
        Self {
            kind,
            tab_id,
            anchor_column,
            column,
            width,
            hovered: None,
            items,
        }
    }

    fn resize(&mut self, columns: u16) {
        self.width = self
            .items
            .iter()
            .map(PopupItem::width)
            .max()
            .unwrap_or(1)
            .saturating_add(2)
            .min(usize::from(columns)) as u16;
        self.column = self.anchor_column.min(columns.saturating_sub(self.width));
    }

    fn row_at(&self, column: u16, row: u16) -> Option<usize> {
        if column < self.column || column >= self.column.saturating_add(self.width) || row == 0 {
            return None;
        }
        let index = usize::from(row - 1);
        self.items.get(index).map(|_| index)
    }

    fn index_at(&self, column: u16, row: u16) -> Option<usize> {
        self.row_at(column, row)
            .filter(|index| self.items[*index].action.is_some())
    }

    fn action_at(&self, column: u16, row: u16) -> Option<PopupAction> {
        self.index_at(column, row)
            .and_then(|index| self.items[index].action.clone())
    }

    fn move_hover(&mut self, delta: isize) {
        let selectable = self
            .items
            .iter()
            .enumerate()
            .filter_map(|(index, item)| item.action.as_ref().map(|_| index))
            .collect::<Vec<_>>();
        if selectable.is_empty() {
            self.hovered = None;
            return;
        }
        let current = self
            .hovered
            .and_then(|index| selectable.iter().position(|candidate| *candidate == index));
        let next = match current {
            Some(index) => (index as isize + delta).rem_euclid(selectable.len() as isize) as usize,
            None if delta < 0 => selectable.len() - 1,
            None => 0,
        };
        self.hovered = Some(selectable[next]);
    }

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

const RENAME_HISTORY_LIMIT: usize = 100;

#[derive(Debug, Clone, PartialEq, Eq)]
struct RenameSnapshot {
    text: String,
    cursor: usize,
    selection_anchor: Option<usize>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RenameEdit {
    Typing,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct RenameEditor {
    tab_id: String,
    text: String,
    cursor: usize,
    selection_anchor: Option<usize>,
    undo: Vec<RenameSnapshot>,
    redo: Vec<RenameSnapshot>,
    last_edit: Option<RenameEdit>,
}

impl RenameEditor {
    fn new(tab_id: String, text: String) -> Self {
        let cursor = text.graphemes(true).count();
        Self {
            tab_id,
            text,
            cursor,
            selection_anchor: None,
            undo: Vec::new(),
            redo: Vec::new(),
            last_edit: None,
        }
    }

    fn snapshot(&self) -> RenameSnapshot {
        RenameSnapshot {
            text: self.text.clone(),
            cursor: self.cursor,
            selection_anchor: self.selection_anchor,
        }
    }

    fn restore(&mut self, snapshot: RenameSnapshot) {
        self.text = snapshot.text;
        self.cursor = snapshot.cursor;
        self.selection_anchor = snapshot.selection_anchor;
    }

    /// Records the state before an edit; consecutive typed characters share one undo step.
    fn record(&mut self, edit: RenameEdit) {
        if edit == RenameEdit::Typing && self.last_edit == Some(RenameEdit::Typing) {
            return;
        }
        self.undo.push(self.snapshot());
        if self.undo.len() > RENAME_HISTORY_LIMIT {
            self.undo.remove(0);
        }
        self.redo.clear();
        self.last_edit = Some(edit);
    }

    /// Applies an edit and keeps it in history only when it changed the text.
    fn edit(&mut self, kind: RenameEdit, change: impl FnOnce(&mut Self)) {
        let before = self.snapshot();
        let last_edit = self.last_edit;
        let undo_len = self.undo.len();
        let redo = self.redo.clone();
        self.record(kind);
        change(self);
        if self.text == before.text {
            self.undo.truncate(undo_len);
            self.redo = redo;
            self.last_edit = last_edit;
        }
    }

    fn undo(&mut self) {
        if let Some(snapshot) = self.undo.pop() {
            self.redo.push(self.snapshot());
            self.restore(snapshot);
        }
        self.last_edit = None;
    }

    fn redo(&mut self) {
        if let Some(snapshot) = self.redo.pop() {
            self.undo.push(self.snapshot());
            self.restore(snapshot);
        }
        self.last_edit = None;
    }

    fn len(&self) -> usize {
        self.text.graphemes(true).count()
    }

    fn selection(&self) -> Option<(usize, usize)> {
        self.selection_anchor
            .filter(|anchor| *anchor != self.cursor)
            .map(|anchor| (anchor, self.cursor))
    }

    fn display(&self) -> strip::StripRename {
        strip::StripRename {
            tab_id: self.tab_id.clone(),
            text: self.text.clone(),
            cursor: self.cursor,
            selection: self.selection(),
        }
    }

    fn byte_offset(&self, grapheme: usize) -> usize {
        self.text
            .grapheme_indices(true)
            .nth(grapheme)
            .map_or(self.text.len(), |(offset, _)| offset)
    }

    fn delete_selection(&mut self) -> bool {
        let Some((left, right)) = self.selection().map(|(a, b)| (a.min(b), a.max(b))) else {
            return false;
        };
        let start = self.byte_offset(left);
        let end = self.byte_offset(right);
        self.text.replace_range(start..end, "");
        self.cursor = left;
        self.selection_anchor = None;
        true
    }

    fn insert(&mut self, value: char) {
        self.edit(RenameEdit::Typing, |editor| {
            editor.delete_selection();
            if editor.len() >= 64 {
                return;
            }
            let offset = editor.byte_offset(editor.cursor);
            editor.text.insert(offset, value);
            editor.cursor += 1;
        });
    }

    fn backspace(&mut self) {
        self.edit(RenameEdit::Other, |editor| {
            if editor.delete_selection() || editor.cursor == 0 {
                return;
            }
            let start = editor.byte_offset(editor.cursor - 1);
            let end = editor.byte_offset(editor.cursor);
            editor.text.replace_range(start..end, "");
            editor.cursor -= 1;
        });
    }

    fn delete(&mut self) {
        self.edit(RenameEdit::Other, |editor| {
            if editor.delete_selection() || editor.cursor >= editor.len() {
                return;
            }
            let start = editor.byte_offset(editor.cursor);
            let end = editor.byte_offset(editor.cursor + 1);
            editor.text.replace_range(start..end, "");
        });
    }

    fn delete_word_left(&mut self) {
        self.edit(RenameEdit::Other, |editor| {
            if editor.delete_selection() {
                return;
            }
            let start = editor.word_left_boundary();
            let (from, to) = (editor.byte_offset(start), editor.byte_offset(editor.cursor));
            editor.text.replace_range(from..to, "");
            editor.cursor = start;
        });
    }

    fn delete_word_right(&mut self) {
        self.edit(RenameEdit::Other, |editor| {
            if editor.delete_selection() {
                return;
            }
            let end = editor.word_right_boundary();
            let (from, to) = (editor.byte_offset(editor.cursor), editor.byte_offset(end));
            editor.text.replace_range(from..to, "");
        });
    }

    fn move_cursor(&mut self, cursor: usize) {
        self.cursor = cursor.min(self.len());
        self.selection_anchor = None;
        self.last_edit = None;
    }

    fn word_left_boundary(&self) -> usize {
        let graphemes = self.text.graphemes(true).collect::<Vec<_>>();
        let mut cursor = self.cursor.min(graphemes.len());
        while cursor > 0 && graphemes[cursor - 1].chars().all(char::is_whitespace) {
            cursor -= 1;
        }
        while cursor > 0 && !graphemes[cursor - 1].chars().all(char::is_whitespace) {
            cursor -= 1;
        }
        cursor
    }

    fn word_right_boundary(&self) -> usize {
        let graphemes = self.text.graphemes(true).collect::<Vec<_>>();
        let mut cursor = self.cursor.min(graphemes.len());
        while cursor < graphemes.len() && !graphemes[cursor].chars().all(char::is_whitespace) {
            cursor += 1;
        }
        while cursor < graphemes.len() && graphemes[cursor].chars().all(char::is_whitespace) {
            cursor += 1;
        }
        cursor
    }

    fn move_word_left(&mut self) {
        self.move_cursor(self.word_left_boundary());
    }

    fn move_word_right(&mut self) {
        self.move_cursor(self.word_right_boundary());
    }

    fn select_all(&mut self) {
        self.selection_anchor = Some(0);
        self.cursor = self.len();
        self.last_edit = None;
    }
}

/// Handles the rename editor's control-key edits; returns `false` for keys it does not own.
/// Terminals report Ctrl+Backspace as Backspace with Ctrl, Ctrl+H, or Ctrl+W.
fn apply_rename_control_key(
    editor: &mut RenameEditor,
    code: KeyCode,
    modifiers: KeyModifiers,
) -> bool {
    if !modifiers.contains(KeyModifiers::CONTROL) {
        return false;
    }
    match code {
        KeyCode::Backspace | KeyCode::Char('h' | 'H' | 'w' | 'W') => editor.delete_word_left(),
        KeyCode::Delete => editor.delete_word_right(),
        KeyCode::Char('a' | 'A') => editor.select_all(),
        KeyCode::Char('z') if !modifiers.contains(KeyModifiers::SHIFT) => editor.undo(),
        KeyCode::Char('Z') | KeyCode::Char('z') | KeyCode::Char('y' | 'Y') => editor.redo(),
        _ => return false,
    }
    true
}

#[derive(Debug, Clone)]
struct TabDrag {
    tab_id: String,
    start_column: u16,
    started_at: Instant,
    shown: bool,
    drop_index: Option<usize>,
    expected_revision: u64,
}

fn drag_destination(
    column: u16,
    on_strip: bool,
    tabs: &[StripTab],
    frame: &strip::StripFrame,
    tab_id: &str,
) -> Option<usize> {
    if !on_strip || tabs.len() < 2 {
        return None;
    }
    let from = tabs.iter().position(|tab| tab.id == tab_id)?;
    let visible = frame
        .hits
        .iter()
        .filter_map(|(start, end, hit)| match hit {
            StripHit::View(id) => Some((*start, *end, id)),
            _ => None,
        })
        .collect::<Vec<_>>();
    let last = visible.last()?;
    let boundary = visible
        .iter()
        .find(|(start, end, _)| column <= start.saturating_add(*end).saturating_div(2))
        .and_then(|(_, _, id)| tabs.iter().position(|tab| &tab.id == *id))
        .unwrap_or_else(|| {
            tabs.iter()
                .position(|tab| &tab.id == last.2)
                .map_or(tabs.len(), |index| index + 1)
        });
    Some(
        if boundary > from {
            boundary - 1
        } else {
            boundary
        }
        .min(tabs.len().saturating_sub(1)),
    )
}

fn update_drag(
    drag: &mut TabDrag,
    column: u16,
    on_strip: bool,
    tabs: &[StripTab],
    frame: &strip::StripFrame,
) -> bool {
    let previous = (drag.shown, drag.drop_index);
    if !drag.shown
        && (column != drag.start_column || drag.started_at.elapsed() >= Duration::from_millis(250))
    {
        drag.shown = true;
    }
    drag.drop_index = drag
        .shown
        .then(|| drag_destination(column, on_strip, tabs, frame, &drag.tab_id))
        .flatten();
    previous != (drag.shown, drag.drop_index)
}

fn drag_marker_column(drag: &TabDrag, tabs: &[StripTab], frame: &strip::StripFrame) -> Option<u16> {
    let from = tabs.iter().position(|tab| tab.id == drag.tab_id)?;
    let to = drag.drop_index?;
    if !drag.shown || from == to {
        return None;
    }
    let target = tabs.get(to)?;
    frame.hits.iter().find_map(|(start, end, hit)| match hit {
        StripHit::View(id) if id == &target.id => Some(if to < from { *start } else { *end }),
        _ => None,
    })
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

/// The Settings shortcut toggles: on the viewed Settings tab it hides that tab, returning to the
/// previous tab; anywhere else it shows the singleton Settings tab.
fn settings_toggle_closes(viewed: Option<&str>) -> Option<&str> {
    viewed.filter(|id| id.starts_with("settings-"))
}

/// How long the client waits, with tabs present and no Settings tab, before starting a hidden one
/// so the Settings shortcut opens instantly.
const SETTINGS_PREWARM_DELAY: Duration = Duration::from_secs(2);

/// The tabs the strip, jumps, and drags present. A running Settings tab stays hidden until it is
/// viewed in this session, and after the Settings shortcut hides it, so its process can be reused
/// instantly instead of starting a new one.
fn shown_tabs(tabs: &[StripTab], viewed: Option<&str>, settings_shown: bool) -> Vec<StripTab> {
    tabs.iter()
        .filter(|tab| {
            !tab.id.starts_with("settings-") || settings_shown || viewed == Some(tab.id.as_str())
        })
        .cloned()
        .collect()
}

/// How long a tab must stay starting or restoring before its chip shows the lifecycle spinner.
const STARTING_GLYPH_DELAY: Duration = Duration::from_millis(500);

/// Hides a starting chip's spinner for its first moments. A tab that becomes ready quickly
/// otherwise shows a spinner that vanishes at once and shifts its title: a visible flash.
fn debounce_starting_glyphs(
    shown: &mut [StripTab],
    since: &mut HashMap<String, Instant>,
    now: Instant,
) {
    let starting = |tab: &StripTab| matches!(tab.status.as_str(), "starting" | "restoring");
    since.retain(|id, _| shown.iter().any(|tab| &tab.id == id && starting(tab)));
    for tab in shown.iter_mut().filter(|tab| starting(tab)) {
        let began = *since.entry(tab.id.clone()).or_insert(now);
        if now.saturating_duration_since(began) < STARTING_GLYPH_DELAY {
            tab.status = "idle".into();
        }
    }
}

/// How long a chip keeps its last glyph when its status momentarily reports none.
const GLYPH_SWAP_HOLD: Duration = Duration::from_millis(300);

/// Keeps a chip's previous glyph while its status briefly has none, such as the idle report
/// between a working spinner and the finished checkmark, so glyphs swap in place and the title
/// never shifts. Returns when the earliest active hold expires, so the strip repaints then.
fn hold_status_glyphs(
    shown: &mut [StripTab],
    held: &mut HashMap<String, (String, Instant)>,
    now: Instant,
) -> Option<Instant> {
    held.retain(|id, _| shown.iter().any(|tab| &tab.id == id));
    let mut expires: Option<Instant> = None;
    for tab in shown.iter_mut() {
        if strip::status_has_glyph(&tab.status) {
            held.insert(tab.id.clone(), (tab.status.clone(), now));
            continue;
        }
        let Some((status, seen)) = held.get(&tab.id).cloned() else {
            continue;
        };
        let until = seen + GLYPH_SWAP_HOLD;
        if now < until {
            tab.status = status;
            expires = Some(expires.map_or(until, |earliest| earliest.min(until)));
        } else {
            held.remove(&tab.id);
        }
    }
    expires
}

/// Maps an insertion index among shown tabs to the registry index the server reorders by.
fn registry_index(shown: &[StripTab], tabs: &[StripTab], shown_index: usize) -> usize {
    shown
        .get(shown_index)
        .and_then(|target| tabs.iter().position(|tab| tab.id == target.id))
        .unwrap_or_else(|| {
            shown
                .last()
                .and_then(|last| tabs.iter().position(|tab| tab.id == last.id))
                .map_or(tabs.len(), |index| index + 1)
        })
}

/// Decides whether buttonless pointer motion over the body reaches the child. Motion is never
/// deferred behind a pending view, where it would exhaust the budget that typed input needs,
/// and is dropped when the child's reported modes show it does not track the mouse.
fn forward_pointer_motion(view_pending: bool, modes: Option<&TerminalModes>) -> bool {
    !view_pending && modes.is_none_or(|modes| modes.mouse_tracking)
}

/// A holder's first surface carries a provisional `idle` before the tab bridge reports; it must
/// not flip a starting chip to idle and back. Bridge status and registry snapshots still apply.
fn holder_idle_precedes_bridge(chip: &str, surface: &str) -> bool {
    surface == "idle" && matches!(chip, "starting" | "restoring")
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum DeferredInputTarget {
    Tab(String),
    NextCreated,
}

#[derive(Debug, Default)]
struct DeferredInput {
    frames: VecDeque<(DeferredInputTarget, Vec<u8>)>,
    bytes: usize,
}

impl DeferredInput {
    fn push(
        &mut self,
        target: DeferredInputTarget,
        frames: Vec<Vec<u8>>,
    ) -> Result<(), &'static str> {
        let added_bytes = frames
            .iter()
            .try_fold(0usize, |total, frame| total.checked_add(frame.len()))
            .ok_or("deferred input byte limit reached")?;
        let next_bytes = self
            .bytes
            .checked_add(added_bytes)
            .filter(|bytes| *bytes <= DEFERRED_INPUT_BYTES)
            .ok_or("deferred input byte limit reached")?;
        if self.frames.len().saturating_add(frames.len()) > DEFERRED_INPUT_FRAMES {
            return Err("deferred input frame limit reached");
        }
        self.bytes = next_bytes;
        self.frames
            .extend(frames.into_iter().map(|frame| (target.clone(), frame)));
        Ok(())
    }

    fn retarget_created(&mut self, target: &str) {
        for (frame_target, _) in &mut self.frames {
            if *frame_target == DeferredInputTarget::NextCreated {
                *frame_target = DeferredInputTarget::Tab(target.to_owned());
            }
        }
    }

    fn resolve(&mut self, target: &str) -> (Vec<Vec<u8>>, bool) {
        let selected_target = DeferredInputTarget::Tab(target.to_owned());
        let mut selected = Vec::new();
        let mut dropped = false;
        while let Some((frame_target, frame)) = self.frames.pop_front() {
            if frame_target == selected_target {
                selected.push(frame);
            } else {
                dropped = true;
            }
        }
        self.bytes = 0;
        (selected, dropped)
    }

    fn discard_tab(&mut self, target: &str) -> bool {
        self.discard(&DeferredInputTarget::Tab(target.to_owned()))
    }

    fn discard_created(&mut self) -> bool {
        self.discard(&DeferredInputTarget::NextCreated)
    }

    fn discard(&mut self, target: &DeferredInputTarget) -> bool {
        let before = self.frames.len();
        self.frames
            .retain(|(frame_target, _)| frame_target != target);
        self.bytes = self.frames.iter().map(|(_, frame)| frame.len()).sum();
        self.frames.len() != before
    }
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

pub fn run_attach(options: AttachOptions<'_>) -> Result<(), String> {
    crate::fault_injection::validate_environment()?;
    let watchdog = crate::shell::watchdog::start(
        "attach",
        &options.runtime_dir.join("tabs").join("crashes"),
        Duration::from_secs(15),
        vec!["attach-main".into(), "attach-reader".into()],
    );
    crate::fault_injection::freeze_role("attach");
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
    let mut channel = InputChannel::new(protocol::negotiated(
        &welcome.features,
        protocol::FEATURE_SEMANTIC_INPUT,
    ));
    let apply_effects = protocol::negotiated(&welcome.features, protocol::FEATURE_TERMINAL_EFFECTS);
    let mut request_generation = 1u64;
    let attachment = wire::read_payload(&mut stream)?
        .ok_or_else(|| "server closed before attach admission".to_owned())?;
    match wire::kind(&attachment)?.message_type.as_str() {
        "attached" => {
            let _: (Option<u64>, BridgeAttachment) = wire::body(&attachment)?;
        }
        "refused" => return Err("a1 is attached in another terminal".to_owned()),
        message => return Err(format!("unexpected attach admission message: {message}")),
    }
    let (mut columns, mut outer_rows) = outer_size()?;
    let mut geometry_generation = 0u64;
    let rows = tab_rows(outer_rows).map_err(str::to_owned)?;
    let environment = std::env::vars().collect::<Vec<_>>();
    let mut create = TabCreate {
        cwd: options.cwd.into(),
        columns,
        rows,
        release_root: options.release_root.into(),
        node_executable: options.node_executable.into(),
        environment: environment.clone(),
    };
    wire::send(
        &mut stream,
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
            environment,
            session_file: options.session_file.map(str::to_owned),
            session_dir: options.session_dir.map(str::to_owned),
        },
    )?;
    if let Some(tab_id) = options.view_tab {
        request_generation = request_generation.saturating_add(1);
        wire::send(
            &mut stream,
            "tab.view",
            None,
            ViewTarget {
                tab_id: tab_id.into(),
                request_generation,
            },
        )?;
    }
    wire::send(
        &mut stream,
        "tab.list",
        None,
        wire::ResultBody {
            accepted: true,
            message: None,
        },
    )?;

    let mut reader = stream
        .try_clone()
        .map_err(|error| format!("clone attach stream: {error}"))?;
    let mut stream = AttachServerWriter::start(stream);
    let (message_tx, message_rx) = mpsc::sync_channel::<ServerIngress>(ATTACH_INGRESS_FRAMES);
    let ingress_bytes = Arc::new(AtomicUsize::new(0));
    // Performance: server frames and outer input both wake the loop directly, so neither waits
    // out the other side's idle poll; capacity one keeps wakes coalesced.
    let (wake_tx, wake_rx) = mpsc::sync_channel::<()>(1);
    let reader_wake = wake_tx.clone();
    let reader_ingress_bytes = ingress_bytes.clone();
    thread::spawn(move || {
        loop {
            let payload = match wire::read_payload(&mut reader) {
                Ok(Some(payload)) => payload,
                Ok(None) => {
                    let _ = message_tx.send(ServerIngress::Failed(
                        "resident server connection closed".into(),
                    ));
                    let _ = reader_wake.try_send(());
                    return;
                }
                Err(error) => {
                    let _ = message_tx.send(ServerIngress::Failed(error));
                    let _ = reader_wake.try_send(());
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
                let _ = reader_wake.try_send(());
                return;
            }
            let len = payload.len();
            if message_tx.send(ServerIngress::Frame(payload)).is_err() {
                reader_ingress_bytes.fetch_sub(len, Ordering::SeqCst);
                return;
            }
            let _ = reader_wake.try_send(());
        }
    });

    let mut terminal = OuterTerminal::enter()?;
    let key_trace_path = std::env::var_os("A1_ATTACH_KEY_TRACE").map(PathBuf::from);
    let (input_tx, input_rx) = mpsc::sync_channel::<Result<Event, String>>(1024);
    thread::spawn(move || {
        loop {
            let event = event::read().map_err(|error| format!("read outer terminal: {error}"));
            let failed = event.is_err();
            if input_tx.send(event).is_err() {
                return;
            }
            let _ = wake_tx.try_send(());
            if failed {
                return;
            }
        }
    });
    let mut tabs = Vec::<StripTab>::new();
    let mut view = ViewModel::new(options.view_tab.map(str::to_owned));
    view.expect_request_generation(request_generation);
    let mut hovered: Option<StripHover> = None;
    let mut time_format = TimeFormatWatch::new(options.settings_file);
    let mut strip_frame = strip::render_configured(
        &tabs,
        view.viewed.as_deref(),
        columns,
        hovered.as_ref(),
        time_format.value,
    );
    let mut latest_surface = Vec::<u8>::new();
    let mut latest_structured = None;
    let mut latest_incarnation = 0u64;
    let mut latest_revision = 0u64;
    let mut latest_geometry_generation = 0u64;
    let mut pending_terminal_effects = VecDeque::<TerminalEffect>::new();
    let mut applied_terminal_effects = HashMap::<(String, u64), u64>::new();
    terminal.present(DesiredPresentation {
        tab_id: view.viewed.clone(),
        incarnation: latest_incarnation,
        revision: latest_revision,
        geometry_generation: latest_geometry_generation,
        strip: strip_frame.bytes.clone(),
        structured: None,
        legacy_body: latest_surface.clone(),
        overlay: None,
        // Invariant: the launch frame hides the cursor until the first child surface places it.
        cursor: Some(FinalCursor::Hidden),
        modes: None,
        columns,
        outer_rows,
        clear: true,
    })?;
    let started = Instant::now();
    let mut last_strip_frame = Instant::now();
    let mut displayed_clock_minute = clock_minute();
    let mut last_list = Instant::now();
    let mut chord = DoubleCtrlC::new(options.clear_exit_ms);
    // Invariant: failure input rules belong to one tab and apply only while it is viewed.
    let mut failed_tab: Option<String> = None;
    let mut rename: Option<RenameEditor> = None;
    let mut pending_manual_name: Option<(String, String)> = None;
    let mut popup: Option<PopupMenu> = None;
    let mut close_fallback: Option<CloseFallback> = None;
    let mut transient_notice: Option<String> = None;
    let mut user_input_pending = false;
    let mut pressed_chars = std::collections::HashSet::<char>::new();
    let mut prompt_view = view.viewed.clone();
    let mut registry_revision = 0u64;
    let mut drag: Option<TabDrag> = None;
    let mut latest_modes: Option<TerminalModes> = None;
    // Invariant: no cursor shows until a committed child surface places one.
    let mut latest_cursor: Option<FinalCursor> = Some(FinalCursor::Hidden);
    let mut bindings = TabBindings::load(options.profile);
    // Concurrency: a shortcut can arrive after the server created a tab but before its registry
    // snapshot reaches this client; retain the requested ordinal until that snapshot arrives.
    let mut pending_jump = None::<(usize, u64)>;
    let mut pending_created_activation = false;
    // Invariant: a Settings tab joins the strip only once viewed in this session; the Settings
    // shortcut hides it again while its process keeps running for an instant reopen.
    let mut settings_shown = false;
    let mut settings_prewarm_pending = false;
    let mut settings_absent_since: Option<Instant> = None;
    let mut starting_since = HashMap::<String, Instant>::new();
    let mut held_glyphs = HashMap::<String, (String, Instant)>::new();
    let mut glyph_hold_expires: Option<Instant> = None;
    let mut deferred_input = DeferredInput::default();
    macro_rules! send_child_frames {
        ($frames:expr) => {{
            let frames: Vec<Vec<u8>> = $frames;
            let deferred = if let Some(target) = view.requested.as_deref() {
                Some(DeferredInputTarget::Tab(target.to_owned()))
            } else if pending_created_activation {
                Some(DeferredInputTarget::NextCreated)
            } else {
                None
            };
            if let Some(target) = deferred {
                // Invariant: an over-budget frame is refused whole, before any prefix reaches a
                // child, and without a notice row over the pending tab.
                if deferred_input.push(target, frames).is_err() {
                    user_input_pending = false;
                }
            } else {
                for frame in frames {
                    stream
                        .write_all(&frame)
                        .map_err(|error| format!("queue resident frame: {error}"))?;
                }
            }
        }};
    }
    macro_rules! send_input {
        ($event:expr, $legacy:expr) => {{
            let frame = match channel.outgoing($event, $legacy) {
                Some(Outgoing::Semantic(input)) => Some(wire::frame("input.event", None, input)?),
                Some(Outgoing::Legacy(input)) => Some(wire::frame("input", None, input)?),
                None => None,
            };
            if let Some(frame) = frame {
                send_child_frames!(vec![frame]);
            }
        }};
    }
    macro_rules! request_view {
        ($tab_id:expr) => {{
            let tab_id: String = $tab_id;
            request_generation = request_generation.saturating_add(1);
            view.request(&tab_id);
            view.expect_request_generation(request_generation);
            wire::send(
                &mut stream,
                "tab.view",
                None,
                ViewTarget {
                    tab_id,
                    request_generation,
                },
            )?;
        }};
    }
    macro_rules! shown {
        () => {
            shown_tabs(&tabs, view.viewed.as_deref(), settings_shown)
        };
    }
    macro_rules! paint_current {
        ($clear:expr) => {{
            let rename_display = rename.as_ref().map(RenameEditor::display);
            let mut shown = shown!();
            debounce_starting_glyphs(&mut shown, &mut starting_since, Instant::now());
            glyph_hold_expires = hold_status_glyphs(&mut shown, &mut held_glyphs, Instant::now());
            strip_frame = strip::render_interactive(
                &shown,
                view.viewed.as_deref(),
                columns,
                hovered.as_ref(),
                time_format.value,
                rename_display.as_ref(),
            );
            if hovered
                .as_ref()
                .is_some_and(|target| !strip_hover_present(&strip_frame, target))
            {
                hovered = None;
                strip_frame = strip::render_interactive(
                    &shown,
                    view.viewed.as_deref(),
                    columns,
                    None,
                    time_format.value,
                    rename_display.as_ref(),
                );
            }
            let status_notice = view
                .viewed
                .as_ref()
                .and_then(|id| tabs.iter().find(|tab| &tab.id == id))
                .and_then(|tab| {
                    if matches!(tab.status.as_str(), "stalled" | "unresponsive") {
                        Some("Agent stalled · R restart · Alt+W close".to_owned())
                    } else if tab.status == "failed" {
                        Some("Tab failed · R retry · F start fresh · Alt+W close".to_owned())
                    } else {
                        None
                    }
                });
            let overlay = if let Some(menu) = popup.as_ref() {
                Some(menu.render_styled(!palette_fallback_requested(), time_format.accent_hover))
            } else if let Some(column) = drag
                .as_ref()
                .and_then(|drag| drag_marker_column(drag, &shown, &strip_frame))
            {
                Some(render_drag_marker(column, columns))
            } else if let Some(notice) = transient_notice.as_deref().or(status_notice.as_deref()) {
                Some(render_notice(notice, columns))
            } else {
                None
            };
            terminal.present(DesiredPresentation {
                tab_id: view.viewed.clone(),
                incarnation: latest_incarnation,
                revision: latest_revision,
                geometry_generation: latest_geometry_generation,
                strip: strip_frame.bytes.clone(),
                structured: latest_structured.clone(),
                legacy_body: latest_surface.clone(),
                overlay,
                cursor: latest_cursor,
                modes: latest_modes.clone(),
                columns,
                outer_rows,
                clear: $clear,
            })?;
        }};
    }
    // Invariant: the composer compares the complete desired state, so strip-only damage is inferred without
    // omitting the retained body from a replaceable queued update.
    macro_rules! paint_strip {
        () => {{
            paint_current!(false);
        }};
    }
    macro_rules! invoke_popup_action {
        ($action:expr, $menu:expr) => {{
            match $action {
                PopupAction::Rename => {
                    if let Some(tab_id) = $menu.tab_id.clone() {
                        let name = tabs
                            .iter()
                            .find(|tab| tab.id == tab_id)
                            .map(|tab| tab.name.clone())
                            .unwrap_or_default();
                        rename = Some(RenameEditor::new(tab_id, name));
                    }
                }
                PopupAction::Close => {
                    if let Some(tab_id) = $menu.tab_id.clone() {
                        close_fallback =
                            close_fallback_for(&shown!(), view.viewed.as_deref(), &tab_id);
                        wire::send(&mut stream, "tab.close", None, TabTarget { tab_id })?;
                    }
                }
                PopupAction::NewAgent => {
                    pending_created_activation = true;
                    wire::send(&mut stream, "tab.create", None, create.clone())?;
                }
                PopupAction::Settings => {
                    settings_prewarm_pending = false;
                    // Invariant: a running hidden Settings tab is reused instantly.
                    if let Some(tab_id) = tabs
                        .iter()
                        .find(|tab| tab.id.starts_with("settings-"))
                        .map(|tab| tab.id.clone())
                    {
                        request_view!(tab_id);
                    } else {
                        pending_created_activation = true;
                        wire::send(&mut stream, "tab.open-settings", None, create.clone())?;
                    }
                }
                PopupAction::View(tab_id) => {
                    request_view!(tab_id);
                }
            }
        }};
    }
    macro_rules! apply_terminal_effect {
        ($effect:expr) => {{
            let effect: &TerminalEffect = $effect;
            if admit_terminal_effect(&mut applied_terminal_effects, effect) {
                match &effect.effect {
                    EffectKind::ClipboardWrite { location, data, .. } => {
                        terminal.write(&outer_input::osc52(*location, data))?;
                    }
                }
            }
        }};
    }
    // Invariant: a commit the view model approved installs its staged topology, the complete
    // child surface, the child's modes, and the final cursor together in one frame.
    macro_rules! apply_commit {
        ($surface:expr, $tabs:expr, $requested:expr) => {{
            let surface: Surface = $surface;
            let staged: Option<Vec<StripTab>> = $tabs;
            if let Some(next) = staged {
                tabs = next;
            }
            if $requested {
                if surface.tab_id.starts_with("settings-") {
                    settings_shown = true;
                }
                close_fallback = None;
                transient_notice = None;
                if prompt_view != view.viewed {
                    rename = None;
                    popup = None;
                    prompt_view = view.viewed.clone();
                }
                // Protocol: input typed after a view request remains bound to that target and is
                // released only after its coherent surface commits and its holder is routable.
                let (frames, mut dropped) = deferred_input.resolve(&surface.tab_id);
                if surface.status == "failed" {
                    dropped |= !frames.is_empty();
                } else {
                    for frame in frames {
                        stream
                            .write_all(&frame)
                            .map_err(|error| format!("queue deferred resident input: {error}"))?;
                    }
                }
                if dropped {
                    user_input_pending = false;
                }
            }
            if surface.status == "failed" {
                failed_tab = Some(surface.tab_id.clone());
            } else if failed_tab.as_deref() == Some(surface.tab_id.as_str()) {
                failed_tab = None;
            }
            if let Some(tab) = tabs.iter_mut().find(|tab| tab.id == surface.tab_id) {
                if !holder_idle_precedes_bridge(&tab.status, &surface.status) {
                    tab.status = surface.status.clone();
                }
                tab.accent = surface.accent.clone();
            }
            latest_surface = without_bell(&surface.bytes);
            latest_structured = surface.structured.clone();
            latest_incarnation = surface.incarnation;
            latest_revision = surface.revision;
            latest_geometry_generation = surface
                .structured
                .as_ref()
                .map_or(latest_geometry_generation, |structured| {
                    structured.geometry_generation
                });
            latest_modes = surface.modes.clone();
            latest_cursor = surface
                .cursor
                .map(FinalCursor::At)
                .or_else(|| surface.modes.as_ref().map(|_| FinalCursor::Hidden));
            let mut deferred = VecDeque::new();
            while let Some(effect) = pending_terminal_effects.pop_front() {
                if effect.tab_id != surface.tab_id || effect.incarnation != surface.incarnation {
                    continue;
                }
                if effect.revision <= surface.revision {
                    apply_terminal_effect!(&effect);
                } else {
                    deferred.push_back(effect);
                }
            }
            pending_terminal_effects = deferred;
            paint_current!(false);
        }};
    }
    loop {
        watchdog.bump();
        if let Some(error) = stream.failure() {
            return Err(error);
        }
        let server_round_started = Instant::now();
        let mut server_round_bytes = 0usize;
        for _ in 0..8 {
            let Ok(message) = message_rx.try_recv() else {
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
            server_round_bytes = server_round_bytes.saturating_add(payload.len());
            let kind = wire::kind(&payload)?;
            match kind.message_type.as_str() {
                "surface" => {
                    let (_, surface): (_, Surface) = wire::body(&payload)?;
                    if let Some(structured) = surface.structured.as_ref()
                        && (structured.validate().is_err()
                            || (view.viewed.as_deref() == Some(surface.tab_id.as_str())
                                && surface.incarnation == latest_incarnation
                                && structured.geometry_generation < latest_geometry_generation))
                    {
                        continue;
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
                    let listed = tabs.iter().any(|tab| tab.id == surface.tab_id);
                    if let Offer::Commit {
                        surface,
                        tabs: next,
                        requested,
                    } = view.offer(surface, Instant::now(), listed)
                    {
                        apply_commit!(surface, next, requested);
                    }
                }
                // Protocol: the owned child projects the effective A1 declarations plus the
                // user's customization and publishes one assignment per tab action; attach
                // dispatches and labels exactly that projection.
                "tabs.shortcuts" => {
                    let (_, shortcuts): (_, protocol::TabShortcuts) = wire::body(&payload)?;
                    if protocol::validate_shortcuts(&shortcuts).is_ok() {
                        bindings = TabBindings::from_assignments(&shortcuts.assignments);
                        if popup.is_some() {
                            paint_current!(false);
                        }
                    }
                }
                "terminal.effect" => {
                    let (_, effect): (_, TerminalEffect) = wire::body(&payload)?;
                    // Concurrency: the control lane may overtake a replaceable surface slot. Defer the effect
                    // until its coherent revision is committed, then deduplicate by incarnation
                    // and sequence; reconstruction and stale re-offers can never replay it.
                    if apply_effects
                        && view.viewed.as_deref() == Some(effect.tab_id.as_str())
                        && protocol::validate_effect(&effect.effect).is_ok()
                    {
                        if effect.incarnation == latest_incarnation
                            && effect.revision <= latest_revision
                        {
                            apply_terminal_effect!(&effect);
                        } else if pending_terminal_effects.len() < 256 {
                            pending_terminal_effects.push_back(effect);
                        }
                    }
                }
                "tab.status" => {
                    let (_, status): (_, TabStatus) = wire::body(&payload)?;
                    if let Some(tab) = tabs.iter_mut().find(|tab| tab.id == status.tab_id) {
                        tab.status = status.status.clone();
                        tab.accent = status.accent.clone();
                    }
                    if let Some(staged) = view.staged_tabs_mut()
                        && let Some(tab) = staged.iter_mut().find(|tab| tab.id == status.tab_id)
                    {
                        tab.status = status.status.clone();
                        tab.accent = status.accent.clone();
                    }
                    if status.status != "failed"
                        && failed_tab.as_deref() == Some(status.tab_id.as_str())
                    {
                        failed_tab = None;
                    }
                    paint_current!(false);
                }
                "tab.list" => {
                    let (_, list): (_, TabList) = wire::body(&payload)?;
                    let list_revision = list.revision;
                    registry_revision = list_revision;
                    let previous_tabs = view.staged_tabs().unwrap_or(&tabs);
                    let pending_name_confirmed =
                        pending_manual_name.as_ref().is_some_and(|(id, name)| {
                            list.tabs.iter().any(|tab| {
                                &tab.tab_id == id && &tab.name == name && tab.name_source == "user"
                            })
                        });
                    let next_tabs = list
                        .tabs
                        .into_iter()
                        .filter(|tab| tab.lifecycle != "stopped")
                        .map(|tab| {
                            let previous = previous_tabs
                                .iter()
                                .find(|current| current.id == tab.tab_id);
                            let (name, name_source) = pending_manual_name
                                .as_ref()
                                .filter(|(id, _)| id == &tab.tab_id)
                                .map_or((tab.name, tab.name_source), |(_, name)| {
                                    (name.clone(), "user".into())
                                });
                            let title_animation = strip::reconcile_title_animation(
                                previous,
                                &name,
                                &name_source,
                                Instant::now(),
                            );
                            StripTab {
                                id: tab.tab_id,
                                name,
                                name_source,
                                status: previous
                                    .map_or(tab.lifecycle, |current| current.status.clone()),
                                accent: previous.and_then(|current| current.accent.clone()),
                                title_animation,
                            }
                        })
                        .collect::<Vec<_>>();
                    // Invariant: a hidden Settings tab never surfaces by itself. When it is all
                    // that remains, it closes with the last visible tab instead of taking the view.
                    let settings_visible = settings_shown
                        || view
                            .viewed
                            .as_deref()
                            .is_some_and(|id| id.starts_with("settings-"));
                    let mut next_tabs = next_tabs;
                    if !settings_visible
                        && !next_tabs.is_empty()
                        && next_tabs.iter().all(|tab| tab.id.starts_with("settings-"))
                    {
                        for tab in next_tabs.drain(..) {
                            wire::send(
                                &mut stream,
                                "tab.close",
                                None,
                                TabTarget { tab_id: tab.id },
                            )?;
                        }
                    }
                    if pending_name_confirmed {
                        pending_manual_name = None;
                    }
                    if let Some((index, requested_revision)) = pending_jump {
                        if let Some(tab_id) = next_tabs.get(index).map(|tab| tab.id.clone()) {
                            pending_jump = None;
                            request_view!(tab_id);
                        } else if list_revision > requested_revision {
                            // Protocol: a newer authoritative registry still lacking the ordinal
                            // proves this was not an in-flight tab creation.
                            pending_jump = None;
                        }
                    }
                    let outcome = view.topology(&tabs, next_tabs, |candidates| {
                        close_fallback
                            .as_ref()
                            .and_then(|fallback| fallback.resolve(candidates))
                            .or_else(|| {
                                candidates
                                    .iter()
                                    .find(|tab| {
                                        settings_visible || !tab.id.starts_with("settings-")
                                    })
                                    .map(|tab| tab.id.clone())
                            })
                    });
                    if outcome
                        .dropped_request
                        .as_deref()
                        .is_some_and(|target| deferred_input.discard_tab(target))
                    {
                        user_input_pending = false;
                    }
                    if let Some(tab_id) = outcome.view_request {
                        request_view!(tab_id);
                    }
                    match outcome.action {
                        TopologyAction::Commit {
                            surface,
                            tabs: next,
                        } => {
                            apply_commit!(surface, Some(next), true);
                        }
                        TopologyAction::Staged => {}
                        TopologyAction::Install {
                            tabs: next,
                            changed,
                        } => {
                            tabs = next;
                            let listed = |id: &String| tabs.iter().any(|tab| &tab.id == id);
                            if popup
                                .as_ref()
                                .and_then(|menu| menu.tab_id.as_ref())
                                .is_some_and(|id| !listed(id))
                            {
                                popup = None;
                            }
                            if rename
                                .as_ref()
                                .is_some_and(|editor| !listed(&editor.tab_id))
                            {
                                rename = None;
                            }
                            if pending_manual_name
                                .as_ref()
                                .is_some_and(|(id, _)| !listed(id))
                            {
                                pending_manual_name = None;
                            }
                            if !failed_tab.as_ref().is_none_or(listed) {
                                failed_tab = None;
                            }
                            if changed
                                && popup
                                    .as_ref()
                                    .is_some_and(|menu| menu.kind == PopupKind::Overflow)
                            {
                                popup = None;
                            }
                            if tabs.is_empty() {
                                view.clear();
                                latest_surface.clear();
                                latest_structured = None;
                                latest_incarnation = 0;
                                latest_revision = 0;
                                latest_geometry_generation = 0;
                                pending_terminal_effects.clear();
                                latest_modes = None;
                                latest_cursor = Some(FinalCursor::Hidden);
                                close_fallback = None;
                                paint_current!(true);
                            } else if changed {
                                paint_current!(false);
                            }
                        }
                    }
                }
                "tab.created" | "tab.selected" => {
                    let (_, target): (_, TabTarget) = wire::body(&payload)?;
                    if settings_prewarm_pending && target.tab_id.starts_with("settings-") {
                        // Invariant: a prewarmed Settings tab starts hidden and never takes the
                        // view or a pending Agent creation's input.
                        settings_prewarm_pending = false;
                        wire::send(
                            &mut stream,
                            "tab.list",
                            None,
                            wire::ResultBody {
                                accepted: true,
                                message: None,
                            },
                        )?;
                        continue;
                    }
                    pending_created_activation = false;
                    deferred_input.retarget_created(&target.tab_id);
                    let created = kind.message_type == "tab.created";
                    let tab_id = target.tab_id.clone();
                    request_view!(target.tab_id);
                    if created {
                        view.await_first_draw(&tab_id);
                    }
                    wire::send(
                        &mut stream,
                        "tab.list",
                        None,
                        wire::ResultBody {
                            accepted: true,
                            message: None,
                        },
                    )?;
                }
                "tab.create-failed" | "tab.create-refused" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    if let Some(target) = view.requested.as_deref() {
                        deferred_input.discard_tab(target);
                    }
                    deferred_input.discard_created();
                    pending_created_activation = false;
                    view.cancel_request();
                    user_input_pending = false;
                    transient_notice = Some(tab_create_failure_notice(result.message.as_deref()));
                    paint_current!(false);
                }
                "tab.renamed" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    if result.accepted {
                        wire::send(
                            &mut stream,
                            "tab.list",
                            None,
                            wire::ResultBody {
                                accepted: true,
                                message: None,
                            },
                        )?;
                    } else {
                        pending_manual_name = None;
                        transient_notice = result.message;
                        paint_current!(false);
                    }
                }
                "tab.rename-refused" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    pending_manual_name = None;
                    transient_notice = result.message;
                    wire::send(
                        &mut stream,
                        "tab.list",
                        None,
                        wire::ResultBody {
                            accepted: true,
                            message: None,
                        },
                    )?;
                    paint_current!(false);
                }
                "tab.reordered" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    if !result.accepted {
                        transient_notice = result.message;
                        paint_current!(false);
                    }
                    wire::send(
                        &mut stream,
                        "tab.list",
                        None,
                        wire::ResultBody {
                            accepted: true,
                            message: None,
                        },
                    )?;
                }
                "tab.restarted" | "tab.route-opened" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    if !result.accepted {
                        transient_notice = result.message;
                        paint_current!(false);
                    }
                }
                "tab.closed" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    if !result.accepted {
                        transient_notice = result.message;
                        close_fallback = None;
                        paint_current!(false);
                    }
                    wire::send(
                        &mut stream,
                        "tab.list",
                        None,
                        wire::ResultBody {
                            accepted: true,
                            message: None,
                        },
                    )?;
                }
                "detach" => {
                    wire::send(
                        &mut stream,
                        "detach",
                        None,
                        wire::ResultBody {
                            accepted: true,
                            message: None,
                        },
                    )?;
                    terminal.restore()?;
                    print_hint(running_agent_count(&tabs));
                    return Ok(());
                }
                "refused" => {
                    terminal.restore()?;
                    return Err("a1 is attached in another terminal".to_owned());
                }
                "holder.exit" => {
                    if let Some(tab) = view
                        .viewed
                        .as_ref()
                        .and_then(|id| tabs.iter_mut().find(|tab| &tab.id == id))
                    {
                        tab.status = "crashed".into();
                    }
                    paint_current!(false);
                }
                "failure.status" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    failed_tab = view.viewed.clone();
                    transient_notice = Some(result.message.unwrap_or_else(|| "tab failed".into()));
                    paint_current!(false);
                }
                "viewer.status" | "input.rejected" | "input.uncertain" | "recovery.notice" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    if kind.message_type == "input.rejected"
                        && result.message.as_deref()
                            == Some(crate::roles::server::INPUT_REJECTED_LEGACY_HOLDER)
                    {
                        if let Some(replay) = channel.fall_back() {
                            wire::send(&mut stream, "input", None, replay)?;
                        }
                        continue;
                    }
                    if kind.message_type == "input.rejected"
                        && result.message.as_deref()
                            == Some(crate::roles::server::INPUT_REJECTED_READ_ONLY)
                    {
                        // Invariant: controller handoff stays invisible; this terminal re-claims
                        // its viewed tab instead of painting a delivery notice over the child.
                        user_input_pending = false;
                        wire::send(
                            &mut stream,
                            "tab.claimInput",
                            None,
                            wire::ResultBody {
                                accepted: true,
                                message: None,
                            },
                        )?;
                        continue;
                    }
                    let message = if kind.message_type == "input.rejected" {
                        rejection_notice(&mut user_input_pending, result.message)
                    } else {
                        result.message
                    };
                    if message.is_some() {
                        transient_notice = message;
                        paint_current!(false);
                    }
                }
                "error" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    return Err(result
                        .message
                        .unwrap_or_else(|| "resident tab failed to start".to_owned()));
                }
                "attached" => {
                    let _: (Option<u64>, BridgeAttachment) = wire::body(&payload)?;
                }
                _ => {}
            }
            if server_round_bytes >= 64 * 1024
                || server_round_started.elapsed() >= Duration::from_millis(2)
            {
                break;
            }
        }
        if let Some(Offer::Commit {
            surface,
            tabs: next,
            requested,
        }) = view.expire(Instant::now(), |id| tabs.iter().any(|tab| tab.id == id))
        {
            apply_commit!(surface, next, requested);
        }
        if strip::animations_active(&tabs)
            && last_strip_frame.elapsed() >= strip::animation_interval(&tabs)
        {
            paint_strip!();
            last_strip_frame = Instant::now();
        }
        if time_format.refresh() {
            paint_strip!();
        }
        // Invariant: A held glyph that no status replaced is released once its hold ends.
        if glyph_hold_expires.is_some_and(|until| Instant::now() >= until) {
            paint_strip!();
        }
        let current_clock_minute = clock_minute();
        if current_clock_minute != displayed_clock_minute {
            displayed_clock_minute = current_clock_minute;
            paint_strip!();
        }
        // Rationale: Settings opens in its own process; starting it hidden ahead of time makes the
        // Settings shortcut as immediate as solo's in-process Settings screen.
        let settings_exists = tabs.iter().any(|tab| tab.id.starts_with("settings-"));
        if settings_exists || tabs.is_empty() {
            settings_absent_since = None;
            if !settings_exists {
                settings_shown = false;
            }
        } else if !settings_prewarm_pending
            && !pending_created_activation
            && view.requested.is_none()
            && view.viewed.is_some()
        {
            let since = *settings_absent_since.get_or_insert_with(Instant::now);
            if since.elapsed() >= SETTINGS_PREWARM_DELAY {
                settings_absent_since = None;
                settings_shown = false;
                settings_prewarm_pending = true;
                wire::send(&mut stream, "tab.open-settings", None, create.clone())?;
            }
        }
        if last_list.elapsed() >= Duration::from_millis(500) {
            wire::send(
                &mut stream,
                "tab.list",
                None,
                wire::ResultBody {
                    accepted: true,
                    message: None,
                },
            )?;
            last_list = Instant::now();
        }
        if let Some(current_drag) = drag.as_mut()
            && !current_drag.shown
            && current_drag.started_at.elapsed() >= Duration::from_millis(250)
        {
            let column = current_drag.start_column;
            if update_drag(current_drag, column, true, &shown!(), &strip_frame) {
                paint_current!(false);
            }
        }
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
        let next = admit_alt_code_input(cfg!(windows), &mut pressed_chars, next);
        if let Event::Mouse(mouse) = &next
            && key_trace_path.is_some()
            && !matches!(mouse.kind, MouseEventKind::Moved)
        {
            key_trace(
                key_trace_path.as_deref(),
                &format!(
                    "{} {} mouse kind={:?} row={} column={} mods={:?} viewed={:?}",
                    started.elapsed().as_millis(),
                    SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map_or(0, |elapsed| elapsed.as_micros()),
                    mouse.kind,
                    mouse.row,
                    mouse.column,
                    mouse.modifiers,
                    view.viewed
                ),
            );
        }
        if let Event::Key(key) = &next
            && key_trace_path.is_some()
        {
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
            key_trace(
                key_trace_path.as_deref(),
                &format!(
                    "{} {} key kind={:?} code={code} mods={:?} state={:?}",
                    started.elapsed().as_millis(),
                    SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map_or(0, |elapsed| elapsed.as_micros()),
                    key.kind,
                    key.modifiers,
                    key.state
                ),
            );
        }
        // Invariant: a prompt belongs to the view it was opened in; a strip click, shortcut, or
        // tab removal that changes the view.viewed tab cancels it instead of letting it swallow the
        // new tab's keys.
        if prompt_view != view.viewed {
            rename = None;
            popup = None;
            prompt_view = view.viewed.clone();
        }
        let failed = failure_applies(failed_tab.as_deref(), view.viewed.as_deref());
        match next {
            Event::Key(key) if matches!(key.kind, KeyEventKind::Press | KeyEventKind::Repeat) => {
                transient_notice = None;
                if rename.is_some() {
                    let mut submit: Option<(String, String)> = None;
                    let mut consume = true;
                    let mut cancel = false;
                    {
                        let editor = rename.as_mut().expect("checked rename editor");
                        match key.code {
                            KeyCode::Esc => cancel = true,
                            KeyCode::Enter => {
                                let name = editor.text.trim().to_owned();
                                if name.is_empty() {
                                    cancel = true;
                                } else {
                                    submit = Some((editor.tab_id.clone(), name));
                                }
                            }
                            _ if apply_rename_control_key(editor, key.code, key.modifiers) => {}
                            KeyCode::Backspace => editor.backspace(),
                            KeyCode::Delete => editor.delete(),
                            KeyCode::Left if key.modifiers.contains(KeyModifiers::CONTROL) => {
                                editor.move_word_left()
                            }
                            KeyCode::Right if key.modifiers.contains(KeyModifiers::CONTROL) => {
                                editor.move_word_right()
                            }
                            KeyCode::Left => editor.move_cursor(editor.cursor.saturating_sub(1)),
                            KeyCode::Right => {
                                editor.move_cursor((editor.cursor + 1).min(editor.len()))
                            }
                            KeyCode::Home => editor.move_cursor(0),
                            KeyCode::End => editor.move_cursor(editor.len()),
                            KeyCode::Char(_)
                                if key
                                    .modifiers
                                    .intersects(KeyModifiers::CONTROL | KeyModifiers::ALT) => {}
                            KeyCode::Char(ch) if !ch.is_control() => editor.insert(ch),
                            _ => {
                                cancel = true;
                                consume = false;
                            }
                        }
                    }
                    if cancel {
                        rename = None;
                    }
                    if let Some((tab_id, name)) = submit {
                        rename = None;
                        pending_manual_name = Some((tab_id.clone(), name.clone()));
                        if let Some(tab) = tabs.iter_mut().find(|tab| tab.id == tab_id) {
                            tab.name = name.clone();
                            tab.name_source = "user".into();
                            tab.title_animation = None;
                        }
                        wire::send(&mut stream, "tab.rename", None, TabRename { tab_id, name })?;
                    }
                    paint_current!(false);
                    if consume {
                        continue;
                    }
                }
                if let Some(mut menu) = popup.take() {
                    match key.code {
                        KeyCode::Esc => {
                            hovered = None;
                            paint_current!(false);
                            continue;
                        }
                        KeyCode::Up => {
                            menu.move_hover(-1);
                            popup = Some(menu);
                            paint_current!(false);
                            continue;
                        }
                        KeyCode::Down => {
                            menu.move_hover(1);
                            popup = Some(menu);
                            paint_current!(false);
                            continue;
                        }
                        KeyCode::Enter => {
                            if let Some(action) = menu
                                .hovered
                                .and_then(|index| menu.items.get(index))
                                .and_then(|item| item.action.clone())
                            {
                                hovered = None;
                                invoke_popup_action!(action, menu);
                                paint_current!(false);
                            } else {
                                popup = Some(menu);
                            }
                            continue;
                        }
                        _ => {
                            hovered = None;
                            paint_current!(false);
                        }
                    }
                }
                if let Some(action) = bindings.action(&key) {
                    match action {
                        "tabs.new" => {
                            pending_created_activation = true;
                            wire::send(&mut stream, "tab.create", None, create.clone())?;
                        }
                        "tabs.settings" => {
                            settings_prewarm_pending = false;
                            if let Some(tab_id) = settings_toggle_closes(view.viewed.as_deref()) {
                                let tab_id = tab_id.to_owned();
                                let shown = shown!();
                                let survivors = shown
                                    .iter()
                                    .filter(|tab| tab.id != tab_id)
                                    .cloned()
                                    .collect::<Vec<_>>();
                                let previous =
                                    close_fallback_for(&shown, view.viewed.as_deref(), &tab_id)
                                        .and_then(|fallback| fallback.resolve(&survivors));
                                if let Some(previous) = previous {
                                    // Invariant: hiding keeps the Settings process for reuse.
                                    settings_shown = false;
                                    request_view!(previous);
                                } else {
                                    close_fallback = None;
                                    wire::send(
                                        &mut stream,
                                        "tab.close",
                                        None,
                                        TabTarget { tab_id },
                                    )?;
                                }
                            } else if let Some(tab_id) = tabs
                                .iter()
                                .find(|tab| tab.id.starts_with("settings-"))
                                .map(|tab| tab.id.clone())
                            {
                                request_view!(tab_id);
                            } else {
                                pending_created_activation = true;
                                wire::send(&mut stream, "tab.open-settings", None, create.clone())?;
                            }
                        }
                        "tabs.close" => {
                            if let Some(tab_id) = view.viewed.clone() {
                                close_fallback =
                                    close_fallback_for(&shown!(), view.viewed.as_deref(), &tab_id);
                                wire::send(&mut stream, "tab.close", None, TabTarget { tab_id })?;
                            }
                        }
                        "tabs.rename" => {
                            if let Some(tab_id) = view
                                .viewed
                                .clone()
                                .filter(|id| !id.starts_with("settings-"))
                            {
                                let name = tabs
                                    .iter()
                                    .find(|tab| tab.id == tab_id)
                                    .map(|tab| tab.name.clone())
                                    .unwrap_or_default();
                                rename = Some(RenameEditor::new(tab_id, name));
                            }
                        }
                        "tabs.next" | "tabs.previous" => {
                            let shown = shown!();
                            if !shown.is_empty() {
                                let current = view
                                    .viewed
                                    .as_ref()
                                    .and_then(|id| shown.iter().position(|tab| &tab.id == id))
                                    .unwrap_or(0);
                                let index = if action == "tabs.next" {
                                    (current + 1) % shown.len()
                                } else {
                                    (current + shown.len() - 1) % shown.len()
                                };
                                let tab_id = shown[index].id.clone();
                                request_view!(tab_id);
                            }
                        }
                        "tabs.moveRight" | "tabs.moveLeft" => {
                            if let Some(tab_id) = view.viewed.clone()
                                && let Some(current) = tabs.iter().position(|tab| tab.id == tab_id)
                            {
                                let target_index = if action == "tabs.moveRight" {
                                    (current + 1).min(tabs.len().saturating_sub(1))
                                } else {
                                    current.saturating_sub(1)
                                };
                                wire::send(
                                    &mut stream,
                                    "tab.reorder",
                                    None,
                                    TabReorder {
                                        tab_id,
                                        target_index,
                                        expected_revision: registry_revision,
                                    },
                                )?;
                            }
                        }
                        jump if jump.starts_with("tabs.jump") => {
                            let index = jump
                                .trim_start_matches("tabs.jump")
                                .parse::<usize>()
                                .unwrap_or(1)
                                .saturating_sub(1);
                            if let Some(tab_id) = shown!().get(index).map(|tab| tab.id.clone()) {
                                pending_jump = None;
                                request_view!(tab_id);
                            } else {
                                pending_jump = Some((index, registry_revision));
                            }
                        }
                        _ => {}
                    }
                    paint_current!(false);
                    continue;
                }
                let event = outer_input::normalize_key(&key);
                let bytes = encode_key(key.code, key.modifiers);
                if bytes.is_empty() && (event.is_none() || !channel.semantic) {
                    continue;
                }
                let now = started.elapsed().as_millis() as u64;
                // Invariant: the chord is judged on the key's identity, not on the bytes a
                // particular terminal protocol produced for it.
                let ctrl_c = event.as_ref().is_some_and(outer_input::is_ctrl_c_event)
                    || (event.is_none() && is_ctrl_c_bytes(&bytes));
                let disposition = chord.admit(now, ctrl_c);
                key_trace(
                    key_trace_path.as_deref(),
                    &format!("{now} chord ctrl_c={ctrl_c} -> {disposition:?}"),
                );
                if disposition == CtrlCDisposition::Detach {
                    wire::send(
                        &mut stream,
                        "detach",
                        None,
                        wire::ResultBody {
                            accepted: true,
                            message: None,
                        },
                    )?;
                    // Invariant: double Ctrl+C leaves from any tab with solo's quit animation
                    // when it is enabled; restoration follows whether or not it played.
                    if read_quit_animation(options.settings_file) {
                        terminal.play_quit_outro(&crate::roles::quit_outro::presented_row_widths(
                            columns,
                            outer_rows,
                            latest_structured.as_ref(),
                        ));
                    }
                    terminal.restore()?;
                    print_hint(running_agent_count(&tabs));
                    return Ok(());
                }
                let viewed_status = view
                    .viewed
                    .as_ref()
                    .and_then(|id| tabs.iter().find(|tab| &tab.id == id))
                    .map(|tab| tab.status.as_str());
                if matches!(viewed_status, Some("stalled" | "unresponsive"))
                    && matches!(
                        (key.code, key.modifiers),
                        (KeyCode::Char('r' | 'R'), KeyModifiers::NONE)
                    )
                {
                    if let Some(tab_id) = view.viewed.clone() {
                        wire::send(&mut stream, "tab.restart", None, TabTarget { tab_id })?;
                    }
                    continue;
                }
                let (event, bytes) = if failed {
                    match (key.code, key.modifiers) {
                        (KeyCode::Char(value @ ('r' | 'R' | 'f' | 'F')), KeyModifiers::NONE) => {
                            let name = value.to_ascii_lowercase().to_string();
                            (Some(outer_input::plain_key(&name)), vec![value as u8])
                        }
                        (KeyCode::Char('w' | 'W'), modifiers)
                            if modifiers.contains(KeyModifiers::ALT) =>
                        {
                            (Some(outer_input::plain_key("x")), b"x".to_vec())
                        }
                        _ => continue,
                    }
                } else {
                    (event, bytes)
                };
                user_input_pending = true;
                send_input!(event, bytes);
            }
            Event::Paste(text) => {
                if let Some(editor) = rename.as_mut() {
                    for value in text.chars().filter(|value| !value.is_control()) {
                        editor.insert(value);
                    }
                    paint_current!(false);
                    continue;
                }
                if failed || popup.is_some() {
                    continue;
                }
                chord.reset();
                let bytes = text.into_bytes();
                user_input_pending = true;
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
                send_child_frames!(frames);
            }
            Event::Resize(cols, rows) => {
                outer_rows = rows;
                let rows = tab_rows(outer_rows).map_err(str::to_owned)?;
                geometry_generation = geometry_generation.saturating_add(1);
                columns = cols;
                create.columns = cols;
                create.rows = rows;
                if let Some(menu) = popup.as_mut() {
                    menu.resize(columns);
                }
                // Invariant: the old viewport is never combined with new strip/overlay coordinates.
                latest_surface.clear();
                latest_structured = None;
                latest_cursor = Some(FinalCursor::Hidden);
                paint_current!(true);
                send_child_frames!(vec![wire::frame(
                    "resize",
                    None,
                    Resize {
                        columns: cols,
                        rows,
                        epoch: 0,
                        geometry_generation,
                    },
                )?]);
            }
            // Invariant: focus reports are state, not intent; while a view is pending they would
            // only consume the deferred-input budget, and the next report carries current focus.
            Event::FocusGained | Event::FocusLost
                if view.requested.is_some() || pending_created_activation => {}
            Event::FocusGained if !failed => {
                wire::send(
                    &mut stream,
                    "tab.claimInput",
                    None,
                    wire::ResultBody {
                        accepted: true,
                        message: None,
                    },
                )?;
                send_input!(Some(InputEvent::Focus { gained: true }), b"\x1b[I".to_vec());
            }
            Event::FocusLost if !failed => {
                send_input!(
                    Some(InputEvent::Focus { gained: false }),
                    b"\x1b[O".to_vec()
                );
            }
            Event::Mouse(mouse) => {
                transient_notice = None;
                let pointer_activation = matches!(
                    mouse.kind,
                    MouseEventKind::Down(_) | MouseEventKind::ScrollDown | MouseEventKind::ScrollUp
                );
                if rename.is_some() && pointer_activation {
                    rename = None;
                    paint_current!(false);
                    if mouse.row != 0 {
                        continue;
                    }
                }
                if let Some(mut menu) = popup.take() {
                    if matches!(mouse.kind, MouseEventKind::Moved) {
                        let hovered_item = menu.index_at(mouse.column, mouse.row);
                        let changed = menu.hovered != hovered_item;
                        menu.hovered = hovered_item;
                        popup = Some(menu);
                        if changed {
                            paint_current!(false);
                        }
                        continue;
                    }
                    if matches!(mouse.kind, MouseEventKind::Up(_)) {
                        popup = Some(menu);
                        continue;
                    }
                    if matches!(mouse.kind, MouseEventKind::Down(MouseButton::Left)) {
                        if let Some(action) = menu.action_at(mouse.column, mouse.row) {
                            hovered = None;
                            invoke_popup_action!(action, menu);
                            paint_current!(false);
                        } else if menu.row_at(mouse.column, mouse.row).is_some() {
                            popup = Some(menu);
                        } else {
                            hovered = None;
                            paint_current!(false);
                        }
                        continue;
                    }
                    hovered = None;
                    paint_current!(false);
                    continue;
                }
                if let Some(current_drag) = drag.as_mut()
                    && matches!(mouse.kind, MouseEventKind::Drag(MouseButton::Left))
                {
                    if update_drag(
                        current_drag,
                        mouse.column,
                        mouse.row == 0,
                        &shown!(),
                        &strip_frame,
                    ) {
                        paint_current!(false);
                    }
                    continue;
                }
                if matches!(mouse.kind, MouseEventKind::Up(MouseButton::Left))
                    && let Some(mut completed) = drag.take()
                {
                    let shown = shown!();
                    update_drag(
                        &mut completed,
                        mouse.column,
                        mouse.row == 0,
                        &shown,
                        &strip_frame,
                    );
                    let from = shown.iter().position(|tab| tab.id == completed.tab_id);
                    if mouse.row == 0
                        && completed.shown
                        && let Some(target_index) = completed.drop_index
                        && Some(target_index) != from
                    {
                        wire::send(
                            &mut stream,
                            "tab.reorder",
                            None,
                            TabReorder {
                                tab_id: completed.tab_id,
                                target_index: registry_index(&shown, &tabs, target_index),
                                expected_revision: completed.expected_revision,
                            },
                        )?;
                    }
                    paint_current!(false);
                    continue;
                }
                if mouse.row == 0 {
                    let target = strip::hit(&strip_frame, mouse.column).cloned();
                    if matches!(mouse.kind, MouseEventKind::Moved) {
                        let next_hover = match target {
                            Some(StripHit::View(id)) => Some(StripHover::Tab(id)),
                            Some(StripHit::Overflow) => Some(StripHover::Overflow),
                            Some(StripHit::New) => Some(StripHover::New),
                            None => None,
                        };
                        if next_hover != hovered {
                            hovered = next_hover;
                            paint_strip!();
                        }
                    } else if matches!(mouse.kind, MouseEventKind::Down(MouseButton::Right)) {
                        if let Some(StripHit::View(tab_id)) = target {
                            popup =
                                Some(PopupMenu::context(tab_id, mouse.column, columns, &bindings));
                            paint_current!(false);
                        }
                    } else if matches!(mouse.kind, MouseEventKind::Down(MouseButton::Left)) {
                        match target {
                            Some(StripHit::View(tab_id)) => {
                                drag = Some(TabDrag {
                                    tab_id: tab_id.clone(),
                                    start_column: mouse.column,
                                    started_at: Instant::now(),
                                    shown: false,
                                    drop_index: shown!().iter().position(|tab| tab.id == tab_id),
                                    expected_revision: registry_revision,
                                });
                                if view.viewed.as_deref() != Some(tab_id.as_str()) {
                                    request_view!(tab_id);
                                }
                            }
                            Some(StripHit::New) => {
                                hovered = Some(StripHover::New);
                                popup = Some(PopupMenu::add(mouse.column, columns, &bindings));
                                paint_current!(false);
                            }
                            Some(StripHit::Overflow) => {
                                hovered = Some(StripHover::Overflow);
                                popup = Some(PopupMenu::overflow(
                                    mouse.column,
                                    columns,
                                    &strip_frame.hidden_tabs,
                                    &tabs,
                                    view.viewed.as_deref(),
                                ));
                                paint_current!(false);
                            }
                            None => {}
                        }
                    }
                    continue;
                }
                if hovered.take().is_some() {
                    paint_current!(false);
                }
                if matches!(mouse.kind, MouseEventKind::Moved)
                    && !forward_pointer_motion(
                        view.requested.is_some() || pending_created_activation,
                        latest_modes.as_ref(),
                    )
                {
                    continue;
                }
                let event = outer_input::normalize_mouse(
                    mouse.kind,
                    mouse.column,
                    mouse.row,
                    mouse.modifiers,
                );
                if event.as_ref().is_some_and(outer_input::resets_chord) {
                    chord.reset();
                }
                let bytes = encode_mouse(mouse.kind, mouse.column, mouse.row).unwrap_or_default();
                if event.is_some() || !bytes.is_empty() {
                    user_input_pending = true;
                    send_input!(event, bytes);
                }
            }
            _ => {}
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

#[derive(Debug, Clone, PartialEq, Eq)]
struct CloseFallback {
    candidates: Vec<String>,
}

impl CloseFallback {
    fn resolve(&self, survivors: &[StripTab]) -> Option<String> {
        self.candidates
            .iter()
            .find(|id| survivors.iter().any(|tab| &tab.id == *id))
            .cloned()
    }
}

fn close_fallback_for(
    tabs: &[StripTab],
    viewed: Option<&str>,
    closing: &str,
) -> Option<CloseFallback> {
    if viewed != Some(closing) {
        return None;
    }
    let index = tabs.iter().position(|tab| tab.id == closing)?;
    let mut candidates = Vec::with_capacity(tabs.len().saturating_sub(1));
    for distance in 1..tabs.len() {
        if let Some(left) = index.checked_sub(distance).and_then(|left| tabs.get(left)) {
            candidates.push(left.id.clone());
        }
        if let Some(right) = tabs.get(index + distance) {
            candidates.push(right.id.clone());
        }
    }
    Some(CloseFallback { candidates })
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
    fn deferred_input_is_atomic_bounded_and_bound_to_the_requested_tab() {
        let mut deferred = DeferredInput::default();
        deferred
            .push(
                DeferredInputTarget::Tab("tab-b".into()),
                vec![vec![1, 2], vec![3]],
            )
            .expect("defer input");
        deferred
            .push(DeferredInputTarget::Tab("tab-c".into()), vec![vec![4]])
            .expect("defer superseding input");
        let (selected, dropped) = deferred.resolve("tab-c");
        assert_eq!(selected, vec![vec![4]]);
        assert!(dropped);
        assert_eq!(deferred.bytes, 0);
        assert!(deferred.frames.is_empty());

        let mut full = DeferredInput::default();
        assert_eq!(
            full.push(
                DeferredInputTarget::Tab("tab-a".into()),
                vec![vec![0; DEFERRED_INPUT_BYTES + 1]],
            ),
            Err("deferred input byte limit reached")
        );
        assert!(
            full.frames.is_empty(),
            "an oversized paste admitted no prefix"
        );

        let pending_frames = vec![vec![10], vec![20], vec![30], vec![40], vec![50]];
        let mut settings_activation = DeferredInput::default();
        settings_activation
            .push(DeferredInputTarget::NextCreated, pending_frames.clone())
            .expect("defer key, paste, focus, mouse, and resize frames");
        settings_activation.retarget_created("settings-a");
        assert_eq!(
            settings_activation.resolve("settings-a"),
            (pending_frames, false)
        );
        let mut failed_creation = DeferredInput::default();
        failed_creation
            .push(DeferredInputTarget::NextCreated, vec![vec![1]])
            .expect("defer failed target input");
        assert!(failed_creation.discard_created());
        assert!(failed_creation.frames.is_empty());
    }
    #[test]
    fn pointer_motion_never_consumes_a_pending_creation_budget() {
        let tracking = TerminalModes {
            mouse_tracking: true,
            ..TerminalModes::default()
        };
        let untracked = TerminalModes::default();
        assert!(!forward_pointer_motion(true, Some(&tracking)));
        assert!(!forward_pointer_motion(true, None));
        assert!(!forward_pointer_motion(false, Some(&untracked)));
        assert!(forward_pointer_motion(false, Some(&tracking)));
        assert!(forward_pointer_motion(false, None));

        // Invariant: Keys typed while a new Agent starts keep their place even after heavy pointer motion,
        // because motion is no longer deferred.
        let mut deferred = DeferredInput::default();
        for _ in 0..500 {
            if forward_pointer_motion(true, Some(&tracking)) {
                deferred
                    .push(
                        DeferredInputTarget::NextCreated,
                        vec![b"\x1b[<35;1;2M".to_vec()],
                    )
                    .expect("defer motion");
            }
        }
        let keys = (0..200u8).map(|value| vec![value]).collect::<Vec<_>>();
        for key in &keys {
            deferred
                .push(DeferredInputTarget::NextCreated, vec![key.clone()])
                .expect("typed keys fit the pending budget");
        }
        deferred.retarget_created("tab-new");
        assert_eq!(deferred.resolve("tab-new"), (keys, false));
    }
    #[test]
    fn glyphs_swap_in_place_without_a_glyphless_gap() {
        let tab = |status: &str| StripTab {
            id: "tab-1".into(),
            name: "Agent".into(),
            name_source: "default".into(),
            status: status.into(),
            accent: None,
            title_animation: None,
        };
        let mut held = HashMap::new();
        let start = Instant::now();
        let mut working = vec![tab("working")];
        assert_eq!(hold_status_glyphs(&mut working, &mut held, start), None);

        // Invariant: The momentary idle between the spinner and the checkmark keeps the spinner.
        let mut gap = vec![tab("idle")];
        let expires = hold_status_glyphs(&mut gap, &mut held, start + Duration::from_millis(20));
        assert_eq!(gap[0].status, "working");
        assert_eq!(expires, Some(start + GLYPH_SWAP_HOLD));
        let mut done = vec![tab("done")];
        hold_status_glyphs(&mut done, &mut held, start + Duration::from_millis(40));
        assert_eq!(done[0].status, "done");

        // Invariant: A glyph that really goes away is released after the hold.
        let mut idle = vec![tab("idle")];
        let late = start + Duration::from_millis(40) + GLYPH_SWAP_HOLD;
        assert_eq!(hold_status_glyphs(&mut idle, &mut held, late), None);
        assert_eq!(idle[0].status, "idle");
    }
    #[test]
    fn a_quick_start_never_flashes_the_starting_spinner() {
        let tab = |status: &str| StripTab {
            id: "tab-2".into(),
            name: "agent 2".into(),
            name_source: "default".into(),
            status: status.into(),
            accent: None,
            title_animation: None,
        };
        let mut since = HashMap::new();
        let start = Instant::now();
        let mut shown = vec![tab("starting")];
        debounce_starting_glyphs(&mut shown, &mut since, start);
        assert_eq!(shown[0].status, "idle", "no spinner in the first moments");
        let mut later = vec![tab("starting")];
        debounce_starting_glyphs(&mut later, &mut since, start + STARTING_GLYPH_DELAY);
        assert_eq!(
            later[0].status, "starting",
            "a slow start still shows progress"
        );
        let mut ready = vec![tab("idle")];
        debounce_starting_glyphs(&mut ready, &mut since, start + STARTING_GLYPH_DELAY);
        assert!(since.is_empty());
    }
    #[test]
    fn hidden_settings_tab_stays_out_of_the_strip_until_viewed_or_shown() {
        let tab = |id: &str| StripTab {
            id: id.into(),
            name: id.into(),
            name_source: "default".into(),
            status: "idle".into(),
            accent: None,
            title_animation: None,
        };
        let tabs = vec![tab("tab-1"), tab("settings-1"), tab("tab-2")];
        let ids = |shown: Vec<StripTab>| shown.into_iter().map(|tab| tab.id).collect::<Vec<_>>();
        assert_eq!(
            ids(shown_tabs(&tabs, Some("tab-1"), false)),
            ["tab-1", "tab-2"]
        );
        assert_eq!(
            ids(shown_tabs(&tabs, Some("settings-1"), false)),
            ["tab-1", "settings-1", "tab-2"]
        );
        assert_eq!(
            ids(shown_tabs(&tabs, Some("tab-2"), true)),
            ["tab-1", "settings-1", "tab-2"]
        );

        // Invariant: A drop among shown tabs maps to the registry position the server reorders by.
        let shown = shown_tabs(&tabs, Some("tab-1"), false);
        assert_eq!(registry_index(&shown, &tabs, 0), 0);
        assert_eq!(registry_index(&shown, &tabs, 1), 2);
        assert_eq!(registry_index(&shown, &tabs, 2), 3);
    }
    #[test]
    fn settings_shortcut_toggles_the_viewed_settings_tab() {
        assert_eq!(
            settings_toggle_closes(Some("settings-1a")),
            Some("settings-1a")
        );
        assert_eq!(settings_toggle_closes(Some("tab-1")), None);
        assert_eq!(settings_toggle_closes(None), None);
    }
    #[test]
    fn provisional_holder_idle_never_flips_a_starting_chip() {
        assert!(holder_idle_precedes_bridge("starting", "idle"));
        assert!(holder_idle_precedes_bridge("restoring", "idle"));
        assert!(!holder_idle_precedes_bridge("starting", "working"));
        assert!(!holder_idle_precedes_bridge("working", "idle"));
        assert!(!holder_idle_precedes_bridge("done", "idle"));
    }
    #[test]
    fn notices_never_report_undelivered_input() {
        let source = include_str!("attach.rs");
        let phrase = ["Input was not sent", "; try again."].concat();
        assert!(!source.contains(&phrase));
    }
    #[test]
    fn rename_deletes_whole_words_and_ignores_control_letters() {
        let mut editor = RenameEditor::new("tab-a".into(), "fix login flow".into());
        editor.move_cursor(4);
        assert!(apply_rename_control_key(
            &mut editor,
            KeyCode::Delete,
            KeyModifiers::CONTROL
        ));
        assert_eq!(editor.text, "fix flow");
        assert_eq!(editor.cursor, 4);
        editor.move_cursor(editor.len());
        assert!(apply_rename_control_key(
            &mut editor,
            KeyCode::Backspace,
            KeyModifiers::CONTROL
        ));
        assert_eq!(editor.text, "fix ");
        assert!(apply_rename_control_key(
            &mut editor,
            KeyCode::Char('w'),
            KeyModifiers::CONTROL
        ));
        assert_eq!(editor.text, "");
        assert!(!apply_rename_control_key(
            &mut editor,
            KeyCode::Delete,
            KeyModifiers::NONE
        ));

        let mut unicode = RenameEditor::new("tab-a".into(), "e\u{301}clair 👩‍💻 build".into());
        unicode.move_cursor(0);
        unicode.delete_word_right();
        assert_eq!(unicode.text, "👩‍💻 build");
        unicode.move_cursor(unicode.len());
        unicode.delete_word_left();
        assert_eq!(unicode.text, "👩‍💻 ");
        assert_eq!(unicode.cursor, 2);
    }
    #[test]
    fn rename_undo_and_redo_restore_text_and_caret() {
        let mut editor = RenameEditor::new("tab-a".into(), "agent".into());
        for value in " one".chars() {
            editor.insert(value);
        }
        editor.delete_word_left();
        assert_eq!(editor.text, "agent ");
        assert!(apply_rename_control_key(
            &mut editor,
            KeyCode::Char('z'),
            KeyModifiers::CONTROL
        ));
        assert_eq!((editor.text.as_str(), editor.cursor), ("agent one", 9));
        apply_rename_control_key(&mut editor, KeyCode::Char('z'), KeyModifiers::CONTROL);
        assert_eq!((editor.text.as_str(), editor.cursor), ("agent", 5));
        apply_rename_control_key(&mut editor, KeyCode::Char('y'), KeyModifiers::CONTROL);
        assert_eq!(editor.text, "agent one");
        apply_rename_control_key(
            &mut editor,
            KeyCode::Char('Z'),
            KeyModifiers::CONTROL | KeyModifiers::SHIFT,
        );
        assert_eq!(editor.text, "agent ");

        // Invariant: A new edit after undo discards the redo branch, and no-op edits add no history.
        editor.undo();
        editor.insert('!');
        editor.redo();
        assert_eq!(editor.text, "agent one!");
        editor.move_cursor(0);
        editor.backspace();
        editor.undo();
        assert_eq!(editor.text, "agent one");
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
    fn failure_input_rules_apply_only_to_the_viewed_failed_tab() {
        assert!(failure_applies(Some("tab-a"), Some("tab-a")));
        assert!(!failure_applies(Some("tab-a"), Some("tab-b")));
        assert!(!failure_applies(None, Some("tab-a")));
        assert!(!failure_applies(None, None));
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
    fn rejection_notices_answer_only_user_input() {
        let mut pending = false;
        assert_eq!(
            rejection_notice(&mut pending, Some("read-only-viewer".into())),
            None
        );

        pending = true;
        assert_eq!(
            rejection_notice(&mut pending, Some("read-only-viewer".into())).as_deref(),
            Some("read-only-viewer")
        );
        assert!(!pending);
        assert_eq!(
            rejection_notice(&mut pending, Some("read-only-viewer".into())),
            None
        );
    }

    #[test]
    fn active_close_prefers_the_immediate_predecessor_then_next_survivor() {
        let tab = |id: &str| StripTab {
            id: id.into(),
            name: id.into(),
            name_source: "default".into(),
            status: "idle".into(),
            accent: None,
            title_animation: None,
        };
        let tabs = vec![tab("a"), tab("b"), tab("c"), tab("d")];
        let ids = |fallback: Option<CloseFallback>| fallback.unwrap().candidates;
        assert_eq!(
            ids(close_fallback_for(&tabs, Some("b"), "b")),
            ["a", "c", "d"]
        );
        assert_eq!(
            ids(close_fallback_for(&tabs, Some("a"), "a")),
            ["b", "c", "d"]
        );
        assert_eq!(
            ids(close_fallback_for(&tabs, Some("d"), "d")),
            ["c", "b", "a"]
        );
        assert_eq!(close_fallback_for(&tabs, Some("a"), "b"), None);

        let fallback = close_fallback_for(&tabs, Some("c"), "c").unwrap();
        assert_eq!(
            fallback.resolve(&[tab("a"), tab("b"), tab("d")]).as_deref(),
            Some("b")
        );
        assert_eq!(
            fallback.resolve(&[tab("a"), tab("d")]).as_deref(),
            Some("d")
        );
        assert_eq!(fallback.resolve(&[]), None);
        assert_eq!(
            close_fallback_for(&[tab("a")], Some("a"), "a")
                .unwrap()
                .resolve(&[]),
            None
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
    fn rename_editor_supports_selection_cursor_and_grapheme_edits() {
        let mut editor = RenameEditor::new("tab-1".into(), "Agent 🚀".into());
        editor.select_all();
        assert_eq!(editor.selection(), Some((0, 7)));
        editor.insert('d');
        editor.insert('o');
        editor.insert('c');
        editor.insert('s');
        assert_eq!(editor.text, "docs");
        editor.move_cursor(0);
        editor.delete();
        assert_eq!(editor.text, "ocs");
        editor.move_cursor(editor.len());
        editor.backspace();
        assert_eq!(editor.text, "oc");
        assert_eq!(editor.display().cursor, 2);

        let mut words = RenameEditor::new("tab-1".into(), "alpha  beta 🚀".into());
        words.move_word_left();
        assert_eq!(words.cursor, 12);
        words.move_word_left();
        assert_eq!(words.cursor, 7);
        words.move_word_left();
        assert_eq!(words.cursor, 0);
        words.move_word_right();
        assert_eq!(words.cursor, 7);
        words.move_word_right();
        assert_eq!(words.cursor, 12);
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
            started_at: Instant::now(),
            shown: false,
            drop_index: Some(0),
            expected_revision: 9,
        };
        let mut held = TabDrag {
            tab_id: "a".into(),
            start_column: 1,
            started_at: Instant::now() - Duration::from_millis(250),
            shown: false,
            drop_index: Some(0),
            expected_revision: 9,
        };
        assert!(update_drag(&mut held, 1, true, &tabs, &frame));
        assert!(held.shown);
        assert_eq!(drag_marker_column(&held, &tabs, &frame), None);

        assert!(update_drag(&mut drag, last_end, true, &tabs, &frame));
        assert!(drag.shown);
        assert_eq!(drag.drop_index, Some(2));
        assert_eq!(drag_marker_column(&drag, &tabs, &frame), Some(last_end));
        assert!(update_drag(&mut drag, last_end, false, &tabs, &frame));
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
