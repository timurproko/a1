mod ghostty;
mod shell;

use std::env;
use std::io::{Read, Write};
use std::process::ExitCode;
use std::sync::mpsc::{self, Receiver, TryRecvError};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use crossterm::event::{
    self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, MouseButton, MouseEventKind,
};
use crossterm::execute;
use crossterm::terminal::{
    self, EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode,
};
use crossterm::{
    cursor::{Hide, Show},
    event::{DisableBracketedPaste, DisableMouseCapture, EnableBracketedPaste, EnableMouseCapture},
};
use portable_pty::{Child, CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};

use crate::ghostty::{GhosttyTerminal, KeyEncoder, SelectionGesture, key_for_character};

const ADDONE_PROTOCOL_VERSION: u32 = 1;
const GHOSTTY_VT_COMMIT: &str = "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3";
const PORTABLE_PTY_VERSION: &str = "0.9.0";
const CROSSTERM_VERSION: &str = "0.29.0";

fn main() -> ExitCode {
    match run_from_args(env::args().skip(1).collect()) {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("addone-terminal-host: {error}");
            ExitCode::from(2)
        }
    }
}

fn run_from_args(args: Vec<String>) -> Result<(), String> {
    match args.first().map(String::as_str) {
        Some("--version") => {
            print_provenance();
            Ok(())
        }
        Some("--probe") => probe(),
        Some("--probe-scroll") => probe_scroll(),
        Some("--probe-selection") => probe_selection(),
        Some("--resolve") if args.len() == 2 => {
            println!("{}", resolve_command(&args[1])?);
            Ok(())
        }
        Some("--resolve-shell") => {
            let (program, arguments) = shell::default_shell();
            println!("{program} {}", arguments.join(" "));
            Ok(())
        }
        Some("--run") => run_interactive(&args[1..]),
        _ => {
            eprintln!(
                "usage: addone-terminal-host --version | --probe | --probe-scroll | --probe-selection | --resolve <command> | --resolve-shell | --run [-- <command> [args...]]"
            );
            Err("expected a mode".to_owned())
        }
    }
}

fn print_provenance() {
    println!(
        "{{\"schema\":\"addone-terminal-host-version-v1\",\"protocolVersion\":{ADDONE_PROTOCOL_VERSION},\"hostMode\":\"console-inside-existing-terminal\",\"desktopWindow\":false,\"libghosttyVtCommit\":\"{GHOSTTY_VT_COMMIT}\",\"portablePty\":\"{PORTABLE_PTY_VERSION}\",\"crossterm\":\"{CROSSTERM_VERSION}\"}}"
    );
}

fn probe_trace(step: &str) {
    if env::var_os("ADDONE_PROBE_TRACE").is_some() {
        eprintln!("probe: {step}");
    }
}

fn probe_scroll() -> Result<(), String> {
    let mut terminal = GhosttyTerminal::new(80, 24)?;
    terminal.write(b"AddOne terminal host probe\r\n\x1b[1;32mterminal model ready\x1b[0m\r\n");
    terminal.frame()?;
    for index in 1..=40 {
        terminal.write(format!("line{index}\r\n").as_bytes());
    }
    terminal.frame()?;
    let rows = terminal.scrollback_rows()?;
    let scrollbar = terminal.scrollbar()?;
    println!(
        "{{\"scrollbackRows\":{rows},\"scrollbar\":{{\"total\":{},\"offset\":{},\"length\":{}}}}}",
        scrollbar.total, scrollbar.offset, scrollbar.len
    );
    if rows == 0 {
        return Err("expected retained scrollback rows".to_owned());
    }
    Ok(())
}

fn probe_selection() -> Result<(), String> {
    let mut terminal = GhosttyTerminal::new(20, 4)?;
    terminal.write(b"hello world\r\nsecond line\r\n");
    terminal.frame()?;
    let mut gesture = SelectionGesture::new(&terminal)?;
    gesture.press(&mut terminal, 0, 0)?;
    gesture.drag(&mut terminal, 5, 0, 20, 4)?;
    let frame = terminal.frame()?;
    if !frame.contains("\x1b[48;2;255;255;255m") || !frame.contains("\x1b[38;2;0;0;0m") {
        return Err("selection probe did not produce the uniform inverted style".to_owned());
    }
    let selected = gesture.release(&mut terminal, 5, 0)?;
    let selected = selected.ok_or_else(|| "selection probe produced no text".to_owned())?;
    if !selected.windows(5).any(|window| window == b"hello") {
        return Err(format!(
            "selection probe returned unexpected text: {:?}",
            selected
        ));
    }
    println!("{{\"probe\":\"selection-passed\"}}");
    Ok(())
}

