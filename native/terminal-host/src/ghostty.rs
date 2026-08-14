#![allow(non_camel_case_types)]

use std::ffi::{c_char, c_void};
use std::mem::size_of;
use std::ptr;

const GHOSTTY_SUCCESS: i32 = 0;
const GHOSTTY_OUT_OF_SPACE: i32 = -3;
const GHOSTTY_NO_VALUE: i32 = -4;

const RENDER_DATA_DIRTY: i32 = 3;
const RENDER_DATA_ROW_ITERATOR: i32 = 4;
const RENDER_DATA_CURSOR_VISIBLE: i32 = 11;
const RENDER_DATA_CURSOR_HAS_POSITION: i32 = 14;
const RENDER_DATA_CURSOR_X: i32 = 15;
const RENDER_DATA_CURSOR_Y: i32 = 16;
const RENDER_OPTION_DIRTY: i32 = 0;
const TERMINAL_DATA_SCROLLBAR: i32 = 9;
const TERMINAL_DATA_SCROLLBACK_ROWS: i32 = 15;
const TERMINAL_DATA_VIEWPORT_ACTIVE: i32 = 32;
const ROW_DATA_DIRTY: i32 = 1;
const ROW_DATA_CELLS: i32 = 3;
const ROW_OPTION_DIRTY: i32 = 0;
const CELLS_DATA_STYLE: i32 = 2;
const CELLS_DATA_SELECTED: i32 = 7;
const CELLS_DATA_GRAPHEMES_UTF8: i32 = 9;
const TERMINAL_OPT_SELECTION: i32 = 21;

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
struct GhosttySelectionGestureGeometry {
    columns: u32,
    cell_width: u32,
    padding_left: u32,
    screen_height: u32,
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
    fn ghostty_terminal_scroll_viewport(
        terminal: GhosttyTerminalRaw,
        behavior: GhosttyTerminalScrollViewport,
    );
    fn ghostty_terminal_get(
        terminal: GhosttyTerminalRaw,
        data: i32,
        out: *mut c_void,
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
    fn ghostty_key_encoder_new(
        allocator: *const c_void,
        out: *mut GhosttyKeyEncoderRaw,
    ) -> GhosttyResult;
    fn ghostty_key_encoder_free(encoder: GhosttyKeyEncoderRaw);
    fn ghostty_key_encoder_setopt_from_terminal(
        encoder: GhosttyKeyEncoderRaw,
        terminal: GhosttyTerminalRaw,
    );
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
    italic: bool,
    inverse: bool,
    underline: bool,
}

pub struct GhosttyTerminal {
    raw: GhosttyTerminalRaw,
    render: GhosttyRenderStateRaw,
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
        Ok(Self { raw, render })
    }

    pub fn write(&mut self, bytes: &[u8]) {
        unsafe { ghostty_terminal_vt_write(self.raw, bytes.as_ptr(), bytes.len()) };
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
        let frame = self.compose_frame(row_iterator, cells, colors);
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
            if dirty {
                out.push_str(&format!("\u{1b}[{};1H\u{1b}[2K", row_index + 1));
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
        let mut cursor_visible = false;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_CURSOR_VISIBLE,
                    &mut cursor_visible as *mut bool as *mut c_void,
                )
            },
            "read cursor visibility",
        )?;
        let mut cursor_has_position = false;
        check(
            unsafe {
                ghostty_render_state_get(
                    self.render,
                    RENDER_DATA_CURSOR_HAS_POSITION,
                    &mut cursor_has_position as *mut bool as *mut c_void,
                )
            },
            "read cursor position presence",
        )?;
        if cursor_visible && cursor_has_position {
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
            out.push_str(&format!("\u{1b}[{};{}H\u{1b}[?25h", y + 1, x + 1));
        } else {
            out.push_str("\u{1b}[?25l");
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
        })
    }

    pub fn press(&mut self, terminal: &mut GhosttyTerminal, x: u16, y: u16) -> Result<(), String> {
        terminal.clear_selection()?;
        let event = self.event(0)?;
        let reference = terminal.grid_ref(x, y)?;
        self.set_reference(event, &reference)?;
        self.set_position(event, x, y)?;
        let result = unsafe {
            ghostty_selection_gesture_event(self.raw, terminal.raw, event, ptr::null_mut())
        };
        unsafe { ghostty_selection_gesture_event_free(event) };
        if result != GHOSTTY_SUCCESS && result != GHOSTTY_NO_VALUE {
            return Err(format!("apply selection press failed with {result}"));
        }
        Ok(())
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

impl KeyEncoder {
    pub fn new(terminal: &GhosttyTerminal) -> Result<Self, String> {
        let mut raw = ptr::null_mut();
        check(
            unsafe { ghostty_key_encoder_new(ptr::null(), &mut raw) },
            "create key encoder",
        )?;
        unsafe { ghostty_key_encoder_setopt_from_terminal(raw, terminal.raw) };
        Ok(Self { raw })
    }

    pub fn encode(
        &self,
        key: i32,
        mods: u16,
        utf8: Option<&str>,
        repeat: bool,
    ) -> Result<Vec<u8>, String> {
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

pub fn key_for_character(character: char) -> i32 {
    match character {
        'a'..='z' | 'A'..='Z' => KEY_A + character.to_ascii_lowercase() as i32 - 'a' as i32,
        '0'..='9' => 6 + character as i32 - '0' as i32,
        ' ' => KEY_SPACE,
        _ => KEY_UNIDENTIFIED,
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
    Ok(ActiveStyle {
        fg,
        bg,
        bold: style.bold,
        italic: style.italic,
        inverse: style.inverse != selected,
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
        return Ok(" ".to_owned());
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
    if std::env::var_os("ADDONE_PROBE_TRACE").is_some() {
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
