#![allow(non_camel_case_types)]

use std::collections::HashMap;
use std::ffi::{c_char, c_void};
use std::mem::size_of;
use std::ptr;
use std::sync::Arc;
use std::time::Instant;

use crate::protocol::{
    StructuredSurface, SurfaceCell, SurfaceColor, SurfaceCommitKind, SurfaceLink, SurfaceRow,
    SurfaceStyle,
};

const GHOSTTY_SUCCESS: i32 = 0;
const GHOSTTY_OUT_OF_SPACE: i32 = -3;
const GHOSTTY_NO_VALUE: i32 = -4;
const VT_BOUNDARY_NONE: i32 = 0;
const VT_BOUNDARY_SYNC_BEGIN: i32 = 1;
const VT_BOUNDARY_SYNC_END: i32 = 2;
const VT_BOUNDARY_SYNC_RESET: i32 = 3;

const RENDER_DATA_COLS: i32 = 1;
const RENDER_DATA_ROWS: i32 = 2;
const RENDER_DATA_DIRTY: i32 = 3;
const RENDER_DATA_ROW_ITERATOR: i32 = 4;
const RENDER_DATA_CURSOR_VISUAL_STYLE: i32 = 10;
const RENDER_DATA_CURSOR_VISIBLE: i32 = 11;
const RENDER_DATA_CURSOR_BLINKING: i32 = 12;
const RENDER_DATA_CURSOR_HAS_POSITION: i32 = 14;
const RENDER_DATA_CURSOR_X: i32 = 15;
const RENDER_DATA_CURSOR_Y: i32 = 16;
const RENDER_OPTION_DIRTY: i32 = 0;
const TERMINAL_DATA_ACTIVE_SCREEN: i32 = 6;
const TERMINAL_DATA_KITTY_KEYBOARD_FLAGS: i32 = 8;
const TERMINAL_DATA_SCROLLBAR: i32 = 9;
const TERMINAL_DATA_MOUSE_TRACKING: i32 = 11;
const TERMINAL_DATA_SCROLLBACK_ROWS: i32 = 15;
const TERMINAL_DATA_VIEWPORT_ACTIVE: i32 = 32;
const ROW_DATA_DIRTY: i32 = 1;
const ROW_DATA_CELLS: i32 = 3;
const ROW_OPTION_DIRTY: i32 = 0;
const CELLS_DATA_RAW: i32 = 1;
const CELLS_DATA_STYLE: i32 = 2;
const CELLS_DATA_SELECTED: i32 = 7;
const CELLS_DATA_GRAPHEMES_UTF8: i32 = 9;
const CELL_DATA_WIDE: i32 = 3;
const CELL_DATA_HAS_HYPERLINK: i32 = 7;
const CELL_WIDE_NORMAL: i32 = 0;
const CELL_WIDE_WIDE: i32 = 1;
const CELL_WIDE_SPACER_TAIL: i32 = 2;
const TERMINAL_OPT_USERDATA: i32 = 0;
const TERMINAL_OPT_WRITE_PTY: i32 = 1;
const TERMINAL_OPT_SELECTION: i32 = 21;
const TERMINAL_OPT_CLIPBOARD_WRITE: i32 = 26;
const CLIPBOARD_WRITE_RESULT_SUCCESS: i32 = 0;
const CLIPBOARD_WRITE_RESULT_UNSUPPORTED: i32 = 2;
/// DEC private modes the holder reads from the child's terminal model; a `GhosttyMode` packs the
/// mode number in bits 0-14 and the ANSI flag in bit 15, so DEC modes are their plain number.
pub const MODE_CURSOR_BLINKING: u16 = 12;
pub const MODE_CURSOR_VISIBLE: u16 = 25;
pub const MODE_FOCUS_EVENT: u16 = 1004;
pub const MODE_BRACKETED_PASTE: u16 = 2004;
pub const MODE_SYNC_OUTPUT: u16 = 2026;
/// Most clipboard writes retained between two holder loop passes; later ones are refused so a
/// child looping on OSC 52 cannot grow memory while nobody views it.
pub const MAX_PENDING_CLIPBOARD_WRITES: usize = 8;

pub const KEY_UNIDENTIFIED: i32 = 0;
pub const KEY_A: i32 = 20;
pub const KEY_BACKSPACE: i32 = 53;
pub const KEY_ENTER: i32 = 58;
pub const KEY_SPACE: i32 = 63;
pub const KEY_TAB: i32 = 64;
pub const KEY_DELETE: i32 = 68;
pub const KEY_END: i32 = 69;
pub const KEY_HOME: i32 = 71;
pub const KEY_INSERT: i32 = 72;
pub const KEY_PAGE_DOWN: i32 = 73;
pub const KEY_PAGE_UP: i32 = 74;
pub const KEY_ARROW_DOWN: i32 = 75;
pub const KEY_ARROW_LEFT: i32 = 76;
pub const KEY_ARROW_RIGHT: i32 = 77;
pub const KEY_ARROW_UP: i32 = 78;
pub const KEY_ESCAPE: i32 = 120;
pub const KEY_F1: i32 = 121;

pub const MOD_SHIFT: u16 = 1 << 0;
pub const MOD_CTRL: u16 = 1 << 1;
pub const MOD_ALT: u16 = 1 << 2;
pub const MOD_SUPER: u16 = 1 << 3;

const KEY_ACTION_PRESS: i32 = 1;
const KEY_ACTION_REPEAT: i32 = 2;
const STYLE_COLOR_NONE: i32 = 0;
const STYLE_COLOR_PALETTE: i32 = 1;
const STYLE_COLOR_RGB: i32 = 2;

#[allow(non_camel_case_types)]
type GhosttyResult = i32;
type GhosttyTerminalRaw = *mut c_void;
type GhosttyRenderStateRaw = *mut c_void;
type GhosttyRenderStateRowIteratorRaw = *mut c_void;
type GhosttyRenderStateRowCellsRaw = *mut c_void;
type GhosttyKeyEncoderRaw = *mut c_void;
type GhosttyKeyEventRaw = *mut c_void;
type GhosttyMouseEncoderRaw = *mut c_void;
type GhosttyMouseEventRaw = *mut c_void;
type GhosttySelectionGestureRaw = *mut c_void;
type GhosttySelectionGestureEventRaw = *mut c_void;