fn probe() -> Result<(), String> {
    probe_trace("create terminal");
    let mut terminal = GhosttyTerminal::new(80, 24)?;
    probe_trace("write terminal");
    terminal.write(b"AddOne terminal host probe\r\n\x1b[1;32mterminal model ready\x1b[0m\r\n");
    probe_trace("compose frame");
    let frame = terminal.frame()?;
    probe_trace("validate frame");
    if !frame.contains("AddOne terminal host probe")
        || !frame.contains("terminal model ready")
        || !frame.contains("\x1b[49m")
        || !frame.contains("\x1b[38;5;2m")
    {
        return Err("terminal model probe did not produce expected frame content".to_owned());
    }
    for index in 0..40 {
        terminal.write(format!("scroll-check-{index:02}\r\n").as_bytes());
    }
    terminal.frame()?;
    let bottom = terminal.scrollbar()?;
    let scrollback_rows = terminal.scrollback_rows()?;
    terminal.scroll_delta(-1_000)?;
    let top = terminal.scrollbar()?;
    if env::var_os("ADDONE_PROBE_TRACE").is_some() {
        eprintln!(
            "scrollbar bottom={bottom:?} top={top:?} scrollback_rows={scrollback_rows} viewport_active={}",
            terminal.viewport_active()?
        );
    }
    if top.offset >= bottom.offset {
        return Err("terminal scrollback probe did not move the viewport".to_owned());
    }
    let scrolled = terminal.frame()?;
    if env::var_os("ADDONE_PROBE_TRACE").is_some() {
        eprintln!("scrolled frame: {scrolled:?}");
    }
    if !scrolled.contains("scroll-check-00") {
        return Err("terminal scrollback probe did not expose earlier content".to_owned());
    }

    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("open probe PTY: {error}"))?;
    let mut command = CommandBuilder::new("cmd.exe");
    command.args(["/d", "/q", "/c", "exit 0"]);
    let mut child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| format!("spawn probe process: {error}"))?;
    drop(pair.slave);
    let status = child
        .wait()
        .map_err(|error| format!("wait for probe process: {error}"))?;
    if !status.success() {
        return Err(format!("probe process exited unsuccessfully: {status:?}"));
    }
    drop(pair.master);
    print_provenance();
    println!(
        "{{\"probe\":\"passed\",\"pty\":\"started-and-cleaned\",\"terminalModel\":\"passed\"}}"
    );
    Ok(())
}

fn run_interactive(arguments: &[String]) -> Result<(), String> {
    let (program, command_args) = if arguments.first().is_some_and(|value| value == "--") {
        let values = &arguments[1..];
        if values.is_empty() {
            return Err("--run -- requires a command".to_owned());
        }
        (values[0].clone(), values[1..].to_vec())
    } else {
        shell::default_shell()
    };
    let program = resolve_command(&program)?;

    let (cols, rows) = terminal::size().map_err(|error| format!("read terminal size: {error}"))?;
    let _guard = TerminalModeGuard::enter()?;
    let mut terminal = GhosttyTerminal::new(cols, rows)?;
    let key_encoder = KeyEncoder::new(&terminal)?;
    let mut selection = SelectionGesture::new(&terminal)?;

    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("open terminal session: {error}"))?;
    let mut command = CommandBuilder::new(program);
    command.args(command_args);
    let mut child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| format!("start terminal session: {error}"))?;
    drop(pair.slave);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| format!("clone terminal session reader: {error}"))?;
    let writer =
        Arc::new(Mutex::new(pair.master.take_writer().map_err(|error| {
            format!("take terminal session writer: {error}")
        })?));
    let (output_sender, output_receiver) = mpsc::channel::<Vec<u8>>();
    let output_thread = thread::spawn(move || {
        let mut buffer = [0u8; 16 * 1024];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) | Err(_) => break,
                Ok(count) => {
                    if output_sender.send(buffer[..count].to_vec()).is_err() {
                        break;
                    }
                }
            }
        }
    });

    let mut viewport_rows = rows;
    let mut viewport_cols = cols;
    let result = interactive_loop(
        &mut terminal,
        &key_encoder,
        pair.master.as_ref(),
        &writer,
        output_receiver,
        child.as_mut(),
        &mut viewport_rows,
        &mut viewport_cols,
        &mut selection,
    );
    if child
        .try_wait()
        .map_err(|error| format!("inspect terminal session: {error}"))?
        .is_none()
    {
        let _ = child.kill();
        let _ = child.wait();
    }
    drop(writer);
    let _ = output_thread.join();
    result
}

