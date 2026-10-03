//! Last words for a contained runtime that died without restoring the terminal.
//!
//! The runtime arms a notice file while it owns the terminal and removes it after a clean
//! shutdown. The guardian is native, so it outlives kills aimed at the runtime (`taskkill /IM
//! node.exe`, `pkill node`); when the notice is still present after the runtime ended, the
//! guardian restores the terminal it captured at launch and prints the notice text.
//!
//! On Windows the guardian itself is a member of its Node owner's kill-on-close Job Object, so a
//! kill of the owner takes the guardian too. A watcher process outside that job delivers the
//! notice in that case; whichever side claims the notice first is the only one to print it.

use std::fs;
use std::io::{Read, Write};

/// Mirrors `EMERGENCY_TERMINAL_RESET` in `src/foundation/terminal-cleanup/terminal-reset.ts`.
pub(crate) const TERMINAL_RESET: &str = "\x1b[?2026l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1004l\x1b[?1006l\x1b[?2004l\x1b[=0u\x1b[>4;0m\x1b]8;;\x1b\\\x1b[0m\x1b[r\x1b[?7h\x1b[?25h\x1b[?1049l\x1b7\x1b[r\x1b8\x1b[?7h\x1b[?25h\x1b]9;4;0\x07";

const NOTICE_BYTE_LIMIT: u64 = 4_096;
const NOTICE_LINE_LIMIT: usize = 8;

pub(crate) struct ExitNotice {
    path: Option<String>,
    terminal: terminal::Snapshot,
}

impl ExitNotice {
    /// Captures the terminal modes before the runtime changes them; a no-op without a notice path.
    pub(crate) fn capture(path: Option<String>) -> Self {
        let terminal = if path.is_some() { terminal::Snapshot::capture() } else { terminal::Snapshot::default() };
        Self { path, terminal }
    }

    /// Rebuilds the guardian's notice inside the watcher from the modes the guardian captured.
    #[cfg(windows)]
    pub(crate) fn for_watcher(path: String, modes: &str) -> Self {
        Self { path: Some(path), terminal: terminal::Snapshot::decode(modes) }
    }

    /// The captured terminal modes in the form `for_watcher` accepts.
    #[cfg(windows)]
    pub(crate) fn encoded_modes(&self) -> String {
        self.terminal.encode()
    }

    /// Restores the terminal and prints the notice when the runtime left it armed.
    pub(crate) fn deliver(self) {
        let Some(path) = self.path else { return };
        // Invariant: the rename is the claim; it fails for whichever of guardian and watcher comes second.
        let claimed = format!("{path}.delivering");
        if fs::rename(&path, &claimed).is_err() {
            return;
        }
        let mut text = String::new();
        // Security: the notice is bounded and stripped of control characters, so a damaged or
        // foreign file can never drive the terminal; only the fixed reset sequence does.
        if let Ok(file) = fs::File::open(&claimed) {
            let _ = file.take(NOTICE_BYTE_LIMIT).read_to_string(&mut text);
        }
        let _ = fs::remove_file(&claimed);
        let lines = sanitize(&text);
        let interactive = terminal::is_terminal();
        let mut output = String::new();
        if interactive {
            output.push_str(TERMINAL_RESET);
        }
        if !lines.is_empty() {
            output.push_str("\r\n");
            output.push_str(&lines.join("\r\n"));
            output.push_str("\r\n");
        }
        // Platform: ConPTY forwards mouse-mode resets to the outer terminal only while the console
        // still has the runtime's VT input mode, so the reset is written before the modes are restored.
        if interactive {
            terminal::write_terminal(output.as_bytes());
        } else {
            let _ = std::io::stderr().write_all(output.as_bytes());
        }
        self.terminal.restore();
    }
}

fn sanitize(text: &str) -> Vec<String> {
    text.lines()
        .map(|line| line.chars().filter(|character| !character.is_control()).collect::<String>())
        .map(|line| line.trim_end().to_owned())
        .filter(|line| !line.is_empty())
        .take(NOTICE_LINE_LIMIT)
        .collect()
}

#[cfg(unix)]
mod terminal {
    use std::io::Write;
    use std::mem::zeroed;

    #[derive(Default)]
    pub(super) struct Snapshot(Option<libc::termios>);

    impl Snapshot {
        pub(super) fn capture() -> Self {
            if unsafe { libc::isatty(libc::STDIN_FILENO) } != 1 {
                return Self(None);
            }
            let mut modes: libc::termios = unsafe { zeroed() };
            if unsafe { libc::tcgetattr(libc::STDIN_FILENO, &mut modes) } != 0 {
                return Self(None);
            }
            Self(Some(modes))
        }