#[repr(C)]
struct GhosttyTerminalOptions {
    cols: u16,
    rows: u16,
    max_scrollback: usize,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct TerminalScrollbar {
    pub total: u64,
    pub offset: u64,
    pub len: u64,
}

#[repr(C)]
#[derive(Clone, Copy, Default)]
struct GhosttyPointCoordinate {
    x: u16,
    y: u32,
}

#[repr(C)]
union GhosttyPointValue {
    coordinate: GhosttyPointCoordinate,
    _padding: [u64; 2],
}

#[repr(C)]
struct GhosttyPoint {
    tag: i32,
    value: GhosttyPointValue,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct GhosttyGridRef {
    size: usize,
    node: *mut c_void,
    x: u16,
    y: u16,
}

#[repr(C)]
struct GhosttySelection {
    size: usize,
    start: GhosttyGridRef,
    end: GhosttyGridRef,
    rectangle: bool,
}

#[repr(C)]
struct GhosttySurfacePosition {
    x: f64,
    y: f64,
}

#[repr(C)]
struct GhosttyMousePosition {
    x: f32,
    y: f32,
}

#[repr(C)]
struct GhosttyMouseEncoderSize {
    size: usize,
    screen_width: u32,
    screen_height: u32,
    cell_width: u32,
    cell_height: u32,
    padding_top: u32,
    padding_bottom: u32,
    padding_right: u32,
    padding_left: u32,
}

#[repr(C)]
struct GhosttySelectionGestureGeometry {
    columns: u32,
    cell_width: u32,
    padding_left: u32,
    screen_height: u32,
}

#[repr(C)]
struct GhosttySelectionGestureBehaviors {
    single_click: i32,
    double_click: i32,
    triple_click: i32,
}

#[repr(C)]
struct GhosttyTerminalSelectionFormatOptions {
    size: usize,
    emit: i32,
    unwrap: bool,
    trim: bool,
    selection: *const GhosttySelection,
}

#[repr(C)]
union GhosttyTerminalScrollViewportValue {
    delta: isize,
    row: usize,
    _padding: [u64; 2],
}

#[repr(C)]
struct GhosttyTerminalScrollViewport {
    tag: i32,
    value: GhosttyTerminalScrollViewportValue,
}

#[repr(C)]
struct GhosttyBuffer {
    ptr: *mut u8,
    cap: usize,
    len: usize,
}

#[repr(C)]
#[derive(Clone, Copy, Default, PartialEq, Eq)]
struct GhosttyColorRgb {
    r: u8,
    g: u8,
    b: u8,
}

#[repr(C)]
union GhosttyStyleColorValue {
    palette: u8,
    rgb: GhosttyColorRgb,
    _padding: u64,
}

#[repr(C)]
struct GhosttyStyleColor {
    tag: i32,
    value: GhosttyStyleColorValue,
}

#[repr(C)]
struct GhosttyStyle {
    size: usize,
    fg_color: GhosttyStyleColor,
    bg_color: GhosttyStyleColor,
    underline_color: GhosttyStyleColor,
    bold: bool,
    italic: bool,
    faint: bool,
    blink: bool,
    inverse: bool,
    invisible: bool,
    strikethrough: bool,
    overline: bool,
    underline: i32,
}

#[repr(C)]
struct GhosttyRenderStateColors {
    size: usize,
    background: GhosttyColorRgb,
    foreground: GhosttyColorRgb,
    cursor: GhosttyColorRgb,
    cursor_has_value: bool,
    palette: [GhosttyColorRgb; 256],
}

unsafe extern "C" {
    fn ghostty_terminal_new(
        allocator: *const c_void,
        terminal: *mut GhosttyTerminalRaw,
        options: GhosttyTerminalOptions,
    ) -> GhosttyResult;
    fn ghostty_terminal_free(terminal: GhosttyTerminalRaw);
    fn ghostty_terminal_resize(
        terminal: GhosttyTerminalRaw,
        cols: u16,
        rows: u16,
        cell_width_px: u32,
        cell_height_px: u32,
    ) -> GhosttyResult;
    fn ghostty_terminal_vt_write(terminal: GhosttyTerminalRaw, data: *const u8, len: usize);
    fn ghostty_terminal_vt_write_until_sync_boundary(
        terminal: GhosttyTerminalRaw,
        data: *const u8,
        len: usize,
        out_consumed: *mut usize,
        out_boundary: *mut i32,
    ) -> GhosttyResult;
    fn ghostty_terminal_scroll_viewport(
        terminal: GhosttyTerminalRaw,
        behavior: GhosttyTerminalScrollViewport,
    );
    fn ghostty_terminal_get(
        terminal: GhosttyTerminalRaw,
        data: i32,
        out: *mut c_void,
    ) -> GhosttyResult;
    fn ghostty_terminal_mode_get(
        terminal: GhosttyTerminalRaw,
        mode: u16,
        out_value: *mut bool,
    ) -> GhosttyResult;
    fn ghostty_terminal_set(
        terminal: GhosttyTerminalRaw,
        option: i32,
        value: *const c_void,
    ) -> GhosttyResult;
    fn ghostty_terminal_grid_ref(
        terminal: GhosttyTerminalRaw,
        point: GhosttyPoint,
        out_ref: *mut GhosttyGridRef,
    ) -> GhosttyResult;
    fn ghostty_grid_ref_hyperlink_uri(
        reference: *const GhosttyGridRef,
        buffer: *mut u8,
        buffer_len: usize,
        out_len: *mut usize,
    ) -> GhosttyResult;
    fn ghostty_grid_ref_hyperlink_id(
        reference: *const GhosttyGridRef,
        buffer: *mut u8,
        buffer_len: usize,
        out_len: *mut usize,
    ) -> GhosttyResult;
    fn ghostty_terminal_selection_format_alloc(
        terminal: GhosttyTerminalRaw,
        allocator: *const c_void,
        options: GhosttyTerminalSelectionFormatOptions,
        out_ptr: *mut *mut u8,
        out_len: *mut usize,
    ) -> GhosttyResult;
    fn ghostty_free(allocator: *const c_void, ptr: *mut u8, len: usize);
    fn ghostty_render_state_new(
        allocator: *const c_void,
        state: *mut GhosttyRenderStateRaw,
    ) -> GhosttyResult;
    fn ghostty_render_state_free(state: GhosttyRenderStateRaw);
    fn ghostty_render_state_update(
        state: GhosttyRenderStateRaw,
        terminal: GhosttyTerminalRaw,
    ) -> GhosttyResult;
    fn ghostty_render_state_get(
        state: GhosttyRenderStateRaw,
        data: i32,
        out: *mut c_void,
    ) -> GhosttyResult;
    fn ghostty_render_state_set(
        state: GhosttyRenderStateRaw,
        option: i32,
        value: *const c_void,
    ) -> GhosttyResult;
    fn ghostty_render_state_colors_get(
        state: GhosttyRenderStateRaw,
        out: *mut GhosttyRenderStateColors,
    ) -> GhosttyResult;
    fn ghostty_render_state_row_iterator_new(
        allocator: *const c_void,
        out: *mut GhosttyRenderStateRowIteratorRaw,
    ) -> GhosttyResult;
    fn ghostty_render_state_row_iterator_free(iterator: GhosttyRenderStateRowIteratorRaw);
    fn ghostty_render_state_row_iterator_next(iterator: GhosttyRenderStateRowIteratorRaw) -> bool;
    fn ghostty_render_state_row_get(
        iterator: GhosttyRenderStateRowIteratorRaw,
        data: i32,
        out: *mut c_void,
    ) -> GhosttyResult;
    fn ghostty_render_state_row_set(
        iterator: GhosttyRenderStateRowIteratorRaw,
        option: i32,
        value: *const c_void,
    ) -> GhosttyResult;
    fn ghostty_render_state_row_cells_new(
        allocator: *const c_void,
        out: *mut GhosttyRenderStateRowCellsRaw,
    ) -> GhosttyResult;
    fn ghostty_render_state_row_cells_next(cells: GhosttyRenderStateRowCellsRaw) -> bool;
    fn ghostty_render_state_row_cells_get(
        cells: GhosttyRenderStateRowCellsRaw,
        data: i32,
        out: *mut c_void,
    ) -> GhosttyResult;
    fn ghostty_render_state_row_cells_free(cells: GhosttyRenderStateRowCellsRaw);
    fn ghostty_cell_get(cell: u64, data: i32, out: *mut c_void) -> GhosttyResult;
    fn ghostty_key_encoder_new(
        allocator: *const c_void,
        out: *mut GhosttyKeyEncoderRaw,
    ) -> GhosttyResult;
    fn ghostty_key_encoder_free(encoder: GhosttyKeyEncoderRaw);
    fn ghostty_key_encoder_setopt_from_terminal(
        encoder: GhosttyKeyEncoderRaw,
        terminal: GhosttyTerminalRaw,
    );
    fn ghostty_key_encoder_setopt(encoder: GhosttyKeyEncoderRaw, option: i32, value: *const c_void);
    fn ghostty_key_encoder_encode(
        encoder: GhosttyKeyEncoderRaw,
        event: GhosttyKeyEventRaw,
        out_buf: *mut c_char,
        out_buf_size: usize,
        out_len: *mut usize,
    ) -> GhosttyResult;
    fn ghostty_key_event_new(
        allocator: *const c_void,
        out: *mut GhosttyKeyEventRaw,
    ) -> GhosttyResult;
    fn ghostty_key_event_free(event: GhosttyKeyEventRaw);
    fn ghostty_key_event_set_action(event: GhosttyKeyEventRaw, action: i32);
    fn ghostty_key_event_set_key(event: GhosttyKeyEventRaw, key: i32);
    fn ghostty_key_event_set_mods(event: GhosttyKeyEventRaw, mods: u16);
    fn ghostty_key_event_set_utf8(event: GhosttyKeyEventRaw, utf8: *const c_char, len: usize);
    fn ghostty_key_event_set_unshifted_codepoint(event: GhosttyKeyEventRaw, codepoint: u32);
    fn ghostty_mouse_encoder_new(
        allocator: *const c_void,
        out: *mut GhosttyMouseEncoderRaw,
    ) -> GhosttyResult;
    fn ghostty_mouse_encoder_free(encoder: GhosttyMouseEncoderRaw);
    fn ghostty_mouse_encoder_setopt(
        encoder: GhosttyMouseEncoderRaw,
        option: i32,
        value: *const c_void,
    );
    fn ghostty_mouse_encoder_setopt_from_terminal(
        encoder: GhosttyMouseEncoderRaw,
        terminal: GhosttyTerminalRaw,
    );
    fn ghostty_mouse_encoder_encode(
        encoder: GhosttyMouseEncoderRaw,
        event: GhosttyMouseEventRaw,
        out_buf: *mut c_char,
        out_buf_size: usize,
        out_len: *mut usize,
    ) -> GhosttyResult;
    fn ghostty_mouse_event_new(
        allocator: *const c_void,
        out: *mut GhosttyMouseEventRaw,
    ) -> GhosttyResult;
    fn ghostty_mouse_event_free(event: GhosttyMouseEventRaw);
    fn ghostty_mouse_event_set_action(event: GhosttyMouseEventRaw, action: i32);
    fn ghostty_mouse_event_set_button(event: GhosttyMouseEventRaw, button: i32);
    fn ghostty_mouse_event_clear_button(event: GhosttyMouseEventRaw);
    fn ghostty_mouse_event_set_mods(event: GhosttyMouseEventRaw, mods: u16);
    fn ghostty_mouse_event_set_position(
        event: GhosttyMouseEventRaw,
        position: GhosttyMousePosition,
    );
    fn ghostty_selection_gesture_new(
        allocator: *const c_void,
        out_gesture: *mut GhosttySelectionGestureRaw,
    ) -> GhosttyResult;
    fn ghostty_selection_gesture_free(
        gesture: GhosttySelectionGestureRaw,
        terminal: GhosttyTerminalRaw,
    );
    fn ghostty_selection_gesture_event_new(
        allocator: *const c_void,
        out_event: *mut GhosttySelectionGestureEventRaw,
        event_type: i32,
    ) -> GhosttyResult;
    fn ghostty_selection_gesture_event_free(event: GhosttySelectionGestureEventRaw);
    fn ghostty_selection_gesture_event_set(
        event: GhosttySelectionGestureEventRaw,
        option: i32,
        value: *const c_void,
    ) -> GhosttyResult;
    fn ghostty_selection_gesture_event(
        gesture: GhosttySelectionGestureRaw,
        terminal: GhosttyTerminalRaw,
        event: GhosttySelectionGestureEventRaw,
        out_selection: *mut GhosttySelection,
    ) -> GhosttyResult;
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum CellColor {
    Palette(u8),
    Rgb(GhosttyColorRgb),
}

#[derive(Clone, Copy, PartialEq, Eq)]
struct ActiveStyle {
    fg: Option<CellColor>,
    bg: Option<CellColor>,
    bold: bool,
    faint: bool,
    italic: bool,
    inverse: bool,
    underline: bool,
}

#[repr(C)]
struct GhosttyString {
    ptr: *const u8,
    len: usize,
}

#[repr(C)]
struct GhosttyClipboardContent {
    mime: GhosttyString,
    data: GhosttyString,
}

#[repr(C)]
struct GhosttyClipboardWrite {
    size: usize,
    location: i32,
    contents: *const GhosttyClipboardContent,
    contents_len: usize,
}

/// One normalized clipboard write the child emitted through OSC 52 or iTerm2 OSC 1337; the
/// payload is already decoded and never logged.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ClipboardWrite {
    /// `0` standard, `1` selection, `2` primary, as libghostty numbers them.
    pub location: i32,
    pub mime: String,
    pub data: Vec<u8>,
}

/// The cursor and interaction modes of a child terminal model at one point in time.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct TerminalModeSnapshot {
    pub cursor_visible: bool,
    /// `block`, `underline`, `bar`, or `block-hollow`.
    pub cursor_style: &'static str,
    pub cursor_blink: bool,
    pub mouse_tracking: bool,
    pub focus_events: bool,
    pub bracketed_paste: bool,
    pub kitty_keyboard_flags: u8,
    pub alternate_screen: bool,
    pub synchronized_output: bool,
}

/// Everything libghostty hands back through callbacks while parsing child output.
#[derive(Default)]
struct TerminalCallbacks {
    responses: Vec<u8>,
    clipboard: Vec<ClipboardWrite>,
}

pub struct GhosttyTerminal {
    raw: GhosttyTerminalRaw,
    render: GhosttyRenderStateRaw,
    // Invariant: boxed so the userdata address given to libghostty stays fixed when the
    // terminal moves; it is freed only after the terminal in Drop.
    callbacks: Box<TerminalCallbacks>,
}

/// One immutable complete retained state. Unchanged rows share their allocation with the prior
/// commit; conversion to the wire representation happens only when a subscriber needs it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RetainedSurface {
    pub columns: u16,
    pub rows: u16,
    pub geometry_generation: u64,
    pub commit_kind: SurfaceCommitKind,
    row_data: Vec<Arc<SurfaceRow>>,
    styles: Arc<Vec<SurfaceStyle>>,
    links: Arc<Vec<SurfaceLink>>,
    palette: Arc<Vec<[u8; 3]>>,
    default_foreground: [u8; 3],
    default_background: [u8; 3],
    cursor_color: Option<[u8; 3]>,
}