fn interactive_loop(
    terminal: &mut GhosttyTerminal,
    key_encoder: &KeyEncoder,
    master: &dyn MasterPty,
    writer: &Arc<Mutex<Box<dyn Write + Send>>>,
    output: Receiver<Vec<u8>>,
    child: &mut dyn Child,
    viewport_rows: &mut u16,
    viewport_cols: &mut u16,
    selection: &mut SelectionGesture,
) -> Result<(), String> {
    let mut stdout = std::io::stdout().lock();
    let mut output_open = true;
    let mut last_interrupt: Option<Instant> = None;
    loop {
        loop {
            match output.try_recv() {
                Ok(bytes) => terminal.write(&bytes),
                Err(TryRecvError::Empty) => break,
                Err(TryRecvError::Disconnected) => {
                    output_open = false;
                    break;
                }
            }
        }
        if !output_open {
            break;
        }
        if event::poll(Duration::from_millis(8))
            .map_err(|error| format!("poll terminal input: {error}"))?
        {
            match event::read().map_err(|error| format!("read terminal input: {error}"))? {
                Event::Key(key) => {
                    let interrupt = matches!(key.code, KeyCode::Char('c') | KeyCode::Char('C'))
                        && key.modifiers.contains(KeyModifiers::CONTROL);
                    if let Some(encoded) = encode_key(key_encoder, key)? {
                        writer
                            .lock()
                            .map_err(|_| "terminal session writer lock poisoned".to_owned())?
                            .write_all(&encoded)
                            .map_err(|error| format!("write terminal input: {error}"))?;
                    }
                    if interrupt {
                        let now = Instant::now();
                        if last_interrupt.is_some_and(|previous| {
                            now.duration_since(previous) < Duration::from_millis(1500)
                        }) {
                            break;
                        }
                        last_interrupt = Some(now);
                    }
                }
                Event::Paste(text) => {
                    writer
                        .lock()
                        .map_err(|_| "terminal session writer lock poisoned".to_owned())?
                        .write_all(text.as_bytes())
                        .map_err(|error| format!("write paste input: {error}"))?;
                }
                Event::Resize(cols, rows) => {
                    master
                        .resize(PtySize {
                            rows,
                            cols,
                            pixel_width: 0,
                            pixel_height: 0,
                        })
                        .map_err(|error| format!("resize terminal session: {error}"))?;
                    terminal.resize(cols, rows)?;
                    *viewport_rows = rows;
                    *viewport_cols = cols;
                }
                Event::Mouse(mouse) => match mouse.kind {
                    MouseEventKind::ScrollUp => terminal.scroll_delta(-3)?,
                    MouseEventKind::ScrollDown => terminal.scroll_delta(3)?,
                    MouseEventKind::Down(MouseButton::Left) => {
                        selection.press(terminal, mouse.column, mouse.row)?;
                    }
                    MouseEventKind::Drag(MouseButton::Left) => {
                        selection.drag(
                            terminal,
                            mouse.column,
                            mouse.row,
                            *viewport_cols,
                            *viewport_rows,
                        )?;
                    }
                    MouseEventKind::Up(MouseButton::Left) => {
                        if let Some(selected) =
                            selection.release(terminal, mouse.column, mouse.row)?
                        {
                            write_clipboard(&mut stdout, &selected)?;
                        }
                    }
                    _ => {}
                },
                Event::FocusGained | Event::FocusLost => {}
            }
        }
        if child
            .try_wait()
            .map_err(|error| format!("inspect terminal session: {error}"))?
            .is_some()
        {
            break;
        }
        let frame = terminal.frame()?;
        if !frame.is_empty() {
            stdout
                .write_all(frame.as_bytes())
                .map_err(|error| format!("write terminal frame: {error}"))?;
            stdout
                .flush()
                .map_err(|error| format!("flush terminal frame: {error}"))?;
        }
    }
    Ok(())
}

