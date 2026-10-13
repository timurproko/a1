use std::collections::VecDeque;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicBool, Ordering},
    mpsc,
};
use std::thread;
use std::time::Duration;

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64;
use portable_pty::{CommandBuilder, NativePtySystem, PtySize, PtySystem};

use crate::endpoint;
use crate::ghostty::GhosttyTerminal;
use crate::protocol::{self, MAX_INPUT_BYTES, Welcome};
use crate::roles::child_containment::ChildContainment;
use crate::roles::wire::{
    self, HolderExit, HolderLaunchConfig, HolderRespawn, Input, PasteStart, Resize, RoleHello,
    Surface, SurfaceSubscription,
};

pub const HOLDER_INPUT_CAPACITY: usize = 1024 * 1024;
const BRACKETED_PASTE_START: &[u8] = b"\x1b[200~";
const BRACKETED_PASTE_END: &[u8] = b"\x1b[201~";
// Performance: output floods coalesce into at most one surface per interval without delaying
// an isolated echo, which renders as soon as its PTY bytes arrive.
const MIN_SURFACE_INTERVAL: Duration = Duration::from_millis(4);

fn bracketed_paste(content: &[u8]) -> Vec<u8> {
    let mut complete =
        Vec::with_capacity(BRACKETED_PASTE_START.len() + content.len() + BRACKETED_PASTE_END.len());
    complete.extend_from_slice(BRACKETED_PASTE_START);
    complete.extend_from_slice(content);
    complete.extend_from_slice(BRACKETED_PASTE_END);
    complete
}

enum HolderCommand {
    Input(Input),
    PasteStart { bytes: usize, epoch: u64 },
    Resize(Resize),
    SurfaceSubscription(bool),
    ControllerBoundary(protocol::ControllerBoundary),
    Respawn(HolderRespawn),
    Promote,
    TerminateChild,
    Shutdown,
    Disconnected,
}
enum PendingPaste {
    Collect { expected: usize, bytes: Vec<u8> },
    Discard { remaining: usize },
}