impl RetainedSurface {
    pub fn structured(&self) -> Result<StructuredSurface, String> {
        let value = StructuredSurface {
            columns: self.columns,
            rows: self.rows,
            geometry_generation: self.geometry_generation,
            commit_kind: self.commit_kind,
            row_data: self
                .row_data
                .iter()
                .map(|row| row.as_ref().clone())
                .collect(),
            styles: self.styles.as_ref().clone(),
            links: self.links.as_ref().clone(),
            palette: self.palette.as_ref().clone(),
            default_foreground: self.default_foreground,
            default_background: self.default_background,
            cursor_color: self.cursor_color,
        };
        value.validate()?;
        Ok(value)
    }
}

/// Stateful row/style/link interning for retained commits. Tables are monotonic for one child
/// incarnation, so an unchanged row's indexes stay valid when its Arc is reused.
#[derive(Debug)]
pub struct RetainedSurfaceBuilder {
    columns: u16,
    rows: u16,
    row_data: Vec<Arc<SurfaceRow>>,
    styles: Vec<SurfaceStyle>,
    style_indexes: HashMap<SurfaceStyle, u16>,
    links: Vec<SurfaceLink>,
    link_indexes: HashMap<SurfaceLink, u16>,
}

impl Default for RetainedSurfaceBuilder {
    fn default() -> Self {
        let style = SurfaceStyle::default();
        Self {
            columns: 0,
            rows: 0,
            row_data: Vec::new(),
            styles: vec![style.clone()],
            style_indexes: HashMap::from([(style, 0)]),
            links: Vec::new(),
            link_indexes: HashMap::new(),
        }
    }
}

impl RetainedSurfaceBuilder {
    fn reset_rows(&mut self, columns: u16, rows: u16) {
        self.columns = columns;
        self.rows = rows;
        let blank = Arc::new(SurfaceRow {
            cells: vec![SurfaceCell::default(); usize::from(columns)],
        });
        self.row_data = vec![blank; usize::from(rows)];
    }

    fn intern_style(&mut self, style: SurfaceStyle) -> Result<u16, String> {
        if let Some(index) = self.style_indexes.get(&style) {
            return Ok(*index);
        }
        if self.styles.len() >= crate::protocol::MAX_SURFACE_STYLES
            || self.styles.len() > usize::from(u16::MAX)
        {
            return Err("surface style table is full".into());
        }
        let index = self.styles.len() as u16;
        self.styles.push(style.clone());
        self.style_indexes.insert(style, index);
        Ok(index)
    }

    fn intern_link(&mut self, link: SurfaceLink) -> Result<u16, String> {
        if let Some(index) = self.link_indexes.get(&link) {
            return Ok(*index);
        }
        if self.links.len() >= crate::protocol::MAX_SURFACE_LINKS
            || self.links.len() > usize::from(u16::MAX)
        {
            return Err("surface hyperlink table is full".into());
        }
        let index = self.links.len() as u16;
        self.links.push(link.clone());
        self.link_indexes.insert(link, index);
        Ok(index)
    }
}

/// A synchronized-output transition reported by libghostty's native parser.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SynchronizedOutputBoundary {
    Begin,
    End,
    Reset,
}

// Protocol: libghostty calls this synchronously inside ghostty_terminal_vt_write with query
// responses (for example the ConPTY cursor-position request) that belong to the child PTY.
unsafe extern "C" fn collect_pty_response(
    _terminal: GhosttyTerminalRaw,
    userdata: *mut c_void,
    data: *const u8,
    len: usize,
) {
    if userdata.is_null() || data.is_null() || len == 0 {
        return;
    }
    let callbacks = unsafe { &mut *userdata.cast::<TerminalCallbacks>() };
    callbacks
        .responses
        .extend_from_slice(unsafe { std::slice::from_raw_parts(data, len) });
}

// Protocol: libghostty normalizes OSC 52 selectors, base64, chunking, and OSC 1337 before this
// call, so one call is one complete logical clipboard write for the child's outer terminal.
unsafe extern "C" fn collect_clipboard_write(
    _terminal: GhosttyTerminalRaw,
    userdata: *mut c_void,
    write: *const GhosttyClipboardWrite,
) -> i32 {
    if userdata.is_null() || write.is_null() {
        return CLIPBOARD_WRITE_RESULT_UNSUPPORTED;
    }
    let callbacks = unsafe { &mut *userdata.cast::<TerminalCallbacks>() };
    let write = unsafe { &*write };
    if write.size < size_of::<GhosttyClipboardWrite>()
        || callbacks.clipboard.len() >= MAX_PENDING_CLIPBOARD_WRITES
    {
        return CLIPBOARD_WRITE_RESULT_UNSUPPORTED;
    }
    let contents = if write.contents.is_null() || write.contents_len == 0 {
        &[][..]
    } else {
        unsafe { std::slice::from_raw_parts(write.contents, write.contents_len) }
    };
    let text = contents.iter().find(|content| {
        borrowed_bytes(&content.mime)
            .is_some_and(|mime| mime.starts_with(b"text/") || mime.is_empty())
    });
    let (mime, data) = match text.or_else(|| contents.first()) {
        Some(content) => (
            borrowed_bytes(&content.mime).unwrap_or_default(),
            borrowed_bytes(&content.data).unwrap_or_default(),
        ),
        // Invariant: an empty write clears the destination; it travels as an empty payload.
        None => (&b"text/plain"[..], &[][..]),
    };
    if data.len() > crate::protocol::MAX_CLIPBOARD_BYTES
        || mime.len() > crate::protocol::MAX_MIME_BYTES
    {
        return CLIPBOARD_WRITE_RESULT_UNSUPPORTED;
    }
    let mime = if mime.is_empty() {
        "text/plain".to_owned()
    } else {
        String::from_utf8_lossy(mime).into_owned()
    };
    callbacks.clipboard.push(ClipboardWrite {
        location: write.location,
        mime,
        data: data.to_vec(),
    });
    CLIPBOARD_WRITE_RESULT_SUCCESS
}

fn borrowed_bytes(value: &GhosttyString) -> Option<&[u8]> {
    if value.ptr.is_null() {
        return None;
    }
    Some(unsafe { std::slice::from_raw_parts(value.ptr, value.len) })
}

impl GhosttyTerminal {
    pub fn new(cols: u16, rows: u16) -> Result<Self, String> {
        let mut raw = ptr::null_mut();
        let options = GhosttyTerminalOptions {
            cols,
            rows,
            max_scrollback: 10_000,
        };
        check(
            unsafe { ghostty_terminal_new(ptr::null(), &mut raw, options) },
            "create terminal",
        )?;
        let mut render = ptr::null_mut();
        let result = check(
            unsafe { ghostty_render_state_new(ptr::null(), &mut render) },
            "create render state",
        );
        if let Err(error) = result {
            unsafe { ghostty_terminal_free(raw) };
            return Err(error);
        }
        let mut terminal = Self {
            raw,
            render,
            callbacks: Box::default(),
        };
        let userdata =
            ptr::from_mut::<TerminalCallbacks>(terminal.callbacks.as_mut()).cast::<c_void>();
        check(
            unsafe { ghostty_terminal_set(raw, TERMINAL_OPT_USERDATA, userdata) },
            "set terminal userdata",
        )?;
        let callback: unsafe extern "C" fn(GhosttyTerminalRaw, *mut c_void, *const u8, usize) =
            collect_pty_response;
        check(
            unsafe { ghostty_terminal_set(raw, TERMINAL_OPT_WRITE_PTY, callback as *const c_void) },
            "set terminal pty responses",
        )?;
        let clipboard: unsafe extern "C" fn(
            GhosttyTerminalRaw,
            *mut c_void,
            *const GhosttyClipboardWrite,
        ) -> i32 = collect_clipboard_write;
        check(
            unsafe {
                ghostty_terminal_set(
                    raw,
                    TERMINAL_OPT_CLIPBOARD_WRITE,
                    clipboard as *const c_void,
                )
            },
            "set terminal clipboard writes",
        )?;
        Ok(terminal)
    }

    pub fn write(&mut self, bytes: &[u8]) {
        unsafe { ghostty_terminal_vt_write(self.raw, bytes.as_ptr(), bytes.len()) };
    }

    /// Process input through at most one synchronized-output transition reported by Ghostty's
    /// native parser. The consumed count lets the holder capture an end before processing a later
    /// begin from the same PTY read.
    pub fn write_until_sync_boundary(
        &mut self,
        bytes: &[u8],
    ) -> Result<(usize, Option<SynchronizedOutputBoundary>), String> {
        if bytes.is_empty() {
            return Ok((0, None));
        }
        let mut consumed = 0usize;
        let mut boundary = VT_BOUNDARY_NONE;
        check(
            unsafe {
                ghostty_terminal_vt_write_until_sync_boundary(
                    self.raw,
                    bytes.as_ptr(),
                    bytes.len(),
                    &mut consumed,
                    &mut boundary,
                )
            },
            "write terminal through synchronized-output boundary",
        )?;
        if consumed == 0 || consumed > bytes.len() {
            return Err("native terminal returned an invalid consumed byte count".into());
        }
        let boundary = match boundary {
            VT_BOUNDARY_NONE => None,
            VT_BOUNDARY_SYNC_BEGIN => Some(SynchronizedOutputBoundary::Begin),
            VT_BOUNDARY_SYNC_END => Some(SynchronizedOutputBoundary::End),
            VT_BOUNDARY_SYNC_RESET => Some(SynchronizedOutputBoundary::Reset),
            _ => {
                return Err(
                    "native terminal returned an unknown synchronized-output boundary".into(),
                );
            }
        };
        Ok((consumed, boundary))
    }

