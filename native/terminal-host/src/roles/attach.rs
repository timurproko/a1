use std::collections::HashMap;
use std::io::{Write, stdout};
use std::path::Path;
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

use crossterm::event::{
    self, Event, KeyCode, KeyEventKind, KeyModifiers, MouseButton, MouseEventKind,
};
use crossterm::terminal::{disable_raw_mode, enable_raw_mode};

use crate::endpoint;
use crate::protocol::{self, BridgeAttachment, MAX_INPUT_BYTES, Welcome};
use crate::roles::credentials::ProfileCredentials;
use crate::roles::strip::{self, StripHit, StripTab};
use crate::roles::wire::{
    self, AttachStart, Input, PasteStart, Resize, RoleHello, Surface, TabCreate, TabList,
    TabRename, TabReorder, TabStatus, TabTarget,
};

pub const ENTER_OUTER_MODES: &[u8] =
    b"\x1b[?1049h\x1b[?2004h\x1b[?1004h\x1b[?1000h\x1b[?1003h\x1b[?1006h\x1b[?2026h";
pub const RESTORE_OUTER_MODES: &[u8] =
    b"\x1b[?2026l\x1b[?1006l\x1b[?1003l\x1b[?1000l\x1b[?1004l\x1b[?2004l\x1b[?1049l";

#[derive(Debug, Default)]
struct TabBindings {
    by_key: HashMap<String, String>,
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
        if let Ok(bytes) = std::fs::read(profile.join("keybindings.json"))
            && let Ok(document) = serde_json::from_slice::<serde_json::Value>(&bytes)
            && let Some(object) = document.as_object()
        {
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
        for key in conflicts {
            by_key.remove(&key);
        }
        Self { by_key }
    }