struct HolderServerPeer {
    control: mpsc::SyncSender<Vec<u8>>,
    surface: Arc<Mutex<Option<Vec<u8>>>>,
    surface_signaled: Arc<AtomicBool>,
}
impl HolderServerPeer {
    fn start(
        mut stream: endpoint::EndpointStream,
    ) -> Result<(Self, endpoint::EndpointStream), String> {
        let reader = stream
            .try_clone()
            .map_err(|error| format!("clone holder server stream: {error}"))?;
        let (control, control_rx) = mpsc::sync_channel::<Vec<u8>>(64);
        let surface = Arc::new(Mutex::new(None::<Vec<u8>>));
        let surface_signaled = Arc::new(AtomicBool::new(false));
        let writer_surface = surface.clone();
        let writer_signaled = surface_signaled.clone();
        thread::spawn(move || {
            loop {
                match control_rx.recv_timeout(Duration::from_millis(8)) {
                    Ok(frame) if !frame.is_empty() => {
                        if stream
                            .write_all(&frame)
                            .and_then(|()| stream.flush())
                            .is_err()
                        {
                            return;
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => return,
                    Ok(_) | Err(mpsc::RecvTimeoutError::Timeout) => {}
                }
                writer_signaled.store(false, Ordering::SeqCst);
                let frame = writer_surface.lock().ok().and_then(|mut slot| slot.take());
                if let Some(frame) = frame
                    && stream
                        .write_all(&frame)
                        .and_then(|()| stream.flush())
                        .is_err()
                {
                    return;
                }
            }
        });
        Ok((
            Self {
                control,
                surface,
                surface_signaled,
            },
            reader,
        ))
    }

    fn offer_control(&self, frame: Vec<u8>) -> Result<(), String> {
        self.control
            .try_send(frame)
            .map_err(|_| "holder server control lane overrun".to_owned())
    }

    fn offer_surface(&self, frame: Vec<u8>) {
        if let Ok(mut slot) = self.surface.lock() {
            *slot = Some(frame);
        }
        // Performance: wake the writer immediately; the flag bounds queued wakes to one so
        // surface churn cannot overrun the control lane.
        if !self.surface_signaled.swap(true, Ordering::SeqCst) {
            let _ = self.control.try_send(Vec::new());
        }
    }
}

fn apply_holder_effects(
    effects: Vec<crate::core::Effect>,
    write_tx: &mpsc::Sender<(Vec<u8>, usize)>,
    server: &HolderServerPeer,
) -> Result<(), String> {
    for effect in effects {
        match effect {
            crate::core::Effect::WritePty { bytes } => {
                let count = bytes.len();
                write_tx
                    .send((bytes, count))
                    .map_err(|_| "resident PTY writer stopped".to_owned())?;
            }
            crate::core::Effect::Send { message, .. } => {
                let (kind, notice) = if message.starts_with("input-uncertain:") {
                    ("input.uncertain", message)
                } else {
                    ("input.rejected", message)
                };
                let _ = server.offer_control(wire::frame(
                    kind,
                    None,
                    wire::ResultBody {
                        accepted: false,
                        message: Some(notice),
                    },
                )?);
            }
            crate::core::Effect::ArmTimer { .. } => {}
            unexpected => return Err(format!("unexpected holder-core effect: {unexpected:?}")),
        }
    }
    Ok(())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InputAdmissionError {
    Capacity,
    MessageTooLarge,
}

/// The holder reserves a complete paste before exposing any prefix to its writer thread.
#[derive(Debug)]
pub struct BoundedInputQueue {
    queued: usize,
    capacity: usize,
    admitted: u64,
    written: u64,
    messages: VecDeque<Vec<u8>>,
}
impl Default for BoundedInputQueue {
    fn default() -> Self {
        Self::new(HOLDER_INPUT_CAPACITY)
    }
}
impl BoundedInputQueue {
    pub fn new(capacity: usize) -> Self {
        Self {
            queued: 0,
            capacity,
            admitted: 0,
            written: 0,
            messages: VecDeque::new(),
        }
    }
    pub fn queued_bytes(&self) -> usize {
        self.queued
    }
    pub fn admitted_bytes(&self) -> u64 {
        self.admitted
    }
    pub fn written_bytes(&self) -> u64 {
        self.written
    }
    pub fn admit_paste(&mut self, bytes: &[u8]) -> Result<usize, InputAdmissionError> {
        if bytes.len() > self.capacity.saturating_sub(self.queued) {
            return Err(InputAdmissionError::Capacity);
        }
        let count = bytes.len().div_ceil(MAX_INPUT_BYTES);
        for chunk in bytes.chunks(MAX_INPUT_BYTES) {
            self.messages.push_back(chunk.to_vec());
            self.queued += chunk.len();
            self.admitted = self.admitted.saturating_add(chunk.len() as u64);
        }
        Ok(count)
    }
    pub fn admit_input(&mut self, bytes: &[u8]) -> Result<(), InputAdmissionError> {
        if bytes.len() > MAX_INPUT_BYTES {
            return Err(InputAdmissionError::MessageTooLarge);
        }
        if bytes.len() > self.capacity.saturating_sub(self.queued) {
            return Err(InputAdmissionError::Capacity);
        }
        self.queued += bytes.len();
        self.admitted = self.admitted.saturating_add(bytes.len() as u64);
        self.messages.push_back(bytes.to_vec());
        Ok(())
    }
    pub fn pop(&mut self) -> Option<Vec<u8>> {
        let bytes = self.take_for_write()?;
        self.complete(bytes.len());
        Some(bytes)
    }
    fn take_for_write(&mut self) -> Option<Vec<u8>> {
        self.messages.pop_front()
    }
    fn complete(&mut self, count: usize) {
        self.queued = self.queued.saturating_sub(count);
        self.written = self.written.saturating_add(count as u64);
    }
}

pub fn run_holder_child(_profile: &Path, ready: &Path, context: &[u8]) -> Result<(), String> {
    let config: HolderLaunchConfig = serde_json::from_slice(context)
        .map_err(|error| format!("decode holder context: {error}"))?;
    crate::fault_injection::install(&config.server.fault_environment);
    crate::fault_injection::validate_environment()?;
    let profile_token = crate::endpoint::endpoint_token(Path::new(&config.server.profile))
        .map_err(|error| error.to_string())?;
    let diagnostics_root = Path::new(&config.server.data_dir)
        .join("tabs")
        .join(&profile_token)
        .join("diagnostics");
    let _ = crate::roles::diagnostics::append_log(
        &diagnostics_root,
        &format!("holder-{}", config.tab_id),
        "started",
    );
    let watchdog = crate::shell::watchdog::start(
        "holder",
        &diagnostics_root,
        Duration::from_secs(15),
        vec![
            "holder-main".into(),
            "pty-reader".into(),
            "pty-writer".into(),
        ],
    );
    if crate::fault_injection::enabled("A1_TABS_FAULT_HANG_PTY") {
        loop {
            thread::sleep(Duration::from_secs(1));
        }
    }
    let (stream, mut highest_epoch) = connect_holder(&config, false, None, 0)?;
    let (mut server, command_stream) = HolderServerPeer::start(stream)?;

    let pty = NativePtySystem::default();
    let pair = pty
        .openpty(PtySize {
            rows: config.rows,
            cols: config.columns,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("open resident tab PTY: {error}"))?;
    let mut command = CommandBuilder::new(&config.node_executable);
    command.arg(Path::new(&config.release_root).join("bin").join("ui.js"));
    command.arg("--tab");
    if config.standby {
        command.arg("--tab-standby");
    }
    let tab_data_dir = Path::new(&config.server.data_dir)
        .join("tabs")
        .join(profile_token)
        .join(&config.tab_id);
    command.arg("--tab-data-dir");
    command.arg(&tab_data_dir);
    command.arg("--tab-incarnation");
    command.arg(config.incarnation.to_string());
    if let Some(directory) = config.session_dir.as_deref() {
        command.arg("--session-dir");
        command.arg(directory);
    }
    if let Some(session) = config
        .session_file
        .clone()
        .or_else(|| first_turn_session_id(&tab_data_dir))
    {
        command.arg("--session");
        command.arg(session);
    }
    command.cwd(&config.cwd);
    command.env_clear();
    for (name, value) in &config.environment {
        command.env(name, value);
    }
    command.env("A1_TAB_ID", &config.tab_id);
    command.env("A1_TAB_TOKEN", BASE64.encode(&config.bridge_token));
    command.env("A1_TAB_ENDPOINT", &config.endpoint);
    let mut child = pair
        .slave
        .spawn_command(command)
        .map_err(|error| format!("start resident A1 child: {error}"))?;
    let child_pid = child
        .process_id()
        .ok_or_else(|| "resident child pid is unavailable".to_owned())?;
    let child_identity = crate::identity::inspect_process(child_pid)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "resident child identity is unavailable".to_owned())?;
    let _containment = match ChildContainment::acquire(child_pid) {
        Ok(value) => value,
        Err(error) => {
            let _ = child.kill();
            return Err(error);
        }
    };
    drop(pair.slave);
    let mut pty_reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| format!("clone resident PTY reader: {error}"))?;
    let mut pty_writer = pair
        .master
        .take_writer()
        .map_err(|error| format!("take resident PTY writer: {error}"))?;
    let (write_tx, write_rx) = mpsc::channel::<(Vec<u8>, usize)>();
    let (write_result_tx, write_result_rx) = mpsc::channel::<Result<usize, String>>();
    // Performance: PTY, command, and write-completion threads wake the holder loop directly so
    // input and output never wait out an idle poll; capacity one keeps wakes coalesced.
    let (wake_tx, wake_rx) = mpsc::sync_channel::<()>(1);
    let writer_wake = wake_tx.clone();
    thread::spawn(move || {
        while let Ok((bytes, admitted)) = write_rx.recv() {
            if crate::fault_injection::enabled("A1_TABS_FAULT_BLOCK_PTY_WRITE") {
                loop {
                    thread::sleep(Duration::from_secs(1));
                }
            }
            let result = pty_writer
                .write_all(&bytes)
                .and_then(|()| pty_writer.flush())
                .map(|()| admitted)
                .map_err(|error| format!("write resident PTY input: {error}"));
            let failed = result.is_err();
            let delivered = write_result_tx.send(result).is_ok();
            let _ = writer_wake.try_send(());
            if !delivered || failed {
                break;
            }
        }
    });
    let (output_tx, output_rx) = mpsc::channel::<Vec<u8>>();
    let reader_wake = wake_tx.clone();
    thread::spawn(move || {
        let mut buffer = [0_u8; 16 * 1024];
        loop {
            match pty_reader.read(&mut buffer) {
                Ok(0) | Err(_) => break,
                Ok(count) => {
                    if output_tx.send(buffer[..count].to_vec()).is_err() {
                        break;
                    }
                    let _ = reader_wake.try_send(());
                }
            }
        }
        let _ = reader_wake.try_send(());
    });
    let (command_tx, command_rx) = mpsc::sync_channel::<HolderCommand>(4);
    spawn_command_reader(command_stream, command_tx.clone(), wake_tx.clone());
    std::fs::write(ready, format!("{}:holder\n", std::process::id()))
        .map_err(|error| format!("write holder readiness: {error}"))?;
    crate::fault_injection::freeze_role("holder");
    let mut terminal = GhosttyTerminal::new(config.columns, config.rows)?;
    let mut recovery_output = VecDeque::<u8>::new();
    terminal.mark_dirty()?;
    let mut revision = 0_u64;
    let mut input =
        crate::core::holder::State::new(config.tab_id.clone(), config.incarnation, highest_epoch);
    let ready_effects = crate::core::holder::step(
        &mut input,
        crate::core::holder::Event::PtyReady,
        Duration::ZERO,
    );
    apply_holder_effects(ready_effects, &write_tx, &server)?;
    let mut pending_paste: Option<PendingPaste> = None;
    let mut stop_deadline: Option<std::time::Instant> = None;
    let mut shutdown_holder = false;
    let mut subscribed = false;
    let mut heartbeat = std::time::Instant::now()
        .checked_sub(Duration::from_secs(5))
        .unwrap_or_else(std::time::Instant::now);
    let mut child_exited = false;
    let mut surface_pending = false;
    let mut last_surface = std::time::Instant::now()
        .checked_sub(MIN_SURFACE_INTERVAL)
        .unwrap_or_else(std::time::Instant::now);
    loop {
        watchdog.bump();
        let mut changed = false;
        while let Ok(result) = write_result_rx.try_recv() {
            let event = match result {
                Ok(completed) => crate::core::holder::Event::Written { bytes: completed },
                Err(_) => crate::core::holder::Event::WriterFailed,
            };
            let effects = crate::core::holder::step(&mut input, event, Duration::ZERO);
            apply_holder_effects(effects, &write_tx, &server)?;
        }
        while let Ok(command) = command_rx.try_recv() {
            if matches!(command, HolderCommand::Disconnected) {
                let (replacement, epoch) =
                    reconnect_holder(&config, &child_identity, highest_epoch, &diagnostics_root)?;
                if epoch < highest_epoch {
                    continue;
                }
                highest_epoch = epoch;
                let epoch_effects = crate::core::holder::step(
                    &mut input,
                    crate::core::holder::Event::ServerEpoch(epoch),
                    Duration::ZERO,
                );
                apply_holder_effects(epoch_effects, &write_tx, &server)?;
                let (replacement_peer, replacement_reader) = HolderServerPeer::start(replacement)?;
                server = replacement_peer;
                spawn_command_reader(replacement_reader, command_tx.clone(), wake_tx.clone());
                if subscribed {
                    revision = revision.saturating_add(1);
                    terminal.mark_dirty()?;
                    let frame = terminal.frame_at(0, 1, true)?.into_bytes();
                    server.offer_surface(wire::frame(
                        "surface",
                        None,
                        Surface {
                            tab_id: config.tab_id.clone(),
                            revision,
                            bytes: frame,
                            status: "idle".into(),
                            accent: None,
                        },
                    )?);
                }
            } else if let HolderCommand::Respawn(respawn) = command {
                if respawn.tab_id != config.tab_id || respawn.incarnation <= config.incarnation {
                    continue;
                }
                watchdog.stop();
                drop(_containment);
                let mut next = config.clone();
                next.incarnation = respawn.incarnation;
                next.token = respawn.holder_token;
                next.bridge_token = respawn.bridge_token;
                next.session_file = if respawn.start_fresh {
                    None
                } else {
                    respawn.session_file
                };
                next.recovery_journals = respawn.recovery_journals;
                let context = serde_json::to_vec(&next)
                    .map_err(|error| format!("encode holder respawn context: {error}"))?;
                return run_holder_child(_profile, ready, &context);
            } else if let HolderCommand::SurfaceSubscription(enabled) = command {
                subscribed = enabled;
                if subscribed {
                    revision = revision.saturating_add(1);
                    terminal.mark_dirty()?;
                    let frame = terminal.frame_at(0, 1, true)?.into_bytes();
                    server.offer_surface(wire::frame(
                        "surface",
                        None,
                        Surface {
                            tab_id: config.tab_id.clone(),
                            revision,
                            bytes: frame,
                            status: "idle".into(),
                            accent: None,
                        },
                    )?);
                }
            } else if matches!(&command, HolderCommand::Promote) {
                write_tx
                    .send((b"\x1b]a1;standby-promote\x07".to_vec(), 0))
                    .map_err(|_| "promote standby child writer stopped".to_owned())?;
            } else if matches!(
                &command,
                HolderCommand::TerminateChild | HolderCommand::Shutdown
            ) {
                shutdown_holder |= matches!(&command, HolderCommand::Shutdown);
                if shutdown_holder && child_exited {
                    watchdog.stop();
                    return Ok(());
                }
                if stop_deadline.is_none() {
                    let _ = write_tx.send((vec![0x04], 0));
                    stop_deadline = Some(std::time::Instant::now() + Duration::from_secs(5));
                }
            } else if let HolderCommand::Resize(resize) = command {
                if resize.epoch < highest_epoch {
                    continue;
                }
                highest_epoch = resize.epoch;
                pair.master
                    .resize(PtySize {
                        rows: resize.rows,
                        cols: resize.columns,
                        pixel_width: 0,
                        pixel_height: 0,
                    })
                    .map_err(|error| format!("resize resident PTY: {error}"))?;
                terminal.resize(resize.columns, resize.rows)?;
                terminal.mark_dirty()?;
            } else if let HolderCommand::PasteStart { bytes, epoch } = command {
                if epoch < highest_epoch {
                    continue;
                }
                highest_epoch = epoch;
                pending_paste = if bytes == 0 {
                    None
                } else if bytes
                    <= HOLDER_INPUT_CAPACITY
                        .saturating_sub(BRACKETED_PASTE_START.len() + BRACKETED_PASTE_END.len())
                {
                    Some(PendingPaste::Collect {
                        expected: bytes,
                        bytes: Vec::with_capacity(bytes),
                    })
                } else {
                    let _ = server.offer_control(wire::frame(
                        "input.rejected",
                        None,
                        wire::ResultBody {
                            accepted: false,
                            message: Some(
                                input_rejected_message(InputAdmissionError::Capacity).into(),
                            ),
                        },
                    )?);
                    Some(PendingPaste::Discard { remaining: bytes })
                };
            } else if let HolderCommand::ControllerBoundary(boundary) = command {
                write_tx
                    .send((
                        crate::controller::encode_boundary_marker(
                            boundary.generation,
                            boundary.nonce,
                        ),
                        0,
                    ))
                    .map_err(|_| "resident PTY writer stopped".to_owned())?;
            } else if let HolderCommand::Input(message) = command {
                if child_exited {
                    let action = match message.bytes.as_slice() {
                        b"r" | b"R" => Some("retry"),
                        b"f" | b"F" => Some("fresh"),
                        b"x" | b"X" => Some("close"),
                        _ => None,
                    };
                    if let Some(action) = action {
                        server.offer_control(wire::frame(
                            "holder.recovery-action",
                            None,
                            wire::ResultBody {
                                accepted: true,
                                message: Some(action.into()),
                            },
                        )?)?;
                    }
                    continue;
                }
                if message.epoch < highest_epoch {
                    continue;
                }
                highest_epoch = message.epoch;
                let bytes = if !message.paste {
                    message.bytes
                } else if let Some(pending) = pending_paste.as_mut() {
                    match pending {
                        PendingPaste::Collect { expected, bytes } => {
                            bytes.extend_from_slice(&message.bytes);
                            if bytes.len() == *expected {
                                let content = std::mem::take(bytes);
                                pending_paste = None;
                                bracketed_paste(&content)
                            } else if bytes.len() > *expected {
                                pending_paste = None;
                                let _ = server.offer_control(wire::frame(
                                    "input.rejected",
                                    None,
                                    wire::ResultBody {
                                        accepted: false,
                                        message: Some(
                                            input_rejected_message(
                                                InputAdmissionError::MessageTooLarge,
                                            )
                                            .into(),
                                        ),
                                    },
                                )?);
                                continue;
                            } else {
                                continue;
                            }
                        }
                        PendingPaste::Discard { remaining } => {
                            *remaining = remaining.saturating_sub(message.bytes.len());
                            if *remaining == 0 {
                                pending_paste = None;
                            }
                            continue;
                        }
                    }
                } else {
                    message.bytes
                };
                let effects = crate::core::holder::step(
                    &mut input,
                    crate::core::holder::Event::Input {
                        epoch: message.epoch,
                        bytes,
                        paste: message.paste,
                    },
                    Duration::ZERO,
                );
                apply_holder_effects(effects, &write_tx, &server)?;
            }
        }
        while let Ok(bytes) = output_rx.try_recv() {
            recovery_output.extend(&bytes);
            while recovery_output.len() > 2 * 1024 * 1024 {
                recovery_output.pop_front();
            }
            terminal.write(&bytes);
            let answers = terminal.take_responses();
            if !answers.is_empty() {
                write_tx
                    .send((answers, 0))
                    .map_err(|_| "resident PTY writer stopped".to_owned())?;
            }
            changed = true;
        }
        surface_pending |= changed && subscribed;
        if surface_pending && subscribed && last_surface.elapsed() >= MIN_SURFACE_INTERVAL {
            surface_pending = false;
            last_surface = std::time::Instant::now();
            revision = revision.saturating_add(1);
            terminal.mark_dirty()?;
            let frame = terminal.frame_at(0, 1, true)?.into_bytes();
            server.offer_surface(wire::frame(
                "surface",
                None,
                Surface {
                    tab_id: config.tab_id.clone(),
                    revision,
                    bytes: frame,
                    status: "idle".into(),
                    accent: None,
                },
            )?);
        }
        if stop_deadline.is_some_and(|deadline| std::time::Instant::now() >= deadline) {
            let _ = child.kill();
            stop_deadline = None;
        }
        if heartbeat.elapsed() >= Duration::from_secs(5) {
            let _ = server.offer_control(wire::frame(
                "holder.heartbeat",
                None,
                wire::HolderReady {
                    tab_id: config.tab_id.clone(),
                    pid: std::process::id(),
                    incarnation: config.incarnation,
                    child_pid,
                    child_start_identity: child_identity.start.clone(),
                },
            )?);
            heartbeat = std::time::Instant::now();
        }
        if !child_exited
            && let Some(status) = child
                .try_wait()
                .map_err(|error| format!("inspect resident child: {error}"))?
        {
            child_exited = true;
            surface_pending = false;
            terminal.mark_dirty()?;
            let frame = terminal.frame_at(0, 1, true)?.into_bytes();
            let recovery_root = tab_data_dir.join("recovery");
            let _ = crate::roles::recovery_artifacts::write_last_screen(
                &recovery_root,
                config.incarnation,
                &recovery_output.iter().copied().collect::<Vec<_>>(),
            );
            let child_record = crate::roles::diagnostics::newest_child_record(&diagnostics_root);
            let _ = crate::roles::diagnostics::write_crash(
                &diagnostics_root,
                "holder",
                config.incarnation,
                "child-exit",
                &["child-exited"],
                child_record.as_deref(),
            );
            if subscribed {
                revision = revision.saturating_add(1);
                server.offer_surface(wire::frame(
                    "surface",
                    None,
                    Surface {
                        tab_id: config.tab_id.clone(),
                        revision,
                        bytes: frame,
                        status: "crashed".into(),
                        accent: None,
                    },
                )?);
            }
            server.offer_control(wire::frame(
                "holder.snapshot",
                None,
                wire::HolderSnapshot {
                    tab_id: config.tab_id.clone(),
                    incarnation: config.incarnation,
                    status: "crashed".into(),
                },
            )?)?;
            server.offer_control(wire::frame(
                "holder.exit",
                None,
                HolderExit {
                    code: Some(status.exit_code() as i32),
                    signal: status.signal().map(str::to_owned),
                },
            )?)?;
            if shutdown_holder {
                watchdog.stop();
                return Ok(());
            }
        }
        let idle = if surface_pending && subscribed {
            MIN_SURFACE_INTERVAL.saturating_sub(last_surface.elapsed())
        } else {
            Duration::from_millis(8)
        };
        let _ = wake_rx.recv_timeout(idle);
    }
}

fn first_turn_session_id(tab_data_dir: &Path) -> Option<String> {
    let path = tab_data_dir.join("journal.jsonl");
    let bytes = std::fs::read(path).ok()?;
    if bytes.len() > 8 * 1024 * 1024 {
        return None;
    }
    for line in bytes.split(|byte| *byte == b'\n') {
        let value = serde_json::from_slice::<serde_json::Value>(line).ok()?;
        if value.get("type").and_then(serde_json::Value::as_str) == Some("submitted")
            && value
                .get("fileExisted")
                .and_then(serde_json::Value::as_bool)
                == Some(false)
            && value
                .get("sessionFile")
                .is_some_and(serde_json::Value::is_null)
        {
            return value
                .get("sessionId")
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned);
        }
    }
    None
}

fn input_rejected_message(error: InputAdmissionError) -> &'static str {
    match error {
        InputAdmissionError::Capacity => "input rejected; resident tab input queue is full",
        InputAdmissionError::MessageTooLarge => {
            "input rejected; message exceeds the resident tab limit"
        }
    }
}