    /// Captures one complete immutable retained viewport while reusing every unchanged row from
    /// the prior commit. This consumes render damage only after each changed row has been copied.
    pub fn capture_retained_surface(
        &mut self,
        builder: &mut RetainedSurfaceBuilder,
        geometry_generation: u64,
        commit_kind: SurfaceCommitKind,
    ) -> Result<RetainedSurface, String> {
        check(
            unsafe { ghostty_render_state_update(self.render, self.raw) },
            "update retained render state",
        )?;
        let mut columns = 0u16;
        let mut rows = 0u16;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_COLS,
                    &mut columns as *mut u16 as *mut c_void,
                )
            },
            "read retained columns",
        )?;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_ROWS,
                    &mut rows as *mut u16 as *mut c_void,
                )
            },
            "read retained rows",
        )?;
        let cells = usize::from(columns)
            .checked_mul(usize::from(rows))
            .filter(|count| *count <= crate::protocol::MAX_SURFACE_CELLS)
            .ok_or_else(|| "retained surface dimensions exceed the cell bound".to_owned())?;
        if columns == 0
            || rows == 0
            || usize::from(columns) > crate::protocol::MAX_SURFACE_COLUMNS
            || usize::from(rows) > crate::protocol::MAX_SURFACE_ROWS
            || cells == 0
        {
            return Err("retained surface dimensions are out of bounds".into());
        }
        let geometry_changed = builder.columns != columns || builder.rows != rows;
        if geometry_changed {
            builder.reset_rows(columns, rows);
        }
        let mut dirty = 0i32;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_DIRTY,
                    &mut dirty as *mut i32 as *mut c_void,
                )
            },
            "read retained damage",
        )?;
        let repaint_all = geometry_changed || dirty == 2;
        let mut row_iterator = ptr::null_mut();
        check(
            unsafe { ghostty_render_state_row_iterator_new(ptr::null(), &mut row_iterator) },
            "create retained row iterator",
        )?;
        let mut cell_iterator = ptr::null_mut();
        let cell_result = check(
            unsafe { ghostty_render_state_row_cells_new(ptr::null(), &mut cell_iterator) },
            "create retained cell iterator",
        );
        if let Err(error) = cell_result {
            unsafe { ghostty_render_state_row_iterator_free(row_iterator) };
            return Err(error);
        }
        let populate = check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_ROW_ITERATOR,
                    &mut row_iterator as *mut GhosttyRenderStateRowIteratorRaw as *mut c_void,
                )
            },
            "populate retained row iterator",
        );
        if let Err(error) = populate {
            unsafe {
                ghostty_render_state_row_cells_free(cell_iterator);
                ghostty_render_state_row_iterator_free(row_iterator);
            }
            return Err(error);
        }
        let captured = (|| -> Result<(), String> {
            let mut row_index = 0usize;
            while unsafe { ghostty_render_state_row_iterator_next(row_iterator) } {
                if row_index >= usize::from(rows) {
                    return Err("retained row iterator exceeded viewport rows".into());
                }
                let mut row_dirty = false;
                check(
                    unsafe {
                        ghostty_render_state_row_get(
                            row_iterator,
                            ROW_DATA_DIRTY,
                            &mut row_dirty as *mut bool as *mut c_void,
                        )
                    },
                    "read retained row damage",
                )?;
                if repaint_all || row_dirty {
                    check(
                        unsafe {
                            ghostty_render_state_row_get(
                                row_iterator,
                                ROW_DATA_CELLS,
                                &mut cell_iterator as *mut GhosttyRenderStateRowCellsRaw
                                    as *mut c_void,
                            )
                        },
                        "read retained row cells",
                    )?;
                    let mut row = SurfaceRow {
                        cells: Vec::with_capacity(usize::from(columns)),
                    };
                    let mut column = 0u16;
                    while unsafe { ghostty_render_state_row_cells_next(cell_iterator) } {
                        if column >= columns {
                            return Err("retained cell iterator exceeded viewport columns".into());
                        }
                        let style = retained_cell_style(cell_iterator)?;
                        let style = builder.intern_style(style)?;
                        let mut raw = 0u64;
                        check(
                            unsafe {
                                ghostty_render_state_row_cells_get(
                                    cell_iterator,
                                    CELLS_DATA_RAW,
                                    &mut raw as *mut u64 as *mut c_void,
                                )
                            },
                            "read retained raw cell",
                        )?;
                        let mut wide = CELL_WIDE_NORMAL;
                        check(
                            unsafe {
                                ghostty_cell_get(
                                    raw,
                                    CELL_DATA_WIDE,
                                    &mut wide as *mut i32 as *mut c_void,
                                )
                            },
                            "read retained cell width",
                        )?;
                        let mut has_link = false;
                        check(
                            unsafe {
                                ghostty_cell_get(
                                    raw,
                                    CELL_DATA_HAS_HYPERLINK,
                                    &mut has_link as *mut bool as *mut c_void,
                                )
                            },
                            "read retained hyperlink flag",
                        )?;
                        let link = if has_link {
                            self.hyperlink_at(column, row_index as u16)?
                                .map(|link| builder.intern_link(link))
                                .transpose()?
                        } else {
                            None
                        };
                        let text = cell_text(cell_iterator)?;
                        if text.len() > crate::protocol::MAX_CELL_TEXT_BYTES {
                            return Err("retained cell grapheme exceeds the text bound".into());
                        }
                        row.cells.push(SurfaceCell {
                            text,
                            width: match wide {
                                CELL_WIDE_WIDE => 2,
                                CELL_WIDE_SPACER_TAIL => 0,
                                _ => 1,
                            },
                            style,
                            link,
                        });
                        column = column.saturating_add(1);
                    }
                    if row.cells.len() != usize::from(columns) {
                        return Err("retained row has the wrong cell count".into());
                    }
                    builder.row_data[row_index] = Arc::new(row);
                    let clean = false;
                    check(
                        unsafe {
                            ghostty_render_state_row_set(
                                row_iterator,
                                ROW_OPTION_DIRTY,
                                &clean as *const bool as *const c_void,
                            )
                        },
                        "clear retained row damage",
                    )?;
                }
                row_index += 1;
            }
            if row_index != usize::from(rows) {
                return Err("retained row iterator ended before viewport rows".into());
            }
            Ok(())
        })();
        unsafe {
            ghostty_render_state_row_cells_free(cell_iterator);
            ghostty_render_state_row_iterator_free(row_iterator);
        }
        captured?;
        let clean = 0i32;
        check(
            unsafe {
                ghostty_render_state_set(
                    self.render,
                    RENDER_OPTION_DIRTY,
                    &clean as *const i32 as *const c_void,
                )
            },
            "clear retained frame damage",
        )?;
        let colors = self.colors()?;
        Ok(RetainedSurface {
            columns,
            rows,
            geometry_generation,
            commit_kind,
            row_data: builder.row_data.clone(),
            styles: Arc::new(builder.styles.clone()),
            links: Arc::new(builder.links.clone()),
            palette: Arc::new(colors.palette.into_iter().map(rgb_array).collect()),
            default_foreground: rgb_array(colors.foreground),
            default_background: rgb_array(colors.background),
            cursor_color: colors.cursor_has_value.then(|| rgb_array(colors.cursor)),
        })
    }

    fn hyperlink_at(&self, column: u16, row: u16) -> Result<Option<SurfaceLink>, String> {
        let reference = self.grid_ref(column, row)?;
        let mut required = 0usize;
        let measured = unsafe {
            ghostty_grid_ref_hyperlink_uri(&reference, ptr::null_mut(), 0, &mut required)
        };
        if measured == GHOSTTY_SUCCESS && required == 0 {
            return Ok(None);
        }
        if measured != GHOSTTY_OUT_OF_SPACE || required == 0 {
            return Err(format!("measure retained hyperlink failed with {measured}"));
        }
        if required > crate::protocol::MAX_LINK_URI_BYTES {
            return Err("retained hyperlink URI exceeds the bound".into());
        }
        let mut uri = vec![0u8; required];
        let mut written = 0usize;
        check(
            unsafe {
                ghostty_grid_ref_hyperlink_uri(
                    &reference,
                    uri.as_mut_ptr(),
                    uri.len(),
                    &mut written,
                )
            },
            "read retained hyperlink URI",
        )?;
        uri.truncate(written);
        let uri = String::from_utf8(uri)
            .map_err(|error| format!("retained hyperlink URI is not UTF-8: {error}"))?;
        let mut id_length = 0usize;
        let measured = unsafe {
            ghostty_grid_ref_hyperlink_id(&reference, ptr::null_mut(), 0, &mut id_length)
        };
        let id = if measured == GHOSTTY_SUCCESS && id_length == 0 {
            None
        } else {
            if measured != GHOSTTY_OUT_OF_SPACE
                || id_length == 0
                || id_length > crate::protocol::MAX_LINK_ID_BYTES
            {
                return Err(format!(
                    "measure retained hyperlink ID failed with {measured}"
                ));
            }
            let mut id = vec![0u8; id_length];
            let mut written = 0usize;
            check(
                unsafe {
                    ghostty_grid_ref_hyperlink_id(
                        &reference,
                        id.as_mut_ptr(),
                        id.len(),
                        &mut written,
                    )
                },
                "read retained hyperlink ID",
            )?;
            id.truncate(written);
            Some(
                String::from_utf8(id)
                    .map_err(|error| format!("retained hyperlink ID is not UTF-8: {error}"))?,
            )
        };
        Ok(Some(SurfaceLink { id, uri }))
    }

    /// Returns and clears query responses the terminal produced for its child PTY.
    pub fn take_responses(&mut self) -> Vec<u8> {
        std::mem::take(&mut self.callbacks.responses)
    }

    /// Returns and clears the clipboard writes the child emitted since the previous call.
    pub fn take_clipboard_writes(&mut self) -> Vec<ClipboardWrite> {
        std::mem::take(&mut self.callbacks.clipboard)
    }

    /// Whether the child has set a DEC private mode such as bracketed paste or focus events.
    pub fn mode(&self, mode: u16) -> Result<bool, String> {
        let mut value = false;
        check(
            unsafe { ghostty_terminal_mode_get(self.raw, mode, &mut value) },
            "read terminal mode",
        )?;
        Ok(value)
    }

    pub fn kitty_keyboard_flags(&self) -> Result<u8, String> {
        let mut flags = 0u8;
        check(
            unsafe {
                ghostty_terminal_get(
                    self.raw,
                    TERMINAL_DATA_KITTY_KEYBOARD_FLAGS,
                    &mut flags as *mut u8 as *mut c_void,
                )
            },
            "read kitty keyboard flags",
        )?;
        Ok(flags)
    }

    pub fn alternate_screen(&self) -> Result<bool, String> {
        let mut screen = 0i32;
        check(
            unsafe {
                ghostty_terminal_get(
                    self.raw,
                    TERMINAL_DATA_ACTIVE_SCREEN,
                    &mut screen as *mut i32 as *mut c_void,
                )
            },
            "read active screen",
        )?;
        Ok(screen == 1)
    }

    /// The modes a viewer needs to mirror this child; read after `frame_at` so the render state
    /// cursor fields are current.
    ///
    /// Compatibility: each field is read on its own and falls back to the terminal default, so one
    /// datum a library build does not report never withholds the cursor shape and modes the
    /// viewer needs from every other field.
    pub fn mode_snapshot(&self) -> Result<TerminalModeSnapshot, String> {
        let mut style = 1i32;
        let _ = check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_CURSOR_VISUAL_STYLE,
                    &mut style as *mut i32 as *mut c_void,
                )
            },
            "read cursor style",
        );
        let mut blink = false;
        let _ = check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_CURSOR_BLINKING,
                    &mut blink as *mut bool as *mut c_void,
                )
            },
            "read cursor blink",
        );
        Ok(TerminalModeSnapshot {
            cursor_visible: self.mode(MODE_CURSOR_VISIBLE).unwrap_or(true),
            cursor_style: match style {
                0 => "bar",
                2 => "underline",
                3 => "block-hollow",
                _ => "block",
            },
            cursor_blink: blink,
            mouse_tracking: self.mouse_tracking().unwrap_or(false),
            focus_events: self.mode(MODE_FOCUS_EVENT).unwrap_or(false),
            bracketed_paste: self.mode(MODE_BRACKETED_PASTE).unwrap_or(false),
            kitty_keyboard_flags: self.kitty_keyboard_flags().unwrap_or(0),
            alternate_screen: self.alternate_screen().unwrap_or(false),
            synchronized_output: self.mode(MODE_SYNC_OUTPUT).unwrap_or(false),
        })
    }

    /// The viewport cursor cell, zero-based, or `None` when hidden or scrolled out of view; read
    /// after `frame_at` so the render state is current.
    pub fn cursor_cell(&self) -> Result<Option<(u16, u16)>, String> {
        let mut visible = false;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_CURSOR_VISIBLE,
                    &mut visible as *mut bool as *mut c_void,
                )
            },
            "read cursor visibility",
        )?;
        let mut has_position = false;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_CURSOR_HAS_POSITION,
                    &mut has_position as *mut bool as *mut c_void,
                )
            },
            "read cursor position presence",
        )?;
        if !visible || !has_position {
            return Ok(None);
        }
        let mut x = 0u16;
        let mut y = 0u16;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_CURSOR_X,
                    &mut x as *mut u16 as *mut c_void,
                )
            },
            "read cursor x",
        )?;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_CURSOR_Y,
                    &mut y as *mut u16 as *mut c_void,
                )
            },
            "read cursor y",
        )?;
        Ok(Some((x, y)))
    }

    pub fn resize(&mut self, cols: u16, rows: u16) -> Result<(), String> {
        check(
            unsafe { ghostty_terminal_resize(self.raw, cols, rows, 0, 0) },
            "resize terminal",
        )
    }

    pub fn scroll_delta(&mut self, rows: isize) -> Result<(), String> {
        unsafe {
            ghostty_terminal_scroll_viewport(
                self.raw,
                GhosttyTerminalScrollViewport {
                    tag: 2,
                    value: GhosttyTerminalScrollViewportValue { delta: rows },
                },
            );
        }
        let full = 2i32;
        check(
            unsafe {
                ghostty_render_state_set(
                    self.render,
                    RENDER_OPTION_DIRTY,
                    &full as *const i32 as *const c_void,
                )
            },
            "mark scrolled frame dirty",
        )
    }

    pub fn mouse_tracking(&self) -> Result<bool, String> {
        let mut active = false;
        check(
            unsafe {
                ghostty_terminal_get(
                    self.raw,
                    TERMINAL_DATA_MOUSE_TRACKING,
                    &mut active as *mut bool as *mut c_void,
                )
            },
            "read terminal mouse tracking state",
        )?;
        Ok(active)
    }

    pub fn scrollbar(&self) -> Result<TerminalScrollbar, String> {
        let mut scrollbar = TerminalScrollbar::default();
        check(
            unsafe {
                ghostty_terminal_get(
                    self.raw,
                    TERMINAL_DATA_SCROLLBAR,
                    &mut scrollbar as *mut TerminalScrollbar as *mut c_void,
                )
            },
            "read terminal scrollbar",
        )?;
        Ok(scrollbar)
    }

    pub fn scrollback_rows(&self) -> Result<usize, String> {
        let mut rows = 0usize;
        check(
            unsafe {
                ghostty_terminal_get(
                    self.raw,
                    TERMINAL_DATA_SCROLLBACK_ROWS,
                    &mut rows as *mut usize as *mut c_void,
                )
            },
            "read terminal scrollback rows",
        )?;
        Ok(rows)
    }

    pub fn mark_dirty(&mut self) -> Result<(), String> {
        let full = 2i32;
        check(
            unsafe {
                ghostty_render_state_set(
                    self.render,
                    RENDER_OPTION_DIRTY,
                    &full as *const i32 as *const c_void,
                )
            },
            "mark frame dirty",
        )
    }

    pub fn viewport_active(&self) -> Result<bool, String> {
        let mut active = false;
        check(
            unsafe {
                ghostty_terminal_get(
                    self.raw,
                    TERMINAL_DATA_VIEWPORT_ACTIVE,
                    &mut active as *mut bool as *mut c_void,
                )
            },
            "read terminal viewport state",
        )?;
        Ok(active)
    }

    fn grid_ref(&self, x: u16, y: u16) -> Result<GhosttyGridRef, String> {
        let mut reference = GhosttyGridRef {
            size: size_of::<GhosttyGridRef>(),
            node: ptr::null_mut(),
            x: 0,
            y: 0,
        };
        let point = GhosttyPoint {
            tag: 1,
            value: GhosttyPointValue {
                coordinate: GhosttyPointCoordinate { x, y: u32::from(y) },
            },
        };
        check(
            unsafe { ghostty_terminal_grid_ref(self.raw, point, &mut reference) },
            "resolve selection point",
        )?;
        Ok(reference)
    }

    fn install_selection(&mut self, selection: &GhosttySelection) -> Result<(), String> {
        check(
            unsafe {
                ghostty_terminal_set(
                    self.raw,
                    TERMINAL_OPT_SELECTION,
                    selection as *const GhosttySelection as *const c_void,
                )
            },
            "install terminal selection",
        )?;
        self.mark_dirty()
    }

    fn clear_selection(&mut self) -> Result<(), String> {
        check(
            unsafe { ghostty_terminal_set(self.raw, TERMINAL_OPT_SELECTION, ptr::null()) },
            "clear terminal selection",
        )?;
        self.mark_dirty()
    }

    fn selection_text(&mut self) -> Result<Option<Vec<u8>>, String> {
        let options = GhosttyTerminalSelectionFormatOptions {
            size: size_of::<GhosttyTerminalSelectionFormatOptions>(),
            emit: 0,
            unwrap: true,
            trim: true,
            selection: ptr::null(),
        };
        let mut output = ptr::null_mut();
        let mut length = 0usize;
        let result = unsafe {
            ghostty_terminal_selection_format_alloc(
                self.raw,
                ptr::null(),
                options,
                &mut output,
                &mut length,
            )
        };
        if result == GHOSTTY_NO_VALUE {
            return Ok(None);
        }
        check(result, "format terminal selection")?;
        let bytes = unsafe { std::slice::from_raw_parts(output, length).to_vec() };
        unsafe { ghostty_free(ptr::null(), output, length) };
        Ok(Some(bytes))
    }

    pub fn frame(&mut self) -> Result<String, String> {
        self.frame_at(0, 0, true)
    }

    pub fn frame_at(
        &mut self,
        origin_column: u16,
        origin_row: u16,
        present_cursor: bool,
    ) -> Result<String, String> {
        trace("render update");
        check(
            unsafe { ghostty_render_state_update(self.render, self.raw) },
            "update render state",
        )?;
        let mut dirty = 0i32;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_DIRTY,
                    &mut dirty as *mut i32 as *mut c_void,
                )
            },
            "read render dirty state",
        )?;
        if dirty == 0 {
            return Ok(String::new());
        }
        trace("render colors");
        let colors = self.colors()?;
        trace("row iterator");
        let mut row_iterator = ptr::null_mut();
        check(
            unsafe { ghostty_render_state_row_iterator_new(ptr::null(), &mut row_iterator) },
            "create row iterator",
        )?;
        trace("cell iterator");
        let mut cells = ptr::null_mut();
        let result = check(
            unsafe { ghostty_render_state_row_cells_new(ptr::null(), &mut cells) },
            "create cell iterator",
        );
        if let Err(error) = result {
            unsafe { ghostty_render_state_row_iterator_free(row_iterator) };
            return Err(error);
        }
        let populated = check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_ROW_ITERATOR,
                    &mut row_iterator as *mut GhosttyRenderStateRowIteratorRaw as *mut c_void,
                )
            },
            "populate row iterator",
        );
        if let Err(error) = populated {
            unsafe {
                ghostty_render_state_row_cells_free(cells);
                ghostty_render_state_row_iterator_free(row_iterator);
            }
            return Err(error);
        }
        trace("compose frame");
        let frame = self.compose_frame(
            row_iterator,
            cells,
            colors,
            origin_column,
            origin_row,
            present_cursor,
            dirty == 2,
        );
        unsafe {
            ghostty_render_state_row_cells_free(cells);
            ghostty_render_state_row_iterator_free(row_iterator);
        }
        frame
    }

    fn compose_frame(
        &mut self,
        row_iterator: GhosttyRenderStateRowIteratorRaw,
        mut cells: GhosttyRenderStateRowCellsRaw,
        colors: GhosttyRenderStateColors,
        origin_column: u16,
        origin_row: u16,
        present_cursor: bool,
        repaint_all_rows: bool,
    ) -> Result<String, String> {
        let mut out = String::from("\u{1b}[?2026h");
        let mut active: Option<ActiveStyle> = None;
        let mut row_index: usize = 0;
        while unsafe { ghostty_render_state_row_iterator_next(row_iterator) } {
            trace("next row");
            let mut dirty = false;
            check(
                unsafe {
                    ghostty_render_state_row_get(
                        row_iterator,
                        ROW_DATA_DIRTY,
                        &mut dirty as *mut bool as *mut c_void,
                    )
                },
                "read row dirty state",
            )?;
            if dirty || repaint_all_rows {
                out.push_str(&format!(
                    "\u{1b}[{};{}H",
                    usize::from(origin_row) + row_index + 1,
                    origin_column + 1
                ));
                trace("row cells");
                check(
                    unsafe {
                        ghostty_render_state_row_get(
                            row_iterator,
                            ROW_DATA_CELLS,
                            &mut cells as *mut GhosttyRenderStateRowCellsRaw as *mut c_void,
                        )
                    },
                    "read row cells",
                )?;
                while unsafe { ghostty_render_state_row_cells_next(cells) } {
                    trace("next cell");
                    let style = cell_style(cells, &colors)?;
                    if active != Some(style) {
                        write_style(&mut out, style);
                        active = Some(style);
                    }
                    out.push_str(&cell_text(cells)?);
                }
                let clean = false;
                check(
                    unsafe {
                        ghostty_render_state_row_set(
                            row_iterator,
                            ROW_OPTION_DIRTY,
                            &clean as *const bool as *const c_void,
                        )
                    },
                    "clear row dirty state",
                )?;
            }
            row_index += 1;
        }
        if active.is_some() {
            out.push_str("\u{1b}[0m");
        }
        if present_cursor {
            out.push_str(&self.cursor_frame_at(origin_column, origin_row)?);
        }
        out.push_str("\u{1b}[?2026l");
        let clean = 0i32;
        check(
            unsafe {
                ghostty_render_state_set(
                    self.render,
                    RENDER_OPTION_DIRTY,
                    &clean as *const i32 as *const c_void,
                )
            },
            "clear render dirty state",
        )?;
        Ok(out)
    }

    pub fn cursor_frame_at(&self, origin_column: u16, origin_row: u16) -> Result<String, String> {
        let Some((x, y)) = self.cursor_cell()? else {
            return Ok("\u{1b}[?25l".to_owned());
        };
        Ok(format!(
            "\u{1b}[{};{}H\u{1b}[?25h",
            origin_row + y + 1,
            origin_column + x + 1
        ))
    }

    fn colors(&self) -> Result<GhosttyRenderStateColors, String> {
        let mut colors = GhosttyRenderStateColors {
            size: size_of::<GhosttyRenderStateColors>(),
            background: GhosttyColorRgb::default(),
            foreground: GhosttyColorRgb::default(),
            cursor: GhosttyColorRgb::default(),
            cursor_has_value: false,
            palette: [GhosttyColorRgb::default(); 256],
        };
        check(
            unsafe { ghostty_render_state_colors_get(self.render, &mut colors) },
            "read render colors",
        )?;
        Ok(colors)
    }
}

