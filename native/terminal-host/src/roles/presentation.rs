//! Requested-versus-committed view state and the single frame compositor of the attach client.
//!
//! A create, click, shortcut, close successor, recovery, or server-driven removal changes the
//! *requested* view at once, but the visible chip and body *commit* only when attach holds a
//! topology containing the target plus a complete target surface. Superseded requests, late
//! surfaces of earlier revisions, and clear-only or contradictory frames are discarded here, so
//! the loop in `attach.rs` never paints an intermediate state the user should not see.

use std::time::{Duration, Instant};

use crate::protocol::SurfaceCursor;
use crate::roles::strip::StripTab;
use crate::roles::wire::Surface;

/// How long a requested view keeps its previous coherent frame while waiting for the holder's
/// fresh surface before a retained re-offer is committed instead.
pub const STALE_SURFACE_WAIT: Duration = Duration::from_millis(120);

const BEGIN_SYNCHRONIZED_UPDATE: &[u8] = b"\x1b[?2026h";
const END_SYNCHRONIZED_UPDATE: &[u8] = b"\x1b[?2026l";

/// What the view model decided about one offered surface.
#[derive(Debug, PartialEq, Eq)]
pub enum Offer {
    /// Present the surface; `tabs` carries a staged topology that commits with it and
    /// `requested` says this commit answered a view request (the identity may be unchanged).
    Commit {
        surface: Surface,
        tabs: Option<Vec<StripTab>>,
        requested: bool,
    },
    /// A stale re-offer of the requested view is held until the fresh frame or the wait ends.
    Parked,
    /// The requested tab is not listed yet; the surface waits for the topology.
    Staged,
    /// The surface belongs to no current or requested view, or predates the committed one.
    Dropped,
}

/// What the view model decided about one topology snapshot.
#[derive(Debug, PartialEq, Eq)]
pub struct Topology {
    /// A requested tab that disappeared before it could commit.
    pub dropped_request: Option<String>,
    /// A `tab.view` the client must send because the committed view vanished.
    pub view_request: Option<String>,
    pub action: TopologyAction,
}

#[derive(Debug, PartialEq, Eq)]
pub enum TopologyAction {
    /// The topology and a surface that waited for it commit together, answering a request.
    Commit {
        surface: Surface,
        tabs: Vec<StripTab>,
    },
    /// The topology names the requested tab but its surface has not arrived; nothing is shown.
    Staged,
    /// Install the topology now; `changed` says it differs from the current one.
    Install { tabs: Vec<StripTab>, changed: bool },
}

/// Requested and committed view identity plus the revision ordering of the committed body.
#[derive(Debug, Default)]
pub struct ViewModel {
    pub viewed: Option<String>,
    pub requested: Option<String>,
    staged_tabs: Option<Vec<StripTab>>,
    pending_surface: Option<Surface>,
    committed_revision: Option<u64>,
    stale_candidate: Option<(Surface, Instant)>,
}

impl ViewModel {
    pub fn new(initial: Option<String>) -> Self {
        Self {
            viewed: initial.clone(),
            requested: initial,
            ..Self::default()
        }
    }

    pub fn request(&mut self, tab_id: &str) {
        self.requested = Some(tab_id.to_owned());
    }

    /// The topology a pending commit will install, if any; status updates patch it too.
    pub fn staged_tabs_mut(&mut self) -> Option<&mut Vec<StripTab>> {
        self.staged_tabs.as_mut()
    }

    pub fn staged_tabs(&self) -> Option<&Vec<StripTab>> {
        self.staged_tabs.as_ref()
    }

    pub fn has_staged_tabs(&self) -> bool {
        self.staged_tabs.is_some()
    }

    /// Forgets a request that failed before any surface could commit.
    pub fn cancel_request(&mut self) {
        self.requested = None;
        self.staged_tabs = None;
        self.pending_surface = None;
        self.stale_candidate = None;
    }

    /// Clears every view after the last tab closed.
    pub fn clear(&mut self) {
        *self = Self::default();
    }

    /// Protocol: the server selects its default tab before attach.start can report the ID, so the
    /// first surface becomes the requested view when nothing is viewed or requested yet.
    pub fn adopt_initial(&mut self, tab_id: &str) {
        if self.viewed.is_none() && self.requested.is_none() {
            self.requested = Some(tab_id.to_owned());
        }
    }

