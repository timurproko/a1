use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, TryRecvError};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;

use crossterm::event::{self, Event, KeyCode, KeyEvent, KeyModifiers, MouseButton, MouseEventKind};
use portable_pty::{Child, CommandBuilder, MasterPty, NativePtySystem, PtySize, PtySystem};

use crate::ghostty::{
    GhosttyTerminal, KeyEncoder, MouseAction, MouseButton as GhosttyMouseButton, MouseEncoder,
    MouseInput, SelectionGesture,
};
use crate::{encode_key, modifier_bits, write_clipboard};

pub const TOPOLOGY_REVISION: u64 = 1;
pub const WINDOW_ID: &str = "window-1";
pub const TAB_ID: &str = "tab-1";
const PANE_IDS: [&str; 4] = ["pane-1", "pane-2", "pane-3", "pane-4"];
const SESSION_IDS: [&str; 4] = ["session-1", "session-2", "session-3", "session-4"];
const MIN_COLUMNS: u16 = 7;
const MIN_ROWS: u16 = 7;
static NEXT_NATIVE_RESOURCE_ID: AtomicU64 = AtomicU64::new(1);

fn next_native_resource_id() -> u64 {
    NEXT_NATIVE_RESOURCE_ID.fetch_add(1, Ordering::Relaxed)
}

#[derive(Default)]
struct HotPathCounters {
    pty_output_chunks: u64,
    pty_output_bytes: u64,
    terminal_model_writes: u64,
    terminal_model_bytes: u64,
    input_writes: u64,
    input_bytes: u64,
    key_events: u64,
    text_events: u64,
    paste_events: u64,
    mouse_events: u64,
    mouse_reports: u64,
    selection_events: u64,
    clipboard_transfers: u64,
    render_passes: u64,
    rendered_bytes: u64,
}

struct HotPathInstrumentation {
    stream_identity: u64,
    input_identity: u64,
    terminal_model_identity: u64,
    render_damage_identity: u64,
    key_encoder_identity: u64,
    mouse_encoder_identity: u64,
    selection_identity: u64,
    counters: HotPathCounters,
}

impl HotPathInstrumentation {
    fn new() -> Self {
        Self {
            stream_identity: next_native_resource_id(),
            input_identity: next_native_resource_id(),
            terminal_model_identity: next_native_resource_id(),
            render_damage_identity: next_native_resource_id(),
            key_encoder_identity: next_native_resource_id(),
            mouse_encoder_identity: next_native_resource_id(),
            selection_identity: next_native_resource_id(),
            counters: HotPathCounters::default(),
        }
    }
}

#[derive(Clone, Copy)]
enum InputKind {
    Routed,
    Key { text: bool },
    Paste,
    Mouse,
}

#[derive(Clone, Debug)]
pub struct SessionLaunch {
    pub program: String,
    pub arguments: Vec<String>,
    pub cwd: Option<PathBuf>,
    pub environment: Vec<(String, String)>,
}