    fn action(&self, key: &crossterm::event::KeyEvent) -> Option<&str> {
        self.by_key
            .get(&key_token(key.code, key.modifiers))
            .map(String::as_str)
    }
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

pub fn render_strip(status: &str, name: &str, accent: Option<&str>, columns: u16) -> String {
    let working = match accent.unwrap_or("purple") {
        "blue" => "\x1b[38;2;91;141;239m◐\x1b[39m ",
        "cyan" => "\x1b[38;2;74;174;196m◐\x1b[39m ",
        "green" => "\x1b[38;2;88;183;132m◐\x1b[39m ",
        "orange" => "\x1b[38;2;226;159;72m◐\x1b[39m ",
        "pink" => "\x1b[38;2;218;112;158m◐\x1b[39m ",
        _ => "\x1b[38;2;167;152;215m◐\x1b[39m ",
    };
    let glyph = match status {
        "starting" => "… ",
        "working" => working,
        "restarting" => "↻ ",
        "unresponsive" | "stalled" | "degraded" => "! ",
        "crashed" | "failed" | "ended" => "✗ ",
        _ => "",
    };
    let safe_name: String = name
        .chars()
        .filter(|value| *value != '\u{7}' && !value.is_control())
        .collect();
    let maximum = usize::from(columns).min(20);
    let fixed_width = 4 + usize::from(!glyph.is_empty()) * 2;
    let name_capacity = maximum.saturating_sub(fixed_width);
    let name_length = safe_name.chars().count();
    let visible_name = if name_length > name_capacity {
        safe_name
            .chars()
            .take(name_capacity.saturating_sub(1))
            .collect::<String>()
            + "…"
    } else {
        safe_name
    };
    let chip = format!(" {glyph}{visible_name} × ");
    let visible_width = fixed_width + visible_name.chars().count();
    format!(
        "\x1b[1;1H{chip}{}",
        " ".repeat(usize::from(columns).saturating_sub(visible_width))
    )
}

pub fn render_empty_hint(columns: u16) -> String {
    let hint = "Alt+A new tab · Ctrl+C Ctrl+C leave";
    let visible = hint.chars().take(usize::from(columns)).collect::<String>();
    format!("\x1b[2;1H\x1b[2m{visible}\x1b[0m")
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
    format!("\x1b[1;1H{notice:<width$}", width = maximum)
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
    thread::spawn(move || {
        while let Ok(Some(payload)) = wire::read_payload(&mut reader) {
            if message_tx.send(payload).is_err() {
                return;
            }
        }
        let _ = message_tx.send(Vec::new());
    });

    let mut terminal = OuterTerminal::enter()?;
    let mut tabs = Vec::<StripTab>::new();
    let mut viewed = options.view_tab.map(str::to_owned);
    let mut hovered_tab: Option<String> = None;
    let mut strip_frame = strip::render(&tabs, viewed.as_deref(), columns);
    terminal.write(strip_frame.bytes.as_bytes())?;
    terminal.write(render_empty_hint(columns).as_bytes())?;
    let started = Instant::now();
    let mut last_strip_frame = Instant::now();
    let mut last_list = Instant::now();
    let mut chord = DoubleCtrlC::new(options.clear_exit_ms);
    let mut failed = false;
    let mut rename: Option<(String, String)> = None;
    let mut context_tab: Option<String> = None;
    let mut pending_close: Option<String> = None;
    let mut registry_revision = 0u64;
    let mut drag: Option<(String, u16, Instant)> = None;
    let bindings = TabBindings::load(options.profile);
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
                    failed = surface.status == "failed";
                    if viewed.is_none() {
                        viewed = Some(surface.tab_id.clone());
                    }
                    if let Some(tab) = tabs.iter_mut().find(|tab| tab.id == surface.tab_id) {
                        tab.status = surface.status;
                        tab.accent = surface.accent;
                    }
                    strip_frame = strip::render(&tabs, viewed.as_deref(), columns);
                    terminal.write(strip_frame.bytes.as_bytes())?;
                    terminal.write(&without_bell(&surface.bytes))?;
                }
                "tab.status" => {
                    let (_, status): (_, TabStatus) = wire::body(&payload)?;
                    if let Some(tab) = tabs.iter_mut().find(|tab| tab.id == status.tab_id) {
                        tab.status = status.status;
                        tab.accent = status.accent;
                    }
                    strip_frame = strip::render(&tabs, viewed.as_deref(), columns);
                    terminal.write(strip_frame.bytes.as_bytes())?;
                }
                "tab.list" => {
                    let (_, list): (_, TabList) = wire::body(&payload)?;
                    registry_revision = list.revision;
                    tabs = list
                        .tabs
                        .into_iter()
                        .filter(|tab| tab.lifecycle != "stopped")
                        .map(|tab| {
                            let previous = tabs.iter().find(|current| current.id == tab.tab_id);
                            let changed_by_auto = tab.name_source == "auto"
                                && previous.is_some_and(|current| current.name != tab.name);
                            StripTab {
                                id: tab.tab_id,
                                name: tab.name,
                                name_source: tab.name_source,
                                status: previous
                                    .map_or(tab.lifecycle, |current| current.status.clone()),
                                accent: previous.and_then(|current| current.accent.clone()),
                                title_animation: if changed_by_auto {
                                    previous.map(|current| strip::TitleAnimation {
                                        from: current.name.clone(),
                                        started_at: Instant::now(),
                                    })
                                } else {
                                    previous.and_then(|current| current.title_animation.clone())
                                },
                            }
                        })
                        .collect();
                    if viewed
                        .as_ref()
                        .is_none_or(|id| !tabs.iter().any(|tab| &tab.id == id))
                    {
                        viewed = tabs.first().map(|tab| tab.id.clone());
                        if let Some(tab_id) = viewed.clone() {
                            wire::send(&mut stream, "tab.view", None, TabTarget { tab_id })?;
                        }
                    }
                    strip_frame = strip::render(&tabs, viewed.as_deref(), columns);
                    terminal.write(strip_frame.bytes.as_bytes())?;
                    if tabs.is_empty() {
                        terminal.write(render_empty_hint(columns).as_bytes())?;
                    }
                }
                "tab.created" | "tab.selected" => {
                    let (_, target): (_, TabTarget) = wire::body(&payload)?;
                    viewed = Some(target.tab_id.clone());
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
                "tab.closed" => {
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
                    terminal.write(render_strip("crashed", "agent", None, columns).as_bytes())?;
                }
                "failure.status" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    failed = true;
                    let reason = result.message.unwrap_or_else(|| "tab failed".into());
                    terminal.write(
                        render_notice(
                            &format!("✗ {reason} — [r] retry · [f] start fresh · [alt+w] close"),
                            columns,
                        )
                        .as_bytes(),
                    )?;
                }
                "viewer.status" | "input.rejected" | "input.uncertain" | "recovery.notice" => {
                    let (_, result): (_, wire::ResultBody) = wire::body(&payload)?;
                    if let Some(message) = result.message {
                        terminal.write(render_notice(&message, columns).as_bytes())?;
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
            && last_strip_frame.elapsed() >= Duration::from_millis(80)
        {
            strip_frame = strip::render(&tabs, viewed.as_deref(), columns);
            terminal.write(strip_frame.bytes.as_bytes())?;
            last_strip_frame = Instant::now();
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
        if !event::poll(Duration::from_millis(16))
            .map_err(|error| format!("poll outer terminal: {error}"))?
        {
            continue;
        }
        match event::read().map_err(|error| format!("read outer terminal: {error}"))? {
            Event::Key(key) if matches!(key.kind, KeyEventKind::Press | KeyEventKind::Repeat) => {
                if let Some(tab_id) = pending_close.take() {
                    if key.code == KeyCode::Enter {
                        wire::send(&mut stream, "tab.close", None, TabTarget { tab_id })?;
                    } else if key.code != KeyCode::Esc {
                        pending_close = Some(tab_id);
                    }
                    continue;
                }
                if let Some((tab_id, value)) = rename.as_mut() {
                    match key.code {
                        KeyCode::Esc => rename = None,
                        KeyCode::Enter => {
                            let request = TabRename {
                                tab_id: tab_id.clone(),
                                name: value.clone(),
                            };
                            rename = None;
                            wire::send(&mut stream, "tab.rename", None, request)?;
                        }
                        KeyCode::Backspace => {
                            value.pop();
                        }
                        KeyCode::Char(ch) if !ch.is_control() && value.chars().count() < 64 => {
                            value.push(ch)
                        }
                        _ => {}
                    }
                    if let Some((_, value)) = rename.as_ref() {
                        terminal.write(
                            render_notice(&format!("Rename: {value}"), columns).as_bytes(),
                        )?;
                    } else {
                        strip_frame = strip::render(&tabs, viewed.as_deref(), columns);
                        terminal.write(strip_frame.bytes.as_bytes())?;
                    }
                    continue;
                }
                if let Some(tab_id) = context_tab.take() {
                    match key.code {
                        KeyCode::Char('r' | 'R') => {
                            let name = tabs
                                .iter()
                                .find(|tab| tab.id == tab_id)
                                .map(|tab| tab.name.clone())
                                .unwrap_or_default();
                            rename = Some((tab_id, name));
                        }
                        KeyCode::Char('c' | 'C') => {
                            let busy =
                                tabs.iter().find(|tab| tab.id == tab_id).is_some_and(|tab| {
                                    matches!(tab.status.as_str(), "working" | "needs-input")
                                });
                            if busy {
                                pending_close = Some(tab_id);
                                terminal.write(
                                    render_notice(
                                        "Stop this agent? Enter stop · Esc cancel",
                                        columns,
                                    )
                                    .as_bytes(),
                                )?;
                            } else {
                                wire::send(&mut stream, "tab.close", None, TabTarget { tab_id })?;
                            }
                        }
                        _ => {}
                    }
                    continue;
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
                                    terminal.write(
                                        render_notice(
                                            "Stop this agent? Enter stop · Esc cancel",
                                            columns,
                                        )
                                        .as_bytes(),
                                    )?;
                                } else {
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
                                rename = Some((tab_id, name));
                                terminal.write(
                                    render_notice(
                                        "Rename: type a name · Enter save · Esc cancel",
                                        columns,
                                    )
                                    .as_bytes(),
                                )?;
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
                                viewed = Some(tab_id.clone());
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
                                viewed = Some(tab.id.clone());
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
                    strip_frame = strip::render(&tabs, viewed.as_deref(), columns);
                    terminal.write(strip_frame.bytes.as_bytes())?;
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
                if failed {
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
                strip_frame = strip::render(&tabs, viewed.as_deref(), columns);
                terminal.write(strip_frame.bytes.as_bytes())?;
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
                if mouse.row == 0 {
                    let target = strip::hit(&strip_frame, mouse.column).cloned();
                    if matches!(mouse.kind, MouseEventKind::Moved) {
                        let next_hover = match target {
                            Some(StripHit::View(id) | StripHit::Close(id)) => Some(id),
                            _ => None,
                        };
                        if next_hover != hovered_tab {
                            hovered_tab = next_hover;
                            strip_frame = strip::render_with_hover(
                                &tabs,
                                viewed.as_deref(),
                                columns,
                                hovered_tab.as_deref(),
                            );
                            terminal.write(strip_frame.bytes.as_bytes())?;
                        }
                    } else if matches!(mouse.kind, MouseEventKind::Drag(MouseButton::Left)) {
                        if let Some((_, start, since)) = drag.as_ref()
                            && (start.abs_diff(mouse.column) >= 1
                                || since.elapsed() >= Duration::from_millis(250))
                        {
                            terminal.write(
                                render_notice("│ release to move tab", columns).as_bytes(),
                            )?;
                        }
                    } else if matches!(mouse.kind, MouseEventKind::Up(MouseButton::Left)) {
                        if let Some((tab_id, start, since)) = drag.take()
                            && (start.abs_diff(mouse.column) >= 1
                                || since.elapsed() >= Duration::from_millis(250))
                        {
                            let target_id = match target {
                                Some(StripHit::View(id) | StripHit::Close(id)) => Some(id),
                                _ => None,
                            };
                            if let Some(target_index) =
                                target_id.and_then(|id| tabs.iter().position(|tab| tab.id == id))
                            {
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
                    } else if matches!(mouse.kind, MouseEventKind::Down(MouseButton::Right)) {
                        if let Some(StripHit::View(tab_id) | StripHit::Close(tab_id)) = target {
                            context_tab = Some(tab_id);
                            terminal.write(
                                render_notice("Tab menu: r rename · c close · Esc cancel", columns)
                                    .as_bytes(),
                            )?;
                        }
                    } else if matches!(mouse.kind, MouseEventKind::Down(MouseButton::Left)) {
                        match target {
                            Some(StripHit::View(tab_id)) => {
                                drag = Some((tab_id.clone(), mouse.column, Instant::now()));
                                viewed = Some(tab_id.clone());
                                wire::send(&mut stream, "tab.view", None, TabTarget { tab_id })?;
                            }
                            Some(StripHit::Close(tab_id)) => {
                                let busy =
                                    tabs.iter().find(|tab| tab.id == tab_id).is_some_and(|tab| {
                                        matches!(tab.status.as_str(), "working" | "needs-input")
                                    });
                                if busy {
                                    pending_close = Some(tab_id);
                                    terminal.write(
                                        render_notice(
                                            "Stop this agent? Enter stop · Esc cancel",
                                            columns,
                                        )
                                        .as_bytes(),
                                    )?;
                                } else {
                                    wire::send(
                                        &mut stream,
                                        "tab.close",
                                        None,
                                        TabTarget { tab_id },
                                    )?;
                                }
                            }
                            Some(StripHit::New) => {
                                wire::send(&mut stream, "tab.create", None, create.clone())?
                            }
                            Some(StripHit::Overflow) => {
                                let next = viewed
                                    .as_ref()
                                    .and_then(|id| tabs.iter().position(|tab| &tab.id == id))
                                    .map_or(0, |index| (index + 1) % tabs.len().max(1));
                                if let Some(tab) = tabs.get(next) {
                                    viewed = Some(tab.id.clone());
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
                            None => {}
                        }
                    }
                    continue;
                }
                if hovered_tab.take().is_some() {
                    strip_frame = strip::render(&tabs, viewed.as_deref(), columns);
                    terminal.write(strip_frame.bytes.as_bytes())?;
                }
                if let Some(bytes) =
                    encode_mouse(mouse.kind, mouse.column, mouse.row.saturating_sub(1))
                {
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
fn encode_key(code: KeyCode, modifiers: KeyModifiers) -> Vec<u8> {
    match code {
        KeyCode::Char(character) if modifiers.contains(KeyModifiers::CONTROL) => {
            vec![(character.to_ascii_lowercase() as u8) & 0x1f]
        }
        KeyCode::Char(character) => {
            let mut out = Vec::new();
            if modifiers.contains(KeyModifiers::ALT) {
                out.push(0x1b);
            }
            let mut encoded = [0_u8; 4];
            out.extend_from_slice(character.encode_utf8(&mut encoded).as_bytes());
            out
        }
        KeyCode::Enter => b"\r".to_vec(),
        KeyCode::Tab => b"\t".to_vec(),
        KeyCode::BackTab => b"\x1b[Z".to_vec(),
        KeyCode::Backspace => vec![0x7f],
        KeyCode::Esc => vec![0x1b],
        KeyCode::Delete => b"\x1b[3~".to_vec(),
        KeyCode::Insert => b"\x1b[2~".to_vec(),
        KeyCode::Up => b"\x1b[A".to_vec(),
        KeyCode::Down => b"\x1b[B".to_vec(),
        KeyCode::Right => b"\x1b[C".to_vec(),
        KeyCode::Left => b"\x1b[D".to_vec(),
        KeyCode::Home => b"\x1b[H".to_vec(),
        KeyCode::End => b"\x1b[F".to_vec(),
        KeyCode::PageUp => b"\x1b[5~".to_vec(),
        KeyCode::PageDown => b"\x1b[6~".to_vec(),
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
        assert_eq!(without_bell(b"a\x07b"), b"ab");
        assert_eq!(
            without_bell(b"a\x1b]9;notify\x07b\x1b]777;alert\x1b\\c"),
            b"abc"
        );
        assert_eq!(
            without_bell(b"\x1b]8;;https://example.com\x07link\x1b]8;;\x07"),
            b"\x1b]8;;https://example.com\x07link\x1b]8;;\x07"
        );
        assert!(render_strip("working", "agent", Some("orange"), 80).contains("agent ×"));
        assert!(render_strip("working", "agent", Some("orange"), 80).contains("38;2;226;159;72"));
        assert!(!render_strip("working", "a\x07gent", None, 80).contains('\u{7}'));
        assert!(render_notice("input rejected", 40).contains("input rejected"));
        assert!(render_empty_hint(80).contains("Alt+A new tab"));
        assert!(!render_empty_hint(8).contains("new tab"));
    }
    #[test]
    fn mode_restore_disables_every_enabled_outer_mode() {
        for mode in ["1049", "2004", "1004", "1000", "1003", "1006", "2026"] {
            assert!(String::from_utf8_lossy(ENTER_OUTER_MODES).contains(&format!("?{mode}h")));
            assert!(String::from_utf8_lossy(RESTORE_OUTER_MODES).contains(&format!("?{mode}l")));
        }
        assert_eq!(KITTY_ENABLE, b"\x1b[>1u");
        assert_eq!(KITTY_RESTORE, b"\x1b[<1u");
        assert!(kitty_query_answered(b"noise\x1b[?3u\x1b[?1;2c"));
        assert!(!kitty_query_answered(b"\x1b[?1;2c"));
        assert!(!kitty_query_answered(b"\x1b[?u"));
    }
}
