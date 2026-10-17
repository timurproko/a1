use std::collections::HashMap;
use std::io::{Write, stdout};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

use crossterm::event::{
    self, Event, KeyCode, KeyEventKind, KeyModifiers, MouseButton, MouseEventKind,
};
use crossterm::terminal::{disable_raw_mode, enable_raw_mode};

use crate::endpoint;
use crate::protocol::{self, BridgeAttachment, MAX_INPUT_BYTES, Welcome};
use crate::roles::credentials::ProfileCredentials;
use crate::roles::strip::{self, StripHit, StripHover, StripTab, TimeFormat};
use crate::roles::wire::{
    self, AttachStart, Input, PasteStart, Resize, RoleHello, Surface, TabCreate, TabList,
    TabRename, TabReorder, TabStatus, TabTarget,
};

pub const ENTER_OUTER_MODES: &[u8] =
    b"\x1b[?1049h\x1b[?2004h\x1b[?1004h\x1b[?1000h\x1b[?1003h\x1b[?1006h";
pub const RESTORE_OUTER_MODES: &[u8] =
    b"\x1b[?1006l\x1b[?1003l\x1b[?1000l\x1b[?1004l\x1b[?2004l\x1b[?1049l";
const BEGIN_SYNCHRONIZED_UPDATE: &[u8] = b"\x1b[?2026h";
const END_SYNCHRONIZED_UPDATE: &[u8] = b"\x1b[?2026l";

#[derive(Debug, Default)]
struct TabBindings {
    by_key: HashMap<String, String>,
    by_action: HashMap<String, String>,
}