        pub(super) fn restore(&self) {
            if let Some(modes) = &self.0 {
                unsafe { libc::tcsetattr(libc::STDIN_FILENO, libc::TCSANOW, modes) };
            }
        }
    }

    /// Whether stdout is a terminal that should receive the reset sequence.
    pub(super) fn is_terminal() -> bool {
        unsafe { libc::isatty(libc::STDOUT_FILENO) == 1 }
    }

    pub(super) fn write_terminal(bytes: &[u8]) {
        let mut stdout = std::io::stdout();
        let _ = stdout.write_all(bytes);
        let _ = stdout.flush();
    }
}

#[cfg(windows)]
mod terminal {
    use std::io::Write;

    use windows_sys::Win32::Foundation::{HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Console::{
        ENABLE_VIRTUAL_TERMINAL_PROCESSING, GetConsoleMode, GetStdHandle, STD_INPUT_HANDLE,
        STD_OUTPUT_HANDLE, SetConsoleMode,
    };

    #[derive(Default)]
    pub(super) struct Snapshot {
        input: Option<u32>,
        output: Option<u32>,
    }

    impl Snapshot {
        pub(super) fn capture() -> Self {
            Self { input: console_mode(STD_INPUT_HANDLE), output: console_mode(STD_OUTPUT_HANDLE) }
        }

        pub(super) fn encode(&self) -> String {
            let part = |mode: Option<u32>| mode.map_or_else(|| "-".to_owned(), |mode| mode.to_string());
            format!("{}:{}", part(self.input), part(self.output))
        }

        pub(super) fn decode(value: &str) -> Self {
            let mut parts = value.splitn(2, ':').map(|part| part.parse::<u32>().ok());
            Self { input: parts.next().flatten(), output: parts.next().flatten() }
        }

        pub(super) fn restore(&self) {
            if let (Some(mode), Some(handle)) = (self.input, standard_handle(STD_INPUT_HANDLE)) {
                unsafe { SetConsoleMode(handle, mode) };
            }
            if let (Some(mode), Some(handle)) = (self.output, standard_handle(STD_OUTPUT_HANDLE)) {
                unsafe { SetConsoleMode(handle, mode) };
            }
        }
    }

    /// Whether stdout is a console that should receive the reset sequence.
    pub(super) fn is_terminal() -> bool {
        console_mode(STD_OUTPUT_HANDLE).is_some()
    }

    pub(super) fn write_terminal(bytes: &[u8]) {
        // Protocol: the reset is a VT sequence, so processing is enabled only for this write and
        // the shell's own output mode is put back afterwards.
        let handle = standard_handle(STD_OUTPUT_HANDLE);
        let original = console_mode(STD_OUTPUT_HANDLE);
        if let (Some(handle), Some(mode)) = (handle, original) {
            unsafe { SetConsoleMode(handle, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING) };
        }
        let mut stdout = std::io::stdout();
        let _ = stdout.write_all(bytes);
        let _ = stdout.flush();
        if let (Some(handle), Some(mode)) = (handle, original) {
            unsafe { SetConsoleMode(handle, mode) };
        }
    }

    fn standard_handle(kind: u32) -> Option<HANDLE> {
        let handle = unsafe { GetStdHandle(kind) };
        (!handle.is_null() && handle != INVALID_HANDLE_VALUE).then_some(handle)
    }

    fn console_mode(kind: u32) -> Option<u32> {
        let handle = standard_handle(kind)?;
        let mut mode = 0u32;
        (unsafe { GetConsoleMode(handle, &mut mode) } != 0).then_some(mode)
    }
}

#[cfg(test)]
mod tests {
    use super::{ExitNotice, sanitize};
    use std::fs;

    #[test]
    fn strips_control_characters_and_bounds_lines() {
        let lines = sanitize("first\x1b[31m line\r\n\n\x07second\u{9b}2J\nthird\n4\n5\n6\n7\n8\n9\n");
        assert_eq!(lines[0], "first[31m line");
        assert_eq!(lines[1], "second2J");
        assert_eq!(lines.len(), 8);
    }

    #[test]
    fn consumes_an_armed_notice_and_ignores_a_missing_one() {
        let path = std::env::temp_dir().join(format!("a1-exit-notice-{}.txt", std::process::id()));
        fs::write(&path, "stopped\n").expect("write notice");
        ExitNotice::capture(Some(path.to_string_lossy().into_owned())).deliver();
        assert!(!path.exists());
        ExitNotice::capture(Some(path.to_string_lossy().into_owned())).deliver();
        ExitNotice::capture(None).deliver();
    }
}
