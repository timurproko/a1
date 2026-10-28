//! Draws the command palette as a centered overlay box in the owned list style: an accent title,
//! a `> ` search row, the filtered entries with the selected one on the accent's selection
//! background, and a key hint.

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

use crate::core::attach::{CommandPalette, PlusMenu, ShortcutLabels};
use crate::roles::shortcut_hints::{self, ShortcutHint, ShortcutHintRole};

const TITLE: &str = "Commands";
const HINTS: &[ShortcutHint<'static>] = &[
    ShortcutHint::new("type", "search"),
    ShortcutHint::new("↑↓", "navigate"),
    ShortcutHint::new("enter", "open"),
    ShortcutHint::new("esc", "close"),
];
const EMPTY: &str = "No commands match";
const PLUS_TITLE: &str = "Plus Menu";
const PLUS_DESCRIPTION: &str = "Choose what the + button in the tab bar can add.";
const PLUS_HINTS: &[ShortcutHint<'static>] = &[
    ShortcutHint::new("type", "search"),
    ShortcutHint::new("↑↓", "navigate"),
    ShortcutHint::new("space", "toggle"),
    ShortcutHint::new("esc", "close"),
];
const PLUS_EMPTY: &str = "No tabs match";
const MAX_WIDTH: usize = 60;
const PADDING: usize = 2;

/// The colors the palette paints with.
#[derive(Debug, Clone, Copy)]
pub struct PaletteStyle {
    pub truecolor: bool,
    /// The accent's selection background, as owned menus hover.
    pub hover: [u8; 3],
    pub accent: [u8; 3],
}

#[derive(Clone, Copy)]
enum Tone {
    Text,
    Muted,
    Accent,
    HintKey,
    HintAction,
    /// The search caret: a reversed white cell, as owned inputs draw it.
    Caret,
}

impl PaletteStyle {
    fn paint(self, tone: Tone, selected: bool, bold: bool) -> String {
        let weight = match (bold, tone) {
            (_, Tone::Caret) => ";7",
            (true, _) => ";1",
            (false, _) => "",
        };
        if self.truecolor {
            let [r, g, b] = match tone {
                Tone::Text | Tone::Caret => [255, 255, 255],
                Tone::Muted => [128, 128, 128],
                Tone::Accent => self.accent,
                Tone::HintKey => [126, 136, 142],
                Tone::HintAction => [157, 165, 169],
            };
            let [br, bg, bb] = if selected { self.hover } else { [38, 38, 38] };
            format!("\x1b[0;48;2;{br};{bg};{bb};38;2;{r};{g};{b}{weight}m")
        } else {
            let foreground = match tone {
                Tone::Text | Tone::Caret => 15,
                Tone::Muted | Tone::HintKey => 244,
                Tone::HintAction => 247,
                Tone::Accent => 141,
            };
            let background = if selected { 238 } else { 235 };
            format!("\x1b[0;48;5;{background};38;5;{foreground}{weight}m")
        }
    }
}

fn clip(value: &str, width: usize) -> (String, usize) {
    let mut output = String::new();
    let mut used = 0usize;
    for grapheme in value.graphemes(true) {
        let next = UnicodeWidthStr::width(grapheme);
        if used + next > width {
            break;
        }
        output.push_str(grapheme);
        used += next;
    }
    (output, used)
}

/// One box row: painted parts after the left padding, then the row's background to its end.
fn row(style: PaletteStyle, width: usize, selected: bool, parts: &[(Tone, bool, &str)]) -> String {
    let inner = width.saturating_sub(PADDING * 2);
    let mut output = style.paint(Tone::Text, false, false);
    output.push_str(&" ".repeat(PADDING.min(width)));
    output.push_str(&style.paint(Tone::Text, selected, false));
    let mut used = 0usize;
    for (tone, bold, text) in parts {
        let (text, cells) = clip(text, inner.saturating_sub(used));
        output.push_str(&style.paint(*tone, selected, *bold));
        output.push_str(&text);
        used += cells;
    }
    output.push_str(&style.paint(Tone::Text, selected, false));
    output.push_str(&" ".repeat(inner.saturating_sub(used)));
    output.push_str(&style.paint(Tone::Text, false, false));
    output.push_str(&" ".repeat(width.saturating_sub(inner + PADDING).min(PADDING)));
    output
}

