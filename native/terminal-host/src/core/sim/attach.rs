//! Seeded schedules for the attach state machine. A model registry answers its requests the way
//! the resident server and presentation view model do, while keys, pointer events, pastes,
//! resizes, focus reports, server answers, and ticks arrive in a random order.

use std::time::Duration;

use super::{SimulationFailure, failure, next};
use crate::core::attach::{
    AttachKey, AttachMouse, AttachTab, Context, Effect, Event, KeyCode, KeyKind, Mode, Modifiers,
    MouseButton, MouseKind, Request, ServerEvent, ShortcutLabels, State, StripHitKind,
    StripSnapshot, shown_tabs,
};

const CHIP_WIDTH: u16 = 10;
const VISIBLE_CHIPS: usize = 5;
const ACTIONS: [&str; 9] = [
    "tabs.new",
    "tabs.close",
    "tabs.rename",
    "tabs.next",
    "tabs.previous",
    "tabs.moveLeft",
    "tabs.moveRight",
    "tabs.jump2",
    "tabs.settings",
];
const STATUSES: [&str; 5] = ["idle", "working", "stalled", "failed", "done"];

struct Labels;

impl ShortcutLabels for Labels {
    fn label(&self, action: &str) -> String {
        action.to_owned()
    }
}

/// The registry and view the attach client is attached to.
struct Model {
    tabs: Vec<AttachTab>,
    viewed: Option<String>,
    requested: Option<String>,
    creating: Vec<String>,
    created: usize,
}

impl Model {
    fn new() -> Self {
        Self {
            tabs: (0..3).map(|index| tab(&format!("tab-{index}"))).collect(),
            viewed: Some("tab-0".into()),
            requested: None,
            creating: Vec::new(),
            created: 3,
        }
    }

    /// The strip as the role renders it: shown tabs as fixed-width chips, then the overflow
    /// marker and the `+` button.
    fn strip(&self, state: &State) -> StripSnapshot {
        let shown = shown_tabs(
            &self.tabs,
            self.viewed.as_deref(),
            state.view.settings_shown,
        );
        let mut hits = Vec::new();
        let mut column = 0;
        for tab in shown.iter().take(VISIBLE_CHIPS) {
            hits.push((
                column,
                column + CHIP_WIDTH,
                StripHitKind::View(tab.id.clone()),
            ));
            column += CHIP_WIDTH;
        }
        let hidden_tabs = shown
            .iter()
            .skip(VISIBLE_CHIPS)
            .map(|tab| tab.id.clone())
            .collect::<Vec<_>>();
        if !hidden_tabs.is_empty() {
            hits.push((column, column + 2, StripHitKind::Overflow));
            column += 2;
        }
        hits.push((column, column + 3, StripHitKind::New));
        StripSnapshot { hits, hidden_tabs }
    }

    fn listed(&self, id: &str) -> bool {
        self.tabs.iter().any(|tab| tab.id == id)
    }
}

fn tab(id: &str) -> AttachTab {
    AttachTab {
        id: id.into(),
        name: id.into(),
        name_source: "default".into(),
        status: "idle".into(),
        accent: None,
    }
}

/// What a paint shows of the interaction state: the open popup, the rename prompt, the drag
/// marker, and the strip hover. A drag that has not crossed its threshold draws nothing.
fn presented(state: &State) -> String {
    let mode = match &state.mode {
        Mode::Idle => String::new(),
        Mode::Popup(menu) => format!("{menu:?}"),
        Mode::Rename(editor) => {
            format!("{} {} {:?}", editor.text, editor.cursor, editor.selection())
        }
        Mode::Drag(drag) if drag.shown => format!("drag {:?}", drag.drop_index),
        Mode::Drag(_) => String::new(),
        Mode::Dialog(dialog) => format!("{dialog:?}"),
    };
    format!("{mode} | {:?}", state.hovered)
}

struct Run<'a> {
    seed: u64,
    random: u64,
    now: Duration,
    state: State,
    model: Model,
    events: &'a mut Vec<String>,
}

