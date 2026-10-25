//! Incremental, fixture-only Ghostty oracle for input-to-observed-frame measurements.
use super::{marker_cells, node_error};
use crate::ghostty::{
    GhosttyTerminal, RetainedSurface, RetainedSurfaceBuilder, SynchronizedOutputBoundary,
};
use crate::protocol::SurfaceCommitKind;
use napi::{Error, Result, Status, bindgen_prelude::Buffer};
use napi_derive::napi;
use sha2::{Digest, Sha256};

#[napi(object)]
pub struct ObservedTerminalFrame {
    pub complete: bool,
    pub marker_digest: String,
    pub marker_occurrences: u32,
    pub first_marker_row: Option<u32>,
}

/// Never exported by a release addon. Each hermetic endpoint keeps its own parser and row cache.
#[napi]
pub struct TerminalFrameObserver {
    terminal: GhosttyTerminal,
    builder: RetainedSurfaceBuilder,
    retained: RetainedSurface,
    skip_rows: u16,
    open: bool,
}

#[napi]
impl TerminalFrameObserver {
    #[napi(constructor)]
    pub fn new(columns: u32, rows: u32, skip_rows: u32) -> Result<Self> {
        if !(1..=512).contains(&columns) || !(1..=256).contains(&rows) || skip_rows >= rows {
            return Err(Error::new(
                Status::InvalidArg,
                "frame observer geometry is out of bounds",
            ));
        }
        let mut terminal = GhosttyTerminal::new(columns as u16, rows as u16).map_err(node_error)?;
        let mut builder = RetainedSurfaceBuilder::default();
        let retained = terminal
            .capture_retained_surface(&mut builder, 0, SurfaceCommitKind::Complete)
            .map_err(node_error)?;
        Ok(Self {
            terminal,
            builder,
            retained,
            skip_rows: skip_rows as u16,
            open: false,
        })
    }

    /// Accepts each physical byte once. Empty bytes query the last closed parser state with a
    /// different synthetic marker; incomplete transactions can never acknowledge input.
    #[napi]
    pub fn observe(&mut self, bytes: Buffer, marker: String) -> Result<ObservedTerminalFrame> {
        if bytes.len() > 2 * 1024 * 1024
            || marker.is_empty()
            || marker.len() > 32
            || !marker.bytes().all(|value| value.is_ascii_alphanumeric())
        {
            return Err(Error::new(
                Status::InvalidArg,
                "frame observer input is out of bounds",
            ));
        }
        let mut offset = 0;
        while offset < bytes.len() {
            let (consumed, boundary) = self
                .terminal
                .write_until_sync_boundary(&bytes[offset..])
                .map_err(node_error)?;
            offset += consumed;
            match boundary {
                Some(SynchronizedOutputBoundary::Begin) => self.open = true,
                Some(SynchronizedOutputBoundary::End | SynchronizedOutputBoundary::Reset) => {
                    self.open = false
                }
                None => {}
            }
        }
        if !bytes.is_empty() && !self.open {
            self.retained = self
                .terminal
                .capture_retained_surface(&mut self.builder, 0, SurfaceCommitKind::Complete)
                .map_err(node_error)?;
        }
        let surface = self.retained.structured().map_err(node_error)?;
        let cells = marker_cells(&surface, self.skip_rows, &marker);
        let digest = serde_json::to_vec(&cells).map_err(node_error)?;
        Ok(ObservedTerminalFrame {
            complete: !self.open,
            marker_digest: hex::encode(Sha256::digest(digest)),
            marker_occurrences: (cells.len() / (marker.len() + 2)) as u32,
            first_marker_row: cells.first().map(|cell| u32::from(cell.row)),
        })
    }
}