fn request_server_replacement(config: &HolderLaunchConfig) -> Result<(), String> {
    let executable = std::env::current_exe()
        .map_err(|error| format!("resolve terminal host executable: {error}"))?;
    let status = std::process::Command::new(executable)
        .args([
            "server",
            "--detach",
            "--resident-parent-holder",
            "--profile",
            &config.server.profile,
            "--data-dir",
            &config.server.data_dir,
            "--runtime-dir",
            &config.server.runtime_dir,
            "--max-concurrent-starts",
            &config.server.max_concurrent_starts.to_string(),
            "--unresponsive-restart-seconds",
            &config.server.unresponsive_restart_seconds.to_string(),
        ])
        .env("A1_TABS_ENDPOINT", &config.server.endpoint)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map_err(|error| format!("request server replacement: {error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("server replacement stopped with {status}"))
    }
}

fn reconnect_holder(
    config: &HolderLaunchConfig,
    child: &crate::identity::ProcessIdentity,
    highest_epoch: u64,
    diagnostics_root: &Path,
) -> Result<(endpoint::EndpointStream, u64), String> {
    let role = format!("holder-{}", config.tab_id);
    let mut backoff = Duration::from_millis(100);
    for _ in 0..3 {
        if request_server_replacement(config).is_err() {
            let _ = crate::roles::diagnostics::append_log(
                diagnostics_root,
                &role,
                "server-replacement-request-failed",
            );
        }
        match connect_holder(config, false, Some(child), highest_epoch) {
            Ok(replacement) => {
                let _ = crate::roles::diagnostics::append_log(
                    diagnostics_root,
                    &role,
                    "server-replacement-connected",
                );
                return Ok(replacement);
            }
            Err(_) => {
                let _ = crate::roles::diagnostics::append_log(
                    diagnostics_root,
                    &role,
                    "server-replacement-connect-failed",
                );
            }
        }
        thread::sleep(backoff);
        backoff = backoff.saturating_mul(2).min(Duration::from_secs(2));
    }
    connect_holder(config, true, Some(child), highest_epoch)
}

fn connect_holder(
    config: &HolderLaunchConfig,
    retry_forever: bool,
    child: Option<&crate::identity::ProcessIdentity>,
    highest_epoch: u64,
) -> Result<(endpoint::EndpointStream, u64), String> {
    let mut stream = connect_retry(&config.endpoint, retry_forever)?;
    let identity = crate::identity::inspect_process(std::process::id())
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "inspect holder identity".to_owned())?;
    wire::send(
        &mut stream,
        "hello",
        Some(1),
        RoleHello {
            role: "holder".into(),
            generation: protocol::GENERATION,
            build: "a1-terminal-host".into(),
            features: vec!["retained-surface".into()],
            token: config.token.clone(),
            tab_id: Some(config.tab_id.clone()),
            pid: Some(std::process::id()),
            start_identity: Some(identity.start),
            incarnation: config.incarnation,
            child_pid: child.map(|identity| identity.pid),
            child_start_identity: child.map(|identity| identity.start.clone()),
            highest_epoch,
        },
    )?;
    let welcome = wire::read_payload(&mut stream)?
        .ok_or_else(|| "server closed holder handshake".to_owned())?;
    if wire::kind(&welcome)?.message_type != "welcome" {
        return Err("server refused holder handshake".to_owned());
    }
    let (_, welcome): (Option<u64>, Welcome) = wire::body(&welcome)?;
    Ok((stream, welcome.epoch))
}