pub fn run(seed: u64, steps: usize) -> Result<(), SimulationFailure> {
    execute(seed, steps, &mut Vec::new())
}

/// The executed event sequence of a schedule, for coverage checks and failure reports.
pub fn trace(seed: u64, steps: usize) -> Result<Vec<String>, SimulationFailure> {
    let mut events = Vec::new();
    execute(seed, steps, &mut events)?;
    Ok(events)
}

pub fn run_seeds(count: u64, steps: usize) -> Result<(), SimulationFailure> {
    (0..count).try_for_each(|seed| run(seed, steps))
}

fn execute(seed: u64, steps: usize, events: &mut Vec<String>) -> Result<(), SimulationFailure> {
    let model = Model::new();
    let mut run = Run {
        seed,
        random: seed | 1,
        now: Duration::ZERO,
        state: State::new(model.viewed.clone(), 80, 24),
        model,
        events,
    };
    for _ in 0..steps {
        run.random = next(run.random);
        run.now += Duration::from_millis(5 + run.random % 400);
        let (name, event) = run.choose();
        run.deliver(name, event)?;
    }
    Ok(())
}

impl Run<'_> {
    fn pick(&mut self, count: usize) -> usize {
        self.random = next(self.random);
        (self.random % count.max(1) as u64) as usize
    }

    fn choose(&mut self) -> (&'static str, Event) {
        match self.random % 16 {
            0..=2 => ("key", self.key()),
            3 => ("shortcut", self.shortcut()),
            4..=7 => ("mouse", self.mouse()),
            8 => ("paste", Event::Paste("pasted".into())),
            9 => (
                "resize",
                Event::Resize {
                    columns: 40 + self.pick(80) as u16,
                    rows: 4 + self.pick(40) as u16,
                },
            ),
            10 => (
                "focus",
                Event::Focus {
                    gained: self.pick(2) == 0,
                },
            ),
            11 => ("tick", Event::Tick),
            _ => self.server(),
        }
    }

    fn key(&mut self) -> Event {
        let code = [
            KeyCode::Esc,
            KeyCode::Enter,
            KeyCode::Up,
            KeyCode::Down,
            KeyCode::Left,
            KeyCode::Backspace,
            KeyCode::Tab,
            KeyCode::Char('x'),
        ][self.pick(8)];
        let modifiers = Modifiers {
            control: self.pick(4) == 0,
            ..Modifiers::NONE
        };
        let kind = if self.pick(10) == 0 {
            KeyKind::Release
        } else {
            KeyKind::Press
        };
        Event::Key {
            key: AttachKey {
                code,
                modifiers,
                kind,
            },
            action: None,
        }
    }

    fn shortcut(&mut self) -> Event {
        Event::Key {
            key: AttachKey {
                code: KeyCode::Char('t'),
                modifiers: Modifiers {
                    alt: true,
                    ..Modifiers::NONE
                },
                kind: KeyKind::Press,
            },
            action: Some(ACTIONS[self.pick(ACTIONS.len())].into()),
        }
    }

    fn mouse(&mut self) -> Event {
        let kind = [
            MouseKind::Moved,
            MouseKind::Down(MouseButton::Left),
            MouseKind::Down(MouseButton::Right),
            MouseKind::Up(MouseButton::Left),
            MouseKind::Drag(MouseButton::Left),
            MouseKind::ScrollDown,
        ][self.pick(6)];
        let row = [0, 0, 1, 2, 5][self.pick(5)];
        Event::Mouse(AttachMouse {
            kind,
            column: self.pick(70) as u16,
            row,
            modifiers: Modifiers::NONE,
        })
    }

    fn server(&mut self) -> (&'static str, Event) {
        let index = self.pick(self.model.tabs.len());
        let some_tab = self.model.tabs.get(index).map(|tab| tab.id.clone());
        let event = match self.pick(9) {
            0 if self.model.requested.is_some() => return ("commit", Event::Tick),
            1 if !self.model.creating.is_empty() => return ("created", Event::Tick),
            2 if !self.model.creating.is_empty() => ServerEvent::CreateFailed {
                notice: "limit".into(),
            },
            3 if some_tab.is_some() => {
                // Rationale: the role installs a status before stepping the core, so the model
                // tab carries it when the dialog rule reads the viewed tab.
                let status = STATUSES[self.pick(STATUSES.len())].to_owned();
                let tab_id = some_tab.unwrap_or_default();
                if let Some(tab) = self.model.tabs.iter_mut().find(|tab| tab.id == tab_id) {
                    tab.status = status.clone();
                }
                ServerEvent::Status { tab_id, status }
            }
            4 => ServerEvent::Failure { message: None },
            5 => ServerEvent::InputRejected {
                message: Some("rejected".into()),
            },
            6 => ServerEvent::InputClaimLost,
            7 => ServerEvent::Notice {
                message: Some("notice".into()),
            },
            _ => return ("exit", Event::Tick),
        };
        ("server", Event::Server(event))
    }

    /// Steps the client and applies its effects; `painted` is true when the role paints after
    /// the step on its own, as it does after a commit or an installed registry.
    fn step(&mut self, event: Event, painted: bool) -> Result<(), SimulationFailure> {
        let before = presented(&self.state);
        let exited = self.state.exited;
        let now = self.now;
        let effects = {
            let state = &mut self.state;
            let strip = self.model.strip(state);
            state.step(
                &Context {
                    tabs: &self.model.tabs,
                    viewed: self.model.viewed.as_deref(),
                    requested: self.model.requested.as_deref(),
                    strip: &strip,
                    shortcuts: &Labels,
                    mouse_tracking: None,
                },
                event,
                now,
            )
        };
        if exited && !effects.is_empty() {
            return self.fail("an exited client produced effects");
        }
        let painted = painted
            || effects
                .iter()
                .any(|effect| matches!(effect, Effect::Paint { .. }));
        for effect in effects {
            self.apply(effect)?;
        }
        if presented(&self.state) != before && !painted {
            return self.fail(&format!(
                "interaction state changed without a paint: {before} -> {}",
                presented(&self.state)
            ));
        }
        Ok(())
    }

    fn deliver(&mut self, name: &'static str, event: Event) -> Result<(), SimulationFailure> {
        self.events.push(name.into());
        match name {
            "commit" => self.commit(),
            "created" => self.created(),
            "exit" if !self.state.exited => {
                self.state.exit();
                Ok(())
            }
            "exit" => self.step(Event::Tick, false),
            _ => {
                if let Some(mode) = mode_name(&self.state.mode) {
                    self.events.push(mode.into());
                }
                self.step(event, false)
            }
        }
    }

    /// The presentation view model commits the requested tab's surface.
    fn commit(&mut self) -> Result<(), SimulationFailure> {
        let Some(tab_id) = self.model.requested.take() else {
            return Ok(());
        };
        if !self.model.listed(&tab_id) {
            return Ok(());
        }
        self.model.viewed = Some(tab_id.clone());
        let status = self
            .model
            .tabs
            .iter()
            .find(|tab| tab.id == tab_id)
            .map_or_else(String::new, |tab| tab.status.clone());
        self.step(
            Event::Server(ServerEvent::Commit {
                tab_id,
                status,
                requested: true,
            }),
            true,
        )?;
        self.check_mode()
    }

    /// The server finished a requested creation and lists the new tab.
    fn created(&mut self) -> Result<(), SimulationFailure> {
        let tab_id = self.model.creating.remove(0);
        self.model.tabs.push(tab(&tab_id));
        self.install(true)?;
        self.step(
            Event::Server(ServerEvent::Created {
                tab_id,
                created: true,
            }),
            false,
        )
    }

    /// The role installs a changed registry and repaints.
    fn install(&mut self, changed: bool) -> Result<(), SimulationFailure> {
        let before = presented(&self.state);
        self.state.installed(&self.model.tabs, changed);
        if self
            .model
            .viewed
            .as_deref()
            .is_some_and(|id| !self.model.listed(id))
        {
            let settings_visible = self.state.settings_visible(self.model.viewed.as_deref());
            self.model.viewed = None;
            self.model.requested = self.state.fallback_view(&self.model.tabs, settings_visible);
        }
        if presented(&self.state) != before && !changed && !self.model.tabs.is_empty() {
            return self.fail("an unchanged registry altered the interaction state");
        }
        self.check_mode()
    }

    fn apply(&mut self, effect: Effect) -> Result<(), SimulationFailure> {
        match effect {
            Effect::Send(request) => self.request(request),
            Effect::View(tab_id) => {
                if self.model.listed(&tab_id) {
                    self.model.requested = Some(tab_id);
                }
                Ok(())
            }
            Effect::CancelViewRequest => {
                self.model.requested = None;
                Ok(())
            }
            Effect::Renamed { tab_id, name } => {
                if let Some(tab) = self.model.tabs.iter_mut().find(|tab| tab.id == tab_id) {
                    tab.name = name;
                    tab.name_source = "user".into();
                }
                Ok(())
            }
            _ => Ok(()),
        }
    }

    /// The resident server answers each request against the model registry.
    fn request(&mut self, request: Request) -> Result<(), SimulationFailure> {
        match request {
            Request::Create | Request::OpenSettings | Request::PrewarmSettings => {
                let prefix = if request == Request::Create {
                    "tab"
                } else {
                    "settings"
                };
                self.model
                    .creating
                    .push(format!("{prefix}-{}", self.model.created));
                self.model.created += 1;
                Ok(())
            }
            Request::Close(tab_id) => {
                self.model.tabs.retain(|tab| tab.id != tab_id);
                self.install(true)
            }
            Request::Reorder {
                tab_id,
                target_index,
                ..
            } => {
                if let Some(from) = self.model.tabs.iter().position(|tab| tab.id == tab_id) {
                    let moved = self.model.tabs.remove(from);
                    let to = target_index.min(self.model.tabs.len());
                    self.model.tabs.insert(to, moved);
                }
                self.install(true)
            }
            Request::Rename { .. } => self.step(
                Event::Server(ServerEvent::Renamed {
                    accepted: self.random % 3 != 0,
                    message: None,
                }),
                false,
            ),
            Request::Restart(_) | Request::List | Request::ClaimInput => Ok(()),
        }
    }

    /// Invariant: after a commit or install, a prompt or menu only names listed tabs.
    fn check_mode(&mut self) -> Result<(), SimulationFailure> {
        let named = match &self.state.mode {
            Mode::Rename(editor) => Some(editor.tab_id.clone()),
            Mode::Popup(menu) => menu.tab_id.clone(),
            Mode::Dialog(dialog) => Some(dialog.tab_id.clone()),
            _ => None,
        };
        if named.is_some_and(|id| !self.model.listed(&id)) {
            return self.fail("a prompt names a tab the registry no longer lists");
        }
        Ok(())
    }

    fn fail(&self, reason: &str) -> Result<(), SimulationFailure> {
        failure(self.seed, self.events, reason)
    }
}

fn mode_name(mode: &Mode) -> Option<&'static str> {
    match mode {
        Mode::Idle => None,
        Mode::Popup(_) => Some("mode-popup"),
        Mode::Rename(_) => Some("mode-rename"),
        Mode::Drag(drag) if drag.shown => Some("mode-drag-shown"),
        Mode::Drag(_) => Some("mode-drag"),
        Mode::Dialog(_) => Some("mode-dialog"),
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    #[test]
    fn attach_schedules_keep_one_mode_paint_every_change_and_go_silent_after_exit() {
        run_seeds(super::super::seed_budget(2_000), 128).unwrap();
    }

    #[test]
    fn the_attach_corpus_reaches_every_mode_and_answer() {
        let mut seen = HashSet::new();
        for seed in 0..256 {
            seen.extend(trace(seed, 128).unwrap());
        }
        for kind in [
            "mode-popup",
            "mode-rename",
            "mode-drag",
            "mode-drag-shown",
            "mode-dialog",
            "commit",
            "created",
            "server",
            "exit",
            "shortcut",
            "paste",
            "resize",
            "focus",
            "tick",
        ] {
            assert!(seen.contains(kind), "attach corpus never exercised {kind}");
        }
    }
}
