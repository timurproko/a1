//! The a1 landing the attach client shows below the strip while it has no tab: a top-left header
//! with the wordmark, the a1 version, and the launch cwd, and at the bottom one ruled prompt box
//! that mirrors the flush-left owned editor, above the tab shortcuts that start work. Rendering
//! is pure; the attach role owns the editor state and presents the bytes as the frame's body.

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

use crate::protocol::SurfaceCursor;

/// Most prompt rows the box shows before it scrolls to keep the cursor row visible.
pub const LANDING_MAX_ROWS: usize = 6;
pub const LANDING_PLACEHOLDER: &str = "Ask anything…";
const WORDMARK: [&str; 3] = [" ▀▀▀▄ ▄█ ", "▄▀▀▀█  █ ", " ▀▀▀▀ ▀▀▀"];
/// The header's rows below one margin row, and its left margin in cells.
const HEADER_ROWS: usize = 3;
const HEADER_MARGIN: usize = 1;

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
    /// The running a1 package version, shown after the name in the header.
    pub version: Option<&'a str>,
    pub cwd: &'a str,
    /// Key label and action for each bound shortcut, in display order.
    pub hints: &'a [(String, &'a str)],
    pub text: &'a str,
    pub cursor: usize,
    pub spinner: Option<&'a str>,
}

/// The landing body, addressed as child rows below a top strip, and its caret cell.
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