impl Drop for GhosttyTerminal {
    fn drop(&mut self) {
        unsafe {
            ghostty_render_state_free(self.render);
            ghostty_terminal_free(self.raw);
        }
    }
}

pub struct SelectionGesture {
    raw: GhosttySelectionGestureRaw,
    terminal: GhosttyTerminalRaw,
    started: Instant,
}

impl SelectionGesture {
    pub fn new(terminal: &GhosttyTerminal) -> Result<Self, String> {
        let mut raw = ptr::null_mut();
        check(
            unsafe { ghostty_selection_gesture_new(ptr::null(), &mut raw) },
            "create selection gesture",
        )?;
        Ok(Self {
            raw,
            terminal: terminal.raw,
            started: Instant::now(),
        })
    }

    pub fn press(
        &mut self,
        terminal: &mut GhosttyTerminal,
        x: u16,
        y: u16,
    ) -> Result<bool, String> {
        terminal.clear_selection()?;
        let event = self.event(0)?;
        let reference = terminal.grid_ref(x, y)?;
        self.set_reference(event, &reference)?;
        self.set_position(event, x, y)?;
        self.set_press_options(event)?;
        let mut selection = empty_selection();
        let result = unsafe {
            ghostty_selection_gesture_event(self.raw, terminal.raw, event, &mut selection)
        };
        unsafe { ghostty_selection_gesture_event_free(event) };
        if result == GHOSTTY_NO_VALUE {
            return Ok(false);
        }
        check(result, "apply selection press")?;
        terminal.install_selection(&selection)?;
        Ok(true)
    }