/// One entry's row: the cursor, then a command and its shortcut right-aligned, or a plus-menu
/// kind with `●` when `+` offers it and `○` when not.
fn hint_row(style: PaletteStyle, width: usize, hints: &[ShortcutHint<'_>]) -> String {
    let inner = width.saturating_sub(PADDING * 2);
    let rendered = shortcut_hints::render(hints, inner, |role, text| {
        let tone = match role {
            ShortcutHintRole::Key => Tone::HintKey,
            ShortcutHintRole::Action => Tone::HintAction,
        };
        format!("{}{text}", style.paint(tone, false, false))
    });
    let mut output = style.paint(Tone::Text, false, false);
    output.push_str(&" ".repeat(PADDING.min(width)));
    output.push_str(&rendered.text);
    output.push_str(&style.paint(Tone::Text, false, false));
    output.push_str(&" ".repeat(inner.saturating_sub(rendered.cells)));
    output.push_str(&" ".repeat(width.saturating_sub(inner + PADDING).min(PADDING)));
    output
}

fn entry_row(
    style: PaletteStyle,
    width: usize,
    chosen: bool,
    label: &str,
    trailing: Result<String, bool>,
) -> String {
    let inner = width.saturating_sub(PADDING * 2);
    let cursor = if chosen { "→ " } else { "  " };
    match trailing {
        Ok(shortcut) => {
            let used =
                2 + UnicodeWidthStr::width(label) + UnicodeWidthStr::width(shortcut.as_str());
            let spacing = " ".repeat(inner.saturating_sub(used).max(1));
            let parts = [
                (Tone::Accent, false, cursor),
                (Tone::Text, false, label),
                (Tone::Text, false, spacing.as_str()),
                (Tone::Muted, false, shortcut.as_str()),
            ];
            row(style, width, chosen, &parts)
        }
        Err(enabled) => {
            let marker = if enabled { "● " } else { "○ " };
            let parts = [
                (Tone::Accent, false, cursor),
                (Tone::Text, false, marker),
                (Tone::Text, false, label),
            ];
            row(style, width, chosen, &parts)
        }
    }
}

/// The open list's overlay for an outer terminal of `columns` by `outer_rows`: the command
/// palette, or the plus-menu dialog marking the kinds `plus` holds.
pub fn render(
    palette: &CommandPalette,
    labels: &dyn ShortcutLabels,
    plus: PlusMenu,
    columns: u16,
    outer_rows: u16,
    style: PaletteStyle,
) -> String {
    let width = usize::from(columns).min(MAX_WIDTH);
    let configure = palette.is_plus_menu();
    let (title, description, hints, empty) = if configure {
        (PLUS_TITLE, PLUS_DESCRIPTION, PLUS_HINTS, PLUS_EMPTY)
    } else {
        (TITLE, "", HINTS, EMPTY)
    };
    let shown = palette.shown();
    let selected = palette.selected();
    let search = [
        (Tone::Accent, false, "> "),
        (Tone::Text, false, palette.filter.as_str()),
        (Tone::Caret, false, " "),
    ];
    let mut rows = vec![
        row(style, width, false, &[]),
        row(style, width, false, &[(Tone::Accent, true, title)]),
        row(style, width, false, &[(Tone::Muted, false, description)]),
    ];
    // Invariant: a description is followed by its own blank row before the search line.
    if !description.is_empty() {
        rows.push(row(style, width, false, &[]));
    }
    rows.push(row(style, width, false, &search));
    rows.push(row(style, width, false, &[]));
    // Invariant: the box keeps one row per entry, so filtering never moves its edges.
    for index in 0..palette.len() {
        rows.push(match shown.get(index) {
            Some((label, value)) => {
                let trailing = if configure {
                    Err(plus.enabled(value))
                } else {
                    Ok(labels.label(value))
                };
                entry_row(style, width, index == selected, label, trailing)
            }
            None if index == 0 => row(style, width, false, &[(Tone::Muted, false, empty)]),
            None => row(style, width, false, &[]),
        });
    }
    rows.push(row(style, width, false, &[]));
    rows.push(hint_row(style, width, hints));
    rows.push(row(style, width, false, &[]));

    let top = usize::from(outer_rows).saturating_sub(rows.len()) / 2;
    let left = usize::from(columns).saturating_sub(width) / 2;
    let mut output = String::from("\x1b[s");
    for (index, line) in rows.iter().enumerate() {
        let terminal_row = top + index + 1;
        if terminal_row > usize::from(outer_rows) {
            break;
        }
        output.push_str(&format!("\x1b[{terminal_row};{}H", left + 1));
        output.push_str(line);
    }
    output.push_str("\x1b[0m\x1b[u");
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Labels;

    impl ShortcutLabels for Labels {
        fn label(&self, action: &str) -> String {
            match action {
                "tabs.new" => "Alt+A".into(),
                "tabs.settings" => "Alt+,".into(),
                _ => String::new(),
            }
        }
    }

    const STYLE: PaletteStyle = PaletteStyle {
        truecolor: true,
        hover: [58, 56, 66],
        accent: [167, 152, 215],
    };

    /// The text of each positioned row, without its styles.
    fn plain(rendered: &str) -> Vec<String> {
        let mut rows = Vec::new();
        for part in rendered.split("\x1b[").skip(1) {
            let end = part
                .find(|value: char| value.is_ascii_alphabetic())
                .unwrap_or(part.len());
            if part[end..].starts_with('H') {
                rows.push(String::new());
            }
            if let Some(row) = rows.last_mut() {
                row.push_str(part.get(end + 1..).unwrap_or_default());
            }
        }
        rows
    }

    #[test]
    fn draws_a_centered_box_with_shortcuts_and_the_selected_row_on_the_hover_background() {
        let palette = CommandPalette::default();
        let rendered = render(&palette, &Labels, PlusMenu::default(), 80, 24, STYLE);
        assert!(rendered.starts_with("\x1b[s") && rendered.ends_with("\x1b[0m\x1b[u"));
        assert!(rendered.contains("\x1b[7;11H"), "the box is centered");
        let rows = plain(&rendered);
        assert_eq!(rows.len(), 11);
        assert!(
            rows.iter()
                .all(|row| UnicodeWidthStr::width(row.as_str()) == 60)
        );
        assert_eq!(rows[1].trim(), "Commands");
        assert_eq!(rows[3].trim(), ">");
        assert!(
            rendered.contains("38;2;255;255;255;7m "),
            "the caret is a reversed white cell"
        );
        assert!(rows[5].trim_start().starts_with("→ Agent"));
        assert!(rows[5].trim_end().ends_with("Alt+A"));
        assert!(rows[6].trim_end().ends_with("Alt+,"));
        assert_eq!(rows[7].trim(), "Changelog");
        assert_eq!(
            rows[9].trim(),
            "Type search  ↑↓ navigate  Enter open  Esc close"
        );
        assert!(rendered.contains("48;2;58;56;66"));
        assert!(rendered.contains("38;2;126;136;142mType"));
        assert!(rendered.contains("38;2;157;165;169msearch"));
        assert!(!rows[9].contains('·'));
    }

    #[test]
    fn the_plus_menu_dialog_marks_the_kinds_plus_offers() {
        let dialog = CommandPalette::plus_menu();
        let plus = PlusMenu::from_setting(Some("agent,changelog"));
        let rows = plain(&render(&dialog, &Labels, plus, 80, 24, STYLE));
        assert_eq!(rows.len(), 12);
        assert_eq!(rows[1].trim(), PLUS_TITLE);
        assert_eq!(rows[2].trim(), PLUS_DESCRIPTION);
        assert_eq!(rows[3].trim(), "", "a blank row follows the description");
        assert_eq!(rows[4].trim(), ">");
        assert_eq!(rows[6].trim(), "→ ● Agent");
        assert_eq!(rows[7].trim(), "○ Settings");
        assert_eq!(rows[8].trim(), "● Changelog");
        assert_eq!(
            rows[10].trim(),
            "Type search  ↑↓ navigate  Space toggle  Esc close"
        );
        assert!(
            !rows.iter().any(|row| row.contains("Alt+")),
            "kinds show no shortcuts"
        );
    }

    #[test]
    fn a_filter_that_matches_nothing_keeps_the_box_and_names_it() {
        let mut palette = CommandPalette::default();
        palette.insert("zz");
        let rows = plain(&render(
            &palette,
            &Labels,
            PlusMenu::default(),
            30,
            12,
            STYLE,
        ));
        assert_eq!(rows.len(), 11);
        assert!(
            rows.iter()
                .all(|row| UnicodeWidthStr::width(row.as_str()) == 30)
        );
        assert_eq!(rows[3].trim(), "> zz");
        assert_eq!(rows[5].trim(), EMPTY);
        let palette_mode = PaletteStyle {
            truecolor: false,
            ..STYLE
        };
        let rendered = render(
            &CommandPalette::default(),
            &Labels,
            PlusMenu::default(),
            80,
            24,
            palette_mode,
        );
        assert!(rendered.contains("48;5;238") && !rendered.contains("48;2;"));
        assert!(rendered.contains("48;5;235;38;5;244mType"));
        assert!(rendered.contains("48;5;235;38;5;247msearch"));
    }
}
