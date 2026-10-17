//! Final child encoding of normalized outer-terminal events.
//!
//! The holder owns the child's terminal model and therefore knows its key, mouse, focus, and
//! paste modes; it is the only role that can turn a semantic event into the bytes direct A1
//! would have received from the user's terminal.

use crate::ghostty::{
    GhosttyTerminal, KeyEncoder, MODE_BRACKETED_PASTE, MODE_FOCUS_EVENT, MouseAction, MouseButton,
    MouseEncoder, MouseInput,
};
use crate::protocol::{InputEvent, MOD_ALT, MOD_CTRL, MOD_SHIFT, MOD_SUPER, MouseEventAction};
use crate::semantic_keys;

const BRACKETED_PASTE_START: &[u8] = b"\x1b[200~";
const BRACKETED_PASTE_END: &[u8] = b"\x1b[201~";
/// Bytes the bracketed-paste framing adds around one complete paste.
pub const PASTE_FRAMING_BYTES: usize = BRACKETED_PASTE_START.len() + BRACKETED_PASTE_END.len();

/// Encodes semantic events for one child against its current terminal modes.
pub struct SemanticEncoder {
    keys: KeyEncoder,
    mouse: MouseEncoder,
    /// Mouse buttons currently held, as a bit per libghostty button number.
    pressed: u8,
    columns: u16,
    rows: u16,
}

impl SemanticEncoder {
    pub fn new(terminal: &GhosttyTerminal, columns: u16, rows: u16) -> Result<Self, String> {
        Ok(Self {
            keys: KeyEncoder::new(terminal)?,
            mouse: MouseEncoder::new()?,
            pressed: 0,
            columns,
            rows,
        })
    }

    pub fn resize(&mut self, columns: u16, rows: u16) {
        self.columns = columns;
        self.rows = rows;
    }

    /// The bytes the child receives for `event`; empty when the child's modes make the event
    /// invisible to it, exactly as a terminal would stay silent.
    pub fn encode(
        &mut self,
        terminal: &GhosttyTerminal,
        event: &InputEvent,
    ) -> Result<Vec<u8>, String> {
        match event {
            InputEvent::Key {
                key,
                mods,
                text,
                repeat,
            } => {
                let code = semantic_keys::key_code(key)
                    .ok_or_else(|| "input rejected; unknown key identity".to_owned())?;
                self.keys.encode(
                    terminal,
                    code,
                    ghostty_mods(*mods),
                    text.as_deref(),
                    *repeat,
                )
            }
            InputEvent::Focus { gained } => Ok(if terminal.mode(MODE_FOCUS_EVENT)? {
                if *gained {
                    b"\x1b[I".to_vec()
                } else {
                    b"\x1b[O".to_vec()
                }
            } else {
                Vec::new()
            }),
            InputEvent::Mouse {
                action,
                button,
                mods,
                column,
                row,
            } => {
                let (ghostty_action, button) = match action {
                    MouseEventAction::Press => (MouseAction::Press, *button),
                    MouseEventAction::Release => (MouseAction::Release, *button),
                    MouseEventAction::Motion => (MouseAction::Motion, *button),
                    MouseEventAction::ScrollUp => (MouseAction::Press, Some(4)),
                    MouseEventAction::ScrollDown => (MouseAction::Press, Some(5)),
                };
                if let Some(number) = button.filter(|number| (1..=3).contains(number)) {
                    let bit = 1u8 << number;
                    match ghostty_action {
                        MouseAction::Press => self.pressed |= bit,
                        MouseAction::Release => self.pressed &= !bit,
                        MouseAction::Motion => {}
                    }
                }
                // Invariant: a release must name the button being released or libghostty treats
                // it as a bare motion report.
                let any_button_pressed = self.pressed != 0
                    || matches!(ghostty_action, MouseAction::Press | MouseAction::Release);
                self.mouse.encode(
                    terminal,
                    MouseInput {
                        action: ghostty_action,
                        button: button.and_then(mouse_button),
                        mods: ghostty_mods(*mods),
                        column: *column,
                        row: *row,
                        columns: self.columns,
                        rows: self.rows,
                        any_button_pressed,
                    },
                )
            }
        }
    }
}

