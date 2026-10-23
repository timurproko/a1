use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub const TITLE_RAINBOW_MS: u128 = 600;
pub const TITLE_TYPE_MS_PER_CHAR: u128 = 45;
pub const TITLE_SETTLE_MS: u128 = 300;
pub const TAB_SPINNER_FRAMES: [&str; 10] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
pub const TAB_SPINNER_MS: u64 = 80;

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
        "starting" | "restoring" | "working" => tab_spinner_frame_at(elapsed_ms).into(),
        "needs-input" => "?".into(),
        "unresponsive" | "stalled" | "degraded" => "!".into(),
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

fn accent(status: &str, value: Option<&str>) -> &'static str {
    if status != "working" {
        return match status {
            "needs-input" | "unresponsive" | "stalled" | "degraded" => "\x1b[38;2;224;175;70m",
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

fn tint(base: u8, color: Rgb, percent: u16) -> Rgb {
    let channel =
        |value: u8| ((u16::from(base) * (100 - percent) + u16::from(value) * percent) / 100) as u8;
    Rgb(channel(color.0), channel(color.1), channel(color.2))
}

fn tint_palette(color: Rgb, active: bool) -> u8 {
    match (color, active) {
        (Rgb(91, 141, 239), true) => 60,
        (Rgb(91, 141, 239), false) => 67,
        (Rgb(74, 174, 196), true) => 23,
        (Rgb(74, 174, 196), false) => 66,
        (Rgb(88, 183, 132), true) => 22,
        (Rgb(88, 183, 132), false) => 65,
        (Rgb(226, 159, 72), true) => 58,
        (Rgb(226, 159, 72), false) => 101,
        (Rgb(218, 112, 158), true) => 53,
        (Rgb(218, 112, 158), false) => 96,
        (_, true) => 60,
        (_, false) => 96,
    }
}

fn tinted_background(color: Rgb, truecolor: bool) -> String {
    if !truecolor {
        return format!("\x1b[48;5;{}m", tint_palette(color, true));
    }
    let Rgb(red, green, blue) = tint(55, color, 24);
    format!("\x1b[48;2;{red};{green};{blue}m")
}

fn tinted_foreground(color: Rgb, base: u8, active: bool, truecolor: bool) -> String {
    if !truecolor {
        return format!("\x1b[38;5;{}m", tint_palette(color, false));
    }
    let Rgb(red, green, blue) = tint(base, color, if active { 36 } else { 20 });
    format!("\x1b[38;2;{red};{green};{blue}m")
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

pub fn hsl_to_rgb(hue: f64, saturation: f64, lightness: f64) -> Rgb {
    let h = hue.rem_euclid(360.0);
    let s = saturation.clamp(0.0, 100.0) / 100.0;
    let l = lightness.clamp(0.0, 100.0) / 100.0;
    let chroma = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let segment = h / 60.0;
    let x = chroma * (1.0 - (segment % 2.0 - 1.0).abs());
    let (red, green, blue) = match segment {
        value if value < 1.0 => (chroma, x, 0.0),
        value if value < 2.0 => (x, chroma, 0.0),
        value if value < 3.0 => (0.0, chroma, x),
        value if value < 4.0 => (0.0, x, chroma),
        value if value < 5.0 => (x, 0.0, chroma),
        _ => (chroma, 0.0, x),
    };
    let base = l - chroma / 2.0;
    let channel = |value: f64| ((value + base) * 255.0).round() as u8;
    Rgb(channel(red), channel(green), channel(blue))
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

fn rainbow(index: usize, offset: f64) -> Rgb {
    hsl_to_rgb(index as f64 * 30.0 + offset, 90.0, 65.0)
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

/// Deterministic v2 title transition: moving rainbow over the old title, rainbow typewriter reveal,
/// then a settle to foreground gray; without truecolor only the plain typewriter remains.
pub fn title_frame(
    from: &str,
    to: &str,
    elapsed: u128,
    max_width: usize,
    truecolor: bool,
) -> TitleFrame {
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
        let offset = elapsed as f64 / 4.0;
        return active(colorize(&cells, |index| rainbow(index, offset)));
    }
    let typing = elapsed - TITLE_RAINBOW_MS;
    if typing < typing_duration {
        return active(colorize(&typed(typing), |index| rainbow(index, 0.0)));
    }
    let settle = typing - typing_duration;
    if settle < TITLE_SETTLE_MS {
        let progress = settle as f64 / TITLE_SETTLE_MS as f64;
        let cells = padded(&target, stable);
        return active(colorize(&cells, |index| {
            mix(rainbow(index, 0.0), SETTLED_FG, progress)
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

fn rename_title(rename: &StripRename, max_width: usize) -> TitleFrame {
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
        if selected || pointed {
            text.push_str("\x1b[7m");
        }
        text.push_str(grapheme);
        if selected || pointed {
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
) -> TitleFrame {
    if let Some(rename) = rename.filter(|rename| rename.tab_id == tab.id) {
        return rename_title(rename, max_width);
    }
    let elapsed = tab.title_animation.as_ref().map(|animation| {
        now.saturating_duration_since(animation.started_at)
            .as_millis()
    });
    match (&tab.title_animation, elapsed) {
        (Some(animation), Some(elapsed)) => {
            title_frame(&animation.from, &tab.name, elapsed, max_width, truecolor)
        }
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
    divider: bool,
) -> (String, usize) {
    let glyph = status_glyph(&tab.status);
    let icon = if glyph.is_empty() { " " } else { &glyph };
    let fixed = chip_fixed_width();
    let title = chip_title(
        tab,
        target_width.unwrap_or(20).saturating_sub(fixed),
        now,
        truecolor,
        rename,
    );
    let name = title.text;
    let width = target_width.unwrap_or(fixed + title.width);
    let padding = " ".repeat(width.saturating_sub(fixed + title.width));
    let accent_color = tab_accent(tab.accent.as_deref());
    let base = if active {
        55
    } else if hovered {
        48
    } else {
        38
    };
    let background = if active {
        format!(
            "{}\x1b[38;2;255;255;255m",
            tinted_background(accent_color, truecolor)
        )
    } else if hovered {
        "\x1b[48;2;48;48;48m\x1b[38;2;170;170;170m".to_owned()
    } else {
        "\x1b[48;2;38;38;38m\x1b[38;2;170;170;170m".to_owned()
    };
    let glyph_color = accent(&tab.status, tab.accent.as_deref());
    let end = if divider {
        format!(
            "{}│",
            tinted_foreground(accent_color, base, active, truecolor)
        )
    } else {
        " ".to_owned()
    };
    let text = format!("{background} {glyph_color}{icon}\x1b[39m {name}{padding}{end}\x1b[0m");
    (text, width)
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
    render_interactive_at(tabs, viewed, columns, hovered, time_format, rename, 1)
}

pub fn render_interactive_at(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&StripHover>,
    time_format: TimeFormat,
    rename: Option<&StripRename>,
    row: u16,
) -> StripFrame {
    let mut frame = render_frame(
        tabs,
        viewed,
        columns,
        hovered,
        time_format,
        rename,
        Instant::now(),
        !palette_fallback_requested(),
    );
    if row != 1 {
        frame.bytes = frame
            .bytes
            .replacen("\x1b[1;1H", &format!("\x1b[{};1H", row.max(1)), 1);
    }
    frame
}

fn render_frame(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&StripHover>,
    time_format: TimeFormat,
    rename: Option<&StripRename>,
    now: Instant,
    truecolor: bool,
) -> StripFrame {
    let chip = |tab: &StripTab, active: bool, hovered: bool, target: usize, divider: bool| {
        chip(
            tab,
            active,
            hovered,
            now,
            truecolor,
            rename,
            Some(target),
            divider,
        )
    };
    // Invariant: the clock stays visible with no tabs, beside the lone `+`.
    let clock = Some(clock_text(time_format));
    let clock_width = clock.as_deref().map_or(0, UnicodeWidthStr::width);
    let clock_reserve = if clock.is_some() { clock_width + 1 } else { 0 };
    let available = usize::from(columns).saturating_sub(clock_reserve);
    let mut selected = Vec::new();
    let mut used = 0usize;
    let plus_width = 3usize;
    // Rationale: tabs have a steady 20-cell footprint until the row needs space;
    // share the shrink evenly, then overflow rather than make tabs unreadable.
    let tab_width = if tabs.is_empty() {
        20
    } else {
        (available.saturating_sub(plus_width) / tabs.len())
            .clamp(12, 20)
            .min(available.saturating_sub(plus_width))
    };
    let mut overflow = false;
    for tab in tabs {
        if used + tab_width + plus_width <= available {
            selected.push(tab);
            used += tab_width;
        } else {
            overflow = true;
        }
    }
    if let Some(active) = viewed.and_then(|id| tabs.iter().find(|tab| tab.id == id))
        && !selected.iter().any(|tab| tab.id == active.id)
    {
        overflow = true;
        while !selected.is_empty() && used + tab_width + plus_width + 3 > available {
            selected.pop();
            used -= tab_width;
        }
        selected.push(active);
        used += tab_width;
    }
    let overflow_width = if overflow { 3 } else { 0 };
    while !selected.is_empty() && used + overflow_width + plus_width > available {
        selected.pop();
        used -= tab_width;
        overflow = true;
    }

    let hidden_tabs = tabs
        .iter()
        .filter(|tab| !selected.iter().any(|visible| visible.id == tab.id))
        .map(|tab| tab.id.clone())
        .collect::<Vec<_>>();
    let mut bytes = format!("\x1b[1;1H{STRIP_ROW_BACKGROUND}");
    let mut hits = Vec::new();
    let mut column = 0u16;
    let visible_count = selected.len();
    for (index, tab) in selected.into_iter().enumerate() {
        let (text, width) = chip(
            tab,
            viewed == Some(tab.id.as_str()),
            hovered == Some(&StripHover::Tab(tab.id.clone())),
            tab_width,
            index + 1 < visible_count,
        );
        bytes.push_str(&text);
        let end = column.saturating_add(width as u16);
        hits.push((column, end, StripHit::View(tab.id.clone())));
        column = end;
    }
    if overflow {
        let background = if hovered == Some(&StripHover::Overflow) {
            "48;48;48"
        } else {
            "38;38;38"
        };
        bytes.push_str(&format!(
            "\x1b[48;2;{background}m\x1b[38;2;170;170;170m … \x1b[0m"
        ));
        hits.push((column, column.saturating_add(3), StripHit::Overflow));
        column = column.saturating_add(3);
    }
    let plus_background = if hovered == Some(&StripHover::New) {
        "48;48;48"
    } else {
        "38;38;38"
    };
    bytes.push_str(&format!(
        "\x1b[48;2;{plus_background}m\x1b[38;2;170;170;170m + \x1b[0m"
    ));
    hits.push((column, column.saturating_add(3), StripHit::New));
    column = column.saturating_add(3);
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
    }
    StripFrame {
        bytes,
        hits,
        hidden_tabs,
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
        matches!(tab.status.as_str(), "starting" | "restoring" | "working")
            || title_animation_active(tab)
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
    fn converts_primary_hues() {
        assert_eq!(hsl_to_rgb(0.0, 100.0, 50.0), Rgb(255, 0, 0));
        assert_eq!(hsl_to_rgb(120.0, 100.0, 50.0), Rgb(0, 255, 0));
        assert_eq!(hsl_to_rgb(240.0, 100.0, 50.0), Rgb(0, 0, 255));
        assert_eq!(hsl_to_rgb(-120.0, 100.0, 50.0), Rgb(0, 0, 255));
    }

    #[test]
    fn configured_row_positions_the_complete_strip() {
        let frame = render_interactive_at(&[], None, 20, None, TimeFormat::Twelve, None, 24);
        assert!(frame.bytes.starts_with("\x1b[24;1H"));
        assert_eq!(plain(&frame.bytes).chars().count(), 20);
    }

    #[test]
    fn rainbow_phase_colors_each_old_title_cell_and_moves_over_time() {
        let first = title_frame(FROM, TO, 0, 20, true);
        assert!(!first.done);
        assert_eq!(plain(&first.text).trim_end(), FROM);
        assert_eq!(
            truecolor_runs(&first.text),
            plain(&first.text).chars().count()
        );
        assert!(first.text.starts_with("\x1b[38;2;246;85;85m"));
        let later = title_frame(FROM, TO, 240, 20, true);
        assert_eq!(plain(&later.text), plain(&first.text));
        assert_ne!(later.text, first.text);
    }

    #[test]
    fn rainbow_switches_to_typing_at_the_exact_boundary() {
        assert_eq!(
            plain(&title_frame(FROM, TO, TITLE_RAINBOW_MS - 1, 20, true).text).trim_end(),
            FROM
        );
        let typing = title_frame(FROM, TO, TITLE_RAINBOW_MS, 20, true);
        assert_eq!(plain(&typing.text).trim_end(), "d");
        assert!(typing.text.starts_with("\x1b[38;2;246;85;85md"));
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
    fn settle_blends_the_static_rainbow_toward_foreground_gray() {
        let start = title_frame(FROM, TO, typing_end(TO), 20, true);
        assert!(!start.done);
        assert_eq!(plain(&start.text), TO);
        assert!(start.text.starts_with("\x1b[38;2;246;85;85m"));
        let middle = title_frame(FROM, TO, typing_end(TO) + TITLE_SETTLE_MS / 2, 20, true);
        assert!(middle.text.starts_with("\x1b[38;2;208;128;128m"));
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
    fn palette_mode_types_plainly_without_rainbow_or_settle() {
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
        assert!(frame.bytes.contains("\x1b[7m"));
        assert!(plain(&frame.bytes).contains("文档-helper"));
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
                        truecolor
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
            );
            assert!(frame.bytes.starts_with(&format!("\x1b[1;1H{background}")));
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
            let (bytes, width) = chip(&value, true, false, Instant::now(), true, None, None, false);
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
    fn adjacent_tabs_have_subtle_accent_dividers_without_moving_titles_or_hits() {
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
        );
        let plain = plain(&frame.bytes);
        assert_eq!(plain.chars().filter(|ch| *ch == '│').count(), 1);
        assert!(plain.starts_with("   Agent"));
        assert!(plain.contains(" Second"));
        assert_eq!(plain.chars().nth(23), Some('S'));
        assert!(
            frame
                .bytes
                .contains(&tinted_background(tab_accent(Some("pink")), true))
        );
        assert!(
            frame
                .bytes
                .contains(&tinted_foreground(tab_accent(Some("pink")), 55, true, true))
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
        );
        assert!(palette.bytes.contains("\x1b[48;5;53m"));
        assert!(palette.bytes.contains("\x1b[38;5;96m│"));
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
            for status in ["working", "starting", "restoring"] {
                assert_eq!(status_glyph_at(status, elapsed), *expected);
            }
        }
        assert_eq!(
            tab_spinner_frame_at(TAB_SPINNER_FRAMES.len() as u128 * u128::from(TAB_SPINNER_MS)),
            TAB_SPINNER_FRAMES[0]
        );
    }

    #[test]
    fn uses_semantic_status_glyphs_without_old_progress_or_suspended_glyphs() {
        assert_eq!(status_glyph_at("needs-input", 0), "?");
        assert_eq!(status_glyph_at("unresponsive", 0), "!");
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
        for status in ["working", "starting", "restoring"] {
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
        assert_eq!(widths(render(&tabs[..3], Some("tab-0"), 65)), [18, 18, 18]);
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
