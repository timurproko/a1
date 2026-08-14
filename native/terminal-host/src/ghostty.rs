#![allow(non_camel_case_types)]

use std::ffi::{c_char, c_void};
use std::mem::size_of;
use std::ptr;

const GHOSTTY_SUCCESS: i32 = 0;
const GHOSTTY_OUT_OF_SPACE: i32 = -3;
const GHOSTTY_INVALID_VALUE: i32 = -2;

const RENDER_DATA_DIRTY: i32 = 3;
const RENDER_DATA_ROW_ITERATOR: i32 = 4;
const RENDER_DATA_CURSOR_VISIBLE: i32 = 11;
const RENDER_DATA_CURSOR_HAS_POSITION: i32 = 14;
const RENDER_DATA_CURSOR_X: i32 = 15;
const RENDER_DATA_CURSOR_Y: i32 = 16;
const RENDER_OPTION_DIRTY: i32 = 0;
const ROW_DATA_DIRTY: i32 = 1;
const ROW_DATA_CELLS: i32 = 3;
const ROW_OPTION_DIRTY: i32 = 0;
const CELLS_DATA_STYLE: i32 = 2;
const CELLS_DATA_BG_COLOR: i32 = 5;
const CELLS_DATA_FG_COLOR: i32 = 6;
const CELLS_DATA_GRAPHEMES_UTF8: i32 = 9;

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

#[allow(non_camel_case_types)]
type GhosttyResult = i32;
type GhosttyTerminalRaw = *mut c_void;
type GhosttyRenderStateRaw = *mut c_void;
type GhosttyRenderStateRowIteratorRaw = *mut c_void;
type GhosttyRenderStateRowCellsRaw = *mut c_void;
type GhosttyKeyEncoderRaw = *mut c_void;
type GhosttyKeyEventRaw = *mut c_void;

#[repr(C)]
struct GhosttyTerminalOptions {
    cols: u16,
    rows: u16,
    max_scrollback: usize,
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
}

#[derive(Clone, Copy, PartialEq, Eq)]
struct ActiveStyle {
    fg: GhosttyColorRgb,
    bg: GhosttyColorRgb,
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
    colors: &GhosttyRenderStateColors,
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
    let mut fg = colors.foreground;
    let mut bg = colors.background;
    let fg_result = unsafe {
        ghostty_render_state_row_cells_get(
            cells,
            CELLS_DATA_FG_COLOR,
            &mut fg as *mut GhosttyColorRgb as *mut c_void,
        )
    };
    if fg_result != GHOSTTY_SUCCESS && fg_result != GHOSTTY_INVALID_VALUE {
        return Err(format!("read cell foreground failed with {fg_result}"));
    }
    let bg_result = unsafe {
        ghostty_render_state_row_cells_get(
            cells,
            CELLS_DATA_BG_COLOR,
            &mut bg as *mut GhosttyColorRgb as *mut c_void,
        )
    };
    if bg_result != GHOSTTY_SUCCESS && bg_result != GHOSTTY_INVALID_VALUE {
        return Err(format!("read cell background failed with {bg_result}"));
    }
    Ok(ActiveStyle {
        fg,
        bg,
        bold: style.bold,
        italic: style.italic,
        inverse: style.inverse,
        underline: style.underline != 0,
    })
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
    out.push_str(&format!(
        "\u{1b}[38;2;{};{};{}m\u{1b}[48;2;{};{};{}m",
        style.fg.r, style.fg.g, style.fg.b, style.bg.r, style.bg.g, style.bg.b
    ));
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
