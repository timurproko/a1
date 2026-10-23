//! Normalization of outer-terminal events for the attach client.
//!
//! Attach names what the user did (key identity, modifiers, produced text, pointer gesture,
//! focus) and leaves the final child encoding to the holder, which owns the child's terminal
//! modes. The legacy byte encoding stays available as a negotiated compatibility fallback.

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use crossterm::event::{
    KeyCode, KeyEvent, KeyEventKind, KeyModifiers, MouseButton, MouseEventKind,
};

use crate::protocol::{
    ClipboardLocation, InputEvent, MOD_ALT, MOD_CTRL, MOD_SHIFT, MOD_SUPER, MouseEventAction,
    SemanticInput,
};
use crate::roles::wire::Input;
use crate::semantic_keys;

/// Resets the outer cursor shape to the terminal's default (DECSCUSR 0).
pub const RESET_CURSOR_STYLE: &[u8] = b"\x1b[0 q";

/// The modifier mask of a crossterm event in the wire's `MOD_*` bits.
pub fn modifier_mask(modifiers: KeyModifiers) -> u8 {
    let mut mask = 0;
    if modifiers.contains(KeyModifiers::SHIFT) {
        mask |= MOD_SHIFT;
    }
    if modifiers.contains(KeyModifiers::CONTROL) {
        mask |= MOD_CTRL;
    }
    if modifiers.contains(KeyModifiers::ALT) {
        mask |= MOD_ALT;
    }
    if modifiers.contains(KeyModifiers::SUPER) || modifiers.contains(KeyModifiers::META) {
        mask |= MOD_SUPER;
    }
    mask
}

/// A plain key press with its own text, as the failure banner forwards `r`, `f`, and `x`.
pub fn plain_key(name: &str) -> InputEvent {
    InputEvent::Key {
        key: name.to_owned(),
        mods: 0,
        text: Some(name.to_owned()),
        repeat: false,
    }
}

/// The semantic form of a key press, or `None` for keys no child can observe.
pub fn normalize_key(key: &KeyEvent) -> Option<InputEvent> {
    let repeat = key.kind == KeyEventKind::Repeat;
    let mut mods = modifier_mask(key.modifiers);
    let (name, text): (&str, Option<String>) = match key.code {
        KeyCode::Char(character) if character.is_control() => return None,
        KeyCode::Char(character) => (
            semantic_keys::key_name_for_char(character).unwrap_or(semantic_keys::UNIDENTIFIED),
            Some(character.to_string()),
        ),
        KeyCode::Enter => ("enter", None),
        KeyCode::Tab => ("tab", None),
        KeyCode::BackTab => {
            mods |= MOD_SHIFT;
            ("tab", None)
        }
        KeyCode::Backspace => ("backspace", None),
        KeyCode::Esc => ("escape", None),
        KeyCode::Delete => ("delete", None),
        KeyCode::Insert => ("insert", None),
        KeyCode::Home => ("home", None),
        KeyCode::End => ("end", None),
        KeyCode::PageUp => ("page-up", None),
        KeyCode::PageDown => ("page-down", None),
        KeyCode::Up => ("arrow-up", None),
        KeyCode::Down => ("arrow-down", None),
        KeyCode::Left => ("arrow-left", None),
        KeyCode::Right => ("arrow-right", None),
        KeyCode::F(number) => (semantic_keys::function_key_name(number)?, None),
        _ => return None,
    };
    Some(InputEvent::Key {
        key: name.to_owned(),
        mods,
        text,
        repeat,
    })
}

/// The semantic form of a pointer event over the child area; row 0 is the strip and yields none.
pub fn normalize_mouse(
    kind: MouseEventKind,
    column: u16,
    outer_row: u16,
    modifiers: KeyModifiers,
) -> Option<InputEvent> {
    normalize_child_mouse(
        kind,
        column,
        super::attach::child_mouse_row(outer_row)?,
        modifiers,
    )
}

