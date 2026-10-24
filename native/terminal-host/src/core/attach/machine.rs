//! The attach client's interaction state machine. Input, server notices, and ticks step one
//! `State`, which holds at most one interaction mode, and return the requests, view changes,
//! forwarded input, and paints the attach role applies. Coherent surface transitions stay with
//! the role's presentation view model; this state holds the client's own intent.

use std::time::Duration;

use super::{
    AttachKey, AttachMouse, CloseFallback, CommandPalette, DRAG_HOLD, DeferredInput,
    DeferredInputTarget, KeyCode, MouseButton, MouseKind, PaletteKey, PlusMenu, PopupAction,
    PopupKind, PopupMenu, RenameEditor, ShortcutLabels, StripHitKind, StripSnapshot, TabDrag,
    TabView, apply_rename_control_key, close_fallback_for, failure_applies, forward_pointer_motion,
    is_utility_tab, registry_index, rejection_notice, settings_toggle_closes, shown_tabs,
    update_drag,
};

/// How long the client waits, with tabs present and no Settings tab, before starting a hidden one
/// so the Settings shortcut opens instantly.
pub const SETTINGS_PREWARM_DELAY: Duration = Duration::ZERO;

/// The strip target under the pointer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Hover {
    Tab(String),
    Overflow,
    New,
}

/// The one interaction that owns the pointer and keyboard before the child does.
#[derive(Debug, Clone, Default)]
pub enum Mode {
    #[default]
    Idle,
    Popup(PopupMenu),
    Rename(RenameEditor),
    Drag(TabDrag),
    /// The command palette, which takes every key and paste and ignores the pointer.
    Palette(CommandPalette),
}

impl Mode {
    pub fn popup(&self) -> Option<&PopupMenu> {
        match self {
            Self::Popup(menu) => Some(menu),
            _ => None,
        }
    }

    pub fn rename(&self) -> Option<&RenameEditor> {
        match self {
            Self::Rename(editor) => Some(editor),
            _ => None,
        }
    }

    pub fn palette(&self) -> Option<&CommandPalette> {
        match self {
            Self::Palette(palette) => Some(palette),
            _ => None,
        }
    }

    pub fn drag(&self) -> Option<&TabDrag> {
        match self {
            Self::Drag(drag) => Some(drag),
            _ => None,
        }
    }

    /// Closes an open popup and returns it; any other mode stays.
    fn take_popup(&mut self) -> Option<PopupMenu> {
        if !matches!(self, Self::Popup(_)) {
            return None;
        }
        match std::mem::take(self) {
            Self::Popup(menu) => Some(menu),
            _ => None,
        }
    }

    /// Invariant: a popup or rename prompt belongs to the view it opened in; a drag outlives the
    /// view change its own click requests.
    fn cancel_prompt(&mut self) {
        if matches!(self, Self::Popup(_) | Self::Rename(_) | Self::Palette(_)) {
            *self = Self::Idle;
        }
    }
}

/// One singleton utility kind's hidden process, started ahead of use so the tab opens at once.
#[derive(Debug, Clone, Default)]
pub struct Prewarm {
    /// The tab joined the strip: it was viewed in this session and not hidden again.
    pub shown: bool,
    /// A prewarm request awaits its `tab.created`, which must not take the view.
    pub pending: bool,
    pub absent_since: Option<Duration>,
}

/// A singleton utility kind the client prewarms: its tab-id prefix and the prewarm request.
const PREWARMED: [(&str, Request); 2] = [
    ("settings-", Request::PrewarmSettings),
    ("changelog-", Request::PrewarmChangelog),
];

/// The client's view intent beside the presentation view model's viewed and requested tabs.
#[derive(Debug, Clone, Default)]
pub struct View {
    /// The viewed tab when the current prompt opened.
    pub prompt_view: Option<String>,
    /// Invariant: a Settings tab joins the strip only once viewed in this session; the Settings
    /// shortcut hides it again while its process keeps running for an instant reopen.
    pub settings: Prewarm,
    /// Invariant: a Changelog tab is prewarmed and joins the strip the same way, so it opens at once.
    pub changelog: Prewarm,
    /// Concurrency: a shortcut can arrive after the server created a tab but before its
    /// registry snapshot reaches this client; the requested ordinal waits for that snapshot.
    pub pending_jump: Option<(usize, u64)>,
    pub pending_created_activation: bool,
}

#[derive(Debug, Default)]
pub struct State {
    pub mode: Mode,
    pub view: View,
    pub hovered: Option<Hover>,
    /// Invariant: failure input rules belong to one tab and apply only while it is viewed.
    pub failed_tab: Option<String>,
    pub close_fallback: Option<CloseFallback>,
    pub notice: Option<String>,
    pub user_input_pending: bool,
    pub registry_revision: u64,
    pub pending_manual_name: Option<(String, String)>,
    pub deferred: DeferredInput,
    /// Pointer ownership that began in the child remains there across the resident tab strip.
    child_primary_drag: bool,
    pub columns: u16,
    /// The kinds `+` offers, which the role refreshes from the live settings.
    pub plus_menu: PlusMenu,
    /// Invariant: an exited client sends, views, and paints nothing more.
    pub exited: bool,
}

/// What the role presents while a step runs.
pub struct Context<'a, T> {
    pub tabs: &'a [T],
    pub viewed: Option<&'a str>,
    pub requested: Option<&'a str>,
    pub strip: &'a StripSnapshot,
    pub shortcuts: &'a dyn ShortcutLabels,
    /// The viewed child's reported mouse tracking, absent before it reports modes.
    pub mouse_tracking: Option<bool>,
    /// The landing is the body: tabs were shown in this session and none is viewed now.
    pub landing: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Request {
    Create,
    OpenSettings,
    /// Creates or shows the singleton Changelog tab.
    OpenChangelog,
    PrewarmSettings,
    /// Starts the Changelog tab hidden, so opening it later is immediate.
    PrewarmChangelog,
    Close(String),
    Restart(String),
    Rename {
        tab_id: String,
        name: String,
    },
    Reorder {
        tab_id: String,
        target_index: usize,
        expected_revision: u64,
    },
    List,
    ClaimInput,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Effect {
    Send(Request),
    /// Requests a coherent view of the tab through the presentation view model.
    View(String),
    AwaitFirstDraw(String),
    CancelViewRequest,
    /// Shows a submitted manual name before the registry confirms it.
    Renamed {
        tab_id: String,
        name: String,
    },
    /// Writes child frames released by a committed view.
    Write(Vec<Vec<u8>>),
    /// The key reaches the child path: the role encodes it, judges the Ctrl+C chord, and then
    /// asks `forward_key` how it is delivered.
    ForwardKey,
    ForwardMouse,
    ForwardPaste(String),
    ForwardFocus {
        gained: bool,
    },
    Paint {
        clear: bool,
    },
    /// Stores the plus menu the configure dialog changed.
    SavePlusMenu(PlusMenu),
}

/// How a key that reached the child path is delivered.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum KeyForward {
    Typed,
    /// The failed tab's input rules map the key to a plain key name and byte.
    Plain {
        name: String,
        byte: u8,
    },
}

/// Server messages after the role decoded them and applied their presentation side.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ServerEvent {
    /// A Settings tab asked this client to open the tab bar's Plus Menu dialog.
    ConfigurePlus,
    ShortcutsChanged,
    Status {
        tab_id: String,
        status: String,
    },
    /// A surface the view model committed; `requested` when it completes a view request.
    Commit {
        tab_id: String,
        status: String,
        requested: bool,
    },
    Created {
        tab_id: String,
        created: bool,
    },
    CreateFailed {
        notice: String,
    },
    Renamed {
        accepted: bool,
        message: Option<String>,
    },
    RenameRefused {
        message: Option<String>,
    },
    Reordered {
        accepted: bool,
        message: Option<String>,
    },
    /// A restart or route answer.
    Answered {
        accepted: bool,
        message: Option<String>,
    },
    Closed {
        accepted: bool,
        message: Option<String>,
    },
    HolderExit,
    Failure {
        message: Option<String>,
    },
    /// Viewer, uncertain-input, and recovery notices.
    Notice {
        message: Option<String>,
    },
    InputRejected {
        message: Option<String>,
    },
    /// Another terminal holds input; this one re-claims its viewed tab without a notice.
    InputClaimLost,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Event {
    /// `action` is the tab shortcut the role's bindings resolved for the key.
    Key {
        key: AttachKey,
        action: Option<String>,
    },
    Mouse(AttachMouse),
    Paste(String),
    Resize {
        columns: u16,
    },
    Focus {
        gained: bool,
    },
    Server(ServerEvent),
    Tick,
}

fn is_settings(id: &str) -> bool {
    id.starts_with("settings-")
}

impl State {
    pub fn new(viewed: Option<String>, columns: u16) -> Self {
        Self {
            view: View {
                prompt_view: viewed,
                ..View::default()
            },
            columns,
            ..Self::default()
        }
    }