impl TabBindings {
    fn load(profile: &Path) -> Self {
        let defaults = [
            ("tabs.new", "alt+a"),
            ("tabs.close", "alt+w"),
            ("tabs.rename", "f2"),
            ("tabs.jump1", "alt+1"),
            ("tabs.jump2", "alt+2"),
            ("tabs.jump3", "alt+3"),
            ("tabs.jump4", "alt+4"),
            ("tabs.jump5", "alt+5"),
            ("tabs.jump6", "alt+6"),
            ("tabs.jump7", "alt+7"),
            ("tabs.jump8", "alt+8"),
            ("tabs.jump9", "alt+9"),
            ("tabs.jump10", "alt+0"),
        ];
        let mut actions = defaults
            .into_iter()
            .map(|(action, key)| (action.to_owned(), vec![key.to_owned()]))
            .collect::<HashMap<_, _>>();
        let mut foreign_keys = std::collections::HashSet::new();
        if let Ok(bytes) = std::fs::read(profile.join("keybindings.json"))
            && let Ok(document) = serde_json::from_slice::<serde_json::Value>(&bytes)
            && let Some(object) = document.as_object()
        {
            for (action, value) in object {
                if action.starts_with("tabs.") {
                    continue;
                }
                match value {
                    serde_json::Value::String(key) => {
                        foreign_keys.insert(key.to_lowercase());
                    }
                    serde_json::Value::Array(values) => {
                        foreign_keys.extend(
                            values
                                .iter()
                                .filter_map(|value| value.as_str().map(str::to_lowercase)),
                        );
                    }
                    _ => {}
                }
            }
            for action in [
                "tabs.new",
                "tabs.close",
                "tabs.rename",
                "tabs.jump1",
                "tabs.jump2",
                "tabs.jump3",
                "tabs.jump4",
                "tabs.jump5",
                "tabs.jump6",
                "tabs.jump7",
                "tabs.jump8",
                "tabs.jump9",
                "tabs.jump10",
                "tabs.next",
                "tabs.previous",
                "tabs.moveRight",
                "tabs.moveLeft",
            ] {
                if let Some(value) = object.get(action) {
                    let keys = match value {
                        serde_json::Value::String(key) => vec![key.to_lowercase()],
                        serde_json::Value::Array(values) => values
                            .iter()
                            .filter_map(|value| value.as_str().map(str::to_lowercase))
                            .collect(),
                        serde_json::Value::Null => Vec::new(),
                        _ => continue,
                    };
                    actions.insert(action.to_owned(), keys);
                }
            }
        }
        let mut by_key = HashMap::new();
        let mut conflicts = std::collections::HashSet::new();
        for (action, keys) in actions {
            for key in keys {
                if by_key.insert(key.clone(), action.clone()).is_some() {
                    conflicts.insert(key);
                }
            }
        }
        conflicts.extend(foreign_keys);
        for key in conflicts {
            by_key.remove(&key);
        }
        let mut effective = by_key.iter().collect::<Vec<_>>();
        effective.sort_by(|left, right| left.0.cmp(right.0));
        let mut by_action = HashMap::new();
        for (key, action) in effective {
            by_action
                .entry(action.clone())
                .or_insert_with(|| key.clone());
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

fn prompt_overlay_notice(pending_close_name: Option<&str>) -> Option<String> {
    pending_close_name.map(|name| format!("Stop \"{name}\"? Enter stop · Esc cancel"))
}

/// The notice for a refused or failed new-tab request.
pub fn tab_create_failure_notice(reason: Option<&str>) -> String {
    let reason = match reason {
        Some("tab-limit") => "the tab limit is reached",
        Some("tab-start-busy") => "tab starts are busy, try again shortly",
        Some("busy") => "a tab change is still running, try again shortly",
        Some(reason) if !reason.trim().is_empty() => reason,
        _ => "the tab could not start",
    };
    format!("Could not open a tab: {reason}")
}

/// True when the failed tab's restricted input rules apply: only while that tab is viewed.
pub fn failure_applies(failed_tab: Option<&str>, viewed: Option<&str>) -> bool {
    failed_tab.is_some() && failed_tab == viewed
}

fn adopt_initial_surface(viewed: Option<&str>, requested: &mut Option<String>, tab_id: &str) {
    if viewed.is_none() && requested.is_none() {
        *requested = Some(tab_id.to_owned());
    }
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

#[derive(Debug)]
struct TimeFormatWatch {
    path: PathBuf,
    signature: Option<(std::time::SystemTime, u64)>,
    value: TimeFormat,
    checked_at: Instant,
}

impl TimeFormatWatch {
    fn new(path: &Path) -> Self {
        Self {
            path: path.to_owned(),
            signature: settings_signature(path),
            value: read_time_format(path),
            checked_at: Instant::now(),
        }
    }

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
        Self::new(
            PopupKind::Context,
            Some(tab_id),
            column,
            columns,
            vec![
                PopupItem::action("Close", bindings.label("tabs.close"), PopupAction::Close),
                PopupItem::action("Rename", bindings.label("tabs.rename"), PopupAction::Rename),
            ],
        )
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
                PopupItem::action("  Settings", String::new(), PopupAction::Settings),
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

    fn render(&self) -> String {
        self.render_with_color(!palette_fallback_requested())
    }

    fn render_with_color(&self, truecolor: bool) -> String {
        let inner = usize::from(self.width).saturating_sub(2);
        let mut output = String::from("\x1b[s");
        for (index, item) in self.items.iter().enumerate() {
            let row = index + 2;
            output.push_str(&format!("\x1b[{row};{}H", self.column.saturating_add(1)));
            if truecolor {
                let background = if self.hovered == Some(index) && item.action.is_some() {
                    "48;48;48"
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
                let style = if self.hovered == Some(index) && item.action.is_some() {
                    "\x1b[0m\x1b[7m"
                } else {
                    "\x1b[0m\x1b[7;2m"
                };
                let label = if item.separator {
                    "─".repeat(inner)
                } else {
                    let (mut label, gap, shortcut) = menu_text_parts(item, inner);
                    label.push_str(&" ".repeat(gap));
                    label.push_str(&shortcut);
                    label
                };
                output.push_str(&format!("{style} {label} \x1b[22;27m"));
            }
        }
        output.push_str("\x1b[u");
        output
    }
}

fn palette_fallback_requested() -> bool {
    if std::env::var("TERMINAL_HOST_COLOR_MODE").is_ok_and(|value| value == "palette") {
        return true;
    }
    std::env::var("TERM").is_ok_and(|term| term.contains("256color"))
        && std::env::var("COLORTERM").map_or(true, |value| {
            !matches!(value.as_str(), "truecolor" | "24bit")
        })
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct RenameEditor {
    tab_id: String,
    text: String,
    cursor: usize,
    selection_anchor: Option<usize>,
}

impl RenameEditor {
    fn new(tab_id: String, text: String) -> Self {
        let cursor = text.graphemes(true).count();
        Self {
            tab_id,
            text,
            cursor,
            selection_anchor: None,
        }
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
        self.delete_selection();
        if self.len() >= 64 {
            return;
        }
        let offset = self.byte_offset(self.cursor);
        self.text.insert(offset, value);
        self.cursor += 1;
    }

    fn backspace(&mut self) {
        if self.delete_selection() || self.cursor == 0 {
            return;
        }
        let start = self.byte_offset(self.cursor - 1);
        let end = self.byte_offset(self.cursor);
        self.text.replace_range(start..end, "");
        self.cursor -= 1;
    }

    fn delete(&mut self) {
        if self.delete_selection() || self.cursor >= self.len() {
            return;
        }
        let start = self.byte_offset(self.cursor);
        let end = self.byte_offset(self.cursor + 1);
        self.text.replace_range(start..end, "");
    }

    fn move_cursor(&mut self, cursor: usize) {
        self.cursor = cursor.min(self.len());
        self.selection_anchor = None;
    }

    fn select_all(&mut self) {
        self.selection_anchor = Some(0);
        self.cursor = self.len();
    }
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

fn compose_presentation(
    strip: &strip::StripFrame,
    surface: &[u8],
    overlay: Option<&str>,
    clear: bool,
) -> Vec<u8> {
    let mut output =
        Vec::with_capacity(strip.bytes.len() + surface.len() + overlay.map_or(0, str::len) + 32);
    output.extend_from_slice(BEGIN_SYNCHRONIZED_UPDATE);
    if clear {
        output.extend_from_slice(b"\x1b[2J\x1b[H");
    }
    output.extend_from_slice(strip.bytes.as_bytes());
    output.extend_from_slice(surface);
    if let Some(overlay) = overlay {
        output.extend_from_slice(overlay.as_bytes());
    }
    output.extend_from_slice(END_SYNCHRONIZED_UPDATE);
    output
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
pub fn tab_rows(outer_rows: u16) -> Result<u16, &'static str> {
    outer_rows
        .checked_sub(1)
        .filter(|rows| *rows > 0)
        .ok_or("resident attach requires at least two rows")
}
pub fn child_mouse_row(outer_row: u16) -> Option<u16> {
    outer_row.checked_sub(1)
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
            features: vec!["double-ctrl-c".into()],
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
    let _: (Option<u64>, Welcome) = wire::body(&payload)?;
    let attachment = wire::read_payload(&mut stream)?
        .ok_or_else(|| "server closed before attach admission".to_owned())?;
    match wire::kind(&attachment)?.message_type.as_str() {
        "attached" => {
            let _: (Option<u64>, BridgeAttachment) = wire::body(&attachment)?;
        }
        "refused" => return Err("a1 is attached in another terminal".to_owned()),
        message => return Err(format!("unexpected attach admission message: {message}")),
    }
    let (mut columns, outer_rows) = outer_size()?;
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
            tabs_max: options.tabs_max.clamp(1, 50),
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
        wire::send(
            &mut stream,
            "tab.view",
            None,
            TabTarget {
                tab_id: tab_id.into(),
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
    let (message_tx, message_rx) = mpsc::channel::<Vec<u8>>();
    // Performance: server frames and outer input both wake the loop directly, so neither waits
    // out the other side's idle poll; capacity one keeps wakes coalesced.
    let (wake_tx, wake_rx) = mpsc::sync_channel::<()>(1);
    let reader_wake = wake_tx.clone();
    thread::spawn(move || {
        while let Ok(Some(payload)) = wire::read_payload(&mut reader) {
            if message_tx.send(payload).is_err() {
                return;
            }
            let _ = reader_wake.try_send(());
        }
        let _ = message_tx.send(Vec::new());
        let _ = reader_wake.try_send(());
    });

    let mut terminal = OuterTerminal::enter()?;
    let (input_tx, input_rx) = mpsc::channel::<Result<Event, String>>();
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
    let mut staged_tabs: Option<Vec<StripTab>> = None;
    let mut viewed = options.view_tab.map(str::to_owned);
    let mut requested_view: Option<String> = options.view_tab.map(str::to_owned);
    let mut pending_surface: Option<Surface> = None;
    let mut hovered: Option<StripHover> = None;
    let mut time_format = TimeFormatWatch::new(options.settings_file);
    let mut strip_frame = strip::render_configured(
        &tabs,
        viewed.as_deref(),
        columns,
        hovered.as_ref(),
        time_format.value,
    );
    let mut latest_surface = Vec::<u8>::new();
    terminal.write(&compose_presentation(
        &strip_frame,
        &latest_surface,
        None,
        true,
    ))?;
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
    let mut pending_close: Option<String> = None;
    let mut close_fallback: Option<CloseFallback> = None;
    let mut transient_notice: Option<String> = None;
    let mut prompt_view = viewed.clone();
    let mut registry_revision = 0u64;
    let mut drag: Option<TabDrag> = None;
    let mut pending_settings_create = false;
    let mut pending_settings_tab: Option<String> = None;
    let bindings = TabBindings::load(options.profile);
    macro_rules! paint_current {
        ($clear:expr) => {{
            let rename_display = rename.as_ref().map(RenameEditor::display);
            strip_frame = strip::render_interactive(
                &tabs,
                viewed.as_deref(),
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
                    &tabs,
                    viewed.as_deref(),
                    columns,
                    None,
                    time_format.value,
                    rename_display.as_ref(),
                );
            }
            let pending_name = pending_close.as_ref().and_then(|id| {
                tabs.iter()
                    .find(|tab| &tab.id == id)
                    .map(|tab| tab.name.as_str())
            });
            let prompt = prompt_overlay_notice(pending_name);
            let status_notice = viewed
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
                Some(menu.render())
            } else if let Some(column) = drag
                .as_ref()
                .and_then(|drag| drag_marker_column(drag, &tabs, &strip_frame))
            {
                Some(render_drag_marker(column, columns))
            } else if let Some(prompt) = prompt {
                Some(render_notice(&prompt, columns))
            } else if let Some(notice) = transient_notice.as_deref().or(status_notice.as_deref()) {
                Some(render_notice(notice, columns))
            } else {
                None
            };
            terminal.write(&compose_presentation(
                &strip_frame,
                &latest_surface,
                overlay.as_deref(),
                $clear,
            ))?;
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
                        let busy = tabs.iter().find(|tab| tab.id == tab_id).is_some_and(|tab| {
                            matches!(tab.status.as_str(), "working" | "needs-input")
                        });
                        if busy {
                            pending_close = Some(tab_id);
                        } else {
                            close_fallback = close_fallback_for(&tabs, viewed.as_deref(), &tab_id);
                            wire::send(&mut stream, "tab.close", None, TabTarget { tab_id })?;
                        }
                    }
                }
                PopupAction::NewAgent => {
                    wire::send(&mut stream, "tab.create", None, create.clone())?;
                }
                PopupAction::Settings => {
                    if let Some(tab_id) = viewed.clone() {
                        wire::send(&mut stream, "tab.open-settings", None, TabTarget { tab_id })?;
                    } else {
                        pending_settings_create = true;
                        wire::send(&mut stream, "tab.create", None, create.clone())?;
                    }
                }
                PopupAction::View(tab_id) => {
                    requested_view = Some(tab_id.clone());
                    wire::send(&mut stream, "tab.view", None, TabTarget { tab_id })?;
                }
            }
        }};
    }
    loop {
        watchdog.bump();
        while let Ok(payload) = message_rx.try_recv() {
            if payload.is_empty() {
                return Err("resident server connection closed".to_owned());
            }
            let kind = wire::kind(&payload)?;
            match kind.message_type.as_str() {
                "surface" => {
                    let (_, surface): (_, Surface) = wire::body(&payload)?;
                    // Protocol: the server selects its default tab before attach.start can report
                    // the ID. Adopt its first surface as the requested view, then stage it until
                    // the tab list arrives so the chip and child surface commit in one frame.
                    adopt_initial_surface(viewed.as_deref(), &mut requested_view, &surface.tab_id);
                    let requested = requested_view.as_deref() == Some(surface.tab_id.as_str());
                    if requested
                        && staged_tabs.is_none()
                        && !tabs.iter().any(|tab| tab.id == surface.tab_id)
                    {
                        pending_surface = Some(surface);
                        continue;
                    }
                    if requested {
                        if let Some(next) = staged_tabs.take() {
                            tabs = next;
                        }
                        viewed = Some(surface.tab_id.clone());
                        requested_view = None;
                        close_fallback = None;
                        transient_notice = None;
                        if prompt_view != viewed {
                            pending_close = None;
                            rename = None;
                            popup = None;
                            prompt_view = viewed.clone();
                        }
                    } else if viewed.as_deref() != Some(surface.tab_id.as_str()) {
                        continue;
                    }
                    if surface.status == "failed" {
                        failed_tab = Some(surface.tab_id.clone());
                    } else if failed_tab.as_deref() == Some(surface.tab_id.as_str()) {
                        failed_tab = None;
                    }
                    if let Some(tab) = tabs.iter_mut().find(|tab| tab.id == surface.tab_id) {
                        tab.status = surface.status.clone();
                        tab.accent = surface.accent.clone();
                    }
                    latest_surface = without_bell(&surface.bytes);
                    if pending_settings_tab.as_deref() == Some(surface.tab_id.as_str()) {
                        pending_settings_tab = None;
                        wire::send(
                            &mut stream,
                            "tab.open-settings",
                            None,
                            TabTarget {
                                tab_id: surface.tab_id.clone(),
                            },
                        )?;
                    }
                    paint_current!(false);
                }
                "tab.status" => {
                    let (_, status): (_, TabStatus) = wire::body(&payload)?;
                    if let Some(tab) = tabs.iter_mut().find(|tab| tab.id == status.tab_id) {
                        tab.status = status.status.clone();
                        tab.accent = status.accent.clone();
                    }
                    if let Some(staged) = staged_tabs.as_mut()
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
                    registry_revision = list.revision;
                    let previous_tabs = staged_tabs.as_ref().unwrap_or(&tabs);
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
                    if pending_name_confirmed {
                        pending_manual_name = None;
                    }
                    let viewed_missing = viewed
                        .as_ref()
                        .is_some_and(|id| !next_tabs.iter().any(|tab| &tab.id == id));
                    let requested_missing = requested_view
                        .as_ref()
                        .is_some_and(|id| !next_tabs.iter().any(|tab| &tab.id == id));
                    if requested_missing {
                        if pending_settings_tab == requested_view {
                            pending_settings_tab = None;
                        }
                        requested_view = None;
                        staged_tabs = None;
                        pending_surface = None;
                    }
                    if viewed_missing && requested_view.is_none() {
                        let target = close_fallback
                            .as_ref()
                            .and_then(|fallback| fallback.resolve(&next_tabs))
                            .or_else(|| next_tabs.first().map(|tab| tab.id.clone()));
                        if let Some(tab_id) = target {
                            requested_view = Some(tab_id.clone());
                            wire::send(&mut stream, "tab.view", None, TabTarget { tab_id })?;
                        }
                    }
                    let target_pending = requested_view.as_ref().is_some_and(|id| {
                        viewed.as_ref() != Some(id) && next_tabs.iter().any(|tab| &tab.id == id)
                    });
                    if target_pending {
                        let target = requested_view.clone().expect("checked pending target");
                        if let Some(surface) = pending_surface
                            .take()
                            .filter(|surface| surface.tab_id == target)
                        {
                            tabs = next_tabs;
                            viewed = Some(target);
                            requested_view = None;
                            close_fallback = None;
                            if prompt_view != viewed {
                                pending_close = None;
                                rename = None;
                                popup = None;
                                prompt_view = viewed.clone();
                            }
                            latest_surface = without_bell(&surface.bytes);
                            if pending_settings_tab.as_deref() == Some(surface.tab_id.as_str()) {
                                pending_settings_tab = None;
                                wire::send(
                                    &mut stream,
                                    "tab.open-settings",
                                    None,
                                    TabTarget {
                                        tab_id: surface.tab_id.clone(),
                                    },
                                )?;
                            }
                            if let Some(tab) = tabs.iter_mut().find(|tab| tab.id == surface.tab_id)
                            {
                                tab.status = surface.status;
                                tab.accent = surface.accent;
                            }
                            paint_current!(false);
                        } else {
                            staged_tabs = Some(next_tabs);
                        }
                        continue;
                    }
                    let changed = tabs != next_tabs;
                    tabs = next_tabs;
                    staged_tabs = None;
                    let listed = |id: &String| tabs.iter().any(|tab| &tab.id == id);
                    if !pending_close.as_ref().is_none_or(listed) {
                        pending_close = None;
                    }
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
                        viewed = None;
                        requested_view = None;
                        latest_surface.clear();
                        close_fallback = None;
                        paint_current!(true);
                    } else if changed {
                        paint_current!(false);
                    }
                }
                "tab.created" | "tab.selected" => {
                    let (_, target): (_, TabTarget) = wire::body(&payload)?;
                    if pending_settings_create && kind.message_type == "tab.created" {
                        pending_settings_create = false;
                        pending_settings_tab = Some(target.tab_id.clone());
                    }
                    requested_view = Some(target.tab_id.clone());
                    wire::send(&mut stream, "tab.view", None, target)?;
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
                    requested_view = None;
                    staged_tabs = None;
                    pending_surface = None;
                    pending_settings_create = false;
                    pending_settings_tab = None;
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
                    print_hint(tabs.len());
                    return Ok(());
                }
                "refused" => {
                    terminal.restore()?;
                    return Err("a1 is attached in another terminal".to_owned());
                }
                "holder.exit" => {
                    if let Some(tab) = viewed
                        .as_ref()
                        .and_then(|id| tabs.iter_mut().find(|tab| &tab.id == id))
                    {
                        tab.status = "crashed".into();
                    }
                    paint_current!(false);
                }
                "failure.status" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    failed_tab = viewed.clone();
                    transient_notice = Some(result.message.unwrap_or_else(|| "tab failed".into()));
                    paint_current!(false);
                }
                "viewer.status" | "input.rejected" | "input.uncertain" | "recovery.notice" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    if result.message.is_some() {
                        transient_notice = result.message;
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
        }
        if strip::animations_active(&tabs)
            && last_strip_frame.elapsed() >= strip::animation_interval(&tabs)
        {
            paint_current!(false);
            last_strip_frame = Instant::now();
        }
        if time_format.refresh() {
            paint_current!(false);
        }
        let current_clock_minute = clock_minute();
        if current_clock_minute != displayed_clock_minute {
            displayed_clock_minute = current_clock_minute;
            if !tabs.is_empty() {
                paint_current!(false);
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
            if update_drag(current_drag, column, true, &tabs, &strip_frame) {
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
        // Invariant: a prompt belongs to the view it was opened in; a strip click, shortcut, or
        // tab removal that changes the viewed tab cancels it instead of letting it swallow the
        // new tab's keys.
        if prompt_view != viewed {
            pending_close = None;
            rename = None;
            popup = None;
            prompt_view = viewed.clone();
        }
        let failed = failure_applies(failed_tab.as_deref(), viewed.as_deref());
        match next {
            Event::Key(key) if matches!(key.kind, KeyEventKind::Press | KeyEventKind::Repeat) => {
                transient_notice = None;
                if let Some(tab_id) = pending_close.take() {
                    if key.code == KeyCode::Enter {
                        close_fallback = close_fallback_for(&tabs, viewed.as_deref(), &tab_id);
                        wire::send(&mut stream, "tab.close", None, TabTarget { tab_id })?;
                    } else if key.code != KeyCode::Esc {
                        pending_close = Some(tab_id);
                    }
                    paint_current!(false);
                    continue;
                }
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
                            KeyCode::Backspace => editor.backspace(),
                            KeyCode::Delete => editor.delete(),
                            KeyCode::Left => editor.move_cursor(editor.cursor.saturating_sub(1)),
                            KeyCode::Right => {
                                editor.move_cursor((editor.cursor + 1).min(editor.len()))
                            }
                            KeyCode::Home => editor.move_cursor(0),
                            KeyCode::End => editor.move_cursor(editor.len()),
                            KeyCode::Char('a' | 'A')
                                if key.modifiers.contains(KeyModifiers::CONTROL) =>
                            {
                                editor.select_all();
                            }
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
                        "tabs.new" => wire::send(&mut stream, "tab.create", None, create.clone())?,
                        "tabs.close" => {
                            if let Some(tab_id) = viewed.clone() {
                                let busy =
                                    tabs.iter().find(|tab| tab.id == tab_id).is_some_and(|tab| {
                                        matches!(tab.status.as_str(), "working" | "needs-input")
                                    });
                                if busy {
                                    pending_close = Some(tab_id);
                                } else {
                                    close_fallback =
                                        close_fallback_for(&tabs, viewed.as_deref(), &tab_id);
                                    wire::send(
                                        &mut stream,
                                        "tab.close",
                                        None,
                                        TabTarget { tab_id },
                                    )?;
                                }
                            }
                        }
                        "tabs.rename" => {
                            if let Some(tab_id) = viewed.clone() {
                                let name = tabs
                                    .iter()
                                    .find(|tab| tab.id == tab_id)
                                    .map(|tab| tab.name.clone())
                                    .unwrap_or_default();
                                rename = Some(RenameEditor::new(tab_id, name));
                            }
                        }
                        "tabs.next" | "tabs.previous" => {
                            if !tabs.is_empty() {
                                let current = viewed
                                    .as_ref()
                                    .and_then(|id| tabs.iter().position(|tab| &tab.id == id))
                                    .unwrap_or(0);
                                let index = if action == "tabs.next" {
                                    (current + 1) % tabs.len()
                                } else {
                                    (current + tabs.len() - 1) % tabs.len()
                                };
                                let tab_id = tabs[index].id.clone();
                                requested_view = Some(tab_id.clone());
                                wire::send(&mut stream, "tab.view", None, TabTarget { tab_id })?;
                            }
                        }
                        "tabs.moveRight" | "tabs.moveLeft" => {
                            if let Some(tab_id) = viewed.clone()
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
                            if let Some(tab) = tabs.get(index) {
                                requested_view = Some(tab.id.clone());
                                wire::send(
                                    &mut stream,
                                    "tab.view",
                                    None,
                                    TabTarget {
                                        tab_id: tab.id.clone(),
                                    },
                                )?;
                            }
                        }
                        _ => {}
                    }
                    paint_current!(false);
                    continue;
                }
                let bytes = encode_key(key.code, key.modifiers);
                if bytes.is_empty() {
                    continue;
                }
                let now = started.elapsed().as_millis() as u64;
                if chord.admit(now, is_ctrl_c_bytes(&bytes)) == CtrlCDisposition::Detach {
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
                    print_hint(tabs.len());
                    return Ok(());
                }
                let viewed_status = viewed
                    .as_ref()
                    .and_then(|id| tabs.iter().find(|tab| &tab.id == id))
                    .map(|tab| tab.status.as_str());
                if matches!(viewed_status, Some("stalled" | "unresponsive"))
                    && matches!(
                        (key.code, key.modifiers),
                        (KeyCode::Char('r' | 'R'), KeyModifiers::NONE)
                    )
                {
                    if let Some(tab_id) = viewed.clone() {
                        wire::send(&mut stream, "tab.restart", None, TabTarget { tab_id })?;
                    }
                    continue;
                }
                let bytes = if failed {
                    match (key.code, key.modifiers) {
                        (KeyCode::Char(value @ ('r' | 'R' | 'f' | 'F')), KeyModifiers::NONE) => {
                            vec![value as u8]
                        }
                        (KeyCode::Char('w' | 'W'), modifiers)
                            if modifiers.contains(KeyModifiers::ALT) =>
                        {
                            b"x".to_vec()
                        }
                        _ => continue,
                    }
                } else {
                    bytes
                };
                wire::send(
                    &mut stream,
                    "input",
                    None,
                    Input {
                        bytes,
                        paste: false,
                        epoch: 0,
                    },
                )?;
            }
            Event::Paste(text) => {
                if let Some(editor) = rename.as_mut() {
                    for value in text.chars().filter(|value| !value.is_control()) {
                        editor.insert(value);
                    }
                    paint_current!(false);
                    continue;
                }
                if failed || pending_close.is_some() || popup.is_some() {
                    continue;
                }
                let bytes = text.into_bytes();
                wire::send(
                    &mut stream,
                    "paste.start",
                    None,
                    PasteStart {
                        bytes: bytes.len(),
                        epoch: 0,
                    },
                )?;
                for chunk in bytes.chunks(MAX_INPUT_BYTES) {
                    wire::send(
                        &mut stream,
                        "input",
                        None,
                        Input {
                            bytes: chunk.to_vec(),
                            paste: true,
                            epoch: 0,
                        },
                    )?;
                }
            }
            Event::Resize(cols, rows) => {
                let rows = tab_rows(rows).map_err(str::to_owned)?;
                columns = cols;
                create.columns = cols;
                create.rows = rows;
                if let Some(menu) = popup.as_mut() {
                    menu.resize(columns);
                }
                paint_current!(true);
                wire::send(
                    &mut stream,
                    "resize",
                    None,
                    Resize {
                        columns: cols,
                        rows,
                        epoch: 0,
                    },
                )?;
            }
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
                wire::send(
                    &mut stream,
                    "input",
                    None,
                    Input {
                        bytes: b"\x1b[I".to_vec(),
                        paste: false,
                        epoch: 0,
                    },
                )?;
            }
            Event::FocusLost if !failed => wire::send(
                &mut stream,
                "input",
                None,
                Input {
                    bytes: b"\x1b[O".to_vec(),
                    paste: false,
                    epoch: 0,
                },
            )?,
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
                        &tabs,
                        &strip_frame,
                    ) {
                        paint_current!(false);
                    }
                    continue;
                }
                if matches!(mouse.kind, MouseEventKind::Up(MouseButton::Left))
                    && let Some(mut completed) = drag.take()
                {
                    update_drag(
                        &mut completed,
                        mouse.column,
                        mouse.row == 0,
                        &tabs,
                        &strip_frame,
                    );
                    let from = tabs.iter().position(|tab| tab.id == completed.tab_id);
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
                                target_index,
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
                            paint_current!(false);
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
                                    drop_index: tabs.iter().position(|tab| tab.id == tab_id),
                                    expected_revision: registry_revision,
                                });
                                if viewed.as_deref() != Some(tab_id.as_str()) {
                                    requested_view = Some(tab_id.clone());
                                    wire::send(
                                        &mut stream,
                                        "tab.view",
                                        None,
                                        TabTarget { tab_id },
                                    )?;
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
                                    viewed.as_deref(),
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
                if let Some(bytes) = encode_mouse(mouse.kind, mouse.column, mouse.row) {
                    wire::send(
                        &mut stream,
                        "input",
                        None,
                        Input {
                            bytes,
                            paste: false,
                            epoch: 0,
                        },
                    )?;
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

struct OuterTerminal {
    restored: bool,
    kitty_keyboard: bool,
}
impl OuterTerminal {
    fn enter() -> Result<Self, String> {
        enable_raw_mode().map_err(|error| format!("enable outer raw mode: {error}"))?;
        let kitty_keyboard = query_kitty_keyboard(Duration::from_millis(200)).unwrap_or(false);
        let mut value = Self {
            restored: false,
            kitty_keyboard,
        };
        value.write(ENTER_OUTER_MODES)?;
        if kitty_keyboard {
            value.write(KITTY_ENABLE)?;
        }
        Ok(value)
    }
    fn write(&mut self, bytes: &[u8]) -> Result<(), String> {
        let mut out = stdout().lock();
        out.write_all(bytes)
            .and_then(|()| out.flush())
            .map_err(|error| format!("write outer terminal: {error}"))
    }
    fn restore(&mut self) -> Result<(), String> {
        if self.restored {
            return Ok(());
        }
        if self.kitty_keyboard {
            self.write(KITTY_RESTORE)?;
        }
        self.write(RESTORE_OUTER_MODES)?;
        disable_raw_mode().map_err(|error| format!("restore cooked input: {error}"))?;
        self.restored = true;
        Ok(())
    }
}
impl Drop for OuterTerminal {
    fn drop(&mut self) {
        if !self.restored {
            if self.kitty_keyboard {
                let _ = self.write(KITTY_RESTORE);
            }
            let _ = self.write(RESTORE_OUTER_MODES);
            let _ = disable_raw_mode();
            self.restored = true;
        }
    }
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
    fn initial_surface_adopts_the_servers_default_without_overwriting_a_request() {
        let mut requested = None;
        adopt_initial_surface(None, &mut requested, "server-default");
        assert_eq!(requested.as_deref(), Some("server-default"));

        adopt_initial_surface(None, &mut requested, "later-surface");
        assert_eq!(requested.as_deref(), Some("server-default"));

        requested = None;
        adopt_initial_surface(Some("viewed"), &mut requested, "other");
        assert_eq!(requested, None);
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
        assert_eq!(prompt_overlay_notice(None), None);
        assert_eq!(
            prompt_overlay_notice(Some("agent")).as_deref(),
            Some("Stop \"agent\"? Enter stop · Esc cancel")
        );
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
        assert!(add_rendered.contains("Settings"));
        assert!(add_rendered.contains('─'));

        std::fs::write(
            profile.path().join("keybindings.json"),
            br#"{"tabs.close":"ctrl+x","tabs.rename":"alt+r"}"#,
        )
        .unwrap();
        let rebound = PopupMenu::context("tab-1".into(), 0, 80, &TabBindings::load(profile.path()));
        let rebound_rendered = rebound.render();
        assert!(rebound_rendered.contains("Ctrl+X"));
        assert!(rebound_rendered.contains("Alt+R"));
        assert!(
            render_notice("Stop \"agent\"? Enter stop · Esc cancel", 80)
                .contains("Stop \"agent\"?")
        );
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
        let frame = compose_presentation(&strip, b"SURFACE", Some("OVERLAY"), true);
        assert!(frame.starts_with(BEGIN_SYNCHRONIZED_UPDATE));
        assert!(frame.ends_with(END_SYNCHRONIZED_UPDATE));
        let text = String::from_utf8(frame).unwrap();
        assert!(text.find("\x1b[2J").unwrap() < text.find(" + ").unwrap());
        assert!(text.find(" + ").unwrap() < text.find("SURFACE").unwrap());
        assert!(text.find("SURFACE").unwrap() < text.find("OVERLAY").unwrap());
    }

    #[test]
    fn new_tab_failures_name_their_reason() {
        assert_eq!(
            tab_create_failure_notice(Some("tab-limit")),
            "Could not open a tab: the tab limit is reached"
        );
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
    fn mode_restore_disables_every_enabled_outer_mode() {
        for mode in ["1049", "2004", "1004", "1000", "1003", "1006"] {
            assert!(String::from_utf8_lossy(ENTER_OUTER_MODES).contains(&format!("?{mode}h")));
            assert!(String::from_utf8_lossy(RESTORE_OUTER_MODES).contains(&format!("?{mode}l")));
        }
        assert_eq!(BEGIN_SYNCHRONIZED_UPDATE, b"\x1b[?2026h");
        assert_eq!(END_SYNCHRONIZED_UPDATE, b"\x1b[?2026l");
        assert_eq!(KITTY_ENABLE, b"\x1b[>1u");
        assert_eq!(KITTY_RESTORE, b"\x1b[<1u");
        assert!(kitty_query_answered(b"noise\x1b[?3u\x1b[?1;2c"));
        assert!(!kitty_query_answered(b"\x1b[?1;2c"));
        assert!(!kitty_query_answered(b"\x1b[?u"));
    }
}
