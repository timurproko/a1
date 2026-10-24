//! The command palette: every tab kind, filtered by typed text, run through its shortcut action.

use super::{AttachKey, KeyCode};

/// The palette's entries in order: each label and the shortcut action that runs it.
pub const PALETTE_ENTRIES: [(&str, &str); 3] = [
    ("Agent session", "tabs.new"),
    ("Settings", "tabs.settings"),
    ("Changelog", "tabs.changelog"),
];

/// What one key did to the open palette.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteKey {
    Close,
    /// Runs the selected entry's shortcut action and closes the palette.
    Run(&'static str),
    Changed,
    Ignored,
}

/// The open palette's filter and the row in hand.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct CommandPalette {
    pub filter: String,
    selected: usize,
}

impl CommandPalette {
    /// The entries the filter keeps, in entry order.
    pub fn shown(&self) -> Vec<(&'static str, &'static str)> {
        let needle = self.filter.trim().to_lowercase();
        PALETTE_ENTRIES
            .into_iter()
            .filter(|(label, _)| label.to_lowercase().contains(&needle))
            .collect()
    }

    /// The selected row among the shown entries.
    pub fn selected(&self) -> usize {
        self.selected.min(self.shown().len().saturating_sub(1))
    }

    pub fn key(&mut self, key: AttachKey) -> PaletteKey {
        let shown = self.shown();
        match key.code {
            KeyCode::Esc => PaletteKey::Close,
            KeyCode::Enter => shown
                .get(self.selected())
                .map_or(PaletteKey::Ignored, |(_, action)| PaletteKey::Run(action)),
            KeyCode::Up => {
                self.selected = self.selected().saturating_sub(1);
                PaletteKey::Changed
            }
            KeyCode::Down => {
                self.selected = (self.selected() + 1).min(shown.len().saturating_sub(1));
                PaletteKey::Changed
            }
            KeyCode::Backspace => {
                self.filter.pop();
                self.selected = 0;
                PaletteKey::Changed
            }
            KeyCode::Char(value) if !key.modifiers.control && !key.modifiers.alt => {
                self.insert(&value.to_string());
                PaletteKey::Changed
            }
            _ => PaletteKey::Ignored,
        }
    }

    /// Appends typed or pasted text to the filter, without control characters.
    pub fn insert(&mut self, text: &str) {
        self.filter
            .extend(text.chars().filter(|value| !value.is_control()));
        self.selected = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::attach::{KeyKind, Modifiers};

    fn key(code: KeyCode) -> AttachKey {
        AttachKey {
            code,
            modifiers: Modifiers::NONE,
            kind: KeyKind::Press,
        }
    }

    #[test]
    fn moves_filters_and_runs_the_selected_entry() {
        let mut palette = CommandPalette::default();
        assert_eq!(palette.shown().len(), 3);
        assert_eq!(palette.key(key(KeyCode::Up)), PaletteKey::Changed);
        assert_eq!(palette.selected(), 0, "Up stops at the first entry");
        palette.key(key(KeyCode::Down));
        palette.key(key(KeyCode::Down));
        palette.key(key(KeyCode::Down));
        assert_eq!(palette.selected(), 2, "Down stops at the last entry");
        assert_eq!(
            palette.key(key(KeyCode::Enter)),
            PaletteKey::Run("tabs.changelog")
        );
        for value in "SET".chars() {
            palette.key(key(KeyCode::Char(value)));
        }
        assert_eq!(palette.shown(), [("Settings", "tabs.settings")]);
        assert_eq!(palette.selected(), 0);
        palette.insert("z\u{7}");
        assert_eq!(palette.filter, "SETz");
        assert!(palette.shown().is_empty());
        assert_eq!(palette.key(key(KeyCode::Enter)), PaletteKey::Ignored);
        assert_eq!(palette.key(key(KeyCode::Backspace)), PaletteKey::Changed);
        assert_eq!(palette.shown().len(), 1);
        let alt = AttachKey {
            modifiers: Modifiers {
                alt: true,
                ..Modifiers::NONE
            },
            ..key(KeyCode::Char('x'))
        };
        assert_eq!(palette.key(alt), PaletteKey::Ignored);
        assert_eq!(palette.key(key(KeyCode::Esc)), PaletteKey::Close);
    }
}
