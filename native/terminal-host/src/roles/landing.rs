//! The a1 landing the attach client shows while it has no tab: beside the strip, a header with the
//! accent wordmark, `a1` and its version, and the launch cwd. It sits below a top strip and above
//! a bottom one. Rendering is pure; the attach role presents the bytes as the frame's body.

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

const WORDMARK: [&str; 3] = [" ▀▀▀▄ ▄█ ", "▄▀▀▀█  █ ", " ▀▀▀▀ ▀▀▀"];
/// The header's rows, and its margin from the strip side and the left edge, in cells.
const HEADER_ROWS: usize = 3;
const HEADER_MARGIN: usize = 1;

/// The owned dark theme's `muted` foreground and its primary text.
const MUTED: [u8; 3] = [157, 165, 169];
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

/// What one landing frame shows.
#[derive(Debug, Clone)]
pub struct LandingInput<'a> {
    pub columns: u16,
    pub body_rows: u16,
    /// The strip is at the bottom, so the header sits at the bottom of the body beside it.
    pub at_bottom: bool,
    /// The running a1 package version, shown after the name.
    pub version: Option<&'a str>,
    pub accent: Option<&'a str>,
    pub truecolor: bool,
    pub half_blocks: bool,
    pub cwd: &'a str,
}

/// Whether the terminal draws half-block glyphs as solid cells. Apple Terminal leaves seams
/// between them, so the wordmark is omitted there.
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
    let matches = if cfg!(windows) {
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
    let mut kept = Vec::new();
    let mut used = 1usize;
    for grapheme in value.graphemes(true).rev() {
        let cells = UnicodeWidthStr::width(grapheme);
        if used + cells > width {
            break;
        }
        kept.push(grapheme);
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

/// The landing body, addressed as rows below a top strip: every row is cleared and the header
/// is drawn one row away from the strip.
pub fn render(input: &LandingInput<'_>) -> Vec<u8> {
    let columns = usize::from(input.columns);
    let body_rows = usize::from(input.body_rows);
    let fg = |rgb| foreground(rgb, input.truecolor);
    let top = if body_rows < HEADER_ROWS + HEADER_MARGIN {
        0
    } else if input.at_bottom {
        body_rows - HEADER_ROWS - HEADER_MARGIN
    } else {
        HEADER_MARGIN
    };
    let mut rows = vec![String::new(); body_rows];
    let mut place = |row: usize, column: usize, content: String| {
        if let Some(slot) = rows.get_mut(row) {
            slot.push_str(&format!("\x1b[{};{}H{content}", row + 2, column + 1));
        }
    };
    let text_column = if input.half_blocks {
        let accent = fg(accent_colors(input.accent).accent);
        for (offset, line) in WORDMARK.iter().enumerate() {
            let shown = clip(line, columns.saturating_sub(HEADER_MARGIN));
            place(
                top + offset,
                HEADER_MARGIN,
                format!("{accent}{shown}\x1b[0m"),
            );
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
    place(top, text_column, title);
    let cwd = format!("{}{}\x1b[0m", fg(MUTED), clip_left(input.cwd, room));
    place(top + 1, text_column, cwd);

    let mut bytes = String::new();
    for (index, content) in rows.iter().enumerate() {
        bytes.push_str(&format!("\x1b[{};1H\x1b[0m\x1b[2K{content}", index + 2));
    }
    bytes.push_str("\x1b[0m");
    bytes.into_bytes()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Plays the landing bytes onto a cell grid of the body rows, ignoring styles.
    fn cells(bytes: &[u8], columns: u16, rows: u16) -> Vec<String> {
        let mut grid = vec![vec![" ".to_owned(); usize::from(columns)]; usize::from(rows)];
        let text = String::from_utf8(bytes.to_vec()).unwrap();
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
            if row < grid.len() && column < grid[row].len() {
                grid[row][column] = grapheme.to_owned();
            }
            column += UnicodeWidthStr::width(grapheme).max(1);
            rest = &rest[grapheme.len()..];
        }
        grid.into_iter()
            .map(|row| row.concat().trim_end().to_owned())
            .collect()
    }

    fn input(columns: u16, rows: u16, at_bottom: bool) -> LandingInput<'static> {
        LandingInput {
            columns,
            body_rows: rows,
            at_bottom,
            version: Some("0.2.7"),
            accent: None,
            truecolor: true,
            half_blocks: true,
            cwd: "~/src/a1",
        }
    }

    #[test]
    fn the_header_sits_one_row_below_a_top_strip() {
        let grid = cells(&render(&input(80, 23, false)), 80, 23);
        assert!(grid[0].is_empty());
        assert_eq!(grid[1], format!(" {}  a1 v0.2.7", WORDMARK[0]));
        assert_eq!(grid[2], format!(" {}  ~/src/a1", WORDMARK[1]));
        assert_eq!(grid[3], format!(" {}", WORDMARK[2]));
        assert!(
            grid[4..].iter().all(String::is_empty),
            "no input below the header"
        );
    }

    #[test]
    fn the_header_moves_to_the_bottom_above_a_bottom_strip() {
        let grid = cells(&render(&input(80, 23, true)), 80, 23);
        assert!(grid[..19].iter().all(String::is_empty));
        assert_eq!(grid[19], format!(" {}  a1 v0.2.7", WORDMARK[0]));
        assert_eq!(grid[20], format!(" {}  ~/src/a1", WORDMARK[1]));
        assert_eq!(grid[21], format!(" {}", WORDMARK[2]));
        assert!(grid[22].is_empty(), "one margin row beside the strip");
    }

    #[test]
    fn every_body_row_is_cleared_and_the_header_fits_small_terminals() {
        let bytes = String::from_utf8(render(&input(80, 23, false))).unwrap();
        for row in 2..=24 {
            assert!(bytes.contains(&format!("\x1b[{row};1H\x1b[0m\x1b[2K")));
        }
        let small = cells(&render(&input(14, 3, true)), 14, 3);
        assert_eq!(small[0], format!(" {}  a1", WORDMARK[0]));
        let narrow = cells(&render(&input(30, 23, false)), 30, 23);
        assert_eq!(narrow[1], format!(" {}  a1 v0.2.7", WORDMARK[0]));
        assert_eq!(narrow[2], format!(" {}  ~/src/a1", WORDMARK[1]));
    }

    #[test]
    fn accents_palette_fallback_text_header_and_missing_version() {
        let blue = String::from_utf8(render(&LandingInput {
            accent: Some("blue"),
            ..input(80, 23, false)
        }))
        .unwrap();
        assert!(blue.contains("\x1b[38;2;130;160;241m ▀▀▀▄"));
        let palette = String::from_utf8(render(&LandingInput {
            truecolor: false,
            ..input(80, 23, false)
        }))
        .unwrap();
        assert!(!palette.contains("38;2;"));
        assert!(palette.contains(&format!("\x1b[38;5;{}m", palette_index([167, 152, 215]))));
        assert_eq!(palette_index([0, 0, 0]), 16);
        assert_eq!(palette_index([255, 255, 255]), 231);
        assert_eq!(palette_index([128, 128, 128]), 244);
        let plain = cells(
            &render(&LandingInput {
                half_blocks: false,
                ..input(80, 23, false)
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
                ..input(80, 23, false)
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
    fn the_landing_composes_under_either_strip_with_no_cursor() {
        use crate::roles::presentation::{DesiredPresentation, FinalCursor, PresentationComposer};
        let desired = |at_bottom: bool| DesiredPresentation {
            tab_id: None,
            incarnation: 0,
            revision: 0,
            geometry_generation: 0,
            strip: "strip".into(),
            structured: None,
            legacy_body: render(&input(80, 23, at_bottom)),
            overlay: None,
            cursor: Some(FinalCursor::Hidden),
            modes: None,
            columns: 80,
            outer_rows: 24,
            child_row_offset: u16::from(!at_bottom),
            clear: false,
        };
        let composer = PresentationComposer::default();
        let top =
            String::from_utf8(composer.prepare(&desired(false)).unwrap().unwrap().bytes).unwrap();
        assert!(
            top.contains("\x1b[2J"),
            "the last-tab close clears the prior surface once"
        );
        assert!(
            top.contains("\x1b[3;2H"),
            "the header starts one row below the top strip"
        );
        assert!(top.ends_with("\x1b[?25l\x1b[?2026l"), "no cursor shows");
        let bottom =
            String::from_utf8(composer.prepare(&desired(true)).unwrap().unwrap().bytes).unwrap();
        assert!(
            bottom.contains("\x1b[20;2H"),
            "above a bottom strip the header ends one row above it"
        );
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
