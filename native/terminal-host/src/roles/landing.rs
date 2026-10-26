//! The a1 landing the attach client shows while it has no tab: the launch cwd where an Agent
//! tab's footer shows it, `a1` and its version below it, and the accent wordmark above it.
//! Rendering is pure; the attach role presents the bytes as the frame's body.

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

/// Invariant: the middle row sits where an Agent's editor draws its caret, but the landing
/// wordmark has no stray full block to the left of its `a`.
const WORDMARK: [&str; 3] = [" ▀▀▀▄ ▄█ ", " ▀▀▀█  █ ", " ▀▀▀▀ ▀▀▀"];

/// The owned dark theme's `dim` foreground, which an Agent footer draws its cwd and status in;
/// `landing_accents.json` pins it with the accents.
const DIM: [u8; 3] = [126, 136, 142];

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

/// The `accent` canvas `derivePiCanvasBackground("accent", accent)` gives each A1 accent, and the
/// fixed `dark` canvas; `landing_accents.json` pins both.
pub const LANDING_ACCENT_CANVASES: [(&str, [u8; 3]); 6] = [
    ("purple", [27, 26, 32]),
    ("blue", [25, 27, 32]),
    ("cyan", [22, 29, 29]),
    ("green", [24, 29, 26]),
    ("orange", [31, 26, 23]),
    ("pink", [31, 25, 29]),
];
pub const LANDING_DARK_CANVAS: [u8; 3] = [26, 27, 28];

/// The landing canvas for the owned `backgroundStyle` setting, like an Agent's fullscreen canvas;
/// `transparent`, or an unknown value, leaves the terminal background.
pub fn canvas_background(style: Option<&str>, accent: Option<&str>) -> Option<[u8; 3]> {
    match style {
        Some("dark") => Some(LANDING_DARK_CANVAS),
        Some("accent") => Some(
            LANDING_ACCENT_CANVASES
                .iter()
                .find(|(name, _)| Some(*name) == accent)
                .unwrap_or(&LANDING_ACCENT_CANVASES[0])
                .1,
        ),
        _ => None,
    }
}

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
    /// The running a1 package version, shown after the name.
    pub version: Option<&'a str>,
    pub accent: Option<&'a str>,
    pub truecolor: bool,
    pub half_blocks: bool,
    pub cwd: &'a str,
    /// The canvas color every body row is painted with, or the terminal background.
    pub background: Option<[u8; 3]>,
}

/// Whether the terminal draws half-block glyphs as solid cells. Apple Terminal leaves seams
/// between them, so the wordmark is omitted there.
pub fn half_blocks_supported() -> bool {
    std::env::var("TERM_PROGRAM").map_or(true, |program| program != "Apple_Terminal")
}

/// Shortens `cwd` for display the way an Agent tab's footer does: the home directory becomes `~`
/// and the rest keeps its own separators.
pub fn display_cwd(cwd: &str, home: Option<&str>) -> String {
    const SEPARATORS: [char; 2] = ['/', '\\'];
    let Some(home) = home
        .map(|home| home.trim_end_matches(SEPARATORS))
        .filter(|home| !home.is_empty())
    else {
        return cwd.to_owned();
    };
    let normalize = |value: &str| value.replace('\\', "/");
    let (path, root) = (normalize(cwd), normalize(home));
    let matches = if cfg!(windows) {
        path.to_lowercase().starts_with(&root.to_lowercase())
    } else {
        path.starts_with(&root)
    };
    let rest = cwd.get(home.len()..).unwrap_or_default();
    if matches && (rest.is_empty() || rest.starts_with(SEPARATORS)) {
        format!("~{}", rest.trim_end_matches(SEPARATORS))
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

fn background(rgb: [u8; 3], truecolor: bool) -> String {
    if truecolor {
        format!("[48;2;{};{};{}m", rgb[0], rgb[1], rgb[2])
    } else {
        format!("[48;5;{}m", palette_index(rgb))
    }
}

fn foreground(rgb: [u8; 3], truecolor: bool) -> String {
    if truecolor {
        format!("\x1b[38;2;{};{};{}m", rgb[0], rgb[1], rgb[2])
    } else {
        format!("\x1b[38;5;{}m", palette_index(rgb))
    }
}

/// One wordmark row in the accent.
fn wordmark_row(line: &str, accent: &str, columns: usize) -> String {
    format!("{accent}{}[0m", clip(line, columns))
}

/// The landing body, addressed as rows below a top strip. Every row is cleared; the launch cwd
/// sits on the second-to-last body row, flush left, with `a1 v<version>` below it and the
/// wordmark above it. Invariant: that is where an Agent tab's footer shows its cwd, so the
/// folder stays in place when a tab opens or closes, whichever edge the strip is on.
pub fn render(input: &LandingInput<'_>) -> Vec<u8> {
    render_body(input, None, false)
}

/// Rows rendered by the real Agent's owned footer. Retaining cells preserves its path metadata,
/// hyperlinks, gutters, and styles without maintaining a second native footer layout.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentFooterRows {
    pub columns: u16,
    pub path: crate::protocol::SurfaceRow,
    pub status: crate::protocol::SurfaceRow,
    pub styles: Vec<crate::protocol::SurfaceStyle>,
    pub links: Vec<crate::protocol::SurfaceLink>,
}

/// Display-only footer hints from a prior complete Agent frame. The new tab always starts with
/// zero usage; hints never become its authoritative model or context state.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentPreviewFooter {
    pub context: String,
    pub subscription: bool,
    pub auto: bool,
    pub model: String,
    pub thinking: Option<(String, [u8; 3])>,
    pub actual: Option<AgentFooterRows>,
}

