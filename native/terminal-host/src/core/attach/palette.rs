//! The attach client's modal lists: the command palette, whose entries run their shortcut actions,
//! and the plus-menu dialog, whose entries toggle the tab kinds `+` offers. Both filter by typed
//! text and move with Up and Down.

use super::{AttachKey, KeyCode};

/// The command palette's entries in order: each label and the shortcut action that runs it.
pub const PALETTE_ENTRIES: [(&str, &str); 3] = [
    ("Agent", "tabs.new"),
    ("Settings", "tabs.settings"),
    ("Changelog", "tabs.changelog"),
];

/// The plus-menu dialog's entries in kind order: each extra kind's label and its
/// `tabBarPlusMenu` key. Agent is always offered, so it is not listed.
pub const PLUS_MENU_ENTRIES: [(&str, &str); 1] = [("Settings", "settings")];

/// What one key did to an open list.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteKey {
    Close,
    /// Runs the selected entry's shortcut action and closes the palette.
    Run(&'static str),
    /// Toggles the selected plus-menu kind; the dialog stays open.
    Toggle(&'static str),
    Changed,
    Ignored,
}

/// An open modal list: its entries, filter, and the row in hand.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandPalette {
    entries: &'static [(&'static str, &'static str)],
    pub filter: String,
    selected: usize,
}

impl Default for CommandPalette {
    fn default() -> Self {
        Self::commands()
    }
}

impl CommandPalette {
    pub fn commands() -> Self {
        Self {
            entries: &PALETTE_ENTRIES,
            filter: String::new(),
            selected: 0,
        }
    }

    /// The plus-menu dialog, where `Space` toggles a kind instead of typing.
    pub fn plus_menu() -> Self {
        Self {
            entries: &PLUS_MENU_ENTRIES,
            ..Self::commands()
        }
    }

    pub fn is_plus_menu(&self) -> bool {
        std::ptr::eq(self.entries, &PLUS_MENU_ENTRIES)
    }

    /// How many entries the list holds before filtering.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// The entries the filter keeps, in entry order.
    pub fn shown(&self) -> Vec<(&'static str, &'static str)> {
        let needle = self.filter.trim().to_lowercase();
        self.entries
            .iter()
            .copied()
            .filter(|(label, _)| label.to_lowercase().contains(&needle))
            .collect()
    }

    /// The selected row among the shown entries.
    pub fn selected(&self) -> usize {
        self.selected.min(self.shown().len().saturating_sub(1))
    }

    pub fn key(&mut self, key: AttachKey) -> PaletteKey {
        let shown = self.shown();
        let chosen = shown.get(self.selected()).map(|(_, value)| *value);
        match key.code {
            KeyCode::Esc => PaletteKey::Close,
            KeyCode::Char(' ') if self.is_plus_menu() => {
                chosen.map_or(PaletteKey::Ignored, PaletteKey::Toggle)
            }
            KeyCode::Enter if !self.is_plus_menu() => {
                chosen.map_or(PaletteKey::Ignored, PaletteKey::Run)
            }
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

    #[test]
    fn the_plus_menu_toggles_with_space_and_ignores_enter() {
        let mut dialog = CommandPalette::plus_menu();
        assert!(dialog.is_plus_menu() && !CommandPalette::commands().is_plus_menu());
        assert_eq!(
            dialog.len(),
            1,
            "Agent is always offered, so only Settings is listed"
        );
        assert_eq!(
            dialog.key(key(KeyCode::Char(' '))),
            PaletteKey::Toggle("settings")
        );
        assert_eq!(dialog.key(key(KeyCode::Enter)), PaletteKey::Ignored);
        for value in "set".chars() {
            dialog.key(key(KeyCode::Char(value)));
        }
        assert_eq!(dialog.shown(), [("Settings", "settings")]);
        assert_eq!(
            dialog.key(key(KeyCode::Char(' '))),
            PaletteKey::Toggle("settings")
        );
        assert_eq!(dialog.filter, "set", "Space toggles instead of typing");
        assert_eq!(dialog.key(key(KeyCode::Esc)), PaletteKey::Close);
    }
}
