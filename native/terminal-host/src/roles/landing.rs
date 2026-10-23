//! The a1 landing the attach client shows while it has no tab: the wordmark, one ruled prompt
//! box that mirrors the owned editor, the launch cwd, and the tab shortcuts that start work.
//! Rendering is pure; the attach role owns the editor state and presents the bytes as the
//! frame's body with the returned cursor.

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

use crate::protocol::SurfaceCursor;

/// Widest landing box, in cells, matching the owned editor's comfortable measure.
pub const LANDING_MAX_WIDTH: u16 = 72;
/// Most prompt rows the box shows before it scrolls to keep the cursor row visible.
pub const LANDING_MAX_ROWS: usize = 6;
pub const LANDING_PLACEHOLDER: &str = "Ask anything…";
const PROMPT_PREFIX: &str = "❯ ";
const WORDMARK: [&str; 3] = [" ▀▀▀▄ ▄█ ", "▄▀▀▀█  █ ", " ▀▀▀▀ ▀▀▀"];
const WORDMARK_TEXT: [&str; 3] = ["", "a1", ""];

/// The owned dark theme's `muted` and `dim` foregrounds.
const MUTED: [u8; 3] = [157, 165, 169];
const DIM: [u8; 3] = [126, 136, 142];
const TEXT: [u8; 3] = [230, 230, 230];

/// The accent and border foregrounds `derivePiAccentProjection(accent, "dark")` gives each A1
/// accent; `landing_accents.json` pins them and the TypeScript projection test checks that file.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AccentColors {
    pub accent: [u8; 3],
    pub border: [u8; 3],
}

pub const LANDING_ACCENTS: [(&str, AccentColors); 6] = [
    (
        "purple",
        AccentColors {
            accent: [167, 152, 215],
            border: [105, 115, 167],
        },
    ),
    (
        "blue",
        AccentColors {
            accent: [130, 160, 241],
            border: [116, 102, 197],
        },
    ),
    (
        "cyan",
        AccentColors {
            accent: [93, 179, 186],
            border: [74, 128, 146],
        },
    ),
    (
        "green",
        AccentColors {
            accent: [104, 183, 141],
            border: [75, 132, 120],
        },
    ),
    (
        "orange",
        AccentColors {
            accent: [231, 135, 83],
            border: [178, 89, 79],
        },
    ),
    (
        "pink",
        AccentColors {
            accent: [223, 122, 199],
            border: [150, 91, 171],
        },
    ),
];

/// The colors for a configured accent; an unknown or absent accent is the purple default.
pub fn accent_colors(accent: Option<&str>) -> AccentColors {
    LANDING_ACCENTS
        .iter()
        .find(|(name, _)| Some(*name) == accent)
        .unwrap_or(&LANDING_ACCENTS[0])
        .1
}

/// What one landing frame shows. `cursor` is the editor's grapheme cursor; `spinner` is the
/// progress frame shown in place of the prompt prefix while a seeded creation is pending.
#[derive(Debug, Clone)]
pub struct LandingInput<'a> {
    pub columns: u16,
    pub body_rows: u16,
    pub accent: Option<&'a str>,
    pub truecolor: bool,
    pub half_blocks: bool,
    pub cwd: &'a str,
    /// Key label and action for each bound shortcut, in display order.
    pub hints: &'a [(String, &'a str)],
    pub text: &'a str,
    pub cursor: usize,
    pub spinner: Option<&'a str>,
}

/// The landing body, addressed as child rows below a top strip, and its text cursor.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LandingFrame {
    pub bytes: Vec<u8>,
    pub cursor: Option<SurfaceCursor>,
}

/// Whether the terminal draws half-block glyphs as solid cells. Apple Terminal leaves seams
/// between them, so the wordmark falls back to plain text there.
pub fn half_blocks_supported() -> bool {
    std::env::var("TERM_PROGRAM").map_or(true, |program| program != "Apple_Terminal")
}

/// Shortens `cwd` for display, writing the home directory as `~`.
pub fn display_cwd(cwd: &str, home: Option<&str>) -> String {
    let Some(home) = home.filter(|home| !home.is_empty()) else {
        return cwd.to_owned();
    };
    let normalize = |value: &str| value.replace('\\', "/").trim_end_matches('/').to_owned();
    let (path, home) = (normalize(cwd), normalize(home));
    let insensitive = cfg!(windows);
    let matches = if insensitive {
        path.to_lowercase().starts_with(&home.to_lowercase())
    } else {
        path.starts_with(&home)
    };
    let rest = &path[home.len().min(path.len())..];
    if matches && (rest.is_empty() || rest.starts_with('/')) {
        format!("~{rest}")
    } else {
        cwd.to_owned()
    }
}