pub fn normalize_child_mouse(
    kind: MouseEventKind,
    column: u16,
    row: u16,
    modifiers: KeyModifiers,
) -> Option<InputEvent> {
    let button_number = |button: MouseButton| match button {
        MouseButton::Left => 1,
        MouseButton::Right => 2,
        MouseButton::Middle => 3,
    };
    let (action, button) = match kind {
        MouseEventKind::Down(button) => (MouseEventAction::Press, Some(button_number(button))),
        MouseEventKind::Up(button) => (MouseEventAction::Release, Some(button_number(button))),
        MouseEventKind::Drag(button) => (MouseEventAction::Motion, Some(button_number(button))),
        MouseEventKind::Moved => (MouseEventAction::Motion, None),
        MouseEventKind::ScrollUp => (MouseEventAction::ScrollUp, None),
        MouseEventKind::ScrollDown => (MouseEventAction::ScrollDown, None),
        _ => return None,
    };
    Some(InputEvent::Mouse {
        action,
        button,
        mods: modifier_mask(modifiers),
        column,
        row,
    })
}

/// True when a normalized event is the plain `Ctrl+C` the clear/exit chord counts.
pub fn is_ctrl_c_event(event: &InputEvent) -> bool {
    match event {
        InputEvent::Key {
            key, mods, text, ..
        } => semantic_keys::is_plain_ctrl_c(key, *mods, text.as_deref()),
        _ => false,
    }
}

/// True when an event ends a pending `Ctrl+C` chord without being one: a press, a paste, or a
/// pointer activation is "another completed input sequence" in the clear/exit contract.
pub fn resets_chord(event: &InputEvent) -> bool {
    match event {
        InputEvent::Key { .. } => !is_ctrl_c_event(event),
        InputEvent::Mouse { action, .. } => matches!(
            action,
            MouseEventAction::Press | MouseEventAction::ScrollUp | MouseEventAction::ScrollDown
        ),
        InputEvent::Focus { .. } => false,
    }
}

/// The OSC 52 control that places `data` on the outer terminal's clipboard.
pub fn osc52(location: ClipboardLocation, data: &[u8]) -> Vec<u8> {
    format!(
        "\x1b]52;{};{}\x07",
        location.osc52_selector(),
        BASE64.encode(data)
    )
    .into_bytes()
}

/// The DECSCUSR control for a child cursor style, mirroring what the child set on its own
/// terminal model.
pub fn cursor_style_sequence(style: &str, blink: bool) -> &'static [u8] {
    match (style, blink) {
        ("bar", true) => b"\x1b[5 q",
        ("bar", false) => b"\x1b[6 q",
        ("underline", true) => b"\x1b[3 q",
        ("underline", false) => b"\x1b[4 q",
        (_, true) => b"\x1b[1 q",
        (_, false) => b"\x1b[2 q",
    }
}

/// One frame the attach client sends for an event: semantic when negotiated, bytes otherwise.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Outgoing {
    Semantic(SemanticInput),
    Legacy(Input),
}

/// Chooses the input representation per negotiated feature and remembers the byte form of the
/// last semantic event so a `legacy-holder` rejection can re-send it without loss.
#[derive(Debug)]
pub struct InputChannel {
    pub semantic: bool,
    seq: u64,
    last_legacy: Option<Vec<u8>>,
}

impl InputChannel {
    pub fn new(semantic: bool) -> Self {
        Self {
            semantic,
            seq: 0,
            last_legacy: None,
        }
    }

    pub fn outgoing(&mut self, event: Option<InputEvent>, legacy: Vec<u8>) -> Option<Outgoing> {
        if self.semantic
            && let Some(event) = event
        {
            self.seq = self.seq.saturating_add(1);
            self.last_legacy = (!legacy.is_empty()).then_some(legacy);
            return Some(Outgoing::Semantic(SemanticInput {
                epoch: 0,
                seq: self.seq,
                event,
            }));
        }
        if legacy.is_empty() {
            return None;
        }
        Some(Outgoing::Legacy(Input {
            bytes: legacy,
            paste: false,
            epoch: 0,
        }))
    }