impl Default for AgentPreviewFooter {
    fn default() -> Self {
        Self {
            context: "0".into(),
            subscription: false,
            auto: true,
            model: "no-model".into(),
            thinking: None,
            actual: None,
        }
    }
}

/// The visual-only idle Agent shell shown before its first child frame. Its inverse-space caret
/// is not the hardware cursor, and its footer is replaced by the first real Agent frame.
pub fn render_agent_preview(
    input: &LandingInput<'_>,
    footer: Option<&AgentPreviewFooter>,
) -> Vec<u8> {
    let fallback = AgentPreviewFooter::default();
    render_body(input, Some(footer.unwrap_or(&fallback)), false)
}

/// Repaint just the provisional footer while the real Agent's chip finishes its fill.
/// Child/editor rows remain owned by the real frame; cached links and gutters stay intact.
pub fn render_agent_preview_footer(
    input: &LandingInput<'_>,
    footer: Option<&AgentPreviewFooter>,
) -> Vec<u8> {
    let fallback = AgentPreviewFooter::default();
    render_body(input, Some(footer.unwrap_or(&fallback)), true)
}

/// Cold fallback when no actual Agent footer exists yet; the owned shell renders the footer
/// inside one cell at either side. Cached complete footer rows always take precedence.
fn preview_status_row(footer: &AgentPreviewFooter, columns: usize, truecolor: bool) -> String {
    if columns <= 2 { return " ".repeat(columns); }
    let gutter = 1;
    let content = preview_status_content(footer, columns - gutter * 2, truecolor);
    format!("{}{}{}", " ".repeat(gutter), content, " ".repeat(gutter))
}

fn preview_status_content(footer: &AgentPreviewFooter, columns: usize, truecolor: bool) -> String {
    if columns == 0 {
        return String::new();
    }
    let left = format!(
        "{}0.0%/{}{}",
        if footer.subscription { "$0.000 (sub) " } else { "" },
        footer.context,
        if footer.auto { " (auto)" } else { "" }
    );
    let suffix = footer
        .thinking
        .as_ref()
        .map(|(text, _)| format!(" • {text}"))
        .unwrap_or_default();
    let right = format!("{}{}", footer.model, suffix);
    let right_width = UnicodeWidthStr::width(right.as_str());
    if right_width >= columns {
        return format!("{}{}\x1b[0m", foreground(DIM, truecolor), clip(&right, columns));
    }
    let left = clip(&left, columns.saturating_sub(right_width + 2));
    let left_width = UnicodeWidthStr::width(left.as_str());
    let separator = " ".repeat(columns - left_width - right_width);
    let model = format!("{}{}", foreground(DIM, truecolor), footer.model);
    let thinking = footer
        .thinking
        .as_ref()
        .map(|(text, rgb)| {
            format!(
                "{} • {}{}",
                foreground(DIM, truecolor),
                foreground(*rgb, truecolor),
                text
            )
        })
        .unwrap_or_default();
    format!(
        "{}{}{}{}{}\x1b[0m",
        foreground(DIM, truecolor),
        left,
        separator,
        model,
        thinking
    )
}

