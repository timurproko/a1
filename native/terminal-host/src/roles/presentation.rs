//! Requested-versus-committed view state and the single frame compositor of the attach client.
//!
//! A create, click, shortcut, close successor, recovery, or server-driven removal changes the
//! *requested* view at once, but the visible chip and body *commit* only when attach holds a
//! topology containing the target plus a complete target surface. Superseded requests, late
//! surfaces of earlier revisions, and clear-only or contradictory frames are discarded here, so
//! the loop in `attach.rs` never paints an intermediate state the user should not see.

use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::protocol::{
    StructuredSurface, SurfaceColor, SurfaceCursor, SurfaceRow, SurfaceStyle, TerminalModes,
};
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
    /// Startup adopts its first unlisted surface once, never a late frame after the last close.
    initial_adoption_consumed: bool,
    expected_request_generation: u64,
    request_started: Option<Instant>,
    stale_candidate: Option<(Surface, Instant)>,
    /// A newly created requested tab whose first visible frame must contain drawn content.
    first_draw: Option<String>,
}

/// True when a surface carries no visible text yet, as a holder's reply before its child drew.
pub fn surface_is_blank(surface: &Surface) -> bool {
    if let Some(structured) = surface.structured.as_ref() {
        return structured
            .row_data
            .iter()
            .flat_map(|row| row.cells.iter())
            .all(|cell| cell.text.trim().is_empty());
    }
    let bytes = &surface.bytes;
    let mut index = 0usize;
    while index < bytes.len() {
        match bytes[index] {
            0x1b => {
                index += 1;
                match bytes.get(index) {
                    Some(b'[') => {
                        index += 1;
                        while index < bytes.len() && !(0x40..=0x7e).contains(&bytes[index]) {
                            index += 1;
                        }
                    }
                    Some(b']' | b'P' | b'_') => {
                        while index < bytes.len()
                            && bytes[index] != 0x07
                            && !bytes[index..].starts_with(b"\x1b\\")
                        {
                            index += 1;
                        }
                        if bytes[index..].starts_with(b"\x1b\\") {
                            index += 1;
                        }
                    }
                    _ => {}
                }
                index += 1;
            }
            byte if byte > b' ' && byte != 0x7f => return false,
            _ => index += 1,
        }
    }
    true
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
        self.request_at(tab_id, Instant::now());
    }

    fn request_at(&mut self, tab_id: &str, now: Instant) {
        self.requested = Some(tab_id.to_owned());
        self.request_started = Some(now);
        self.pending_surface = None;
        self.stale_candidate = None;
        if self.first_draw.as_deref() != Some(tab_id) {
            self.first_draw = None;
        }
    }

    /// Marks the requested tab as newly created: until its child draws, the previous view stays
    /// instead of a blank body without footer or editor.
    pub fn await_first_draw(&mut self, tab_id: &str) {
        if self.is_requested(tab_id) {
            self.first_draw = Some(tab_id.to_owned());
        }
    }

    pub fn expect_request_generation(&mut self, generation: u64) {
        self.expected_request_generation = self.expected_request_generation.max(generation);
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
        self.request_started = None;
        self.first_draw = None;
        self.stale_candidate = None;
    }

    /// Clears every view after the last tab closed.
    pub fn clear(&mut self) {
        let consumed = self.initial_adoption_consumed || self.viewed.is_some() || self.committed_revision.is_some();
        *self = Self::default();
        self.initial_adoption_consumed = consumed;
    }

    /// Protocol: the server selects its default tab before attach.start can report the ID, so the
    /// first surface becomes the requested view when nothing is viewed or requested yet.
    pub fn adopt_initial(&mut self, tab_id: &str) {
        if !self.initial_adoption_consumed && self.viewed.is_none() && self.requested.is_none() {
            self.requested = Some(tab_id.to_owned());
        }
    }

    fn is_requested(&self, tab_id: &str) -> bool {
        self.requested.as_deref() == Some(tab_id)
    }

    /// Decides whether an offered surface commits now, waits, or is discarded.
    pub fn offer(&mut self, surface: Surface, now: Instant, listed: bool) -> Offer {
        if surface.request_generation != 0
            && surface.request_generation < self.expected_request_generation
        {
            return Offer::Dropped;
        }
        self.expected_request_generation = self
            .expected_request_generation
            .max(surface.request_generation);
        self.adopt_initial(&surface.tab_id);
        let requested = self.is_requested(&surface.tab_id);
        // Invariant: from an empty strip too, a created or revealed tab waits for its first drawn
        // frame, fresh or retained, so its body, status bar, and editor appear together without a
        // bare cursor. The first view of a session, such as the tab attached at launch, waits too.
        let first_view = self.committed_revision.is_none();
        if requested
            && (first_view || self.first_draw.as_deref() == Some(surface.tab_id.as_str()))
            && surface.status != "failed"
            && surface_is_blank(&surface)
        {
            // Invariant: elapsed time cannot make an undrawn child coherent. Keep the existing
            // screen or local Agent preview until visible UI arrives; explicit failure may commit.
            self.stale_candidate = None;
            return Offer::Parked;
        }
        // Protocol: a retained re-offer may commit a requested view only after the bounded wait
        // for the holder's fresh frame, so the old coherent frame stays visible instead of a
        // surface that predates the switch.
        if requested && surface.stale && self.viewed.is_some() {
            let deadline = self
                .request_started
                .unwrap_or(now)
                .checked_add(STALE_SURFACE_WAIT)
                .unwrap_or(now);
            self.stale_candidate = Some((surface, deadline));
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
            self.request_started = None;
            self.first_draw = None;
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
        self.initial_adoption_consumed = true;
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
            self.request_started = None;
            self.staged_tabs = None;
            self.pending_surface = None;
            self.stale_candidate = None;
        }
        let mut view_request = None;
        let viewed_missing = self.viewed.as_deref().is_some_and(|viewed| !listed(viewed));
        if viewed_missing {
            self.initial_adoption_consumed = true;
        }
        if viewed_missing && self.requested.is_none() {
            // Invariant: only the fallback chooses the next view. A hidden Settings tab never takes
            // it by itself, so with nothing else left the view empties and the landing shows.
            if let Some(tab_id) = fallback(&next_tabs) {
                self.request_at(&tab_id, Instant::now());
                view_request = Some(tab_id);
            } else {
                self.viewed = None;
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
                self.request_started = None;
                self.staged_tabs = None;
                self.first_draw = None;
                self.committed_revision = Some(surface.revision);
                self.initial_adoption_consumed = true;
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

/// Complete desired presentation offered to the sole outer writer. Replacement is safe because
/// this contains the complete retained child state and all host chrome, not an incremental patch.
#[derive(Debug, Clone)]
pub struct DesiredPresentation {
    pub tab_id: Option<String>,
    pub incarnation: u64,
    pub revision: u64,
    pub geometry_generation: u64,
    pub strip: String,
    pub structured: Option<Arc<StructuredSurface>>,
    pub legacy_body: Vec<u8>,
    pub overlay: Option<String>,
    pub cursor: Option<FinalCursor>,
    pub modes: Option<TerminalModes>,
    pub columns: u16,
    pub outer_rows: u16,
    /// Number of outer rows before child row zero: one for a top strip, zero for a bottom strip.
    pub child_row_offset: u16,
    pub clear: bool,
    /// A modal is open: the strip and body draw faint beneath the overlay.
    pub dimmed: bool,
}

#[derive(Debug, Clone, Default)]
pub struct PresentationComposer {
    valid: bool,
    columns: u16,
    outer_rows: u16,
    child_row_offset: u16,
    tab_id: Option<String>,
    incarnation: u64,
    strip: String,
    structured: Option<Arc<StructuredSurface>>,
    legacy_body: Vec<u8>,
    overlay: Option<String>,
    cursor: Option<FinalCursor>,
    cursor_style: Option<(String, bool)>,
    modes: Option<TerminalModes>,
    dimmed: bool,
}

#[derive(Debug)]
pub struct PreparedPresentation {
    pub bytes: Vec<u8>,
    pub tab_id: Option<String>,
    pub incarnation: u64,
    pub revision: u64,
    pub geometry_generation: u64,
    next: PresentationComposer,
}

impl PreparedPresentation {
    /// Advance the baseline only after the writer completed the whole output operation.
    pub fn acknowledge(self, composer: &mut PresentationComposer) {
        *composer = self.next;
    }
}

impl PresentationComposer {
    pub fn prepare(
        &self,
        desired: &DesiredPresentation,
    ) -> Result<Option<PreparedPresentation>, String> {
        validate_new_surface(&self.structured, &desired.structured)?;
        let identity_changed =
            self.tab_id != desired.tab_id || self.incarnation != desired.incarnation;
        let geometry_changed = self.columns != desired.columns
            || self.outer_rows != desired.outer_rows
            || self.child_row_offset != desired.child_row_offset;
        let structured_base_invalid = match (&self.structured, &desired.structured) {
            (Some(previous), Some(next)) => {
                previous.geometry_generation != next.geometry_generation
                    || previous.columns != next.columns
                    || previous.rows != next.rows
            }
            (None, None) => false,
            _ => true,
        };
        let force = !self.valid
            || desired.clear
            || identity_changed
            || geometry_changed
            || structured_base_invalid
            || self.dimmed != desired.dimmed;
        let mut output = Vec::new();
        let overlay_damage = changed_overlay_rows(self, desired);

        // Invariant: a complete structured repaint overwrites every outer cell in place, so a tab
        // switch or creation never shows a cleared screen (and a blank strip) on terminals that
        // present synchronized output early. Only a first paint, an explicit clear, or a legacy
        // body, which cannot promise full coverage, clears the screen.
        let clear_screen = force && (!self.valid || desired.clear || desired.structured.is_none());
        if clear_screen {
            output.extend_from_slice(b"\x1b[2J\x1b[H");
        }
        let strip_changed = force || self.strip != desired.strip;
        if strip_changed {
            output.extend_from_slice(desired.strip.as_bytes());
        }

        let body_changed = render_body(
            self,
            desired,
            force,
            clear_screen,
            strip_changed,
            &overlay_damage,
            &mut output,
        )?;

        if desired.dimmed {
            output = dim_backdrop(&output, desired.structured.as_deref());
        }
        let overlay_changed = self.overlay != desired.overlay;
        if let Some(overlay) = desired.overlay.as_deref()
            && (force || overlay_changed || body_changed)
        {
            output.extend_from_slice(overlay.as_bytes());
        }
        let cursor = clamped_cursor(desired);
        let cursor_style = desired
            .modes
            .as_ref()
            .map(|modes| (modes.cursor_style.clone(), modes.cursor_blink));
        let cursor_style_changed = self.cursor_style != cursor_style;
        if cursor_style_changed {
            if let Some((style, blink)) = cursor_style.as_ref() {
                output.extend_from_slice(super::outer_input::cursor_style_sequence(style, *blink));
            } else {
                output.extend_from_slice(super::outer_input::RESET_CURSOR_STYLE);
            }
        }
        let cursor_changed = self.cursor != cursor;
        if force || !output.is_empty() || cursor_changed || desired.modes != self.modes {
            match cursor {
                Some(FinalCursor::Hidden) => output.extend_from_slice(b"\x1b[?25l"),
                Some(FinalCursor::At(cursor)) => output.extend_from_slice(
                    format!(
                        "\x1b[{};{}H\x1b[?25h",
                        u32::from(cursor.row) + 1 + u32::from(desired.child_row_offset),
                        u32::from(cursor.column) + 1
                    )
                    .as_bytes(),
                ),
                None => {}
            }
        }
        if output.is_empty() {
            return Ok(None);
        }
        let mut bytes = Vec::with_capacity(output.len() + 16);
        bytes.extend_from_slice(BEGIN_SYNCHRONIZED_UPDATE);
        bytes.extend_from_slice(&output);
        bytes.extend_from_slice(END_SYNCHRONIZED_UPDATE);
        let next = PresentationComposer {
            valid: true,
            columns: desired.columns,
            outer_rows: desired.outer_rows,
            child_row_offset: desired.child_row_offset,
            tab_id: desired.tab_id.clone(),
            incarnation: desired.incarnation,
            strip: desired.strip.clone(),
            structured: desired.structured.clone(),
            legacy_body: desired.legacy_body.clone(),
            overlay: desired.overlay.clone(),
            cursor,
            cursor_style,
            modes: desired.modes.clone(),
            dimmed: desired.dimmed,
        };
        Ok(Some(PreparedPresentation {
            bytes,
            tab_id: desired.tab_id.clone(),
            incarnation: desired.incarnation,
            revision: desired.revision,
            geometry_generation: desired.geometry_generation,
            next,
        }))
    }

    pub fn invalidate(&mut self) {
        self.valid = false;
    }
}

/// The final cursor, hidden when it falls outside the child rows.
fn clamped_cursor(desired: &DesiredPresentation) -> Option<FinalCursor> {
    match desired.cursor {
        Some(FinalCursor::At(cursor))
            if cursor.column < desired.columns
                && cursor.row < desired.outer_rows.saturating_sub(1) =>
        {
            Some(FinalCursor::At(cursor))
        }
        Some(_) => Some(FinalCursor::Hidden),
        None => None,
    }
}

fn changed_overlay_rows(
    current: &PresentationComposer,
    desired: &DesiredPresentation,
) -> std::collections::BTreeSet<usize> {
    let mut rows = std::collections::BTreeSet::new();
    if current.overlay == desired.overlay {
        return rows;
    }
    if let Some(overlay) = current.overlay.as_deref() {
        rows.extend(overlay_child_rows(
            overlay.as_bytes(),
            desired.outer_rows,
            current.child_row_offset,
        ));
    }
    if let Some(overlay) = desired.overlay.as_deref() {
        rows.extend(overlay_child_rows(
            overlay.as_bytes(),
            desired.outer_rows,
            desired.child_row_offset,
        ));
    }
    rows
}

/// Immutable current cells are shared across chrome offers and completed-write baselines.
fn same_surface(previous: &Option<Arc<StructuredSurface>>, next: &Option<Arc<StructuredSurface>>) -> bool {
    matches!((previous, next), (Some(previous), Some(next)) if Arc::ptr_eq(previous, next))
}

fn validate_new_surface(previous: &Option<Arc<StructuredSurface>>, next: &Option<Arc<StructuredSurface>>) -> Result<(), String> {
    if !same_surface(previous, next) && let Some(surface) = next {
        surface.validate()?;
    }
    Ok(())
}

fn render_body(
    current: &PresentationComposer,
    desired: &DesiredPresentation,
    force: bool,
    clear_screen: bool,
    strip_changed: bool,
    overlay_damage: &std::collections::BTreeSet<usize>,
    output: &mut Vec<u8>,
) -> Result<bool, String> {
    if !force && overlay_damage.is_empty() && same_surface(&current.structured, &desired.structured) {
        return Ok(false);
    }
    let Some(surface) = desired.structured.as_deref() else {
        if force || current.legacy_body != desired.legacy_body || !overlay_damage.is_empty() {
            output.extend_from_slice(&relocate_legacy_body(
                &sanitize_legacy_body(&desired.legacy_body),
                desired.child_row_offset,
            )?);
            if !desired.legacy_body.is_empty() && !strip_changed {
                output.extend_from_slice(desired.strip.as_bytes());
            }
            return Ok(!desired.legacy_body.is_empty());
        }
        return Ok(false);
    };
    let prior = (!force).then_some(current.structured.as_deref()).flatten();
    render_palette_damage(output, prior, surface, force);
    let visible_rows =
        usize::from(surface.rows).min(usize::from(desired.outer_rows.saturating_sub(1)));
    let overlay_clip = desired
        .overlay
        .as_deref()
        .map(|overlay| {
            overlay_child_spans(
                overlay.as_bytes(),
                desired.outer_rows,
                desired.child_row_offset,
            )
        })
        .unwrap_or_default();
    for (row_index, changed) in surface_row_damage(prior, surface)
        .take(visible_rows)
        .enumerate()
    {
        if force || changed || overlay_damage.contains(&row_index) {
            let row = surface
                .row_data
                .get(row_index)
                .ok_or_else(|| "structured surface row is missing".to_owned())?;
            render_surface_row_clipped(
                output,
                row,
                row_index,
                desired.columns,
                &surface.styles,
                &surface.links,
                overlay_clip.get(&row_index).copied(),
                desired.child_row_offset,
            )?;
        }
    }
    if force && !clear_screen {
        for row_index in visible_rows..usize::from(desired.outer_rows.saturating_sub(1)) {
            let row = row_index + 1 + usize::from(desired.child_row_offset);
            output.extend_from_slice(format!("\x1b[{row};1H\x1b[0m\x1b[K").as_bytes());
        }
    }
    Ok(false)
}

fn relocate_legacy_body(bytes: &[u8], child_row_offset: u16) -> Result<Vec<u8>, String> {
    if child_row_offset != 0 {
        return Ok(bytes.to_vec());
    }
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0usize;
    while index < bytes.len() {
        if !bytes[index..].starts_with(b"\x1b[") {
            output.push(bytes[index]);
            index += 1;
            continue;
        }
        let start = index + 2;
        let end = bytes[start..]
            .iter()
            .position(|byte| (0x40..=0x7e).contains(byte))
            .map(|offset| start + offset)
            .ok_or_else(|| "malformed legacy surface: incomplete CSI".to_owned())?;
        if !matches!(bytes[end], b'H' | b'f') {
            output.extend_from_slice(&bytes[index..=end]);
            index = end + 1;
            continue;
        }
        let parameters = std::str::from_utf8(&bytes[start..end])
            .map_err(|_| "malformed legacy surface: invalid cursor position".to_owned())?;
        let mut values = parameters.split(';');
        let row = match values.next().unwrap_or_default() {
            "" => 1,
            value => value
                .parse::<u16>()
                .map_err(|_| "malformed legacy surface: invalid cursor row".to_owned())?,
        };
        let column = values.next();
        if values.next().is_some()
            || column.is_some_and(|value| !value.is_empty() && value.parse::<u16>().is_err())
        {
            return Err("malformed legacy surface: invalid cursor position".to_owned());
        }
        output.extend_from_slice(b"\x1b[");
        output.extend_from_slice(row.saturating_sub(1).max(1).to_string().as_bytes());
        if let Some(column) = column {
            output.push(b';');
            output.extend_from_slice(column.as_bytes());
        }
        output.push(bytes[end]);
        index = end + 1;
    }
    Ok(output)
}

/// Foreground faintness alone leaves colored backgrounds (including pinned prompts) vivid.
/// Transform backdrop SGR without changing the retained child grid or the modal appended later.
fn dim_backdrop(bytes: &[u8], surface: Option<&StructuredSurface>) -> Vec<u8> {
    let mut output = Vec::with_capacity(bytes.len() + bytes.len() / 8 + 4);
    output.extend_from_slice(b"\x1b[2m");
    let mut index = 0usize;
    while index < bytes.len() {
        if bytes[index..].starts_with(b"\x1b[")
            && let Some(end) = bytes[index + 2..]
                .iter()
                .position(|byte| (0x40..=0x7e).contains(byte))
                .map(|offset| index + 2 + offset)
        {
            output.extend_from_slice(&bytes[index..=end]);
            let private = bytes
                .get(index + 2)
                .is_some_and(|byte| (b'<'..=b'?').contains(byte));
            if bytes[end] == b'm' && !private {
                // The original SGR must remain first: preserve all foreground, underline,
                // inverse, and other attributes before reasserting faint and the backdrop color.
                output.extend_from_slice(b"\x1b[2m");
                if let Ok(parameters) = std::str::from_utf8(&bytes[index + 2..end]) {
                    if let Some(color) = dimmed_background_sgr(parameters, surface) {
                        output.extend_from_slice(color.as_bytes());
                    }
                }
            }
            index = end + 1;
            continue;
        }
        output.push(bytes[index]);
        index += 1;
    }
    output
}

/// Return the last effective background of a compound SGR. A reset restores the dimmed
/// child default when the child explicitly published that color.
fn dimmed_background_sgr(parameters: &str, surface: Option<&StructuredSurface>) -> Option<String> {
    let parts: Vec<&str> = parameters.split(';').collect();
    let mut background = None;
    let mut index = 0;
    while index < parts.len() {
        match parts[index].parse::<u16>().ok() {
            Some(0 | 49) => {
                background = surface
                    .filter(|surface| !surface.background_inherited())
                    .map(|surface| {
                        let dimmed = surface.default_background.map(|channel| channel / 2);
                        format!("\x1b[2;48;5;{}m", super::landing::palette_index(dimmed))
                    });
            }
            Some(48) if parts.get(index + 1) == Some(&"2") && index + 4 < parts.len() => {
                if let (Ok(red), Ok(green), Ok(blue)) = (
                    parts[index + 2].parse::<u8>(),
                    parts[index + 3].parse::<u8>(),
                    parts[index + 4].parse::<u8>(),
                ) {
                    background = Some(format!(
                        "\x1b[2;48;2;{};{};{}m",
                        red / 2,
                        green / 2,
                        blue / 2
                    ));
                }
                index += 4;
            }
            Some(48) if parts.get(index + 1) == Some(&"5") && index + 2 < parts.len() => {
                if let Ok(palette_index) = parts[index + 2].parse::<u8>() {
                    let rgb = surface
                        .and_then(|surface| {
                            surface.palette.get(usize::from(palette_index)).copied()
                        })
                        .unwrap_or_else(|| xterm_palette_rgb(palette_index));
                    let dimmed = rgb.map(|channel| channel / 2);
                    background = Some(format!(
                        "\x1b[2;48;5;{}m",
                        super::landing::palette_index(dimmed)
                    ));
                }
                index += 2;
            }
            _ => {}
        }
        index += 1;
    }
    background
}

/// Fallback for the landing and legacy body, which have no structured child palette.
fn xterm_palette_rgb(index: u8) -> [u8; 3] {
    const BASE: [[u8; 3]; 16] = [
        [0, 0, 0],
        [128, 0, 0],
        [0, 128, 0],
        [128, 128, 0],
        [0, 0, 128],
        [128, 0, 128],
        [0, 128, 128],
        [192, 192, 192],
        [128, 128, 128],
        [255, 0, 0],
        [0, 255, 0],
        [255, 255, 0],
        [0, 0, 255],
        [255, 0, 255],
        [0, 255, 255],
        [255, 255, 255],
    ];
    match index {
        0..=15 => BASE[usize::from(index)],
        16..=231 => {
            let cube = index - 16;
            let level = |value: u8| if value == 0 { 0 } else { 55 + value * 40 };
            [level(cube / 36), level((cube / 6) % 6), level(cube % 6)]
        }
        _ => [8 + (index - 232) * 10; 3],
    }
}

fn sanitize_legacy_body(bytes: &[u8]) -> Vec<u8> {
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0usize;
    while index < bytes.len() {
        if bytes[index..].starts_with(BEGIN_SYNCHRONIZED_UPDATE) {
            index += BEGIN_SYNCHRONIZED_UPDATE.len();
        } else if bytes[index..].starts_with(END_SYNCHRONIZED_UPDATE) {
            index += END_SYNCHRONIZED_UPDATE.len();
        } else if bytes[index] == 0x07 {
            index += 1;
        } else {
            output.push(bytes[index]);
            index += 1;
        }
    }
    output
}

/// Compares frame-local row references while retaining the monotonic-table fast path.
fn surface_row_damage<'a>(
    previous: Option<&'a StructuredSurface>,
    next: &'a StructuredSurface,
) -> impl Iterator<Item = bool> + 'a {
    let dictionaries_preserved = previous.is_some_and(|surface| {
        next.styles.starts_with(&surface.styles) && next.links.starts_with(&surface.links)
    });
    next.row_data.iter().enumerate().map(move |(index, row)| {
        previous.is_none_or(|surface| {
            surface.row_data.get(index) != Some(row)
                || (!dictionaries_preserved
                    && row.cells.iter().any(|cell| {
                        surface.styles.get(usize::from(cell.style))
                            != next.styles.get(usize::from(cell.style))
                            || cell.link.is_some_and(|link| {
                                surface.links.get(usize::from(link))
                                    != next.links.get(usize::from(link))
                            })
                    }))
        })
    })
}

fn render_palette_damage(
    output: &mut Vec<u8>,
    previous: Option<&StructuredSurface>,
    next: &StructuredSurface,
    force: bool,
) {
    if next.palette.len() != 256 {
        return;
    }
    // Invariant: a color the child never set keeps the outer terminal's own theme; publishing the
    // emulator's initial value would paint, for example, a black default background.
    if force
        || previous.is_none_or(|surface| {
            surface.palette.len() != 256
                || surface.default_foreground != next.default_foreground
                || surface.foreground_inherited() != next.foreground_inherited()
        })
    {
        if next.foreground_inherited() {
            output.extend_from_slice(b"\x1b]110\x1b\\");
        } else {
            push_osc_rgb(output, 10, None, next.default_foreground);
        }
    }
    if force
        || previous.is_none_or(|surface| {
            surface.palette.len() != 256
                || surface.default_background != next.default_background
                || surface.background_inherited() != next.background_inherited()
        })
    {
        if next.background_inherited() {
            output.extend_from_slice(b"\x1b]111\x1b\\");
        } else {
            push_osc_rgb(output, 11, None, next.default_background);
        }
    }
    if force || previous.is_none_or(|surface| surface.cursor_color != next.cursor_color) {
        if let Some(color) = next.cursor_color {
            push_osc_rgb(output, 12, None, color);
        } else {
            output.extend_from_slice(b"\x1b]112\x1b\\");
        }
    }
    let all_inherited = (0..256).all(|index| next.palette_inherited(index));
    let mut reset_all = false;
    for (index, color) in next.palette.iter().copied().enumerate() {
        let inherited = next.palette_inherited(index);
        let changed = force
            || previous.is_none_or(|surface| {
                surface.palette.get(index).copied() != Some(color)
                    || surface.palette_inherited(index) != inherited
            });
        if !changed {
            continue;
        }
        if !inherited {
            push_osc_rgb(output, 4, Some(index), color);
        } else if all_inherited {
            // Performance: One reset restores the whole outer palette instead of 256 single resets.
            if !reset_all {
                output.extend_from_slice(b"\x1b]104\x1b\\");
                reset_all = true;
            }
        } else {
            output.extend_from_slice(format!("\x1b]104;{index}\x1b\\").as_bytes());
        }
    }
}

fn push_osc_rgb(output: &mut Vec<u8>, command: u8, index: Option<usize>, color: [u8; 3]) {
    output.extend_from_slice(format!("\x1b]{command};").as_bytes());
    if let Some(index) = index {
        output.extend_from_slice(format!("{index};").as_bytes());
    }
    output.extend_from_slice(
        format!(
            "rgb:{:02x}/{:02x}/{:02x}\x1b\\",
            color[0], color[1], color[2]
        )
        .as_bytes(),
    );
}

/// Reconstructs a complete positioned ANSI fallback from one coherent structured commit. This is
/// used only for negotiated legacy peers and never introduces synchronized-output delimiters.
pub(crate) fn complete_surface_bytes(surface: &StructuredSurface) -> Result<Vec<u8>, String> {
    complete_surface_rows(surface, surface.row_data.len())
}

/// The child stays live while the host retains the provisional footer through chip activation.
/// Never emit transient real status cells that would flash before the held footer is drawn.
pub(crate) fn complete_surface_body_without_footer(surface: &StructuredSurface) -> Result<Vec<u8>, String> {
    complete_surface_rows(surface, surface.row_data.len().saturating_sub(2))
}

fn complete_surface_rows(surface: &StructuredSurface, rows: usize) -> Result<Vec<u8>, String> {
    surface.validate()?;
    let mut output = Vec::new();
    render_palette_damage(&mut output, None, surface, true);
    for (row_index, row) in surface.row_data.iter().take(rows).enumerate() {
        render_surface_row(
            &mut output,
            row,
            row_index,
            surface.columns,
            &surface.styles,
            &surface.links,
        )?;
    }
    Ok(output)
}

pub(super) fn render_surface_row(
    output: &mut Vec<u8>,
    row: &SurfaceRow,
    row_index: usize,
    columns: u16,
    styles: &[SurfaceStyle],
    links: &[crate::protocol::SurfaceLink],
) -> Result<(), String> {
    render_surface_row_clipped(output, row, row_index, columns, styles, links, None, 1)
}

/// Renders one child row, leaving the half-open column span `clip` untouched for a host overlay.
fn render_surface_row_clipped(
    output: &mut Vec<u8>,
    row: &SurfaceRow,
    row_index: usize,
    columns: u16,
    styles: &[SurfaceStyle],
    links: &[crate::protocol::SurfaceLink],
    clip: Option<(usize, usize)>,
    child_row_offset: u16,
) -> Result<(), String> {
    let terminal_row = row_index + 1 + usize::from(child_row_offset);
    output.extend_from_slice(format!("\x1b[{terminal_row};1H").as_bytes());
    if clip.is_none() {
        // Invariant: a changed retained row replaces its former terminal cells before repainting.
        // Explicit cell writes then restore styled blanks, while a cleared control/status row cannot
        // survive because of terminal-specific blank-cell or wrap behavior.
        output.extend_from_slice(b"\x1b[0m\x1b[2K");
    }
    let mut active_style: Option<u16> = None;
    let mut active_link: Option<u16> = None;
    let visible = usize::from(columns).min(row.cells.len());
    let overlaps = |start: usize, width: usize| {
        clip.is_some_and(|(left, right)| start < right && start + width.max(1) > left)
    };
    let mut reposition = false;
    for (column, cell) in row.cells[..visible].iter().enumerate() {
        if cell.width == 0 {
            continue;
        }
        let width = if cell.width == 2 && column + 1 >= visible {
            1
        } else {
            usize::from(cell.width)
        };
        if overlaps(column, width) {
            close_link(output, &mut active_link);
            reposition = true;
            continue;
        }
        if reposition {
            output.extend_from_slice(format!("\x1b[{terminal_row};{}H", column + 1).as_bytes());
            reposition = false;
        }
        if cell.width == 2 && column + 1 >= visible {
            close_link(output, &mut active_link);
            set_style(output, styles, cell.style, &mut active_style)?;
            output.push(b' ');
            continue;
        }
        if cell.link != active_link {
            close_link(output, &mut active_link);
            if let Some(index) = cell.link {
                let link = links
                    .get(usize::from(index))
                    .ok_or_else(|| "surface hyperlink index is invalid".to_owned())?;
                output.extend_from_slice(b"\x1b]8;");
                if let Some(id) = link.id.as_deref() {
                    output.extend_from_slice(b"id=");
                    output.extend_from_slice(id.as_bytes());
                }
                output.push(b';');
                output.extend_from_slice(link.uri.as_bytes());
                output.extend_from_slice(b"\x1b\\");
                active_link = Some(index);
            }
        }
        set_style(output, styles, cell.style, &mut active_style)?;
        output.extend_from_slice(cell.text.as_bytes());
    }
    close_link(output, &mut active_link);
    if active_style.is_some() {
        output.extend_from_slice(b"\x1b[0m");
    }
    erase_surface_row_suffix(
        output,
        row_index,
        visible,
        usize::from(columns),
        clip,
        reposition,
        child_row_offset,
    );
    Ok(())
}

/// Erases a spectator's wider suffix without changing styled child blanks or overlay cells.
fn erase_surface_row_suffix(
    output: &mut Vec<u8>,
    row_index: usize,
    visible: usize,
    columns: usize,
    clip: Option<(usize, usize)>,
    reposition: bool,
    child_row_offset: u16,
) {
    let terminal_row = row_index + 1 + usize::from(child_row_offset);
    if visible < columns {
        match clip.filter(|(_, right)| *right > visible) {
            None => {
                if reposition {
                    output.extend_from_slice(
                        format!("\x1b[{terminal_row};{}H", visible + 1).as_bytes(),
                    );
                }
                output.extend_from_slice(b"\x1b[K");
            }
            Some((left, right)) => {
                // Invariant: The suffix contains the overlay, so erase explicitly around it.
                let before = left.clamp(visible, columns);
                if before > visible {
                    output.extend_from_slice(
                        format!("\x1b[{terminal_row};{}H", visible + 1).as_bytes(),
                    );
                    output.extend_from_slice(" ".repeat(before - visible).as_bytes());
                }
                if right < columns {
                    output.extend_from_slice(
                        format!("\x1b[{terminal_row};{}H\x1b[K", right + 1).as_bytes(),
                    );
                }
            }
        }
    }
}

/// Finds, per child row, the half-open column span an overlay paints, by following its cursor
/// positioning and the display width of the text it writes.
fn overlay_child_spans(
    bytes: &[u8],
    outer_rows: u16,
    child_row_offset: u16,
) -> std::collections::BTreeMap<usize, (usize, usize)> {
    let mut spans = std::collections::BTreeMap::<usize, (usize, usize)>::new();
    let Ok(text) = std::str::from_utf8(bytes) else {
        return spans;
    };
    let (mut row, mut column) = (0usize, 0usize);
    let mut rest = text;
    while let Some(ch) = rest.chars().next() {
        if rest.starts_with("\x1b[") {
            let parameters = &rest[2..];
            let Some(end) = parameters.find(|value: char| ('\x40'..='\x7e').contains(&value))
            else {
                break;
            };
            if parameters.as_bytes()[end] == b'H' {
                let mut values = parameters[..end]
                    .split(';')
                    .map(|value| value.parse::<usize>().unwrap_or(1).max(1));
                row = values.next().unwrap_or(1) - 1;
                column = values.next().unwrap_or(1) - 1;
            }
            rest = &parameters[end + 1..];
            continue;
        }
        rest = &rest[ch.len_utf8()..];
        if ch.is_control() {
            continue;
        }
        let width = unicode_width::UnicodeWidthChar::width(ch).unwrap_or(0);
        let child_row = row.checked_sub(usize::from(child_row_offset));
        if width > 0
            && row < usize::from(outer_rows)
            && child_row.is_some_and(|value| value < usize::from(outer_rows.saturating_sub(1)))
        {
            let span = spans
                .entry(child_row.expect("validated child row"))
                .or_insert((column, column + width));
            span.0 = span.0.min(column);
            span.1 = span.1.max(column + width);
        }
        column += width;
    }
    spans
}

fn close_link(output: &mut Vec<u8>, active: &mut Option<u16>) {
    if active.take().is_some() {
        output.extend_from_slice(b"\x1b]8;;\x1b\\");
    }
}

fn set_style(
    output: &mut Vec<u8>,
    styles: &[SurfaceStyle],
    index: u16,
    active: &mut Option<u16>,
) -> Result<(), String> {
    if *active == Some(index) {
        return Ok(());
    }
    let style = styles
        .get(usize::from(index))
        .ok_or_else(|| "surface style index is invalid".to_owned())?;
    output.extend_from_slice(b"\x1b[0m");
    let mut parameters = Vec::<String>::new();
    if style.bold {
        parameters.push("1".into());
    }
    if style.faint {
        parameters.push("2".into());
    }
    if style.italic {
        parameters.push("3".into());
    }
    match style.underline {
        1 => parameters.push("4".into()),
        value @ 2..=5 => parameters.push(format!("4:{value}")),
        _ => {}
    }
    if style.blink {
        parameters.push("5".into());
    }
    if style.inverse || style.selected {
        parameters.push("7".into());
    }
    if style.conceal {
        parameters.push("8".into());
    }
    if style.strikethrough {
        parameters.push("9".into());
    }
    if style.overline {
        parameters.push("53".into());
    }
    push_color(&mut parameters, 38, style.foreground);
    push_color(&mut parameters, 48, style.background);
    push_color(&mut parameters, 58, style.underline_color);
    if !parameters.is_empty() {
        output.extend_from_slice(format!("\x1b[{}m", parameters.join(";")).as_bytes());
    }
    *active = Some(index);
    Ok(())
}

fn push_color(parameters: &mut Vec<String>, base: u8, color: SurfaceColor) {
    match color {
        SurfaceColor::Default => parameters.push((base + 1).to_string()),
        SurfaceColor::Palette(index) => parameters.push(format!("{base};5;{index}")),
        SurfaceColor::Rgb([red, green, blue]) => {
            parameters.push(format!("{base};2;{red};{green};{blue}"));
        }
    }
}

fn overlay_child_rows(
    bytes: &[u8],
    outer_rows: u16,
    child_row_offset: u16,
) -> std::collections::BTreeSet<usize> {
    let mut rows = std::collections::BTreeSet::new();
    let mut current = 0usize;
    let mut index = 0usize;
    while index < bytes.len() {
        if bytes[index..].starts_with(b"\x1b[") {
            let start = index + 2;
            if let Some(end) = bytes[start..]
                .iter()
                .position(|byte| (0x40..=0x7e).contains(byte))
                .map(|offset| start + offset)
            {
                if bytes[end] == b'H' {
                    let row = std::str::from_utf8(&bytes[start..end])
                        .ok()
                        .and_then(|parameters| parameters.split(';').next())
                        .and_then(|value| value.parse::<usize>().ok())
                        .unwrap_or(1)
                        .saturating_sub(1);
                    current = row;
                }
                index = end + 1;
                continue;
            }
        }
        if bytes[index] == b'\n' {
            current = current.saturating_add(1);
        } else if bytes[index] >= 0x20 && current < usize::from(outer_rows) {
            if let Some(child_row) = current.checked_sub(usize::from(child_row_offset))
                && child_row < usize::from(outer_rows.saturating_sub(1))
            {
                rows.insert(child_row);
            }
        }
        index += 1;
    }
    rows
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
mod parity_tests;

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
            incarnation: 1,
            revision,
            request_generation: 0,
            bytes: format!("{tab_id}:{revision}").into_bytes(),
            structured: None,
            status: "idle".into(),
            accent: None,
            stale,
            modes: None,
            cursor: None,
        }
    }

    #[test]
    fn admission_selected_existing_tab_installs_without_an_inactive_topology() {
        let mut view = ViewModel::new(Some("b".into()));
        let topology = view.topology(&[], vec![tab("a"), tab("b")], |_| None);
        assert!(matches!(
            topology.action,
            TopologyAction::Install {
                ref tabs,
                changed: true
            } if tabs.len() == 2
        ));
        assert_eq!(view.viewed.as_deref(), Some("b"));
        assert_eq!(view.requested.as_deref(), Some("b"));
        assert!(!view.has_staged_tabs());
    }

    #[test]
    fn a_closed_last_tab_cannot_re_adopt_its_late_surface() {
        let now = Instant::now();
        let mut view = ViewModel::new(Some("old".into()));
        assert!(matches!(view.offer(surface("old", 1, false), now, true), Offer::Commit { .. }));
        view.topology(&[tab("old")], vec![], |_| None);
        assert_eq!(view.viewed, None);
        assert_eq!(view.offer(surface("old", 2, false), now, false), Offer::Dropped);
        assert_eq!(view.requested, None);
        view.clear();
        assert_eq!(view.offer(surface("old", 3, false), now, false), Offer::Dropped);
        assert_eq!(view.requested, None);
        view.request("next");
        assert_eq!(view.offer(surface("next", 1, false), now, false), Offer::Staged);
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
    fn created_tab_keeps_the_previous_view_until_its_child_draws() {
        let now = Instant::now();
        let mut blank = surface("b", 7, false);
        blank.bytes = b"\x1b[2J\x1b[H\x1b]10;rgb:ff/ff/ff\x07   \r\n".to_vec();
        assert!(surface_is_blank(&blank));
        assert!(!surface_is_blank(&surface("b", 8, false)));

        let mut view = ViewModel::new(Some("a".into()));
        view.request_at("b", now);
        view.await_first_draw("b");
        assert_eq!(view.offer(blank.clone(), now, true), Offer::Parked);
        assert_eq!(view.viewed.as_deref(), Some("a"));
        assert_eq!(view.expire(now + STALE_SURFACE_WAIT, |_| true), None);
        assert!(matches!(
            view.offer(surface("b", 8, false), now, true),
            Offer::Commit {
                requested: true,
                ..
            }
        ));
        assert_eq!(view.viewed.as_deref(), Some("b"));

        // Invariant: A revealed tab's blank retained surface waits for its draw, not the stale wait.
        let mut revealed = ViewModel::new(Some("a".into()));
        revealed.request_at("b", now);
        revealed.await_first_draw("b");
        let mut retained = blank.clone();
        retained.stale = true;
        assert_eq!(revealed.offer(retained, now, true), Offer::Parked);
        assert_eq!(revealed.expire(now + STALE_SURFACE_WAIT, |_| true), None);
        assert_eq!(revealed.viewed.as_deref(), Some("a"));

        // Invariant: elapsed time and repeated revisions never expose an undrawn child.
        let mut silent = ViewModel::new(Some("a".into()));
        silent.request_at("c", now);
        silent.await_first_draw("c");
        let mut empty = blank.clone();
        empty.tab_id = "c".into();
        assert_eq!(silent.offer(empty.clone(), now, true), Offer::Parked);
        empty.revision += 1;
        assert_eq!(silent.offer(empty, now + Duration::from_secs(30), true), Offer::Parked);
        assert_eq!(silent.expire(now + Duration::from_secs(60), |_| true), None);
        assert_eq!(silent.viewed.as_deref(), Some("a"));
        let mut ready = surface("c", 10, false);
        ready.tab_id = "c".into();
        assert!(matches!(silent.offer(ready, now, true), Offer::Commit { requested: true, .. }));

        // Invariant: Creating the first tab from an empty strip waits for its drawn frame as well.
        let mut first = ViewModel::new(None);
        first.request_at("d", now);
        first.await_first_draw("d");
        let mut undrawn = blank.clone();
        undrawn.tab_id = "d".into();
        assert_eq!(first.offer(undrawn, now, true), Offer::Parked);
        assert_eq!(first.viewed, None);
        let mut drawn = surface("d", 9, false);
        drawn.tab_id = "d".into();
        assert!(matches!(
            first.offer(drawn, now, true),
            Offer::Commit {
                requested: true,
                ..
            }
        ));

        // Invariant: The tab attached at launch also waits for its first drawn frame.
        let mut launch = ViewModel::new(None);
        let mut launch_blank = blank.clone();
        launch_blank.tab_id = "e".into();
        assert_eq!(launch.offer(launch_blank.clone(), now, true), Offer::Parked);
        assert_eq!(
            launch.offer(launch_blank.clone(), now + Duration::from_millis(500), true),
            Offer::Parked
        );
        assert_eq!(launch.expire(now + Duration::from_secs(60), |_| true), None);
        assert_eq!(launch.viewed, None);
        let mut launch_ready = surface("e", 10, false);
        launch_ready.tab_id = "e".into();
        assert!(matches!(
            launch.offer(launch_ready, now + Duration::from_secs(60), true),
            Offer::Commit { requested: true, .. }
        ));

        // Invariant: explicit failure resolves the startup gate instead of exposing an ordinary blank.
        let mut failing = ViewModel::new(Some("a".into()));
        failing.request_at("f", now);
        failing.await_first_draw("f");
        let mut failed = blank.clone();
        failed.tab_id = "f".into();
        failed.status = "failed".into();
        assert!(matches!(
            failing.offer(failed, now, true),
            Offer::Commit { requested: true, .. }
        ));

        // Invariant: Switching to an existing tab is not delayed by a blank body.
        let mut switch = ViewModel::new(Some("a".into()));
        assert!(matches!(
            switch.offer(surface("a", 3, false), now, true),
            Offer::Commit { .. }
        ));
        switch.request_at("b", now);
        assert!(matches!(
            switch.offer(blank, now, true),
            Offer::Commit { .. }
        ));
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
        view.request_at("b", now);
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
        waiting.request_at("b", now);
        assert_eq!(
            waiting.offer(surface("b", 3, true), now, true),
            Offer::Parked
        );
        assert_eq!(
            waiting.offer(
                surface("b", 4, true),
                now + Duration::from_millis(100),
                true
            ),
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

        // Invariant: when only a hidden Settings tab survives the viewed tab, the fallback names
        // nothing and the view empties for the landing instead of taking that Settings tab.
        let mut view = ViewModel::new(Some("a".into()));
        let hidden = view.topology(
            &[tab("a"), tab("settings-1")],
            vec![tab("settings-1")],
            |_| None,
        );
        assert_eq!(hidden.view_request, None);
        assert_eq!(view.requested, None);
        assert_eq!(view.viewed, None);
        assert!(matches!(hidden.action, TopologyAction::Install { .. }));
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

    fn structured_fixture() -> StructuredSurface {
        StructuredSurface {
            columns: 3,
            rows: 2,
            geometry_generation: 4,
            commit_kind: crate::protocol::SurfaceCommitKind::Complete,
            row_data: vec![
                SurfaceRow {
                    cells: vec![
                        crate::protocol::SurfaceCell {
                            text: "A".into(),
                            width: 1,
                            style: 1,
                            link: Some(0),
                        },
                        crate::protocol::SurfaceCell {
                            text: "界".into(),
                            width: 2,
                            style: 0,
                            link: None,
                        },
                        crate::protocol::SurfaceCell {
                            text: String::new(),
                            width: 0,
                            style: 0,
                            link: None,
                        },
                    ],
                },
                SurfaceRow {
                    cells: vec![
                        crate::protocol::SurfaceCell {
                            text: "B".into(),
                            ..Default::default()
                        },
                        crate::protocol::SurfaceCell {
                            text: " ".into(),
                            ..Default::default()
                        },
                        crate::protocol::SurfaceCell {
                            text: " ".into(),
                            ..Default::default()
                        },
                    ],
                },
            ],
            styles: vec![
                SurfaceStyle::default(),
                SurfaceStyle {
                    foreground: SurfaceColor::Rgb([1, 2, 3]),
                    background: SurfaceColor::Palette(4),
                    underline_color: SurfaceColor::Palette(5),
                    bold: true,
                    italic: true,
                    underline: 3,
                    strikethrough: true,
                    ..Default::default()
                },
            ],
            links: vec![crate::protocol::SurfaceLink {
                id: Some("link-1".into()),
                uri: "https://example.test/path".into(),
            }],
            palette: vec![[0, 0, 0]; 256],
            default_foreground: [240, 240, 240],
            default_background: [10, 10, 10],
            cursor_color: Some([20, 30, 40]),
            inherited_colors: None,
        }
    }

    fn desired(surface: Option<StructuredSurface>, legacy_body: Vec<u8>) -> DesiredPresentation {
        DesiredPresentation {
            tab_id: Some("a".into()),
            incarnation: 2,
            revision: 1,
            geometry_generation: surface
                .as_ref()
                .map_or(0, |value| value.geometry_generation),
            strip: "\x1b[1;1HSTRIP".into(),
            structured: surface.map(Arc::new),
            legacy_body,
            overlay: None,
            cursor: Some(FinalCursor::Hidden),
            modes: Some(TerminalModes {
                cursor_style: "bar".into(),
                ..Default::default()
            }),
            columns: 3,
            outer_rows: 3,
            child_row_offset: 1,
            clear: false,
            dimmed: false,
        }
    }

    #[test]
    fn retained_surface_repaints_at_new_geometry_without_resize_overlay_or_fade() {
        let current = desired(Some(structured_fixture()), Vec::new());
        let mut composer = PresentationComposer::default();
        composer.prepare(&current).unwrap().unwrap().acknowledge(&mut composer);

        let mut resized = current.clone();
        resized.columns = 6;
        resized.outer_rows = 4;
        let prepared = composer.prepare(&resized).unwrap().unwrap();
        let bytes = String::from_utf8(prepared.bytes.clone()).unwrap();
        assert!(bytes.as_bytes().starts_with(BEGIN_SYNCHRONIZED_UPDATE));
        assert!(bytes.as_bytes().ends_with(END_SYNCHRONIZED_UPDATE));
        assert!(bytes.contains("STRIP") && bytes.contains("界") && bytes.contains('B'));
        assert!(!bytes.contains("\x1b[2J") && !bytes.contains("Resize "));
        assert!(!resized.dimmed && resized.overlay.is_none());
        prepared.acknowledge(&mut composer);

        // Invariant: a later child frame supersedes the retained grid without a resize gate.
        let mut fresh = resized.clone();
        let surface = Arc::make_mut(fresh.structured.as_mut().unwrap());
        surface.columns = 6;
        surface.rows = 3;
        surface.geometry_generation = 5;
        for row in &mut surface.row_data {
            row.cells.extend((0..3).map(|_| crate::protocol::SurfaceCell { text: " ".into(), ..Default::default() }));
        }
        surface.row_data.push(SurfaceRow { cells: (0..6).map(|_| crate::protocol::SurfaceCell { text: " ".into(), ..Default::default() }).collect() });
        fresh.geometry_generation = 5;
        fresh.revision = 2;
        let prepared = composer.prepare(&fresh).unwrap().unwrap();
        let bytes = String::from_utf8(prepared.bytes.clone()).unwrap();
        assert!(bytes.contains("STRIP") && bytes.contains("界"));
        assert!(!bytes.contains("Resize ") && !bytes.contains("\x1b[2m"));
        prepared.acknowledge(&mut composer);

        // Invariant: focus return reasserts one complete frame, never a blank-only resize offer.
        let mut refocused = fresh;
        refocused.clear = true;
        let bytes = String::from_utf8(composer.prepare(&refocused).unwrap().unwrap().bytes).unwrap();
        assert!(bytes.as_bytes().starts_with(BEGIN_SYNCHRONIZED_UPDATE));
        assert!(bytes.as_bytes().ends_with(END_SYNCHRONIZED_UPDATE));
        assert!(bytes.contains("\x1b[2J") && bytes.contains("STRIP") && bytes.contains("界"));
        assert!(!bytes.contains("Resize ") && !bytes.contains("\x1b[2m"));
    }

    #[test]
    fn chrome_offers_and_completed_baselines_share_one_immutable_grid() {
        let initial = desired(Some(structured_fixture()), Vec::new());
        let grid = initial.structured.as_ref().unwrap().clone();
        let mut composer = PresentationComposer::default();
        composer.prepare(&initial).unwrap().unwrap().acknowledge(&mut composer);
        for index in 0..32 {
            let mut chrome = initial.clone();
            chrome.strip = format!("\x1b[1;1Hclock {index}");
            let prepared = composer.prepare(&chrome).unwrap().unwrap();
            assert!(Arc::ptr_eq(prepared.next.structured.as_ref().unwrap(), &grid));
            assert!(prepared.bytes.len() < 128, "chrome repainted the body");
            prepared.acknowledge(&mut composer);
            assert!(Arc::ptr_eq(composer.structured.as_ref().unwrap(), &grid));
        }
    }

    #[test]
    fn a_new_copy_on_write_grid_is_validated_without_mutating_the_painted_base() {
        let initial = desired(Some(structured_fixture()), Vec::new());
        let mut composer = PresentationComposer::default();
        composer.prepare(&initial).unwrap().unwrap().acknowledge(&mut composer);
        let mut invalid = initial.clone();
        Arc::make_mut(invalid.structured.as_mut().unwrap()).row_data[0].cells.pop();
        assert!(composer.prepare(&invalid).is_err());
        assert_eq!(composer.structured.as_ref().unwrap().row_data[0].cells.len(), 3);
    }

    #[test]
    fn removing_an_overlay_restores_cells_even_when_the_child_grid_is_shared() {
        let mut initial = desired(Some(structured_fixture()), Vec::new());
        initial.overlay = Some("\x1b[2;1HBOX".into());
        let mut composer = PresentationComposer::default();
        composer.prepare(&initial).unwrap().unwrap().acknowledge(&mut composer);
        let mut revealed = initial.clone();
        revealed.overlay = None;
        let prepared = composer.prepare(&revealed).unwrap().unwrap();
        assert!(String::from_utf8_lossy(&prepared.bytes).contains('界'));
    }

    #[test]
    fn a_modal_dims_the_strip_and_body_but_not_its_overlay_and_repaints_on_toggle() {
        let surface = structured_fixture();
        let mut composer = PresentationComposer::default();
        let plain = desired(Some(surface.clone()), Vec::new());
        composer
            .prepare(&plain)
            .unwrap()
            .unwrap()
            .acknowledge(&mut composer);
        let mut dimmed = plain.clone();
        dimmed.dimmed = true;
        dimmed.overlay = Some("\x1b[2;1H\x1b[0;1mBOX\x1b[0m".into());
        let prepared = composer.prepare(&dimmed).unwrap().unwrap();
        let bytes = String::from_utf8(prepared.bytes.clone()).unwrap();
        let body = bytes.split("\x1b[2;1H\x1b[0;1mBOX").next().unwrap();
        assert!(
            body.contains("\x1b[2m\x1b[1;1HSTRIP"),
            "the strip draws faint"
        );
        let sequences = body.split("\x1b[").skip(1).collect::<Vec<_>>();
        for (index, sequence) in sequences.iter().enumerate() {
            let end = sequence
                .find(|value: char| ('\x40'..='\x7e').contains(&value))
                .unwrap();
            if sequence.as_bytes()[end] == b'm'
                && !sequence.starts_with("2m")
                && !sequence.starts_with("2;48;")
            {
                assert!(
                    sequences
                        .get(index + 1)
                        .is_some_and(|next| next.starts_with("2m")),
                    "every body SGR is followed by faint: {sequence:?}"
                );
            }
        }
        assert!(
            bytes.contains("\x1b[2;1H\x1b[0;1mBOX\x1b[0m"),
            "the overlay stays bright"
        );
        prepared.acknowledge(&mut composer);
        let restored = String::from_utf8(composer.prepare(&plain).unwrap().unwrap().bytes).unwrap();
        assert!(
            restored.contains("STRIP"),
            "closing the modal repaints everything"
        );
        assert!(!restored.contains("\x1b[2m"));
        assert_eq!(
            dim_backdrop(b"\x1b[>4;1m\x1b[31mx", None),
            b"\x1b[2m\x1b[>4;1m\x1b[31m\x1b[2mx".to_vec(),
            "private-marker sequences are not SGR"
        );
    }

    #[test]
    fn modal_darkens_colored_prompt_and_strip_backgrounds_without_mutating_the_child() {
        for background in [SurfaceColor::Rgb([40, 120, 80]), SurfaceColor::Palette(34)] {
            let mut surface = structured_fixture();
            surface.styles[1].background = background;
            surface.palette[34] = [40, 120, 80];
            let mut plain = desired(Some(surface.clone()), Vec::new());
            plain.strip = match background {
                SurfaceColor::Rgb(_) => "\x1b[1;1H\x1b[48;2;80;100;120mBAR\x1b[49m".into(),
                SurfaceColor::Palette(_) => "\x1b[1;1H\x1b[48;5;34mBAR\x1b[49m".into(),
                SurfaceColor::Default => unreachable!(),
            };
            let mut composer = PresentationComposer::default();
            composer
                .prepare(&plain)
                .unwrap()
                .unwrap()
                .acknowledge(&mut composer);
            let mut modal = plain.clone();
            modal.dimmed = true;
            modal.overlay = Some("\x1b[2;2H\x1b[0;48;2;80;100;120mBOX\x1b[0m".into());
            let bytes =
                String::from_utf8(composer.prepare(&modal).unwrap().unwrap().bytes).unwrap();
            let backdrop = bytes
                .split(modal.overlay.as_deref().unwrap())
                .next()
                .unwrap();
            let default_index = super::super::landing::palette_index([5, 5, 5]);
            assert!(backdrop.contains(&format!("\x1b[2;48;5;{default_index}m")), "explicit default canvas must recede");
            if background == SurfaceColor::Rgb([40, 120, 80]) {
                assert!(
                    backdrop.contains("\x1b[2;48;2;40;50;60m"),
                    "truecolor strip background must recede"
                );
            } else {
                let index = super::super::landing::palette_index([20, 60, 40]);
                assert!(
                    backdrop.contains(&format!("\x1b[2;48;5;{index}m")),
                    "indexed strip background must recede"
                );
            }
            match background {
                SurfaceColor::Rgb(_) => assert!(backdrop.contains("\x1b[2;48;2;20;60;40m")),
                SurfaceColor::Palette(_) => {
                    let index = super::super::landing::palette_index([20, 60, 40]);
                    assert!(backdrop.contains(&format!("\x1b[2;48;5;{index}m")));
                }
                SurfaceColor::Default => unreachable!(),
            }
            assert!(
                bytes.contains(modal.overlay.as_deref().unwrap()),
                "modal must not be dimmed"
            );
            assert_eq!(
                plain.structured.as_deref(),
                Some(&surface),
                "retained colors are immutable"
            );
            composer
                .prepare(&modal)
                .unwrap()
                .unwrap()
                .acknowledge(&mut composer);
            let restored =
                String::from_utf8(composer.prepare(&plain).unwrap().unwrap().bytes).unwrap();
            if background == SurfaceColor::Rgb([40, 120, 80]) {
                assert!(restored.contains("\x1b[48;2;80;100;120m"));
                assert!(!restored.contains("\x1b[2;48;2;40;50;60m"));
            } else {
                assert!(restored.contains("\x1b[48;5;34m"));
            }
            match background {
                SurfaceColor::Rgb(_) => assert!(restored.contains("48;2;40;120;80")),
                SurfaceColor::Palette(_) => assert!(restored.contains("48;5;34")),
                SurfaceColor::Default => unreachable!(),
            }
        }
    }

    #[test]
    fn indexed_landing_and_legacy_backdrops_dim_without_a_child_palette() {
        let mut frame = desired(None, b"\x1b[2;1H\x1b[48;5;34mPROMPT\x1b[49m".to_vec());
        frame.strip = "\x1b[1;1H\x1b[48;5;235mSTRIP\x1b[49m".into();
        frame.dimmed = true;
        frame.overlay = Some("\x1b[2;2H\x1b[48;5;237mBOX\x1b[0m".into());
        let output = String::from_utf8(
            PresentationComposer::default()
                .prepare(&frame)
                .unwrap()
                .unwrap()
                .bytes,
        )
        .unwrap();
        let backdrop = output
            .split(frame.overlay.as_deref().unwrap())
            .next()
            .unwrap();
        for index in [34, 235] {
            let expected = super::super::landing::palette_index(
                xterm_palette_rgb(index).map(|channel| channel / 2),
            );
            assert!(backdrop.contains(&format!("\x1b[2;48;5;{expected}m")));
        }
        assert!(output.contains(frame.overlay.as_deref().unwrap()));
        assert_eq!(dimmed_background_sgr("48;2;40;120;80;0", None), None);
        assert_eq!(
            dimmed_background_sgr("0;48;2;40;120;80", None).as_deref(),
            Some("\x1b[2;48;2;20;60;40m")
        );
    }

    #[test]
    fn repaint_and_resize_keep_the_exposed_backdrop_dark() {
        let mut surface = structured_fixture();
        surface.styles[1].background = SurfaceColor::Rgb([40, 120, 80]);
        let mut modal = desired(Some(surface), Vec::new());
        modal.dimmed = true;
        modal.overlay = Some("\x1b[2;2H\x1b[0;48;2;80;100;120mBOX".into());
        let mut composer = PresentationComposer::default();
        composer
            .prepare(&modal)
            .unwrap()
            .unwrap()
            .acknowledge(&mut composer);
        let mut repainted = modal.clone();
        repainted.revision += 1;
        repainted.strip = "\x1b[1;1H\x1b[48;2;40;120;80mNEW".into();
        let output =
            String::from_utf8(composer.prepare(&repainted).unwrap().unwrap().bytes).unwrap();
        assert!(output.contains("\x1b[2;48;2;20;60;40m"));
        composer
            .prepare(&repainted)
            .unwrap()
            .unwrap()
            .acknowledge(&mut composer);
        repainted.columns = 4;
        repainted.outer_rows = 4;
        let output =
            String::from_utf8(composer.prepare(&repainted).unwrap().unwrap().bytes).unwrap();
        assert!(output.contains("\x1b[2;48;2;20;60;40m"));
        assert!(output.contains(repainted.overlay.as_deref().unwrap()));
    }

    #[test]
    fn explicit_resume_clear_repaints_an_unchanged_cached_surface() {
        let surface = structured_fixture();
        let mut composer = PresentationComposer::default();
        composer
            .prepare(&desired(Some(surface.clone()), Vec::new()))
            .unwrap()
            .unwrap()
            .acknowledge(&mut composer);
        assert!(
            composer
                .prepare(&desired(Some(surface.clone()), Vec::new()))
                .unwrap()
                .is_none()
        );
        let mut refresh = desired(Some(surface), Vec::new());
        refresh.clear = true;
        let frame = composer.prepare(&refresh).unwrap().expect("forced repaint");
        assert!(
            frame
                .bytes
                .windows(7)
                .any(|bytes| bytes == b"\x1b[2J\x1b[H")
        );
        assert!(frame.bytes.windows(5).any(|bytes| bytes == b"STRIP"));
        assert!(
            frame
                .bytes
                .windows("界".len())
                .any(|bytes| bytes == "界".as_bytes())
        );
    }

    #[test]
    fn structured_composition_preserves_fidelity_and_repaints_only_damaged_rows() {
        let mut composer = PresentationComposer::default();
        let surface = structured_fixture();
        let first = composer
            .prepare(&desired(Some(surface.clone()), Vec::new()))
            .unwrap()
            .expect("first paint");
        assert_eq!(
            first
                .bytes
                .windows(BEGIN_SYNCHRONIZED_UPDATE.len())
                .filter(|window| *window == BEGIN_SYNCHRONIZED_UPDATE)
                .count(),
            1
        );
        assert_eq!(
            first
                .bytes
                .windows(END_SYNCHRONIZED_UPDATE.len())
                .filter(|window| *window == END_SYNCHRONIZED_UPDATE)
                .count(),
            1
        );
        assert!(
            first
                .bytes
                .windows(13)
                .any(|window| window == b"\x1b]8;id=link-1")
        );
        assert!(
            first
                .bytes
                .windows(25)
                .any(|window| window == b"https://example.test/path")
        );
        assert!(
            first
                .bytes
                .windows(10)
                .any(|window| window == b"38;2;1;2;3")
        );
        assert!(
            first
                .bytes
                .windows("界".len())
                .any(|window| window == "界".as_bytes())
        );
        first.acknowledge(&mut composer);
        assert!(
            composer
                .prepare(&desired(Some(surface.clone()), Vec::new()))
                .unwrap()
                .is_none(),
            "unchanged state should not repaint"
        );

        let mut palette_changed = surface;
        palette_changed.palette[4] = [9, 8, 7];
        let palette_damage = composer
            .prepare(&desired(Some(palette_changed.clone()), Vec::new()))
            .unwrap()
            .expect("palette damage");
        assert!(
            palette_damage
                .bytes
                .windows(9)
                .any(|window| window == b"\x1b]4;4;rgb")
        );
        assert!(
            !palette_damage
                .bytes
                .windows(6)
                .any(|window| window == b"\x1b[2;1H")
        );
        assert!(
            !palette_damage
                .bytes
                .windows(6)
                .any(|window| window == b"\x1b[3;1H")
        );
        palette_damage.acknowledge(&mut composer);

        let mut changed = palette_changed;
        changed.row_data[1].cells[0].text = "C".into();
        let damage = composer
            .prepare(&desired(Some(changed), Vec::new()))
            .unwrap()
            .expect("row damage");
        assert!(damage.bytes.windows(6).any(|window| window == b"\x1b[3;1H"));
        assert!(!damage.bytes.windows(6).any(|window| window == b"\x1b[2;1H"));
    }

    #[test]
    fn changed_rows_clear_stale_cells_and_restore_styled_trailing_blanks() {
        let mut composer = PresentationComposer::default();
        let mut initial = structured_fixture();
        initial.row_data[1].cells[0].text = "J".into();
        composer
            .prepare(&desired(Some(initial.clone()), Vec::new()))
            .unwrap()
            .expect("initial control")
            .acknowledge(&mut composer);

        let mut cleared = initial;
        cleared.row_data[1] = SurfaceRow {
            cells: vec![crate::protocol::SurfaceCell::default(); 3],
        };
        let blank = composer
            .prepare(&desired(Some(cleared.clone()), Vec::new()))
            .unwrap()
            .expect("cleared control");
        assert!(
            blank
                .bytes
                .windows(14)
                .any(|window| window == b"\x1b[3;1H\x1b[0m\x1b[2K")
        );
        blank.acknowledge(&mut composer);

        for cell in &mut cleared.row_data[1].cells {
            cell.style = 1;
        }
        cleared.row_data[1].cells[0].text = "X".into();
        let styled = composer
            .prepare(&desired(Some(cleared), Vec::new()))
            .unwrap()
            .expect("styled blanks");
        let bytes = String::from_utf8(styled.bytes).unwrap();
        let row = bytes.split("\x1b[3;1H").nth(1).expect("changed row");
        assert!(row.starts_with("\x1b[0m\x1b[2K"));
        assert!(row.contains("48;5;4"));
        assert!(row.contains("X  "), "{row:?}");
    }

    #[test]
    fn geometry_identity_invalidates_the_base_and_wider_spectators_erase_suffixes() {
        let mut composer = PresentationComposer::default();
        let first_surface = structured_fixture();
        composer
            .prepare(&desired(Some(first_surface.clone()), Vec::new()))
            .unwrap()
            .expect("first paint")
            .acknowledge(&mut composer);

        let mut next_generation = first_surface;
        next_generation.geometry_generation += 1;
        let repaint = composer
            .prepare(&desired(Some(next_generation), Vec::new()))
            .unwrap()
            .expect("geometry repaint");
        // Invariant: The invalidated base repaints every row in place rather than clearing the screen.
        assert!(!repaint.bytes.windows(4).any(|window| window == b"\x1b[2J"));
        for row in [b"\x1b[2;1H", b"\x1b[3;1H"] {
            assert!(repaint.bytes.windows(6).any(|window| window == row));
        }
        assert!(
            repaint
                .bytes
                .windows(8)
                .any(|window| window == b"\x1b[1;1HST")
        );
        repaint.acknowledge(&mut composer);

        let mut narrower = structured_fixture();
        narrower.geometry_generation += 2;
        narrower.columns = 2;
        for row in &mut narrower.row_data {
            row.cells.truncate(2);
        }
        narrower.row_data[0].cells[0].width = 1;
        narrower.row_data[0].cells[1] = crate::protocol::SurfaceCell::default();
        let fitted = composer
            .prepare(&desired(Some(narrower), Vec::new()))
            .unwrap()
            .expect("spectator fit");
        assert!(
            fitted.bytes.windows(3).any(|window| window == b"\x1b[K"),
            "a wider spectator must erase content beyond the child row"
        );
    }

    #[test]
    fn bottom_strip_maps_child_rows_overlays_and_cursor_to_the_remaining_geometry() {
        let composer = PresentationComposer::default();
        let mut bottom = desired(Some(structured_fixture()), Vec::new());
        bottom.strip = "\x1b[3;1HSTRIP".into();
        bottom.child_row_offset = 0;
        bottom.overlay = Some("\x1b[2;1HNOTICE".into());
        bottom.cursor = Some(FinalCursor::At(SurfaceCursor { column: 1, row: 0 }));
        let frame = composer.prepare(&bottom).unwrap().expect("bottom paint");
        for row in [b"\x1b[1;1H", b"\x1b[2;1H", b"\x1b[3;1H"] {
            assert!(frame.bytes.windows(6).any(|window| window == row));
        }
        assert!(
            frame
                .bytes
                .windows(12)
                .any(|window| window == b"\x1b[1;2H\x1b[?25h")
        );
    }

    #[test]
    fn live_strip_edge_change_repaints_the_complete_geometry_without_clearing() {
        let mut composer = PresentationComposer::default();
        let mut top = desired(Some(structured_fixture()), Vec::new());
        top.overlay = Some("\x1b[2;1HTOP OVERLAY".into());
        composer
            .prepare(&top)
            .unwrap()
            .expect("top paint")
            .acknowledge(&mut composer);

        let mut bottom = desired(Some(structured_fixture()), Vec::new());
        bottom.strip = "\x1b[3;1HSTRIP".into();
        bottom.child_row_offset = 0;
        bottom.overlay = Some("\x1b[1;1HBOTTOM OVERLAY".into());
        bottom.cursor = Some(FinalCursor::At(SurfaceCursor { column: 1, row: 0 }));
        let moved = composer.prepare(&bottom).unwrap().expect("edge move");
        assert!(!moved.bytes.windows(4).any(|window| window == b"\x1b[2J"));
        for row in [b"\x1b[1;1H", b"\x1b[2;1H", b"\x1b[3;1H"] {
            assert!(moved.bytes.windows(6).any(|window| window == row));
        }
        assert!(
            moved
                .bytes
                .windows(14)
                .any(|window| window == b"BOTTOM OVERLAY")
        );
        assert!(
            moved
                .bytes
                .windows(12)
                .any(|window| window == b"\x1b[1;2H\x1b[?25h")
        );
    }

    #[test]
    fn overlay_dismissal_restores_the_newest_underlying_row_and_clips_cursor() {
        let mut composer = PresentationComposer::default();
        let mut initial = desired(Some(structured_fixture()), Vec::new());
        initial.overlay = Some("\x1b[2;1HOVER".into());
        composer
            .prepare(&initial)
            .unwrap()
            .expect("overlay paint")
            .acknowledge(&mut composer);

        let mut updated_surface = structured_fixture();
        updated_surface.row_data[0].cells[0].text = "N".into();
        let mut updated = desired(Some(updated_surface.clone()), Vec::new());
        updated.overlay = initial.overlay.clone();
        composer
            .prepare(&updated)
            .unwrap()
            .expect("covered body update")
            .acknowledge(&mut composer);

        let mut dismissed = desired(Some(updated_surface), Vec::new());
        dismissed.cursor = Some(FinalCursor::At(SurfaceCursor {
            column: 99,
            row: 99,
        }));
        let restored = composer
            .prepare(&dismissed)
            .unwrap()
            .expect("overlay dismissal");
        assert!(restored.bytes.contains(&b'N'));
        assert!(
            restored
                .bytes
                .windows(6)
                .any(|window| window == b"\x1b[?25l"),
            "an out-of-bounds child cursor must be hidden"
        );
    }

    #[test]
    fn switching_tabs_repaints_in_place_without_clearing_the_strip() {
        let mut composer = PresentationComposer::default();
        let first = composer
            .prepare(&desired(Some(structured_fixture()), Vec::new()))
            .unwrap()
            .expect("first paint");
        assert!(
            first.bytes.windows(4).any(|window| window == b"\x1b[2J"),
            "first paint clears"
        );
        first.acknowledge(&mut composer);

        let mut shorter = structured_fixture();
        shorter.rows = 1;
        shorter.row_data.truncate(1);
        let mut switched = desired(Some(shorter), Vec::new());
        switched.tab_id = Some("b".into());
        let bytes = composer.prepare(&switched).unwrap().expect("switch").bytes;
        assert!(!bytes.windows(4).any(|window| window == b"\x1b[2J"));
        assert!(bytes.windows(5).any(|window| window == b"STRIP"));
        assert!(
            bytes
                .windows(13)
                .any(|window| window == b"\x1b[3;1H\x1b[0m\x1b[K"),
            "the row below the shorter surface is erased"
        );

        let mut legacy = desired(None, b"body".to_vec());
        legacy.tab_id = Some("c".into());
        let legacy_bytes = composer.prepare(&legacy).unwrap().expect("legacy").bytes;
        assert!(legacy_bytes.windows(4).any(|window| window == b"\x1b[2J"));
    }

    #[test]
    fn open_overlay_cells_are_never_rewritten_by_streaming_rows() {
        let mut composer = PresentationComposer::default();
        let overlay = "\x1b[s\x1b[2;2H\x1b[0m\x1b[48;2;38;38;38mM\x1b[0m\x1b[u".to_owned();
        let mut initial = desired(Some(structured_fixture()), Vec::new());
        initial.overlay = Some(overlay.clone());
        composer
            .prepare(&initial)
            .unwrap()
            .expect("overlay paint")
            .acknowledge(&mut composer);

        for text in ["X", "Y", "Z"] {
            let mut surface = structured_fixture();
            for cell in &mut surface.row_data[0].cells {
                *cell = crate::protocol::SurfaceCell {
                    text: text.into(),
                    width: 1,
                    style: 0,
                    link: None,
                };
            }
            let mut streaming = desired(Some(surface), Vec::new());
            streaming.overlay = Some(overlay.clone());
            let prepared = composer.prepare(&streaming).unwrap().expect("streamed row");
            let bytes = String::from_utf8(prepared.bytes.clone()).unwrap();
            // Invariant: Column 2 belongs to the overlay: the row writes column 1, then jumps to column 3.
            assert!(bytes.contains("\x1b[2;1H"));
            assert!(bytes.contains("\x1b[2;3H"), "{bytes:?}");
            assert_eq!(bytes.matches(text).count(), 2, "{bytes:?}");
            assert!(!bytes.contains('M'), "unchanged overlay is not repainted");
            assert!(!bytes.contains("\x1b[K"));
            prepared.acknowledge(&mut composer);
        }
        assert_eq!(
            overlay_child_spans(overlay.as_bytes(), 3, 1).get(&0),
            Some(&(1, 2))
        );
    }

    #[test]
    fn colors_the_child_never_set_keep_the_outer_theme() {
        let mut inherited = structured_fixture();
        let mut bitmap = vec![0xffu8; crate::protocol::InheritedColors::PALETTE_BITMAP_BYTES];
        bitmap[0] &= !(1 << 4);
        inherited.inherited_colors = Some(crate::protocol::InheritedColors {
            foreground: true,
            background: true,
            palette: bitmap,
        });
        let bytes = PresentationComposer::default()
            .prepare(&desired(Some(inherited.clone()), Vec::new()))
            .unwrap()
            .expect("first paint")
            .bytes;
        let text = String::from_utf8(bytes).unwrap();
        assert!(text.contains("\x1b]110\x1b\\") && text.contains("\x1b]111\x1b\\"));
        assert!(!text.contains("\x1b]11;rgb:0a/0a/0a"), "{text:?}");
        assert!(
            text.contains("\x1b]4;4;rgb:"),
            "an explicitly set entry is still published"
        );
        assert!(text.contains("\x1b]104;5\x1b\\"));
        assert!(!text.contains("\x1b]4;5;"));

        // Invariant: A child that later sets its background publishes it; a fully inherited palette resets
        // in one sequence.
        let mut composer = PresentationComposer::default();
        let mut set = inherited;
        set.inherited_colors = Some(crate::protocol::InheritedColors {
            foreground: true,
            background: true,
            palette: vec![0xff; crate::protocol::InheritedColors::PALETTE_BITMAP_BYTES],
        });
        let first = composer
            .prepare(&desired(Some(set.clone()), Vec::new()))
            .unwrap()
            .expect("first paint");
        let first_text = String::from_utf8(first.bytes.clone()).unwrap();
        assert_eq!(first_text.matches("\x1b]104\x1b\\").count(), 1);
        first.acknowledge(&mut composer);
        set.inherited_colors.as_mut().unwrap().background = false;
        let changed = composer
            .prepare(&desired(Some(set), Vec::new()))
            .unwrap()
            .expect("background set");
        assert!(
            String::from_utf8(changed.bytes)
                .unwrap()
                .contains("\x1b]11;rgb:0a/0a/0a\x1b\\")
        );
    }

    #[test]
    fn legacy_body_writes_restore_the_strip_row() {
        let mut composer = PresentationComposer::default();
        composer
            .prepare(&desired(None, b"one".to_vec()))
            .unwrap()
            .expect("first legacy paint")
            .acknowledge(&mut composer);
        let next = composer
            .prepare(&desired(None, b"\x1b[1;1Hleak".to_vec()))
            .unwrap()
            .expect("legacy update");
        let bytes = String::from_utf8(next.bytes).unwrap();
        let leak = bytes.find("leak").expect("body written");
        let strip = bytes.rfind("STRIP").expect("strip restored");
        assert!(strip > leak);
    }

    #[test]
    fn bottom_strip_relocates_complete_legacy_child_rows() {
        let composer = PresentationComposer::default();
        let mut bottom = desired(None, b"\x1b[2;1Hfirst\x1b[3;1Hsecond".to_vec());
        bottom.strip = "\x1b[3;1HSTRIP".into();
        bottom.child_row_offset = 0;
        let bytes = String::from_utf8(
            composer
                .prepare(&bottom)
                .unwrap()
                .expect("bottom legacy paint")
                .bytes,
        )
        .unwrap();
        assert!(bytes.contains("\x1b[1;1Hfirst"));
        assert!(bytes.contains("\x1b[2;1Hsecond"));
        assert!(bytes.contains("\x1b[3;1HSTRIP"));
    }

    #[test]
    fn bottom_legacy_translation_fails_closed_on_malformed_cursor_addressing() {
        let composer = PresentationComposer::default();
        for legacy in [b"body\x1b[".to_vec(), b"\x1b[1:2;1Hbody".to_vec()] {
            let mut bottom = desired(None, legacy);
            bottom.child_row_offset = 0;
            assert!(
                composer.prepare(&bottom).is_err(),
                "malformed bottom fallback must not be emitted"
            );
        }
    }

    #[test]
    fn legacy_fallback_cannot_nest_sync_or_replay_bell() {
        let composer = PresentationComposer::default();
        let legacy = [
            BEGIN_SYNCHRONIZED_UPDATE,
            b"body\x07",
            END_SYNCHRONIZED_UPDATE,
        ]
        .concat();
        let prepared = composer
            .prepare(&desired(None, legacy))
            .unwrap()
            .expect("legacy paint");
        assert_eq!(
            prepared
                .bytes
                .windows(BEGIN_SYNCHRONIZED_UPDATE.len())
                .filter(|window| *window == BEGIN_SYNCHRONIZED_UPDATE)
                .count(),
            1
        );
        assert_eq!(
            prepared
                .bytes
                .windows(END_SYNCHRONIZED_UPDATE.len())
                .filter(|window| *window == END_SYNCHRONIZED_UPDATE)
                .count(),
            1
        );
        assert!(!prepared.bytes.contains(&0x07));
    }

    #[test]
    fn superseded_request_generations_do_not_commit_after_a_round_trip() {
        let mut view = ViewModel::new(Some("b".into()));
        view.request("a");
        view.expect_request_generation(4);
        let mut late = surface("a", 8, false);
        late.request_generation = 2;
        assert_eq!(view.offer(late, Instant::now(), true), Offer::Dropped);
        let mut current = surface("a", 7, false);
        current.request_generation = 4;
        assert!(matches!(
            view.offer(current, Instant::now(), true),
            Offer::Commit {
                requested: true,
                ..
            }
        ));
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
