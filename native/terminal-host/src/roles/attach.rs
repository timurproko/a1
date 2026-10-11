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
