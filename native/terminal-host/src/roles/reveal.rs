//! How new content enters the attach client's frame. A reveal fades content in: it draws faint
//! for `REVEAL_FADE`, then at full intensity. Resizing and a new tab share it, so both enter with
//! the same timing and the same faint treatment; its scope says what fades. A new tab's content is
//! also veiled until its first frame commits: the strip already shows the new tab while the body
//! stays empty, and the content then fades in, as a resize reveals once its surface is ready.

use std::time::{Duration, Instant};

use crate::roles::presentation::{DesiredPresentation, FinalCursor};

/// How long revealed content stays faint before it draws at full intensity.
pub const REVEAL_FADE: Duration = Duration::from_millis(100);

/// What a reveal fades.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RevealScope {
    /// The whole frame, the strip included, as after a resize.
    Frame,
    /// Only the content beneath the strip, as for a new tab, whose chip is already shown.
    Content,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RevealFade {
    until: Instant,
    scope: RevealScope,
}

impl RevealFade {
    pub fn new(now: Instant, scope: RevealScope) -> Self {
        Self {
            until: now.checked_add(REVEAL_FADE).unwrap_or(now),
            scope,
        }
    }

    pub fn complete(self, now: Instant) -> bool {
        now >= self.until
    }
}

/// The client's reveal state: the fade in progress and the new tab whose content is veiled.
#[derive(Debug, Default)]
pub struct Reveal {
    pub fade: Option<RevealFade>,
    veiled: Option<String>,
}

impl Reveal {
    /// Veils a new tab's content until its first frame commits.
    pub fn veil(&mut self, tab_id: &str) {
        self.veiled = Some(tab_id.to_owned());
    }

    /// The veiled tab while it is still the requested view; a dropped request shows no veil.
    pub fn veiled_for<'a>(&'a self, requested: Option<&'a str>) -> Option<&'a str> {
        self.veiled.as_deref().filter(|id| requested == Some(*id))
    }

    /// A commit lifts any veil; when it commits the veiled tab, that tab's content fades in.
    pub fn commit(&mut self, tab_id: &str, now: Instant) {
        if self.veiled.take().as_deref() == Some(tab_id) {
            self.fade = Some(RevealFade::new(now, RevealScope::Content));
        }
    }

    /// Starts a fade of the whole frame, as a resize reveal does.
    pub fn fade_frame(&mut self, now: Instant) {
        self.fade = Some(RevealFade::new(now, RevealScope::Frame));
    }

    /// Ends a finished fade; true when the frame must repaint at full intensity.
    pub fn finish(&mut self, now: Instant) -> bool {
        let finished = self.fade.is_some_and(|fade| fade.complete(now));
        if finished {
            self.fade = None;
        }
        finished
    }

    /// The frame as the reveal presents it: a veiled tab's body empty under the strip, then any
    /// fade applied to its scope.
    pub fn present(
        &self,
        mut desired: DesiredPresentation,
        requested: Option<&str>,
    ) -> DesiredPresentation {
        if let Some(tab_id) = self.veiled_for(requested) {
            desired = veil_content(desired, tab_id);
        }
        match self.fade {
            Some(fade) => fade_presentation(desired, fade.scope),
            None => desired,
        }
    }
}

/// The frame with an empty body beneath its strip, attributed to `tab_id` so the composer
/// repaints the whole body when the new tab's content arrives.
pub fn veil_content(mut desired: DesiredPresentation, tab_id: &str) -> DesiredPresentation {
    desired.tab_id = Some(tab_id.to_owned());
    desired.structured = None;
    desired.legacy_body = Vec::new();
    desired.overlay = None;
    desired.cursor = Some(FinalCursor::Hidden);
    desired
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

/// The frame drawn faint within `scope`, with the cursor hidden.
pub fn fade_presentation(
    mut desired: DesiredPresentation,
    scope: RevealScope,
) -> DesiredPresentation {
    if scope == RevealScope::Frame && !desired.strip.is_empty() {
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

        let faded = fade_presentation(desired(), RevealScope::Frame);
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
        let fade = RevealFade::new(started, RevealScope::Frame);
        assert!(!fade.complete(started + REVEAL_FADE - Duration::from_millis(1)));
        assert!(fade.complete(started + REVEAL_FADE));
    }

    #[test]
    fn a_content_fade_leaves_the_strip_at_full_intensity() {
        let faded = fade_presentation(desired(), RevealScope::Content);
        assert_eq!(faded.strip, "\x1b[0mstrip");
        assert!(faded.structured.unwrap().styles[0].faint);
    }

    #[test]
    fn a_new_tab_is_veiled_until_its_first_commit_then_its_content_fades_in() {
        let now = Instant::now();
        let mut reveal = Reveal::default();
        reveal.veil("tab-2");
        let veiled = reveal.present(desired(), Some("tab-2"));
        assert_eq!(veiled.tab_id.as_deref(), Some("tab-2"));
        assert!(veiled.structured.is_none() && veiled.legacy_body.is_empty());
        assert_eq!(
            veiled.strip, "\x1b[0mstrip",
            "the strip shows the new tab at once"
        );
        assert_eq!(
            reveal.veiled_for(Some("tab-1")),
            None,
            "a dropped request shows no veil"
        );

        reveal.commit("tab-2", now);
        assert_eq!(reveal.veiled_for(Some("tab-2")), None);
        let fading = reveal.present(desired(), None);
        assert_eq!(fading.strip, "\x1b[0mstrip");
        assert!(fading.structured.unwrap().styles[0].faint);
        assert!(!reveal.finish(now));
        assert!(reveal.finish(now + REVEAL_FADE));
        assert!(reveal.fade.is_none());

        reveal.veil("tab-3");
        reveal.commit("tab-1", now);
        assert!(
            reveal.fade.is_none(),
            "another tab's commit lifts the veil without a fade"
        );
        assert_eq!(reveal.veiled_for(Some("tab-3")), None);
    }
}
