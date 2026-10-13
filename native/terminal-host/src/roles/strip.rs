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

fn animated_name(tab: &StripTab) -> (String, Option<String>) {
    let Some(animation) = &tab.title_animation else {
        return (tab.name.clone(), None);
    };
    let elapsed = animation.started_at.elapsed().as_millis();
    if elapsed < TITLE_RAINBOW_MS {
        let hue = ((elapsed / 4) % 360) as u16;
        return (
            animation.from.clone(),
            Some(format!(
                "\x1b[38;2;{};{};{}m",
                128 + hue % 127,
                90 + hue % 100,
                220
            )),
        );
    }
    let typing = elapsed - TITLE_RAINBOW_MS;
    let characters = tab.name.chars().count();
    let count = ((typing / TITLE_TYPE_MS_PER_CHAR) + 1).min(characters as u128) as usize;
    if count < characters {
        return (
            tab.name.chars().take(count).collect(),
            Some("\x1b[38;2;210;120;220m".into()),
        );
    }
    if typing < characters as u128 * TITLE_TYPE_MS_PER_CHAR + TITLE_SETTLE_MS {
        return (tab.name.clone(), Some("\x1b[38;2;190;150;200m".into()));
    }
    (tab.name.clone(), None)
}

fn chip(tab: &StripTab, active: bool, hovered: bool) -> (String, usize, usize) {
    let glyph = status_glyph(&tab.status);
    let fixed = 4 + if glyph.is_empty() { 0 } else { 2 };
    let (animated, title_color) = animated_name(tab);
    let name = truncate(&clean(&animated), 20usize.saturating_sub(fixed));
    let width = fixed + UnicodeWidthStr::width(name.as_str());
    let background = if active {
        "\x1b[48;2;55;55;55m\x1b[38;2;255;255;255m"
    } else if hovered {
        "\x1b[48;2;48;48;48m\x1b[38;2;220;220;220m"
    } else {
        "\x1b[48;2;38;38;38m\x1b[38;2;170;170;170m"
    };
    let glyph_color = accent(&tab.status, tab.accent.as_deref());
    let title_color = title_color.as_deref().unwrap_or("\x1b[39m");
    let text = format!("{background} {glyph_color}{glyph}{title_color}{name} \x1b[39m× \x1b[0m");
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
    StripFrame { bytes, hits }
}

pub fn animations_active(tabs: &[StripTab]) -> bool {
    tabs.iter().any(|tab| {
        tab.status == "working"
            || tab.title_animation.as_ref().is_some_and(|animation| {
                animation.started_at.elapsed()
                    < Duration::from_millis(
                        (TITLE_RAINBOW_MS
                            + tab.name.chars().count() as u128 * TITLE_TYPE_MS_PER_CHAR
                            + TITLE_SETTLE_MS) as u64,
                    )
            })
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
