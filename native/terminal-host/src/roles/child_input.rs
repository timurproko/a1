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
                // Protocol: owned prompt navigation consumes the legacy modified-arrow form.
                // Normalize it even if a child's keyboard mode would encode the key differently.
                if let Some(bytes) = prompt_navigation_arrow(key, *mods) {
                    return Ok(bytes);
                }
                // Compatibility: without the kitty keyboard protocol a modified Enter, Tab,
                // Backspace, or Escape reaches direct A1 as the bytes its terminal sends, such as
                // the LF ConPTY reports for Ctrl+Enter; only an enhanced child gets libghostty's form.
                if terminal.kitty_keyboard_flags().unwrap_or(0) == 0
                    && let Some(bytes) = modified_control_fallback(key, *mods)
                {
                    return Ok(bytes);
                }
                let encoded = self.keys.encode(
                    terminal,
                    code,
                    ghostty_mods(*mods),
                    text.as_deref(),
                    *repeat,
                )?;
                if encoded.is_empty() {
                    return Ok(modified_control_fallback(key, *mods).unwrap_or_default());
                }
                Ok(encoded)
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

fn prompt_navigation_arrow(key: &str, mods: u8) -> Option<Vec<u8>> {
    let parameter = match mods {
        MOD_SHIFT => 2,
        MOD_CTRL => 5,
        _ => return None,
    };
    let letter = match key {
        "arrow-up" => 'A',
        "arrow-down" => 'B',
        _ => return None,
    };
    Some(format!("\x1b[1;{parameter}{letter}").into_bytes())
}

/// The bytes direct A1 observes for a modified Enter, Tab, Backspace, or Escape that the legacy
/// key protocol leaves unencoded: the xterm CSI u form every supported terminal emits for them.
///
/// Platform: Windows terminals send LF for Ctrl+Enter and ConPTY reports LF as Ctrl+Enter, so LF
/// is the byte the direct prompt observes there.
pub fn modified_control_fallback(key: &str, mods: u8) -> Option<Vec<u8>> {
    let mut parameter = 1u8;
    if mods & MOD_SHIFT != 0 {
        parameter += 1;
    }
    if mods & MOD_ALT != 0 {
        parameter += 2;
    }
    if mods & MOD_CTRL != 0 {
        parameter += 4;
    }
    if parameter == 1 {
        return None;
    }
    let codepoint = match key {
        "enter" if cfg!(windows) && mods & (MOD_CTRL | MOD_ALT | MOD_SHIFT) == MOD_CTRL => {
            return Some(b"\n".to_vec());
        }
        "enter" => 13,
        "tab" if parameter == 2 => return Some(b"\x1b[Z".to_vec()),
        "tab" => 9,
        "backspace" => 127,
        "escape" => 27,
        _ => return None,
    };
    Some(format!("\x1b[{codepoint};{parameter}u").into_bytes())
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
    fn modified_arrows_reach_the_child_as_prompt_navigation_keys() {
        let terminal = GhosttyTerminal::new(80, 24).expect("terminal");
        let mut encoder = SemanticEncoder::new(&terminal, 80, 24).expect("encoder");
        for (mods, up, down) in [
            (MOD_SHIFT, b"\x1b[1;2A".as_slice(), b"\x1b[1;2B".as_slice()),
            (MOD_CTRL, b"\x1b[1;5A".as_slice(), b"\x1b[1;5B".as_slice()),
        ] {
            for (key, expected) in [("arrow-up", up), ("arrow-down", down)] {
                let event = InputEvent::Key {
                    key: key.into(),
                    mods,
                    text: None,
                    repeat: false,
                };
                assert_eq!(
                    encoder.encode(&terminal, &event).expect("modified arrow"),
                    expected,
                    "{key}"
                );
            }
        }
    }

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
    fn modified_control_keys_fall_back_to_what_direct_terminals_send() {
        assert_eq!(modified_control_fallback("enter", 0), None);
        assert_eq!(modified_control_fallback("a", MOD_CTRL), None);
        assert_eq!(
            modified_control_fallback("enter", MOD_SHIFT),
            Some(b"\x1b[13;2u".to_vec())
        );
        assert_eq!(
            modified_control_fallback("tab", MOD_SHIFT),
            Some(b"\x1b[Z".to_vec())
        );
        assert_eq!(
            modified_control_fallback("tab", MOD_CTRL | MOD_SHIFT),
            Some(b"\x1b[9;6u".to_vec())
        );
        assert_eq!(
            modified_control_fallback("backspace", MOD_ALT),
            Some(b"\x1b[127;3u".to_vec())
        );
        assert_eq!(
            modified_control_fallback("escape", MOD_CTRL),
            Some(b"\x1b[27;5u".to_vec())
        );
        let ctrl_enter = modified_control_fallback("enter", MOD_CTRL).expect("ctrl+enter");
        if cfg!(windows) {
            assert_eq!(ctrl_enter, b"\n");
        } else {
            assert_eq!(ctrl_enter, b"\x1b[13;5u");
        }
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