    pub fn clear(&mut self, terminal: &mut GhosttyTerminal) -> Result<(), String> {
        terminal.clear_selection()
    }

    pub fn drag(
        &mut self,
        terminal: &mut GhosttyTerminal,
        x: u16,
        y: u16,
        cols: u16,
        rows: u16,
    ) -> Result<(), String> {
        let event = self.event(2)?;
        let reference = terminal.grid_ref(x, y)?;
        self.set_reference(event, &reference)?;
        self.set_position(event, x, y)?;
        let geometry = GhosttySelectionGestureGeometry {
            columns: u32::from(cols),
            cell_width: 1,
            padding_left: 0,
            screen_height: u32::from(rows),
        };
        check(
            unsafe {
                ghostty_selection_gesture_event_set(
                    event,
                    8,
                    &geometry as *const GhosttySelectionGestureGeometry as *const c_void,
                )
            },
            "set selection geometry",
        )?;
        let mut selection = empty_selection();
        let result = unsafe {
            ghostty_selection_gesture_event(self.raw, terminal.raw, event, &mut selection)
        };
        unsafe { ghostty_selection_gesture_event_free(event) };
        if result == GHOSTTY_NO_VALUE {
            return Ok(());
        }
        check(result, "apply selection drag")?;
        terminal.install_selection(&selection)
    }

    pub fn release(
        &mut self,
        terminal: &mut GhosttyTerminal,
        x: u16,
        y: u16,
    ) -> Result<Option<Vec<u8>>, String> {
        let event = self.event(1)?;
        let reference = terminal.grid_ref(x, y)?;
        self.set_reference(event, &reference)?;
        let result = unsafe {
            ghostty_selection_gesture_event(self.raw, terminal.raw, event, ptr::null_mut())
        };
        unsafe { ghostty_selection_gesture_event_free(event) };
        if result != GHOSTTY_SUCCESS && result != GHOSTTY_NO_VALUE {
            return Err(format!("apply selection release failed with {result}"));
        }
        terminal.selection_text()
    }

    fn event(&self, event_type: i32) -> Result<GhosttySelectionGestureEventRaw, String> {
        let mut event = ptr::null_mut();
        check(
            unsafe { ghostty_selection_gesture_event_new(ptr::null(), &mut event, event_type) },
            "create selection event",
        )?;
        Ok(event)
    }

    fn set_press_options(&self, event: GhosttySelectionGestureEventRaw) -> Result<(), String> {
        let repeat_distance = 2.0f64;
        check(
            unsafe {
                ghostty_selection_gesture_event_set(
                    event,
                    2,
                    &repeat_distance as *const f64 as *const c_void,
                )
            },
            "set selection repeat distance",
        )?;
        let time_ns = self.started.elapsed().as_nanos() as u64;
        check(
            unsafe {
                ghostty_selection_gesture_event_set(
                    event,
                    3,
                    &time_ns as *const u64 as *const c_void,
                )
            },
            "set selection time",
        )?;
        let repeat_interval_ns = 500_000_000u64;
        check(
            unsafe {
                ghostty_selection_gesture_event_set(
                    event,
                    4,
                    &repeat_interval_ns as *const u64 as *const c_void,
                )
            },
            "set selection repeat interval",
        )?;
        let behaviors = GhosttySelectionGestureBehaviors {
            single_click: 0,
            double_click: 1,
            triple_click: 2,
        };
        check(
            unsafe {
                ghostty_selection_gesture_event_set(
                    event,
                    6,
                    &behaviors as *const GhosttySelectionGestureBehaviors as *const c_void,
                )
            },
            "set selection click behaviors",
        )
    }

    fn set_reference(
        &self,
        event: GhosttySelectionGestureEventRaw,
        reference: &GhosttyGridRef,
    ) -> Result<(), String> {
        check(
            unsafe {
                ghostty_selection_gesture_event_set(
                    event,
                    0,
                    reference as *const GhosttyGridRef as *const c_void,
                )
            },
            "set selection reference",
        )
    }

    fn set_position(
        &self,
        event: GhosttySelectionGestureEventRaw,
        x: u16,
        y: u16,
    ) -> Result<(), String> {
        let position = GhosttySurfacePosition {
            x: f64::from(x) + 0.5,
            y: f64::from(y) + 0.5,
        };
        check(
            unsafe {
                ghostty_selection_gesture_event_set(
                    event,
                    1,
                    &position as *const GhosttySurfacePosition as *const c_void,
                )
            },
            "set selection position",
        )
    }
}

impl Drop for SelectionGesture {
    fn drop(&mut self) {
        unsafe { ghostty_selection_gesture_free(self.raw, self.terminal) };
    }
}

