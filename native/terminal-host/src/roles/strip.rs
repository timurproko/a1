use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use crate::core::attach::PENDING_AGENT_ID;

// Compatibility: preserve the historical timing constant; the sweep now uses accent shades.
pub const TITLE_RAINBOW_MS: u128 = 600;
pub const TITLE_TYPE_MS_PER_CHAR: u128 = 45;
pub const TITLE_SETTLE_MS: u128 = 300;
pub const TAB_SPINNER_FRAMES: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
pub const TAB_SPINNER_MS: u64 = 80;
/// The selected chip fills independently of the immediately committed Agent surface.
pub const CHIP_FILL_MS: u128 = 360;
const DEFAULT_ACTIVE_ACCENT: &str = "blue";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChipFill {
    pub tab_id: String,
    pub started_at: Instant,
}

pub fn fill_active(fill: &ChipFill, now: Instant) -> bool {
    now.saturating_duration_since(fill.started_at).as_millis() < CHIP_FILL_MS
}

use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StripTab {
    pub id: String,
    pub name: String,
    pub name_source: String,
    pub status: String,
    pub accent: Option<String>,
    pub title_animation: Option<TitleAnimation>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TitleAnimation {
    pub from: String,
    pub started_at: Instant,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimeFormat {
    TwentyFour,
    Twelve,
}

impl TimeFormat {
    pub fn from_setting(value: Option<&str>) -> Self {
        if value == Some("20:00") {
            Self::TwentyFour
        } else {
            Self::Twelve
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StripHover {
    Tab(String),
    Overflow,
    New,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StripRename {
    pub tab_id: String,
    pub text: String,
    pub cursor: usize,
    pub selection: Option<(usize, usize)>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StripHit {
    View(String),
    Overflow,
    New,
}

#[derive(Debug, Clone)]
pub struct StripFrame {
    pub bytes: String,
    pub hits: Vec<(u16, u16, StripHit)>,
    pub hidden_tabs: Vec<String>,
}

fn clean(value: &str) -> String {
    value.chars().filter(|ch| !ch.is_control()).collect()
}

fn truncate(value: &str, width: usize) -> String {
    if UnicodeWidthStr::width(value) <= width {
        return value.to_owned();
    }
    if width == 0 {
        return String::new();
    }
    let mut result = String::new();
    let mut used = 0;
    for grapheme in value.graphemes(true) {
        let next = UnicodeWidthStr::width(grapheme);
        if used + next + 1 > width {
            break;
        }
        result.push_str(grapheme);
        used += next;
    }
    result.push('…');
    result
}

fn tab_spinner_frame_at(elapsed_ms: u128) -> &'static str {
    TAB_SPINNER_FRAMES
        [(elapsed_ms / u128::from(TAB_SPINNER_MS)) as usize % TAB_SPINNER_FRAMES.len()]
}

pub fn tab_spinner_frame() -> &'static str {
    tab_spinner_frame_at(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
    )
}

fn status_glyph_at(status: &str, elapsed_ms: u128) -> String {
    match status {
        // Invariant: a starting tab shows no glyph; it opens as plainly as its UI appears.
        "restoring" | "working" => tab_spinner_frame_at(elapsed_ms).into(),
        "needs-input" => "?".into(),
        "degraded" => "!".into(),
        "done" | "done-unseen" => "✓".into(),
        "restarting" => "↻".into(),
        "aborted" | "error" | "crashed" | "failed" | "ended" => "✗".into(),
        _ => String::new(),
    }
}

/// Whether a status shows a glyph before the chip title.
pub fn status_has_glyph(status: &str) -> bool {
    !status_glyph_at(status, 0).is_empty()
}

fn status_glyph(status: &str) -> String {
    status_glyph_at(
        status,
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
    )
}

/// Renders the chip's live status glyph in a reserved popup cell, restoring the menu foreground.
pub fn popup_status_icon(status: &str, value: Option<&str>, truecolor: bool) -> String {
    let glyph = status_glyph(status);
    if glyph.is_empty() {
        return " ".into();
    }
    let color = if truecolor {
        accent(status, value)
    } else {
        let palette = match status {
            "needs-input" | "degraded" => 221,
            "done" | "done-unseen" => 78,
            "aborted" | "error" | "crashed" | "failed" | "ended" => 203,
            "working" => match value.unwrap_or("purple") {
                "blue" => 69,
                "cyan" => 73,
                "green" => 72,
                "orange" => 215,
                "pink" => 175,
                _ => 140,
            },
            _ => 248,
        };
        return format!("\x1b[38;5;{palette}m{glyph}\x1b[38;5;15m");
    };
    format!("{color}{glyph}\x1b[38;2;255;255;255m")
}

fn accent(status: &str, value: Option<&str>) -> &'static str {
    if status != "working" {
        return match status {
            "needs-input" | "degraded" => "\x1b[38;2;224;175;70m",
            "done" | "done-unseen" => "\x1b[38;2;90;190;120m",
            "aborted" | "error" | "crashed" | "failed" | "ended" => "\x1b[38;2;225;90;90m",
            _ => "\x1b[38;2;170;170;170m",
        };
    }
    match value.unwrap_or("purple") {
        "blue" => "\x1b[38;2;91;141;239m",
        "cyan" => "\x1b[38;2;74;174;196m",
        "green" => "\x1b[38;2;88;183;132m",
        "orange" => "\x1b[38;2;226;159;72m",
        "pink" => "\x1b[38;2;218;112;158m",
        _ => "\x1b[38;2;167;152;215m",
    }
}

fn tab_accent(value: Option<&str>) -> Rgb {
    match value.unwrap_or("purple") {
        "blue" => Rgb(91, 141, 239),
        "cyan" => Rgb(74, 174, 196),
        "green" => Rgb(88, 183, 132),
        "orange" => Rgb(226, 159, 72),
        "pink" => Rgb(218, 112, 158),
        _ => Rgb(167, 152, 215),
    }
}

fn tab_secondary_accent(value: Option<&str>) -> Rgb {
    // Protocol: these are the dark-theme secondaryHeading colors from
    // derivePiAccentProjection(tab_accent(value), "dark") in the owned Pi theme.
    match value.unwrap_or("purple") {
        "blue" => Rgb(55, 187, 211),
        "cyan" => Rgb(74, 211, 160),
        "green" => Rgb(166, 202, 62),
        "orange" => Rgb(214, 204, 64),
        "pink" => Rgb(245, 145, 130),
        _ => Rgb(239, 160, 197),
    }
}

fn tint(base: u8, color: Rgb, percent: u16) -> Rgb {
    let channel =
        |value: u8| ((u16::from(base) * (100 - percent) + u16::from(value) * percent) / 100) as u8;
    Rgb(channel(color.0), channel(color.1), channel(color.2))
}

fn tint_palette(color: Rgb) -> u8 {
    match color {
        Rgb(91, 141, 239) => 60,
        Rgb(74, 174, 196) => 23,
        Rgb(88, 183, 132) => 22,
        Rgb(226, 159, 72) => 58,
        Rgb(218, 112, 158) => 53,
        _ => 60,
    }
}

fn tinted_background(color: Rgb, truecolor: bool) -> String {
    if !truecolor {
        return format!("\x1b[48;5;{}m", tint_palette(color));
    }
    let Rgb(red, green, blue) = tint(55, color, 24);
    format!("\x1b[48;2;{red};{green};{blue}m")
}

const SETTLED_FG: Rgb = Rgb(170, 170, 170);
const STRIP_ROW_BACKGROUND: &str = "\x1b[48;2;20;20;20m";
const STRIP_ROW_BACKGROUND_PALETTE: &str = "\x1b[48;5;233m";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rgb(pub u8, pub u8, pub u8);

/// One rendered title transition frame; `text` may carry styling that never counts toward `width`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TitleFrame {
    pub text: String,
    pub width: usize,
    pub done: bool,
}

fn mix(from: Rgb, to: Rgb, progress: f64) -> Rgb {
    let t = progress.clamp(0.0, 1.0);
    let channel = |a: u8, b: u8| (f64::from(a) + (f64::from(b) - f64::from(a)) * t).round() as u8;
    Rgb(
        channel(from.0, to.0),
        channel(from.1, to.1),
        channel(from.2, to.2),
    )
}

fn accent_shade(accent: Rgb, index: usize, offset: f64) -> Rgb {
    // Invariant: the wave changes only brightness; every animated cell stays in the tab's
    // accent family, including when the accent changes while a rename is in progress.
    let wave = (index as f64 * 0.7 - offset).cos();
    mix(accent, Rgb(235, 235, 235), 0.18 + (wave + 1.0) * 0.16)
}

fn padded(graphemes: &[&str], width: usize) -> Vec<String> {
    let mut cells = graphemes
        .iter()
        .map(|value| (*value).to_owned())
        .collect::<Vec<_>>();
    let used = graphemes
        .iter()
        .map(|value| UnicodeWidthStr::width(*value))
        .sum::<usize>();
    cells.extend(std::iter::repeat_n(
        " ".to_owned(),
        width.saturating_sub(used),
    ));
    cells
}

// Invariant: styling is applied after clipping and padding, so escapes never change width or hits.
fn colorize(cells: &[String], color_at: impl Fn(usize) -> Rgb) -> String {
    let mut text = String::new();
    for (index, cell) in cells.iter().enumerate() {
        let Rgb(red, green, blue) = color_at(index);
        text.push_str(&format!("\x1b[38;2;{red};{green};{blue}m{cell}"));
    }
    text
}

/// Total duration of an automatic title transition to the already clipped `to` title.
fn title_duration(to: &str, truecolor: bool) -> u128 {
    let typing = to.graphemes(true).count() as u128 * TITLE_TYPE_MS_PER_CHAR;
    if truecolor {
        TITLE_RAINBOW_MS + typing + TITLE_SETTLE_MS
    } else {
        typing
    }
}

/// Deterministic title transition: a tonal accent wave over the old title, accent typewriter
/// reveal, then a settle to foreground gray; without truecolor only typing remains.
pub fn title_frame(
    from: &str,
    to: &str,
    elapsed: u128,
    max_width: usize,
    truecolor: bool,
) -> TitleFrame {
    title_frame_accent(from, to, elapsed, max_width, truecolor, None)
}

fn title_frame_accent(
    from: &str,
    to: &str,
    elapsed: u128,
    max_width: usize,
    truecolor: bool,
    accent: Option<&str>,
) -> TitleFrame {
    let accent = tab_secondary_accent(accent);
    let from = truncate(&clean(from), max_width);
    let to = truncate(&clean(to), max_width);
    let to_width = UnicodeWidthStr::width(to.as_str());
    let stable = UnicodeWidthStr::width(from.as_str()).max(to_width);
    let target = to.graphemes(true).collect::<Vec<_>>();
    let typing_duration = target.len() as u128 * TITLE_TYPE_MS_PER_CHAR;
    let finished = TitleFrame {
        text: to.clone(),
        width: to_width,
        done: true,
    };
    let typed = |typing: u128| {
        let count = ((typing / TITLE_TYPE_MS_PER_CHAR) + 1).min(target.len() as u128) as usize;
        padded(&target[..count], stable)
    };
    let active = |text: String| TitleFrame {
        text,
        width: stable,
        done: false,
    };
    if !truecolor {
        if elapsed >= typing_duration {
            return finished;
        }
        return active(typed(elapsed).concat());
    }
    if elapsed < TITLE_RAINBOW_MS {
        let cells = padded(&from.graphemes(true).collect::<Vec<_>>(), stable);
        let offset = elapsed as f64 / 170.0;
        return active(colorize(&cells, |index| {
            accent_shade(accent, index, offset)
        }));
    }
    let typing = elapsed - TITLE_RAINBOW_MS;
    if typing < typing_duration {
        return active(colorize(&typed(typing), |index| {
            accent_shade(accent, index, 0.0)
        }));
    }
    let settle = typing - typing_duration;
    if settle < TITLE_SETTLE_MS {
        let progress = settle as f64 / TITLE_SETTLE_MS as f64;
        let cells = padded(&target, stable);
        return active(colorize(&cells, |index| {
            mix(accent_shade(accent, index, 0.0), SETTLED_FG, progress)
        }));
    }
    finished
}

/// Keep an active transition across unchanged refreshes; only an automatic rename starts one.
pub fn reconcile_title_animation(
    previous: Option<&StripTab>,
    name: &str,
    name_source: &str,
    now: Instant,
) -> Option<TitleAnimation> {
    let previous = previous?;
    if previous.name == name {
        return previous.title_animation.clone();
    }
    (name_source == "auto").then(|| TitleAnimation {
        from: previous.name.clone(),
        started_at: now,
    })
}

fn chip_fixed_width() -> usize {
    // Invariant: the icon column stays reserved when a tab changes status.
    4
}

/// The owned editor's selection background; selected text keeps its own color over it.
fn selection_background(truecolor: bool) -> &'static str {
    if truecolor {
        "\x1b[48;2;38;79;120m"
    } else {
        "\x1b[48;5;24m"
    }
}

/// The rename prompt's title. `chip` is the chip's own background and text style, restored after
/// a selected grapheme.
fn rename_title(rename: &StripRename, max_width: usize, truecolor: bool, chip: &str) -> TitleFrame {
    let graphemes = clean(&rename.text)
        .graphemes(true)
        .map(str::to_owned)
        .collect::<Vec<_>>();
    let cursor = rename.cursor.min(graphemes.len());
    let room = max_width.saturating_sub(1).max(1);
    let mut start = 0usize;
    let width_between = |left: usize, right: usize| {
        graphemes[left..right]
            .iter()
            .map(|value| UnicodeWidthStr::width(value.as_str()))
            .sum::<usize>()
    };
    while start < cursor && width_between(start, cursor) > room {
        start += 1;
    }
    let mut end = start;
    let mut visible_width = 0usize;
    while let Some(grapheme) = graphemes.get(end) {
        let next = UnicodeWidthStr::width(grapheme.as_str());
        if visible_width + next > room {
            break;
        }
        visible_width += next;
        end += 1;
    }
    let selection = rename.selection.map(|(left, right)| {
        (
            left.min(right).min(graphemes.len()),
            left.max(right).min(graphemes.len()),
        )
    });
    let mut text = String::new();
    let mut width = 0usize;
    for (index, grapheme) in graphemes[start..end].iter().enumerate() {
        let absolute = start + index;
        let selected = selection.is_some_and(|(left, right)| absolute >= left && absolute < right);
        let pointed = selection.is_none() && absolute == cursor;
        if selected {
            text.push_str(selection_background(truecolor));
        } else if pointed {
            text.push_str("\x1b[7m");
        }
        text.push_str(grapheme);
        if selected {
            text.push_str(chip);
        } else if pointed {
            text.push_str("\x1b[27m");
        }
        width += UnicodeWidthStr::width(grapheme.as_str());
    }
    if selection.is_none() && cursor >= end && width < max_width {
        text.push_str("\x1b[7m \x1b[27m");
        width += 1;
    }
    TitleFrame {
        text,
        width: width.min(max_width),
        done: true,
    }
}

fn chip_title(
    tab: &StripTab,
    max_width: usize,
    now: Instant,
    truecolor: bool,
    rename: Option<&StripRename>,
    chip: &str,
) -> TitleFrame {
    if let Some(rename) = rename.filter(|rename| rename.tab_id == tab.id) {
        return rename_title(rename, max_width, truecolor, chip);
    }
    let elapsed = tab.title_animation.as_ref().map(|animation| {
        now.saturating_duration_since(animation.started_at)
            .as_millis()
    });
    match (&tab.title_animation, elapsed) {
        (Some(animation), Some(elapsed)) => title_frame_accent(
            &animation.from,
            &tab.name,
            elapsed,
            max_width,
            truecolor,
            tab.accent.as_deref(),
        ),
        _ => {
            let text = truncate(&clean(&tab.name), max_width);
            TitleFrame {
                width: UnicodeWidthStr::width(text.as_str()),
                text,
                done: true,
            }
        }
    }
}

fn chip(
    tab: &StripTab,
    active: bool,
    hovered: bool,
    now: Instant,
    truecolor: bool,
    rename: Option<&StripRename>,
    target_width: Option<usize>,
    active_accent: &str,
    fill: Option<&ChipFill>,
) -> (String, usize) {
    let glyph = status_glyph(&tab.status);
    let icon = if glyph.is_empty() { " " } else { &glyph };
    let fixed = chip_fixed_width();
    let active_color = tab_accent(Some(active_accent));
    let selected_color = if tab.id == PENDING_AGENT_ID {
        mix(active_color, Rgb(255, 255, 255), 0.42)
    } else {
        active_color
    };
    let background = if active {
        format!(
            "{}\x1b[38;2;255;255;255m",
            tinted_background(selected_color, truecolor)
        )
    } else if hovered {
        "\x1b[48;2;48;48;48m\x1b[38;2;170;170;170m".to_owned()
    } else {
        "\x1b[48;2;38;38;38m\x1b[38;2;170;170;170m".to_owned()
    };
    let title = chip_title(
        tab,
        target_width.unwrap_or(20).saturating_sub(fixed),
        now,
        truecolor,
        rename,
        &background,
    );
    let name = title.text;
    let width = target_width.unwrap_or(fixed + title.width);
    let padding = " ".repeat(width.saturating_sub(fixed + title.width));
    let glyph_color = accent(&tab.status, tab.accent.as_deref());
    let body = format!(" {glyph_color}{icon}\x1b[39m {name}{padding} ");
    let text = if active && truecolor && rename.is_none()
        && let Some(fill) = fill.filter(|fill| fill.tab_id == tab.id && fill_active(fill, now))
    {
        let elapsed = now.saturating_duration_since(fill.started_at).as_millis();
        let filled = width * elapsed as usize / CHIP_FILL_MS as usize;
        let pending = tinted_background(mix(active_color, Rgb(255, 255, 255), 0.42), true);
        let selected = tinted_background(active_color, true);
        format!("{}\x1b[0m", sweep_background(&body, filled, &selected, &pending))
    } else {
        format!("{background}{body}\x1b[0m")
    };
    (text, width)
}

/// Paint whole display graphemes under one background switch; SGR title/glyph foreground
/// sequences pass through unchanged and never consume chip width or pointer cells.
fn sweep_background(body: &str, filled: usize, selected: &str, pending: &str) -> String {
    let mut output = format!("{}\x1b[38;2;255;255;255m", if filled == 0 { pending } else { selected });
    let mut visible = 0usize;
    let mut selected_side = filled > 0;
    let mut rest = body;
    while !rest.is_empty() {
        if rest.starts_with("\x1b[") && let Some(end) = rest.find('m') {
            output.push_str(&rest[..=end]);
            rest = &rest[end + 1..];
            continue;
        }
        let end = rest.find('\x1b').unwrap_or(rest.len()).max(1);
        let (segment, tail) = rest.split_at(end);
        for grapheme in segment.graphemes(true) {
            if selected_side && visible >= filled && UnicodeWidthStr::width(grapheme) > 0 {
                output.push_str(pending);
                selected_side = false;
            }
            output.push_str(grapheme);
            visible += UnicodeWidthStr::width(grapheme);
        }
        rest = tail;
    }
    output
}

pub fn render(tabs: &[StripTab], viewed: Option<&str>, columns: u16) -> StripFrame {
    render_configured(tabs, viewed, columns, None, TimeFormat::Twelve)
}

pub fn render_with_hover(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&StripHover>,
) -> StripFrame {
    render_configured(tabs, viewed, columns, hovered, TimeFormat::Twelve)
}

pub fn render_configured(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&StripHover>,
    time_format: TimeFormat,
) -> StripFrame {
    render_interactive(tabs, viewed, columns, hovered, time_format, None)
}

pub fn render_interactive(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&StripHover>,
    time_format: TimeFormat,
    rename: Option<&StripRename>,
) -> StripFrame {
    render_interactive_at(tabs, viewed, columns, hovered, time_format, rename, 1, true)
}

pub fn render_interactive_at(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&StripHover>,
    time_format: TimeFormat,
    rename: Option<&StripRename>,
    row: u16,
    plus: bool,
) -> StripFrame {
    render_interactive_filled_at(
        tabs, viewed, columns, hovered, time_format, rename, row, plus,
        DEFAULT_ACTIVE_ACCENT, None,
    )
}

/// Render a provisional-to-real chip fill without changing other strip callers or hit geometry.
#[allow(clippy::too_many_arguments)]
pub fn render_interactive_filled_at(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&StripHover>,
    time_format: TimeFormat,
    rename: Option<&StripRename>,
    row: u16,
    plus: bool,
    active_accent: &str,
    fill: Option<&ChipFill>,
) -> StripFrame {
    let mut frame = render_frame_filled(
        tabs,
        viewed,
        columns,
        hovered,
        time_format,
        rename,
        Instant::now(),
        !palette_fallback_requested(),
        plus,
        active_accent,
        fill,
    );
    if row != 1 {
        frame.bytes = frame
            .bytes
            .replacen("\x1b[1;1H", &format!("\x1b[{};1H", row.max(1)), 1);
    }
    frame
}

/// The strip's fixed RGB colors as their palette counterparts.
fn palette_fallback(mut bytes: String) -> String {
    for (rgb, palette) in [
        (STRIP_ROW_BACKGROUND, STRIP_ROW_BACKGROUND_PALETTE),
        ("\x1b[48;2;38;38;38m", "\x1b[48;5;235m"),
        ("\x1b[48;2;48;48;48m", "\x1b[48;5;236m"),
        ("\x1b[48;2;55;55;55m", "\x1b[48;5;237m"),
        ("\x1b[38;2;170;170;170m", "\x1b[38;5;248m"),
        ("\x1b[38;2;255;255;255m", "\x1b[38;5;15m"),
    ] {
        bytes = bytes.replace(rgb, palette);
    }
    bytes
}

#[cfg(test)]
fn render_frame(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&StripHover>,
    time_format: TimeFormat,
    rename: Option<&StripRename>,
    now: Instant,
    truecolor: bool,
    plus: bool,
) -> StripFrame {
    let active_accent = viewed
        .and_then(|id| tabs.iter().find(|tab| tab.id == id))
        .and_then(|tab| tab.accent.as_deref())
        .unwrap_or(DEFAULT_ACTIVE_ACCENT);
    render_frame_filled(
        tabs, viewed, columns, hovered, time_format, rename, now, truecolor, plus,
        active_accent, None,
    )
}

#[allow(clippy::too_many_arguments)]
fn render_frame_filled(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&StripHover>,
    time_format: TimeFormat,
    rename: Option<&StripRename>,
    now: Instant,
    truecolor: bool,
    plus: bool,
    active_accent: &str,
    fill: Option<&ChipFill>,
) -> StripFrame {
    let chip = |tab: &StripTab, active: bool, hovered: bool, target: usize| {
        chip(
            tab, active, hovered, now, truecolor, rename, Some(target), active_accent, fill,
        )
    };
    // Invariant: reserve controls before the clock on narrow rows. A disabled plus menu
    // hides `+` and gives its cells to the tabs.
    let plus_width = if plus { usize::from(columns).min(3) } else { 0 };
    let clock_text = clock_text(time_format);
    let clock = (usize::from(columns)
        >= UnicodeWidthStr::width(clock_text.as_str())
            + 1
            + plus_width
            + if tabs.is_empty() { 0 } else { 3 })
    .then_some(clock_text);
    let clock_reserve = clock
        .as_deref()
        .map_or(0, |text| UnicodeWidthStr::width(text) + 1);
    let available = usize::from(columns).saturating_sub(clock_reserve);
    let (selected, tab_width, overflow_width) = select_visible_chips(tabs, viewed, available, plus_width);

    let hidden_tabs = tabs
        .iter()
        .filter(|tab| !selected.iter().any(|visible| visible.id == tab.id))
        .map(|tab| tab.id.clone())
        .collect::<Vec<_>>();
    // Invariant: the strip starts from reset attributes, so a modal's faint backdrop that a cursor
    // restore brings back never lingers on the first chip; the reset gains the row background below.
    let mut bytes = String::from("\x1b[1;1H\x1b[0m");
    let mut hits = Vec::new();
    let mut column = 0u16;
    for tab in selected {
        let (text, width) = chip(
            tab,
            viewed == Some(tab.id.as_str()),
            hovered == Some(&StripHover::Tab(tab.id.clone())),
            tab_width,
        );
        bytes.push_str(&text);
        let end = column.saturating_add(width as u16);
        hits.push((column, end, StripHit::View(tab.id.clone())));
        column = end;
    }
    append_controls(
        &mut bytes,
        &mut hits,
        &mut column,
        hovered,
        overflow_width,
        plus_width,
    );
    let padding = usize::from(columns).saturating_sub(column as usize + clock_reserve);
    bytes.push_str(&" ".repeat(padding));
    if let Some(clock) = clock {
        bytes.push_str("\x1b[38;2;170;170;170m");
        bytes.push_str(&clock);
        bytes.push_str("\x1b[0m ");
    }
    // Invariant: every strip cell outside a chip carries the fixed row background, so neither the
    // child's default-background sync nor stale cells can show through to the right of `+`.
    bytes = bytes.replace("\x1b[0m", &format!("\x1b[0m{STRIP_ROW_BACKGROUND}"));
    bytes.push_str("\x1b[0m");
    if !truecolor {
        bytes = palette_fallback(bytes);
    }
    StripFrame {
        bytes,
        hits,
        hidden_tabs,
    }
}

/// Reserve the selected chip and controls before painting; width and hit targets never depend on animation.
fn select_visible_chips<'a>(
    tabs: &'a [StripTab], viewed: Option<&str>, available: usize, plus_width: usize,
) -> (Vec<&'a StripTab>, usize, usize) {
    let mut selected = Vec::new();
    let mut used = 0usize;
    // Rationale: share the shrink evenly before overflowing unreadable chips.
    let tab_width = if tabs.is_empty() { 20 } else {
        (available.saturating_sub(plus_width) / tabs.len())
            .clamp(12, 20).min(available.saturating_sub(plus_width))
    };
    let mut overflow = false;
    for tab in tabs {
        if tab_width > 0 && used + tab_width + plus_width <= available {
            selected.push(tab);
            used += tab_width;
        } else {
            overflow = true;
        }
    }
    if let Some(active) = viewed.and_then(|id| tabs.iter().find(|tab| tab.id == id))
        && tab_width > 0 && !selected.iter().any(|tab| tab.id == active.id)
    {
        overflow = true;
        while !selected.is_empty()
            && used + tab_width + plus_width + 3.min(available.saturating_sub(plus_width)) > available
        {
            selected.pop();
            used -= tab_width;
        }
        selected.push(active);
        used += tab_width;
    }
    let overflow_width = if overflow { 3.min(available.saturating_sub(plus_width)) } else { 0 };
    while !selected.is_empty() && used + overflow_width + plus_width > available {
        selected.pop();
        used -= tab_width;
    }
    (selected, tab_width, overflow_width)
}

fn append_controls(
    bytes: &mut String,
    hits: &mut Vec<(u16, u16, StripHit)>,
    column: &mut u16,
    hovered: Option<&StripHover>,
    overflow_width: usize,
    plus_width: usize,
) {
    if overflow_width > 0 {
        let background = if hovered == Some(&StripHover::Overflow) {
            "48;48;48"
        } else {
            "38;38;38"
        };
        let label = match overflow_width {
            1 => "⋯",
            2 => " ⋯",
            _ => " ⋯ ",
        };
        bytes.push_str(&format!(
            "\x1b[48;2;{background}m\x1b[38;2;170;170;170m{label}\x1b[0m"
        ));
        hits.push((
            *column,
            column.saturating_add(overflow_width as u16),
            StripHit::Overflow,
        ));
        *column = column.saturating_add(overflow_width as u16);
    }
    let plus_background = if hovered == Some(&StripHover::New) {
        "48;48;48"
    } else {
        "38;38;38"
    };
    let plus_label = match plus_width {
        0 => "",
        1 => "+",
        2 => " +",
        _ => " + ",
    };
    bytes.push_str(&format!(
        "\x1b[48;2;{plus_background}m\x1b[38;2;170;170;170m{plus_label}\x1b[0m"
    ));
    if plus_width > 0 {
        hits.push((
            *column,
            column.saturating_add(plus_width as u16),
            StripHit::New,
        ));
        *column = column.saturating_add(plus_width as u16);
    }
}

/// Whether host chrome uses the 256-color palette instead of direct RGB.
pub fn palette_fallback_requested() -> bool {
    if std::env::var("TERMINAL_HOST_COLOR_MODE").is_ok_and(|value| value == "palette") {
        return true;
    }
    // Platform: Windows Terminal renders direct RGB but does not export COLORTERM; the owned UI
    // recognizes it by WT_SESSION, so host chrome must too or menus fall back to palette grays.
    if std::env::var_os("WT_SESSION").is_some() {
        return false;
    }
    std::env::var("TERM").is_ok_and(|term| term.contains("256color"))
        && std::env::var("COLORTERM").map_or(true, |value| {
            !matches!(value.as_str(), "truecolor" | "24bit")
        })
}

pub fn animations_active(tabs: &[StripTab]) -> bool {
    tabs.iter().any(|tab| {
        matches!(tab.status.as_str(), "restoring" | "working") || title_animation_active(tab)
    })
}

/// Strip redraw cadence: title transitions need every 45 ms typewriter step, the spinner does not.
pub fn animation_interval(tabs: &[StripTab]) -> Duration {
    if tabs.iter().any(title_animation_active) {
        Duration::from_millis(15)
    } else {
        Duration::from_millis(TAB_SPINNER_MS)
    }
}

fn title_animation_active(tab: &StripTab) -> bool {
    tab.title_animation.as_ref().is_some_and(|animation| {
        let truecolor = !palette_fallback_requested();
        let to = truncate(
            &clean(&tab.name),
            20usize.saturating_sub(chip_fixed_width()),
        );
        animation.started_at.elapsed().as_millis() < title_duration(&to, truecolor)
    })
}

pub fn hit(frame: &StripFrame, column: u16) -> Option<&StripHit> {
    frame
        .hits
        .iter()
        .find(|(start, end, _)| column >= *start && column < *end)
        .map(|(_, _, hit)| hit)
}

fn clock_text(format: TimeFormat) -> String {
    #[cfg(test)]
    if let Some((hour, minute)) = tests::FIXED_CLOCK.with(|clock| clock.get()) {
        return format_clock(hour, minute, format);
    }
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let (hour, minute) = local_hour_minute(seconds);
    format_clock(hour, minute, format)
}

pub fn format_clock(hour: u32, minute: u32, format: TimeFormat) -> String {
    if format == TimeFormat::TwentyFour {
        return format!("{hour:02}:{minute:02}");
    }
    let suffix = if hour < 12 { "AM" } else { "PM" };
    let hour = match hour % 12 {
        0 => 12,
        value => value,
    };
    format!("{hour}:{minute:02} {suffix}")
}

#[cfg(unix)]
fn local_hour_minute(seconds: u64) -> (u32, u32) {
    let value = seconds as libc::time_t;
    let mut output = unsafe { std::mem::zeroed::<libc::tm>() };
    unsafe { libc::localtime_r(&value, &mut output) };
    (output.tm_hour as u32, output.tm_min as u32)
}

#[cfg(windows)]
fn local_hour_minute(_seconds: u64) -> (u32, u32) {
    use windows_sys::Win32::Foundation::SYSTEMTIME;
    use windows_sys::Win32::System::SystemInformation::GetLocalTime;
    let mut output = unsafe { std::mem::zeroed::<SYSTEMTIME>() };
    unsafe { GetLocalTime(&mut output) };
    (u32::from(output.wHour), u32::from(output.wMinute))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Concurrency: each test thread owns its clock; the guard restores it even during unwinding.
    thread_local! {
        pub(super) static FIXED_CLOCK: std::cell::Cell<Option<(u32, u32)>> = const { std::cell::Cell::new(None) };
    }
    struct FixedClock(Option<(u32, u32)>);
    impl Drop for FixedClock {
        fn drop(&mut self) {
            FIXED_CLOCK.with(|clock| clock.set(self.0));
        }
    }
    fn clock_at(hour: u32, minute: u32) -> FixedClock {
        FixedClock(FIXED_CLOCK.with(|clock| clock.replace(Some((hour, minute)))))
    }

    fn tab(id: &str, name: &str) -> StripTab {
        StripTab {
            id: id.into(),
            name: name.into(),
            name_source: "default".into(),
            status: "idle".into(),
            accent: None,
            title_animation: None,
        }
    }

    fn plain(value: &str) -> String {
        let mut output = String::new();
        let mut chars = value.chars().peekable();
        while let Some(ch) = chars.next() {
            if ch == '\x1b' {
                for next in chars.by_ref() {
                    if next.is_ascii_alphabetic() {
                        break;
                    }
                }
            } else {
                output.push(ch);
            }
        }
        output
    }

    fn truecolor_runs(value: &str) -> usize {
        value.matches("\x1b[38;2;").count()
    }

    const FROM: &str = "Agent";
    const TO: &str = "daemon crash";

    fn typing_end(to: &str) -> u128 {
        TITLE_RAINBOW_MS + to.graphemes(true).count() as u128 * TITLE_TYPE_MS_PER_CHAR
    }

    #[test]
    fn every_accent_has_a_distinct_provisional_and_real_selected_shade() {
        for (accent_name, _) in crate::roles::landing::LANDING_ACCENTS {
            let mut pending = tab(PENDING_AGENT_ID, "Agent");
            pending.accent = Some(accent_name.into());
            let mut real = tab("agent-2", "Agent");
            real.accent = Some(accent_name.into());
            let normal = tab_accent(Some(accent_name));
            let initializing = mix(normal, Rgb(255, 255, 255), 0.42);
            assert_ne!(initializing, normal, "{accent_name}");
            // Invariant: assert RGB chip shades regardless of the CI runner's terminal palette.
            let frame = |tab: StripTab, viewed: &str| render_frame(
                &[tab], Some(viewed), 80, None, TimeFormat::Twelve, None,
                Instant::now(), true, true,
            );
            let pending_frame = frame(pending, PENDING_AGENT_ID);
            let real_frame = frame(real, "agent-2");
            assert!(pending_frame.bytes.contains(&tinted_background(initializing, true)), "{accent_name}");
            assert!(real_frame.bytes.contains(&tinted_background(normal, true)), "{accent_name}");
            assert_ne!(tinted_background(initializing, true), tinted_background(normal, true), "{accent_name}");
        }
    }

    #[test]
    fn the_selected_chip_fills_left_to_right_for_every_accent_without_moving_hits() {
        let start = Instant::now();
        for (accent_name, _) in crate::roles::landing::LANDING_ACCENTS {
            let mut agent = tab("agent-2", "Agent");
            agent.accent = Some(accent_name.into());
            let tabs = [tab("older", "Older"), agent];
            let fill = ChipFill { tab_id: "agent-2".into(), started_at: start };
            let frame = |elapsed, columns, truecolor| render_frame_filled(
                &tabs, Some("agent-2"), columns, None, TimeFormat::Twelve, None,
                start + Duration::from_millis(elapsed), truecolor, true, accent_name, Some(&fill),
            );
            let pending = tinted_background(mix(tab_accent(Some(accent_name)), Rgb(255, 255, 255), 0.42), true);
            let active = tinted_background(tab_accent(Some(accent_name)), true);
            for columns in [28, 80] {
                let beginning = frame(0, columns, true);
                let middle = frame((CHIP_FILL_MS / 2) as u64, columns, true);
                let finished = frame(CHIP_FILL_MS as u64, columns, true);
                assert!(beginning.bytes.contains(&pending), "{accent_name}");
                assert!(middle.bytes.contains(&pending) && middle.bytes.contains(&active), "{accent_name}");
                assert!(finished.bytes.contains(&active) && !finished.bytes.contains(&pending), "{accent_name}");
                assert_eq!(beginning.hits, middle.hits, "{accent_name}");
                assert_eq!(beginning.hits, finished.hits, "{accent_name}");
                assert_eq!(plain(&beginning.bytes), plain(&finished.bytes));
                assert!(!frame((CHIP_FILL_MS / 2) as u64, columns, false).bytes.contains(&pending),
                    "palette mode snaps to its selected color");
            }
        }
    }

    #[test]
    fn the_fill_uses_the_shared_active_accent_instead_of_the_tabs_reported_accent() {
        let start = Instant::now();
        let mut agent = tab("agent-2", "Agent");
        agent.accent = Some("pink".into());
        let tabs = [agent];
        let fill = ChipFill { tab_id: "agent-2".into(), started_at: start };
        let frame = render_frame_filled(
            &tabs, Some("agent-2"), 80, None, TimeFormat::Twelve, None,
            start + Duration::from_millis((CHIP_FILL_MS / 2) as u64), true, true, "cyan",
            Some(&fill),
        );
        let cyan = tab_accent(Some("cyan"));
        assert!(frame.bytes.contains(&tinted_background(cyan, true)));
        assert!(frame.bytes.contains(&tinted_background(
            mix(cyan, Rgb(255, 255, 255), 0.42),
            true,
        )));
        assert!(!frame.bytes.contains(&tinted_background(tab_accent(Some("pink")), true)));
    }

    #[test]
    fn the_fill_respects_whole_wide_and_combining_graphemes_and_stops_on_switch() {
        let start = Instant::now();
        let fill = ChipFill { tab_id: "agent-2".into(), started_at: start };
        let active = "\x1b[48;2;20;30;40m";
        let pending = "\x1b[48;2;50;60;70m";
        let cells = sweep_background(" 文e\u{301} \x1b[38;2;1;2;3mA", 3, active, pending);
        assert!(cells.contains(&format!("{active}\x1b[38;2;255;255;255m 文{pending}e\u{301} ")));
        assert!(cells.contains("\x1b[38;2;1;2;3mA"));
        let mut tab = tab("agent-2", "文e\u{301}名");
        tab.accent = Some("green".into());
        let tabs = [tab];
        let render = |viewed, now| render_frame_filled(
            &tabs, viewed, 12, None, TimeFormat::Twelve, None, now, true, true, "green", Some(&fill),
        );
        assert_eq!(render(Some("agent-2"), start).hits, render(Some("agent-2"), start + Duration::from_millis(250)).hits);
        assert_eq!(render(Some("agent-2"), start + Duration::from_millis(CHIP_FILL_MS as u64)).hits,
            render(None, start + Duration::from_millis(250)).hits);
        assert!(!fill_active(&fill, start + Duration::from_millis(CHIP_FILL_MS as u64)));
        assert!(!render(None, start + Duration::from_millis(250)).bytes.contains(
            &tinted_background(mix(tab_accent(Some("green")), Rgb(255, 255, 255), 0.42), true)));
    }

    #[test]
    fn chip_fill_keeps_an_automatic_title_waves_foreground_and_geometry() {
        let started_at = Instant::now();
        let mut agent = tab("agent-2", "auth-fix");
        agent.accent = Some("cyan".into());
        agent.title_animation = Some(TitleAnimation { from: "Agent".into(), started_at });
        let tabs = [agent];
        let now = started_at + Duration::from_millis(180);
        let fill = ChipFill { tab_id: "agent-2".into(), started_at };
        let frame = |fill| render_frame_filled(&tabs, Some("agent-2"), 80, None,
            TimeFormat::Twelve, None, now, true, true, "cyan", fill);
        let stable = frame(None);
        let filling = frame(Some(&fill));
        assert_eq!(stable.hits, filling.hits);
        assert_eq!(plain(&stable.bytes), plain(&filling.bytes));
        assert!(filling.bytes.contains("\x1b[38;2;"), "the existing accent wave still styles the title");
        assert!(filling.bytes.contains(&tinted_background(tab_accent(Some("cyan")), true)));
    }

    #[test]
    fn tonal_wave_uses_each_tabs_secondary_accent() {
        for (name, expected) in [
            ("purple", Rgb(239, 160, 197)),
            ("blue", Rgb(55, 187, 211)),
            ("cyan", Rgb(74, 211, 160)),
            ("green", Rgb(166, 202, 62)),
            ("orange", Rgb(214, 204, 64)),
            ("pink", Rgb(245, 145, 130)),
        ] {
            assert_eq!(tab_secondary_accent(Some(name)), expected, "{name}");
        }
        let purple = title_frame_accent(FROM, TO, 0, 20, true, None);
        let cyan = title_frame_accent(FROM, TO, 0, 20, true, Some("cyan"));
        assert!(purple.text.starts_with("\x1b[38;2;237;198;216m"));
        assert!(cyan.text.starts_with("\x1b[38;2;155;223;198m"));
        assert_ne!(purple.text, cyan.text);
        assert!(!cyan.text.contains("\x1b[38;2;246;85;85m"));
        let changed = title_frame_accent(FROM, TO, 240, 20, true, Some("cyan"));
        assert_ne!(changed.text, cyan.text, "the tonal wave still moves");
    }

    #[test]
    fn configured_row_positions_the_complete_strip() {
        let frame = render_interactive_at(&[], None, 20, None, TimeFormat::Twelve, None, 24, true);
        assert!(frame.bytes.starts_with("\x1b[24;1H"));
        assert_eq!(plain(&frame.bytes).chars().count(), 20);
    }

    #[test]
    fn accent_wave_colors_each_old_title_cell_and_moves_over_time() {
        let first = title_frame(FROM, TO, 0, 20, true);
        assert!(!first.done);
        assert_eq!(plain(&first.text).trim_end(), FROM);
        assert_eq!(
            truecolor_runs(&first.text),
            plain(&first.text).chars().count()
        );
        assert!(first.text.starts_with("\x1b[38;2;237;198;216m"));
        let later = title_frame(FROM, TO, 240, 20, true);
        assert_eq!(plain(&later.text), plain(&first.text));
        assert_ne!(later.text, first.text);
    }

    #[test]
    fn accent_wave_switches_to_typing_at_the_exact_boundary() {
        assert_eq!(
            plain(&title_frame(FROM, TO, TITLE_RAINBOW_MS - 1, 20, true).text).trim_end(),
            FROM
        );
        let typing = title_frame(FROM, TO, TITLE_RAINBOW_MS, 20, true);
        assert_eq!(plain(&typing.text).trim_end(), "d");
        assert!(typing.text.starts_with("\x1b[38;2;237;198;216md"));
    }

    #[test]
    fn typing_reveals_one_cell_every_forty_five_milliseconds() {
        let at = |elapsed| {
            plain(&title_frame(FROM, TO, elapsed, 20, true).text)
                .trim_end()
                .to_owned()
        };
        assert_eq!(at(TITLE_RAINBOW_MS + TITLE_TYPE_MS_PER_CHAR - 1), "d");
        assert_eq!(at(TITLE_RAINBOW_MS + TITLE_TYPE_MS_PER_CHAR), "da");
        assert_eq!(at(typing_end(TO) - 1), TO);
    }

    #[test]
    fn settle_blends_the_accent_toward_foreground_gray() {
        let start = title_frame(FROM, TO, typing_end(TO), 20, true);
        assert!(!start.done);
        assert_eq!(plain(&start.text), TO);
        assert!(start.text.starts_with("\x1b[38;2;237;198;216m"));
        let middle = title_frame(FROM, TO, typing_end(TO) + TITLE_SETTLE_MS / 2, 20, true);
        assert!(middle.text.starts_with("\x1b[38;2;204;184;193m"));
        let last = title_frame(FROM, TO, typing_end(TO) + TITLE_SETTLE_MS - 1, 20, true);
        assert!(last.text.starts_with("\x1b[38;2;170;170;170m"));
    }

    #[test]
    fn completes_exactly_at_the_end_of_settle() {
        let end = typing_end(TO) + TITLE_SETTLE_MS;
        assert!(!title_frame(FROM, TO, end - 1, 20, true).done);
        assert_eq!(
            title_frame(FROM, TO, end, 20, true),
            TitleFrame {
                text: TO.into(),
                width: 12,
                done: true
            }
        );
        assert_eq!(title_duration(TO, true), end);
    }

    #[test]
    fn active_frames_keep_the_wider_endpoint_width() {
        for elapsed in [
            0,
            TITLE_RAINBOW_MS,
            TITLE_RAINBOW_MS + 3 * TITLE_TYPE_MS_PER_CHAR,
            typing_end("new"),
        ] {
            let frame = title_frame("long old title", "new", elapsed, 20, true);
            assert_eq!(frame.width, 14);
            assert_eq!(UnicodeWidthStr::width(plain(&frame.text).as_str()), 14);
        }
        let grown = title_frame("agent", "auth-refactor", TITLE_RAINBOW_MS, 20, true);
        assert_eq!(UnicodeWidthStr::width(plain(&grown.text).as_str()), 13);
    }

    #[test]
    fn clips_endpoints_to_the_title_budget_before_styling() {
        let frame = title_frame(
            "an extremely long old title",
            "another extremely long title",
            0,
            7,
            true,
        );
        assert_eq!(frame.width, 7);
        assert_eq!(UnicodeWidthStr::width(plain(&frame.text).as_str()), 7);
        assert!(plain(&frame.text).ends_with('…'));
        let done = title_frame("old", "another extremely long title", 10_000, 7, true);
        assert_eq!(done.text, "anothe…");
    }

    #[test]
    fn measures_wide_and_combining_titles_by_display_cells() {
        let frame = title_frame(
            "agent",
            "开发助手",
            TITLE_RAINBOW_MS + TITLE_TYPE_MS_PER_CHAR,
            20,
            true,
        );
        assert_eq!(plain(&frame.text).trim_end(), "开发");
        assert_eq!(frame.width, 8);
        assert_eq!(UnicodeWidthStr::width(plain(&frame.text).as_str()), 8);
        let combining = "e\u{301}e\u{301}e\u{301}";
        let typed = title_frame("agent", combining, TITLE_RAINBOW_MS, 20, true);
        assert_eq!(plain(&typed.text).trim_end(), "e\u{301}");
        assert_eq!(truecolor_runs(&typed.text), 5);
        assert_eq!(
            title_duration(combining, true),
            typing_end(combining) + TITLE_SETTLE_MS
        );
    }

    #[test]
    fn palette_mode_types_plainly_without_accent_wave_or_settle() {
        let first = title_frame("Agent", "new", 0, 20, false);
        assert_eq!(first.text.trim_end(), "n");
        assert!(!first.text.contains('\x1b'));
        assert_eq!(first.width, 5);
        assert!(!title_frame("Agent", "new", 3 * TITLE_TYPE_MS_PER_CHAR - 1, 20, false).done);
        assert_eq!(
            title_frame("Agent", "new", 3 * TITLE_TYPE_MS_PER_CHAR, 20, false),
            TitleFrame {
                text: "new".into(),
                width: 3,
                done: true
            }
        );
        assert_eq!(title_duration("new", false), 3 * TITLE_TYPE_MS_PER_CHAR);
    }

    #[test]
    fn only_an_automatic_rename_starts_a_transition() {
        let now = Instant::now();
        let previous = tab("one", "agent");
        let started = reconcile_title_animation(Some(&previous), "auth-fix", "auto", now);
        assert_eq!(
            started,
            Some(TitleAnimation {
                from: "agent".into(),
                started_at: now
            })
        );
        assert_eq!(
            reconcile_title_animation(Some(&previous), "auth-fix", "user", now),
            None
        );
        assert_eq!(
            reconcile_title_animation(Some(&previous), "agent 2", "default", now),
            None
        );
        assert_eq!(
            reconcile_title_animation(None, "auth-fix", "auto", now),
            None
        );

        let mut animating = tab("one", "auth-fix");
        animating.title_animation = started.clone();
        let later = now + Duration::from_millis(200);
        assert_eq!(
            reconcile_title_animation(Some(&animating), "auth-fix", "auto", later),
            started
        );
        assert_eq!(
            reconcile_title_animation(Some(&animating), "mine", "user", later),
            None
        );
    }

    #[test]
    fn manual_rename_renders_the_complete_title_immediately() {
        let now = Instant::now();
        let frame = render_frame(
            &[tab("one", "auth-fix")],
            Some("one"),
            80,
            None,
            TimeFormat::Twelve,
            None,
            now,
            true,
            true,
        );
        assert!(plain(&frame.bytes).starts_with("   auth-fix "));
        assert!(!plain(&frame.bytes).contains('×'));
        assert_eq!(truecolor_runs(&frame.bytes), 4);
    }

    #[test]
    fn inline_rename_renders_cursor_selection_and_bounded_geometry() {
        let tabs = [tab("one", "agent")];
        let selected = StripRename {
            tab_id: "one".into(),
            text: "文档-helper".into(),
            cursor: 9,
            selection: Some((0, 9)),
        };
        let frame = render_interactive(
            &tabs,
            Some("one"),
            80,
            None,
            TimeFormat::Twelve,
            Some(&selected),
        );
        assert!(
            !frame.bytes.contains("\x1b[7m"),
            "a selection is never drawn reversed"
        );
        assert!(plain(&frame.bytes).contains("文档-helper"));
        for (active, truecolor, on) in [
            (true, true, "\x1b[48;2;38;79;120m"),
            (false, true, "\x1b[48;2;38;79;120m"),
            (true, false, "\x1b[48;5;24m"),
        ] {
            let (text, _) = chip(
                &tabs[0],
                active,
                false,
                Instant::now(),
                truecolor,
                Some(&selected),
                None,
                "blue",
                None,
            );
            let chip_style = text.split(' ').next().unwrap().to_owned();
            assert!(
                text.contains(&format!("{on}文{chip_style}")),
                "the selection keeps the chip's text color and restores its background: {text:?}"
            );
        }
        let (_, end, _) = frame.hits.first().unwrap();
        assert!(*end <= 20);

        let cursor = StripRename {
            tab_id: "one".into(),
            text: "docs".into(),
            cursor: 4,
            selection: None,
        };
        let frame = render_interactive(
            &tabs,
            Some("one"),
            80,
            None,
            TimeFormat::Twelve,
            Some(&cursor),
        );
        assert!(frame.bytes.contains("\x1b[7m \x1b[27m"));
        assert_eq!(frame.hidden_tabs, Vec::<String>::new());
    }

    #[test]
    fn automatic_rename_follows_the_tabs_current_accent() {
        let started_at = Instant::now();
        let mut animated = tab("one", "auth-fix");
        animated.name_source = "auto".into();
        animated.title_animation = Some(TitleAnimation {
            from: "Agent".into(),
            started_at,
        });
        animated.accent = Some("cyan".into());
        let render = |tab: &StripTab| {
            render_frame(
                &[tab.clone()],
                Some("one"),
                80,
                None,
                TimeFormat::Twelve,
                None,
                started_at,
                true,
                true,
            )
            .bytes
        };
        assert!(render(&animated).contains("\x1b[38;2;155;223;198mA"));
        animated.accent = Some("green".into());
        assert!(render(&animated).contains("\x1b[38;2;201;219;149mA"));
    }

    #[test]
    fn active_transition_keeps_hit_geometry_stable() {
        let start = Instant::now();
        let mut animated = tab("one", "auth-fix");
        animated.title_animation = Some(TitleAnimation {
            from: "agent".into(),
            started_at: start,
        });
        let tabs = vec![animated, tab("two", "agent 2")];
        let reference = render_frame(
            &tabs,
            Some("one"),
            80,
            None,
            TimeFormat::Twelve,
            None,
            start,
            true,
            true,
        );
        for elapsed in [
            0,
            TITLE_RAINBOW_MS,
            TITLE_RAINBOW_MS + 45,
            typing_end("auth-fix"),
            typing_end("auth-fix") + 299,
        ] {
            let at = start + Duration::from_millis(elapsed as u64);
            for truecolor in [true, false] {
                assert_eq!(
                    render_frame(
                        &tabs,
                        Some("one"),
                        80,
                        None,
                        TimeFormat::Twelve,
                        None,
                        at,
                        truecolor,
                        true
                    )
                    .hits,
                    reference.hits
                );
            }
        }
        let settled = render_frame(
            &tabs,
            Some("one"),
            80,
            None,
            TimeFormat::Twelve,
            None,
            start + Duration::from_secs(5),
            true,
            true,
        );
        assert!(plain(&settled.bytes).starts_with("   auth-fix "));
        assert_eq!(settled.hits, reference.hits);
    }

    #[test]
    fn truncates_at_grapheme_boundaries_without_close_geometry() {
        for name in [
            "abcdefghijklmnopqrstu",
            "开发助手一二三四五六七",
            "family 👨‍👩‍👧‍👦 helper",
            "e\u{301}e\u{301}e\u{301}e\u{301}e\u{301}e\u{301}e\u{301}e\u{301}",
        ] {
            let frame = render(&[tab("one", name)], Some("one"), 80);
            assert!(!frame.bytes.contains("×"));
            assert_eq!(
                frame
                    .hits
                    .iter()
                    .filter(|(_, _, hit)| matches!(hit, StripHit::View(id) if id == "one"))
                    .count(),
                1
            );
        }
    }

    #[test]
    fn hover_changes_each_target_style_without_changing_hit_targets() {
        let tabs = (0..10)
            .map(|index| tab(&format!("tab-{index}"), &format!("long agent {index}")))
            .collect::<Vec<_>>();
        let plain = render(&tabs, None, 40);
        assert!(!plain.hidden_tabs.is_empty());
        for hover in [
            StripHover::Tab("tab-0".into()),
            StripHover::Overflow,
            StripHover::New,
        ] {
            let hovered = render_with_hover(&tabs, None, 40, Some(&hover));
            assert_ne!(plain.bytes, hovered.bytes);
            assert_eq!(plain.hits, hovered.hits);
        }
    }

    #[test]
    fn empty_strip_contains_only_the_new_tab_control() {
        let frame = render(&[], None, 80);
        let text = plain(&frame.bytes);
        assert!(text.trim_start().starts_with('+'));
        assert!(
            text.trim_end().ends_with('M'),
            "the clock stays visible: {text:?}"
        );
        assert_eq!(UnicodeWidthStr::width(text.as_str()), 80);
        assert_eq!(frame.hits, vec![(0, 3, StripHit::New)]);
        // Platform: `render` detects truecolor from the environment, so either row background may
        // follow the reset.
        assert!(
            [STRIP_ROW_BACKGROUND, STRIP_ROW_BACKGROUND_PALETTE]
                .iter()
                .any(|background| frame
                    .bytes
                    .starts_with(&format!("\x1b[1;1H\x1b[0m{background}"))),
            "the strip resets attributes a faint backdrop could leave"
        );
    }

    #[test]
    fn a_plus_menu_with_no_kind_hides_plus() {
        let tabs = [tab("one", "agent")];
        let render_plus = |plus| {
            render_frame(
                &tabs,
                Some("one"),
                80,
                None,
                TimeFormat::Twelve,
                None,
                Instant::now(),
                true,
                plus,
            )
        };
        let hidden = render_plus(false);
        assert!(!plain(&hidden.bytes).contains(" + "));
        assert!(
            hidden
                .hits
                .iter()
                .all(|(_, _, hit)| !matches!(hit, StripHit::New)),
            "a hidden `+` takes no clicks"
        );
        assert_eq!(UnicodeWidthStr::width(plain(&hidden.bytes).as_str()), 80);
        assert!(plain(&render_plus(true).bytes).contains(" + "));
    }

    #[test]
    fn formats_clock_boundaries_and_reserves_a_trailing_cell() {
        assert_eq!(format_clock(0, 5, TimeFormat::Twelve), "12:05 AM");
        assert_eq!(format_clock(12, 5, TimeFormat::Twelve), "12:05 PM");
        assert_eq!(format_clock(23, 5, TimeFormat::TwentyFour), "23:05");
        for format in [TimeFormat::Twelve, TimeFormat::TwentyFour] {
            let frame = render_frame(
                &[tab("one", "agent")],
                Some("one"),
                80,
                None,
                format,
                None,
                Instant::now(),
                true,
                true,
            );
            assert!(plain(&frame.bytes).ends_with(' '));
            assert_eq!(UnicodeWidthStr::width(plain(&frame.bytes).as_str()), 80);
        }
    }

    #[test]
    fn strip_row_cells_outside_chips_carry_the_dark_row_background() {
        for truecolor in [true, false] {
            let background = if truecolor {
                STRIP_ROW_BACKGROUND
            } else {
                STRIP_ROW_BACKGROUND_PALETTE
            };
            let frame = render_frame(
                &[tab("one", "agent")],
                Some("one"),
                80,
                None,
                TimeFormat::Twelve,
                None,
                Instant::now(),
                truecolor,
                true,
            );
            assert!(
                frame
                    .bytes
                    .starts_with(&format!("\x1b[1;1H\x1b[0m{background}"))
            );
            // Invariant: Every reset inside the row re-establishes the row background before more cells.
            let body = frame.bytes.strip_suffix("\x1b[0m").expect("row ends reset");
            for (offset, _) in body.match_indices("\x1b[0m") {
                assert!(body[offset + 4..].starts_with(background));
            }
            assert!(!frame.bytes.contains("\x1b[49m"));
        }
    }

    #[test]
    fn chips_pad_before_the_icon_and_separate_it_from_the_name() {
        for status in [
            "working",
            "starting",
            "restoring",
            "needs-input",
            "unresponsive",
            "restarting",
            "done",
            "failed",
            "idle",
        ] {
            let mut value = tab("one", "agent");
            value.status = status.into();
            let (bytes, width) = chip(
                &value, true, false, Instant::now(), true, None, None, "blue", None,
            );
            let text = plain(&bytes);
            assert!(text.starts_with(' '), "status={status}");
            let glyph = status_glyph_at(status, 0);
            if !glyph.is_empty() {
                assert_ne!(text.chars().nth(1), Some(' '), "icon column: {status}");
                assert_eq!(
                    text.chars().nth(2),
                    Some(' '),
                    "icon/name separator: {status}"
                );
                assert_eq!(text.chars().nth(3), Some('a'), "name: {status}");
                assert_eq!(glyph.chars().count(), 1);
            } else {
                assert_eq!(text.chars().nth(1), Some(' '), "icon column: {status}");
                assert_eq!(
                    text.chars().nth(2),
                    Some(' '),
                    "icon/name separator: {status}"
                );
                assert_eq!(text.chars().nth(3), Some('a'), "name: {status}");
            }
            assert_eq!(width, UnicodeWidthStr::width(text.as_str()));
        }
    }

    #[test]
    fn adjacent_tabs_keep_stable_titles_and_hits_without_dividers() {
        let mut first = tab("first", "Agent");
        first.accent = Some("pink".into());
        let mut second = tab("second", "Second");
        second.status = "working".into();
        second.accent = Some("green".into());
        let tabs = [first, second];
        let frame = render_frame(
            &tabs,
            Some("first"),
            80,
            None,
            TimeFormat::Twelve,
            None,
            Instant::now(),
            true,
            true,
        );
        let plain = plain(&frame.bytes);
        assert!(!plain.contains('│'));
        assert!(plain.starts_with("   Agent"));
        assert!(plain.contains(" Second"));
        assert_eq!(plain.chars().nth(23), Some('S'));
        assert!(
            frame
                .bytes
                .contains(&tinted_background(tab_accent(Some("pink")), true))
        );
        assert_eq!(frame.hits[0].0, 0);
        assert_eq!(frame.hits[0].1, frame.hits[1].0);
        assert_eq!(plain.chars().count(), 80);
        let palette = render_frame(
            &tabs,
            Some("first"),
            80,
            None,
            TimeFormat::Twelve,
            None,
            Instant::now(),
            false,
            true,
        );
        assert!(palette.bytes.contains("\x1b[48;5;53m"));
        assert!(!palette.bytes.contains('│'));
    }

    #[test]
    fn uses_v2_progress_frames_at_eighty_millisecond_cadence() {
        assert_eq!(
            TAB_SPINNER_FRAMES,
            ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        );
        for (index, expected) in TAB_SPINNER_FRAMES.iter().enumerate() {
            let elapsed = index as u128 * u128::from(TAB_SPINNER_MS);
            assert_eq!(UnicodeWidthStr::width(*expected), 1);
            assert_eq!(tab_spinner_frame_at(elapsed), *expected);
            assert_eq!(tab_spinner_frame_at(elapsed + 79), *expected);
            for status in ["working", "restoring"] {
                assert_eq!(status_glyph_at(status, elapsed), *expected);
            }
            assert_eq!(
                status_glyph_at("starting", elapsed),
                "",
                "a starting tab has no spinner"
            );
        }
        assert_eq!(
            tab_spinner_frame_at(TAB_SPINNER_FRAMES.len() as u128 * u128::from(TAB_SPINNER_MS)),
            TAB_SPINNER_FRAMES[0]
        );
    }

    #[test]
    fn uses_semantic_status_glyphs_without_old_progress_or_suspended_glyphs() {
        assert_eq!(status_glyph_at("needs-input", 0), "?");
        assert_eq!(status_glyph_at("degraded", 0), "!");
        for silent in ["unresponsive", "stalled"] {
            assert_eq!(status_glyph_at(silent, 0), "");
            assert_eq!(accent(silent, None), "\x1b[38;2;170;170;170m");
        }
        assert_eq!(status_glyph_at("done-unseen", 0), "✓");
        assert_eq!(status_glyph_at("failed", 0), "✗");
        assert_eq!(status_glyph_at("suspended", 0), "");
        assert_eq!(status_glyph_at("done", 0), "✓");
        assert_eq!(accent("done", None), "\x1b[38;2;90;190;120m");
        for marker in ["aborted", "error"] {
            assert_eq!(status_glyph_at(marker, 0), "✗");
            assert_eq!(accent(marker, None), "\x1b[38;2;225;90;90m");
        }
        for old in ["◐", "◓", "◑", "◒", "…"] {
            assert!(!status_glyph_at("working", 0).contains(old));
            assert!(!status_glyph_at("starting", 0).contains(old));
            assert!(!status_glyph_at("restoring", 0).contains(old));
        }
    }

    #[test]
    fn progress_states_keep_animation_active() {
        for status in ["working", "restoring"] {
            let mut progress = tab("tab-0", "agent");
            progress.status = status.into();
            assert!(animations_active(&[progress]));
            if status != "working" {
                assert_eq!(accent(status, None), "\x1b[38;2;170;170;170m");
            }
        }
        assert!(!animations_active(&[tab("tab-0", "agent")]));
    }

    #[test]
    fn progress_keeps_one_column_geometry_and_independent_accents() {
        let mut blue = tab("blue", "agent");
        blue.status = "working".into();
        blue.accent = Some("blue".into());
        let mut pink = tab("pink", "agent 2");
        pink.status = "working".into();
        pink.accent = Some("pink".into());
        let frame = render(&[blue, pink], Some("blue"), 80);
        assert!(frame.bytes.contains("\x1b[38;2;91;141;239m"));
        assert!(frame.bytes.contains("\x1b[38;2;218;112;158m"));
        assert!(
            TAB_SPINNER_FRAMES
                .iter()
                .any(|glyph| frame.bytes.contains(glyph))
        );
        assert!(frame.hits.iter().any(|(start, end, hit)| {
            end - start == 20 && matches!(hit, StripHit::View(id) if id == "blue")
        }));
    }

    #[test]
    fn tabs_have_a_steady_width_then_shrink_and_truncate_before_overflow() {
        let tabs = (0..5)
            .map(|index| tab(&format!("tab-{index}"), "a very long agent title"))
            .collect::<Vec<_>>();
        let widths = |frame: StripFrame| {
            frame
                .hits
                .into_iter()
                .filter_map(|(start, end, hit)| {
                    matches!(hit, StripHit::View(_)).then_some(end - start)
                })
                .collect::<Vec<_>>()
        };
        assert_eq!(widths(render(&tabs[..1], Some("tab-0"), 120)), [20]);
        // Invariant: the twelve-hour clock width varies by hour; 24-hour time is stable.
        let twelve_hour = widths(render(&tabs[..3], Some("tab-0"), 65));
        assert!(matches!(
            twelve_hour.as_slice(),
            [17, 17, 17] | [18, 18, 18]
        ));
        assert_eq!(
            widths(render_configured(
                &tabs[..3],
                Some("tab-0"),
                65,
                None,
                TimeFormat::TwentyFour,
            )),
            [18, 18, 18]
        );
        let crowded = render(&tabs, Some("tab-4"), 60);
        assert!(widths(crowded.clone()).iter().all(|width| *width == 12));
        assert!(crowded.bytes.contains("a very …"));
        assert!(
            crowded
                .hits
                .iter()
                .any(|(_, _, hit)| matches!(hit, StripHit::Overflow))
        );
    }

    #[test]
    fn fixed_hour_clocks_preserve_chip_width_and_overflow() {
        let tabs = (0..5)
            .map(|index| tab(&format!("tab-{index}"), "a very long agent title"))
            .collect::<Vec<_>>();
        let widths = |frame: StripFrame| {
            frame
                .hits
                .into_iter()
                .filter_map(|(start, end, hit)| {
                    matches!(hit, StripHit::View(_)).then_some(end - start)
                })
                .collect::<Vec<_>>()
        };
        for (hour, twelve_hour_width) in [(0, 17), (4, 18), (12, 17), (16, 18), (23, 17)] {
            let _clock = clock_at(hour, 5);
            assert_eq!(widths(render(&tabs[..1], Some("tab-0"), 120)), [20]);
            assert_eq!(
                widths(render(&tabs[..3], Some("tab-0"), 65)),
                [twelve_hour_width; 3]
            );
            // Invariant: a fixed-width 24-hour clock keeps the measured width independent of the hour.
            assert_eq!(
                widths(render_configured(
                    &tabs[..3],
                    Some("tab-0"),
                    65,
                    None,
                    TimeFormat::TwentyFour,
                )),
                [18, 18, 18]
            );
            let crowded = render(&tabs, Some("tab-4"), 60);
            assert!(widths(crowded.clone()).iter().all(|width| *width == 12));
            assert!(crowded.bytes.contains("a very …"));
            assert!(
                crowded
                    .hits
                    .iter()
                    .any(|(_, _, hit)| matches!(hit, StripHit::Overflow))
            );
        }
    }

    #[test]
    fn overflow_uses_a_centered_midline_ellipsis_in_the_same_hit_area() {
        assert_eq!(UnicodeWidthStr::width("⋯"), 1);
        for (width, expected) in [(1, "⋯"), (2, " ⋯"), (3, " ⋯ ")] {
            let (mut bytes, mut hits, mut column) = (String::new(), Vec::new(), 4);
            append_controls(&mut bytes, &mut hits, &mut column, None, width, 1);
            assert_eq!(plain(&bytes), format!("{expected}+"));
            assert_eq!(hits[0], (4, 4 + width as u16, StripHit::Overflow));
            assert!(
                bytes.contains("38;2;170;170;170m"),
                "keep the muted control color"
            );
        }
        let tabs = [tab("a", "Agent"), tab("b", "Agent")];
        let frame = render_configured(&tabs, Some("a"), 4, None, TimeFormat::TwentyFour);
        assert!(
            frame
                .hits
                .iter()
                .any(|(_, _, hit)| matches!(hit, StripHit::Overflow))
        );
        assert!(plain(&frame.bytes).contains('⋯'));
        assert!(!plain(&frame.bytes).contains('…'));
    }

    #[test]
    fn narrow_overflow_does_not_claim_undrawn_chips_or_exceed_terminal_width() {
        let tabs = (0..3)
            .map(|index| tab(&format!("tab-{index}"), "Agent"))
            .collect::<Vec<_>>();
        for columns in 0..16 {
            let frame = render(&tabs, Some("tab-2"), columns);
            assert!(
                frame
                    .hits
                    .iter()
                    .all(|(start, end, _)| start < end && *end <= columns)
            );
            let visible = frame
                .hits
                .iter()
                .filter_map(|(_, _, hit)| match hit {
                    StripHit::View(id) => Some(id.as_str()),
                    _ => None,
                })
                .collect::<Vec<_>>();
            assert_eq!(frame.hidden_tabs.len() + visible.len(), tabs.len());
            for tab in &tabs {
                assert_eq!(
                    visible.contains(&tab.id.as_str()),
                    !frame.hidden_tabs.contains(&tab.id)
                );
            }
            if (4..16).contains(&columns) {
                assert!(
                    frame
                        .hits
                        .iter()
                        .any(|(_, _, hit)| matches!(hit, StripHit::Overflow))
                );
            }
        }
    }

    #[test]
    fn lays_out_unicode_and_fifty_tabs_at_reference_widths() {
        let tabs = (0..50)
            .map(|index| {
                let name = match index % 4 {
                    0 => format!("ascii-agent-{index}"),
                    1 => format!("开发助手{index}"),
                    2 => format!("family-👨‍👩‍👧‍👦-{index}"),
                    _ => format!("e\u{301}-agent-{index}"),
                };
                tab(&format!("tab-{index}"), &name)
            })
            .collect::<Vec<_>>();
        for columns in [80, 120, 200] {
            let frame = render(&tabs, Some("tab-49"), columns);
            assert!(frame.hits.iter().all(|(_, end, _)| *end <= columns));
            assert!(!frame.bytes.contains("×"));
            assert!(frame.bytes.contains(" + "));
            assert!(frame.bytes.contains("开发助…"));
        }
    }

    #[test]
    fn keeps_viewed_tab_visible_with_fifty_tabs() {
        let tabs = (0..50)
            .map(|index| tab(&format!("tab-{index}"), &format!("agent {index}")))
            .collect::<Vec<_>>();
        let frame = render(&tabs, Some("tab-49"), 40);
        assert!(frame.bytes.contains("agent 49"));
        assert!(
            frame
                .hits
                .iter()
                .any(|(_, _, hit)| matches!(hit, StripHit::Overflow))
        );
        assert!(
            frame
                .hits
                .iter()
                .any(|(_, _, hit)| matches!(hit, StripHit::New))
        );
    }
}
