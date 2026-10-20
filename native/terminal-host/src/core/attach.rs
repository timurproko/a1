//! Sans-IO input and strip values for the resident attach client. The attach role converts
//! terminal events and rendered strip frames into these, so attach interaction state can be
//! driven without a terminal.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyCode {
    Char(char),
    F(u8),
    Enter,
    Tab,
    BackTab,
    Backspace,
    Esc,
    Delete,
    Insert,
    Up,
    Down,
    Left,
    Right,
    Home,
    End,
    PageUp,
    PageDown,
    Other,
}

/// `other` records any modifier beyond shift, control, and alt (super, hyper, meta), so a
/// binding that requires no modifiers still refuses those chords.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Modifiers {
    pub shift: bool,
    pub control: bool,
    pub alt: bool,
    pub other: bool,
}

impl Modifiers {
    pub const NONE: Self = Self {
        shift: false,
        control: false,
        alt: false,
        other: false,
    };

    pub fn is_empty(self) -> bool {
        self == Self::NONE
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyKind {
    Press,
    Repeat,
    Release,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttachKey {
    pub code: KeyCode,
    pub modifiers: Modifiers,
    pub kind: KeyKind,
}

impl AttachKey {
    pub fn pressed(self) -> bool {
        matches!(self.kind, KeyKind::Press | KeyKind::Repeat)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MouseKind {
    Down(MouseButton),
    Up(MouseButton),
    Drag(MouseButton),
    Moved,
    ScrollDown,
    ScrollUp,
    ScrollLeft,
    ScrollRight,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttachMouse {
    pub kind: MouseKind,
    pub column: u16,
    pub row: u16,
    pub modifiers: Modifiers,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StripHitKind {
    View(String),
    Overflow,
    New,
}

/// The interactive part of a rendered strip: column ranges `[start, end)` and the tabs that did
/// not fit.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct StripSnapshot {
    pub hits: Vec<(u16, u16, StripHitKind)>,
    pub hidden_tabs: Vec<String>,
}

impl StripSnapshot {
    pub fn hit(&self, column: u16) -> Option<&StripHitKind> {
        self.hits
            .iter()
            .find(|(start, end, _)| column >= *start && column < *end)
            .map(|(_, _, hit)| hit)
    }
}

/// A registry tab as the attach client presents it, without the strip's animation clock.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AttachTab {
    pub id: String,
    pub name: String,
    pub name_source: String,
    pub status: String,
    pub accent: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_hit_uses_half_open_ranges() {
        let snapshot = StripSnapshot {
            hits: vec![
                (0, 4, StripHitKind::View("a".into())),
                (4, 6, StripHitKind::New),
            ],
            hidden_tabs: Vec::new(),
        };
        assert_eq!(snapshot.hit(0), Some(&StripHitKind::View("a".into())));
        assert_eq!(snapshot.hit(3), Some(&StripHitKind::View("a".into())));
        assert_eq!(snapshot.hit(4), Some(&StripHitKind::New));
        assert_eq!(snapshot.hit(6), None);
    }

    #[test]
    fn modifiers_and_key_kind_predicates() {
        assert!(Modifiers::NONE.is_empty());
        assert!(
            !Modifiers {
                other: true,
                ..Modifiers::NONE
            }
            .is_empty()
        );
        let key = |kind| AttachKey {
            code: KeyCode::Enter,
            modifiers: Modifiers::NONE,
            kind,
        };
        assert!(key(KeyKind::Press).pressed());
        assert!(key(KeyKind::Repeat).pressed());
        assert!(!key(KeyKind::Release).pressed());
    }
}
