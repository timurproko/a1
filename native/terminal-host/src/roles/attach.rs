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
use crate::roles::wire::{self, AttachStart, Input, PasteStart, Resize, RoleHello, Surface};

pub const ENTER_OUTER_MODES: &[u8] =
    b"\x1b[?1049h\x1b[?2004h\x1b[?1004h\x1b[?1000h\x1b[?1006h\x1b[?2026h";
pub const RESTORE_OUTER_MODES: &[u8] =
    b"\x1b[?2026l\x1b[?1006l\x1b[?1000l\x1b[?1004l\x1b[?2004l\x1b[?1049l";

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

pub fn render_strip(status: &str, name: &str, columns: u16) -> String {
    let glyph = match status {
        "starting" => "… ",
        "working" => "◐ ",
        "ended" => "✗ ",
        _ => "",
    };
    let mut chip = format!(" {glyph}{name} ");
    chip.retain(|value| value != '\u{7}' && !value.is_control());
    let maximum = usize::from(columns).min(20);
    if chip.chars().count() > maximum {
        chip = chip
            .chars()
            .take(maximum.saturating_sub(1))
            .collect::<String>()
            + "…";
    }
    format!("\x1b[1;1H{chip:<width$}", width = usize::from(columns))
}

/// BEL is attention data and never reaches the outer terminal. Other bytes, including OSC 8/52
/// and cursor-shape controls, stay in the native terminal stream.
pub fn without_bell(bytes: &[u8]) -> Vec<u8> {
    bytes.iter().copied().filter(|byte| *byte != 0x07).collect()
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
    pub profile: &'a Path,
    pub data_dir: &'a Path,
    pub release_root: &'a str,
    pub node_executable: &'a str,
}

pub fn run_attach(options: AttachOptions<'_>) -> Result<(), String> {
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
            tab_id: None,
            pid: Some(std::process::id()),
            start_identity: None,
        },
    )?;
    let payload = wire::read_payload(&mut stream)?
        .ok_or_else(|| "server closed attach handshake".to_owned())?;
    if wire::kind(&payload)?.message_type != "welcome" {
        return Err("resident server refused attach".to_owned());
    }
    let _: (Option<u64>, Welcome) = wire::body(&payload)?;
    let (columns, outer_rows) = outer_size()?;
    let rows = tab_rows(outer_rows).map_err(str::to_owned)?;
    let environment = std::env::vars().collect::<Vec<_>>();
    wire::send(
        &mut stream,
        "attach.start",
        None,
        AttachStart {
            client_id: String::new(),
            cwd: options.cwd.into(),
            columns,
            rows,
            release_root: options.release_root.into(),
            node_executable: options.node_executable.into(),
            environment,
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
    terminal.write(render_strip("starting", "agent", columns).as_bytes())?;
    let started = Instant::now();
    let mut chord = DoubleCtrlC::new(options.clear_exit_ms);
    loop {
        while let Ok(payload) = message_rx.try_recv() {
            if payload.is_empty() {
                return Err("resident server connection closed".to_owned());
            }
            let kind = wire::kind(&payload)?;
            match kind.message_type.as_str() {
                "surface" => {
                    let (_, surface): (_, Surface) = wire::body(&payload)?;
                    terminal.write(render_strip(&surface.status, "agent", columns).as_bytes())?;
                    terminal.write(&without_bell(&surface.bytes))?;
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
                    print_hint();
                    return Ok(());
                }
                "refused" => {
                    terminal.restore()?;
                    return Err("a1 is attached in another terminal".to_owned());
                }
                "holder.exit" => {
                    terminal.write(render_strip("ended", "agent", columns).as_bytes())?;
                }
                "error" => return Err("resident tab failed to start".to_owned()),
                "attached" => {
                    let _: (Option<u64>, BridgeAttachment) = wire::body(&payload)?;
                }
                _ => {}
            }
        }
        if !event::poll(Duration::from_millis(16))
            .map_err(|error| format!("poll outer terminal: {error}"))?
        {
            continue;
        }
        match event::read().map_err(|error| format!("read outer terminal: {error}"))? {
            Event::Key(key) if matches!(key.kind, KeyEventKind::Press | KeyEventKind::Repeat) => {
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
                    print_hint();
                    return Ok(());
                }
                wire::send(
                    &mut stream,
                    "input",
                    None,
                    Input {
                        bytes,
                        paste: false,
                    },
                )?;
            }
            Event::Paste(text) => {
                let bytes = text.into_bytes();
                wire::send(
                    &mut stream,
                    "paste.start",
                    None,
                    PasteStart { bytes: bytes.len() },
                )?;
                for chunk in bytes.chunks(MAX_INPUT_BYTES) {
                    wire::send(
                        &mut stream,
                        "input",
                        None,
                        Input {
                            bytes: chunk.to_vec(),
                            paste: true,
                        },
                    )?;
                }
            }
            Event::Resize(cols, rows) => {
                let rows = tab_rows(rows).map_err(str::to_owned)?;
                wire::send(
                    &mut stream,
                    "resize",
                    None,
                    Resize {
                        columns: cols,
                        rows,
                    },
                )?;
            }
            Event::FocusGained => wire::send(
                &mut stream,
                "input",
                None,
                Input {
                    bytes: b"\x1b[I".to_vec(),
                    paste: false,
                },
            )?,
            Event::FocusLost => wire::send(
                &mut stream,
                "input",
                None,
                Input {
                    bytes: b"\x1b[O".to_vec(),
                    paste: false,
                },
            )?,
            Event::Mouse(mouse) => {
                if let Some(bytes) = encode_mouse(mouse.kind, mouse.column, mouse.row) {
                    wire::send(
                        &mut stream,
                        "input",
                        None,
                        Input {
                            bytes,
                            paste: false,
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

struct OuterTerminal {
    restored: bool,
}
impl OuterTerminal {
    fn enter() -> Result<Self, String> {
        enable_raw_mode().map_err(|error| format!("enable outer raw mode: {error}"))?;
        let mut value = Self { restored: false };
        value.write(ENTER_OUTER_MODES)?;
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
        self.write(RESTORE_OUTER_MODES)?;
        disable_raw_mode().map_err(|error| format!("restore cooked input: {error}"))?;
        self.restored = true;
        Ok(())
    }
}
impl Drop for OuterTerminal {
    fn drop(&mut self) {
        if !self.restored {
            let _ = self.write(RESTORE_OUTER_MODES);
            let _ = disable_raw_mode();
            self.restored = true;
        }
    }
}

fn print_hint() {
    println!("\x1b[2m1 tab still running · run a1 to return\x1b[0m");
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
        assert!(render_strip("working", "agent", 80).contains("agent"));
        assert!(!render_strip("working", "a\x07gent", 80).contains('\u{7}'));
    }
    #[test]
    fn mode_restore_disables_every_enabled_outer_mode() {
        for mode in ["1049", "2004", "1004", "1000", "1006", "2026"] {
            assert!(String::from_utf8_lossy(ENTER_OUTER_MODES).contains(&format!("?{mode}h")));
            assert!(String::from_utf8_lossy(RESTORE_OUTER_MODES).contains(&format!("?{mode}l")));
        }
    }
}
