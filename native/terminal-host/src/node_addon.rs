#[cfg(feature = "resident-fixtures")]
use napi::bindgen_prelude::Buffer;
use napi::{Error, Result, Status};
use napi_derive::napi;

use crate::session_lock::SessionLock;

#[cfg(feature = "resident-fixtures")]
mod frame_observer;

#[cfg(feature = "resident-fixtures")]
use serde::Serialize;
#[cfg(feature = "resident-fixtures")]
use sha2::{Digest, Sha256};

#[cfg(feature = "resident-fixtures")]
use crate::ghostty::{GhosttyTerminal, RetainedSurfaceBuilder, SynchronizedOutputBoundary};
#[cfg(feature = "resident-fixtures")]
use crate::protocol::{StructuredSurface, SurfaceCommitKind, SurfaceLink, SurfaceStyle};

#[napi(object)]
pub struct RoleHost {
    pub executable: String,
    pub entry: String,
    pub artifact: String,
}

#[napi(object)]
pub struct NodeVersionFeatures {
    pub fault_injection: bool,
    pub resident_fixtures: bool,
}

#[napi(object)]
pub struct NodeVersionReport {
    pub schema: String,
    pub protocol_version: u32,
    pub generation: u32,
    pub crate_version: String,
    pub features: NodeVersionFeatures,
    pub host_mode: String,
    pub desktop_window: bool,
    pub libghostty_vt_commit: String,
    pub libghostty_target: String,
    pub libghostty_cpu: String,
    pub portable_pty: String,
    pub crossterm: String,
}

#[napi]
pub fn version() -> NodeVersionReport {
    let report = crate::roles::entry::version_report();
    NodeVersionReport {
        schema: report.schema.to_owned(),
        protocol_version: report.protocol_version,
        generation: u32::from(report.generation),
        crate_version: report.crate_version.to_owned(),
        features: NodeVersionFeatures {
            fault_injection: report.features.fault_injection,
            resident_fixtures: report.features.resident_fixtures,
        },
        host_mode: report.host_mode.to_owned(),
        desktop_window: report.desktop_window,
        libghostty_vt_commit: report.libghostty_vt_commit.to_owned(),
        libghostty_target: report.libghostty_target.to_owned(),
        libghostty_cpu: report.libghostty_cpu.to_owned(),
        portable_pty: report.portable_pty.to_owned(),
        crossterm: report.crossterm.to_owned(),
    }
}

#[cfg(feature = "resident-fixtures")]
#[napi(object)]
pub struct NodeTerminalSnapshot {
    pub schema: String,
    pub marker_digest: String,
    pub marker_occurrences: u32,
    pub synchronized_begins: u32,
    pub synchronized_ends: u32,
    pub synchronized_resets: u32,
    pub marker_count_regressions: u32,
    pub open_synchronized_output: bool,
    pub cursor_column: Option<u32>,
    pub cursor_row: Option<u32>,
    pub cursor_visible: bool,
    pub cursor_style: String,
    pub cursor_blink: bool,
    pub mouse_tracking: bool,
    pub focus_events: bool,
    pub bracketed_paste: bool,
    pub kitty_keyboard_flags: u32,
    pub alternate_screen: bool,
}

#[cfg(feature = "resident-fixtures")]
#[derive(Serialize)]
struct CanonicalMarkerCell {
    row: u16,
    column: u16,
    text: String,
    width: u8,
    style: SurfaceStyle,
    link: Option<SurfaceLink>,
}

/// Parser-authoritative, content-free temporal evidence for the real-A1 parity fixture.
#[cfg(feature = "resident-fixtures")]
#[napi]
pub fn inspect_terminal_snapshot(
    bytes: Buffer,
    columns: u32,
    rows: u32,
    skip_rows: u32,
    marker: String,
) -> Result<NodeTerminalSnapshot> {
    if bytes.len() > 8 * 1024 * 1024
        || !(1..=u32::from(u16::MAX)).contains(&columns)
        || !(1..=u32::from(u16::MAX)).contains(&rows)
        || skip_rows >= rows
        || marker.is_empty()
        || marker.len() > 32
        || !marker.bytes().all(|value| value.is_ascii_alphanumeric())
    {
        return Err(Error::new(
            Status::InvalidArg,
            "terminal snapshot input is out of bounds",
        ));
    }
    let mut terminal = GhosttyTerminal::new(columns as u16, rows as u16).map_err(node_error)?;
    let mut builder = RetainedSurfaceBuilder::default();
    let mut offset = 0usize;
    let mut begins = 0u32;
    let mut ends = 0u32;
    let mut resets = 0u32;
    let mut open = false;
    let mut prior_marker_count = 0usize;
    let mut regressions = 0u32;
    while offset < bytes.len() {
        let (consumed, boundary) = terminal
            .write_until_sync_boundary(&bytes[offset..])
            .map_err(node_error)?;
        offset = offset.saturating_add(consumed);
        match boundary {
            Some(SynchronizedOutputBoundary::Begin) => {
                begins = begins.saturating_add(1);
                open = true;
            }
            Some(SynchronizedOutputBoundary::End) => {
                ends = ends.saturating_add(1);
                open = false;
                let surface = terminal
                    .capture_retained_surface(&mut builder, 0, SurfaceCommitKind::Complete)
                    .and_then(|surface| surface.structured())
                    .map_err(node_error)?;
                let count = marker_cells(&surface, skip_rows as u16, &marker).len();
                if count < prior_marker_count {
                    regressions = regressions.saturating_add(1);
                }
                prior_marker_count = count;
            }
            Some(SynchronizedOutputBoundary::Reset) => {
                resets = resets.saturating_add(1);
                open = false;
            }
            None => {}
        }
    }
    let surface = terminal
        .capture_retained_surface(&mut builder, 0, SurfaceCommitKind::Complete)
        .and_then(|surface| surface.structured())
        .map_err(node_error)?;
    let evidence = marker_cells(&surface, skip_rows as u16, &marker);
    let digest_bytes = serde_json::to_vec(&(
        &evidence,
        &surface.palette,
        surface.default_foreground,
        surface.default_background,
        surface.cursor_color,
    ))
    .map_err(node_error)?;
    let modes = terminal.mode_snapshot().map_err(node_error)?;
    let cursor = terminal
        .cursor_cell()
        .map_err(node_error)?
        .and_then(|(column, row)| {
            row.checked_sub(skip_rows as u16)
                .map(|normalized_row| (u32::from(column), u32::from(normalized_row)))
        });
    Ok(NodeTerminalSnapshot {
        schema: "a1-terminal-temporal-snapshot-v1".into(),
        marker_digest: hex::encode(Sha256::digest(digest_bytes)),
        marker_occurrences: evidence
            .len()
            .checked_div(marker.len().saturating_add(2))
            .unwrap_or(0)
            .try_into()
            .unwrap_or(u32::MAX),
        synchronized_begins: begins,
        synchronized_ends: ends,
        synchronized_resets: resets,
        marker_count_regressions: regressions,
        open_synchronized_output: open || modes.synchronized_output,
        cursor_column: cursor.map(|value| value.0),
        cursor_row: cursor.map(|value| value.1),
        cursor_visible: modes.cursor_visible,
        cursor_style: modes.cursor_style.into(),
        cursor_blink: modes.cursor_blink,
        mouse_tracking: modes.mouse_tracking,
        focus_events: modes.focus_events,
        bracketed_paste: modes.bracketed_paste,
        kitty_keyboard_flags: u32::from(modes.kitty_keyboard_flags),
        alternate_screen: modes.alternate_screen,
    })
}

