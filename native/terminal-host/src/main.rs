mod ghostty;
mod shell;
mod workspace;

use std::collections::HashSet;
use std::env;
use std::fs;
use std::io::Write;
use std::process::ExitCode;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use crossterm::execute;
use crossterm::terminal::{
    self, EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode,
};
use crossterm::{
    cursor::{Hide, Show},
    event::{DisableBracketedPaste, DisableMouseCapture, EnableBracketedPaste, EnableMouseCapture},
};
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};

use crate::ghostty::{
    GhosttyTerminal, KeyEncoder, MouseAction, MouseButton, MouseEncoder, MouseInput,
    SelectionGesture, key_for_character,
};
use crate::workspace::{FixedLayout, FixedWorkspace, SessionLaunch};

const A1_PROTOCOL_VERSION: u32 = 1;
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
        Some("--probe-input") => probe_input(),
        Some("--probe-2x2") => probe_two_by_two(),
        Some("--topology-2x2") => {
            println!(
                "{}",
                workspace::topology_json(0, workspace::TOPOLOGY_REVISION)
            );
            Ok(())
        }
        Some("--fixture-pane") if args.len() == 2 => fixture_pane(&args[1]),
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
                "usage: addone-terminal-host --version | --probe | --probe-scroll | --probe-selection | --probe-input | --probe-2x2 | --topology-2x2 | --resolve <command> | --resolve-shell | --run [-- <command> [args...]]"
            );
            Err("expected a mode".to_owned())
        }
    }
}

fn print_provenance() {
    println!(
        "{{\"schema\":\"addone-terminal-host-version-v1\",\"protocolVersion\":{A1_PROTOCOL_VERSION},\"hostMode\":\"console-inside-existing-terminal\",\"desktopWindow\":false,\"libghosttyVtCommit\":\"{GHOSTTY_VT_COMMIT}\",\"portablePty\":\"{PORTABLE_PTY_VERSION}\",\"crossterm\":\"{CROSSTERM_VERSION}\"}}"
    );
}