fn spawn_command_reader(
    mut stream: endpoint::EndpointStream,
    command_tx: mpsc::SyncSender<HolderCommand>,
    wake: mpsc::SyncSender<()>,
) {
    thread::spawn(move || {
        while let Ok(Some(payload)) = wire::read_payload(&mut stream) {
            let Ok(kind) = wire::kind(&payload) else {
                break;
            };
            match kind.message_type.as_str() {
                "input" => {
                    if let Ok((_, input)) = wire::body::<Input>(&payload) {
                        let _ = command_tx.send(HolderCommand::Input(input));
                    }
                }
                "controller-boundary" => {
                    if let Ok((_, boundary)) = wire::body::<protocol::ControllerBoundary>(&payload)
                    {
                        let _ = command_tx.send(HolderCommand::ControllerBoundary(boundary));
                    }
                }
                "paste.start" => {
                    if let Ok((_, paste)) = wire::body::<PasteStart>(&payload) {
                        let _ = command_tx.send(HolderCommand::PasteStart {
                            bytes: paste.bytes,
                            epoch: paste.epoch,
                        });
                    }
                }
                "resize" => {
                    if let Ok((_, resize)) = wire::body::<Resize>(&payload) {
                        let _ = command_tx.send(HolderCommand::Resize(resize));
                    }
                }
                "shutdown" => {
                    let _ = command_tx.send(HolderCommand::Shutdown);
                }
                "holder.respawn" => {
                    if let Ok((_, respawn)) = wire::body::<HolderRespawn>(&payload) {
                        let _ = command_tx.send(HolderCommand::Respawn(respawn));
                    }
                }
                "holder.promote" => {
                    let _ = command_tx.send(HolderCommand::Promote);
                }
                "holder.terminate-child" => {
                    let _ = command_tx.send(HolderCommand::TerminateChild);
                }
                "surface.subscription" => {
                    if let Ok((_, subscription)) = wire::body::<SurfaceSubscription>(&payload) {
                        let _ = command_tx
                            .send(HolderCommand::SurfaceSubscription(subscription.enabled));
                    }
                }
                _ => {}
            }
            let _ = wake.try_send(());
        }
        let _ = command_tx.send(HolderCommand::Disconnected);
        let _ = wake.try_send(());
    });
}