fn render_body(input: &LandingInput<'_>, footer: Option<&AgentPreviewFooter>, footer_only: bool) -> Vec<u8> {
    let columns = usize::from(input.columns);
    let body_rows = usize::from(input.body_rows);
    let fg = |rgb| foreground(rgb, input.truecolor);
    let mut rows = vec![String::new(); body_rows];
    let mut place = |row: usize, content: String| {
        if let Some(slot) = rows.get_mut(row) {
            slot.push_str(&content);
        }
    };
    let cwd_row = body_rows.saturating_sub(2);
    let actual = footer.and_then(|footer| footer.actual.as_ref())
        .filter(|actual| actual.columns == input.columns && body_rows >= 2);
    if body_rows > 0 && actual.is_none() && (footer.is_none() || columns > 2) {
        let gutter = usize::from(footer.is_some());
        place(cwd_row, format!("{}{}{}\x1b[0m", " ".repeat(gutter), fg(DIM),
            clip_left(input.cwd, columns - gutter * 2)));
    }
    if let Some(footer) = footer {
        // Invariant: the real empty editor is three rows above its two-row footer. In a short terminal
        // preserve the footer and show as much of the editor as fits above it.
        let editor_rows = cwd_row.min(3);
        let first = cwd_row - editor_rows;
        let border = format!(
            "{}{}\x1b[0m",
            fg(accent_colors(input.accent).border),
            "─".repeat(columns)
        );
        if editor_rows == 3 {
            place(first, border.clone());
        }
        if editor_rows >= 2 {
            place(cwd_row - 1, border);
            place(cwd_row - 2, "\x1b[7m \x1b[27m".into());
        }
        if cwd_row + 1 < body_rows && actual.is_none() {
            place(cwd_row + 1, preview_status_row(footer, columns, input.truecolor));
        }
    } else {
        // Rationale: the wordmark already names a1, so the row below the cwd carries only the version.
        if let Some(version) = input.version.filter(|version| !version.is_empty())
            && cwd_row + 1 < body_rows
        {
            let version = clip(&format!("v{version}"), columns);
            place(cwd_row + 1, format!("{}{version}\x1b[0m", fg(DIM)));
        }
        if input.half_blocks && cwd_row >= WORDMARK.len() {
            let accent = fg(accent_colors(input.accent).accent);
            for (offset, line) in WORDMARK.iter().enumerate() {
                let row = cwd_row - WORDMARK.len() + offset;
                place(row, wordmark_row(line, &accent, columns));
            }
        }
    }

    // Invariant: a painted canvas fills every cell and survives each run's style reset, so the
    // landing matches the Agent canvas that replaces it.
    let canvas = input.background.map(|rgb| background(rgb, input.truecolor));
    let mut bytes = String::new();
    for (index, content) in rows.iter().enumerate().skip(if footer_only { cwd_row } else { 0 }) {
        let row = index + 2;
        bytes.push_str(&format!("\x1b[{row};1H\x1b[0m\x1b[2K"));
        if let Some(canvas) = canvas.as_deref() {
            let content = content.replace("\x1b[0m", &format!("\x1b[0m{canvas}"));
            let fill = " ".repeat(columns);
            bytes.push_str(&format!("{canvas}{fill}\x1b[{row};1H{canvas}{content}"));
        } else {
            bytes.push_str(content);
        }
    }
    bytes.push_str("\x1b[0m");
    let mut output = bytes.into_bytes();
    if let Some(actual) = actual {
        let mut footer_bytes = Vec::new();
        for (row_index, row) in [(cwd_row, &actual.path), (cwd_row + 1, &actual.status)] {
            if super::presentation::render_surface_row(&mut footer_bytes, row, row_index,
                input.columns, &actual.styles, &actual.links).is_err() {
                let mut fallback = footer.cloned().unwrap_or_default();
                fallback.actual = None;
                return render_body(input, Some(&fallback), footer_only);
            }
        }
        output.extend(footer_bytes);
    }
    output
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

    fn input(columns: u16, rows: u16) -> LandingInput<'static> {
        LandingInput {
            columns,
            body_rows: rows,
            version: Some("0.2.7"),
            accent: None,
            truecolor: true,
            half_blocks: true,
            cwd: "~/src/a1",
            background: None,
        }
    }

    #[test]
    fn the_cwd_sits_where_the_agent_footer_shows_it_with_the_version_below_and_logo_above() {
        let grid = cells(&render(&input(80, 23)), 80, 23);
        assert!(grid[..18].iter().all(String::is_empty), "{grid:#?}");
        assert_eq!(grid[18], WORDMARK[0].trim_end());
        assert_eq!(grid[19], WORDMARK[1].trim_end());
        assert_eq!(grid[20], WORDMARK[2].trim_end());
        assert_eq!(
            grid[21], "~/src/a1",
            "the second-to-last body row, flush left"
        );
        assert_eq!(grid[22], "v0.2.7");
        // Invariant: the landing's a starts one cell in while the Agent caret remains at column zero.
        assert!(grid[19].starts_with(" ▀"), "the a has no protruding left block");
    }

    #[test]
    fn held_pending_footer_paints_only_the_two_bottom_rows() {
        let wide = input(80, 23);
        let footer = String::from_utf8(render_agent_preview_footer(&wide, None)).unwrap();
        assert!(footer.contains("\x1b[23;1H") && footer.contains("\x1b[24;1H"));
        assert!(!footer.contains("\x1b[22;1H") && !footer.contains("\x1b[7m"));
        assert!(footer.contains("~/src/a1") && footer.contains("no-model"));
        let short = String::from_utf8(render_agent_preview_footer(&input(8, 3), None)).unwrap();
        assert!(short.contains("\x1b[3;1H") && short.contains("\x1b[4;1H"));
        assert!(!short.contains("\x1b[2;1H"));
    }

    #[test]
    fn pending_agent_shows_a_plain_editor_and_cwd_without_startup_text_or_cursor() {
        let grid = cells(&render_agent_preview(&input(80, 23), None), 80, 23);
        assert!(grid[..18].iter().all(String::is_empty), "{grid:#?}");
        assert_eq!(grid[18], "─".repeat(80));
        assert_eq!(grid[19], "", "the inverse-space caret has no text content");
        assert_eq!(grid[20], "─".repeat(80));
        assert_eq!(grid[21], " ~/src/a1");
        assert!(grid[22].starts_with(" 0.0%/0 (auto)"), "{grid:#?}");
        assert!(grid[22].ends_with("no-model"), "{grid:#?}");
        let short = cells(&render_agent_preview(&input(8, 3), None), 8, 3);
        assert_eq!(short, ["", " …rc/a1", " no-mod"]);
        let tiny = cells(&render_agent_preview(&input(2, 1), None), 2, 1);
        assert_eq!(tiny, [""]);
        assert_eq!(cells(&render_agent_preview(&input(1, 3), None), 1, 3), ["", "", ""]);
        let painted = String::from_utf8(render_agent_preview(&LandingInput {
            background: Some([26, 27, 28]),
            accent: Some("blue"),
            ..input(80, 23)
        }, None))
        .unwrap();
        assert!(painted.contains("\x1b[7m \x1b[27m"), "the visual caret is present");
        assert!(!painted.contains("Starting Agent") && !painted.contains("Preparing"));
        assert!(!painted.contains("\x1b[?25h"));
        assert!(painted.contains("\x1b[48;2;26;27;28m"));
        assert!(painted.contains("\x1b[38;2;116;102;197m"));
        for row in 2..=24 {
            assert!(painted.contains(&format!("\x1b[{row};1H\x1b[0m\x1b[2K")));
        }
        let palette = String::from_utf8(render_agent_preview(&LandingInput {
            truecolor: false,
            ..input(80, 23)
        }, None))
        .unwrap();
        assert!(palette.contains("\x1b[38;5;") && !palette.contains("38;2;"));
    }

    #[test]
    fn every_body_row_is_cleared_and_small_terminals_keep_the_cwd() {
        let bytes = String::from_utf8(render(&input(80, 23))).unwrap();
        for row in 2..=24 {
            assert!(bytes.contains(&format!("\x1b[{row};1H\x1b[0m\x1b[2K")));
        }
        let short = cells(&render(&input(40, 3)), 40, 3);
        assert_eq!(
            short,
            ["", "~/src/a1", "v0.2.7"],
            "no room for the wordmark"
        );
        assert_eq!(cells(&render(&input(40, 1)), 40, 1), ["~/src/a1"]);
        let narrow = cells(&render(&input(6, 23)), 6, 23);
        assert_eq!(narrow[21], "…rc/a1");
    }

    #[test]
    fn accents_palette_fallback_text_header_and_missing_version() {
        let blue = String::from_utf8(render(&LandingInput {
            accent: Some("blue"),
            ..input(80, 23)
        }))
        .unwrap();
        assert!(blue.contains("\x1b[38;2;130;160;241m ▀▀▀▄"));
        let palette = String::from_utf8(render(&LandingInput {
            truecolor: false,
            ..input(80, 23)
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
                ..input(80, 23)
            }),
            80,
            23,
        );
        assert!(plain.iter().all(|row| !row.contains('▀')));
        assert_eq!(plain[21..], ["~/src/a1", "v0.2.7"]);
        let unversioned = cells(
            &render(&LandingInput {
                version: None,
                ..input(80, 23)
            }),
            80,
            23,
        );
        assert!(unversioned[22].is_empty(), "no version, no version row");
    }

    #[test]
    fn the_canvas_follows_the_background_style_and_fills_every_cell() {
        assert_eq!(canvas_background(Some("transparent"), Some("blue")), None);
        assert_eq!(canvas_background(None, None), None);
        assert_eq!(
            canvas_background(Some("dark"), Some("blue")),
            Some(LANDING_DARK_CANVAS)
        );
        assert_eq!(
            canvas_background(Some("accent"), Some("blue")),
            Some([25, 27, 32])
        );
        assert_eq!(canvas_background(Some("accent"), None), Some([27, 26, 32]));
        let painted = String::from_utf8(render(&LandingInput {
            background: Some([25, 27, 32]),
            ..input(80, 23)
        }))
        .unwrap();
        let canvas = "[48;2;25;27;32m";
        assert!(painted.contains(&format!("[2;1H[0m[2K{canvas}{}", " ".repeat(80))));
        assert!(
            !painted.contains("[0m[38") && painted.contains(&format!("[0m{canvas}")),
            "every reset inside a row restores the canvas"
        );
        let plain = String::from_utf8(render(&input(80, 23))).unwrap();
        assert!(
            !plain.contains("[48;"),
            "a transparent landing paints no background"
        );
        let palette = String::from_utf8(render(&LandingInput {
            background: Some([25, 27, 32]),
            truecolor: false,
            ..input(80, 23)
        }))
        .unwrap();
        assert!(palette.contains(&format!("[48;5;{}m", palette_index([25, 27, 32]))));
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
        let rgb_of = |value: &serde_json::Value| {
            let values = value.as_array().unwrap();
            [0, 1, 2].map(|index| values[index].as_u64().unwrap() as u8)
        };
        for (name, canvas) in LANDING_ACCENT_CANVASES {
            assert_eq!(rgb_of(&accents[name]["canvas"]), canvas, "{name} canvas");
        }
        assert_eq!(rgb_of(&fixture["darkCanvas"]), LANDING_DARK_CANVAS);
        let dim = fixture["dim"].as_array().unwrap();
        assert_eq!(
            [0, 1, 2].map(|index| dim[index].as_u64().unwrap() as u8),
            DIM
        );
    }

    #[test]
    fn the_landing_composes_under_either_strip_with_no_cursor() {
        use crate::roles::presentation::{DesiredPresentation, FinalCursor, PresentationComposer};
        let desired = |offset: u16| DesiredPresentation {
            tab_id: None,
            incarnation: 0,
            revision: 0,
            geometry_generation: 0,
            strip: "strip".into(),
            structured: None,
            legacy_body: render(&input(80, 23)),
            overlay: None,
            cursor: Some(FinalCursor::Hidden),
            modes: None,
            columns: 80,
            outer_rows: 24,
            child_row_offset: offset,
            clear: false,
            dimmed: false,
        };
        let composer = PresentationComposer::default();
        let top = String::from_utf8(composer.prepare(&desired(1)).unwrap().unwrap().bytes).unwrap();
        assert!(
            top.contains("\x1b[2J"),
            "the last-tab close clears the prior surface once"
        );
        assert!(
            top.contains("\x1b[23;1H\x1b[0m\x1b[2K\x1b["),
            "the cwd on child row 21"
        );
        assert!(top.ends_with("\x1b[?25l\x1b[?2026l"), "no cursor shows");
        let bottom =
            String::from_utf8(composer.prepare(&desired(0)).unwrap().unwrap().bytes).unwrap();
        assert!(
            bottom.contains("\x1b[22;1H\x1b[0m\x1b[2K\x1b["),
            "above a bottom strip the cwd moves with the child rows"
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
        assert_eq!(
            display_cwd(r"C:\Users\me\src\a1", Some(r"C:\Users\me\")),
            r"~\src\a1",
            "the footer keeps native separators"
        );
        assert_eq!(clip_left("~/src/project/a1", 8), "…ject/a1");
        assert_eq!(clip_left("a1", 8), "a1");
    }
}
