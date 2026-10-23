//! Reconciles Windows ConPTY's cursor model with a standard terminal parser.
//!
//! Platform: ConPTY tracks its renderer cursor one column past the right edge when the child's
//! cursor rests after the final column. When a render pass ends there it emits an erase and a
//! cursor-forward that overshoots the last column, and the next pass returns with a backspace before
//! writing the final cell, for example `ESC[K ESC[79C` then `ESC[...m BS ┃` on a 122-column screen.
//! A standard parser clamps cursor-forward at the last column, so that backspace lands one cell to
//! the left and the final cell, such as a scrollbar rail glyph, is drawn in the wrong column while
//! the true final column stays blank. Solo mode never passes through ConPTY's re-render, so only
//! resident tabs showed the shift.
//!
//! The repair splits holder writes at each cursor-forward, records how far ConPTY meant to move
//! past the last column, and drops that many immediately following backspaces. Only SGR and
//! synchronized-output markers may separate them; any other byte ends the overshoot.

/// The next action the holder takes on its remaining PTY bytes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConptyStep {
    /// Write this many leading bytes to the parser.
    Write(usize),
    /// Skip this many leading bytes: backspaces that cancel ConPTY's past-the-edge cursor.
    Drop(usize),
}

#[derive(Debug, Default)]
pub struct ConptyCursorRepair {
    enabled: bool,
    /// Columns ConPTY believes its cursor sits beyond the parser's clamped final column.
    overshoot: u16,
}

impl ConptyCursorRepair {
    pub fn new(enabled: bool) -> Self {
        Self {
            enabled,
            overshoot: 0,
        }
    }

    /// Decides how the holder handles the start of `bytes`. `cursor` reports the parser's
    /// zero-based cursor column and screen width before any of `bytes` is written.
    pub fn next_step(
        &mut self,
        bytes: &[u8],
        cursor: impl FnOnce() -> Result<(u16, u16), String>,
    ) -> Result<ConptyStep, String> {
        if !self.enabled || bytes.is_empty() {
            return Ok(ConptyStep::Write(bytes.len()));
        }
        if self.overshoot > 0 {
            if bytes[0] == 0x08 {
                self.overshoot -= 1;
                return Ok(ConptyStep::Drop(1));
            }
            if let Some(length) = cursor_neutral_sequence(bytes) {
                return Ok(ConptyStep::Write(length));
            }
            self.overshoot = 0;
        }
        if let Some((length, count)) = cursor_forward(bytes) {
            let (column, columns) = cursor()?;
            let last = columns.saturating_sub(1);
            self.overshoot = column.saturating_add(count).saturating_sub(last);
            return Ok(ConptyStep::Write(length));
        }
        Ok(ConptyStep::Write(
            next_cursor_forward(bytes).unwrap_or(bytes.len()),
        ))
    }
}

/// A complete `CSI <count> C` at the start of `bytes`: its length and its effective count.
fn cursor_forward(bytes: &[u8]) -> Option<(usize, u16)> {
    let parameters = bytes.strip_prefix(b"\x1b[")?;
    let digits = parameters
        .iter()
        .take_while(|byte| byte.is_ascii_digit())
        .count();
    if parameters.get(digits) != Some(&b'C') {
        return None;
    }
    let count = std::str::from_utf8(&parameters[..digits])
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(1)
        .max(1);
    Some((2 + digits + 1, count))
}

/// Offset of the next complete cursor-forward after the first byte.
fn next_cursor_forward(bytes: &[u8]) -> Option<usize> {
    (1..bytes.len())
        .filter(|&index| bytes[index] == 0x1b)
        .find(|&index| cursor_forward(&bytes[index..]).is_some())
}

/// Length of a leading SGR or synchronized-output marker, which never moves the cursor.
fn cursor_neutral_sequence(bytes: &[u8]) -> Option<usize> {
    for marker in [b"\x1b[?2026h".as_slice(), b"\x1b[?2026l".as_slice()] {
        if bytes.starts_with(marker) {
            return Some(marker.len());
        }
    }
    let parameters = bytes.strip_prefix(b"\x1b[")?;
    let body = parameters
        .iter()
        .take_while(|byte| byte.is_ascii_digit() || matches!(byte, b';' | b':'))
        .count();
    (parameters.get(body) == Some(&b'm')).then_some(2 + body + 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Runs `bytes` through the repair against a simple clamped cursor model of `columns` cells and
    /// returns the bytes the parser would receive.
    fn repaired(bytes: &[u8], columns: u16, mut column: u16) -> Vec<u8> {
        let mut repair = ConptyCursorRepair::new(true);
        let mut output = Vec::new();
        let mut offset = 0;
        while offset < bytes.len() {
            match repair
                .next_step(&bytes[offset..], || Ok((column, columns)))
                .unwrap()
            {
                ConptyStep::Drop(length) => offset += length,
                ConptyStep::Write(length) => {
                    let piece = &bytes[offset..offset + length];
                    if let Some((_, count)) = cursor_forward(piece) {
                        column = column.saturating_add(count).min(columns - 1);
                    } else if piece.first().is_some_and(|byte| !byte.is_ascii_control()) {
                        column = column.saturating_add(piece.len() as u16).min(columns - 1);
                    }
                    output.extend_from_slice(piece);
                    offset += length;
                }
            }
        }
        output
    }

    #[test]
    fn drops_the_backspace_that_cancels_a_past_edge_cursor_forward() {
        let bytes = b"\x1b[K\x1b[79C\x1b[?2026l\x1b[38;2;104;183;141m\x08\xe2\x94\x83";
        assert_eq!(
            repaired(bytes, 122, 43),
            b"\x1b[K\x1b[79C\x1b[?2026l\x1b[38;2;104;183;141m\xe2\x94\x83"
        );
    }

    #[test]
    fn keeps_backspaces_after_an_in_bounds_cursor_forward() {
        let bytes = b"\x1b[78C\x08x";
        assert_eq!(repaired(bytes, 122, 43), bytes);
    }

    #[test]
    fn drops_only_as_many_backspaces_as_the_overshoot() {
        let bytes = b"\x1b[10C\x08\x08\x08x";
        assert_eq!(repaired(bytes, 10, 1), b"\x1b[10C\x08x");
    }

    #[test]
    fn any_other_byte_ends_the_overshoot() {
        let bytes = b"\x1b[79C\r\n\x08x";
        assert_eq!(repaired(bytes, 122, 43), bytes);
        let bytes = b"\x1b[79C\x1b[5;1H\x08x";
        assert_eq!(repaired(bytes, 122, 43), bytes);
    }

    #[test]
    fn disabled_repair_writes_everything_unchanged() {
        let mut repair = ConptyCursorRepair::new(false);
        let bytes = b"\x1b[79C\x08x";
        assert_eq!(
            repair.next_step(bytes, || unreachable!()).unwrap(),
            ConptyStep::Write(bytes.len())
        );
    }

    #[test]
    fn splits_writes_only_at_cursor_forward_sequences() {
        let mut repair = ConptyCursorRepair::new(true);
        let bytes = b"abc\x1b[31mdef\x1b[4Cgh";
        assert_eq!(
            repair.next_step(bytes, || unreachable!()).unwrap(),
            ConptyStep::Write(11)
        );
    }
}