#[cfg(feature = "resident-fixtures")]
fn marker_cells(
    surface: &StructuredSurface,
    skip_rows: u16,
    marker: &str,
) -> Vec<CanonicalMarkerCell> {
    let marker = marker
        .chars()
        .map(|value| value.to_string())
        .collect::<Vec<_>>();
    let width = marker.len().saturating_add(2);
    let mut evidence = Vec::new();
    for (row_index, row) in surface
        .row_data
        .iter()
        .enumerate()
        .skip(usize::from(skip_rows))
    {
        if row.cells.len() < width {
            continue;
        }
        for column in 0..=row.cells.len() - width {
            let prefix_matches = marker
                .iter()
                .enumerate()
                .all(|(offset, expected)| row.cells[column + offset].text == *expected);
            let suffix = &row.cells[column + marker.len()..column + width];
            if !prefix_matches
                || !suffix
                    .iter()
                    .all(|cell| cell.text.len() == 1 && cell.text.as_bytes()[0].is_ascii_digit())
            {
                continue;
            }
            for (offset, cell) in row.cells[column..column + width].iter().enumerate() {
                evidence.push(CanonicalMarkerCell {
                    row: u16::try_from(row_index)
                        .unwrap_or(u16::MAX)
                        .saturating_sub(skip_rows),
                    column: u16::try_from(column + offset).unwrap_or(u16::MAX),
                    text: cell.text.clone(),
                    width: cell.width,
                    style: surface.styles[usize::from(cell.style)].clone(),
                    link: cell
                        .link
                        .map(|link| surface.links[usize::from(link)].clone()),
                });
            }
        }
    }
    evidence
}

#[napi]
pub fn run_role(arguments: Vec<String>, host: RoleHost) -> Result<u32> {
    crate::launch::set_host_command(host.executable, [host.entry], host.artifact)
        .map_err(node_error)?;
    // Platform: retain the process-lifetime period request for non-I/O timers such as ConPTY
    // render-pass settling. Pipe readiness uses completion events and does not depend on it.
    #[cfg(windows)]
    unsafe {
        windows_sys::Win32::Media::timeBeginPeriod(1);
    }
    Ok(crate::roles::entry::run_from_args(arguments))
}

/// Opaque writer-held lease. The Node process owns the native descriptor directly.
#[napi(js_name = "SessionLock")]
pub struct NodeSessionLock {
    inner: Option<SessionLock>,
}

#[napi]
impl NodeSessionLock {
    #[napi(factory)]
    pub fn acquire(path: String) -> Result<Self> {
        SessionLock::acquire(path)
            .map(|lock| Self { inner: Some(lock) })
            .map_err(node_error)
    }

    #[napi]
    pub fn bind_created(&mut self, path: String) -> Result<()> {
        self.inner
            .as_mut()
            .ok_or_else(|| Error::new(Status::InvalidArg, "session lock was released"))?
            .bind_created(path)
            .map_err(node_error)
    }

    #[napi(getter)]
    pub fn bound(&self) -> bool {
        self.inner.as_ref().is_some_and(SessionLock::is_bound)
    }

    #[napi]
    pub fn release(&mut self) -> Result<()> {
        let lock = self
            .inner
            .take()
            .ok_or_else(|| Error::new(Status::InvalidArg, "session lock was already released"))?;
        lock.release();
        Ok(())
    }
}

fn node_error(error: impl std::fmt::Display) -> Error {
    Error::new(Status::GenericFailure, error.to_string())
}