fn connect_retry(address: &str, retry_forever: bool) -> Result<endpoint::EndpointStream, String> {
    let deadline = std::time::Instant::now() + Duration::from_secs(4);
    let mut backoff = Duration::from_millis(100);
    loop {
        match endpoint::connect(address) {
            Ok(stream) => return Ok(stream),
            Err(error) if retry_forever || std::time::Instant::now() < deadline => {
                let _ = error;
                let jitter = Duration::from_millis(rand::random::<u64>() % 50);
                thread::sleep(backoff.saturating_add(jitter));
                backoff = backoff.saturating_mul(2).min(Duration::from_secs(2));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn over_capacity_paste_delivers_no_prefix() {
        let mut queue = BoundedInputQueue::new(4);
        assert_eq!(
            queue.admit_paste(b"12345"),
            Err(InputAdmissionError::Capacity)
        );
        assert_eq!(queue.queued_bytes(), 0);
        assert_eq!(queue.pop(), None);
        assert!(input_rejected_message(InputAdmissionError::Capacity).contains("input rejected"));
    }
    #[test]
    fn first_turn_journal_restores_the_reserved_session_identity() {
        let root = tempfile::tempdir().unwrap();
        std::fs::write(
            root.path().join("journal.jsonl"),
            concat!(
                "{\"type\":\"submitted\",\"id\":\"one\",\"sessionId\":\"reserved\",",
                "\"sessionFile\":null,\"fileExisted\":false}\n"
            ),
        )
        .unwrap();
        assert_eq!(
            first_turn_session_id(root.path()).as_deref(),
            Some("reserved")
        );
        std::fs::write(
            root.path().join("journal.jsonl"),
            concat!(
                "{\"type\":\"submitted\",\"id\":\"one\",\"sessionId\":\"old\",",
                "\"sessionFile\":\"missing.jsonl\",\"fileExisted\":true}\n"
            ),
        )
        .unwrap();
        assert_eq!(first_turn_session_id(root.path()), None);
    }

    #[test]
    fn restores_bracketed_paste_protocol_after_outer_terminal_decoding() {
        assert_eq!(
            bracketed_paste("wide 开发 e\u{301}".as_bytes()),
            b"\x1b[200~wide \xe5\xbc\x80\xe5\x8f\x91 e\xcc\x81\x1b[201~"
        );
    }

    #[test]
    fn admitted_large_paste_is_split_and_ordered() {
        let mut queue = BoundedInputQueue::new(MAX_INPUT_BYTES * 2 + 1);
        let input = vec![7; MAX_INPUT_BYTES + 1];
        assert_eq!(queue.admit_paste(&input), Ok(2));
        let mut output = queue.pop().unwrap();
        output.extend(queue.pop().unwrap());
        assert_eq!(output, input);
    }
}
