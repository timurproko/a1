//! The attach client's modal lists: commands plus configurable tab-bar controls.

use super::{AttachKey, KeyCode, TabKind};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConfigureKind {
    Plus,
    Right,
}

/// What one key did to an open list.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaletteKey {
    Close,
    Run(&'static str),
    Toggle(&'static str),
    Changed,
    Ignored,
}

/// An open modal list: its entries, filter, and the row in hand.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommandPalette {
    configure: Option<ConfigureKind>,
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
            configure: None,
            filter: String::new(),
            selected: 0,
        }
    }

    /// The plus-menu dialog, where Space toggles a kind instead of typing.
    pub fn plus_menu() -> Self {
        Self {
            configure: Some(ConfigureKind::Plus),
            ..Self::commands()
        }
    }

    /// The Right Side dialog, where Space toggles Version and Time.
    pub fn right_side() -> Self {
        Self {
            configure: Some(ConfigureKind::Right),
            ..Self::commands()
        }
    }

    pub fn configure_kind(&self) -> Option<ConfigureKind> {
        self.configure
    }
    pub fn is_plus_menu(&self) -> bool {
        self.configure == Some(ConfigureKind::Plus)
    }

    /// How many provider entries the list holds before filtering.
    pub fn len(&self) -> usize {
        match self.configure {
            Some(ConfigureKind::Right) => 2,
            _ => TabKind::ALL.len(),
        }
    }

    /// The entries the filter keeps, in provider order.
    pub fn shown(&self) -> Vec<(&'static str, &'static str)> {
        let needle = self.filter.trim().to_lowercase();
        let entries: Vec<(&'static str, &'static str)> = match self.configure {
            Some(ConfigureKind::Right) => vec![("Version", "version"), ("Time", "time")],
            Some(ConfigureKind::Plus) => TabKind::ALL
                .into_iter()
                .map(|kind| (kind.label(), kind.name()))
                .collect(),
            None => TabKind::ALL
            .into_iter()
                .map(|kind| (kind.label(), kind.action()))
                .collect(),
                };
        entries
            .into_iter()
            .filter(|(label, _)| label.to_lowercase().contains(&needle))
            .collect()
    }

    pub fn selected(&self) -> usize {
        self.selected.min(self.shown().len().saturating_sub(1))
    }

    pub fn key(&mut self, key: AttachKey) -> PaletteKey {
        let shown = self.shown();
        let chosen = shown.get(self.selected()).map(|(_, value)| *value);
        match key.code {
            KeyCode::Esc => PaletteKey::Close,
            KeyCode::Char(' ') if self.configure.is_some() => {
                chosen.map_or(PaletteKey::Ignored, PaletteKey::Toggle)
            }
            KeyCode::Enter if self.configure.is_none() => {
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
        palette.key(key(KeyCode::Down));
        palette.key(key(KeyCode::Down));
        assert_eq!(
            palette.key(key(KeyCode::Enter)),
            PaletteKey::Run("tabs.changelog")
        );
        palette.insert("set");
        assert_eq!(palette.shown(), [("Settings", "tabs.settings")]);
        assert_eq!(palette.key(key(KeyCode::Esc)), PaletteKey::Close);
    }

    #[test]
    fn configurable_palettes_toggle_their_ordered_entries() {
        let mut plus = CommandPalette::plus_menu();
        assert_eq!(
            plus.key(key(KeyCode::Char(' '))),
            PaletteKey::Toggle("agent")
        );
        let mut right = CommandPalette::right_side();
        assert_eq!(right.configure_kind(), Some(ConfigureKind::Right));
        assert_eq!(right.shown(), [("Version", "version"), ("Time", "time")]);
        assert_eq!(
            right.key(key(KeyCode::Char(' '))),
            PaletteKey::Toggle("version")
        );
        right.key(key(KeyCode::Down));
        assert_eq!(
            right.key(key(KeyCode::Char(' '))),
            PaletteKey::Toggle("time")
        );
    }
}