fn empty_selection() -> GhosttySelection {
    GhosttySelection {
        size: size_of::<GhosttySelection>(),
        start: GhosttyGridRef {
            size: size_of::<GhosttyGridRef>(),
            node: ptr::null_mut(),
            x: 0,
            y: 0,
        },
        end: GhosttyGridRef {
            size: size_of::<GhosttyGridRef>(),
            node: ptr::null_mut(),
            x: 0,
            y: 0,
        },
        rectangle: false,
    }
}

pub struct KeyEncoder {
    raw: GhosttyKeyEncoderRaw,
}

const KEY_ENCODER_OPT_MACOS_OPTION_AS_ALT: i32 = 6;
const OPTION_AS_ALT_TRUE: i32 = 1;

impl KeyEncoder {
    pub fn new(terminal: &GhosttyTerminal) -> Result<Self, String> {
        let mut raw = ptr::null_mut();
        check(
            unsafe { ghostty_key_encoder_new(ptr::null(), &mut raw) },
            "create key encoder",
        )?;
        Self::sync_options(raw, terminal);
        Ok(Self { raw })
    }

    // Platform: the outer terminal already decided that Option meant Alt when it produced an
    // ESC-prefixed chord, and the terminal-state sync resets that encoder option to false on
    // macOS, so it is restored after every sync to re-encode exactly what the user sent.
    fn sync_options(raw: GhosttyKeyEncoderRaw, terminal: &GhosttyTerminal) {
        unsafe {
            ghostty_key_encoder_setopt_from_terminal(raw, terminal.raw);
            ghostty_key_encoder_setopt(
                raw,
                KEY_ENCODER_OPT_MACOS_OPTION_AS_ALT,
                &OPTION_AS_ALT_TRUE as *const i32 as *const c_void,
            );
        }
    }

    pub fn encode(
        &self,
        terminal: &GhosttyTerminal,
        key: i32,
        mods: u16,
        utf8: Option<&str>,
        repeat: bool,
    ) -> Result<Vec<u8>, String> {
        Self::sync_options(self.raw, terminal);
        let mut event = ptr::null_mut();
        check(
            unsafe { ghostty_key_event_new(ptr::null(), &mut event) },
            "create key event",
        )?;
        unsafe {
            ghostty_key_event_set_action(
                event,
                if repeat {
                    KEY_ACTION_REPEAT
                } else {
                    KEY_ACTION_PRESS
                },
            );
            ghostty_key_event_set_key(event, key);
            ghostty_key_event_set_mods(event, mods);
            if let Some(codepoint) = unshifted_codepoint(key) {
                ghostty_key_event_set_unshifted_codepoint(event, codepoint);
            }
            if let Some(text) = utf8 {
                ghostty_key_event_set_utf8(event, text.as_ptr().cast(), text.len());
            }
        }
        let result = self.encode_event(event);
        unsafe { ghostty_key_event_free(event) };
        result
    }

    fn encode_event(&self, event: GhosttyKeyEventRaw) -> Result<Vec<u8>, String> {
        let mut required = 0usize;
        let first = unsafe {
            ghostty_key_encoder_encode(self.raw, event, ptr::null_mut(), 0, &mut required)
        };
        if first != GHOSTTY_SUCCESS && first != GHOSTTY_OUT_OF_SPACE {
            return Err(format!("measure key input failed with {first}"));
        }
        let mut bytes = vec![0u8; required.max(1)];
        let mut written = 0usize;
        check(
            unsafe {
                ghostty_key_encoder_encode(
                    self.raw,
                    event,
                    bytes.as_mut_ptr().cast(),
                    bytes.len(),
                    &mut written,
                )
            },
            "encode key input",
        )?;
        bytes.truncate(written);
        Ok(bytes)
    }
}

impl Drop for KeyEncoder {
    fn drop(&mut self) {
        unsafe { ghostty_key_encoder_free(self.raw) };
    }
}

#[derive(Clone, Copy)]
pub enum MouseAction {
    Press,
    Release,
    Motion,
}

#[derive(Clone, Copy)]
pub enum MouseButton {
    Left,
    Right,
    Middle,
    Four,
    Five,
}

pub struct MouseInput {
    pub action: MouseAction,
    pub button: Option<MouseButton>,
    pub mods: u16,
    pub column: u16,
    pub row: u16,
    pub columns: u16,
    pub rows: u16,
    pub any_button_pressed: bool,
}

pub struct MouseEncoder {
    raw: GhosttyMouseEncoderRaw,
}

impl MouseEncoder {
    pub fn new() -> Result<Self, String> {
        let mut raw = ptr::null_mut();
        check(
            unsafe { ghostty_mouse_encoder_new(ptr::null(), &mut raw) },
            "create mouse encoder",
        )?;
        let track_last_cell = true;
        unsafe {
            ghostty_mouse_encoder_setopt(raw, 4, &track_last_cell as *const bool as *const c_void)
        };
        Ok(Self { raw })
    }

    pub fn encode(&self, terminal: &GhosttyTerminal, input: MouseInput) -> Result<Vec<u8>, String> {
        unsafe { ghostty_mouse_encoder_setopt_from_terminal(self.raw, terminal.raw) };
        let size = GhosttyMouseEncoderSize {
            size: size_of::<GhosttyMouseEncoderSize>(),
            screen_width: u32::from(input.columns),
            screen_height: u32::from(input.rows),
            cell_width: 1,
            cell_height: 1,
            padding_top: 0,
            padding_bottom: 0,
            padding_right: 0,
            padding_left: 0,
        };
        unsafe {
            ghostty_mouse_encoder_setopt(
                self.raw,
                2,
                &size as *const GhosttyMouseEncoderSize as *const c_void,
            );
            ghostty_mouse_encoder_setopt(
                self.raw,
                3,
                &input.any_button_pressed as *const bool as *const c_void,
            );
        }

        let mut event = ptr::null_mut();
        check(
            unsafe { ghostty_mouse_event_new(ptr::null(), &mut event) },
            "create mouse event",
        )?;
        unsafe {
            ghostty_mouse_event_set_action(
                event,
                match input.action {
                    MouseAction::Press => 0,
                    MouseAction::Release => 1,
                    MouseAction::Motion => 2,
                },
            );
            if let Some(button) = input.button {
                ghostty_mouse_event_set_button(
                    event,
                    match button {
                        MouseButton::Left => 1,
                        MouseButton::Right => 2,
                        MouseButton::Middle => 3,
                        MouseButton::Four => 4,
                        MouseButton::Five => 5,
                    },
                );
            } else {
                ghostty_mouse_event_clear_button(event);
            }
            ghostty_mouse_event_set_mods(event, input.mods);
            ghostty_mouse_event_set_position(
                event,
                GhosttyMousePosition {
                    x: f32::from(input.column) + 0.5,
                    y: f32::from(input.row) + 0.5,
                },
            );
        }
        let result = self.encode_event(event);
        unsafe { ghostty_mouse_event_free(event) };
        result
    }

    fn encode_event(&self, event: GhosttyMouseEventRaw) -> Result<Vec<u8>, String> {
        let mut required = 0usize;
        let first = unsafe {
            ghostty_mouse_encoder_encode(self.raw, event, ptr::null_mut(), 0, &mut required)
        };
        if first != GHOSTTY_SUCCESS && first != GHOSTTY_OUT_OF_SPACE {
            return Err(format!("measure mouse input failed with {first}"));
        }
        if required == 0 {
            return Ok(Vec::new());
        }
        let mut bytes = vec![0u8; required];
        let mut written = 0usize;
        check(
            unsafe {
                ghostty_mouse_encoder_encode(
                    self.raw,
                    event,
                    bytes.as_mut_ptr().cast(),
                    bytes.len(),
                    &mut written,
                )
            },
            "encode mouse input",
        )?;
        bytes.truncate(written);
        Ok(bytes)
    }
}

impl Drop for MouseEncoder {
    fn drop(&mut self) {
        unsafe { ghostty_mouse_encoder_free(self.raw) };
    }
}

pub fn key_for_character(character: char) -> i32 {
    match character {
        'a'..='z' | 'A'..='Z' => KEY_A + character.to_ascii_lowercase() as i32 - 'a' as i32,
        '0'..='9' => 6 + character as i32 - '0' as i32,
        ' ' => KEY_SPACE,
        _ => KEY_UNIDENTIFIED,
    }
}

fn unshifted_codepoint(key: i32) -> Option<u32> {
    match key {
        KEY_A..=45 => Some((b'a' + (key - KEY_A) as u8) as u32),
        6..=15 => Some((b'0' + (key - 6) as u8) as u32),
        KEY_SPACE => Some(' ' as u32),
        _ => None,
    }
}

fn retained_cell_style(cells: GhosttyRenderStateRowCellsRaw) -> Result<SurfaceStyle, String> {
    let mut style = GhosttyStyle {
        size: size_of::<GhosttyStyle>(),
        fg_color: GhosttyStyleColor {
            tag: STYLE_COLOR_NONE,
            value: GhosttyStyleColorValue { _padding: 0 },
        },
        bg_color: GhosttyStyleColor {
            tag: STYLE_COLOR_NONE,
            value: GhosttyStyleColorValue { _padding: 0 },
        },
        underline_color: GhosttyStyleColor {
            tag: STYLE_COLOR_NONE,
            value: GhosttyStyleColorValue { _padding: 0 },
        },
        bold: false,
        italic: false,
        faint: false,
        blink: false,
        inverse: false,
        invisible: false,
        strikethrough: false,
        overline: false,
        underline: 0,
    };
    check(
        unsafe {
            ghostty_render_state_row_cells_get(
                cells,
                CELLS_DATA_STYLE,
                &mut style as *mut GhosttyStyle as *mut c_void,
            )
        },
        "read retained cell style",
    )?;
    let mut selected = false;
    check(
        unsafe {
            ghostty_render_state_row_cells_get(
                cells,
                CELLS_DATA_SELECTED,
                &mut selected as *mut bool as *mut c_void,
            )
        },
        "read retained cell selection",
    )?;
    Ok(SurfaceStyle {
        foreground: retained_style_color(&style.fg_color),
        background: retained_style_color(&style.bg_color),
        underline_color: retained_style_color(&style.underline_color),
        bold: style.bold,
        faint: style.faint,
        italic: style.italic,
        blink: style.blink,
        inverse: style.inverse,
        conceal: style.invisible,
        strikethrough: style.strikethrough,
        overline: style.overline,
        underline: style.underline.clamp(0, 5) as u8,
        selected,
    })
}

