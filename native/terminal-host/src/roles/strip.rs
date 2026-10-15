use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub const TITLE_RAINBOW_MS: u128 = 600;
pub const TITLE_TYPE_MS_PER_CHAR: u128 = 45;
pub const TITLE_SETTLE_MS: u128 = 300;

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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StripHit {
    View(String),
    Close(String),
    Overflow,
    New,
}

#[derive(Debug, Clone)]
pub struct StripFrame {
    pub bytes: String,
    pub hits: Vec<(u16, u16, StripHit)>,
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

fn status_glyph(status: &str) -> &'static str {
    match status {
        "starting" | "restoring" => "… ",
        "working" => match SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
            / 80
            % 4
        {
            0 => "◐ ",
            1 => "◓ ",
            2 => "◑ ",
            _ => "◒ ",
        },
        "needs-input" => "? ",
        "unresponsive" | "stalled" | "degraded" => "! ",
        "done-unseen" => "✓ ",
        "restarting" => "↻ ",
        "crashed" | "failed" | "ended" => "✗ ",
        _ => "",
    }
}

fn accent(status: &str, value: Option<&str>) -> &'static str {
    if status != "working" {
        return match status {
            "needs-input" | "unresponsive" | "stalled" | "degraded" => "\x1b[38;2;224;175;70m",
            "done-unseen" => "\x1b[38;2;90;190;120m",
            "crashed" | "failed" | "ended" => "\x1b[38;2;225;90;90m",
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

const SETTLED_FG: Rgb = Rgb(170, 170, 170);

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

fn chip_fixed_width(tab: &StripTab) -> usize {
    4 + if status_glyph(&tab.status).is_empty() {
        0
    } else {
        2
    }
}

fn chip_title(tab: &StripTab, max_width: usize, now: Instant, truecolor: bool) -> TitleFrame {
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
) -> (String, usize, usize) {
    let glyph = status_glyph(&tab.status);
    let fixed = chip_fixed_width(tab);
    let title = chip_title(tab, 20usize.saturating_sub(fixed), now, truecolor);
    let name = title.text;
    let width = fixed + title.width;
    let background = if active {
        "\x1b[48;2;55;55;55m\x1b[38;2;255;255;255m"
    } else if hovered {
        "\x1b[48;2;48;48;48m\x1b[38;2;220;220;220m"
    } else {
        "\x1b[48;2;38;38;38m\x1b[38;2;170;170;170m"
    };
    let glyph_color = accent(&tab.status, tab.accent.as_deref());
    let text = format!("{background} {glyph_color}{glyph}\x1b[39m{name} \x1b[39m× \x1b[0m");
    (text, width, 3)
}

pub fn render(tabs: &[StripTab], viewed: Option<&str>, columns: u16) -> StripFrame {
    render_with_hover(tabs, viewed, columns, None)
}

pub fn render_with_hover(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&str>,
) -> StripFrame {
    render_frame(
        tabs,
        viewed,
        columns,
        hovered,
        Instant::now(),
        !palette_fallback_requested(),
    )
}

fn render_frame(
    tabs: &[StripTab],
    viewed: Option<&str>,
    columns: u16,
    hovered: Option<&str>,
    now: Instant,
    truecolor: bool,
) -> StripFrame {
    let chip =
        |tab: &StripTab, active: bool, hovered: bool| chip(tab, active, hovered, now, truecolor);
    let clock = clock_text();
    let clock_width = UnicodeWidthStr::width(clock.as_str());
    let available = usize::from(columns).saturating_sub(clock_width + 1);
    let mut selected = Vec::new();
    let mut used = 0usize;
    let plus_width = 3usize;
    let mut overflow = false;
    for tab in tabs {
        let (_, width, _) = chip(
            tab,
            viewed == Some(tab.id.as_str()),
            hovered == Some(tab.id.as_str()),
        );
        if used + width + plus_width <= available {
            selected.push(tab);
            used += width;
        } else {
            overflow = true;
        }
    }
    if let Some(active) = viewed.and_then(|id| tabs.iter().find(|tab| tab.id == id))
        && !selected.iter().any(|tab| tab.id == active.id)
    {
        overflow = true;
        let (_, active_width, _) = chip(active, true, hovered == Some(active.id.as_str()));
        while !selected.is_empty() && used + active_width + plus_width + 3 > available {
            let removed = selected.pop().expect("checked nonempty");
            used -= chip(removed, false, hovered == Some(removed.id.as_str())).1;
        }
        selected.push(active);
        used += active_width;
    }
    let overflow_width = if overflow { 3 } else { 0 };
    while !selected.is_empty() && used + overflow_width + plus_width > available {
        let removed = selected.pop().expect("checked nonempty");
        used -= chip(removed, false, hovered == Some(removed.id.as_str())).1;
        overflow = true;
    }

    let mut bytes = String::from("\x1b[1;1H");
    let mut hits = Vec::new();
    let mut column = 0u16;
    for tab in selected {
        let (text, width, close_width) = chip(
            tab,
            viewed == Some(tab.id.as_str()),
            hovered == Some(tab.id.as_str()),
        );
        bytes.push_str(&text);
        let end = column.saturating_add(width as u16);
        hits.push((
            column,
            end.saturating_sub(close_width as u16),
            StripHit::View(tab.id.clone()),
        ));
        hits.push((
            end.saturating_sub(close_width as u16),
            end,
            StripHit::Close(tab.id.clone()),
        ));
        column = end;
    }
    if overflow {
        bytes.push_str("\x1b[48;2;38;38;38m\x1b[38;2;170;170;170m … \x1b[0m");
        hits.push((column, column.saturating_add(3), StripHit::Overflow));
        column = column.saturating_add(3);
    }
    bytes.push_str("\x1b[48;2;38;38;38m\x1b[38;2;170;170;170m + \x1b[0m");
    hits.push((column, column.saturating_add(3), StripHit::New));
    column = column.saturating_add(3);
    let padding = usize::from(columns).saturating_sub(column as usize + clock_width);
    bytes.push_str(&" ".repeat(padding));
    bytes.push_str("\x1b[38;2;170;170;170m");
    bytes.push_str(&clock);
    bytes.push_str("\x1b[0m");
    if !truecolor {
        for (rgb, palette) in [
            ("\x1b[48;2;38;38;38m", "\x1b[48;5;235m"),
            ("\x1b[48;2;48;48;48m", "\x1b[48;5;236m"),
            ("\x1b[48;2;55;55;55m", "\x1b[48;5;237m"),
            ("\x1b[38;2;170;170;170m", "\x1b[38;5;248m"),
            ("\x1b[38;2;255;255;255m", "\x1b[38;5;15m"),
        ] {
            bytes = bytes.replace(rgb, palette);
        }
    }
    StripFrame { bytes, hits }
}

fn palette_fallback_requested() -> bool {
    if std::env::var("TERMINAL_HOST_COLOR_MODE").is_ok_and(|value| value == "palette") {
        return true;
    }
    std::env::var("TERM").is_ok_and(|term| term.contains("256color"))
        && std::env::var("COLORTERM").map_or(true, |value| {
            !matches!(value.as_str(), "truecolor" | "24bit")
        })
}

pub fn animations_active(tabs: &[StripTab]) -> bool {
    tabs.iter()
        .any(|tab| tab.status == "working" || title_animation_active(tab))
}

/// Strip redraw cadence: title transitions need every 45 ms typewriter step, the spinner does not.
pub fn animation_interval(tabs: &[StripTab]) -> Duration {
    if tabs.iter().any(title_animation_active) {
        Duration::from_millis(15)
    } else {
        Duration::from_millis(80)
    }
}

fn title_animation_active(tab: &StripTab) -> bool {
    tab.title_animation.as_ref().is_some_and(|animation| {
        let truecolor = !palette_fallback_requested();
        let to = truncate(
            &clean(&tab.name),
            20usize.saturating_sub(chip_fixed_width(tab)),
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

fn clock_text() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let (hour, minute) = local_hour_minute(seconds);
    let suffix = if hour < 12 { "am" } else { "pm" };
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
        let frame = render_frame(&[tab("one", "auth-fix")], Some("one"), 80, None, now, true);
        assert!(plain(&frame.bytes).contains(" auth-fix ×"));
        assert_eq!(truecolor_runs(&frame.bytes), 4);
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
        let reference = render_frame(&tabs, Some("one"), 80, None, start, true);
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
                    render_frame(&tabs, Some("one"), 80, None, at, truecolor).hits,
                    reference.hits
                );
            }
        }
        let settled = render_frame(
            &tabs,
            Some("one"),
            80,
            None,
            start + Duration::from_secs(5),
            true,
        );
        assert!(plain(&settled.bytes).contains(" auth-fix ×"));
        assert_eq!(settled.hits, reference.hits);
    }

    #[test]
    fn truncates_at_grapheme_boundaries_and_keeps_close() {
        for name in [
            "abcdefghijklmnopqrstu",
            "开发助手一二三四五六七",
            "family 👨‍👩‍👧‍👦 helper",
            "e\u{301}e\u{301}e\u{301}e\u{301}e\u{301}e\u{301}e\u{301}e\u{301}",
        ] {
            let frame = render(&[tab("one", name)], Some("one"), 80);
            assert!(frame.bytes.contains("×"));
            assert!(
                frame
                    .hits
                    .iter()
                    .any(|(_, _, hit)| matches!(hit, StripHit::Close(id) if id == "one"))
            );
        }
    }

    #[test]
    fn hover_changes_visual_style_without_changing_hit_targets() {
        let tabs = vec![tab("tab-0", "agent")];
        let plain = render(&tabs, None, 80);
        let hovered = render_with_hover(&tabs, None, 80, Some("tab-0"));
        assert_ne!(plain.bytes, hovered.bytes);
        assert_eq!(plain.hits, hovered.hits);
    }

    #[test]
    fn uses_semantic_status_glyphs_without_a_suspended_state() {
        assert_eq!(status_glyph("needs-input"), "? ");
        assert_eq!(status_glyph("done-unseen"), "✓ ");
        assert_eq!(status_glyph("failed"), "✗ ");
        assert_eq!(status_glyph("suspended"), "");
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
            assert!(frame.bytes.contains("×"));
            assert!(frame.bytes.contains(" + "));
            assert!(frame.bytes.contains("开发助手49"));
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