/// One visual row of the wrapped prompt, starting at grapheme `start`.
#[derive(Debug, Clone, PartialEq, Eq)]
struct WrappedRow {
    text: String,
    start: usize,
}

fn wrap(text: &str, width: usize) -> Vec<WrappedRow> {
    let width = width.max(1);
    let mut rows = vec![WrappedRow {
        text: String::new(),
        start: 0,
    }];
    let mut used = 0usize;
    for (index, grapheme) in text.graphemes(true).enumerate() {
        if grapheme == "\n" || grapheme == "\r\n" {
            rows.push(WrappedRow {
                text: String::new(),
                start: index + 1,
            });
            used = 0;
            continue;
        }
        let cells = UnicodeWidthStr::width(grapheme);
        if used > 0 && used + cells > width {
            rows.push(WrappedRow {
                text: String::new(),
                start: index,
            });
            used = 0;
        }
        if let Some(row) = rows.last_mut() {
            row.text.push_str(grapheme);
        }
        used += cells;
    }
    // Invariant: a cursor after a full last row sits at the start of the next row, not past
    // the box edge.
    if used >= width {
        rows.push(WrappedRow {
            text: String::new(),
            start: text.graphemes(true).count(),
        });
    }
    rows
}

/// The wrapped row and cell column of grapheme `cursor`.
fn cursor_cell(text: &str, rows: &[WrappedRow], cursor: usize) -> (usize, usize) {
    let row = rows
        .iter()
        .rposition(|row| row.start <= cursor)
        .unwrap_or(0);
    let graphemes = text.graphemes(true).collect::<Vec<_>>();
    let start = rows[row].start.min(graphemes.len());
    let end = cursor.min(graphemes.len()).max(start);
    let column = graphemes[start..end]
        .iter()
        .filter(|grapheme| **grapheme != "\n")
        .map(|grapheme| UnicodeWidthStr::width(*grapheme))
        .sum();
    (row, column)
}

fn clip(value: &str, width: usize) -> String {
    let mut output = String::new();
    let mut used = 0usize;
    for grapheme in value.graphemes(true) {
        let cells = UnicodeWidthStr::width(grapheme);
        if used + cells > width {
            break;
        }
        output.push_str(grapheme);
        used += cells;
    }
    output
}

/// Keeps the end of `value`, which names the working directory, within `width` cells.
fn clip_left(value: &str, width: usize) -> String {
    if UnicodeWidthStr::width(value) <= width {
        return value.to_owned();
    }
    if width == 0 {
        return String::new();
    }
    let graphemes = value.graphemes(true).collect::<Vec<_>>();
    let mut kept = Vec::new();
    let mut used = 1usize;
    for grapheme in graphemes.iter().rev() {
        let cells = UnicodeWidthStr::width(*grapheme);
        if used + cells > width {
            break;
        }
        kept.push(*grapheme);
        used += cells;
    }
    kept.reverse();
    format!("…{}", kept.concat())
}

/// The xterm 256-color index nearest to `rgb`, for terminals without direct color.
pub fn palette_index(rgb: [u8; 3]) -> u8 {
    let level = |value: u8| -> u8 {
        match value {
            0..=47 => 0,
            48..=114 => 1,
            _ => (value - 35) / 40,
        }
    };
    let steps = [0u8, 95, 135, 175, 215, 255];
    let cube = rgb.map(level);
    let cube_rgb = cube.map(|level| steps[usize::from(level)]);
    let average = (u16::from(rgb[0]) + u16::from(rgb[1]) + u16::from(rgb[2])) / 3;
    let gray_level = if average > 238 {
        23
    } else {
        (average.saturating_sub(3) / 10).min(23) as u8
    };
    let gray = 8 + 10 * gray_level;
    let distance = |candidate: [u8; 3]| -> u32 {
        rgb.iter()
            .zip(candidate)
            .map(|(left, right)| (i32::from(*left) - i32::from(right)).pow(2) as u32)
            .sum()
    };
    if distance([gray; 3]) < distance(cube_rgb) {
        232 + gray_level
    } else {
        16 + 36 * cube[0] + 6 * cube[1] + cube[2]
    }
}