fn rgb_array(color: GhosttyColorRgb) -> [u8; 3] {
    [color.r, color.g, color.b]
}

fn retained_style_color(color: &GhosttyStyleColor) -> SurfaceColor {
    unsafe {
        match color.tag {
            STYLE_COLOR_PALETTE => SurfaceColor::Palette(color.value.palette),
            STYLE_COLOR_RGB => {
                let value = color.value.rgb;
                SurfaceColor::Rgb([value.r, value.g, value.b])
            }
            _ => SurfaceColor::Default,
        }
    }
}

fn cell_style(
    cells: GhosttyRenderStateRowCellsRaw,
    _colors: &GhosttyRenderStateColors,
) -> Result<ActiveStyle, String> {
    let mut style = GhosttyStyle {
        size: size_of::<GhosttyStyle>(),
        fg_color: GhosttyStyleColor {
            tag: STYLE_COLOR_NONE,
            value: GhosttyStyleColorValue { _padding: 0 },
        },
        bg_color: GhosttyStyleColor {
            tag: STYLE_COLOR_NONE,
            value: GhosttyStyleColorValue { _padding: 0 },
        },
        underline_color: GhosttyStyleColor {
            tag: STYLE_COLOR_NONE,
            value: GhosttyStyleColorValue { _padding: 0 },
        },
        bold: false,
        italic: false,
        faint: false,
        blink: false,
        inverse: false,
        invisible: false,
        strikethrough: false,
        overline: false,
        underline: 0,
    };
    check(
        unsafe {
            ghostty_render_state_row_cells_get(
                cells,
                CELLS_DATA_STYLE,
                &mut style as *mut GhosttyStyle as *mut c_void,
            )
        },
        "read cell style",
    )?;
    let fg = style_color(&style.fg_color);
    let bg = style_color(&style.bg_color);
    let mut selected = false;
    check(
        unsafe {
            ghostty_render_state_row_cells_get(
                cells,
                CELLS_DATA_SELECTED,
                &mut selected as *mut bool as *mut c_void,
            )
        },
        "read cell selection",
    )?;
    if selected {
        return Ok(ActiveStyle {
            fg: Some(CellColor::Rgb(GhosttyColorRgb { r: 0, g: 0, b: 0 })),
            bg: Some(CellColor::Rgb(GhosttyColorRgb {
                r: 255,
                g: 255,
                b: 255,
            })),
            bold: false,
            faint: false,
            italic: false,
            inverse: false,
            underline: false,
        });
    }
    Ok(ActiveStyle {
        fg,
        bg,
        bold: style.bold,
        faint: style.faint,
        italic: style.italic,
        inverse: style.inverse,
        underline: style.underline != 0,
    })
}

fn style_color(color: &GhosttyStyleColor) -> Option<CellColor> {
    unsafe {
        match color.tag {
            STYLE_COLOR_PALETTE => Some(CellColor::Palette(color.value.palette)),
            STYLE_COLOR_RGB => Some(CellColor::Rgb(color.value.rgb)),
            _ => None,
        }
    }
}

fn cell_text(cells: GhosttyRenderStateRowCellsRaw) -> Result<String, String> {
    let mut buffer = GhosttyBuffer {
        ptr: ptr::null_mut(),
        cap: 0,
        len: 0,
    };
    let result = unsafe {
        ghostty_render_state_row_cells_get(
            cells,
            CELLS_DATA_GRAPHEMES_UTF8,
            &mut buffer as *mut GhosttyBuffer as *mut c_void,
        )
    };
    if result == GHOSTTY_SUCCESS && buffer.len == 0 {
        let mut cell = 0u64;
        check(
            unsafe {
                ghostty_render_state_row_cells_get(
                    cells,
                    CELLS_DATA_RAW,
                    &mut cell as *mut u64 as *mut c_void,
                )
            },
            "read empty cell",
        )?;
        let mut wide = 0i32;
        check(
            unsafe { ghostty_cell_get(cell, CELL_DATA_WIDE, &mut wide as *mut i32 as *mut c_void) },
            "read empty cell width",
        )?;
        return Ok(if wide == CELL_WIDE_SPACER_TAIL {
            String::new()
        } else {
            " ".to_owned()
        });
    }
    if result != GHOSTTY_SUCCESS && result != GHOSTTY_OUT_OF_SPACE {
        return Err(format!("measure cell text failed with {result}"));
    }
    let mut bytes = vec![0u8; buffer.len.max(1)];
    buffer.ptr = bytes.as_mut_ptr();
    buffer.cap = bytes.len();
    check(
        unsafe {
            ghostty_render_state_row_cells_get(
                cells,
                CELLS_DATA_GRAPHEMES_UTF8,
                &mut buffer as *mut GhosttyBuffer as *mut c_void,
            )
        },
        "read cell text",
    )?;
    bytes.truncate(buffer.len);
    String::from_utf8(bytes).map_err(|error| format!("cell text is not UTF-8: {error}"))
}

fn write_style(out: &mut String, style: ActiveStyle) {
    out.push_str("\u{1b}[0m");
    if style.bold {
        out.push_str("\u{1b}[1m");
    }
    if style.faint {
        out.push_str("\u{1b}[2m");
    }
    if style.italic {
        out.push_str("\u{1b}[3m");
    }
    if style.underline {
        out.push_str("\u{1b}[4m");
    }
    if style.inverse {
        out.push_str("\u{1b}[7m");
    }
    if let Some(fg) = style.fg {
        write_color(out, 38, fg);
    } else {
        out.push_str("\u{1b}[39m");
    }
    if let Some(bg) = style.bg {
        write_color(out, 48, bg);
    } else {
        out.push_str("\u{1b}[49m");
    }
}

fn write_color(out: &mut String, base: u8, color: CellColor) {
    match color {
        CellColor::Palette(index) => out.push_str(&format!("\u{1b}[{base};5;{index}m")),
        CellColor::Rgb(rgb) => {
            out.push_str(&format!("\u{1b}[{base};2;{};{};{}m", rgb.r, rgb.g, rgb.b))
        }
    }
}

fn trace(step: &str) {
    if std::env::var_os("A1_PROBE_TRACE").is_some() {
        eprintln!("ghostty: {step}");
    }
}

fn check(result: GhosttyResult, operation: &str) -> Result<(), String> {
    if result == GHOSTTY_SUCCESS {
        Ok(())
    } else {
        Err(format!("{operation} failed with {result}"))
    }
}

#[cfg(test)]
mod retained_tests {
    use super::*;

    fn feed_boundaries(
        terminal: &mut GhosttyTerminal,
        bytes: &[u8],
        found: &mut Vec<SynchronizedOutputBoundary>,
    ) {
        let mut offset = 0usize;
        while offset < bytes.len() {
            let (consumed, boundary) = terminal
                .write_until_sync_boundary(&bytes[offset..])
                .expect("native boundary write");
            offset += consumed;
            if let Some(boundary) = boundary {
                found.push(boundary);
            }
        }
    }

    #[test]
    fn native_control_boundaries_survive_every_split_and_keep_end_then_begin() {
        let bytes = b"body\x1b[?2026hclear\x1b[?2026l\x1b[?2026hpartial";
        for split in 0..=bytes.len() {
            let mut terminal = GhosttyTerminal::new(8, 2).expect("terminal");
            let mut found = Vec::new();
            for part in [&bytes[..split], &bytes[split..]] {
                feed_boundaries(&mut terminal, part, &mut found);
            }
            assert_eq!(
                found,
                [
                    SynchronizedOutputBoundary::Begin,
                    SynchronizedOutputBoundary::End,
                    SynchronizedOutputBoundary::Begin,
                ],
                "split {split}",
            );
        }
    }

    #[test]
    fn native_control_parser_ignores_control_like_string_payloads() {
        let mut terminal = GhosttyTerminal::new(8, 2).expect("terminal");
        let mut found = Vec::new();
        feed_boundaries(
            &mut terminal,
            b"\x1b]0;\x1b[?2026hnot-a-mode\x07",
            &mut found,
        );
        feed_boundaries(
            &mut terminal,
            b"\x1bPpayload\x07\x1b[?2026hstill-dcs\x1b\\",
            &mut found,
        );
        assert!(found.is_empty());
    }

    #[test]
    fn retained_capture_preserves_styles_links_widths_and_reuses_clean_rows() {
        let mut terminal = GhosttyTerminal::new(8, 2).expect("terminal");
        terminal.write(
            b"\x1b[1;1H\x1b[1;3;4:3;9;38;2;1;2;3;48;5;4m\x1b]8;id=link-1;https://example.test\x1b\\A\x1b]8;;\x1b\\\xe7\x95\x8c\x1b[0m",
        );
        let mut builder = RetainedSurfaceBuilder::default();
        let first = terminal
            .capture_retained_surface(&mut builder, 1, SurfaceCommitKind::Complete)
            .expect("first capture");
        let structured = first.structured().expect("wire surface");
        let head = &structured.row_data[0].cells[0];
        let style = &structured.styles[usize::from(head.style)];
        assert_eq!(style.foreground, SurfaceColor::Rgb([1, 2, 3]));
        assert_eq!(style.background, SurfaceColor::Palette(4));
        assert!(style.bold && style.italic && style.strikethrough);
        assert_eq!(style.underline, 3);
        let link = &structured.links[usize::from(head.link.expect("link"))];
        assert_eq!(link.id.as_deref(), Some("link-1"));
        assert_eq!(link.uri, "https://example.test");
        assert_eq!(structured.row_data[0].cells[1].width, 2);
        assert_eq!(structured.row_data[0].cells[2].width, 0);

        let unchanged = first.row_data[1].clone();
        terminal.write(b"\x1b[1;1HX");
        let second = terminal
            .capture_retained_surface(&mut builder, 1, SurfaceCommitKind::Complete)
            .expect("second capture");
        assert!(Arc::ptr_eq(&unchanged, &second.row_data[1]));
        assert!(!Arc::ptr_eq(&first.row_data[0], &second.row_data[0]));
    }
}