    fn is_requested(&self, tab_id: &str) -> bool {
        self.requested.as_deref() == Some(tab_id)
    }

    /// Decides whether an offered surface commits now, waits, or is discarded.
    pub fn offer(&mut self, surface: Surface, now: Instant, listed: bool) -> Offer {
        self.adopt_initial(&surface.tab_id);
        let requested = self.is_requested(&surface.tab_id);
        // Protocol: a retained re-offer may commit a requested view only after the bounded wait
        // for the holder's fresh frame, so the old coherent frame stays visible instead of a
        // surface that predates the switch.
        if requested && surface.stale && self.viewed.is_some() {
            self.stale_candidate = Some((surface, now + STALE_SURFACE_WAIT));
            return Offer::Parked;
        }
        if requested {
            self.stale_candidate = None;
        }
        self.commit(surface, listed)
    }

    fn commit(&mut self, surface: Surface, listed: bool) -> Offer {
        let requested = self.is_requested(&surface.tab_id);
        if requested && self.staged_tabs.is_none() && !listed {
            self.pending_surface = Some(surface);
            return Offer::Staged;
        }
        let mut tabs = None;
        if requested {
            tabs = self.staged_tabs.take();
            self.viewed = Some(surface.tab_id.clone());
            self.requested = None;
        } else if self.viewed.as_deref() != Some(surface.tab_id.as_str()) {
            return Offer::Dropped;
        } else if self
            .committed_revision
            .is_some_and(|committed| surface.revision < committed)
        {
            // Invariant: a later frame of the committed view never yields to an earlier one.
            return Offer::Dropped;
        }
        self.committed_revision = Some(surface.revision);
        Offer::Commit {
            surface,
            tabs,
            requested,
        }
    }

    /// Commits a parked stale re-offer whose wait ended while its request still stands.
    pub fn expire(&mut self, now: Instant, listed: impl Fn(&str) -> bool) -> Option<Offer> {
        let due = self
            .stale_candidate
            .as_ref()
            .is_some_and(|(_, deadline)| now >= *deadline);
        if !due {
            return None;
        }
        let (surface, _) = self.stale_candidate.take()?;
        if !self.is_requested(&surface.tab_id) {
            return None;
        }
        let listed = listed(&surface.tab_id);
        Some(self.commit(surface, listed))
    }

    /// Applies a topology snapshot, committing it with a waiting surface when the requested tab
    /// just became listed, or installing it directly.
    pub fn topology(
        &mut self,
        current: &[StripTab],
        next_tabs: Vec<StripTab>,
        fallback: impl FnOnce(&[StripTab]) -> Option<String>,
    ) -> Topology {
        let listed = |id: &str| next_tabs.iter().any(|tab| tab.id == id);
        let mut dropped_request = None;
        if self
            .requested
            .as_deref()
            .is_some_and(|requested| !listed(requested))
        {
            dropped_request = self.requested.take();
            self.staged_tabs = None;
            self.pending_surface = None;
            self.stale_candidate = None;
        }
        let mut view_request = None;
        let viewed_missing = self.viewed.as_deref().is_some_and(|viewed| !listed(viewed));
        if viewed_missing && self.requested.is_none() {
            let target =
                fallback(&next_tabs).or_else(|| next_tabs.first().map(|tab| tab.id.clone()));
            if let Some(tab_id) = target {
                self.requested = Some(tab_id.clone());
                view_request = Some(tab_id);
            }
        }
        let target_pending = self.requested.as_deref().is_some_and(|requested| {
            self.viewed.as_deref() != Some(requested) && listed(requested)
        });
        if target_pending {
            let target = self.requested.clone().expect("checked pending target");
            if let Some(surface) = self
                .pending_surface
                .take()
                .filter(|surface| surface.tab_id == target)
            {
                self.viewed = Some(target);
                self.requested = None;
                self.staged_tabs = None;
                self.committed_revision = Some(surface.revision);
                return Topology {
                    dropped_request,
                    view_request,
                    action: TopologyAction::Commit {
                        surface,
                        tabs: next_tabs,
                    },
                };
            }
            self.staged_tabs = Some(next_tabs);
            return Topology {
                dropped_request,
                view_request,
                action: TopologyAction::Staged,
            };
        }
        self.staged_tabs = None;
        let changed = current != next_tabs.as_slice();
        Topology {
            dropped_request,
            view_request,
            action: TopologyAction::Install {
                tabs: next_tabs,
                changed,
            },
        }
    }
}

