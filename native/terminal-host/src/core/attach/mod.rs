//! Sans-IO input and strip values for the resident attach client. The attach role converts
//! terminal events and rendered strip frames into these, so attach interaction state can be
//! driven without a terminal.

use std::collections::{HashMap, VecDeque};
use std::time::Duration;

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

mod machine;

pub use machine::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyCode {
    Char(char),
    F(u8),
    Enter,
    Tab,
    BackTab,
    Backspace,
    Esc,
    Delete,
    Insert,
    Up,
    Down,
    Left,
    Right,
    Home,
    End,
    PageUp,
    PageDown,
    Other,
}

/// `other` records any modifier beyond shift, control, and alt (super, hyper, meta), so a
/// binding that requires no modifiers still refuses those chords.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Modifiers {
    pub shift: bool,
    pub control: bool,
    pub alt: bool,
    pub other: bool,
}

impl Modifiers {
    pub const NONE: Self = Self {
        shift: false,
        control: false,
        alt: false,
        other: false,
    };

    pub fn is_empty(self) -> bool {
        self == Self::NONE
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyKind {
    Press,
    Repeat,
    Release,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttachKey {
    pub code: KeyCode,
    pub modifiers: Modifiers,
    pub kind: KeyKind,
}

impl AttachKey {
    pub fn pressed(self) -> bool {
        matches!(self.kind, KeyKind::Press | KeyKind::Repeat)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MouseKind {
    Down(MouseButton),
    Up(MouseButton),
    Drag(MouseButton),
    Moved,
    ScrollDown,
    ScrollUp,
    ScrollLeft,
    ScrollRight,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttachMouse {
    pub kind: MouseKind,
    pub column: u16,
    pub row: u16,
    pub modifiers: Modifiers,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StripHitKind {
    View(String),
    Overflow,
    New,
}

/// The interactive part of a rendered strip: column ranges `[start, end)` and the tabs that did
/// not fit.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct StripSnapshot {
    pub hits: Vec<(u16, u16, StripHitKind)>,
    pub hidden_tabs: Vec<String>,
}

/// The rendered strip geometry attach interaction reads.
pub trait StripLayout {
    /// Column ranges `[start, end)` of the visible tab chips, in strip order.
    fn tab_spans(&self) -> Vec<(u16, u16, &str)>;
}

impl StripLayout for StripSnapshot {
    fn tab_spans(&self) -> Vec<(u16, u16, &str)> {
        self.hits
            .iter()
            .filter_map(|(start, end, hit)| match hit {
                StripHitKind::View(id) => Some((*start, *end, id.as_str())),
                _ => None,
            })
            .collect()
    }
}

/// Displayed key labels for tab actions such as `tabs.close`; empty when an action is unbound.
pub trait ShortcutLabels {
    fn label(&self, action: &str) -> String;
}

impl StripSnapshot {
    pub fn hit(&self, column: u16) -> Option<&StripHitKind> {
        self.hits
            .iter()
            .find(|(start, end, _)| column >= *start && column < *end)
            .map(|(_, _, hit)| hit)
    }
}

/// A registry tab as the attach client presents it, without the strip's animation clock.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AttachTab {
    pub id: String,
    pub name: String,
    pub name_source: String,
    pub status: String,
    pub accent: Option<String>,
}

/// The tab fields attach interaction reads, shared by core tabs and the strip's rendered tabs.
pub trait TabView {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn status(&self) -> &str;
    fn set_status(&mut self, status: String);
}

impl TabView for AttachTab {
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

/// True when the failed tab's restricted input rules apply: only while that tab is viewed.
pub fn failure_applies(failed_tab: Option<&str>, viewed: Option<&str>) -> bool {
    failed_tab.is_some() && failed_tab == viewed
}

/// Invariant: a rejection notice answers input the person typed, pasted, or clicked. Focus
/// traffic is forwarded too, and terminals such as ConPTY synthesize it on attach, so its
/// rejection stays silent and a read-only viewer's first frame keeps the child's top row.
pub fn rejection_notice(user_input_pending: &mut bool, message: Option<String>) -> Option<String> {
    let armed = std::mem::replace(user_input_pending, false);
    message.filter(|_| armed)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PopupKind {
    Context,
    Add,
    Overflow,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PopupAction {
    Close,
    Rename,
    NewAgent,
    Settings,
    View(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PopupItem {
    pub label: String,
    pub shortcut: String,
    pub action: Option<PopupAction>,
    pub separator: bool,
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
pub struct PopupMenu {
    pub kind: PopupKind,
    pub tab_id: Option<String>,
    pub anchor_column: u16,
    pub column: u16,
    pub width: u16,
    pub hovered: Option<usize>,
    pub items: Vec<PopupItem>,
}

impl PopupMenu {
    pub fn context(
        tab_id: String,
        column: u16,
        columns: u16,
        shortcuts: &(impl ShortcutLabels + ?Sized),
    ) -> Self {
        let mut items = vec![PopupItem::action(
            "Close",
            shortcuts.label("tabs.close"),
            PopupAction::Close,
        )];
        if !is_utility_tab(&tab_id) {
            items.push(PopupItem::action(
                "Rename",
                shortcuts.label("tabs.rename"),
                PopupAction::Rename,
            ));
        }
        Self::new(PopupKind::Context, Some(tab_id), column, columns, items)
    }

    pub fn add(
        column: u16,
        columns: u16,
        shortcuts: &(impl ShortcutLabels + ?Sized),
        settings_shown: bool,
    ) -> Self {
        Self::new(
            PopupKind::Add,
            None,
            column,
            columns,
            vec![
                PopupItem::action(
                    "+ Agent",
                    shortcuts.label("tabs.new"),
                    PopupAction::NewAgent,
                ),
                PopupItem::separator(),
                // Invariant: labels align after the `+ ` marker, so Settings starts under Agent.
                PopupItem::action(
                    if settings_shown {
                        "✓ Settings"
                    } else {
                        "  Settings"
                    },
                    shortcuts.label("tabs.settings"),
                    PopupAction::Settings,
                ),
            ],
        )
    }

    pub fn overflow<T: TabView>(
        column: u16,
        columns: u16,
        hidden_tabs: &[String],
        tabs: &[T],
        viewed: Option<&str>,
    ) -> Self {
        let items = hidden_tabs
            .iter()
            .filter_map(|id| tabs.iter().find(|tab| tab.id() == id))
            .map(|tab| {
                let marker = if viewed == Some(tab.id()) { "✓" } else { " " };
                PopupItem::action(
                    format!("{marker} {}", tab.name()),
                    String::new(),
                    PopupAction::View(tab.id().to_owned()),
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

    pub fn resize(&mut self, columns: u16) {
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

    pub fn row_at(&self, column: u16, row: u16) -> Option<usize> {
        if column < self.column || column >= self.column.saturating_add(self.width) || row == 0 {
            return None;
        }
        let index = usize::from(row - 1);
        self.items.get(index).map(|_| index)
    }

    pub fn index_at(&self, column: u16, row: u16) -> Option<usize> {
        self.row_at(column, row)
            .filter(|index| self.items[*index].action.is_some())
    }

    pub fn action_at(&self, column: u16, row: u16) -> Option<PopupAction> {
        self.index_at(column, row)
            .and_then(|index| self.items[index].action.clone())
    }

    pub fn move_hover(&mut self, delta: isize) {
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
pub struct RenameEditor {
    pub tab_id: String,
    pub text: String,
    pub cursor: usize,
    selection_anchor: Option<usize>,
    undo: Vec<RenameSnapshot>,
    redo: Vec<RenameSnapshot>,
    last_edit: Option<RenameEdit>,
}

impl RenameEditor {
    pub fn new(tab_id: String, text: String) -> Self {
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

    pub fn undo(&mut self) {
        if let Some(snapshot) = self.undo.pop() {
            self.redo.push(self.snapshot());
            self.restore(snapshot);
        }
        self.last_edit = None;
    }

    pub fn redo(&mut self) {
        if let Some(snapshot) = self.redo.pop() {
            self.undo.push(self.snapshot());
            self.restore(snapshot);
        }
        self.last_edit = None;
    }

    pub fn len(&self) -> usize {
        self.text.graphemes(true).count()
    }

    pub fn is_empty(&self) -> bool {
        self.text.is_empty()
    }

    pub fn selection(&self) -> Option<(usize, usize)> {
        self.selection_anchor
            .filter(|anchor| *anchor != self.cursor)
            .map(|anchor| (anchor, self.cursor))
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

    pub fn insert(&mut self, value: char) {
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

    pub fn backspace(&mut self) {
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

    pub fn delete(&mut self) {
        self.edit(RenameEdit::Other, |editor| {
            if editor.delete_selection() || editor.cursor >= editor.len() {
                return;
            }
            let start = editor.byte_offset(editor.cursor);
            let end = editor.byte_offset(editor.cursor + 1);
            editor.text.replace_range(start..end, "");
        });
    }

    pub fn delete_word_left(&mut self) {
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

    pub fn delete_word_right(&mut self) {
        self.edit(RenameEdit::Other, |editor| {
            if editor.delete_selection() {
                return;
            }
            let end = editor.word_right_boundary();
            let (from, to) = (editor.byte_offset(editor.cursor), editor.byte_offset(end));
            editor.text.replace_range(from..to, "");
        });
    }

    pub fn move_cursor(&mut self, cursor: usize) {
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

    pub fn move_word_left(&mut self) {
        self.move_cursor(self.word_left_boundary());
    }

    pub fn move_word_right(&mut self) {
        self.move_cursor(self.word_right_boundary());
    }

    pub fn select_all(&mut self) {
        self.selection_anchor = Some(0);
        self.cursor = self.len();
        self.last_edit = None;
    }
}

/// Handles the rename editor's control-key edits; returns `false` for keys it does not own.
/// Terminals report Ctrl+Backspace as Backspace with Ctrl, Ctrl+H, or Ctrl+W.
pub fn apply_rename_control_key(
    editor: &mut RenameEditor,
    code: KeyCode,
    modifiers: Modifiers,
) -> bool {
    if !modifiers.control {
        return false;
    }
    match code {
        KeyCode::Backspace | KeyCode::Char('h' | 'H' | 'w' | 'W') => editor.delete_word_left(),
        KeyCode::Delete => editor.delete_word_right(),
        KeyCode::Char('a' | 'A') => editor.select_all(),
        KeyCode::Char('z') if !modifiers.shift => editor.undo(),
        KeyCode::Char('Z') | KeyCode::Char('z') | KeyCode::Char('y' | 'Y') => editor.redo(),
        _ => return false,
    }
    true
}

/// How long a pressed tab must be held in place before it becomes a visible drag.
pub const DRAG_HOLD: Duration = Duration::from_millis(250);

/// `started_at` is on the attach client's monotonic clock, like every `now` passed here.
#[derive(Debug, Clone)]
pub struct TabDrag {
    pub tab_id: String,
    pub start_column: u16,
    pub started_at: Duration,
    pub shown: bool,
    pub drop_index: Option<usize>,
    pub marker_column: Option<u16>,
    /// Invariant: the tab order at press time guards against rebasing a drag across topology changes.
    pub initial_order: Vec<String>,
}

pub fn drag_destination<T: TabView>(
    column: u16,
    on_strip: bool,
    tabs: &[T],
    strip: &impl StripLayout,
    tab_id: &str,
) -> Option<usize> {
    if !on_strip || tabs.len() < 2 {
        return None;
    }
    let from = tabs.iter().position(|tab| tab.id() == tab_id)?;
    let visible = strip.tab_spans();
    let last = visible.last()?;
    let boundary = visible
        .iter()
        .find(|(start, end, _)| column <= start.saturating_add(*end).saturating_div(2))
        .and_then(|(_, _, id)| tabs.iter().position(|tab| tab.id() == *id))
        .unwrap_or_else(|| {
            tabs.iter()
                .position(|tab| tab.id() == last.2)
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

pub fn update_drag<T: TabView>(
    drag: &mut TabDrag,
    column: u16,
    tabs: &[T],
    strip: &impl StripLayout,
    now: Duration,
) -> bool {
    let previous = (drag.shown, drag.drop_index, drag.marker_column);
    if !drag.shown
        && (column != drag.start_column || now.saturating_sub(drag.started_at) >= DRAG_HOLD)
    {
        drag.shown = true;
    }
    // Invariant: project a held drag onto the strip even while the pointer is below it.
    // A release, not leaving the strip, ends the gesture.
    if drag.shown {
        let next = drag_destination(column, true, tabs, strip, &drag.tab_id);
        if next != drag.drop_index {
            drag.drop_index = next;
            drag.marker_column = current_drag_marker_column(drag, tabs, strip);
        }
    }
    previous != (drag.shown, drag.drop_index, drag.marker_column)
}

fn current_drag_marker_column<T: TabView>(
    drag: &TabDrag,
    tabs: &[T],
    strip: &impl StripLayout,
) -> Option<u16> {
    let from = tabs.iter().position(|tab| tab.id() == drag.tab_id)?;
    let to = drag.drop_index?;
    if !drag.shown || from == to {
        return None;
    }
    let target = tabs.get(to)?;
    strip
        .tab_spans()
        .into_iter()
        .find(|(_, _, id)| *id == target.id())
        .map(|(start, end, _)| if to < from { start } else { end })
}

pub fn drag_marker_column<T: TabView>(drag: &TabDrag, tabs: &[T]) -> Option<u16> {
    let from = tabs.iter().position(|tab| tab.id() == drag.tab_id)?;
    let to = drag.drop_index?;
    if drag.shown && from != to && tabs.get(to).is_some() {
        drag.marker_column
    } else {
        None
    }
}

/// Invariant: singleton utility tabs, Settings and Changelog, are never Agents: they are closed
/// but not renamed, own no session, and never count as running Agents.
pub fn is_utility_tab(id: &str) -> bool {
    id.starts_with("settings-") || id.starts_with("changelog-")
}

/// The viewed Settings tab is the close target when its shortcut toggles it off.
pub fn settings_toggle_closes(viewed: Option<&str>) -> Option<&str> {
    viewed.filter(|id| id.starts_with("settings-"))
}

/// The tabs the strip, jumps, and drags present. A running Settings tab stays hidden until it is
/// viewed in this session, and after the Settings shortcut hides it, so its process can be reused
/// instantly instead of starting a new one.
pub fn shown_tabs<T: TabView + Clone>(
    tabs: &[T],
    viewed: Option<&str>,
    settings_shown: bool,
) -> Vec<T> {
    tabs.iter()
        .filter(|tab| {
            !tab.id().starts_with("settings-") || settings_shown || viewed == Some(tab.id())
        })
        .cloned()
        .collect()
}

/// How long a tab must stay starting or restoring before its chip shows the lifecycle spinner.
pub const STARTING_GLYPH_DELAY: Duration = Duration::from_millis(500);

/// Hides a starting chip's spinner for its first moments. A tab that becomes ready quickly
/// otherwise shows a spinner that vanishes at once and shifts its title: a visible flash.
pub fn debounce_starting_glyphs<T: TabView>(
    shown: &mut [T],
    since: &mut HashMap<String, Duration>,
    now: Duration,
) {
    let starting = |tab: &T| matches!(tab.status(), "starting" | "restoring");
    since.retain(|id, _| shown.iter().any(|tab| tab.id() == id && starting(tab)));
    for tab in shown.iter_mut().filter(|tab| starting(tab)) {
        let began = *since.entry(tab.id().to_owned()).or_insert(now);
        if now.saturating_sub(began) < STARTING_GLYPH_DELAY {
            tab.set_status("idle".into());
        }
    }
}

/// How long a chip keeps its last glyph when its status momentarily reports none.
pub const GLYPH_SWAP_HOLD: Duration = Duration::from_millis(300);

/// Keeps a chip's previous glyph while its status briefly has none, such as the idle report
/// between a working spinner and the finished checkmark, so glyphs swap in place and the title
/// never shifts. Returns when the earliest active hold expires, so the strip repaints then.
/// `has_glyph` reports whether a status draws a chip glyph.
pub fn hold_status_glyphs<T: TabView>(
    shown: &mut [T],
    held: &mut HashMap<String, (String, Duration)>,
    now: Duration,
    has_glyph: impl Fn(&str) -> bool,
) -> Option<Duration> {
    held.retain(|id, _| shown.iter().any(|tab| tab.id() == id));
    let mut expires: Option<Duration> = None;
    for tab in shown.iter_mut() {
        if has_glyph(tab.status()) {
            held.insert(tab.id().to_owned(), (tab.status().to_owned(), now));
            continue;
        }
        let Some((status, seen)) = held.get(tab.id()).cloned() else {
            continue;
        };
        let until = seen + GLYPH_SWAP_HOLD;
        if now < until {
            tab.set_status(status);
            expires = Some(expires.map_or(until, |earliest| earliest.min(until)));
        } else {
            held.remove(tab.id());
        }
    }
    expires
}

/// Maps an insertion index among shown tabs to the registry index the server reorders by.
pub fn registry_index<T: TabView>(shown: &[T], tabs: &[T], shown_index: usize) -> usize {
    shown
        .get(shown_index)
        .and_then(|target| tabs.iter().position(|tab| tab.id() == target.id()))
        .unwrap_or_else(|| {
            shown
                .last()
                .and_then(|last| tabs.iter().position(|tab| tab.id() == last.id()))
                .map_or(tabs.len(), |index| index + 1)
        })
}

/// Decides whether buttonless pointer motion over the body reaches the child. Motion is never
/// deferred behind a pending view, where it would exhaust the budget that typed input needs,
/// and is dropped when the child's reported modes show it does not track the mouse.
/// `mouse_tracking` is the child's reported mode, absent before it reports any.
pub fn forward_pointer_motion(view_pending: bool, mouse_tracking: Option<bool>) -> bool {
    !view_pending && mouse_tracking.unwrap_or(true)
}

/// A holder's first surface carries a provisional `idle` before the tab bridge reports; it must
/// not flip a starting chip to idle and back. Bridge status and registry snapshots still apply.
pub fn holder_idle_precedes_bridge(chip: &str, surface: &str) -> bool {
    surface == "idle" && matches!(chip, "starting" | "restoring")
}

pub const DEFERRED_INPUT_BYTES: usize = 4 * 1024 * 1024;
pub const DEFERRED_INPUT_FRAMES: usize = 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DeferredInputTarget {
    Tab(String),
    NextCreated,
}

#[derive(Debug, Default)]
pub struct DeferredInput {
    frames: VecDeque<(DeferredInputTarget, Vec<u8>)>,
    bytes: usize,
}

impl DeferredInput {
    pub fn push(
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

    pub fn retarget_created(&mut self, target: &str) {
        for (frame_target, _) in &mut self.frames {
            if *frame_target == DeferredInputTarget::NextCreated {
                *frame_target = DeferredInputTarget::Tab(target.to_owned());
            }
        }
    }

    pub fn resolve(&mut self, target: &str) -> (Vec<Vec<u8>>, bool) {
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

    pub fn discard_tab(&mut self, target: &str) -> bool {
        self.discard(&DeferredInputTarget::Tab(target.to_owned()))
    }

    pub fn discard_created(&mut self) -> bool {
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CloseFallback {
    candidates: Vec<String>,
}

impl CloseFallback {
    pub fn resolve<T: TabView>(&self, survivors: &[T]) -> Option<String> {
        self.candidates
            .iter()
            .find(|id| survivors.iter().any(|tab| tab.id() == id.as_str()))
            .cloned()
    }
}

/// The tabs to view after closing the viewed tab, nearest first, predecessor before successor.
pub fn close_fallback_for<T: TabView>(
    tabs: &[T],
    viewed: Option<&str>,
    closing: &str,
) -> Option<CloseFallback> {
    if viewed != Some(closing) {
        return None;
    }
    let index = tabs.iter().position(|tab| tab.id() == closing)?;
    let mut candidates = Vec::with_capacity(tabs.len().saturating_sub(1));
    for distance in 1..tabs.len() {
        if let Some(left) = index.checked_sub(distance).and_then(|left| tabs.get(left)) {
            candidates.push(left.id().to_owned());
        }
        if let Some(right) = tabs.get(index + distance) {
            candidates.push(right.id().to_owned());
        }
    }
    Some(CloseFallback { candidates })
}

#[cfg(test)]
mod tests {
    use super::*;

    const CONTROL: Modifiers = Modifiers {
        control: true,
        ..Modifiers::NONE
    };
    const CONTROL_SHIFT: Modifiers = Modifiers {
        shift: true,
        control: true,
        ..Modifiers::NONE
    };

    fn has_glyph(status: &str) -> bool {
        !matches!(status, "idle" | "")
    }

    #[test]
    fn snapshot_hit_uses_half_open_ranges() {
        let snapshot = StripSnapshot {
            hits: vec![
                (0, 4, StripHitKind::View("a".into())),
                (4, 6, StripHitKind::New),
            ],
            hidden_tabs: Vec::new(),
        };
        assert_eq!(snapshot.hit(0), Some(&StripHitKind::View("a".into())));
        assert_eq!(snapshot.hit(3), Some(&StripHitKind::View("a".into())));
        assert_eq!(snapshot.hit(4), Some(&StripHitKind::New));
        assert_eq!(snapshot.hit(6), None);
    }

    #[test]
    fn modifiers_and_key_kind_predicates() {
        assert!(Modifiers::NONE.is_empty());
        assert!(
            !Modifiers {
                other: true,
                ..Modifiers::NONE
            }
            .is_empty()
        );
        let key = |kind| AttachKey {
            code: KeyCode::Enter,
            modifiers: Modifiers::NONE,
            kind,
        };
        assert!(key(KeyKind::Press).pressed());
        assert!(key(KeyKind::Repeat).pressed());
        assert!(!key(KeyKind::Release).pressed());
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
        assert!(!forward_pointer_motion(true, Some(true)));
        assert!(!forward_pointer_motion(true, None));
        assert!(!forward_pointer_motion(false, Some(false)));
        assert!(forward_pointer_motion(false, Some(true)));
        assert!(forward_pointer_motion(false, None));

        // Invariant: Keys typed while a new Agent starts keep their place even after heavy pointer motion,
        // because motion is no longer deferred.
        let mut deferred = DeferredInput::default();
        for _ in 0..500 {
            if forward_pointer_motion(true, Some(true)) {
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
        let tab = |status: &str| AttachTab {
            id: "tab-1".into(),
            name: "Agent".into(),
            name_source: "default".into(),
            status: status.into(),
            accent: None,
        };
        let mut held = HashMap::new();
        let start = Duration::from_secs(10);
        let mut working = vec![tab("working")];
        assert_eq!(
            hold_status_glyphs(&mut working, &mut held, start, has_glyph),
            None
        );

        // Invariant: The momentary idle between the spinner and the checkmark keeps the spinner.
        let mut gap = vec![tab("idle")];
        let expires = hold_status_glyphs(
            &mut gap,
            &mut held,
            start + Duration::from_millis(20),
            has_glyph,
        );
        assert_eq!(gap[0].status, "working");
        assert_eq!(expires, Some(start + GLYPH_SWAP_HOLD));
        let mut done = vec![tab("done")];
        hold_status_glyphs(
            &mut done,
            &mut held,
            start + Duration::from_millis(40),
            has_glyph,
        );
        assert_eq!(done[0].status, "done");

        // Invariant: A glyph that really goes away is released after the hold.
        let mut idle = vec![tab("idle")];
        let late = start + Duration::from_millis(40) + GLYPH_SWAP_HOLD;
        assert_eq!(
            hold_status_glyphs(&mut idle, &mut held, late, has_glyph),
            None
        );
        assert_eq!(idle[0].status, "idle");
    }

    #[test]
    fn a_quick_start_never_flashes_the_starting_spinner() {
        let tab = |status: &str| AttachTab {
            id: "tab-2".into(),
            name: "agent 2".into(),
            name_source: "default".into(),
            status: status.into(),
            accent: None,
        };
        let mut since = HashMap::new();
        let start = Duration::from_secs(10);
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
        let tab = |id: &str| AttachTab {
            id: id.into(),
            name: id.into(),
            name_source: "default".into(),
            status: "idle".into(),
            accent: None,
        };
        let tabs = vec![tab("tab-1"), tab("settings-1"), tab("tab-2")];
        let ids = |shown: Vec<AttachTab>| shown.into_iter().map(|tab| tab.id).collect::<Vec<_>>();
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
    fn rename_deletes_whole_words_and_ignores_control_letters() {
        let mut editor = RenameEditor::new("tab-a".into(), "fix login flow".into());
        editor.move_cursor(4);
        assert!(apply_rename_control_key(
            &mut editor,
            KeyCode::Delete,
            CONTROL
        ));
        assert_eq!(editor.text, "fix flow");
        assert_eq!(editor.cursor, 4);
        editor.move_cursor(editor.len());
        assert!(apply_rename_control_key(
            &mut editor,
            KeyCode::Backspace,
            CONTROL
        ));
        assert_eq!(editor.text, "fix ");
        assert!(apply_rename_control_key(
            &mut editor,
            KeyCode::Char('w'),
            CONTROL
        ));
        assert_eq!(editor.text, "");
        assert!(!apply_rename_control_key(
            &mut editor,
            KeyCode::Delete,
            Modifiers::NONE
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
            CONTROL
        ));
        assert_eq!((editor.text.as_str(), editor.cursor), ("agent one", 9));
        apply_rename_control_key(&mut editor, KeyCode::Char('z'), CONTROL);
        assert_eq!((editor.text.as_str(), editor.cursor), ("agent", 5));
        apply_rename_control_key(&mut editor, KeyCode::Char('y'), CONTROL);
        assert_eq!(editor.text, "agent one");
        apply_rename_control_key(&mut editor, KeyCode::Char('Z'), CONTROL_SHIFT);
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
        assert_eq!(editor.cursor, 2);

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
    fn failure_input_rules_apply_only_to_the_viewed_failed_tab() {
        assert!(failure_applies(Some("tab-a"), Some("tab-a")));
        assert!(!failure_applies(Some("tab-a"), Some("tab-b")));
        assert!(!failure_applies(None, Some("tab-a")));
        assert!(!failure_applies(None, None));
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
        let tab = |id: &str| AttachTab {
            id: id.into(),
            name: id.into(),
            name_source: "default".into(),
            status: "idle".into(),
            accent: None,
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
        assert_eq!(fallback.resolve::<AttachTab>(&[]), None);
        assert_eq!(
            close_fallback_for(&[tab("a")], Some("a"), "a")
                .unwrap()
                .resolve::<AttachTab>(&[]),
            None
        );
    }
}