    pub fn step<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        event: Event,
        now: Duration,
    ) -> Vec<Effect> {
        let mut effects = Vec::new();
        if self.exited {
            return effects;
        }
        match event {
            Event::Server(server) => self.server(context, server, &mut effects),
            Event::Tick => self.tick(context, now, &mut effects),
            input => {
                self.sync_prompt(context.viewed);
                match input {
                    Event::Key { key, action } if key.pressed() => {
                        self.key(context, key, action.as_deref(), &mut effects)
                    }
                    Event::Mouse(mouse) => self.mouse(context, mouse, now, &mut effects),
                    Event::Paste(text) => self.paste(context, text, &mut effects),
                    Event::Resize { columns } => {
                        self.columns = columns;
                        if let Mode::Popup(menu) = &mut self.mode {
                            menu.resize(columns);
                        }
                        effects.push(Effect::Paint { clear: true });
                    }
                    Event::Focus { gained } => self.focus(context, gained, &mut effects),
                    _ => {}
                }
            }
        }
        effects
    }

    /// Ends the session: the client detached or the server refused it.
    pub fn exit(&mut self) {
        self.exited = true;
        self.mode = Mode::Idle;
    }

    fn sync_prompt(&mut self, viewed: Option<&str>) {
        if self.view.prompt_view.as_deref() != viewed {
            self.mode.cancel_prompt();
            self.view.prompt_view = viewed.map(str::to_owned);
        }
    }

    fn failed(&self, viewed: Option<&str>) -> bool {
        failure_applies(self.failed_tab.as_deref(), viewed)
    }

    fn shown<T: TabView + Clone>(&self, context: &Context<'_, T>) -> Vec<T> {
        shown_tabs(
            context.tabs,
            context.viewed,
            (self.view.settings.shown, self.view.changelog.shown),
        )
    }

    /// Routes child frames: while a view or created tab is pending they wait for that target,
    /// otherwise they are returned for delivery now.
    pub fn route_input(
        &mut self,
        requested: Option<&str>,
        frames: Vec<Vec<u8>>,
    ) -> Option<Vec<Vec<u8>>> {
        let target = if let Some(target) = requested {
            DeferredInputTarget::Tab(target.to_owned())
        } else if self.view.pending_created_activation {
            DeferredInputTarget::NextCreated
        } else {
            return Some(frames);
        };
        // Invariant: an over-budget frame is refused whole, before any prefix reaches a child,
        // and without a notice row over the pending tab.
        if self.deferred.push(target, frames).is_err() {
            self.user_input_pending = false;
        }
        None
    }

    fn key<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        key: AttachKey,
        action: Option<&str>,
        effects: &mut Vec<Effect>,
    ) {
        self.notice = None;
        if matches!(self.mode, Mode::Rename(_)) && self.rename_key(key, effects) {
            return;
        }
        if matches!(self.mode, Mode::Palette(_)) {
            self.palette_key(context, key, action, effects);
            return;
        }
        if let Some(mut menu) = self.mode.take_popup() {
            match key.code {
                KeyCode::Esc => {
                    self.hovered = None;
                    effects.push(Effect::Paint { clear: false });
                    return;
                }
                KeyCode::Up | KeyCode::Down => {
                    menu.move_hover(if key.code == KeyCode::Up { -1 } else { 1 });
                    self.mode = Mode::Popup(menu);
                    effects.push(Effect::Paint { clear: false });
                    return;
                }
                KeyCode::Enter => {
                    if let Some(action) = menu
                        .hovered
                        .and_then(|index| menu.items.get(index))
                        .and_then(|item| item.action.clone())
                    {
                        self.hovered = None;
                        self.invoke(context, action, &menu, effects);
                        effects.push(Effect::Paint { clear: false });
                    } else {
                        self.mode = Mode::Popup(menu);
                    }
                    return;
                }
                _ => {
                    self.hovered = None;
                    effects.push(Effect::Paint { clear: false });
                }
            }
        }
        if let Some(action) = action {
            self.shortcut(context, action, effects);
            effects.push(Effect::Paint { clear: false });
            return;
        }
        effects.push(Effect::ForwardKey);
    }

    /// The open palette takes every key. Its own shortcut closes it; another shortcut closes it
    /// and runs, like the entry it names.
    fn palette_key<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        key: AttachKey,
        action: Option<&str>,
        effects: &mut Vec<Effect>,
    ) {
        let Mode::Palette(palette) = &mut self.mode else {
            return;
        };
        let run = match action {
            Some("tabs.commands") => None,
            Some(action) => Some(action.to_owned()),
            None => match palette.key(key) {
                PaletteKey::Close => None,
                PaletteKey::Run(action) => Some(action.to_owned()),
                PaletteKey::Toggle(kind) => {
                    self.plus_menu.toggle(kind);
                    effects.extend([
                        Effect::SavePlusMenu(self.plus_menu),
                        Effect::Paint { clear: false },
                    ]);
                    return;
                }
                PaletteKey::Changed => {
                    effects.push(Effect::Paint { clear: false });
                    return;
                }
                PaletteKey::Ignored => return,
            },
        };
        self.mode = Mode::Idle;
        if let Some(action) = run {
            self.shortcut(context, &action, effects);
        }
        effects.push(Effect::Paint { clear: false });
    }

    /// Edits the open rename prompt; returns `false` when the key cancels it and continues.
    fn rename_key(&mut self, key: AttachKey, effects: &mut Vec<Effect>) -> bool {
        let Mode::Rename(editor) = &mut self.mode else {
            return false;
        };
        let mut submit = None;
        let mut consume = true;
        let mut cancel = false;
        let control_or_alt = key.modifiers.control || key.modifiers.alt;
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
            KeyCode::Left if key.modifiers.control => editor.move_word_left(),
            KeyCode::Right if key.modifiers.control => editor.move_word_right(),
            KeyCode::Left => editor.move_cursor(editor.cursor.saturating_sub(1)),
            KeyCode::Right => editor.move_cursor((editor.cursor + 1).min(editor.len())),
            KeyCode::Home => editor.move_cursor(0),
            KeyCode::End => editor.move_cursor(editor.len()),
            KeyCode::Char(_) if control_or_alt => {}
            KeyCode::Char(value) if !value.is_control() => editor.insert(value),
            _ => {
                cancel = true;
                consume = false;
            }
        }
        if cancel {
            self.mode = Mode::Idle;
        }
        if let Some((tab_id, name)) = submit {
            self.mode = Mode::Idle;
            self.pending_manual_name = Some((tab_id.clone(), name.clone()));
            effects.push(Effect::Renamed {
                tab_id: tab_id.clone(),
                name: name.clone(),
            });
            effects.push(Effect::Send(Request::Rename { tab_id, name }));
        }
        effects.push(Effect::Paint { clear: false });
        consume
    }

    fn invoke<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        action: PopupAction,
        menu: &PopupMenu,
        effects: &mut Vec<Effect>,
    ) {
        match action {
            PopupAction::Rename => {
                if let Some(tab_id) = menu.tab_id.clone() {
                    self.open_rename(context, tab_id);
                }
            }
            PopupAction::Close => {
                if let Some(tab_id) = menu.tab_id.clone() {
                    self.close(context, tab_id, effects);
                }
            }
            PopupAction::NewAgent => self.create(Request::Create, effects),
            PopupAction::Settings => self.toggle_settings(context, effects),
            PopupAction::ConfigurePlus => self.mode = Mode::Palette(CommandPalette::plus_menu()),
            PopupAction::View(tab_id) => effects.push(Effect::View(tab_id)),
        }
    }

    fn open_rename<T: TabView>(&mut self, context: &Context<'_, T>, tab_id: String) {
        let name = context
            .tabs
            .iter()
            .find(|tab| tab.id() == tab_id)
            .map(|tab| tab.name().to_owned())
            .unwrap_or_default();
        self.mode = Mode::Rename(RenameEditor::new(tab_id, name));
    }

    fn close<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        tab_id: String,
        effects: &mut Vec<Effect>,
    ) {
        self.close_fallback = close_fallback_for(&self.shown(context), context.viewed, &tab_id);
        effects.push(Effect::Send(Request::Close(tab_id)));
    }

    fn create(&mut self, request: Request, effects: &mut Vec<Effect>) {
        self.view.pending_created_activation = true;
        effects.push(Effect::Send(request));
    }

    /// Invariant: the server reuses a prewarmed Settings process and places it last when it
    /// first becomes visible; no new holder is launched unless the tab is actually absent.
    fn open_settings(&mut self, effects: &mut Vec<Effect>) {
        self.create(Request::OpenSettings, effects);
    }

    fn shortcut<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        action: &str,
        effects: &mut Vec<Effect>,
    ) {
        match action {
            "tabs.new" => self.create(Request::Create, effects),
            "tabs.settings" => self.toggle_settings(context, effects),
            "tabs.changelog" => self.open_changelog(context, effects),
            "tabs.commands" => self.mode = Mode::Palette(CommandPalette::default()),
            "tabs.close" => {
                if let Some(tab_id) = context.viewed {
                    self.close(context, tab_id.to_owned(), effects);
                }
            }
            "tabs.rename" => {
                if let Some(tab_id) = context.viewed.filter(|id| !is_utility_tab(id)) {
                    self.open_rename(context, tab_id.to_owned());
                }
            }
            "tabs.next" | "tabs.previous" => {
                let shown = self.shown(context);
                if !shown.is_empty() {
                    let current = context
                        .viewed
                        .and_then(|id| shown.iter().position(|tab| tab.id() == id))
                        .unwrap_or(0);
                    let index = if action == "tabs.next" {
                        (current + 1) % shown.len()
                    } else {
                        (current + shown.len() - 1) % shown.len()
                    };
                    effects.push(Effect::View(shown[index].id().to_owned()));
                }
            }
            "tabs.moveRight" | "tabs.moveLeft" => {
                if let Some(tab_id) = context.viewed
                    && let Some(current) = context.tabs.iter().position(|tab| tab.id() == tab_id)
                {
                    let target_index = if action == "tabs.moveRight" {
                        (current + 1).min(context.tabs.len().saturating_sub(1))
                    } else {
                        current.saturating_sub(1)
                    };
                    effects.push(Effect::Send(Request::Reorder {
                        tab_id: tab_id.to_owned(),
                        target_index,
                        expected_revision: self.registry_revision,
                    }));
                }
            }
            jump if jump.starts_with("tabs.jump") => {
                let index = jump
                    .trim_start_matches("tabs.jump")
                    .parse::<usize>()
                    .unwrap_or(1)
                    .saturating_sub(1);
                if let Some(tab) = self.shown(context).get(index) {
                    self.view.pending_jump = None;
                    effects.push(Effect::View(tab.id().to_owned()));
                } else {
                    self.view.pending_jump = Some((index, self.registry_revision));
                }
            }
            _ => {}
        }
    }

    /// Shows the singleton Changelog tab, or asks the server to create it.
    fn open_changelog<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        effects: &mut Vec<Effect>,
    ) {
        // Invariant: an explicit open owns the view, so a prewarm still starting no longer hides it.
        self.view.changelog.pending = false;
        match context
            .tabs
            .iter()
            .find(|tab| tab.id().starts_with("changelog-"))
        {
            Some(changelog) => effects.push(Effect::View(changelog.id().to_owned())),
            None => self.create(Request::OpenChangelog, effects),
        }
    }

    /// The Settings shortcut hides the viewed Settings tab, returning to its nearest neighbour,
    /// and otherwise shows the singleton Settings tab.
    fn toggle_settings<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        effects: &mut Vec<Effect>,
    ) {
        self.view.settings.pending = false;
        let Some(tab_id) = settings_toggle_closes(context.viewed) else {
            if let Some(settings) = self.shown(context).iter().find(|tab| is_settings(tab.id())) {
                // Invariant: switching to an already visible Settings tab retains its dragged
                // slot. Only revealing a hidden Settings tab places it last.
                effects.push(Effect::View(settings.id().to_owned()));
            } else {
                self.open_settings(effects);
            }
            return;
        };
        let shown = self.shown(context);
        let survivors = shown
            .iter()
            .filter(|tab| tab.id() != tab_id)
            .cloned()
            .collect::<Vec<_>>();
        let previous = close_fallback_for(&shown, context.viewed, tab_id)
            .and_then(|fallback| fallback.resolve(&survivors));
        if let Some(previous) = previous {
            // Invariant: hiding keeps the Settings process for reuse.
            self.view.settings.shown = false;
            effects.push(Effect::View(previous));
        } else {
            self.close_fallback = None;
            effects.push(Effect::Send(Request::Close(tab_id.to_owned())));
        }
    }

    /// Decides how a key that reached the child path is delivered, after the role judged the
    /// Ctrl+C chord; `None` drops it.
    pub fn forward_key<T: TabView>(
        &mut self,
        context: &Context<'_, T>,
        key: AttachKey,
    ) -> Option<KeyForward> {
        let forward = if self.failed(context.viewed) {
            match key.code {
                KeyCode::Char(value @ ('r' | 'R' | 'f' | 'F')) if key.modifiers.is_empty() => {
                    KeyForward::Plain {
                        name: value.to_ascii_lowercase().to_string(),
                        byte: value as u8,
                    }
                }
                KeyCode::Char('w' | 'W') if key.modifiers.alt => KeyForward::Plain {
                    name: "x".into(),
                    byte: b'x',
                },
                _ => return None,
            }
        } else {
            KeyForward::Typed
        };
        self.user_input_pending = true;
        Some(forward)
    }

    fn paste<T: TabView>(
        &mut self,
        context: &Context<'_, T>,
        text: String,
        effects: &mut Vec<Effect>,
    ) {
        if let Mode::Rename(editor) = &mut self.mode {
            for value in text.chars().filter(|value| !value.is_control()) {
                editor.insert(value);
            }
            effects.push(Effect::Paint { clear: false });
            return;
        }
        if let Mode::Palette(palette) = &mut self.mode {
            palette.insert(&text);
            effects.push(Effect::Paint { clear: false });
            return;
        }
        if self.failed(context.viewed) || matches!(self.mode, Mode::Popup(_)) {
            return;
        }
        self.user_input_pending = true;
        effects.push(Effect::ForwardPaste(text));
    }

    /// Invariant: focus reports are state, not intent; while a view is pending they would only
    /// consume the deferred-input budget, and the next report carries current focus.
    fn focus<T: TabView>(
        &mut self,
        context: &Context<'_, T>,
        gained: bool,
        effects: &mut Vec<Effect>,
    ) {
        if !gained {
            self.child_primary_drag = false;
        }
        if context.requested.is_some()
            || self.view.pending_created_activation
            || self.failed(context.viewed)
        {
            return;
        }
        if gained {
            effects.push(Effect::Send(Request::ClaimInput));
        }
        effects.push(Effect::ForwardFocus { gained });
    }

    fn mouse<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        mouse: AttachMouse,
        now: Duration,
        effects: &mut Vec<Effect>,
    ) {
        self.notice = None;
        if matches!(self.mode, Mode::Palette(_)) {
            return;
        }
        let activation = matches!(
            mouse.kind,
            MouseKind::Down(_) | MouseKind::ScrollDown | MouseKind::ScrollUp
        );
        if matches!(self.mode, Mode::Rename(_)) && activation {
            self.mode = Mode::Idle;
            effects.push(Effect::Paint { clear: false });
            if mouse.row != 0 {
                return;
            }
        }
        if let Some(menu) = self.mode.take_popup() {
            self.popup_mouse(context, menu, mouse, effects);
            return;
        }
        if self.drag_mouse(context, mouse, now, effects) {
            return;
        }
        if self.child_primary_drag {
            match mouse.kind {
                MouseKind::Drag(MouseButton::Left) | MouseKind::Moved => {
                    effects.push(Effect::ForwardMouse);
                    return;
                }
                MouseKind::Up(MouseButton::Left) => {
                    self.child_primary_drag = false;
                    effects.push(Effect::ForwardMouse);
                    return;
                }
                MouseKind::Down(_) => self.child_primary_drag = false,
                _ => {}
            }
        }
        if mouse.row == 0 {
            self.strip_mouse(context, mouse, now, effects);
            return;
        }
        if self.hovered.take().is_some() {
            effects.push(Effect::Paint { clear: false });
        }
        if mouse.kind == MouseKind::Moved
            && !forward_pointer_motion(
                context.requested.is_some() || self.view.pending_created_activation,
                context.mouse_tracking,
            )
        {
            return;
        }
        if mouse.kind == MouseKind::Down(MouseButton::Left) {
            self.child_primary_drag = true;
        }
        effects.push(Effect::ForwardMouse);
    }

    fn popup_mouse<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        mut menu: PopupMenu,
        mouse: AttachMouse,
        effects: &mut Vec<Effect>,
    ) {
        match mouse.kind {
            MouseKind::Moved => {
                let hovered = menu.index_at(mouse.column, mouse.row);
                let changed = menu.hovered != hovered;
                menu.hovered = hovered;
                self.mode = Mode::Popup(menu);
                if changed {
                    effects.push(Effect::Paint { clear: false });
                }
            }
            MouseKind::Up(_) => self.mode = Mode::Popup(menu),
            MouseKind::Down(MouseButton::Left) => {
                if let Some(action) = menu.action_at(mouse.column, mouse.row) {
                    self.hovered = None;
                    self.invoke(context, action, &menu, effects);
                    effects.push(Effect::Paint { clear: false });
                } else if menu.row_at(mouse.column, mouse.row).is_some() {
                    self.mode = Mode::Popup(menu);
                } else {
                    self.hovered = None;
                    effects.push(Effect::Paint { clear: false });
                }
            }
            _ => {
                self.hovered = None;
                effects.push(Effect::Paint { clear: false });
            }
        }
    }

    /// Moves or drops an active drag; returns `true` when the event belonged to it.
    fn drag_mouse<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        mouse: AttachMouse,
        now: Duration,
        effects: &mut Vec<Effect>,
    ) -> bool {
        match mouse.kind {
            MouseKind::Drag(MouseButton::Left) | MouseKind::Moved
                if matches!(self.mode, Mode::Drag(_)) =>
            {
                let shown = self.shown(context);
                if let Mode::Drag(drag) = &mut self.mode
                    && update_drag(drag, mouse.column, &shown, context.strip, now)
                {
                    effects.push(Effect::Paint { clear: false });
                }
                true
            }
            MouseKind::Up(MouseButton::Left) if matches!(self.mode, Mode::Drag(_)) => {
                let Mode::Drag(mut completed) = std::mem::take(&mut self.mode) else {
                    return true;
                };
                let shown = self.shown(context);
                update_drag(&mut completed, mouse.column, &shown, context.strip, now);
                let from = shown.iter().position(|tab| tab.id() == completed.tab_id);
                if completed.shown
                    && let Some(target_index) = completed.drop_index
                    && Some(target_index) != from
                    && completed
                        .initial_order
                        .iter()
                        .map(String::as_str)
                        .eq(context.tabs.iter().map(|tab| tab.id()))
                {
                    effects.push(Effect::Send(Request::Reorder {
                        target_index: registry_index(&shown, context.tabs, target_index),
                        tab_id: completed.tab_id,
                        expected_revision: self.registry_revision,
                    }));
                }
                effects.push(Effect::Paint { clear: false });
                true
            }
            _ => false,
        }
    }

    fn strip_mouse<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        mouse: AttachMouse,
        now: Duration,
        effects: &mut Vec<Effect>,
    ) {
        let target = context.strip.hit(mouse.column).cloned();
        match mouse.kind {
            MouseKind::Moved => {
                let next = target.map(|hit| match hit {
                    StripHitKind::View(id) => Hover::Tab(id),
                    StripHitKind::Overflow => Hover::Overflow,
                    StripHitKind::New => Hover::New,
                });
                if next != self.hovered {
                    self.hovered = next;
                    effects.push(Effect::Paint { clear: false });
                }
            }
            MouseKind::Down(MouseButton::Right) => {
                let menu = match target {
                    Some(StripHitKind::View(tab_id)) => {
                        PopupMenu::context(tab_id, mouse.column, self.columns, context.shortcuts)
                    }
                    Some(StripHitKind::New) => PopupMenu::configure(mouse.column, self.columns),
                    _ => return,
                };
                self.mode = Mode::Popup(menu);
                effects.push(Effect::Paint { clear: false });
            }
            MouseKind::Down(MouseButton::Left) => match target {
                Some(StripHitKind::View(tab_id)) => {
                    let previous_marker = self.mode.drag().is_some_and(|drag| drag.shown);
                    self.mode = Mode::Drag(TabDrag {
                        tab_id: tab_id.clone(),
                        start_column: mouse.column,
                        started_at: now,
                        shown: false,
                        drop_index: self
                            .shown(context)
                            .iter()
                            .position(|tab| tab.id() == tab_id),
                        marker_column: None,
                        initial_order: context.tabs.iter().map(|tab| tab.id().to_owned()).collect(),
                    });
                    if previous_marker {
                        effects.push(Effect::Paint { clear: false });
                    }
                    if context.viewed != Some(tab_id.as_str()) {
                        effects.push(Effect::View(tab_id));
                    }
                }
                Some(StripHitKind::New) => {
                    self.hovered = Some(Hover::New);
                    if self.plus_menu.agent_only() {
                        self.create(Request::Create, effects);
                    } else {
                        let menu = PopupMenu::add(
                            mouse.column,
                            self.columns,
                            context.shortcuts,
                            self.settings_visible(context.viewed),
                        );
                        self.mode = Mode::Popup(menu);
                    }
                    effects.push(Effect::Paint { clear: false });
                }
                Some(StripHitKind::Overflow) => {
                    self.hovered = Some(Hover::Overflow);
                    self.mode = Mode::Popup(PopupMenu::overflow(
                        mouse.column,
                        self.columns,
                        &context.strip.hidden_tabs,
                        context.tabs,
                        context.viewed,
                    ));
                    effects.push(Effect::Paint { clear: false });
                }
                None => {}
            },
            _ => {}
        }
    }

    fn tick<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        now: Duration,
        effects: &mut Vec<Effect>,
    ) {
        // Rationale: Settings and Changelog open in their own processes; starting them hidden
        // ahead of time makes opening them as immediate as solo's in-process screens. The landing
        // keeps them ready too. Changelog waits for Settings, so the two never start at once.
        let mut ready = true;
        for (prefix, request) in PREWARMED {
            let exists = context.tabs.iter().any(|tab| tab.id().starts_with(prefix));
            let idle = !self.view.pending_created_activation
                && context.requested.is_none()
                && (context.viewed.is_some() || context.landing);
            let prewarm = if prefix == "settings-" {
                &mut self.view.settings
            } else {
                &mut self.view.changelog
            };
            if exists || (context.tabs.is_empty() && !context.landing) {
                prewarm.absent_since = None;
                if !exists {
                    prewarm.shown = false;
                }
            } else if ready && !prewarm.pending && idle {
                let since = *prewarm.absent_since.get_or_insert(now);
                if now.saturating_sub(since) >= SETTINGS_PREWARM_DELAY {
                    prewarm.absent_since = None;
                    prewarm.shown = false;
                    prewarm.pending = true;
                    effects.push(Effect::Send(request));
                }
            }
            ready = exists;
        }
        let held = self
            .mode
            .drag()
            .is_some_and(|drag| !drag.shown && now.saturating_sub(drag.started_at) >= DRAG_HOLD);
        if held {
            let shown = self.shown(context);
            if let Mode::Drag(drag) = &mut self.mode {
                let column = drag.start_column;
                if update_drag(drag, column, &shown, context.strip, now) {
                    effects.push(Effect::Paint { clear: false });
                }
            }
        }
    }

    fn server<T: TabView + Clone>(
        &mut self,
        context: &Context<'_, T>,
        event: ServerEvent,
        effects: &mut Vec<Effect>,
    ) {
        let paint = Effect::Paint { clear: false };
        match event {
            ServerEvent::ShortcutsChanged => {
                if matches!(self.mode, Mode::Popup(_)) {
                    effects.push(paint);
                }
            }
            ServerEvent::Status { tab_id, status } => {
                if status != "failed" && self.failed_tab.as_deref() == Some(tab_id.as_str()) {
                    self.failed_tab = None;
                }
                effects.push(paint);
            }
            ServerEvent::Commit {
                tab_id,
                status,
                requested,
            } => self.commit(context.viewed, &tab_id, &status, requested, effects),
            ServerEvent::Created { tab_id, created } => self.created(tab_id, created, effects),
            ServerEvent::ConfigurePlus => {
                self.mode = Mode::Palette(CommandPalette::plus_menu());
                effects.push(paint);
            }
            ServerEvent::CreateFailed { notice } => {
                if let Some(target) = context.requested {
                    self.deferred.discard_tab(target);
                }
                self.deferred.discard_created();
                self.view.pending_created_activation = false;
                self.user_input_pending = false;
                self.notice = Some(notice);
                effects.extend([Effect::CancelViewRequest, paint]);
            }
            ServerEvent::Renamed { accepted, message } => {
                if accepted {
                    effects.push(Effect::Send(Request::List));
                } else {
                    self.pending_manual_name = None;
                    self.notice = message;
                    effects.push(paint);
                }
            }
            ServerEvent::RenameRefused { message } => {
                self.pending_manual_name = None;
                self.notice = message;
                effects.extend([Effect::Send(Request::List), paint]);
            }
            ServerEvent::Reordered { accepted, message } => {
                // Concurrency: another client or a tab status update can advance the registry
                // after drop. Refresh the strip silently; a stale drag is not a user error.
                if !accepted && message.as_deref() != Some("stale tab order") {
                    self.notice = message;
                    effects.push(paint);
                }
                effects.push(Effect::Send(Request::List));
            }
            ServerEvent::Answered { accepted, message } => {
                if !accepted {
                    self.notice = message;
                    effects.push(paint);
                }
            }
            ServerEvent::Closed { accepted, message } => {
                if !accepted {
                    self.notice = message;
                    self.close_fallback = None;
                    effects.push(paint);
                }
                effects.push(Effect::Send(Request::List));
            }
            ServerEvent::HolderExit => effects.push(paint),
            ServerEvent::Failure { message } => {
                self.failed_tab = context.viewed.map(str::to_owned);
                self.notice = Some(message.unwrap_or_else(|| "tab failed".into()));
                effects.push(paint);
            }
            ServerEvent::Notice { message } => self.show_notice(message, effects),
            ServerEvent::InputRejected { message } => {
                let message = rejection_notice(&mut self.user_input_pending, message);
                self.show_notice(message, effects);
            }
            ServerEvent::InputClaimLost => {
                // Invariant: controller handoff stays invisible; this terminal re-claims its
                // viewed tab instead of painting a delivery notice over the child.
                self.user_input_pending = false;
                effects.push(Effect::Send(Request::ClaimInput));
            }
        }
    }

    fn show_notice(&mut self, message: Option<String>, effects: &mut Vec<Effect>) {
        if message.is_some() {
            self.notice = message;
            effects.push(Effect::Paint { clear: false });
        }
    }

    fn created(&mut self, tab_id: String, created: bool, effects: &mut Vec<Effect>) {
        let prewarm = if is_settings(&tab_id) {
            Some(&mut self.view.settings)
        } else if tab_id.starts_with("changelog-") {
            Some(&mut self.view.changelog)
        } else {
            None
        };
        if let Some(prewarm) = prewarm.filter(|prewarm| prewarm.pending) {
            // Invariant: a prewarmed utility tab starts hidden and never takes the view or a
            // pending Agent creation's input.
            prewarm.pending = false;
            effects.push(Effect::Send(Request::List));
            return;
        }
        self.view.pending_created_activation = false;
        self.deferred.retarget_created(&tab_id);
        effects.push(Effect::View(tab_id.clone()));
        if created {
            effects.push(Effect::AwaitFirstDraw(tab_id));
        }
        effects.push(Effect::Send(Request::List));
    }

    /// Protocol: input typed after a view request stays bound to that target and is released
    /// only after its coherent surface commits and its holder is routable.
    fn commit(
        &mut self,
        viewed: Option<&str>,
        tab_id: &str,
        status: &str,
        requested: bool,
        effects: &mut Vec<Effect>,
    ) {
        if requested {
            if is_settings(tab_id) {
                self.view.settings.shown = true;
            } else if tab_id.starts_with("changelog-") {
                self.view.changelog.shown = true;
            }
            self.close_fallback = None;
            self.notice = None;
            self.sync_prompt(viewed);
            let (frames, mut dropped) = self.deferred.resolve(tab_id);
            if status == "failed" {
                dropped |= !frames.is_empty();
            } else if !frames.is_empty() {
                effects.push(Effect::Write(frames));
            }
            if dropped {
                self.user_input_pending = false;
            }
        }
        if status == "failed" {
            self.failed_tab = Some(tab_id.to_owned());
        } else if self.failed_tab.as_deref() == Some(tab_id) {
            self.failed_tab = None;
        }
    }

    /// Invariant: a hidden Settings tab never surfaces by itself.
    pub fn settings_visible(&self, viewed: Option<&str>) -> bool {
        self.view.settings.shown || viewed.is_some_and(is_settings)
    }

    /// Resolves a jump that waited for a registry snapshot; returns the tab to view.
    pub fn resolve_pending_jump<T: TabView>(
        &mut self,
        tabs: &[T],
        revision: u64,
    ) -> Option<String> {
        let (index, requested_revision) = self.view.pending_jump?;
        if let Some(tab) = tabs.get(index) {
            self.view.pending_jump = None;
            return Some(tab.id().to_owned());
        }
        if revision > requested_revision {
            // Protocol: a newer authoritative registry still lacking the ordinal proves this
            // was not an in-flight tab creation.
            self.view.pending_jump = None;
        }
        None
    }

    /// The tab to view when the viewed tab leaves the registry.
    pub fn fallback_view<T: TabView>(
        &self,
        candidates: &[T],
        settings_visible: bool,
    ) -> Option<String> {
        self.close_fallback
            .as_ref()
            .and_then(|fallback| fallback.resolve(candidates))
            .or_else(|| {
                candidates
                    .iter()
                    .find(|tab| settings_visible || !is_settings(tab.id()))
                    .map(|tab| tab.id().to_owned())
            })
    }

    /// Discards input bound to a view request the registry dropped.
    pub fn drop_request(&mut self, target: Option<&str>) {
        if target.is_some_and(|target| self.deferred.discard_tab(target)) {
            self.user_input_pending = false;
        }
    }

    /// Clears prompts and names bound to tabs the installed registry no longer lists; a changed
    /// registry also closes the overflow menu, and an empty one forgets the close fallback.
    pub fn installed<T: TabView>(&mut self, tabs: &[T], changed: bool) {
        let listed = |id: &str| tabs.iter().any(|tab| tab.id() == id);
        let stale = match &self.mode {
            Mode::Popup(menu) => {
                menu.tab_id.as_deref().is_some_and(|id| !listed(id))
                    || (changed && menu.kind == PopupKind::Overflow)
            }
            Mode::Rename(editor) => !listed(&editor.tab_id),
            _ => false,
        };
        if stale {
            self.mode = Mode::Idle;
        }
        if self
            .pending_manual_name
            .as_ref()
            .is_some_and(|(id, _)| !listed(id))
        {
            self.pending_manual_name = None;
        }
        if self.failed_tab.as_deref().is_some_and(|id| !listed(id)) {
            self.failed_tab = None;
        }
        if tabs.is_empty() {
            self.close_fallback = None;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::attach::{AttachTab, KeyKind, Modifiers};

    const PAINT: Effect = Effect::Paint { clear: false };
    const NOW: Duration = Duration::from_secs(10);
    const LEFT: MouseKind = MouseKind::Down(MouseButton::Left);
    const RIGHT: MouseKind = MouseKind::Down(MouseButton::Right);
    const RELEASE: MouseKind = MouseKind::Up(MouseButton::Left);

    struct Labels;

    impl ShortcutLabels for Labels {
        fn label(&self, action: &str) -> String {
            format!("<{action}>")
        }
    }

    fn tab(id: &str) -> AttachTab {
        AttachTab {
            id: id.into(),
            name: format!("{id} name"),
            name_source: "default".into(),
            status: "idle".into(),
            accent: None,
        }
    }

    /// Tabs `ids`, each chip ten columns wide in order, then the `+` button.
    struct Fixture {
        tabs: Vec<AttachTab>,
        viewed: Option<String>,
        requested: Option<String>,
        strip: StripSnapshot,
        mouse_tracking: Option<bool>,
        landing: bool,
    }

    impl Fixture {
        fn new(ids: &[&str], viewed: &str) -> Self {
            let mut hits = ids
                .iter()
                .enumerate()
                .map(|(index, id)| {
                    let start = index as u16 * 10;
                    (start, start + 10, StripHitKind::View((*id).into()))
                })
                .collect::<Vec<_>>();
            let end = ids.len() as u16 * 10;
            hits.push((end, end + 3, StripHitKind::New));
            Self {
                tabs: ids.iter().map(|id| tab(id)).collect(),
                viewed: Some(viewed.into()),
                requested: None,
                strip: StripSnapshot {
                    hits,
                    hidden_tabs: Vec::new(),
                },
                mouse_tracking: None,
                landing: false,
            }
        }

        fn context(&self) -> Context<'_, AttachTab> {
            Context {
                tabs: &self.tabs,
                viewed: self.viewed.as_deref(),
                requested: self.requested.as_deref(),
                strip: &self.strip,
                shortcuts: &Labels,
                mouse_tracking: self.mouse_tracking,
                landing: self.landing,
            }
        }

        fn state(&self) -> State {
            State::new(self.viewed.clone(), 80)
        }

        fn step(&self, state: &mut State, event: Event) -> Vec<Effect> {
            self.step_at(state, event, NOW)
        }

        fn step_at(&self, state: &mut State, event: Event, now: Duration) -> Vec<Effect> {
            state.step(&self.context(), event, now)
        }
    }

    fn press(code: KeyCode, modifiers: Modifiers) -> Event {
        Event::Key {
            key: AttachKey {
                code,
                modifiers,
                kind: KeyKind::Press,
            },
            action: None,
        }
    }

    fn key(code: KeyCode) -> Event {
        press(code, Modifiers::NONE)
    }

    fn shortcut(action: &str) -> Event {
        Event::Key {
            key: AttachKey {
                code: KeyCode::Char('t'),
                modifiers: Modifiers {
                    alt: true,
                    ..Modifiers::NONE
                },
                kind: KeyKind::Press,
            },
            action: Some(action.into()),
        }
    }

    fn mouse(kind: MouseKind, column: u16, row: u16) -> Event {
        Event::Mouse(AttachMouse {
            kind,
            column,
            row,
            modifiers: Modifiers::NONE,
        })
    }

    fn server(event: ServerEvent) -> Event {
        Event::Server(event)
    }

    #[test]
    fn rename_edits_submits_and_cancels() {
        let fixture = Fixture::new(&["a", "b"], "a");
        let mut state = fixture.state();
        fixture.step(&mut state, shortcut("tabs.rename"));
        assert_eq!(
            state.mode.rename().map(|editor| editor.text.as_str()),
            Some("a name")
        );
        fixture.step(&mut state, key(KeyCode::Backspace));
        fixture.step(&mut state, key(KeyCode::Char('!')));
        assert_eq!(
            fixture.step(&mut state, key(KeyCode::Enter)),
            [
                Effect::Renamed {
                    tab_id: "a".into(),
                    name: "a nam!".into()
                },
                Effect::Send(Request::Rename {
                    tab_id: "a".into(),
                    name: "a nam!".into()
                }),
                PAINT,
            ]
        );
        assert!(matches!(state.mode, Mode::Idle));
        assert_eq!(
            state.pending_manual_name,
            Some(("a".into(), "a nam!".into()))
        );

        // Invariant: an unowned key closes the prompt and still reaches the child.
        fixture.step(&mut state, shortcut("tabs.rename"));
        assert_eq!(
            fixture.step(&mut state, key(KeyCode::Tab)),
            [PAINT, Effect::ForwardKey]
        );
        assert!(matches!(state.mode, Mode::Idle));

        // Invariant: Settings tabs are never renamed, and an empty name cancels.
        let settings = Fixture::new(&["settings-1"], "settings-1");
        let mut state = settings.state();
        settings.step(&mut state, shortcut("tabs.rename"));
        assert!(matches!(state.mode, Mode::Idle));
        let mut state = fixture.state();
        fixture.step(&mut state, shortcut("tabs.rename"));
        let select_all = press(
            KeyCode::Char('a'),
            Modifiers {
                control: true,
                ..Modifiers::NONE
            },
        );
        fixture.step(&mut state, select_all);
        fixture.step(&mut state, key(KeyCode::Delete));
        assert_eq!(fixture.step(&mut state, key(KeyCode::Enter)), [PAINT]);
        assert!(matches!(state.mode, Mode::Idle));
        assert!(state.pending_manual_name.is_none());
    }

    #[test]
    fn popup_keys_move_hover_invoke_and_close() {
        let fixture = Fixture::new(&["a", "b"], "a");
        let mut state = fixture.state();
        assert_eq!(fixture.step(&mut state, mouse(RIGHT, 12, 0)), [PAINT]);
        let menu = state.mode.popup().expect("context menu");
        assert_eq!(menu.tab_id.as_deref(), Some("b"));
        assert_eq!(menu.items[0].shortcut, "<tabs.close>");
        fixture.step(&mut state, key(KeyCode::Down));
        fixture.step(&mut state, key(KeyCode::Down));
        assert_eq!(state.mode.popup().and_then(|menu| menu.hovered), Some(1));
        fixture.step(&mut state, key(KeyCode::Enter));
        assert_eq!(
            state.mode.rename().map(|editor| editor.tab_id.as_str()),
            Some("b")
        );

        fixture.step(&mut state, key(KeyCode::Esc));
        fixture.step(&mut state, mouse(RIGHT, 2, 0));
        fixture.step(&mut state, key(KeyCode::Up));
        assert_eq!(
            fixture.step(&mut state, key(KeyCode::Enter)),
            [PAINT],
            "Up from no hover selects the last item, Rename, which opens the editor"
        );
        assert!(state.mode.rename().is_some());
        fixture.step(&mut state, key(KeyCode::Esc));

        fixture.step(&mut state, mouse(RIGHT, 2, 0));
        fixture.step(&mut state, key(KeyCode::Down));
        assert_eq!(
            fixture.step(&mut state, key(KeyCode::Enter)),
            [Effect::Send(Request::Close("a".into())), PAINT]
        );
        assert!(
            state.close_fallback.is_some(),
            "closing the viewed tab keeps a fallback"
        );

        fixture.step(&mut state, mouse(RIGHT, 2, 0));
        assert_eq!(fixture.step(&mut state, key(KeyCode::Esc)), [PAINT]);
        assert!(matches!(state.mode, Mode::Idle));
        // Invariant: Enter with no hovered item keeps the menu open.
        fixture.step(&mut state, mouse(RIGHT, 2, 0));
        assert!(fixture.step(&mut state, key(KeyCode::Enter)).is_empty());
        assert!(state.mode.popup().is_some());
        // Invariant: any other key closes the menu and continues to the child.
        assert_eq!(
            fixture.step(&mut state, key(KeyCode::Char('x'))),
            [PAINT, Effect::ForwardKey]
        );
    }

    #[test]
    fn shortcuts_create_close_navigate_reorder_and_jump() {
        let fixture = Fixture::new(&["a", "b", "c"], "b");
        let mut state = fixture.state();
        assert_eq!(
            fixture.step(&mut state, shortcut("tabs.new")),
            [Effect::Send(Request::Create), PAINT]
        );
        assert!(state.view.pending_created_activation);
        assert_eq!(
            fixture.step(&mut state, shortcut("tabs.close")),
            [Effect::Send(Request::Close("b".into())), PAINT]
        );
        assert_eq!(
            state
                .close_fallback
                .as_ref()
                .and_then(|fallback| fallback.resolve(&fixture.tabs)),
            Some("a".into())
        );
        assert_eq!(
            fixture.step(&mut state, shortcut("tabs.next")),
            [Effect::View("c".into()), PAINT]
        );
        assert_eq!(
            fixture.step(&mut state, shortcut("tabs.previous")),
            [Effect::View("a".into()), PAINT]
        );
        state.registry_revision = 7;
        assert_eq!(
            fixture.step(&mut state, shortcut("tabs.moveRight")),
            [
                Effect::Send(Request::Reorder {
                    tab_id: "b".into(),
                    target_index: 2,
                    expected_revision: 7
                }),
                PAINT
            ]
        );
        assert_eq!(
            fixture.step(&mut state, shortcut("tabs.jump1")),
            [Effect::View("a".into()), PAINT]
        );
        assert_eq!(fixture.step(&mut state, shortcut("tabs.jump5")), [PAINT]);
        assert_eq!(state.view.pending_jump, Some((4, 7)));
        assert_eq!(fixture.step(&mut state, shortcut("tabs.unknown")), [PAINT]);
    }

    #[test]
    fn a_pending_jump_waits_for_the_registry_snapshot_that_lists_it() {
        let mut state = State::default();
        state.view.pending_jump = Some((2, 4));
        let two = [tab("a"), tab("b")];
        assert_eq!(state.resolve_pending_jump(&two, 4), None);
        assert_eq!(
            state.view.pending_jump,
            Some((2, 4)),
            "an in-flight creation may still list it"
        );
        let three = [tab("a"), tab("b"), tab("c")];
        assert_eq!(state.resolve_pending_jump(&three, 5), Some("c".into()));
        assert_eq!(state.view.pending_jump, None);
        state.view.pending_jump = Some((2, 4));
        assert_eq!(state.resolve_pending_jump(&two, 5), None);
        assert_eq!(
            state.view.pending_jump, None,
            "a newer registry without it ends the wait"
        );
    }

    #[test]
    fn keys_reaching_the_child_follow_failure_rules_only() {
        let mut fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        let r = AttachKey {
            code: KeyCode::Char('R'),
            modifiers: Modifiers::NONE,
            kind: KeyKind::Press,
        };
        assert_eq!(
            fixture.step(&mut state, key(KeyCode::Char('R'))),
            [Effect::ForwardKey]
        );
        assert_eq!(
            state.forward_key(&fixture.context(), r),
            Some(KeyForward::Typed)
        );
        assert!(state.user_input_pending);

        for silent in ["stalled", "unresponsive"] {
            fixture.tabs[0].status = silent.into();
            state.user_input_pending = false;
            assert_eq!(
                state.forward_key(&fixture.context(), r),
                Some(KeyForward::Typed),
                "status={silent}"
            );
            assert!(state.user_input_pending);
        }

        fixture.tabs[0].status = "failed".into();
        state.failed_tab = Some("a".into());
        assert_eq!(
            state.forward_key(&fixture.context(), r),
            Some(KeyForward::Plain {
                name: "r".into(),
                byte: b'R'
            })
        );
        let alt_w = AttachKey {
            code: KeyCode::Char('w'),
            modifiers: Modifiers {
                alt: true,
                ..Modifiers::NONE
            },
            kind: KeyKind::Press,
        };
        assert_eq!(
            state.forward_key(&fixture.context(), alt_w),
            Some(KeyForward::Plain {
                name: "x".into(),
                byte: b'x'
            })
        );
        let typed = AttachKey {
            code: KeyCode::Char('q'),
            ..r
        };
        assert_eq!(state.forward_key(&fixture.context(), typed), None);

        // Invariant: a released key changes nothing.
        let released = Event::Key {
            key: AttachKey {
                kind: KeyKind::Release,
                ..r
            },
            action: None,
        };
        assert!(fixture.step(&mut state, released).is_empty());
    }

    #[test]
    fn a_settings_request_opens_the_plus_menu_dialog_over_the_viewed_tab() {
        let fixture = Fixture::new(&["a", "settings-1"], "settings-1");
        let mut state = fixture.state();
        assert_eq!(
            fixture.step(&mut state, server(ServerEvent::ConfigurePlus)),
            [PAINT]
        );
        assert!(
            state
                .mode
                .palette()
                .is_some_and(CommandPalette::is_plus_menu)
        );
        assert!(
            fixture.step(&mut state, key(KeyCode::Tab)).is_empty(),
            "the dialog keeps keys from the Settings child"
        );
    }

    #[test]
    fn plus_follows_its_configured_kinds_and_right_click_configures_it() {
        let mut fixture = Fixture::new(&["a", "settings-1"], "a");
        fixture.strip.hits.push((30, 32, StripHitKind::New));
        let mut state = fixture.state();
        assert_eq!(
            fixture.step(&mut state, mouse(LEFT, 31, 0)),
            [Effect::Send(Request::Create), PAINT],
            "with no extra kind, + adds an Agent without a menu"
        );
        assert!(state.mode.popup().is_none());

        state.plus_menu = PlusMenu::from_setting(Some("settings,changelog"));
        assert_eq!(
            state.plus_menu,
            PlusMenu::ALL,
            "only Settings is an extra kind"
        );
        fixture.step(&mut state, mouse(LEFT, 31, 0));
        let menu = state.mode.popup().expect("launcher").clone();
        let labels = menu
            .items
            .iter()
            .map(|item| item.label.as_str())
            .collect::<Vec<_>>();
        assert_eq!(labels, ["+ Agent", "", "  Settings"]);
        assert_eq!(
            fixture.step(&mut state, mouse(LEFT, menu.column, 3)),
            [Effect::Send(Request::OpenSettings), PAINT],
            "the hidden Settings is revealed through the server"
        );

        assert_eq!(fixture.step(&mut state, mouse(RIGHT, 31, 0)), [PAINT]);
        let configure = state.mode.popup().expect("configure menu").clone();
        assert_eq!(configure.kind, PopupKind::Configure);
        assert_eq!(configure.items.len(), 1);
        assert_eq!(configure.items[0].label, "Configure");
        assert_eq!(
            fixture.step(&mut state, mouse(LEFT, configure.column, 1)),
            [PAINT]
        );
        assert!(
            state
                .mode
                .palette()
                .is_some_and(CommandPalette::is_plus_menu),
            "Configure opens its dialog over the active tab"
        );
        assert_eq!(
            fixture.step(&mut state, key(KeyCode::Char(' '))),
            [Effect::SavePlusMenu(PlusMenu::default()), PAINT],
            "Space toggles the selected kind and stores it at once"
        );
        assert!(fixture.step(&mut state, mouse(LEFT, 31, 0)).is_empty());
        assert_eq!(fixture.step(&mut state, key(KeyCode::Esc)), [PAINT]);
        assert!(state.mode.palette().is_none());
    }

    #[test]
    fn strip_pointer_hovers_opens_menus_and_drags() {
        let mut fixture = Fixture::new(&["a", "b", "c"], "a");
        fixture.strip.hits.push((40, 42, StripHitKind::Overflow));
        fixture.strip.hidden_tabs = vec!["c".into()];
        let mut state = fixture.state();
        state.plus_menu = PlusMenu::ALL;
        assert_eq!(
            fixture.step(&mut state, mouse(MouseKind::Moved, 12, 0)),
            [PAINT]
        );
        assert_eq!(state.hovered, Some(Hover::Tab("b".into())));
        assert!(
            fixture
                .step(&mut state, mouse(MouseKind::Moved, 13, 0))
                .is_empty()
        );

        assert_eq!(fixture.step(&mut state, mouse(LEFT, 31, 0)), [PAINT]);
        assert_eq!(state.hovered, Some(Hover::New));
        let add = state.mode.popup().expect("add menu").clone();
        assert_eq!(add.kind, PopupKind::Add);
        assert_eq!(
            fixture.step(&mut state, mouse(LEFT, add.column, 1)),
            [Effect::Send(Request::Create), PAINT]
        );

        fixture.step(&mut state, mouse(LEFT, 41, 0));
        let menu = state.mode.popup().expect("overflow menu").clone();
        assert_eq!(menu.items[0].action, Some(PopupAction::View("c".into())));
        assert!(fixture.step(&mut state, mouse(RELEASE, 41, 0)).is_empty());
        assert!(
            state.mode.popup().is_some(),
            "the release that opened a menu keeps it"
        );
        assert_eq!(
            fixture.step(&mut state, mouse(LEFT, menu.column, 1)),
            [Effect::View("c".into()), PAINT]
        );

        // Invariant: pressing another tab requests its view and starts a drag that only shows
        // once the pointer moves or the hold elapses.
        state.registry_revision = 3;
        assert_eq!(
            fixture.step(&mut state, mouse(LEFT, 12, 0)),
            [Effect::View("b".into())]
        );
        assert!(state.mode.drag().is_some_and(|drag| !drag.shown));
        assert!(fixture.step_at(&mut state, Event::Tick, NOW).is_empty());
        assert_eq!(
            fixture.step_at(&mut state, Event::Tick, NOW + DRAG_HOLD),
            [PAINT]
        );
        assert!(state.mode.drag().is_some_and(|drag| drag.shown));
        assert_eq!(
            fixture.step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 29, 0)),
            [PAINT]
        );
        assert_eq!(
            fixture.step(&mut state, mouse(RELEASE, 29, 0)),
            [
                Effect::Send(Request::Reorder {
                    tab_id: "b".into(),
                    target_index: 2,
                    expected_revision: 3
                }),
                PAINT
            ]
        );
        assert!(matches!(state.mode, Mode::Idle));

        // Invariant: a drop in place sends nothing.
        fixture.step(&mut state, mouse(LEFT, 2, 0));
        assert_eq!(fixture.step(&mut state, mouse(RELEASE, 2, 0)), [PAINT]);

        // Invariant: leaving the strip keeps the last insertion until the button is released.
        fixture.step(&mut state, mouse(LEFT, 2, 0));
        assert_eq!(
            fixture.step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 29, 0)),
            [PAINT]
        );
        let marker = state.mode.drag().and_then(|drag| drag.marker_column);
        assert!(marker.is_some());
        assert_eq!(
            fixture.step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 2, 1)),
            [PAINT]
        );
        assert!(
            state
                .mode
                .drag()
                .is_some_and(|drag| drag.drop_index == Some(0))
        );
        assert_eq!(
            fixture.step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 29, 1)),
            [PAINT]
        );
        assert!(
            state
                .mode
                .drag()
                .is_some_and(|drag| drag.shown && drag.marker_column == marker)
        );
        assert!(
            fixture
                .step(&mut state, mouse(MouseKind::Moved, 29, 2))
                .is_empty()
        );
        assert!(
            state
                .mode
                .drag()
                .is_some_and(|drag| drag.marker_column == marker)
        );
        assert_eq!(
            fixture.step(&mut state, mouse(RELEASE, 29, 1)),
            [
                Effect::Send(Request::Reorder {
                    tab_id: "a".into(),
                    target_index: 2,
                    expected_revision: 3,
                }),
                PAINT
            ]
        );
        assert!(matches!(state.mode, Mode::Idle));

        // Invariant: A source removed during the gesture cannot produce a reorder.
        fixture.step(&mut state, mouse(LEFT, 2, 0));
        fixture.step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 29, 0));
        fixture.tabs.remove(0);
        assert_eq!(fixture.step(&mut state, mouse(RELEASE, 29, 0)), [PAINT]);
    }

    #[test]
    fn drag_uses_latest_revision_when_tab_order_is_unchanged() {
        let fixture = Fixture::new(&["a", "b", "c"], "a");
        let mut state = fixture.state();
        state.registry_revision = 3;
        fixture.step(&mut state, mouse(LEFT, 12, 0));
        fixture.step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 29, 0));
        // Concurrency: viewing a tab or updating its status advances the registry during a drag.
        state.registry_revision = 4;
        assert_eq!(
            fixture.step(&mut state, mouse(RELEASE, 29, 0)),
            [
                Effect::Send(Request::Reorder {
                    tab_id: "b".into(),
                    target_index: 2,
                    expected_revision: 4,
                }),
                PAINT
            ]
        );
        assert_eq!(
            fixture.step(
                &mut state,
                server(ServerEvent::Reordered {
                    accepted: false,
                    message: Some("stale tab order".into()),
                })
            ),
            [Effect::Send(Request::List)]
        );
        assert_eq!(state.notice, None);
    }

    #[test]
    fn release_at_marker_after_last_settings_tab_requests_last_visible_slot() {
        let fixture = Fixture::new(&["a", "b", "settings-1"], "a");
        let mut state = fixture.state();
        state.view.settings.shown = true;
        state.registry_revision = 9;
        fixture.step(&mut state, mouse(LEFT, 2, 0));
        fixture.step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 29, 0));
        assert_eq!(state.mode.drag().and_then(|drag| drag.drop_index), Some(2));
        assert_eq!(
            fixture.step(&mut state, mouse(RELEASE, 29, 0)),
            [
                Effect::Send(Request::Reorder {
                    tab_id: "a".into(),
                    target_index: 2,
                    expected_revision: 9,
                }),
                PAINT,
            ]
        );
    }

    #[test]
    fn drag_does_not_rebase_across_changed_tab_order() {
        let mut fixture = Fixture::new(&["a", "b", "c"], "a");
        let mut state = fixture.state();
        fixture.step(&mut state, mouse(LEFT, 12, 0));
        fixture.step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 29, 0));
        fixture.tabs.swap(0, 1);
        state.registry_revision += 1;
        assert_eq!(fixture.step(&mut state, mouse(RELEASE, 29, 0)), [PAINT]);
    }

    #[test]
    fn body_pointer_input_reaches_the_child_unless_motion_is_untracked_or_pending() {
        let mut fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        state.hovered = Some(Hover::New);
        state.notice = Some("old".into());
        assert_eq!(
            fixture.step(&mut state, mouse(MouseKind::Moved, 3, 4)),
            [PAINT, Effect::ForwardMouse]
        );
        assert_eq!(state.notice, None);
        fixture.mouse_tracking = Some(false);
        assert!(
            fixture
                .step(&mut state, mouse(MouseKind::Moved, 3, 4))
                .is_empty()
        );
        assert_eq!(
            fixture.step(&mut state, mouse(MouseKind::ScrollUp, 3, 4)),
            [Effect::ForwardMouse]
        );
        fixture.mouse_tracking = Some(true);
        fixture.requested = Some("b".into());
        assert!(
            fixture
                .step(&mut state, mouse(MouseKind::Moved, 3, 4))
                .is_empty()
        );
    }

    #[test]
    fn child_primary_drag_keeps_ownership_across_the_strip() {
        let fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        assert_eq!(
            fixture.step(&mut state, mouse(LEFT, 8, 4)),
            [Effect::ForwardMouse]
        );
        assert!(state.child_primary_drag);
        assert_eq!(
            fixture.step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 6, 0),),
            [Effect::ForwardMouse]
        );
        assert_eq!(
            fixture.step(&mut state, mouse(RELEASE, 6, 0)),
            [Effect::ForwardMouse]
        );
        assert!(!state.child_primary_drag);

        fixture.step(&mut state, mouse(LEFT, 8, 4));
        fixture.step(&mut state, Event::Focus { gained: false });
        assert!(!state.child_primary_drag);

        assert!(
            fixture
                .step(&mut state, mouse(MouseKind::Drag(MouseButton::Left), 6, 0),)
                .is_empty(),
            "strip motion without child ownership stays resident-host owned"
        );
    }

    #[test]
    fn the_palette_takes_keys_and_paste_ignores_the_pointer_and_runs_its_entry() {
        let fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        assert_eq!(fixture.step(&mut state, shortcut("tabs.commands")), [PAINT]);
        assert!(state.mode.palette().is_some());
        assert_eq!(fixture.step(&mut state, key(KeyCode::Char('c'))), [PAINT]);
        assert_eq!(
            fixture.step(&mut state, Event::Paste("han".into())),
            [PAINT]
        );
        assert_eq!(
            state.mode.palette().map(|palette| palette.shown()),
            Some(vec![("Changelog", "tabs.changelog")])
        );
        assert!(
            fixture.step(&mut state, mouse(LEFT, 31, 0)).is_empty(),
            "the pointer never reaches the strip or child"
        );
        assert!(fixture.step(&mut state, key(KeyCode::Tab)).is_empty());
        assert_eq!(
            fixture.step(&mut state, key(KeyCode::Enter)),
            [Effect::Send(Request::OpenChangelog), PAINT]
        );
        assert!(state.mode.palette().is_none());

        fixture.step(&mut state, shortcut("tabs.commands"));
        assert_eq!(fixture.step(&mut state, shortcut("tabs.commands")), [PAINT]);
        assert!(state.mode.palette().is_none(), "its own shortcut closes it");
        fixture.step(&mut state, shortcut("tabs.commands"));
        assert_eq!(fixture.step(&mut state, key(KeyCode::Esc)), [PAINT]);
        assert!(state.mode.palette().is_none());
        fixture.step(&mut state, shortcut("tabs.commands"));
        assert_eq!(
            fixture.step(&mut state, shortcut("tabs.new")),
            [Effect::Send(Request::Create), PAINT],
            "another shortcut closes the palette and runs"
        );
        assert!(state.mode.palette().is_none());
    }

    #[test]
    fn paste_edits_rename_is_dropped_by_menus_and_failures_and_otherwise_forwards() {
        let fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        fixture.step(&mut state, shortcut("tabs.rename"));
        assert_eq!(
            fixture.step(&mut state, Event::Paste("x\ny".into())),
            [PAINT]
        );
        assert_eq!(
            state.mode.rename().map(|editor| editor.text.as_str()),
            Some("a namexy")
        );
        fixture.step(&mut state, key(KeyCode::Esc));
        fixture.step(&mut state, mouse(RIGHT, 2, 0));
        assert!(
            fixture
                .step(&mut state, Event::Paste("text".into()))
                .is_empty()
        );
        fixture.step(&mut state, key(KeyCode::Esc));
        assert_eq!(
            fixture.step(&mut state, Event::Paste("text".into())),
            [Effect::ForwardPaste("text".into())]
        );
        assert!(state.user_input_pending);
        state.failed_tab = Some("a".into());
        assert!(
            fixture
                .step(&mut state, Event::Paste("text".into()))
                .is_empty()
        );
    }

    #[test]
    fn resize_refits_an_open_menu_and_repaints_clean() {
        let fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        state.mode = Mode::Popup(PopupMenu::add(70, 80, &Labels, false));
        assert_eq!(
            fixture.step(&mut state, Event::Resize { columns: 20 }),
            [Effect::Paint { clear: true }]
        );
        assert_eq!(state.columns, 20);
        let menu = state.mode.popup().expect("menu survives a resize");
        assert!(menu.column + menu.width <= 20);
    }

    #[test]
    fn focus_reports_claim_input_unless_a_view_is_pending_or_the_tab_failed() {
        let mut fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        assert_eq!(
            fixture.step(&mut state, Event::Focus { gained: true }),
            [
                Effect::Send(Request::ClaimInput),
                Effect::ForwardFocus { gained: true }
            ]
        );
        assert_eq!(
            fixture.step(&mut state, Event::Focus { gained: false }),
            [Effect::ForwardFocus { gained: false }]
        );
        state.view.pending_created_activation = true;
        assert!(
            fixture
                .step(&mut state, Event::Focus { gained: true })
                .is_empty()
        );
        state.view.pending_created_activation = false;
        fixture.requested = Some("b".into());
        assert!(
            fixture
                .step(&mut state, Event::Focus { gained: true })
                .is_empty()
        );
        fixture.requested = None;
        state.failed_tab = Some("a".into());
        assert!(
            fixture
                .step(&mut state, Event::Focus { gained: false })
                .is_empty()
        );
    }

    #[test]
    fn settings_toggles_reuses_and_prewarms_one_hidden_tab() {
        let fixture = Fixture::new(&["a", "settings-1"], "settings-1");
        let mut state = fixture.state();
        state.view.settings.shown = true;
        assert_eq!(
            fixture.step(&mut state, shortcut("tabs.settings")),
            [Effect::View("a".into()), PAINT]
        );
        assert!(
            !state.view.settings.shown,
            "hiding keeps the process for reuse"
        );

        let hidden = Fixture::new(&["a", "settings-1"], "a");
        let mut state = hidden.state();
        assert_eq!(
            hidden.step(&mut state, shortcut("tabs.settings")),
            [Effect::Send(Request::OpenSettings), PAINT]
        );
        state.view.settings.shown = true;
        assert_eq!(
            hidden.step(&mut state, shortcut("tabs.settings")),
            [Effect::View("settings-1".into()), PAINT]
        );
        assert!(
            state.view.settings.shown,
            "the first shortcut selects Settings"
        );
        let mut popup = PopupMenu::add(0, 80, &Labels, true);
        popup.hovered = Some(2);
        state.mode = Mode::Popup(popup);
        assert_eq!(
            hidden.step(&mut state, key(KeyCode::Enter)),
            [Effect::View("settings-1".into()), PAINT]
        );
        assert!(
            state.view.settings.shown,
            "the checked menu item selects Settings"
        );
        let dragged = Fixture::new(&["settings-1", "a"], "a");
        let mut already_visible = dragged.state();
        already_visible.view.settings.shown = true;
        assert_eq!(
            dragged.step(&mut already_visible, shortcut("tabs.settings")),
            [Effect::View("settings-1".into()), PAINT],
            "an already visible Settings tab keeps its dragged slot"
        );
        let mut active = fixture.state();
        active.view.settings.shown = true;
        let mut popup = PopupMenu::add(0, 80, &Labels, true);
        popup.hovered = Some(2);
        active.mode = Mode::Popup(popup);
        assert_eq!(
            fixture.step(&mut active, key(KeyCode::Enter)),
            [Effect::View("a".into()), PAINT]
        );
        assert!(
            !active.view.settings.shown,
            "clicking the checked item while active hides Settings"
        );
        let lone = Fixture::new(&["settings-1"], "settings-1");
        let mut state = lone.state();
        assert_eq!(
            lone.step(&mut state, shortcut("tabs.settings")),
            [Effect::Send(Request::Close("settings-1".into())), PAINT]
        );

        let absent = Fixture::new(&["a"], "a");
        let mut state = absent.state();
        assert_eq!(
            absent.step_at(&mut state, Event::Tick, NOW),
            [Effect::Send(Request::PrewarmSettings)],
            "prewarm starts as soon as the first Agent is registered"
        );
        assert!(state.view.settings.pending);
        let prewarmed = server(ServerEvent::Created {
            tab_id: "settings-2".into(),
            created: true,
        });
        assert_eq!(
            absent.step(&mut state, prewarmed),
            [Effect::Send(Request::List)],
            "a prewarmed tab never takes the view"
        );
        assert!(!state.view.settings.pending);
        assert_eq!(
            absent.step(&mut state, shortcut("tabs.settings")),
            [Effect::Send(Request::OpenSettings), PAINT]
        );
        assert!(!state.settings_visible(Some("a")));
        assert!(state.settings_visible(Some("settings-2")));
    }

    #[test]
    fn deferred_input_waits_for_the_pending_view_and_is_released_by_its_commit() {
        let fixture = Fixture::new(&["a", "b"], "b");
        let mut state = fixture.state();
        assert_eq!(state.route_input(None, vec![vec![1]]), Some(vec![vec![1]]));
        assert_eq!(state.route_input(Some("b"), vec![vec![2]]), None);
        state.user_input_pending = true;
        let committed = server(ServerEvent::Commit {
            tab_id: "b".into(),
            status: "idle".into(),
            requested: true,
        });
        assert_eq!(
            fixture.step(&mut state, committed),
            [Effect::Write(vec![vec![2]])]
        );
        assert!(state.user_input_pending);

        state.view.pending_created_activation = true;
        assert_eq!(state.route_input(None, vec![vec![3]]), None);
        let created = server(ServerEvent::Created {
            tab_id: "c".into(),
            created: true,
        });
        assert_eq!(
            fixture.step(&mut state, created),
            [
                Effect::View("c".into()),
                Effect::AwaitFirstDraw("c".into()),
                Effect::Send(Request::List)
            ]
        );
        let failed = server(ServerEvent::Commit {
            tab_id: "c".into(),
            status: "failed".into(),
            requested: true,
        });
        assert!(
            fixture.step(&mut state, failed).is_empty(),
            "a failed target drops its input"
        );
        assert!(!state.user_input_pending);
        assert_eq!(state.failed_tab.as_deref(), Some("c"));
    }

    #[test]
    fn server_answers_update_notices_names_and_failure() {
        let fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        let answer = |state: &mut State, event| fixture.step(state, server(event));
        state.pending_manual_name = Some(("a".into(), "x".into()));
        let renamed = ServerEvent::Renamed {
            accepted: true,
            message: None,
        };
        assert_eq!(answer(&mut state, renamed), [Effect::Send(Request::List)]);
        assert!(state.pending_manual_name.is_some());
        let taken = ServerEvent::Renamed {
            accepted: false,
            message: Some("taken".into()),
        };
        assert_eq!(answer(&mut state, taken), [PAINT]);
        assert_eq!(
            (state.pending_manual_name.as_ref(), state.notice.as_deref()),
            (None, Some("taken"))
        );
        assert_eq!(
            answer(&mut state, ServerEvent::RenameRefused { message: None }),
            [Effect::Send(Request::List), PAINT]
        );
        for accepted in [
            ServerEvent::Reordered {
                accepted: true,
                message: None,
            },
            ServerEvent::Closed {
                accepted: true,
                message: None,
            },
        ] {
            assert_eq!(answer(&mut state, accepted), [Effect::Send(Request::List)]);
        }
        let stale = ServerEvent::Reordered {
            accepted: false,
            message: Some("stale".into()),
        };
        assert_eq!(
            answer(&mut state, stale),
            [PAINT, Effect::Send(Request::List)]
        );
        let restarted = ServerEvent::Answered {
            accepted: true,
            message: None,
        };
        assert!(answer(&mut state, restarted).is_empty());
        let busy = ServerEvent::Answered {
            accepted: false,
            message: Some("busy".into()),
        };
        assert_eq!(answer(&mut state, busy), [PAINT]);
        state.close_fallback = close_fallback_for(&fixture.tabs, Some("a"), "a");
        let refused = ServerEvent::Closed {
            accepted: false,
            message: Some("no".into()),
        };
        answer(&mut state, refused);
        assert!(state.close_fallback.is_none());
        assert_eq!(answer(&mut state, ServerEvent::HolderExit), [PAINT]);
        assert_eq!(
            answer(&mut state, ServerEvent::Failure { message: None }),
            [PAINT]
        );
        assert_eq!(
            (state.failed_tab.as_deref(), state.notice.as_deref()),
            (Some("a"), Some("tab failed"))
        );
        let recovered = ServerEvent::Status {
            tab_id: "a".into(),
            status: "idle".into(),
        };
        assert_eq!(answer(&mut state, recovered), [PAINT]);
        assert_eq!(state.failed_tab, None);
        assert!(answer(&mut state, ServerEvent::Notice { message: None }).is_empty());
        let viewer = ServerEvent::Notice {
            message: Some("viewer".into()),
        };
        assert_eq!(answer(&mut state, viewer), [PAINT]);
        assert!(answer(&mut state, ServerEvent::ShortcutsChanged).is_empty());
        state.mode = Mode::Popup(PopupMenu::add(0, 80, &Labels, false));
        assert_eq!(answer(&mut state, ServerEvent::ShortcutsChanged), [PAINT]);
    }

    #[test]
    fn input_rejections_notify_only_typed_input_and_claim_loss_is_silent() {
        let fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        let rejected = || {
            server(ServerEvent::InputRejected {
                message: Some("read-only".into()),
            })
        };
        assert!(fixture.step(&mut state, rejected()).is_empty());
        state.user_input_pending = true;
        assert_eq!(fixture.step(&mut state, rejected()), [PAINT]);
        assert!(!state.user_input_pending);
        state.user_input_pending = true;
        assert_eq!(
            fixture.step(&mut state, server(ServerEvent::InputClaimLost)),
            [Effect::Send(Request::ClaimInput)]
        );
        assert!(!state.user_input_pending);
    }

    #[test]
    fn create_failure_cancels_the_pending_view_and_its_input() {
        let mut fixture = Fixture::new(&["a"], "a");
        fixture.requested = Some("b".into());
        let mut state = fixture.state();
        state.view.pending_created_activation = true;
        state.route_input(Some("b"), vec![vec![1]]);
        state.user_input_pending = true;
        let failed = server(ServerEvent::CreateFailed {
            notice: "limit".into(),
        });
        assert_eq!(
            fixture.step(&mut state, failed),
            [Effect::CancelViewRequest, PAINT]
        );
        assert!(!state.view.pending_created_activation && !state.user_input_pending);
        assert_eq!(state.deferred.resolve("b"), (Vec::<Vec<u8>>::new(), false));
        assert_eq!(state.notice.as_deref(), Some("limit"));
    }

    #[test]
    fn one_mode_at_a_time_and_prompts_belong_to_their_view() {
        let fixture = Fixture::new(&["a", "b"], "a");
        let mut state = fixture.state();
        fixture.step(&mut state, shortcut("tabs.rename"));
        assert!(state.mode.rename().is_some());
        // Invariant: a strip press closes the prompt and opens the menu in its place.
        fixture.step(&mut state, mouse(RIGHT, 12, 0));
        assert!(state.mode.popup().is_some() && state.mode.rename().is_none());
        fixture.step(&mut state, key(KeyCode::Esc));
        fixture.step(&mut state, mouse(LEFT, 12, 0));
        assert!(state.mode.drag().is_some());
        fixture.step(&mut state, shortcut("tabs.rename"));
        assert!(state.mode.rename().is_some() && state.mode.drag().is_none());

        // Invariant: a view change cancels a prompt but not a drag.
        let moved = Fixture::new(&["a", "b"], "b");
        moved.step(&mut state, key(KeyCode::Char('x')));
        assert!(matches!(state.mode, Mode::Idle));
        moved.step(&mut state, mouse(LEFT, 2, 0));
        fixture.step(&mut state, Event::Focus { gained: true });
        assert!(state.mode.drag().is_some());
        // Invariant: a body click closes a rename without reaching the child.
        fixture.step(&mut state, mouse(RELEASE, 2, 0));
        fixture.step(&mut state, shortcut("tabs.rename"));
        assert_eq!(fixture.step(&mut state, mouse(LEFT, 5, 5)), [PAINT]);
        assert!(matches!(state.mode, Mode::Idle));
    }

    #[test]
    fn an_installed_registry_clears_prompts_and_names_for_vanished_tabs() {
        let mut state = State {
            mode: Mode::Rename(RenameEditor::new("gone".into(), "x".into())),
            pending_manual_name: Some(("gone".into(), "x".into())),
            failed_tab: Some("gone".into()),
            ..State::default()
        };
        state.installed(&[tab("a")], false);
        assert!(matches!(state.mode, Mode::Idle));
        assert!(state.pending_manual_name.is_none() && state.failed_tab.is_none());

        state.mode = Mode::Popup(PopupMenu::overflow(0, 80, &[], &[tab("a")], None));
        state.installed(&[tab("a")], false);
        assert!(state.mode.popup().is_some());
        state.installed(&[tab("a")], true);
        assert!(
            matches!(state.mode, Mode::Idle),
            "a changed registry closes the overflow menu"
        );

        state.close_fallback = close_fallback_for(&[tab("a"), tab("b")], Some("a"), "a");
        assert_eq!(
            state.fallback_view(&[tab("b"), tab("settings-1")], false),
            Some("b".into())
        );
        state.installed::<AttachTab>(&[], false);
        assert!(state.close_fallback.is_none());
        assert_eq!(
            state.fallback_view(&[tab("settings-1"), tab("c")], false),
            Some("c".into())
        );
        assert_eq!(
            state.fallback_view(&[tab("settings-1"), tab("c")], true),
            Some("settings-1".into())
        );
        state.route_input(Some("x"), vec![vec![1]]);
        state.user_input_pending = true;
        state.drop_request(Some("x"));
        assert!(!state.user_input_pending);
    }

    #[test]
    fn the_landing_keeps_a_hidden_settings_tab_ready() {
        let mut cold = Fixture::new(&[], "none");
        cold.viewed = None;
        let mut state = cold.state();
        assert_eq!(
            cold.step(&mut state, Event::Tick),
            [],
            "a cold attach waits for its first Agent before prewarming"
        );
        let mut landing = Fixture::new(&[], "none");
        landing.viewed = None;
        landing.landing = true;
        let mut state = landing.state();
        assert_eq!(
            landing.step(&mut state, Event::Tick),
            [Effect::Send(Request::PrewarmSettings)],
            "the landing prewarms Settings so the shortcut opens it at once"
        );
        assert_eq!(
            landing.step(&mut state, Event::Tick),
            [],
            "one prewarm at a time"
        );
        let mut ready = Fixture::new(&["settings-1"], "none");
        ready.viewed = None;
        ready.landing = true;
        let mut state = ready.state();
        assert_eq!(
            ready.step(&mut state, Event::Tick),
            [Effect::Send(Request::PrewarmChangelog)],
            "a ready Settings is reused, and Changelog is prewarmed after it"
        );
        let prewarmed = server(ServerEvent::Created {
            tab_id: "changelog-2".into(),
            created: true,
        });
        assert_eq!(
            ready.step(&mut state, prewarmed),
            [Effect::Send(Request::List)],
            "a prewarmed Changelog never takes the view"
        );
        let both = Fixture::new(&["a", "settings-1", "changelog-2"], "a");
        let mut state = both.state();
        assert!(
            both.step(&mut state, Event::Tick).is_empty(),
            "both are ready"
        );
        assert_eq!(
            both.step(&mut state, shortcut("tabs.changelog")),
            [Effect::View("changelog-2".into()), PAINT],
            "opening Changelog shows the running hidden tab at once"
        );
        assert!(
            state
                .shown(&both.context())
                .iter()
                .all(|tab| tab.id() != "changelog-2")
        );
        // Invariant: the shortcut asks the server for the singleton, which selects the running
        // hidden tab instead of starting one.
        assert!(
            ready
                .step(&mut state, shortcut("tabs.settings"))
                .contains(&Effect::Send(Request::OpenSettings))
        );
    }

    #[test]
    fn the_changelog_action_shows_or_creates_one_utility_tab() {
        let fixture = Fixture::new(&["a"], "a");
        let mut state = fixture.state();
        assert_eq!(
            fixture.step(&mut state, shortcut("tabs.changelog")),
            [Effect::Send(Request::OpenChangelog), PAINT]
        );
        assert!(state.view.pending_created_activation);
        let existing = Fixture::new(&["a", "changelog-1"], "a");
        let mut state = existing.state();
        assert_eq!(
            existing.step(&mut state, shortcut("tabs.changelog")),
            [Effect::View("changelog-1".into()), PAINT],
            "an open Changelog is reused"
        );
    }

    #[test]
    fn a_changelog_tab_is_closed_but_never_renamed() {
        let fixture = Fixture::new(&["a", "changelog-1"], "changelog-1");
        let mut state = fixture.state();
        fixture.step(&mut state, shortcut("tabs.rename"));
        assert!(matches!(state.mode, Mode::Idle), "no rename prompt opens");
        fixture.step(&mut state, mouse(RIGHT, 12, 0));
        let labels = state
            .mode
            .popup()
            .map(|menu| {
                menu.items
                    .iter()
                    .map(|item| item.label.clone())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        assert_eq!(labels, ["Close"]);
    }
}