/// The final cursor of a frame: the committed child's cursor cell, or hidden.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FinalCursor {
    Hidden,
    /// Zero-based child coordinates; the strip row is added when the frame is composed.
    At(SurfaceCursor),
}

/// One logical frame: strip, complete or omitted body, host overlay, final cursor, and whether
/// the screen is cleared first.
#[derive(Debug, Clone, Copy)]
pub struct Frame<'a> {
    pub strip: &'a str,
    /// `None` omits the body for strip-only damage that cannot contradict the committed view.
    pub body: Option<&'a [u8]>,
    pub overlay: Option<&'a str>,
    /// `None` leaves the cursor where the body left it; strip-only frames require a cursor.
    pub cursor: Option<FinalCursor>,
    pub clear: bool,
}

impl Frame<'_> {
    /// The one locked write for this frame, bracketed by synchronized-update markers, or `None`
    /// for a frame that would only clear, show nothing, or move the cursor without restoring it.
    pub fn compose(&self) -> Option<Vec<u8>> {
        let body = self.body.unwrap_or_default();
        if self.strip.is_empty() && body.is_empty() && self.overlay.is_none() {
            // Invariant: a clear-only or blank frame is never a coherent presentation.
            return None;
        }
        if self.body.is_none() && self.cursor.is_none() {
            // Invariant: strip-only damage must restore the child's cursor itself.
            return None;
        }
        let mut output = Vec::with_capacity(
            self.strip.len() + body.len() + self.overlay.map_or(0, str::len) + 48,
        );
        output.extend_from_slice(BEGIN_SYNCHRONIZED_UPDATE);
        if self.clear {
            output.extend_from_slice(b"\x1b[2J\x1b[H");
        }
        output.extend_from_slice(self.strip.as_bytes());
        output.extend_from_slice(body);
        if let Some(overlay) = self.overlay {
            output.extend_from_slice(overlay.as_bytes());
        }
        match self.cursor {
            Some(FinalCursor::Hidden) => output.extend_from_slice(b"\x1b[?25l"),
            Some(FinalCursor::At(cursor)) => output.extend_from_slice(
                format!(
                    "\x1b[{};{}H\x1b[?25h",
                    u32::from(cursor.row) + 2,
                    u32::from(cursor.column) + 1
                )
                .as_bytes(),
            ),
            None => {}
        }
        output.extend_from_slice(END_SYNCHRONIZED_UPDATE);
        Some(output)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tab(id: &str) -> StripTab {
        StripTab {
            id: id.into(),
            name: id.into(),
            name_source: "default".into(),
            status: "idle".into(),
            accent: None,
            title_animation: None,
        }
    }

    fn surface(tab_id: &str, revision: u64, stale: bool) -> Surface {
        Surface {
            tab_id: tab_id.into(),
            revision,
            bytes: format!("{tab_id}:{revision}").into_bytes(),
            status: "idle".into(),
            accent: None,
            stale,
            modes: None,
            cursor: None,
        }
    }

    #[test]
    fn create_and_select_commit_only_with_topology_and_a_complete_surface() {
        let mut view = ViewModel::new(None);
        let now = Instant::now();
        assert_eq!(
            view.offer(surface("a", 1, false), now, false),
            Offer::Staged
        );
        assert_eq!(view.viewed, None);
        let topology = view.topology(&[], vec![tab("a")], |_| None);
        assert!(matches!(
            topology.action,
            TopologyAction::Commit { ref surface, ref tabs }
                if surface.tab_id == "a" && tabs.len() == 1
        ));
        assert_eq!(view.viewed.as_deref(), Some("a"));
        assert_eq!(view.requested, None);

        view.request("b");
        let staged = view.topology(&[tab("a")], vec![tab("a"), tab("b")], |_| None);
        assert_eq!(staged.action, TopologyAction::Staged);
        assert_eq!(view.viewed.as_deref(), Some("a"));
        assert_eq!(
            view.offer(surface("a", 2, false), now, true),
            Offer::Commit {
                surface: surface("a", 2, false),
                tabs: None,
                requested: false
            },
            "the old view keeps painting while the switch is pending"
        );
        match view.offer(surface("b", 1, false), now, true) {
            Offer::Commit {
                surface,
                tabs: Some(tabs),
                requested: true,
            } => {
                assert_eq!(surface.tab_id, "b");
                assert_eq!(tabs.len(), 2);
            }
            other => panic!("expected a committed switch, got {other:?}"),
        }
        assert_eq!(view.viewed.as_deref(), Some("b"));
    }

    #[test]
    fn stale_replies_and_superseded_requests_never_commit() {
        let mut view = ViewModel::new(Some("a".into()));
        let now = Instant::now();
        assert!(matches!(
            view.offer(surface("a", 5, false), now, true),
            Offer::Commit { .. }
        ));
        assert_eq!(
            view.offer(surface("a", 4, false), now, true),
            Offer::Dropped
        );
        assert_eq!(
            view.offer(surface("c", 9, false), now, true),
            Offer::Dropped
        );
        view.request("b");
        view.request("c");
        assert_eq!(
            view.offer(surface("b", 1, false), now, true),
            Offer::Dropped,
            "a surface for a superseded request is discarded"
        );
        assert!(matches!(
            view.offer(surface("c", 1, false), now, true),
            Offer::Commit {
                requested: true,
                ..
            }
        ));
        assert_eq!(view.viewed.as_deref(), Some("c"));
    }

    #[test]
    fn stale_reoffers_wait_for_a_fresh_frame_then_commit_on_expiry() {
        let mut view = ViewModel::new(Some("a".into()));
        let now = Instant::now();
        view.request("b");
        assert_eq!(view.offer(surface("b", 3, true), now, true), Offer::Parked);
        assert_eq!(view.viewed.as_deref(), Some("a"));
        assert_eq!(view.expire(now + Duration::from_millis(10), |_| true), None);
        assert!(matches!(
            view.offer(surface("b", 4, false), now, true),
            Offer::Commit {
                requested: true,
                ..
            }
        ));
        assert_eq!(
            view.expire(now + STALE_SURFACE_WAIT, |_| true),
            None,
            "a fresh frame replaces the parked candidate"
        );

        let mut waiting = ViewModel::new(Some("a".into()));
        waiting.request("b");
        assert_eq!(
            waiting.offer(surface("b", 3, true), now, true),
            Offer::Parked
        );
        assert!(matches!(
            waiting.expire(now + STALE_SURFACE_WAIT, |_| true),
            Some(Offer::Commit {
                requested: true,
                ..
            })
        ));
        assert_eq!(waiting.viewed.as_deref(), Some("b"));

        let mut initial = ViewModel::new(None);
        assert!(
            matches!(
                initial.offer(surface("a", 1, true), now, true),
                Offer::Commit { .. }
            ),
            "the first attach commits a retained surface at once"
        );
    }

    #[test]
    fn close_successor_reorder_and_removal_resolve_without_stale_targets() {
        let mut view = ViewModel::new(Some("b".into()));
        let current = vec![tab("a"), tab("b"), tab("c")];
        let closed = view.topology(&current, vec![tab("a"), tab("c")], |tabs| {
            tabs.iter()
                .find(|tab| tab.id == "a")
                .map(|tab| tab.id.clone())
        });
        assert_eq!(closed.view_request.as_deref(), Some("a"));
        assert_eq!(closed.action, TopologyAction::Staged);
        assert_eq!(view.requested.as_deref(), Some("a"));
        assert!(matches!(
            view.offer(surface("a", 7, false), Instant::now(), true),
            Offer::Commit {
                tabs: Some(_),
                requested: true,
                ..
            }
        ));
        assert_eq!(view.viewed.as_deref(), Some("a"));

        let reordered = view.topology(&[tab("a"), tab("c")], vec![tab("c"), tab("a")], |_| None);
        assert_eq!(
            reordered.action,
            TopologyAction::Install {
                tabs: vec![tab("c"), tab("a")],
                changed: true
            }
        );
        let same = view.topology(&[tab("c"), tab("a")], vec![tab("c"), tab("a")], |_| None);
        assert!(matches!(
            same.action,
            TopologyAction::Install { changed: false, .. }
        ));

        view.request("c");
        let removed = view.topology(&[tab("c"), tab("a")], vec![tab("a")], |_| None);
        assert_eq!(removed.dropped_request.as_deref(), Some("c"));
        assert_eq!(removed.view_request, None);
        assert_eq!(view.requested, None);
        assert_eq!(view.viewed.as_deref(), Some("a"));

        let emptied = view.topology(&[tab("a")], Vec::new(), |_| None);
        assert_eq!(emptied.view_request, None);
        view.clear();
        assert_eq!(view.viewed, None);
    }

    // Performance: strip churn and view commits must stay far inside the attach budgets so a
    // clock tick, hover, or rapid switch never queues behind frame composition itself.
    #[test]
    fn composition_and_commits_stay_inside_the_interactive_budget_under_churn() {
        let strip = "\x1b[1;1H".to_owned() + &" chip ".repeat(50);
        let body = vec![b'x'; 100 * 23 * 12];
        let started = Instant::now();
        for _ in 0..200 {
            let frame = Frame {
                strip: &strip,
                body: Some(&body),
                overlay: Some("notice"),
                cursor: Some(FinalCursor::At(SurfaceCursor { column: 1, row: 1 })),
                clear: false,
            }
            .compose()
            .expect("frame");
            assert!(frame.len() > body.len());
            let strip_only = Frame {
                strip: &strip,
                body: None,
                overlay: None,
                cursor: Some(FinalCursor::Hidden),
                clear: false,
            }
            .compose()
            .expect("strip frame");
            assert!(strip_only.len() < body.len());
        }
        assert!(
            started.elapsed() < Duration::from_millis(400),
            "400 frames took {:?}",
            started.elapsed()
        );

        let mut view = ViewModel::new(Some("a".into()));
        let tabs = (0..50)
            .map(|index| tab(&format!("t{index}")))
            .collect::<Vec<_>>();
        let started = Instant::now();
        for round in 0..200u64 {
            let target = format!("t{}", round % 50);
            view.request(&target);
            let _ = view.topology(&tabs, tabs.clone(), |_| None);
            let outcome = view.offer(surface(&target, round + 1, false), Instant::now(), true);
            assert!(matches!(outcome, Offer::Commit { .. }), "{outcome:?}");
        }
        assert!(
            started.elapsed() < Duration::from_millis(200),
            "200 switches took {:?}",
            started.elapsed()
        );
    }

    #[test]
    fn frames_are_one_ordered_write_and_refuse_blank_or_contradictory_output() {
        let cursor = FinalCursor::At(SurfaceCursor { column: 3, row: 1 });
        let full = Frame {
            strip: "STRIP",
            body: Some(b"BODY"),
            overlay: Some("OVERLAY"),
            cursor: Some(cursor),
            clear: true,
        }
        .compose()
        .expect("full frame");
        assert_eq!(
            full,
            b"\x1b[?2026h\x1b[2J\x1b[HSTRIPBODYOVERLAY\x1b[3;4H\x1b[?25h\x1b[?2026l"
        );
        let strip_only = Frame {
            strip: "STRIP",
            body: None,
            overlay: None,
            cursor: Some(FinalCursor::Hidden),
            clear: false,
        }
        .compose()
        .expect("strip frame");
        assert_eq!(strip_only, b"\x1b[?2026hSTRIP\x1b[?25l\x1b[?2026l");
        assert_eq!(
            Frame {
                strip: "STRIP",
                body: None,
                overlay: None,
                cursor: None,
                clear: false,
            }
            .compose(),
            None,
            "strip-only damage without a cursor would leave the cursor on the strip"
        );
        assert_eq!(
            Frame {
                strip: "",
                body: Some(b""),
                overlay: None,
                cursor: Some(cursor),
                clear: true,
            }
            .compose(),
            None,
            "a clear-only frame is never written"
        );
        assert_eq!(
            Frame {
                strip: "",
                body: None,
                overlay: None,
                cursor: Some(cursor),
                clear: false,
            }
            .compose(),
            None,
            "a blank frame is never written"
        );
    }
}