/// Styles one prompt row and, when `caret` names a cell column, reverses the cell under it the
/// way the owned editor draws its caret: a block in whatever theme is in use, past the text a
/// reversed space. The hardware cursor stays hidden, as in the owned editor by default.
fn with_caret(text: &str, color: &str, caret: Option<usize>) -> String {
    let Some(column) = caret else {
        return format!("{color}{text}\x1b[0m");
    };
    let mut before = String::new();
    let mut under = None;
    let mut after = String::new();
    let mut used = 0usize;
    for grapheme in text.graphemes(true) {
        if under.is_some() {
            after.push_str(grapheme);
        } else if used >= column {
            under = Some(grapheme);
        } else {
            before.push_str(grapheme);
            used += UnicodeWidthStr::width(grapheme);
        }
    }
    format!(
        "{color}{before}\x1b[7m{}\x1b[27m{after}\x1b[0m",
        under.unwrap_or(" ")
    )
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

/// Body rows, each holding the styled runs placed on it by starting column.
type Rows = Vec<Vec<(usize, String)>>;

fn place(rows: &mut Rows, row: usize, column: usize, content: String) {
    if let Some(slot) = rows.get_mut(row) {
        slot.push((column, content));
    }
}

pub fn render(input: &LandingInput<'_>) -> LandingFrame {
    let columns = usize::from(input.columns);
    let body_rows = usize::from(input.body_rows);
    // Invariant: the box mirrors the flush-left owned editor, so its text starts at column zero;
    // a pending creation's spinner takes the first two cells.
    let spinner_width = if input.spinner.is_some() { 2 } else { 0 };
    let content_width = columns.saturating_sub(spinner_width).max(1);
    let wrapped = wrap(input.text, content_width);
    let ruled = body_rows >= 3;
    let content_rows = wrapped
        .len()
        .min(LANDING_MAX_ROWS)
        .min(if ruled { body_rows - 2 } else { body_rows })
        .max(1);
    let box_rows = content_rows + if ruled { 2 } else { 0 };
    let with_hints = box_rows < body_rows;
    let with_header = box_rows + usize::from(with_hints) + HEADER_ROWS + 1 <= body_rows;

    let mut rows: Rows = vec![Vec::new(); body_rows];
    if with_header {
        place_header(&mut rows, input);
    }
    // Invariant: the box sits at the bottom, where the new Agent's editor appears, and grows
    // upward as the prompt wraps.
    let top = body_rows.saturating_sub(box_rows + usize::from(with_hints));
    let cursor = place_box(&mut rows, input, &wrapped, top, content_rows, ruled);
    if with_hints {
        place(&mut rows, body_rows - 1, 0, hint_line(input));
    }
    LandingFrame {
        bytes: encode(&rows),
        cursor,
    }
}

/// The top-left header: the accent wordmark beside `a1 v<version>` and the launch cwd.
fn place_header(rows: &mut Rows, input: &LandingInput<'_>) {
    let columns = usize::from(input.columns);
    let colors = accent_colors(input.accent);
    let fg = |rgb| foreground(rgb, input.truecolor);
    let text_column = if input.half_blocks {
        for (offset, line) in WORDMARK.iter().enumerate() {
            let shown = clip(line, columns.saturating_sub(HEADER_MARGIN));
            let content = format!("{}{shown}\x1b[0m", fg(colors.accent));
            place(rows, 1 + offset, HEADER_MARGIN, content);
        }
        HEADER_MARGIN + UnicodeWidthStr::width(WORDMARK[0]) + 2
    } else {
        HEADER_MARGIN
    };
    let room = columns.saturating_sub(text_column);
    let version = input
        .version
        .filter(|version| !version.is_empty())
        .map(|version| format!(" v{version}"))
        .unwrap_or_default();
    let title = format!(
        "\x1b[1m{}{}\x1b[0m{}{}\x1b[0m",
        fg(TEXT),
        clip("a1", room),
        fg(MUTED),
        clip(&version, room.saturating_sub(2))
    );
    place(rows, 1, text_column, title);
    let cwd = format!("{}{}\x1b[0m", fg(MUTED), clip_left(input.cwd, room));
    place(rows, 2, text_column, cwd);
}

/// The ruled prompt box from body row `top`; returns the caret cell.
fn place_box(
    rows: &mut Rows,
    input: &LandingInput<'_>,
    wrapped: &[WrappedRow],
    top: usize,
    content_rows: usize,
    ruled: bool,
) -> Option<SurfaceCursor> {
    let columns = usize::from(input.columns);
    let colors = accent_colors(input.accent);
    let fg = |rgb| foreground(rgb, input.truecolor);
    let content_width = columns
        .saturating_sub(if input.spinner.is_some() { 2 } else { 0 })
        .max(1);
    let (cursor_row, cursor_column) = cursor_cell(input.text, wrapped, input.cursor);
    let rule = format!("{}{}\x1b[0m", fg(colors.border), "─".repeat(columns));
    let mut row = top;
    if ruled {
        place(rows, row, 0, rule.clone());
        row += 1;
    }
    let first = cursor_row.saturating_sub(content_rows - 1);
    let mut cursor = None;
    for (offset, visual) in wrapped.iter().skip(first).take(content_rows).enumerate() {
        let index = first + offset;
        let prefix = match input.spinner {
            Some(frame) if index == 0 => format!("{}{frame} \x1b[0m", fg(colors.accent)),
            Some(_) => "  ".to_owned(),
            None => String::new(),
        };
        let caret = (index == cursor_row && input.spinner.is_none()).then_some(cursor_column);
        let (text, color) = if input.text.is_empty() {
            (LANDING_PLACEHOLDER, DIM)
        } else if input.spinner.is_some() {
            (visual.text.as_str(), MUTED)
        } else {
            (visual.text.as_str(), TEXT)
        };
        let body = with_caret(&clip(text, content_width), &fg(color), caret);
        if caret.is_some() {
            cursor = Some(SurfaceCursor {
                column: cursor_column.min(columns.saturating_sub(1)) as u16,
                row: row as u16,
            });
        }
        place(rows, row, 0, format!("{prefix}{body}"));
        row += 1;
    }
    if ruled {
        place(rows, row, 0, rule);
    }
    cursor
}

/// The bound shortcut hints that fit, whole, in display order.
fn hint_line(input: &LandingInput<'_>) -> String {
    let columns = usize::from(input.columns);
    let fg = |rgb| foreground(rgb, input.truecolor);
    let separator = " · ";
    let mut line = String::new();
    let mut used = 0usize;
    for (key, action) in input.hints.iter().filter(|(key, _)| !key.is_empty()) {
        let key = key.to_lowercase();
        let gap = if used == 0 {
            0
        } else {
            UnicodeWidthStr::width(separator)
        };
        let cells =
            gap + UnicodeWidthStr::width(key.as_str()) + 1 + UnicodeWidthStr::width(*action);
        if used + cells > columns {
            break;
        }
        if used > 0 {
            line.push_str(&format!("{}{separator}\x1b[0m", fg(DIM)));
        }
        line.push_str(&format!(
            "{}{key}\x1b[0m {}{action}\x1b[0m",
            fg(TEXT),
            fg(MUTED)
        ));
        used += cells;
    }
    line
}

/// Clears every body row and writes its runs, addressed as rows below a top strip.
fn encode(rows: &Rows) -> Vec<u8> {
    let mut bytes = String::new();
    for (index, slot) in rows.iter().enumerate() {
        let terminal_row = index + 2;
        bytes.push_str(&format!("\x1b[{terminal_row};1H\x1b[0m\x1b[2K"));
        for (column, content) in slot {
            bytes.push_str(&format!("\x1b[{terminal_row};{}H{content}", column + 1));
        }
    }
    bytes.push_str("\x1b[0m");
    bytes.into_bytes()
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
        while !rest.is_empty() {
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
            version: Some("0.2.7"),
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

    fn bytes(frame: LandingFrame) -> String {
        String::from_utf8(frame.bytes).unwrap()
    }

    #[test]
    fn the_header_sits_top_left_and_the_box_at_the_bottom_at_80x24() {
        let hints = hints();
        let frame = render(&input(80, 23, &hints));
        let grid = cells(&frame, 80, 23);
        assert!(grid[0].is_empty(), "one margin row above the header");
        assert_eq!(grid[1], format!(" {}  a1 v0.2.7", WORDMARK[0]));
        assert_eq!(grid[2], format!(" {}  ~/src/a1", WORDMARK[1]));
        assert_eq!(grid[3], format!(" {}", WORDMARK[2]));
        assert!(grid[4..19].iter().all(String::is_empty), "{grid:#?}");
        assert_eq!(grid[19], "─".repeat(80));
        assert_eq!(grid[20], LANDING_PLACEHOLDER);
        assert_eq!(grid[21], "─".repeat(80));
        assert_eq!(grid[22], "alt+a new agent · alt+, settings");
        assert_eq!(frame.cursor, Some(SurfaceCursor { column: 0, row: 20 }));
    }

    #[test]
    fn rows_run_out_header_first_then_hints_then_rules() {
        let hints = hints();
        let small = cells(&render(&input(40, 7, &hints)), 40, 7);
        assert!(small.iter().all(|row| !row.contains("a1 v")), "{small:#?}");
        assert_eq!(small[6], "alt+a new agent · alt+, settings");
        let tight = cells(&render(&input(20, 3, &hints)), 20, 3);
        assert_eq!(
            tight,
            ["─".repeat(20), LANDING_PLACEHOLDER.into(), "─".repeat(20)]
        );
        let two = render(&input(20, 2, &hints));
        let two_cells = cells(&two, 20, 2);
        assert!(two_cells.iter().all(|row| !row.contains('─')));
        assert!(
            two.cursor.is_some(),
            "the box stays usable below three rows"
        );
        let narrow = cells(&render(&input(20, 6, &hints)), 20, 6);
        assert_eq!(
            narrow[5], "alt+a new agent",
            "hints that do not fit are dropped whole"
        );
    }

    #[test]
    fn rules_span_the_whole_terminal_like_the_owned_editor() {
        let hints = hints();
        let grid = cells(&render(&input(200, 59, &hints)), 200, 59);
        let rule = grid.iter().find(|row| row.contains('─')).unwrap();
        assert_eq!(rule.chars().count(), 200);
        assert!(rule.starts_with('─'));
    }

    #[test]
    fn typed_text_wraps_upward_and_the_cursor_row_stays_visible() {
        let hints = hints();
        let text = "one\ntwo\nthree\nfour\nfive\nsix\nseven\neight";
        let frame = render(&LandingInput {
            text,
            cursor: text.graphemes(true).count(),
            ..input(40, 23, &hints)
        });
        let grid = cells(&frame, 40, 23);
        assert_eq!(
            grid[14..22],
            [
                "─".repeat(40),
                "three".into(),
                "four".into(),
                "five".into(),
                "six".into(),
                "seven".into(),
                "eight".into(),
                "─".repeat(40)
            ]
        );
        let cursor = frame.cursor.unwrap();
        assert_eq!((cursor.row, cursor.column), (20, 5));

        let long = "x".repeat(50);
        let wrapped = cells(
            &render(&LandingInput {
                text: &long,
                cursor: 50,
                ..input(40, 23, &hints)
            }),
            40,
            23,
        );
        assert_eq!(wrapped[19], "x".repeat(40));
        assert_eq!(wrapped[20], "x".repeat(10));

        let top = cells(
            &render(&LandingInput {
                text,
                cursor: 0,
                ..input(40, 23, &hints)
            }),
            40,
            23,
        );
        assert!(top.iter().any(|row| row == "one"));
    }

    #[test]
    fn pending_creation_shows_the_spinner_and_no_caret() {
        let hints = hints();
        let frame = render(&LandingInput {
            text: "What does this repository build?",
            cursor: 32,
            spinner: Some("⠋"),
            ..input(80, 23, &hints)
        });
        assert_eq!(frame.cursor, None);
        let grid = cells(&frame, 80, 23);
        assert_eq!(grid[20], "⠋ What does this repository build?");
        let text = bytes(frame);
        assert!(text.contains("\x1b[38;2;167;152;215m⠋"), "accent spinner");
        assert!(!text.contains("\x1b[7m"), "a pending prompt draws no caret");
    }

    #[test]
    fn the_caret_reverses_the_cell_under_the_cursor_like_the_owned_editor() {
        let hints = hints();
        let text = |cursor: usize| {
            bytes(render(&LandingInput {
                text: "hello",
                cursor,
                ..input(80, 24, &hints)
            }))
        };
        assert!(text(1).contains("h\x1b[7me\x1b[27mllo"));
        assert!(text(0).contains("\x1b[7mh\x1b[27mello"));
        assert!(
            text(5).contains("hello\x1b[7m \x1b[27m"),
            "past the text a reversed space"
        );
        assert!(
            bytes(render(&input(80, 24, &hints))).contains("\x1b[7mA\x1b[27msk anything…"),
            "an empty box carries the caret on the placeholder's first cell"
        );
    }

    #[test]
    fn accents_palette_fallback_text_wordmark_and_missing_version() {
        let hints = hints();
        let blue = bytes(render(&LandingInput {
            accent: Some("blue"),
            ..input(80, 23, &hints)
        }));
        assert!(blue.contains("\x1b[38;2;130;160;241m ▀▀▀▄"));
        assert!(blue.contains("\x1b[38;2;116;102;197m─"));
        let palette = bytes(render(&LandingInput {
            truecolor: false,
            ..input(80, 23, &hints)
        }));
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
        assert_eq!(plain[1], " a1 v0.2.7");
        assert_eq!(plain[2], " ~/src/a1");
        let unversioned = cells(
            &render(&LandingInput {
                version: None,
                ..input(80, 23, &hints)
            }),
            80,
            23,
        );
        assert!(unversioned[1].ends_with("  a1"));
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
    fn the_landing_composes_under_either_strip_with_a_hidden_hardware_cursor() {
        use crate::roles::presentation::{DesiredPresentation, FinalCursor, PresentationComposer};
        let hints = hints();
        let frame = render(&input(80, 23, &hints));
        let desired = |offset: u16, overlay: Option<String>| DesiredPresentation {
            tab_id: None,
            incarnation: 0,
            revision: 0,
            geometry_generation: 0,
            strip: "\x1b[1;1Hstrip".into(),
            structured: None,
            legacy_body: frame.bytes.clone(),
            overlay,
            cursor: Some(FinalCursor::Hidden),
            modes: None,
            columns: 80,
            outer_rows: 24,
            child_row_offset: offset,
            clear: false,
        };
        let composer = PresentationComposer::default();
        let top = bytes_of(composer.prepare(&desired(1, None)).unwrap().unwrap().bytes);
        assert!(
            top.contains("\x1b[2J"),
            "the last-tab close clears the prior surface once"
        );
        assert!(top.contains("strip"), "the strip stays above the landing");
        assert!(
            top.contains("\x1b[2;1H\x1b[0m\x1b[2K"),
            "every body row is overwritten"
        );
        assert!(
            top.ends_with("\x1b[?25l\x1b[?2026l"),
            "the hardware cursor stays hidden"
        );
        let bottom = bytes_of(composer.prepare(&desired(0, None)).unwrap().unwrap().bytes);
        assert!(
            bottom.contains("\x1b[1;1H\x1b[0m\x1b[2K"),
            "a bottom strip moves the body up"
        );

        let mut presented = PresentationComposer::default();
        presented
            .prepare(&desired(1, None))
            .unwrap()
            .unwrap()
            .acknowledge(&mut presented);
        let popup = bytes_of(
            presented
                .prepare(&desired(1, Some("\x1b[s\x1b[2;1Hmenu\x1b[u".into())))
                .unwrap()
                .unwrap()
                .bytes,
        );
        assert!(
            !popup.contains("\x1b[2J"),
            "a popup over the landing never clears it"
        );
        assert!(popup.contains("menu"));
    }

    fn bytes_of(value: Vec<u8>) -> String {
        String::from_utf8(value).unwrap()
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
