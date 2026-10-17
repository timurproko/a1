//! Last words for a contained runtime that died without restoring the terminal.
//!
//! The runtime arms a notice file while it owns the terminal and removes it after a clean
//! shutdown. The Node-hosted guardian and its detached watcher race to claim that notice after
//! the runtime or guardian exits; the rename ensures only one of them restores and prints it.

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
    #[cfg(test)]
    pub(crate) fn capture(path: Option<String>) -> Self {
        let terminal = if path.is_some() {
            terminal::Snapshot::capture()
        } else {
            terminal::Snapshot::default()
        };
        Self { path, terminal }
    }

    /// Rebuilds a notice owner from modes captured before the runtime changed the terminal.
    pub(crate) fn for_watcher(path: String, modes: &str) -> Self {
        Self {
            path: Some(path),
            terminal: terminal::Snapshot::decode(modes),
        }
    }

    /// Restores the terminal and prints the notice when the runtime left it armed.
    pub(crate) fn deliver(self) {
        let Some(path) = self.path else { return };
        // Invariant: the rename is the claim; it fails for whichever owner comes second.
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
        // still has the runtime's VT input mode, so the reset is written before modes are restored.
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
        .map(|line| {
            line.chars()
                .filter(|character| !character.is_control())
                .collect::<String>()
        })
        .map(|line| line.trim_end().to_owned())
        .filter(|line| !line.is_empty())
        .take(NOTICE_LINE_LIMIT)
        .collect()
}

#[cfg(unix)]
pub(crate) mod terminal {
    use std::io::Write;
    use std::mem::{size_of, zeroed};

    #[derive(Default)]
    pub(crate) struct Snapshot(Option<libc::termios>);

    impl Snapshot {
        pub(crate) fn capture() -> Self {
            if unsafe { libc::isatty(libc::STDIN_FILENO) } != 1 {
                return Self(None);
            }
            let mut modes: libc::termios = unsafe { zeroed() };
            if unsafe { libc::tcgetattr(libc::STDIN_FILENO, &mut modes) } != 0 {
                return Self(None);
            }
            Self(Some(modes))
        }

        pub(crate) fn encode(&self) -> String {
            let Some(modes) = &self.0 else {
                return "-".to_owned();
            };
            let bytes = unsafe {
                std::slice::from_raw_parts(
                    (modes as *const libc::termios).cast::<u8>(),
                    size_of::<libc::termios>(),
                )
            };
            let mut encoded = String::with_capacity(bytes.len() * 2);
            for byte in bytes {
                use std::fmt::Write as _;
                let _ = write!(encoded, "{byte:02x}");
            }
            encoded
        }

        pub(crate) fn decode(value: &str) -> Self {
            let byte_len = size_of::<libc::termios>();
            if value.len() != byte_len * 2 || !value.is_ascii() {
                return Self(None);
            }
            let mut modes: libc::termios = unsafe { zeroed() };
            let target = unsafe {
                std::slice::from_raw_parts_mut(
                    (&mut modes as *mut libc::termios).cast::<u8>(),
                    byte_len,
                )
            };
            for (index, slot) in target.iter_mut().enumerate() {
                let start = index * 2;
                let Ok(byte) = u8::from_str_radix(&value[start..start + 2], 16) else {
                    return Self(None);
                };
                *slot = byte;
            }
            Self(Some(modes))
        }

        pub(crate) fn restore(&self) {
            if let Some(modes) = &self.0 {
                unsafe { libc::tcsetattr(libc::STDIN_FILENO, libc::TCSANOW, modes) };
            }
        }
    }

    pub(crate) fn is_terminal() -> bool {
        unsafe { libc::isatty(libc::STDOUT_FILENO) == 1 }
    }

    pub(crate) fn write_terminal(bytes: &[u8]) {
        let mut stdout = std::io::stdout();
        let _ = stdout.write_all(bytes);
        let _ = stdout.flush();
    }
}

#[cfg(windows)]
pub(crate) mod terminal {
    use std::io::Write;

    use windows_sys::Win32::Foundation::{HANDLE, INVALID_HANDLE_VALUE};
    use windows_sys::Win32::System::Console::{
        ENABLE_VIRTUAL_TERMINAL_PROCESSING, GetConsoleMode, GetStdHandle, STD_INPUT_HANDLE,
        STD_OUTPUT_HANDLE, SetConsoleMode,
    };

    #[derive(Default)]
    pub(crate) struct Snapshot {
        input: Option<u32>,
        output: Option<u32>,
    }

    impl Snapshot {
        pub(crate) fn capture() -> Self {
            Self {
                input: console_mode(STD_INPUT_HANDLE),
                output: console_mode(STD_OUTPUT_HANDLE),
            }
        }

        pub(crate) fn encode(&self) -> String {
            let part = |mode: Option<u32>| {
                mode.map_or_else(|| "-".to_owned(), |mode| mode.to_string())
            };
            format!("{}:{}", part(self.input), part(self.output))
        }

        pub(crate) fn decode(value: &str) -> Self {
            let mut parts = value.splitn(2, ':').map(|part| part.parse::<u32>().ok());
            Self {
                input: parts.next().flatten(),
                output: parts.next().flatten(),
            }
        }

        pub(crate) fn restore(&self) {
            if let (Some(mode), Some(handle)) = (self.input, standard_handle(STD_INPUT_HANDLE)) {
                unsafe { SetConsoleMode(handle, mode) };
            }
            if let (Some(mode), Some(handle)) = (self.output, standard_handle(STD_OUTPUT_HANDLE)) {
                unsafe { SetConsoleMode(handle, mode) };
            }
        }
    }

    pub(crate) fn is_terminal() -> bool {
        console_mode(STD_OUTPUT_HANDLE).is_some()
    }

    pub(crate) fn write_terminal(bytes: &[u8]) {
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

    #[test]
    fn terminal_modes_round_trip_through_the_watcher_encoding() {
        let encoded = super::terminal::Snapshot::capture().encode();
        super::terminal::Snapshot::decode(&encoded).restore();
    }
}