fn encode_key(encoder: &KeyEncoder, key: KeyEvent) -> Result<Option<Vec<u8>>, String> {
    if !matches!(key.kind, KeyEventKind::Press | KeyEventKind::Repeat) {
        return Ok(None);
    }
    let mut mods = 0u16;
    if key.modifiers.contains(KeyModifiers::SHIFT) {
        mods |= ghostty::MOD_SHIFT;
    }
    if key.modifiers.contains(KeyModifiers::CONTROL) {
        mods |= ghostty::MOD_CTRL;
    }
    if key.modifiers.contains(KeyModifiers::ALT) {
        mods |= ghostty::MOD_ALT;
    }
    if key.modifiers.contains(KeyModifiers::SUPER) {
        mods |= ghostty::MOD_SUPER;
    }

    let (ghost_key, text) = match key.code {
        KeyCode::Char(character) => (key_for_character(character), Some(character.to_string())),
        KeyCode::Enter => (ghostty::KEY_ENTER, None),
        KeyCode::Backspace => (ghostty::KEY_BACKSPACE, None),
        KeyCode::Tab | KeyCode::BackTab => (ghostty::KEY_TAB, None),
        KeyCode::Esc => (ghostty::KEY_ESCAPE, None),
        KeyCode::Left => (ghostty::KEY_ARROW_LEFT, None),
        KeyCode::Right => (ghostty::KEY_ARROW_RIGHT, None),
        KeyCode::Up => (ghostty::KEY_ARROW_UP, None),
        KeyCode::Down => (ghostty::KEY_ARROW_DOWN, None),
        KeyCode::Home => (ghostty::KEY_HOME, None),
        KeyCode::End => (ghostty::KEY_END, None),
        KeyCode::PageUp => (ghostty::KEY_PAGE_UP, None),
        KeyCode::PageDown => (ghostty::KEY_PAGE_DOWN, None),
        KeyCode::Delete => (ghostty::KEY_DELETE, None),
        KeyCode::Insert => (ghostty::KEY_INSERT, None),
        KeyCode::F(number) if number >= 1 => (ghostty::KEY_F1 + i32::from(number) - 1, None),
        _ => return Ok(None),
    };
    encoder
        .encode(
            ghost_key,
            mods,
            text.as_deref(),
            key.kind == KeyEventKind::Repeat,
        )
        .map(Some)
}

fn resolve_command(program: &str) -> Result<String, String> {
    if program.contains(['/', '\\']) || program.contains('.') {
        return Ok(program.to_owned());
    }
    let path = env::var_os("PATH")
        .ok_or_else(|| "PATH is unavailable for command resolution".to_owned())?;
    let extensions: Vec<String> = if cfg!(windows) {
        env::var("PATHEXT")
            .unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".to_owned())
            .split(';')
            .map(str::to_owned)
            .collect()
    } else {
        Vec::new()
    };
    for directory in env::split_paths(&path) {
        if cfg!(windows) {
            for extension in &extensions {
                let candidate = directory.join(format!("{program}{}", extension.to_lowercase()));
                if candidate.is_file() {
                    return Ok(candidate.to_string_lossy().into_owned());
                }
                let candidate = directory.join(format!("{program}{extension}"));
                if candidate.is_file() {
                    return Ok(candidate.to_string_lossy().into_owned());
                }
            }
        }
        let direct = directory.join(program);
        if direct.is_file() {
            return Ok(direct.to_string_lossy().into_owned());
        }
    }
    Err(format!("command not found on PATH: {program}"))
}

fn write_clipboard(stdout: &mut impl Write, bytes: &[u8]) -> Result<(), String> {
    let encoded = BASE64.encode(bytes);
    stdout
        .write_all(format!("\x1b]52;c;{encoded}\x07").as_bytes())
        .map_err(|error| format!("write clipboard selection: {error}"))?;
    stdout
        .flush()
        .map_err(|error| format!("flush clipboard selection: {error}"))
}

struct TerminalModeGuard;

impl TerminalModeGuard {
    fn enter() -> Result<Self, String> {
        enable_raw_mode().map_err(|error| format!("enable terminal raw mode: {error}"))?;
        let mut stdout = std::io::stdout().lock();
        execute!(
            stdout,
            EnterAlternateScreen,
            EnableBracketedPaste,
            EnableMouseCapture,
            Hide
        )
        .map_err(|error| format!("enter terminal workspace surface: {error}"))?;
        Ok(Self)
    }
}

impl Drop for TerminalModeGuard {
    fn drop(&mut self) {
        let mut stdout = std::io::stdout().lock();
        let _ = execute!(
            stdout,
            DisableBracketedPaste,
            DisableMouseCapture,
            Show,
            LeaveAlternateScreen
        );
        let _ = disable_raw_mode();
    }
}
