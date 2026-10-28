//! Shared semantic shortcut hints for native-owned dialogs.
//!
//! Callers declare ordered key/action entries and supply their presentation roles. This component
//! owns display key casing, entry spacing, visible-width clipping, and complete style boundaries.

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

/// One semantic dialog shortcut: a quiet key label followed by its action description.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ShortcutHint<'a> {
    pub key: &'a str,
    pub action: &'a str,
}

impl<'a> ShortcutHint<'a> {
    pub const fn new(key: &'a str, action: &'a str) -> Self {
        Self { key, action }
    }
}

/// The semantic role a native dialog maps to its own color implementation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShortcutHintRole {
    Key,
    Action,
}

/// Styled shortcut content and its terminal-cell width.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RenderedShortcutHints {
    pub text: String,
    pub cells: usize,
}

/// Renders ordered hints with one key/action space and exactly two cells between entries.
pub fn render(
    entries: &[ShortcutHint<'_>],
    width: usize,
    mut paint: impl FnMut(ShortcutHintRole, &str) -> String,
) -> RenderedShortcutHints {
    let mut output = String::new();
    let mut cells = 0usize;
    let mut rendered_entries = 0usize;

    for entry in entries {
        if entry.key.trim().is_empty() || entry.action.trim().is_empty() {
            continue;
        }
        if rendered_entries > 0 && !append_plain(&mut output, &mut cells, width, "  ") {
            break;
        }
        let key = display_key_label(entry.key);
        if !append_role(
            &mut output,
            &mut cells,
            width,
            ShortcutHintRole::Key,
            &key,
            &mut paint,
        ) {
            break;
        }
        if !append_plain(&mut output, &mut cells, width, " ") {
            break;
        }
        if !append_role(
            &mut output,
            &mut cells,
            width,
            ShortcutHintRole::Action,
            entry.action,
            &mut paint,
        ) {
            break;
        }
        rendered_entries += 1;
    }

    RenderedShortcutHints {
        text: output,
        cells,
    }
}

fn append_role(
    output: &mut String,
    cells: &mut usize,
    width: usize,
    role: ShortcutHintRole,
    value: &str,
    paint: &mut impl FnMut(ShortcutHintRole, &str) -> String,
) -> bool {
    let (clipped, used, complete) = clip(value, width.saturating_sub(*cells));
    if !clipped.is_empty() {
        output.push_str(&paint(role, &clipped));
        *cells += used;
    }
    complete
}

fn append_plain(output: &mut String, cells: &mut usize, width: usize, value: &str) -> bool {
    let (clipped, used, complete) = clip(value, width.saturating_sub(*cells));
    output.push_str(&clipped);
    *cells += used;
    complete
}

fn clip(value: &str, width: usize) -> (String, usize, bool) {
    let mut output = String::new();
    let mut used = 0usize;
    let mut complete = true;
    for grapheme in value.graphemes(true) {
        let next = UnicodeWidthStr::width(grapheme);
        if used + next > width {
            complete = false;
            break;
        }
        output.push_str(grapheme);
        used += next;
    }
    (output, used, complete)
}

fn display_key_label(value: &str) -> String {
    value
        .split('/')
        .map(|alternative| {
            alternative
                .split('+')
                .map(display_key_part)
                .collect::<Vec<_>>()
                .join("+")
        })
        .collect::<Vec<_>>()
        .join("/")
}

fn display_key_part(value: &str) -> String {
    let lower = value.to_ascii_lowercase();
    let named = match lower.as_str() {
        "alt" => Some("Alt"),
        "backspace" => Some("Backspace"),
        "cmd" => Some("Cmd"),
        "ctrl" => Some("Ctrl"),
        "delete" => Some("Delete"),
        "down" => Some("Down"),
        "end" => Some("End"),
        "enter" => Some("Enter"),
        "esc" => Some("Esc"),
        "escape" => Some("Escape"),
        "home" => Some("Home"),
        "insert" => Some("Insert"),
        "left" => Some("Left"),
        "meta" => Some("Meta"),
        "option" => Some("Option"),
        "pagedown" => Some("PageDown"),
        "pageup" => Some("PageUp"),
        "pgdn" => Some("PgDn"),
        "pgup" => Some("PgUp"),
        "return" => Some("Return"),
        "right" => Some("Right"),
        "shift" => Some("Shift"),
        "space" => Some("Space"),
        "tab" => Some("Tab"),
        "type" => Some("Type"),
        "up" => Some("Up"),
        _ => None,
    };
    if let Some(named) = named {
        return named.to_owned();
    }
    let mut characters = value.chars();
    match (characters.next(), characters.next()) {
        (Some(character), None) if character.is_alphabetic() => character.to_uppercase().collect(),
        _ => value.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const HINTS: &[ShortcutHint<'static>] = &[
        ShortcutHint::new("type", "search"),
        ShortcutHint::new("↑↓", "navigate"),
        ShortcutHint::new("enter", "open"),
        ShortcutHint::new("esc", "close"),
    ];

    #[test]
    fn renders_semantic_entries_with_shared_casing_and_spacing() {
        let rendered = render(HINTS, 80, |role, text| match role {
            ShortcutHintRole::Key => format!("<key>{text}</key>"),
            ShortcutHintRole::Action => format!("<action>{text}</action>"),
        });
        assert_eq!(rendered.cells, 47);
        assert_eq!(
            rendered.text,
            "<key>Type</key> <action>search</action>  <key>↑↓</key> <action>navigate</action>  <key>Enter</key> <action>open</action>  <key>Esc</key> <action>close</action>"
        );
        assert!(!rendered.text.contains('·'));
    }

    #[test]
    fn clips_by_terminal_cells_without_splitting_graphemes_or_style_boundaries() {
        let rendered = render(&[ShortcutHint::new("界", "search")], 5, |role, text| {
            format!("<{role:?}>{text}</{role:?}>")
        });
        assert_eq!(rendered.cells, 5);
        assert_eq!(rendered.text, "<Key>界</Key> <Action>se</Action>");
    }
}