    /// Switches to byte input after the server reported a holder without semantic encoding and
    /// returns the byte form of the event that was refused, if it had one.
    pub fn fall_back(&mut self) -> Option<Input> {
        self.semantic = false;
        self.last_legacy.take().map(|bytes| Input {
            bytes,
            paste: false,
            epoch: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn press(code: KeyCode, modifiers: KeyModifiers) -> KeyEvent {
        KeyEvent::new(code, modifiers)
    }

    #[test]
    fn keys_keep_identity_modifiers_and_text() {
        assert_eq!(
            normalize_key(&press(KeyCode::Char('A'), KeyModifiers::SHIFT)),
            Some(InputEvent::Key {
                key: "a".into(),
                mods: MOD_SHIFT,
                text: Some("A".into()),
                repeat: false,
            })
        );
        assert_eq!(
            normalize_key(&press(
                KeyCode::Char('c'),
                KeyModifiers::CONTROL | KeyModifiers::ALT
            )),
            Some(InputEvent::Key {
                key: "c".into(),
                mods: MOD_CTRL | MOD_ALT,
                text: Some("c".into()),
                repeat: false,
            })
        );
        assert_eq!(
            normalize_key(&press(KeyCode::Char('é'), KeyModifiers::NONE)),
            Some(InputEvent::Key {
                key: semantic_keys::UNIDENTIFIED.into(),
                mods: 0,
                text: Some("é".into()),
                repeat: false,
            })
        );
        assert_eq!(
            normalize_key(&press(KeyCode::BackTab, KeyModifiers::NONE)),
            Some(InputEvent::Key {
                key: "tab".into(),
                mods: MOD_SHIFT,
                text: None,
                repeat: false,
            })
        );
        assert_eq!(
            normalize_key(&press(KeyCode::F(5), KeyModifiers::SUPER)),
            Some(InputEvent::Key {
                key: "f5".into(),
                mods: MOD_SUPER,
                text: None,
                repeat: false,
            })
        );
        for (code, key) in [(KeyCode::Up, "arrow-up"), (KeyCode::Down, "arrow-down")] {
            for (modifiers, mods) in [
                (KeyModifiers::SHIFT, MOD_SHIFT),
                (KeyModifiers::CONTROL, MOD_CTRL),
            ] {
                assert_eq!(
                    normalize_key(&press(code, modifiers)),
                    Some(InputEvent::Key {
                        key: key.into(),
                        mods,
                        text: None,
                        repeat: false,
                    })
                );
            }
        }
        let mut repeated = press(KeyCode::Left, KeyModifiers::CONTROL);
        repeated.kind = KeyEventKind::Repeat;
        assert_eq!(
            normalize_key(&repeated),
            Some(InputEvent::Key {
                key: "arrow-left".into(),
                mods: MOD_CTRL,
                text: None,
                repeat: true,
            })
        );
        assert_eq!(
            normalize_key(&press(KeyCode::CapsLock, KeyModifiers::NONE)),
            None
        );
        assert_eq!(
            normalize_key(&press(KeyCode::F(30), KeyModifiers::NONE)),
            None
        );
        assert_eq!(
            normalize_key(&press(KeyCode::Char('\u{3}'), KeyModifiers::NONE)),
            None
        );
    }

    #[test]
    fn mouse_events_drop_the_strip_row_and_name_buttons() {
        assert_eq!(
            normalize_mouse(
                MouseEventKind::Down(MouseButton::Right),
                4,
                3,
                KeyModifiers::SHIFT
            ),
            Some(InputEvent::Mouse {
                action: MouseEventAction::Press,
                button: Some(2),
                mods: MOD_SHIFT,
                column: 4,
                row: 2,
            })
        );
        assert_eq!(
            normalize_mouse(MouseEventKind::Moved, 1, 1, KeyModifiers::NONE),
            Some(InputEvent::Mouse {
                action: MouseEventAction::Motion,
                button: None,
                mods: 0,
                column: 1,
                row: 0,
            })
        );
        assert_eq!(
            normalize_mouse(MouseEventKind::ScrollDown, 1, 5, KeyModifiers::NONE),
            Some(InputEvent::Mouse {
                action: MouseEventAction::ScrollDown,
                button: None,
                mods: 0,
                column: 1,
                row: 4,
            })
        );
        assert_eq!(
            normalize_mouse(
                MouseEventKind::Down(MouseButton::Left),
                1,
                0,
                KeyModifiers::NONE
            ),
            None
        );
        assert_eq!(
            normalize_mouse(MouseEventKind::ScrollLeft, 1, 2, KeyModifiers::NONE),
            None
        );
    }

    #[test]
    fn chord_identity_and_resets_follow_the_clear_exit_contract() {
        let ctrl_c = normalize_key(&press(KeyCode::Char('c'), KeyModifiers::CONTROL)).unwrap();
        assert!(is_ctrl_c_event(&ctrl_c));
        assert!(!resets_chord(&ctrl_c));
        let other = normalize_key(&press(KeyCode::Char('x'), KeyModifiers::NONE)).unwrap();
        assert!(resets_chord(&other));
        assert!(resets_chord(
            &normalize_mouse(
                MouseEventKind::Down(MouseButton::Left),
                1,
                1,
                KeyModifiers::NONE
            )
            .unwrap()
        ));
        assert!(!resets_chord(
            &normalize_mouse(MouseEventKind::Moved, 1, 1, KeyModifiers::NONE).unwrap()
        ));
        assert!(!resets_chord(&InputEvent::Focus { gained: true }));
    }

    #[test]
    fn outer_effects_are_encoded_once_and_exactly() {
        assert_eq!(
            osc52(ClipboardLocation::Standard, b"fixture"),
            b"\x1b]52;c;Zml4dHVyZQ==\x07"
        );
        assert_eq!(osc52(ClipboardLocation::Primary, b""), b"\x1b]52;p;\x07");
        assert_eq!(cursor_style_sequence("bar", false), b"\x1b[6 q");
        assert_eq!(cursor_style_sequence("underline", true), b"\x1b[3 q");
        assert_eq!(cursor_style_sequence("block-hollow", false), b"\x1b[2 q");
        assert_eq!(RESET_CURSOR_STYLE, b"\x1b[0 q");
    }

    #[test]
    fn channel_prefers_semantic_frames_and_falls_back_without_losing_the_event() {
        let mut channel = InputChannel::new(true);
        let event = plain_key("a");
        let Some(Outgoing::Semantic(first)) = channel.outgoing(Some(event.clone()), b"a".to_vec())
        else {
            panic!("semantic frame expected");
        };
        assert_eq!(first.seq, 1);
        assert_eq!(first.event, event);
        let replay = channel.fall_back().expect("byte form retained");
        assert_eq!(replay.bytes, b"a");
        assert!(!channel.semantic);
        assert!(channel.fall_back().is_none());
        assert_eq!(
            channel.outgoing(Some(plain_key("b")), b"b".to_vec()),
            Some(Outgoing::Legacy(Input {
                bytes: b"b".to_vec(),
                paste: false,
                epoch: 0,
            }))
        );
        assert_eq!(channel.outgoing(Some(plain_key("b")), Vec::new()), None);
        let mut legacy_only = InputChannel::new(false);
        assert!(matches!(
            legacy_only.outgoing(None, b"\x1b[I".to_vec()),
            Some(Outgoing::Legacy(_))
        ));
    }
}