impl SessionLaunch {
    pub fn repeated(program: String, arguments: Vec<String>) -> [Self; 4] {
        std::array::from_fn(|_| Self {
            program: program.clone(),
            arguments: arguments.clone(),
            cwd: None,
            environment: Vec::new(),
        })
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PaneRect {
    pub column: u16,
    pub row: u16,
    pub columns: u16,
    pub rows: u16,
}

impl PaneRect {
    fn contains(self, column: u16, row: u16) -> bool {
        column >= self.column
            && column < self.column + self.columns
            && row >= self.row
            && row < self.row + self.rows
    }

    fn local(self, column: u16, row: u16) -> (u16, u16) {
        (column - self.column, row - self.row)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FixedLayout {
    pub outer_columns: u16,
    pub outer_rows: u16,
    pub center_column: u16,
    pub center_row: u16,
    pub panes: [PaneRect; 4],
}

impl FixedLayout {
    pub fn new(columns: u16, rows: u16) -> Result<Self, String> {
        if columns < MIN_COLUMNS || rows < MIN_ROWS {
            return Err(format!(
                "2x2 terminal surface requires at least {MIN_COLUMNS} columns by {MIN_ROWS} rows (received {columns}x{rows})"
            ));
        }
        let available_columns = columns - 3;
        let available_rows = rows - 3;
        let left_columns = available_columns / 2;
        let right_columns = available_columns - left_columns;
        let top_rows = available_rows / 2;
        let bottom_rows = available_rows - top_rows;
        let center_column = left_columns + 1;
        let center_row = top_rows + 1;
        Ok(Self {
            outer_columns: columns,
            outer_rows: rows,
            center_column,
            center_row,
            panes: [
                PaneRect {
                    column: 1,
                    row: 1,
                    columns: left_columns,
                    rows: top_rows,
                },
                PaneRect {
                    column: center_column + 1,
                    row: 1,
                    columns: right_columns,
                    rows: top_rows,
                },
                PaneRect {
                    column: 1,
                    row: center_row + 1,
                    columns: left_columns,
                    rows: bottom_rows,
                },
                PaneRect {
                    column: center_column + 1,
                    row: center_row + 1,
                    columns: right_columns,
                    rows: bottom_rows,
                },
            ],
        })
    }

    pub fn pane_at(self, column: u16, row: u16) -> Option<usize> {
        self.panes
            .iter()
            .position(|rect| rect.contains(column, row))
    }
}

struct Pane {
    // These pointer-backed helpers must drop before the terminal they reference.
    selection: SelectionGesture,
    mouse_encoder: MouseEncoder,
    key_encoder: KeyEncoder,
    terminal: GhosttyTerminal,
    hot_path: HotPathInstrumentation,
    pane_id: &'static str,
    session_id: &'static str,
    rect: PaneRect,
    focused: bool,
    selection_active: bool,
    selection_gesture_active: bool,
    mouse_button_pressed: bool,
    master: Option<Box<dyn MasterPty + Send>>,
    writer: Option<Arc<Mutex<Box<dyn Write + Send>>>>,
    output: Receiver<Vec<u8>>,
    output_thread: Option<JoinHandle<()>>,
    child: Option<Box<dyn Child + Send + Sync>>,
    process_id: Option<u32>,
    child_exited: bool,
}

impl Pane {
    fn spawn(
        index: usize,
        rect: PaneRect,
        focused: bool,
        launch: SessionLaunch,
    ) -> Result<Self, String> {
        let mut terminal = GhosttyTerminal::new(rect.columns, rect.rows)?;
        terminal.mark_dirty()?;
        let selection = SelectionGesture::new(&terminal)?;
        let mouse_encoder = MouseEncoder::new()?;
        let key_encoder = KeyEncoder::new(&terminal)?;
        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows: rect.rows,
                cols: rect.columns,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|error| format!("open {} PTY: {error}", PANE_IDS[index]))?;
        let mut command = CommandBuilder::new(&launch.program);
        command.args(&launch.arguments);
        if let Some(cwd) = launch.cwd {
            command.cwd(cwd);
        }
        for (name, value) in launch.environment {
            command.env(name, value);
        }
        command.env("A1_PANE_ID", PANE_IDS[index]);
        command.env("A1_TERMINAL_SESSION_ID", SESSION_IDS[index]);
        let child = pair
            .slave
            .spawn_command(command)
            .map_err(|error| format!("start {} terminal session: {error}", PANE_IDS[index]))?;
        let process_id = child.process_id();
        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|error| format!("clone {} terminal reader: {error}", PANE_IDS[index]))?;
        let writer = Arc::new(Mutex::new(pair.master.take_writer().map_err(|error| {
            format!("take {} terminal writer: {error}", PANE_IDS[index])
        })?));
        let (output_sender, output) = mpsc::channel::<Vec<u8>>();
        let output_thread = thread::spawn(move || {
            let mut buffer = [0u8; 16 * 1024];
            loop {
                match reader.read(&mut buffer) {
                    Ok(0) | Err(_) => break,
                    Ok(count) => {
                        if output_sender.send(buffer[..count].to_vec()).is_err() {
                            break;
                        }
                    }
                }
            }
        });

        Ok(Self {
            selection,
            mouse_encoder,
            key_encoder,
            terminal,
            hot_path: HotPathInstrumentation::new(),
            pane_id: PANE_IDS[index],
            session_id: SESSION_IDS[index],
            rect,
            focused,
            selection_active: false,
            selection_gesture_active: false,
            mouse_button_pressed: false,
            master: Some(pair.master),
            writer: Some(writer),
            output,
            output_thread: Some(output_thread),
            child: Some(child),
            process_id,
            child_exited: false,
        })
    }

    fn drain_output(&mut self) -> Vec<u8> {
        let mut observed = Vec::new();
        loop {
            match self.output.try_recv() {
                Ok(bytes) => {
                    self.hot_path.counters.pty_output_chunks += 1;
                    self.hot_path.counters.pty_output_bytes += bytes.len() as u64;
                    self.terminal.write(&bytes);
                    self.hot_path.counters.terminal_model_writes += 1;
                    self.hot_path.counters.terminal_model_bytes += bytes.len() as u64;
                    observed.extend_from_slice(&bytes);
                }
                Err(TryRecvError::Empty) => break,
                Err(TryRecvError::Disconnected) => break,
            }
        }
        observed
    }

    fn inspect_child(&mut self) -> Result<(), String> {
        if self.child_exited {
            return Ok(());
        }
        let Some(child) = self.child.as_mut() else {
            self.child_exited = true;
            return Ok(());
        };
        if child
            .try_wait()
            .map_err(|error| format!("inspect {} terminal session: {error}", self.pane_id))?
            .is_some()
        {
            self.child_exited = true;
        }
        Ok(())
    }

    fn is_finished(&self) -> bool {
        self.child_exited
    }

    fn write(&mut self, bytes: &[u8], kind: InputKind) -> Result<(), String> {
        let writer = self
            .writer
            .as_ref()
            .ok_or_else(|| format!("{} terminal writer is closed", self.pane_id))?;
        writer
            .lock()
            .map_err(|_| format!("{} terminal writer lock poisoned", self.pane_id))?
            .write_all(bytes)
            .map_err(|error| format!("write {} terminal input: {error}", self.pane_id))?;
        self.hot_path.counters.input_writes += 1;
        self.hot_path.counters.input_bytes += bytes.len() as u64;
        match kind {
            InputKind::Routed => {}
            InputKind::Key { text } => {
                self.hot_path.counters.key_events += 1;
                if text {
                    self.hot_path.counters.text_events += 1;
                }
            }
            InputKind::Paste => self.hot_path.counters.paste_events += 1,
            InputKind::Mouse => self.hot_path.counters.mouse_reports += 1,
        }
        Ok(())
    }

    fn resize(&mut self, rect: PaneRect) -> Result<(), String> {
        let size = PtySize {
            rows: rect.rows,
            cols: rect.columns,
            pixel_width: 0,
            pixel_height: 0,
        };
        self.master
            .as_ref()
            .ok_or_else(|| format!("{} PTY is closed", self.pane_id))?
            .resize(size)
            .map_err(|error| format!("resize {} PTY: {error}", self.pane_id))?;
        self.terminal.resize(rect.columns, rect.rows)?;
        self.terminal.mark_dirty()?;
        self.rect = rect;
        Ok(())
    }

    fn pty_size(&self) -> Result<PtySize, String> {
        self.master
            .as_ref()
            .ok_or_else(|| format!("{} PTY is closed", self.pane_id))?
            .get_size()
            .map_err(|error| format!("read {} PTY size: {error}", self.pane_id))
    }

    fn shutdown(&mut self) {
        if let Some(mut child) = self.child.take() {
            if !self.child_exited {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
        self.child_exited = true;
        self.writer.take();
        self.master.take();
        if let Some(output_thread) = self.output_thread.take() {
            let _ = output_thread.join();
        }
    }
}

impl Drop for Pane {
    fn drop(&mut self) {
        self.shutdown();
    }
}

pub struct FixedWorkspace {
    revision: u64,
    layout: FixedLayout,
    panes: Vec<Pane>,
    chrome_dirty: bool,
    surface_dirty: bool,
    presentation_writes: u64,
    presentation_bytes: u64,
}

impl FixedWorkspace {
    pub fn spawn(columns: u16, rows: u16, launches: [SessionLaunch; 4]) -> Result<Self, String> {
        let layout = FixedLayout::new(columns, rows)?;
        let mut panes = Vec::with_capacity(4);
        for (index, launch) in launches.into_iter().enumerate() {
            panes.push(Pane::spawn(index, layout.panes[index], index == 0, launch)?);
        }
        Ok(Self {
            revision: TOPOLOGY_REVISION,
            layout,
            panes,
            chrome_dirty: true,
            surface_dirty: true,
            presentation_writes: 0,
            presentation_bytes: 0,
        })
    }

    pub fn run_interactive(&mut self) -> Result<(), String> {
        let mut stdout = std::io::stdout().lock();
        loop {
            self.drain_all();
            self.inspect_all()?;
            if self.panes.iter().all(Pane::is_finished) {
                break;
            }
            if event::poll(Duration::from_millis(8))
                .map_err(|error| format!("poll terminal input: {error}"))?
            {
                let event =
                    event::read().map_err(|error| format!("read terminal input: {error}"))?;
                if self.handle_event(event, &mut stdout)? {
                    break;
                }
            }
            self.render(&mut stdout)?;
        }
        self.shutdown();
        Ok(())
    }

    pub fn drain_all(&mut self) -> [Vec<u8>; 4] {
        std::array::from_fn(|index| self.panes[index].drain_output())
    }

    pub fn inspect_all(&mut self) -> Result<(), String> {
        for pane in &mut self.panes {
            pane.inspect_child()?;
        }
        Ok(())
    }

    pub fn all_finished(&self) -> bool {
        self.panes.iter().all(Pane::is_finished)
    }

    pub fn process_ids(&self) -> [Option<u32>; 4] {
        std::array::from_fn(|index| self.panes[index].process_id)
    }

    pub fn resize(&mut self, columns: u16, rows: u16) -> Result<(), String> {
        let layout = FixedLayout::new(columns, rows)?;
        for (pane, rect) in self.panes.iter_mut().zip(layout.panes) {
            pane.resize(rect)?;
        }
        self.layout = layout;
        self.chrome_dirty = true;
        self.surface_dirty = true;
        Ok(())
    }

    pub fn pty_sizes(&self) -> Result<[PtySize; 4], String> {
        let mut sizes = [PtySize::default(); 4];
        for (index, pane) in self.panes.iter().enumerate() {
            sizes[index] = pane.pty_size()?;
        }
        Ok(sizes)
    }

    pub fn write_to_pane(&mut self, index: usize, bytes: &[u8]) -> Result<(), String> {
        self.panes
            .get_mut(index)
            .ok_or_else(|| format!("pane index {index} is invalid"))?
            .write(bytes, InputKind::Routed)
    }

    pub fn write_to_focused(&mut self, bytes: &[u8]) -> Result<(), String> {
        let focused = self.focused_index();
        self.panes[focused].write(bytes, InputKind::Routed)
    }

    pub fn compose_probe_frame(&mut self) -> Result<usize, String> {
        let mut frame = Vec::new();
        self.render(&mut frame)?;
        Ok(frame.len())
    }

    pub fn verify_hot_path_isolation(&self) -> Result<(), String> {
        let stream_identities: std::collections::HashSet<u64> = self
            .panes
            .iter()
            .map(|pane| pane.hot_path.stream_identity)
            .collect();
        let input_identities: std::collections::HashSet<u64> = self
            .panes
            .iter()
            .map(|pane| pane.hot_path.input_identity)
            .collect();
        let terminal_identities: std::collections::HashSet<u64> = self
            .panes
            .iter()
            .map(|pane| pane.hot_path.terminal_model_identity)
            .collect();
        let damage_identities: std::collections::HashSet<u64> = self
            .panes
            .iter()
            .map(|pane| pane.hot_path.render_damage_identity)
            .collect();
        if [
            stream_identities.len(),
            input_identities.len(),
            terminal_identities.len(),
            damage_identities.len(),
        ] != [4, 4, 4, 4]
        {
            return Err("hot-path instrumentation identities are not pane-isolated".to_owned());
        }
        for pane in &self.panes {
            let counters = &pane.hot_path.counters;
            if counters.pty_output_chunks == 0
                || counters.pty_output_bytes == 0
                || counters.terminal_model_writes != counters.pty_output_chunks
                || counters.terminal_model_bytes != counters.pty_output_bytes
                || counters.input_writes == 0
                || counters.input_bytes == 0
                || counters.render_passes == 0
                || counters.rendered_bytes == 0
            {
                return Err(format!(
                    "{} hot-path instrumentation is incomplete",
                    pane.pane_id
                ));
            }
        }
        if self.presentation_writes == 0 || self.presentation_bytes == 0 {
            return Err("buffered native presentation was not observed".to_owned());
        }
        Ok(())
    }

    pub fn hot_path_json(&self) -> String {
        let panes = self
            .panes
            .iter()
            .map(|pane| {
                let hot_path = &pane.hot_path;
                let counters = &hot_path.counters;
                format!(
                    "{{\"paneId\":\"{}\",\"sessionId\":\"{}\",\"streamIdentity\":{},\"inputIdentity\":{},\"terminalModelIdentity\":{},\"renderDamageIdentity\":{},\"keyEncoderIdentity\":{},\"mouseEncoderIdentity\":{},\"selectionIdentity\":{},\"ptyOutputChunks\":{},\"ptyOutputBytes\":{},\"terminalModelWrites\":{},\"terminalModelBytes\":{},\"inputWrites\":{},\"inputBytes\":{},\"keyEvents\":{},\"textEvents\":{},\"pasteEvents\":{},\"mouseEvents\":{},\"mouseReports\":{},\"selectionEvents\":{},\"clipboardTransfers\":{},\"renderPasses\":{},\"renderedBytes\":{}}}",
                    pane.pane_id,
                    pane.session_id,
                    hot_path.stream_identity,
                    hot_path.input_identity,
                    hot_path.terminal_model_identity,
                    hot_path.render_damage_identity,
                    hot_path.key_encoder_identity,
                    hot_path.mouse_encoder_identity,
                    hot_path.selection_identity,
                    counters.pty_output_chunks,
                    counters.pty_output_bytes,
                    counters.terminal_model_writes,
                    counters.terminal_model_bytes,
                    counters.input_writes,
                    counters.input_bytes,
                    counters.key_events,
                    counters.text_events,
                    counters.paste_events,
                    counters.mouse_events,
                    counters.mouse_reports,
                    counters.selection_events,
                    counters.clipboard_transfers,
                    counters.render_passes,
                    counters.rendered_bytes,
                )
            })
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "{{\"schema\":\"a1-terminal-host-hot-path-v1\",\"authority\":\"native-terminal-host\",\"nodeRelay\":false,\"rawPayloadExported\":false,\"paneCount\":4,\"presentationWrites\":{},\"presentationBytes\":{},\"panes\":[{}]}}",
            self.presentation_writes, self.presentation_bytes, panes
        )
    }

    pub fn shutdown(&mut self) {
        for pane in &mut self.panes {
            pane.shutdown();
        }
    }

    pub fn topology_json(&self) -> String {
        for (index, pane) in self.panes.iter().enumerate() {
            debug_assert_eq!(pane.pane_id, PANE_IDS[index]);
            debug_assert_eq!(pane.session_id, SESSION_IDS[index]);
        }
        topology_json(self.focused_index(), self.revision)
    }

    fn focused_index(&self) -> usize {
        self.panes
            .iter()
            .position(|pane| pane.focused)
            .expect("fixed workspace always has one focused pane")
    }

    pub fn focus(&mut self, index: usize) -> Result<(), String> {
        if index >= self.panes.len() {
            return Err(format!("pane index {index} is invalid"));
        }
        if self.panes[index].focused {
            return Ok(());
        }
        for (pane_index, pane) in self.panes.iter_mut().enumerate() {
            pane.focused = pane_index == index;
        }
        self.revision += 1;
        self.chrome_dirty = true;
        Ok(())
    }

    fn handle_event(&mut self, event: Event, stdout: &mut impl Write) -> Result<bool, String> {
        match event {
            Event::Key(key) => {
                if is_shutdown_shortcut(key) {
                    return Ok(true);
                }
                if let Some(index) = focus_shortcut(key) {
                    self.focus(index)?;
                    return Ok(false);
                }
                let focused = self.focused_index();
                let clear_selection = {
                    let pane = &self.panes[focused];
                    pane.selection_active
                        && matches!(key.code, KeyCode::Char('c') | KeyCode::Char('C'))
                        && key.modifiers.contains(KeyModifiers::CONTROL)
                };
                if clear_selection {
                    let pane = &mut self.panes[focused];
                    pane.selection.clear(&mut pane.terminal)?;
                    pane.selection_active = false;
                    pane.hot_path.counters.selection_events += 1;
                } else {
                    let encoded = {
                        let pane = &self.panes[focused];
                        encode_key(&pane.key_encoder, &pane.terminal, key)?
                    };
                    if let Some(encoded) = encoded {
                        let text = matches!(key.code, KeyCode::Char(_));
                        self.panes[focused].write(&encoded, InputKind::Key { text })?;
                    }
                }
            }
            Event::Paste(text) => {
                let focused = self.focused_index();
                self.panes[focused].write(text.as_bytes(), InputKind::Paste)?;
            }
            Event::Resize(columns, rows) => self.resize(columns, rows)?,
            Event::Mouse(mouse) => {
                let Some(index) = self.layout.pane_at(mouse.column, mouse.row) else {
                    return Ok(false);
                };
                let rect = self.layout.panes[index];
                let (column, row) = rect.local(mouse.column, mouse.row);
                if self.panes[index].terminal.mouse_tracking()? {
                    if matches!(mouse.kind, MouseEventKind::Down(_)) {
                        self.focus(index)?;
                    }
                    let pane = &mut self.panes[index];
                    pane.hot_path.counters.mouse_events += 1;
                    match mouse.kind {
                        MouseEventKind::Down(_) => pane.mouse_button_pressed = true,
                        MouseEventKind::Up(_) => pane.mouse_button_pressed = false,
                        _ => {}
                    }
                    let input = match mouse.kind {
                        MouseEventKind::Down(button) => {
                            Some((MouseAction::Press, ghostty_mouse_button(button)))
                        }
                        MouseEventKind::Up(button) => {
                            Some((MouseAction::Release, ghostty_mouse_button(button)))
                        }
                        MouseEventKind::Drag(button) => {
                            Some((MouseAction::Motion, ghostty_mouse_button(button)))
                        }
                        MouseEventKind::Moved => Some((MouseAction::Motion, None)),
                        MouseEventKind::ScrollUp => {
                            Some((MouseAction::Press, Some(GhosttyMouseButton::Four)))
                        }
                        MouseEventKind::ScrollDown => {
                            Some((MouseAction::Press, Some(GhosttyMouseButton::Five)))
                        }
                        _ => None,
                    };
                    if let Some((action, button)) = input {
                        let encoded = pane.mouse_encoder.encode(
                            &pane.terminal,
                            MouseInput {
                                action,
                                button,
                                mods: modifier_bits(mouse.modifiers),
                                column,
                                row,
                                columns: rect.columns,
                                rows: rect.rows,
                                any_button_pressed: pane.mouse_button_pressed,
                            },
                        )?;
                        if !encoded.is_empty() {
                            pane.write(&encoded, InputKind::Mouse)?;
                        }
                    }
                    return Ok(false);
                }

                self.panes[index].hot_path.counters.mouse_events += 1;
                match mouse.kind {
                    MouseEventKind::ScrollUp => self.panes[index].terminal.scroll_delta(-3)?,
                    MouseEventKind::ScrollDown => self.panes[index].terminal.scroll_delta(3)?,
                    MouseEventKind::Down(MouseButton::Left) => {
                        self.focus(index)?;
                        for pane in &mut self.panes {
                            pane.selection_gesture_active = false;
                        }
                        let pane = &mut self.panes[index];
                        pane.selection_gesture_active = true;
                        pane.selection_active =
                            pane.selection.press(&mut pane.terminal, column, row)?;
                        pane.hot_path.counters.selection_events += 1;
                    }
                    MouseEventKind::Drag(MouseButton::Left) => {
                        let pane = &mut self.panes[index];
                        if pane.selection_gesture_active {
                            pane.selection.drag(
                                &mut pane.terminal,
                                column,
                                row,
                                rect.columns,
                                rect.rows,
                            )?;
                            pane.selection_active = true;
                            pane.hot_path.counters.selection_events += 1;
                        }
                    }
                    MouseEventKind::Up(MouseButton::Left) => {
                        let pane = &mut self.panes[index];
                        if pane.selection_gesture_active {
                            if let Some(selected) =
                                pane.selection.release(&mut pane.terminal, column, row)?
                            {
                                pane.selection_active = true;
                                write_clipboard(stdout, &selected)?;
                                pane.hot_path.counters.clipboard_transfers += 1;
                            } else {
                                pane.selection_active = false;
                            }
                            pane.selection_gesture_active = false;
                            pane.hot_path.counters.selection_events += 1;
                        }
                    }
                    _ => {}
                }
            }
            Event::FocusGained | Event::FocusLost => {}
        }
        Ok(false)
    }

    fn render(&mut self, stdout: &mut impl Write) -> Result<(), String> {
        let focused = self.focused_index();
        let mut frame = String::new();
        if self.chrome_dirty {
            frame.push_str("\x1b[?2026h\x1b[?25l");
            frame.push_str(&chrome_frame(self.layout, focused, self.surface_dirty));
            if self.surface_dirty {
                for pane in &mut self.panes {
                    pane.terminal.mark_dirty()?;
                }
            }
            self.chrome_dirty = false;
            self.surface_dirty = false;
        }
        for index in (0..self.panes.len()).filter(|index| *index != focused) {
            let pane = &mut self.panes[index];
            let rendered = pane
                .terminal
                .frame_at(pane.rect.column, pane.rect.row, false)?;
            if !rendered.is_empty() {
                pane.hot_path.counters.render_passes += 1;
                pane.hot_path.counters.rendered_bytes += rendered.len() as u64;
                frame.push_str(&rendered);
            }
        }
        let pane = &mut self.panes[focused];
        let rendered = pane
            .terminal
            .frame_at(pane.rect.column, pane.rect.row, false)?;
        if !rendered.is_empty() {
            pane.hot_path.counters.render_passes += 1;
            pane.hot_path.counters.rendered_bytes += rendered.len() as u64;
            frame.push_str(&rendered);
        }
        if !frame.is_empty() {
            frame.push_str(
                &pane
                    .terminal
                    .cursor_frame_at(pane.rect.column, pane.rect.row)?,
            );
            frame.push_str("\x1b[?2026l");
            stdout
                .write_all(frame.as_bytes())
                .map_err(|error| format!("write terminal workspace frame: {error}"))?;
            stdout
                .flush()
                .map_err(|error| format!("flush terminal workspace frame: {error}"))?;
            self.presentation_writes += 1;
            self.presentation_bytes += frame.len() as u64;
        }
        Ok(())
    }
}

impl Drop for FixedWorkspace {
    fn drop(&mut self) {
        self.shutdown();
    }
}

fn chrome_frame(layout: FixedLayout, focused_index: usize, clear_surface: bool) -> String {
    let mut out = if clear_surface {
        String::from("\x1b[2J\x1b[0m")
    } else {
        String::from("\x1b[0m")
    };
    for row in [0, layout.center_row, layout.outer_rows - 1] {
        out.push_str(&format!(
            "\x1b[{};1H{}",
            row + 1,
            "-".repeat(usize::from(layout.outer_columns))
        ));
    }
    for row in 0..layout.outer_rows {
        if row == 0 || row == layout.center_row || row == layout.outer_rows - 1 {
            continue;
        }
        for column in [0, layout.center_column, layout.outer_columns - 1] {
            out.push_str(&format!("\x1b[{};{}H|", row + 1, column + 1));
        }
    }
    for row in [0, layout.center_row, layout.outer_rows - 1] {
        for column in [0, layout.center_column, layout.outer_columns - 1] {
            out.push_str(&format!("\x1b[{};{}H+", row + 1, column + 1));
        }
    }
    for (index, rect) in layout.panes.iter().enumerate() {
        let marker = if index == focused_index { '*' } else { ' ' };
        let border_row = if index < 2 { 0 } else { layout.center_row };
        out.push_str(&format!(
            "\x1b[{};{}H[{}{}]",
            border_row + 1,
            rect.column + 1,
            index + 1,
            marker
        ));
    }
    out
}

fn ghostty_mouse_button(button: MouseButton) -> Option<GhosttyMouseButton> {
    match button {
        MouseButton::Left => Some(GhosttyMouseButton::Left),
        MouseButton::Right => Some(GhosttyMouseButton::Right),
        MouseButton::Middle => Some(GhosttyMouseButton::Middle),
    }
}

fn focus_shortcut(key: KeyEvent) -> Option<usize> {
    if !key.modifiers.contains(KeyModifiers::ALT) {
        return None;
    }
    match key.code {
        KeyCode::Char('1') => Some(0),
        KeyCode::Char('2') => Some(1),
        KeyCode::Char('3') => Some(2),
        KeyCode::Char('4') => Some(3),
        _ => None,
    }
}

fn is_shutdown_shortcut(key: KeyEvent) -> bool {
    matches!(key.code, KeyCode::Char('q') | KeyCode::Char('Q'))
        && key.modifiers.contains(KeyModifiers::CONTROL)
        && key.modifiers.contains(KeyModifiers::SHIFT)
}

pub fn topology_json(focused_index: usize, revision: u64) -> String {
    format!(
        "{{\"schema\":\"a1-terminal-host-topology-v1\",\"hostInstanceId\":\"proof-host-1\",\"revision\":{revision},\"windows\":[{{\"id\":\"{WINDOW_ID}\",\"activeTabId\":\"{TAB_ID}\",\"tabs\":[{{\"id\":\"{TAB_ID}\",\"rootNodeId\":\"root\",\"focusedPaneId\":\"{}\",\"panes\":[{{\"id\":\"pane-1\",\"sessionId\":\"session-1\"}},{{\"id\":\"pane-2\",\"sessionId\":\"session-2\"}},{{\"id\":\"pane-3\",\"sessionId\":\"session-3\"}},{{\"id\":\"pane-4\",\"sessionId\":\"session-4\"}}],\"nodes\":[{{\"id\":\"root\",\"kind\":\"split\",\"axis\":\"horizontal\",\"ratio\":0.5,\"first\":\"top\",\"second\":\"bottom\"}},{{\"id\":\"top\",\"kind\":\"split\",\"axis\":\"vertical\",\"ratio\":0.5,\"first\":\"leaf-top-left\",\"second\":\"leaf-top-right\"}},{{\"id\":\"bottom\",\"kind\":\"split\",\"axis\":\"vertical\",\"ratio\":0.5,\"first\":\"leaf-bottom-left\",\"second\":\"leaf-bottom-right\"}},{{\"id\":\"leaf-top-left\",\"kind\":\"leaf\",\"paneId\":\"pane-1\"}},{{\"id\":\"leaf-top-right\",\"kind\":\"leaf\",\"paneId\":\"pane-2\"}},{{\"id\":\"leaf-bottom-left\",\"kind\":\"leaf\",\"paneId\":\"pane-3\"}},{{\"id\":\"leaf-bottom-right\",\"kind\":\"leaf\",\"paneId\":\"pane-4\"}}]}}]}}],\"sessions\":[{{\"id\":\"session-1\"}},{{\"id\":\"session-2\"}},{{\"id\":\"session-3\"}},{{\"id\":\"session-4\"}}]}}",
        PANE_IDS[focused_index]
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_layout_covers_four_independent_viewports() {
        let layout = FixedLayout::new(80, 24).unwrap();
        assert_eq!(layout.center_column, 39);
        assert_eq!(layout.center_row, 11);
        assert_eq!(
            layout.panes[0],
            PaneRect {
                column: 1,
                row: 1,
                columns: 38,
                rows: 10
            }
        );
        assert_eq!(
            layout.panes[3],
            PaneRect {
                column: 40,
                row: 12,
                columns: 39,
                rows: 11
            }
        );
        assert_eq!(layout.pane_at(2, 2), Some(0));
        assert_eq!(layout.pane_at(50, 2), Some(1));
        assert_eq!(layout.pane_at(2, 20), Some(2));
        assert_eq!(layout.pane_at(50, 20), Some(3));
        assert_eq!(layout.pane_at(layout.center_column, 2), None);
    }

    #[test]
    fn focus_chrome_does_not_clear_retained_pane_content() {
        let layout = FixedLayout::new(80, 24).unwrap();
        assert!(chrome_frame(layout, 0, true).contains("\x1b[2J"));
        let focused = chrome_frame(layout, 3, false);
        assert!(!focused.contains("\x1b[2J"));
        assert!(focused.contains("[4*]"));
    }

    #[test]
    fn fixed_layout_rejects_surfaces_without_four_nonempty_models() {
        assert!(FixedLayout::new(6, 24).is_err());
        assert!(FixedLayout::new(80, 6).is_err());
    }

    #[test]
    fn topology_has_stable_revisioned_product_mappings() {
        let topology = topology_json(0, TOPOLOGY_REVISION);
        assert!(topology.contains("\"revision\":1"));
        for index in 1..=4 {
            assert!(topology.contains(&format!("\"id\":\"pane-{index}\"")));
            assert!(topology.contains(&format!("\"sessionId\":\"session-{index}\"")));
        }
        assert!(topology.contains("\"rootNodeId\":\"root\""));
        assert!(topology.contains("\"focusedPaneId\":\"pane-1\""));
    }
}