fn foreground(rgb: [u8; 3], truecolor: bool) -> String {
    if truecolor {
        format!("\x1b[38;2;{};{};{}m", rgb[0], rgb[1], rgb[2])
    } else {
        format!("\x1b[38;5;{}m", palette_index(rgb))
    }
}

pub fn render(input: &LandingInput<'_>) -> LandingFrame {
    let columns = usize::from(input.columns);
    let body_rows = usize::from(input.body_rows);
    let width = if columns > 8 {
        (columns - 4).min(usize::from(LANDING_MAX_WIDTH))
    } else {
        columns
    };
    let left = columns.saturating_sub(width) / 2;
    let content_width = width.saturating_sub(2).max(1);
    let colors = accent_colors(input.accent);
    let fg = |rgb| foreground(rgb, input.truecolor);

    let wrapped = wrap(input.text, content_width);
    let (cursor_row, cursor_column) = cursor_cell(input.text, &wrapped, input.cursor);
    let ruled = body_rows >= 3;
    let content_rows = wrapped
        .len()
        .min(LANDING_MAX_ROWS)
        .min(if ruled { body_rows - 2 } else { body_rows })
        .max(1);
    let box_rows = content_rows + if ruled { 2 } else { 0 };
    let with_hints = box_rows + 1 <= body_rows;
    let with_wordmark = box_rows + 1 + 4 <= body_rows;
    let total = box_rows + usize::from(with_hints) + if with_wordmark { 4 } else { 0 };
    let top = body_rows.saturating_sub(total) / 2;

    let mut rows: Vec<Option<(usize, String)>> = vec![None; body_rows];
    let mut place = |row: usize, column: usize, content: String| {
        if let Some(slot) = rows.get_mut(row) {
            *slot = Some((column, content));
        }
    };
    let mut row = top;
    if with_wordmark {
        let lines = if input.half_blocks {
            WORDMARK
        } else {
            WORDMARK_TEXT
        };
        let wordmark_width = UnicodeWidthStr::width(WORDMARK[0]);
        for line in lines {
            if !line.is_empty() {
                let shown = clip(line, columns);
                let column = if input.half_blocks {
                    columns.saturating_sub(wordmark_width) / 2
                } else {
                    columns.saturating_sub(UnicodeWidthStr::width(line)) / 2
                };
                place(
                    row,
                    column,
                    format!("\x1b[1m{}{shown}\x1b[0m", fg(colors.accent)),
                );
            }
            row += 1;
        }
        row += 1;
    }
    let rule = format!("{}{}\x1b[0m", fg(colors.border), "─".repeat(width));
    if ruled {
        place(row, left, rule.clone());
        row += 1;
    }
    let first = cursor_row.saturating_sub(content_rows - 1);
    let mut cursor = None;
    for (offset, visual) in wrapped.iter().skip(first).take(content_rows).enumerate() {
        let index = first + offset;
        let prefix = if index != 0 {
            "  ".to_owned()
        } else if let Some(frame) = input.spinner {
            format!("{}{frame} \x1b[0m", fg(colors.accent))
        } else {
            format!("{}{PROMPT_PREFIX}\x1b[0m", fg(MUTED))
        };
        let body = if input.text.is_empty() {
            format!(
                "{}{}\x1b[0m",
                fg(DIM),
                clip(LANDING_PLACEHOLDER, content_width)
            )
        } else {
            let color = if input.spinner.is_some() { MUTED } else { TEXT };
            format!("{}{}\x1b[0m", fg(color), clip(&visual.text, content_width))
        };
        if index == cursor_row && input.spinner.is_none() {
            cursor = Some(SurfaceCursor {
                column: (left + 2 + cursor_column).min(columns.saturating_sub(1)) as u16,
                row: row as u16,
            });
        }
        place(row, left, format!("{prefix}{body}"));
        row += 1;
    }
    if ruled {
        place(row, left, rule);
        row += 1;
    }
    if with_hints {
        let hints = input
            .hints
            .iter()
            .filter(|(key, _)| !key.is_empty())
            .map(|(key, action)| (key.to_lowercase(), *action))
            .collect::<Vec<_>>();
        let separator = " · ";
        let hints_width = hints
            .iter()
            .map(|(key, action)| {
                UnicodeWidthStr::width(key.as_str()) + 1 + UnicodeWidthStr::width(*action)
            })
            .sum::<usize>()
            + UnicodeWidthStr::width(separator) * hints.len().saturating_sub(1);
        let show_hints = !hints.is_empty() && hints_width <= width;
        let cwd_room = if show_hints {
            width.saturating_sub(hints_width + 2)
        } else {
            width
        };
        let cwd = clip_left(input.cwd, cwd_room);
        let mut line = format!("{}{cwd}\x1b[0m", fg(MUTED));
        if show_hints {
            let gap = width - UnicodeWidthStr::width(cwd.as_str()) - hints_width;
            line.push_str(&" ".repeat(gap));
            for (index, (key, action)) in hints.iter().enumerate() {
                if index > 0 {
                    line.push_str(&format!("{}{separator}\x1b[0m", fg(DIM)));
                }
                line.push_str(&format!(
                    "{}{key}\x1b[0m {}{action}\x1b[0m",
                    fg(TEXT),
                    fg(MUTED)
                ));
            }
        }
        place(row, left, line);
    }

    let mut bytes = String::new();
    for (index, slot) in rows.iter().enumerate() {
        let terminal_row = index + 2;
        bytes.push_str(&format!("\x1b[{terminal_row};1H\x1b[0m\x1b[2K"));
        if let Some((column, content)) = slot {
            bytes.push_str(&format!("\x1b[{terminal_row};{}H{content}", column + 1));
        }
    }
    bytes.push_str("\x1b[0m");
    LandingFrame {
        bytes: bytes.into_bytes(),
        cursor,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Plays the landing bytes onto a cell grid of the body rows, ignoring styles.
    fn cells(frame: &LandingFrame, columns: u16, rows: u16) -> Vec<String> {
        let mut grid = vec![vec![" ".to_owned(); usize::from(columns)]; usize::from(rows)];
        let text = String::from_utf8(frame.bytes.clone()).unwrap();
        let (mut row, mut column) = (0usize, 0usize);
        let mut rest = text.as_str();
        while let Some(character) = rest.chars().next() {
            if let Some(sequence) = rest.strip_prefix("\x1b[") {
                let end = sequence
                    .find(|value: char| ('\x40'..='\x7e').contains(&value))
                    .unwrap();
                let (parameters, final_byte) = (&sequence[..end], &sequence[end..=end]);
                if final_byte == "H" {
                    let mut values = parameters.split(';');
                    row = values.next().unwrap().parse::<usize>().unwrap() - 2;
                    column = values.next().map_or(1, |value| value.parse().unwrap()) - 1;
                }
                rest = &sequence[end + 1..];
                continue;
            }
            let grapheme = rest.graphemes(true).next().unwrap();
            let cells = UnicodeWidthStr::width(grapheme).max(1);
            if row < grid.len() && column < grid[row].len() {
                grid[row][column] = grapheme.to_owned();
                for filler in 1..cells {
                    if column + filler < grid[row].len() {
                        grid[row][column + filler] = String::new();
                    }
                }
            }
            column += cells;
            rest = &rest[grapheme.len()..];
            let _ = character;
        }
        grid.into_iter()
            .map(|row| row.concat().trim_end().to_owned())
            .collect()
    }

    fn input<'a>(columns: u16, rows: u16, hints: &'a [(String, &'a str)]) -> LandingInput<'a> {
        LandingInput {
            columns,
            body_rows: rows,
            accent: None,
            truecolor: true,
            half_blocks: true,
            cwd: "~/src/a1",
            hints,
            text: "",
            cursor: 0,
            spinner: None,
        }
    }

    fn hints() -> Vec<(String, &'static str)> {
        vec![
            ("Alt+A".to_owned(), "new agent"),
            ("Alt+,".to_owned(), "settings"),
        ]
    }

    #[test]
    fn full_landing_centres_wordmark_box_cwd_and_hints_at_80x24() {
        let hints = hints();
        let frame = render(&input(80, 23, &hints));
        let grid = cells(&frame, 80, 23);
        assert_eq!(grid.len(), 23);
        let top = grid.iter().position(|row| !row.is_empty()).unwrap();
        assert_eq!(top, (23 - 9) / 2, "the nine landing rows are centred");
        assert_eq!(grid[top].trim(), WORDMARK[0].trim_end().trim_start());
        assert!(grid[top + 1].contains("▄▀▀▀█  █"));
        assert!(
            grid[top + 3].is_empty(),
            "one blank row follows the wordmark"
        );
        assert_eq!(grid[top + 4], format!("    {}", "─".repeat(72)));
        assert_eq!(grid[top + 5], format!("    ❯ {LANDING_PLACEHOLDER}"));
        assert_eq!(grid[top + 6], format!("    {}", "─".repeat(72)));
        assert!(grid[top + 7].starts_with("    ~/src/a1"));
        assert!(grid[top + 7].ends_with("alt+a new agent · alt+, settings"));
        assert_eq!(grid[top + 7].chars().count(), 76);
        assert_eq!(
            frame.cursor,
            Some(SurfaceCursor {
                column: 6,
                row: (top + 5) as u16
            })
        );
    }

    #[test]
    fn rows_run_out_wordmark_first_then_hints_then_rules() {
        let hints = hints();
        let small = cells(&render(&input(40, 7, &hints)), 40, 7);
        assert!(small.iter().all(|row| !row.contains('▀')), "{small:#?}");
        assert!(small.iter().any(|row| row.contains("alt+a")));
        let narrow = cells(&render(&input(20, 5, &hints)), 20, 5);
        assert!(narrow.iter().all(|row| !row.contains("alt+a")));
        assert!(narrow.iter().any(|row| row.contains("~/src/a1")));
        let three = cells(&render(&input(20, 3, &hints)), 20, 3);
        assert_eq!(three[1].trim(), "❯ Ask anything…");
        let two = render(&input(20, 2, &hints));
        let two_cells = cells(&two, 20, 2);
        assert!(two_cells.iter().all(|row| !row.contains('─')));
        assert!(
            two.cursor.is_some(),
            "the box stays usable below three rows"
        );
    }

    #[test]
    fn wide_terminals_cap_the_box_at_seventy_two_columns() {
        let hints = hints();
        let grid = cells(&render(&input(200, 59, &hints)), 200, 59);
        let rule = grid.iter().find(|row| row.contains('─')).unwrap();
        assert_eq!(rule.trim().chars().count(), 72);
        assert_eq!(rule.find('─'), Some(64));
    }

    #[test]
    fn typed_text_wraps_and_the_cursor_row_stays_visible() {
        let hints = hints();
        let text = "one\ntwo\nthree\nfour\nfive\nsix\nseven\neight";
        let frame = render(&LandingInput {
            text,
            cursor: text.graphemes(true).count(),
            ..input(40, 23, &hints)
        });
        let grid = cells(&frame, 40, 23);
        let content = grid
            .iter()
            .filter(|row| !row.contains('─') && !row.is_empty())
            .filter(|row| !row.contains('▀') && !row.contains("alt+"))
            .map(|row| row.trim().to_owned())
            .collect::<Vec<_>>();
        assert_eq!(content, ["three", "four", "five", "six", "seven", "eight"]);
        let cursor = frame.cursor.unwrap();
        assert_eq!(grid[usize::from(cursor.row)].trim(), "eight");
        assert_eq!(cursor.column, 2 + 2 + 5);

        let long = "x".repeat(40);
        let wrapped = render(&LandingInput {
            text: &long,
            cursor: 40,
            ..input(40, 23, &hints)
        });
        let grid = cells(&wrapped, 40, 23);
        assert!(
            grid.iter()
                .any(|row| row.trim() == format!("❯ {}", "x".repeat(34)))
        );
        assert!(grid.iter().any(|row| row.trim() == "x".repeat(6)));

        let top = render(&LandingInput {
            text,
            cursor: 0,
            ..input(40, 23, &hints)
        });
        let grid = cells(&top, 40, 23);
        assert!(grid.iter().any(|row| row.trim() == "❯ one"));
    }

    #[test]
    fn pending_creation_shows_the_spinner_and_no_cursor() {
        let hints = hints();
        let frame = render(&LandingInput {
            text: "What does this repository build?",
            cursor: 32,
            spinner: Some("⠋"),
            ..input(80, 23, &hints)
        });
        assert_eq!(frame.cursor, None);
        let grid = cells(&frame, 80, 23);
        assert!(
            grid.iter()
                .any(|row| row.trim() == "⠋ What does this repository build?")
        );
        let text = String::from_utf8(frame.bytes).unwrap();
        assert!(text.contains("\x1b[38;2;167;152;215m⠋"), "accent spinner");
    }

    #[test]
    fn accents_palette_fallback_and_text_wordmark() {
        let hints = hints();
        let blue = String::from_utf8(
            render(&LandingInput {
                accent: Some("blue"),
                ..input(80, 23, &hints)
            })
            .bytes,
        )
        .unwrap();
        assert!(blue.contains("\x1b[38;2;130;160;241m"));
        assert!(blue.contains("\x1b[38;2;116;102;197m─"));
        let palette = String::from_utf8(
            render(&LandingInput {
                truecolor: false,
                ..input(80, 23, &hints)
            })
            .bytes,
        )
        .unwrap();
        assert!(!palette.contains("38;2;"));
        assert!(palette.contains(&format!("\x1b[38;5;{}m", palette_index([167, 152, 215]))));
        assert_eq!(palette_index([0, 0, 0]), 16);
        assert_eq!(palette_index([255, 255, 255]), 231);
        assert_eq!(palette_index([128, 128, 128]), 244);

        let plain = cells(
            &render(&LandingInput {
                half_blocks: false,
                ..input(80, 23, &hints)
            }),
            80,
            23,
        );
        assert!(plain.iter().all(|row| !row.contains('▀')));
        assert!(plain.iter().any(|row| row.trim() == "a1"));
    }

    #[test]
    fn the_pinned_accent_table_matches_the_owned_projection_fixture() {
        let fixture: serde_json::Value =
            serde_json::from_str(include_str!("landing_accents.json")).unwrap();
        let accents = fixture["accents"].as_object().unwrap();
        assert_eq!(accents.len(), LANDING_ACCENTS.len());
        for (name, colors) in LANDING_ACCENTS {
            let rgb = |key: &str| {
                let values = accents[name][key].as_array().unwrap();
                [0, 1, 2].map(|index| values[index].as_u64().unwrap() as u8)
            };
            assert_eq!(rgb("accent"), colors.accent, "{name} accent");
            assert_eq!(rgb("border"), colors.border, "{name} border");
        }
        assert_eq!(accent_colors(Some("unknown")), LANDING_ACCENTS[0].1);
    }

    #[test]
    fn the_landing_composes_as_the_body_under_either_strip_position_and_popups() {
        use crate::roles::presentation::{DesiredPresentation, FinalCursor, PresentationComposer};
        let hints = hints();
        let frame = render(&input(80, 23, &hints));
        let cursor = frame.cursor.unwrap();
        let desired = |offset: u16, overlay: Option<String>| DesiredPresentation {
            tab_id: None,
            incarnation: 0,
            revision: 0,
            geometry_generation: 0,
            strip: "\x1b[1;1Hstrip".into(),
            structured: None,
            legacy_body: frame.bytes.clone(),
            overlay,
            cursor: Some(FinalCursor::At(cursor)),
            modes: None,
            columns: 80,
            outer_rows: 24,
            child_row_offset: offset,
            clear: false,
        };
        let composer = PresentationComposer::default();
        let top = composer.prepare(&desired(1, None)).unwrap().unwrap();
        let top = String::from_utf8(top.bytes).unwrap();
        assert!(
            top.contains("\x1b[2J"),
            "the last-tab close clears the prior surface once"
        );
        assert!(
            top.contains("\x1b[2;1H\x1b[0m\x1b[2K"),
            "every body row is overwritten"
        );
        assert!(top.ends_with(&format!("\x1b[{};7H\x1b[?25h\x1b[?2026l", cursor.row + 2)));
        let bottom = composer.prepare(&desired(0, None)).unwrap().unwrap();
        let bottom = String::from_utf8(bottom.bytes).unwrap();
        assert!(
            bottom.contains("\x1b[1;1H\x1b[0m\x1b[2K"),
            "a bottom strip moves the body up"
        );
        assert!(bottom.contains(&format!("\x1b[{};7H\x1b[?25h", cursor.row + 1)));

        let mut presented = PresentationComposer::default();
        presented
            .prepare(&desired(1, None))
            .unwrap()
            .unwrap()
            .acknowledge(&mut presented);
        let popup = presented
            .prepare(&desired(1, Some("\x1b[s\x1b[2;1Hmenu\x1b[u".into())))
            .unwrap()
            .unwrap();
        let popup = String::from_utf8(popup.bytes).unwrap();
        assert!(
            !popup.contains("\x1b[2J"),
            "a popup over the landing never clears it"
        );
        assert!(popup.contains("menu"));
    }

    #[test]
    fn cwd_is_written_under_home_and_clipped_from_the_left() {
        assert_eq!(display_cwd("/home/me/src/a1", Some("/home/me")), "~/src/a1");
        assert_eq!(display_cwd("/home/me", Some("/home/me/")), "~");
        assert_eq!(
            display_cwd("/home/meta/x", Some("/home/me")),
            "/home/meta/x"
        );
        assert_eq!(display_cwd("/srv/a1", None), "/srv/a1");
        assert_eq!(clip_left("~/src/project/a1", 8), "…ject/a1");
        assert_eq!(clip_left("a1", 8), "a1");
    }
}
