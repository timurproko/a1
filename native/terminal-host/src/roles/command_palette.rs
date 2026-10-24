//! Draws the command palette as a centered overlay box in the owned list style: an accent title,
//! a `> ` search row, the filtered entries with the selected one on the accent's selection
//! background, and a key hint.

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

use crate::core::attach::{CommandPalette, PALETTE_ENTRIES, ShortcutLabels};

const TITLE: &str = "Commands";
const HINT: &str = "Type search · ↑↓ navigate · Enter open · Esc close";
const EMPTY: &str = "No commands match";
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
}

impl PaletteStyle {
    fn paint(self, tone: Tone, selected: bool, bold: bool) -> String {
        let weight = if bold { ";1" } else { "" };
        if self.truecolor {
            let [r, g, b] = match tone {
                Tone::Text => [255, 255, 255],
                Tone::Muted => [128, 128, 128],
                Tone::Accent => self.accent,
            };
            let [br, bg, bb] = if selected { self.hover } else { [38, 38, 38] };
            format!("\x1b[0;48;2;{br};{bg};{bb};38;2;{r};{g};{b}{weight}m")
        } else {
            let foreground = match tone {
                Tone::Text => 15,
                Tone::Muted => 244,
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

/// The palette overlay for an outer terminal of `columns` by `outer_rows`.
pub fn render(
    palette: &CommandPalette,
    labels: &dyn ShortcutLabels,
    columns: u16,
    outer_rows: u16,
    style: PaletteStyle,
) -> String {
    let width = usize::from(columns).min(MAX_WIDTH);
    let inner = width.saturating_sub(PADDING * 2);
    let shown = palette.shown();
    let selected = palette.selected();
    let mut rows = vec![
        row(style, width, false, &[]),
        row(style, width, false, &[(Tone::Accent, true, TITLE)]),
        row(style, width, false, &[]),
        row(
            style,
            width,
            false,
            &[
                (Tone::Accent, false, "> "),
                (Tone::Text, false, &palette.filter),
                (Tone::Accent, false, "▏"),
            ],
        ),
        row(style, width, false, &[]),
    ];
    // Invariant: the box keeps one row per entry, so filtering never moves its edges.
    for index in 0..PALETTE_ENTRIES.len() {
        let line = match shown.get(index) {
            Some((label, action)) => {
                let chosen = index == selected;
                let marker = if chosen { "→ " } else { "  " };
                let shortcut = labels.label(action);
                let label_cells = 2 + UnicodeWidthStr::width(*label);
                let gap = inner
                    .saturating_sub(label_cells + UnicodeWidthStr::width(shortcut.as_str()))
                    .max(1);
                let spacing = " ".repeat(gap);
                row(
                    style,
                    width,
                    chosen,
                    &[
                        (Tone::Accent, false, marker),
                        (Tone::Text, false, label),
                        (Tone::Text, false, &spacing),
                        (Tone::Muted, false, &shortcut),
                    ],
                )
            }
            None if index == 0 => row(style, width, false, &[(Tone::Muted, false, EMPTY)]),
            None => row(style, width, false, &[]),
        };
        rows.push(line);
    }
    rows.push(row(style, width, false, &[]));
    rows.push(row(style, width, false, &[(Tone::Muted, false, HINT)]));
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
        let rendered = render(&palette, &Labels, 80, 24, STYLE);
        assert!(rendered.starts_with("\x1b[s") && rendered.ends_with("\x1b[0m\x1b[u"));
        assert!(rendered.contains("\x1b[7;11H"), "the box is centered");
        let rows = plain(&rendered);
        assert_eq!(rows.len(), 11);
        assert!(
            rows.iter()
                .all(|row| UnicodeWidthStr::width(row.as_str()) == 60)
        );
        assert_eq!(rows[1].trim(), "Commands");
        assert_eq!(rows[3].trim(), "> ▏");
        assert!(rows[5].trim_start().starts_with("→ Agent session"));
        assert!(rows[5].trim_end().ends_with("Alt+A"));
        assert!(rows[6].trim_end().ends_with("Alt+,"));
        assert_eq!(rows[7].trim(), "Changelog");
        assert_eq!(rows[9].trim(), HINT);
        assert!(rendered.contains("48;2;58;56;66"));
    }

    #[test]
    fn a_filter_that_matches_nothing_keeps_the_box_and_names_it() {
        let mut palette = CommandPalette::default();
        palette.insert("zz");
        let rows = plain(&render(&palette, &Labels, 30, 12, STYLE));
        assert_eq!(rows.len(), 11);
        assert!(
            rows.iter()
                .all(|row| UnicodeWidthStr::width(row.as_str()) == 30)
        );
        assert_eq!(rows[3].trim(), "> zz▏");
        assert_eq!(rows[5].trim(), EMPTY);
        let palette_mode = PaletteStyle {
            truecolor: false,
            ..STYLE
        };
        let rendered = render(&CommandPalette::default(), &Labels, 80, 24, palette_mode);
        assert!(rendered.contains("48;5;238") && !rendered.contains("48;2;"));
    }
}