fn probe_trace(step: &str) {
    if env::var_os("A1_PROBE_TRACE").is_some() {
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
    let mut clicks = SelectionGesture::new(&terminal)?;
    if clicks.press(&mut terminal, 6, 0)? {
        return Err("single click unexpectedly produced a selection".to_owned());
    }
    if !clicks.press(&mut terminal, 6, 0)? {
        return Err("double click did not select a word".to_owned());
    }
    let word = clicks
        .release(&mut terminal, 6, 0)?
        .ok_or_else(|| "double click produced no selection text".to_owned())?;
    if !word.windows(5).any(|window| window == b"world") {
        return Err(format!("double click selected unexpected text: {:?}", word));
    }
    if !clicks.press(&mut terminal, 6, 0)? {
        return Err("triple click did not select a line".to_owned());
    }
    let line = clicks
        .release(&mut terminal, 6, 0)?
        .ok_or_else(|| "triple click produced no selection text".to_owned())?;
    if !line.windows(5).any(|window| window == b"hello")
        || !line.windows(5).any(|window| window == b"world")
    {
        return Err(format!("triple click selected unexpected text: {:?}", line));
    }
    println!("{{\"probe\":\"selection-passed\"}}");
    Ok(())
}

fn probe_input() -> Result<(), String> {
    let mut terminal = GhosttyTerminal::new(20, 4)?;
    let key_encoder = KeyEncoder::new(&terminal)?;
    let composed_text = "é";
    let encoded_text = key_encoder.encode(
        &terminal,
        key_for_character('é'),
        0,
        Some(composed_text),
        false,
    )?;
    if encoded_text != composed_text.as_bytes() {
        return Err(format!(
            "text/IME key encoding produced unexpected bytes: {encoded_text:?}"
        ));
    }

    terminal.write(b"\x1b[?1000h\x1b[?1006h");
    if !terminal.mouse_tracking()? {
        return Err("mouse tracking mode was not retained".to_owned());
    }
    let mouse_encoder = MouseEncoder::new()?;
    let mouse = mouse_encoder.encode(
        &terminal,
        MouseInput {
            action: MouseAction::Press,
            button: Some(MouseButton::Left),
            mods: 0,
            column: 2,
            row: 1,
            columns: 20,
            rows: 4,
            any_button_pressed: true,
        },
    )?;
    if mouse != b"\x1b[<0;3;2M" {
        return Err(format!(
            "pane-relative mouse encoder produced unexpected bytes: {mouse:?}"
        ));
    }

    let mut clipboard = Vec::new();
    write_clipboard(&mut clipboard, b"native clipboard")?;
    if clipboard != b"\x1b]52;c;bmF0aXZlIGNsaXBib2FyZA==\x07" {
        return Err("OSC 52 clipboard encoding did not stay in the native host".to_owned());
    }

    println!(
        "{{\"schema\":\"addone-terminal-host-input-probe-v1\",\"keyEncoding\":true,\"textImeEncoding\":true,\"mouseEncoding\":true,\"paneRelativeMouse\":true,\"clipboardEncoding\":true,\"nodeRelay\":false}}"
    );
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
    terminal.mark_dirty()?;
    let full_repaint = terminal.frame()?;
    if !full_repaint.contains("AddOne terminal host probe")
        || !full_repaint.contains("terminal model ready")
    {
        return Err("terminal model full repaint lost retained content".to_owned());
    }
    for index in 0..40 {
        terminal.write(format!("scroll-check-{index:02}\r\n").as_bytes());
    }
    terminal.frame()?;
    let bottom = terminal.scrollbar()?;
    let scrollback_rows = terminal.scrollback_rows()?;
    terminal.scroll_delta(-1_000)?;
    let top = terminal.scrollbar()?;
    if env::var_os("A1_PROBE_TRACE").is_some() {
        eprintln!(
            "scrollbar bottom={bottom:?} top={top:?} scrollback_rows={scrollback_rows} viewport_active={}",
            terminal.viewport_active()?
        );
    }
    if top.offset >= bottom.offset {
        return Err("terminal scrollback probe did not move the viewport".to_owned());
    }
    let scrolled = terminal.frame()?;
    if env::var_os("A1_PROBE_TRACE").is_some() {
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

fn fixture_pane(argument: &str) -> Result<(), String> {
    let pane_id =
        env::var("A1_PANE_ID").map_err(|_| "fixture pane identity is unavailable".to_owned())?;
    let session_id = env::var("A1_TERMINAL_SESSION_ID")
        .map_err(|_| "fixture terminal-session identity is unavailable".to_owned())?;
    let token =
        env::var("A1_FIXTURE_TOKEN").map_err(|_| "fixture token is unavailable".to_owned())?;
    if token != argument {
        return Err("fixture exact argument did not match its environment".to_owned());
    }
    let cwd = env::current_dir()
        .map_err(|error| format!("read fixture cwd: {error}"))?
        .to_string_lossy()
        .into_owned();
    println!(
        "A1_FIXTURE|{pane_id}|{session_id}|{token}|{cwd}|pid={}",
        std::process::id()
    );
    std::io::stdout()
        .flush()
        .map_err(|error| format!("flush fixture identity: {error}"))?;
    let expected_input = env::var("A1_FIXTURE_INPUT")
        .map_err(|_| "fixture input identity is unavailable".to_owned())?;
    let mut command = String::new();
    std::io::stdin()
        .read_line(&mut command)
        .map_err(|error| format!("read fixture routed input: {error}"))?;
    if command.trim() != expected_input {
        return Err(format!(
            "fixture received cross-routed input: expected {expected_input}, received {}",
            command.trim()
        ));
    }
    println!("A1_INPUT_ACK|{pane_id}|{expected_input}");
    std::io::stdout()
        .flush()
        .map_err(|error| format!("flush fixture input acknowledgement: {error}"))?;
    command.clear();
    std::io::stdin()
        .read_line(&mut command)
        .map_err(|error| format!("read fixture cleanup command: {error}"))?;
    if command.trim() != "exit" {
        return Err("fixture received an unexpected cleanup command".to_owned());
    }
    Ok(())
}

fn probe_two_by_two() -> Result<(), String> {
    let executable =
        env::current_exe().map_err(|error| format!("resolve 2x2 probe executable: {error}"))?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("read 2x2 probe clock: {error}"))?
        .as_nanos();
    let root = env::temp_dir().join(format!(
        "addone-terminal-host-2x2-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir_all(&root)
        .map_err(|error| format!("create 2x2 probe root {}: {error}", root.display()))?;

    let result = (|| {
        for index in 0..4 {
            let cwd = root.join(format!("pane-{}", index + 1));
            fs::create_dir_all(&cwd).map_err(|error| {
                format!("create isolated 2x2 fixture cwd {}: {error}", cwd.display())
            })?;
        }
        let launches: [SessionLaunch; 4] = std::array::from_fn(|index| {
            let cwd = root.join(format!("pane-{}", index + 1));
            let token = format!("exact-argument-{}", index + 1);
            SessionLaunch {
                program: executable.to_string_lossy().into_owned(),
                arguments: vec!["--fixture-pane".to_owned(), token.clone()],
                cwd: Some(cwd),
                environment: vec![
                    ("A1_FIXTURE_TOKEN".to_owned(), token),
                    (
                        "A1_FIXTURE_INPUT".to_owned(),
                        format!("focused-input-{}", index + 1),
                    ),
                ],
            }
        });
        let mut expected = std::array::from_fn::<String, 4, _>(|index| {
            format!(
                "A1_FIXTURE|pane-{}|session-{}|exact-argument-{}|{}|pid=",
                index + 1,
                index + 1,
                index + 1,
                root.join(format!("pane-{}", index + 1)).to_string_lossy()
            )
        });
        if cfg!(windows) {
            for marker in &mut expected {
                *marker = marker.to_ascii_lowercase();
            }
        }

        let mut workspace = FixedWorkspace::spawn(80, 24, launches)?;
        let topology = workspace.topology_json();
        if !topology.contains("\"revision\":1")
            || (1..=4).any(|index| {
                !topology.contains(&format!("\"id\":\"pane-{index}\""))
                    || !topology.contains(&format!("\"sessionId\":\"session-{index}\""))
            })
        {
            return Err("2x2 topology does not contain four durable mappings".to_owned());
        }

        let process_ids = workspace.process_ids();
        let unique_processes: HashSet<u32> = process_ids.into_iter().flatten().collect();
        if unique_processes.len() != 4 {
            return Err(format!(
                "2x2 probe expected four independent process identities, received {process_ids:?}"
            ));
        }

        let mut transcripts: [Vec<u8>; 4] = std::array::from_fn(|_| Vec::new());
        let deadline = Instant::now() + Duration::from_secs(10);
        loop {
            let output = workspace.drain_all();
            for (transcript, bytes) in transcripts.iter_mut().zip(output) {
                transcript.extend(bytes);
            }
            workspace.inspect_all()?;
            let observed_all = transcripts.iter().enumerate().all(|(index, bytes)| {
                let text = String::from_utf8_lossy(bytes);
                let comparable = if cfg!(windows) {
                    text.to_ascii_lowercase()
                } else {
                    text.into_owned()
                };
                comparable.contains(&expected[index])
            });
            if observed_all {
                break;
            }
            if Instant::now() >= deadline {
                return Err(format!(
                    "2x2 exact-command/environment/cwd probe timed out: {transcripts:?}"
                ));
            }
            thread::sleep(Duration::from_millis(10));
        }

        let initial_frame_bytes = workspace.compose_probe_frame()?;
        if initial_frame_bytes == 0 {
            return Err("2x2 native frame composer produced no initial presentation".to_owned());
        }

        for index in 0..4 {
            workspace.focus(index)?;
            workspace.write_to_focused(format!("focused-input-{}\r\n", index + 1).as_bytes())?;
        }
        let focused_topology = workspace.topology_json();
        if !focused_topology.contains("\"revision\":4")
            || !focused_topology.contains("\"focusedPaneId\":\"pane-4\"")
        {
            return Err("focused-pane topology did not advance atomically".to_owned());
        }
        let deadline = Instant::now() + Duration::from_secs(10);
        loop {
            let output = workspace.drain_all();
            for (transcript, bytes) in transcripts.iter_mut().zip(output) {
                transcript.extend(bytes);
            }
            workspace.inspect_all()?;
            let isolated = transcripts.iter().enumerate().all(|(index, bytes)| {
                let text = String::from_utf8_lossy(bytes);
                let own = format!(
                    "A1_INPUT_ACK|pane-{}|focused-input-{}",
                    index + 1,
                    index + 1
                );
                text.contains(&own)
                    && (0..4).filter(|other| *other != index).all(|other| {
                        !text.contains(&format!(
                            "A1_INPUT_ACK|pane-{}|focused-input-{}",
                            index + 1,
                            other + 1
                        ))
                    })
            });
            if isolated {
                break;
            }
            if Instant::now() >= deadline {
                return Err(format!(
                    "2x2 focused-input isolation probe timed out: {transcripts:?}"
                ));
            }
            thread::sleep(Duration::from_millis(10));
        }

        let updated_frame_bytes = workspace.compose_probe_frame()?;
        if updated_frame_bytes == 0 {
            return Err("2x2 native frame composer produced no updated presentation".to_owned());
        }

        workspace.resize(100, 30)?;
        let expected_layout = FixedLayout::new(100, 30)?;
        for (index, size) in workspace.pty_sizes()?.iter().enumerate() {
            let rect = expected_layout.panes[index];
            if size.cols != rect.columns || size.rows != rect.rows {
                return Err(format!(
                    "{} PTY resize mismatch: expected {}x{}, received {}x{}",
                    index + 1,
                    rect.columns,
                    rect.rows,
                    size.cols,
                    size.rows
                ));
            }
        }

        for index in 0..4 {
            workspace.write_to_pane(index, b"exit\r\n")?;
        }
        let deadline = Instant::now() + Duration::from_secs(10);
        while !workspace.all_finished() {
            workspace.drain_all();
            workspace.inspect_all()?;
            if Instant::now() >= deadline {
                return Err("2x2 independent-process cleanup timed out".to_owned());
            }
            thread::sleep(Duration::from_millis(10));
        }
        workspace.verify_hot_path_isolation()?;
        let hot_path = workspace.hot_path_json();
        workspace.shutdown();
        println!("{topology}");
        println!("{hot_path}");
        println!(
            "{{\"probe\":\"2x2-passed\",\"topologyRevision\":1,\"panes\":4,\"sessions\":4,\"independentProcesses\":4,\"exactCommand\":true,\"environment\":true,\"cwd\":true,\"focusedInputIsolation\":true,\"nativeHotPathIsolation\":true,\"nodeRelay\":false,\"resize\":true,\"cleanup\":true}}"
        );
        Ok(())
    })();
    let cleanup = fs::remove_dir_all(&root);
    if let Err(error) = cleanup
        && result.is_ok()
    {
        return Err(format!("remove 2x2 probe root {}: {error}", root.display()));
    }
    result
}

fn run_interactive(arguments: &[String]) -> Result<(), String> {
    let (program, command_args) = if arguments.first().is_some_and(|value| value == "--") {
        let values = &arguments[1..];
        if values.is_empty() {
            return Err("--run -- requires a command".to_owned());
        }
        (values[0].clone(), values[1..].to_vec())
    } else {
        ("pi".to_owned(), Vec::new())
    };
    let program = resolve_command(&program)?;
    let (columns, rows) =
        terminal::size().map_err(|error| format!("read terminal size: {error}"))?;
    let launches = SessionLaunch::repeated(program, command_args);
    let mut workspace = FixedWorkspace::spawn(columns, rows, launches)?;
    let _guard = TerminalModeGuard::enter()?;
    workspace.run_interactive()
}

fn encode_key(
    encoder: &KeyEncoder,
    terminal: &GhosttyTerminal,
    key: KeyEvent,
) -> Result<Option<Vec<u8>>, String> {
    if !matches!(key.kind, KeyEventKind::Press | KeyEventKind::Repeat) {
        return Ok(None);
    }
    let mods = modifier_bits(key.modifiers);

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
            terminal,
            ghost_key,
            mods,
            text.as_deref(),
            key.kind == KeyEventKind::Repeat,
        )
        .map(Some)
}

fn modifier_bits(modifiers: KeyModifiers) -> u16 {
    let mut mods = 0u16;
    if modifiers.contains(KeyModifiers::SHIFT) {
        mods |= ghostty::MOD_SHIFT;
    }
    if modifiers.contains(KeyModifiers::CONTROL) {
        mods |= ghostty::MOD_CTRL;
    }
    if modifiers.contains(KeyModifiers::ALT) {
        mods |= ghostty::MOD_ALT;
    }
    if modifiers.contains(KeyModifiers::SUPER) {
        mods |= ghostty::MOD_SUPER;
    }
    mods
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