/// The bytes a complete paste produces for the child, honoring its bracketed-paste mode the way
/// the user's own terminal would.
pub fn encode_paste(terminal: &GhosttyTerminal, content: &[u8]) -> Vec<u8> {
    if terminal.mode(MODE_BRACKETED_PASTE).unwrap_or(true) {
        bracketed_paste(content)
    } else {
        plain_paste(content)
    }
}

pub fn bracketed_paste(content: &[u8]) -> Vec<u8> {
    let mut complete =
        Vec::with_capacity(BRACKETED_PASTE_START.len() + content.len() + BRACKETED_PASTE_END.len());
    complete.extend_from_slice(BRACKETED_PASTE_START);
    complete.extend_from_slice(content);
    complete.extend_from_slice(BRACKETED_PASTE_END);
    complete
}

/// Without bracketed paste a terminal delivers pasted line breaks as carriage returns.
pub fn plain_paste(content: &[u8]) -> Vec<u8> {
    let mut output = Vec::with_capacity(content.len());
    let mut index = 0;
    while index < content.len() {
        match content[index] {
            b'\r' if content.get(index + 1) == Some(&b'\n') => {
                output.push(b'\r');
                index += 2;
                continue;
            }
            b'\n' => output.push(b'\r'),
            byte => output.push(byte),
        }
        index += 1;
    }
    output
}

/// The recovery action a key event names while the child is gone, matching the keys the viewed
/// failure banner advertises.
pub fn recovery_action(event: &InputEvent) -> Option<&'static str> {
    let InputEvent::Key { key, mods, .. } = event else {
        return None;
    };
    if mods & (MOD_CTRL | MOD_ALT | MOD_SUPER) != 0 {
        return None;
    }
    match key.as_str() {
        "r" => Some("retry"),
        "f" => Some("fresh"),
        "x" => Some("close"),
        _ => None,
    }
}

fn ghostty_mods(mods: u8) -> u16 {
    let mut value = 0u16;
    if mods & MOD_SHIFT != 0 {
        value |= crate::ghostty::MOD_SHIFT;
    }
    if mods & MOD_CTRL != 0 {
        value |= crate::ghostty::MOD_CTRL;
    }
    if mods & MOD_ALT != 0 {
        value |= crate::ghostty::MOD_ALT;
    }
    if mods & MOD_SUPER != 0 {
        value |= crate::ghostty::MOD_SUPER;
    }
    value
}

fn mouse_button(number: u8) -> Option<MouseButton> {
    match number {
        1 => Some(MouseButton::Left),
        2 => Some(MouseButton::Right),
        3 => Some(MouseButton::Middle),
        4 => Some(MouseButton::Four),
        5 => Some(MouseButton::Five),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paste_encoding_matches_a_terminal_in_either_mode() {
        assert_eq!(
            bracketed_paste("wide 开发 e\u{301}".as_bytes()),
            b"\x1b[200~wide \xe5\xbc\x80\xe5\x8f\x91 e\xcc\x81\x1b[201~"
        );
        assert_eq!(plain_paste(b"one\ntwo\r\nthree\r"), b"one\rtwo\rthree\r");
        assert_eq!(plain_paste(b""), b"");
    }

    #[test]
    fn recovery_actions_come_only_from_the_advertised_plain_keys() {
        let key = |name: &str, mods: u8| InputEvent::Key {
            key: name.into(),
            mods,
            text: None,
            repeat: false,
        };
        assert_eq!(recovery_action(&key("r", 0)), Some("retry"));
        assert_eq!(recovery_action(&key("f", MOD_SHIFT)), Some("fresh"));
        assert_eq!(recovery_action(&key("x", 0)), Some("close"));
        assert_eq!(recovery_action(&key("r", MOD_CTRL)), None);
        assert_eq!(recovery_action(&key("q", 0)), None);
        assert_eq!(recovery_action(&InputEvent::Focus { gained: true }), None);
    }

    #[test]
    fn modifier_masks_translate_bit_for_bit() {
        assert_eq!(ghostty_mods(0), 0);
        assert_eq!(
            ghostty_mods(MOD_SHIFT | MOD_CTRL | MOD_ALT | MOD_SUPER),
            crate::ghostty::MOD_SHIFT
                | crate::ghostty::MOD_CTRL
                | crate::ghostty::MOD_ALT
                | crate::ghostty::MOD_SUPER
        );
        assert_eq!(ghostty_mods(MOD_ALT), crate::ghostty::MOD_ALT);
    }
}
