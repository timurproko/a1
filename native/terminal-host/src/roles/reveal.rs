//! How the attach client reveals its frame after a resize: the whole frame draws faint for
//! `REVEAL_FADE`, then at full intensity. Opening or switching tabs draws at once, without a fade.

use std::time::{Duration, Instant};

use crate::roles::presentation::{DesiredPresentation, FinalCursor};

/// How long revealed content stays faint before it draws at full intensity.
pub const REVEAL_FADE: Duration = Duration::from_millis(100);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RevealFade {
    until: Instant,
}

impl RevealFade {
    pub fn new(now: Instant) -> Self {
        Self {
            until: now.checked_add(REVEAL_FADE).unwrap_or(now),
        }
    }

    pub fn complete(self, now: Instant) -> bool {
        now >= self.until
    }
}

/// The client's reveal state: the fade in progress, if any.
#[derive(Debug, Default)]
pub struct Reveal {
    pub fade: Option<RevealFade>,
}

impl Reveal {
    /// Starts a fade of the whole frame, as a resize reveal does.
    pub fn fade_frame(&mut self, now: Instant) {
        self.fade = Some(RevealFade::new(now));
    }

    /// Ends a finished fade; true when the frame must repaint at full intensity.
    pub fn finish(&mut self, now: Instant) -> bool {
        let finished = self.fade.is_some_and(|fade| fade.complete(now));
        if finished {
            self.fade = None;
        }
        finished
    }

    /// The frame as the reveal presents it: faint, without a cursor, while a fade runs.
    pub fn present(&self, desired: DesiredPresentation) -> DesiredPresentation {
        match self.fade {
            Some(_) => fade_presentation(desired),
            None => desired,
        }
    }
}

pub fn force_faint_ansi(bytes: &[u8]) -> Vec<u8> {
    if bytes.is_empty() {
        return Vec::new();
    }
    let mut output = Vec::with_capacity(bytes.len() + 32);
    output.extend_from_slice(b"\x1b[2m");
    let mut index = 0usize;
    while index < bytes.len() {
        if bytes.get(index..index + 2) != Some(b"\x1b[") {
            output.push(bytes[index]);
            index += 1;
            continue;
        }
        let Some(offset) = bytes[index + 2..]
            .iter()
            .position(|byte| (0x40..=0x7e).contains(byte))
        else {
            output.extend_from_slice(&bytes[index..]);
            break;
        };
        let end = index + 2 + offset;
        output.extend_from_slice(&bytes[index..=end]);
        if bytes[end] == b'm' {
            // Protocol: every child or host SGR may change intensity. Reassert faint after it so
            // resets, bold text, and explicit colors all remain inside the reveal treatment.
            output.extend_from_slice(b"\x1b[2m");
        }
        index = end + 1;
    }
    output.extend_from_slice(b"\x1b[22m");
    output
}

/// The whole frame drawn faint, with the cursor hidden.
pub fn fade_presentation(mut desired: DesiredPresentation) -> DesiredPresentation {
    if !desired.strip.is_empty() {
        desired.strip = String::from_utf8(force_faint_ansi(desired.strip.as_bytes()))
            .expect("host strip is utf-8");
    }
    if !desired.legacy_body.is_empty() {
        desired.legacy_body = force_faint_ansi(&desired.legacy_body);
    }
    if let Some(surface) = desired.structured.as_mut() {
        for style in &mut surface.styles {
            style.faint = true;
        }
        desired.overlay = Some(desired.overlay.map_or_else(
            || "\x1b[22m".to_owned(),
            |overlay| {
                String::from_utf8(force_faint_ansi(overlay.as_bytes()))
                    .expect("host overlay is utf-8")
            },
        ));
    } else if let Some(overlay) = desired.overlay.as_mut() {
        *overlay =
            String::from_utf8(force_faint_ansi(overlay.as_bytes())).expect("host overlay is utf-8");
    }
    desired.cursor = Some(FinalCursor::Hidden);
    desired
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol;

    fn desired() -> DesiredPresentation {
        DesiredPresentation {
            tab_id: Some("tab-1".into()),
            incarnation: 1,
            revision: 2,
            geometry_generation: 3,
            strip: "\x1b[0mstrip".into(),
            structured: Some(protocol::StructuredSurface {
                styles: vec![protocol::SurfaceStyle::default()],
                ..protocol::StructuredSurface::default()
            }),
            legacy_body: b"\x1b[0mlegacy".to_vec(),
            overlay: Some("\x1b[0moverlay".into()),
            cursor: Some(FinalCursor::At(protocol::SurfaceCursor {
                column: 2,
                row: 3,
            })),
            modes: None,
            columns: 80,
            outer_rows: 24,
            child_row_offset: 1,
            clear: true,
            dimmed: false,
        }
    }

    #[test]
    fn a_frame_fade_enforces_faint_everywhere_and_hides_the_cursor() {
        let ansi =
            String::from_utf8(force_faint_ansi(b"\x1b[0mplain\x1b[38;2;1;2;3mcolored")).unwrap();
        assert!(ansi.starts_with("\x1b[2m"));
        assert!(ansi.contains("\x1b[0m\x1b[2mplain"));
        assert!(ansi.contains("\x1b[38;2;1;2;3m\x1b[2mcolored"));
        assert!(ansi.ends_with("\x1b[22m"));

        let faded = fade_presentation(desired());
        assert!(faded.strip.contains("\x1b[0m\x1b[2mstrip"));
        assert!(
            String::from_utf8(faded.legacy_body)
                .unwrap()
                .contains("\x1b[2mlegacy")
        );
        assert!(faded.overlay.unwrap().contains("\x1b[2moverlay"));
        assert!(faded.structured.unwrap().styles[0].faint);
        assert_eq!(faded.cursor, Some(FinalCursor::Hidden));

        let started = Instant::now();
        let fade = RevealFade::new(started);
        assert!(!fade.complete(started + REVEAL_FADE - Duration::from_millis(1)));
        assert!(fade.complete(started + REVEAL_FADE));
    }
}
