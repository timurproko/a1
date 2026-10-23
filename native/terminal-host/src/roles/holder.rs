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
use crate::ghostty::{
    GhosttyTerminal, RetainedSurface, RetainedSurfaceBuilder, SynchronizedOutputBoundary,
};
use crate::protocol::{
    self, ClipboardLocation, EffectKind, MAX_INPUT_BYTES, SemanticInput, SurfaceCommitKind,
    SurfaceCursor, TerminalEffect, TerminalModes, Welcome,
};
use crate::roles::child_containment::ChildContainment;
use crate::roles::child_input::{self, SemanticEncoder};
use crate::roles::progress_observation::{self, ProgressMetadata};
use crate::roles::wire::{
    self, HolderExit, HolderLaunchConfig, HolderRespawn, Input, PasteStart, Resize, RoleHello,
    Surface, SurfaceSubscription,
};

pub const HOLDER_INPUT_CAPACITY: usize = 1024 * 1024;

/// Features this holder offers the server; `semantic-input` means it encodes `input.event`
/// frames itself and `terminal-effects` means it forwards typed child terminal effects.
pub const HOLDER_FEATURES: [&str; 4] = [
    "retained-surface",
    "semantic-input",
    "terminal-effects",
    protocol::FEATURE_STRUCTURED_SURFACE,
];

/// Surface revisions start above every earlier incarnation's so a viewer can order surfaces of
/// one tab across restarts without knowing which holder produced them.
pub fn initial_revision(incarnation: u64) -> u64 {
    incarnation.saturating_mul(1 << 32)
}

const SYNCHRONIZED_OUTPUT_RECOVERY_DELAY: Duration = Duration::from_millis(250);
// Platform: Windows ConPTY re-renders the child's cells on its own schedule and relays DEC 2026
// markers when it parses them, so a frame's cells can arrive after its end marker (and a render
// pass can land between its markers). Only a PTY that relays bytes verbatim delimits frames.
const MARKERS_DELIMIT_FRAMES: bool = !cfg!(windows);
/// Bound on waiting for the render pass that follows a relayed end marker.
const RENDER_PASS_WAIT: Duration = Duration::from_millis(40);
/// Quiet gap after re-rendered output: one render pass can span several pipe reads.
const RENDER_PASS_SETTLE: Duration = Duration::from_millis(2);
const HOLDER_IDLE_WAKE: Duration = Duration::from_millis(8);

#[derive(Debug)]
struct SynchronizationState {
    open: bool,
    deadline: Option<std::time::Instant>,
    recovered: bool,
    markers_delimit_frames: bool,
    /// Set by a relayed end marker: the frame is parsed but its render pass has not arrived.
    render_pass_due: Option<std::time::Instant>,
    /// Earliest publication of re-rendered output, so one pass is not split across commits.
    settled_at: Option<std::time::Instant>,
}

impl SynchronizationState {
    fn new(markers_delimit_frames: bool) -> Self {
        Self {
            open: false,
            deadline: None,
            recovered: false,
            markers_delimit_frames,
            render_pass_due: None,
            settled_at: None,
        }
    }

    fn begin(&mut self, now: std::time::Instant) {
        if self.open {
            return;
        }
        self.open = true;
        self.deadline = now.checked_add(SYNCHRONIZED_OUTPUT_RECOVERY_DELAY);
        self.recovered = false;
    }

    fn close(&mut self) {
        self.open = false;
        self.deadline = None;
        self.recovered = false;
    }

    /// Records a parser-reported boundary; returns whether the state preceding it is publishable.
    fn observe(&mut self, boundary: SynchronizedOutputBoundary, now: std::time::Instant) -> bool {
        match boundary {
            SynchronizedOutputBoundary::Begin => {
                // Protocol: bytes preceding a begin marker belong to the prior coherent state unless
                // that state is still waiting for its re-rendered cells.
                let publishable = self.render_pass_due.is_none_or(|due| now >= due);
                self.begin(now);
                publishable
            }
            SynchronizedOutputBoundary::End => {
                self.close();
                if self.markers_delimit_frames {
                    return true;
                }
                self.render_pass_due = now.checked_add(RENDER_PASS_WAIT);
                false
            }
            SynchronizedOutputBoundary::Reset => {
                self.close();
                true
            }
        }
    }

    /// Records output outside a marker: the render pass a relayed end marker was waiting for.
    fn note_output(&mut self, now: std::time::Instant) {
        if self.markers_delimit_frames {
            return;
        }
        self.render_pass_due = None;
        self.settled_at = now.checked_add(RENDER_PASS_SETTLE);
    }

    fn recover_if_due(&mut self, now: std::time::Instant) -> bool {
        if !self.open || self.recovered || !self.deadline.is_some_and(|deadline| now >= deadline) {
            return false;
        }
        self.recovered = true;
        true
    }

    fn may_publish(&self, now: std::time::Instant) -> bool {
        (!self.open || self.recovered)
            && self.render_pass_due.is_none_or(|due| now >= due)
            && self.settled_at.is_none_or(|at| now >= at)
    }

    /// How long the loop may sleep before a pending publication decision is due.
    fn wake_timeout(&self, now: std::time::Instant) -> Duration {
        [self.render_pass_due, self.settled_at, self.deadline]
            .into_iter()
            .flatten()
            .filter(|at| *at > now)
            .map(|at| at.saturating_duration_since(now))
            .fold(HOLDER_IDLE_WAKE, Duration::min)
    }

    fn commit_kind(&self) -> SurfaceCommitKind {
        if self.open {
            SurfaceCommitKind::Recovery
        } else {
            SurfaceCommitKind::Complete
        }
    }
}

/// One immutable coherent holder commit. Cursor and modes are captured beside the retained rows,
/// so a subscription or reconnect can never combine an old body with mutable parser metadata.
#[derive(Debug, Clone, PartialEq, Eq)]
struct CommittedSurface {
    retained: RetainedSurface,
    modes: TerminalModes,
    cursor: Option<SurfaceCursor>,
}

impl CommittedSurface {
    fn capture(
        terminal: &mut GhosttyTerminal,
        builder: &mut RetainedSurfaceBuilder,
        geometry_generation: u64,
        commit_kind: SurfaceCommitKind,
    ) -> Result<Self, String> {
        let retained =
            terminal.capture_retained_surface(builder, geometry_generation, commit_kind)?;
        let snapshot = terminal.mode_snapshot()?;
        let modes = TerminalModes {
            cursor_visible: snapshot.cursor_visible,
            cursor_style: snapshot.cursor_style.to_owned(),
            cursor_blink: snapshot.cursor_blink,
            mouse_tracking: snapshot.mouse_tracking,
            focus_events: snapshot.focus_events,
            bracketed_paste: snapshot.bracketed_paste,
            kitty_keyboard_flags: snapshot.kitty_keyboard_flags,
            alternate_screen: snapshot.alternate_screen,
            // Invariant: the final attach compositor is the only outer synchronization owner. Whether the
            // mutable parser is currently withholding a transaction is not replayable state.
            synchronized_output: false,
        };
        let cursor = terminal
            .cursor_cell()?
            .filter(|(column, row)| *column < retained.columns && *row < retained.rows)
            .map(|(column, row)| SurfaceCursor { column, row });
        Ok(Self {
            retained,
            modes,
            cursor,
        })
    }
}

/// A cheap immutable handoff to the holder's sole server writer. Full row cloning, ANSI fallback
/// construction, MessagePack encoding, and socket I/O all happen off the parser/scheduler loop.
#[derive(Clone)]
struct HolderSurfaceOffer {
    committed: CommittedSurface,
    subscription: SurfaceSubscription,
    tab_id: String,
    incarnation: u64,
    revision: u64,
    status: String,
}

impl HolderSurfaceOffer {
    fn frame(self) -> Result<Vec<u8>, String> {
        let structured = self.committed.retained.structured()?;
        let bytes = if self.subscription.legacy {
            super::presentation::complete_surface_bytes(&structured)?
        } else {
            Vec::new()
        };
        wire::frame(
            "surface",
            None,
            Surface {
                tab_id: self.tab_id,
                incarnation: self.incarnation,
                revision: self.revision,
                request_generation: 0,
                bytes,
                structured: self.subscription.structured.then_some(structured),
                status: self.status,
                accent: None,
                stale: false,
                modes: Some(self.committed.modes),
                cursor: self.committed.cursor,
            },
        )
    }
}

fn surface_message(
    committed: &CommittedSurface,
    subscription: &SurfaceSubscription,
    tab_id: &str,
    incarnation: u64,
    revision: u64,
    status: &str,
) -> Result<HolderSurfaceOffer, String> {
    Ok(HolderSurfaceOffer {
        committed: committed.clone(),
        subscription: subscription.clone(),
        tab_id: tab_id.to_owned(),
        incarnation,
        revision,
        status: status.into(),
    })
}

#[allow(clippy::too_many_arguments)]
fn commit_retained_surface(
    terminal: &mut GhosttyTerminal,
    builder: &mut RetainedSurfaceBuilder,
    committed: &mut CommittedSurface,
    server: &HolderServerPeer,
    subscription: Option<&SurfaceSubscription>,
    tab_id: &str,
    incarnation: u64,
    revision: &mut u64,
    geometry_generation: u64,
    commit_kind: SurfaceCommitKind,
    status: &str,
) -> Result<(), String> {
    if crate::roles::fixture_control::stopped("holder-commit", tab_id) {
        return Ok(());
    }
    let next = match CommittedSurface::capture(terminal, builder, geometry_generation, commit_kind)
    {
        Ok(next) => next,
        Err(error) => {
            // Invariant: keep the prior complete commit authoritative on an oversized or malformed capture.
            // The typed notice is bounded and never substitutes a truncated visual state.
            let _ = server.offer_control(wire::frame(
                "surface.rejected",
                None,
                wire::ResultBody {
                    accepted: false,
                    message: Some(error),
                },
            )?);
            return Ok(());
        }
    };
    if next == *committed {
        return Ok(());
    }
    *revision = revision.saturating_add(1);
    *committed = next;
    progress_observation::observe(
        "holder",
        "holder-commit",
        ProgressMetadata {
            tab_id: Some(tab_id),
            incarnation,
            revision: *revision,
            geometry_generation,
            count: 1,
            event_kind: Some(match commit_kind {
                SurfaceCommitKind::Complete => "complete",
                SurfaceCommitKind::Recovery => "recovery",
                SurfaceCommitKind::ProvisionalGeometry => "provisional-geometry",
            }),
            ..ProgressMetadata::default()
        },
    );
    if let Some(subscription) = subscription {
        server.offer_surface(surface_message(
            committed,
            subscription,
            tab_id,
            incarnation,
            *revision,
            status,
        )?);
    }
    Ok(())
}

fn collect_clipboard_effects(
    terminal: &mut GhosttyTerminal,
    effects: &mut Vec<EffectKind>,
    viewed: bool,
) {
    for write in terminal.take_clipboard_writes() {
        if !viewed {
            continue;
        }
        let effect = EffectKind::ClipboardWrite {
            location: match write.location {
                1 => ClipboardLocation::Selection,
                2 => ClipboardLocation::Primary,
                _ => ClipboardLocation::Standard,
            },
            mime: write.mime,
            data: write.data,
        };
        if protocol::validate_effect(&effect).is_ok() {
            effects.push(effect);
        }
    }
}

fn publish_pending_effects(
    effects: &mut Vec<EffectKind>,
    server: &HolderServerPeer,
    connected: bool,
    tab_id: &str,
    incarnation: u64,
    revision: u64,
    sequence: &mut u64,
) -> Result<(), String> {
    if !connected {
        // Rationale: a disconnected holder cannot know whether this tab is still viewed. Once-only outer
        // effects are therefore dropped, never replayed after reconstruction or reconnection.
        effects.clear();
        return Ok(());
    }
    for effect in effects.drain(..) {
        *sequence = sequence.saturating_add(1);
        server.offer_control(wire::frame(
            "terminal.effect",
            None,
            TerminalEffect {
                tab_id: tab_id.to_owned(),
                incarnation,
                sequence: *sequence,
                revision,
                effect,
            },
        )?)?;
    }
    Ok(())
}

enum HolderCommand {
    Input(Input),
    Semantic(SemanticInput),
    PasteStart { bytes: usize, epoch: u64 },
    Resize(Resize),
    SurfaceSubscription(SurfaceSubscription),
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
    surface: Arc<Mutex<Option<HolderSurfaceOffer>>>,
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
        let surface = Arc::new(Mutex::new(None::<HolderSurfaceOffer>));
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
                if let Some(offer) = frame {
                    let frame = match offer.frame() {
                        Ok(frame) => frame,
                        Err(error) => {
                            let Ok(notice) = wire::frame(
                                "surface.rejected",
                                None,
                                wire::ResultBody {
                                    accepted: false,
                                    message: Some(error),
                                },
                            ) else {
                                continue;
                            };
                            notice
                        }
                    };
                    if stream
                        .write_all(&frame)
                        .and_then(|()| stream.flush())
                        .is_err()
                    {
                        return;
                    }
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

    fn offer_surface(&self, frame: HolderSurfaceOffer) {
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
    write_tx: &mpsc::SyncSender<(Vec<u8>, usize)>,
    server: &HolderServerPeer,
) -> Result<(), String> {
    for effect in effects {
        match effect {
            crate::core::Effect::WritePty { bytes } => {
                let count = bytes.len();
                write_tx
                    .try_send((bytes, count))
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
    run_holder(_profile, ready, config, false)
}

fn run_holder(
    _profile: &Path,
    ready: &Path,
    config: HolderLaunchConfig,
    respawned: bool,
) -> Result<(), String> {
    progress_observation::configure_from_launch_environment(&config.environment);
    crate::roles::fixture_control::configure_from_launch_environment(&config.environment);
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
    let (stream, mut highest_epoch) = match connect_holder(&config, false, None, 0) {
        Ok(connected) => connected,
        // Invariant: a respawning holder still owns a registered tab, so a server that died
        // during the restart is replaced exactly as it is for a holder whose server disconnects.
        Err(_) if respawned => reconnect_holder(&config, None, 0, &diagnostics_root)?,
        Err(error) => return Err(error),
    };
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
    if config
        .environment
        .iter()
        .any(|(name, _)| name == "A1_RESIDENT_PROGRESS_OBSERVATION_DIR")
    {
        command.env("A1_RESIDENT_PROGRESS_TAB_ID", &config.tab_id);
        command.env(
            "A1_RESIDENT_PROGRESS_TAB_INCARNATION",
            config.incarnation.to_string(),
        );
    }
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
    let (write_tx, write_rx) = mpsc::sync_channel::<(Vec<u8>, usize)>(256);
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
    // Concurrency: bounded transport applies backpressure at the PTY reader instead of letting a hidden or
    // disconnected child grow process memory without limit.
    let (output_tx, output_rx) = mpsc::sync_channel::<Vec<u8>>(64);
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
    let (command_tx, command_rx) = mpsc::sync_channel::<HolderCommand>(256);
    spawn_command_reader(command_stream, command_tx.clone(), wake_tx.clone());
    std::fs::write(ready, format!("{}:holder\n", std::process::id()))
        .map_err(|error| format!("write holder readiness: {error}"))?;
    crate::fault_injection::freeze_role("holder");
    let mut terminal = GhosttyTerminal::new(config.columns, config.rows)?;
    let mut encoder = SemanticEncoder::new(&terminal, config.columns, config.rows)?;
    let mut recovery_output = VecDeque::<u8>::new();
    let mut surface_builder = RetainedSurfaceBuilder::default();
    let mut geometry_generation = 0u64;
    let mut committed = CommittedSurface::capture(
        &mut terminal,
        &mut surface_builder,
        geometry_generation,
        SurfaceCommitKind::Complete,
    )?;
    let mut synchronization = SynchronizationState::new(MARKERS_DELIMIT_FRAMES);
    let mut geometry_deadline: Option<std::time::Instant> = None;
    let mut pending_effects = Vec::<EffectKind>::new();
    let mut effect_sequence = 0u64;
    let mut pty_event_sequence = 0u64;
    let mut revision = initial_revision(config.incarnation);
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
    let mut subscription: Option<SurfaceSubscription> = None;
    let mut heartbeat = std::time::Instant::now()
        .checked_sub(Duration::from_secs(5))
        .unwrap_or_else(std::time::Instant::now);
    let mut child_exited = false;
    let mut child_exit_report: Option<HolderExit> = None;
    let (reconnect_tx, reconnect_rx) =
        mpsc::sync_channel::<Result<(endpoint::EndpointStream, u64), String>>(1);
    let mut reconnecting = false;
    let mut server_connected = true;
    // Invariant: unpublished parser changes carry across rounds until a commit publishes them.
    let mut changed = false;
    loop {
        watchdog.bump();
        if let Ok(reconnected) = reconnect_rx.try_recv() {
            let (replacement, epoch) = reconnected?;
            reconnecting = false;
            if epoch >= highest_epoch {
                highest_epoch = epoch;
                let epoch_effects = crate::core::holder::step(
                    &mut input,
                    crate::core::holder::Event::ServerEpoch(epoch),
                    Duration::ZERO,
                );
                apply_holder_effects(epoch_effects, &write_tx, &server)?;
                let (replacement_peer, replacement_reader) = HolderServerPeer::start(replacement)?;
                server = replacement_peer;
                server_connected = true;
                spawn_command_reader(replacement_reader, command_tx.clone(), wake_tx.clone());
                if let Some(subscription) = subscription.as_ref() {
                    server.offer_surface(surface_message(
                        &committed,
                        subscription,
                        &config.tab_id,
                        config.incarnation,
                        revision,
                        "idle",
                    )?);
                }
                // Invariant: reconnection runs beside the loop, so the child can exit while no server
                // is attached or just before the old server's death is observed. The replacement
                // was admitted with a live child identity and learns of the exit only from this
                // replay; a server that already handled it matches no record for this incarnation.
                if let Some(exit) = child_exit_report.as_ref() {
                    offer_child_exit(&server, &config.tab_id, config.incarnation, exit)?;
                }
            }
        }
        for _ in 0..8 {
            let Ok(result) = write_result_rx.try_recv() else {
                break;
            };
            let event = match result {
                Ok(completed) => crate::core::holder::Event::Written { bytes: completed },
                Err(_) => crate::core::holder::Event::WriterFailed,
            };
            let effects = crate::core::holder::step(&mut input, event, Duration::ZERO);
            apply_holder_effects(effects, &write_tx, &server)?;
        }
        // Concurrency: one hot producer cannot monopolize the holder loop indefinitely.
        let command_round_started = std::time::Instant::now();
        for _ in 0..8 {
            let Ok(command) = command_rx.try_recv() else {
                break;
            };
            if matches!(command, HolderCommand::Disconnected) {
                server_connected = false;
                subscription = None;
                pending_effects.clear();
                if !reconnecting {
                    reconnecting = true;
                    let reconnect_tx = reconnect_tx.clone();
                    let reconnect_wake = wake_tx.clone();
                    let reconnect_config = config.clone();
                    let reconnect_child = child_identity.clone();
                    let reconnect_diagnostics = diagnostics_root.clone();
                    let reconnect_epoch = highest_epoch;
                    thread::spawn(move || {
                        let result = reconnect_holder(
                            &reconnect_config,
                            Some(&reconnect_child),
                            reconnect_epoch,
                            &reconnect_diagnostics,
                        );
                        let _ = reconnect_tx.send(result);
                        let _ = reconnect_wake.try_send(());
                    });
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
                return run_holder(_profile, ready, next, true);
            } else if let HolderCommand::SurfaceSubscription(next) = command {
                subscription = next.enabled.then_some(next);
                if let Some(subscription) = subscription.as_ref() {
                    server.offer_surface(surface_message(
                        &committed,
                        subscription,
                        &config.tab_id,
                        config.incarnation,
                        revision,
                        "idle",
                    )?);
                }
            } else if matches!(&command, HolderCommand::Promote) {
                // Platform: Windows ConPTY may drop the in-band OSC marker, so the private tab
                // data directory carries the same promotion out of band; the child accepts either.
                let promotion = tab_data_dir.join("standby-promote");
                let _ = std::fs::create_dir_all(&tab_data_dir)
                    .and_then(|()| std::fs::write(&promotion, b"promote\n"));
                write_tx
                    .try_send((b"\x1b]a1;standby-promote\x07".to_vec(), 0))
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
                    let _ = write_tx.try_send((vec![0x04], 0));
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
                encoder.resize(resize.columns, resize.rows);
                if synchronization.open
                    && terminal
                        .mode_snapshot()
                        .is_ok_and(|modes| !modes.synchronized_output)
                {
                    synchronization.close();
                }
                geometry_generation = resize
                    .geometry_generation
                    .max(geometry_generation.saturating_add(1));
                // Rationale: give the child one short opportunity to repaint the new geometry. If it does
                // not, publish one explicitly provisional complete state rather than mixing the
                // old body with new strip coordinates.
                geometry_deadline = Some(
                    std::time::Instant::now()
                        .checked_add(Duration::from_millis(50))
                        .unwrap_or_else(std::time::Instant::now),
                );
            } else if let HolderCommand::PasteStart { bytes, epoch } = command {
                if epoch < highest_epoch {
                    continue;
                }
                highest_epoch = epoch;
                pending_paste = if bytes == 0 {
                    None
                } else if bytes
                    <= HOLDER_INPUT_CAPACITY.saturating_sub(child_input::PASTE_FRAMING_BYTES)
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
                    .try_send((
                        crate::controller::encode_boundary_marker(
                            boundary.generation,
                            boundary.nonce,
                        ),
                        0,
                    ))
                    .map_err(|_| "resident PTY writer stopped".to_owned())?;
            } else if let HolderCommand::Semantic(message) = command {
                if message.epoch < highest_epoch {
                    continue;
                }
                highest_epoch = message.epoch;
                if child_exited {
                    if let Some(action) = child_input::recovery_action(&message.event) {
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
                // Invariant: the holder encodes against the child's modes at admission time, so
                // the bytes written are the ones the child's current protocol expects.
                let bytes = match encoder.encode(&terminal, &message.event) {
                    Ok(bytes) => bytes,
                    Err(reason) => {
                        let _ = server.offer_control(wire::frame(
                            "input.rejected",
                            None,
                            wire::ResultBody {
                                accepted: false,
                                message: Some(reason),
                            },
                        )?);
                        continue;
                    }
                };
                if bytes.is_empty() {
                    continue;
                }
                let effects = crate::core::holder::step(
                    &mut input,
                    crate::core::holder::Event::Input {
                        epoch: message.epoch,
                        bytes,
                        paste: false,
                    },
                    Duration::ZERO,
                );
                apply_holder_effects(effects, &write_tx, &server)?;
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
                                child_input::encode_paste(&terminal, &content)
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
            if command_round_started.elapsed() >= Duration::from_millis(2) {
                break;
            }
        }
        let output_round_started = std::time::Instant::now();
        let mut output_bytes = 0usize;
        for _ in 0..32 {
            let Ok(bytes) = output_rx.try_recv() else {
                break;
            };
            output_bytes = output_bytes.saturating_add(bytes.len());
            pty_event_sequence = pty_event_sequence.saturating_add(1);
            progress_observation::observe(
                "holder",
                "pty-ingest",
                ProgressMetadata {
                    tab_id: Some(&config.tab_id),
                    incarnation: config.incarnation,
                    event_sequence: pty_event_sequence,
                    bytes: bytes.len(),
                    count: 1,
                    ..ProgressMetadata::default()
                },
            );
            recovery_output.extend(&bytes);
            while recovery_output.len() > 2 * 1024 * 1024 {
                recovery_output.pop_front();
            }
            let mut offset = 0usize;
            let now = std::time::Instant::now();
            while offset < bytes.len() {
                let (consumed, boundary) = terminal.write_until_sync_boundary(&bytes[offset..])?;
                offset += consumed;
                changed = true;
                let answers = terminal.take_responses();
                if !answers.is_empty() {
                    write_tx
                        .try_send((answers, 0))
                        .map_err(|_| "resident PTY writer stopped".to_owned())?;
                }
                collect_clipboard_effects(
                    &mut terminal,
                    &mut pending_effects,
                    server_connected && subscription.as_ref().is_some_and(|value| value.effects),
                );
                let Some(boundary) = boundary else {
                    synchronization.note_output(now);
                    continue;
                };
                // Protocol: a marker changes no visible cells, and duplicate commits are suppressed by
                // the retained commit contract, so publishing at a boundary is safe whenever the
                // synchronization state says the preceding bytes form a coherent frame.
                if synchronization.observe(boundary, now) {
                    commit_retained_surface(
                        &mut terminal,
                        &mut surface_builder,
                        &mut committed,
                        &server,
                        subscription.as_ref(),
                        &config.tab_id,
                        config.incarnation,
                        &mut revision,
                        geometry_generation,
                        if boundary == SynchronizedOutputBoundary::Reset {
                            SurfaceCommitKind::Recovery
                        } else {
                            SurfaceCommitKind::Complete
                        },
                        "idle",
                    )?;
                    publish_pending_effects(
                        &mut pending_effects,
                        &server,
                        server_connected,
                        &config.tab_id,
                        config.incarnation,
                        revision,
                        &mut effect_sequence,
                    )?;
                    changed = false;
                }
                geometry_deadline = None;
            }
            if output_bytes >= 256 * 1024
                || output_round_started.elapsed() >= Duration::from_millis(2)
            {
                break;
            }
        }
        // Concurrency: normal output commits after this bounded coalescing round. Synchronized output remains
        // private until a real close/reset boundary or one non-renewable recovery deadline, and relayed
        // output stays private until its render pass has arrived and settled or its wait expires.
        if changed && synchronization.may_publish(std::time::Instant::now()) {
            commit_retained_surface(
                &mut terminal,
                &mut surface_builder,
                &mut committed,
                &server,
                subscription.as_ref(),
                &config.tab_id,
                config.incarnation,
                &mut revision,
                geometry_generation,
                synchronization.commit_kind(),
                "idle",
            )?;
            publish_pending_effects(
                &mut pending_effects,
                &server,
                server_connected,
                &config.tab_id,
                config.incarnation,
                revision,
                &mut effect_sequence,
            )?;
            changed = false;
            geometry_deadline = None;
        }
        if synchronization.recover_if_due(std::time::Instant::now()) {
            commit_retained_surface(
                &mut terminal,
                &mut surface_builder,
                &mut committed,
                &server,
                subscription.as_ref(),
                &config.tab_id,
                config.incarnation,
                &mut revision,
                geometry_generation,
                SurfaceCommitKind::Recovery,
                "idle",
            )?;
            publish_pending_effects(
                &mut pending_effects,
                &server,
                server_connected,
                &config.tab_id,
                config.incarnation,
                revision,
                &mut effect_sequence,
            )?;
        }
        if !synchronization.open
            && geometry_deadline.is_some_and(|deadline| std::time::Instant::now() >= deadline)
        {
            commit_retained_surface(
                &mut terminal,
                &mut surface_builder,
                &mut committed,
                &server,
                subscription.as_ref(),
                &config.tab_id,
                config.incarnation,
                &mut revision,
                geometry_generation,
                SurfaceCommitKind::ProvisionalGeometry,
                "idle",
            )?;
            geometry_deadline = None;
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
            if synchronization.open {
                commit_retained_surface(
                    &mut terminal,
                    &mut surface_builder,
                    &mut committed,
                    &server,
                    subscription.as_ref(),
                    &config.tab_id,
                    config.incarnation,
                    &mut revision,
                    geometry_generation,
                    SurfaceCommitKind::Recovery,
                    "crashed",
                )?;
                publish_pending_effects(
                    &mut pending_effects,
                    &server,
                    server_connected,
                    &config.tab_id,
                    config.incarnation,
                    revision,
                    &mut effect_sequence,
                )?;
                synchronization.close();
            }
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
            if let Some(subscription) = subscription.as_ref() {
                server.offer_surface(surface_message(
                    &committed,
                    subscription,
                    &config.tab_id,
                    config.incarnation,
                    revision,
                    "crashed",
                )?);
            }
            let exit = HolderExit {
                code: Some(status.exit_code() as i32),
                signal: status.signal().map(str::to_owned),
            };
            // Invariant: a disconnected holder's peer may already be closed; the report waits for
            // the replacement connection instead of being dropped or failing the holder.
            if server_connected {
                offer_child_exit(&server, &config.tab_id, config.incarnation, &exit)?;
            }
            child_exit_report = Some(exit);
            if shutdown_holder {
                watchdog.stop();
                return Ok(());
            }
        }
        let _ = wake_rx.recv_timeout(synchronization.wake_timeout(std::time::Instant::now()));
    }
}

/// The crashed snapshot and exit status that tell a server this incarnation's child ended.
fn child_exit_frames(
    tab_id: &str,
    incarnation: u64,
    exit: &HolderExit,
) -> Result<[Vec<u8>; 2], String> {
    Ok([
        wire::frame(
            "holder.snapshot",
            None,
            wire::HolderSnapshot {
                tab_id: tab_id.to_owned(),
                incarnation,
                status: "crashed".into(),
            },
        )?,
        wire::frame("holder.exit", None, exit.clone())?,
    ])
}

fn offer_child_exit(
    server: &HolderServerPeer,
    tab_id: &str,
    incarnation: u64,
    exit: &HolderExit,
) -> Result<(), String> {
    for frame in child_exit_frames(tab_id, incarnation, exit)? {
        server.offer_control(frame)?;
    }
    Ok(())
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

/// Longest one replacement request may take before the holder abandons it and retries.
const SERVER_REPLACEMENT_DEADLINE: Duration = Duration::from_secs(15);

/// Waits for a replacement request with a deadline and returns its exit and the outcome it
/// printed. Its stdout is read on a thread and not to end-of-file, because a detached server
/// that inherited the pipe would hold it open for its whole life.
fn wait_for_replacement(
    mut child: std::process::Child,
    deadline: Duration,
) -> Result<(std::process::ExitStatus, String), String> {
    let printed = Arc::new(Mutex::new(Vec::<u8>::new()));
    if let Some(mut stdout) = child.stdout.take() {
        let printed = printed.clone();
        thread::spawn(move || {
            let mut buffer = [0_u8; 1024];
            while let Ok(count) = stdout.read(&mut buffer) {
                if count == 0 {
                    break;
                }
                if let Ok(mut printed) = printed.lock() {
                    printed.extend_from_slice(&buffer[..count]);
                    if printed.len() > 64 * 1024 {
                        break;
                    }
                }
            }
        });
    }
    let started = std::time::Instant::now();
    let status = loop {
        if let Some(status) = child
            .try_wait()
            .map_err(|error| format!("wait for server replacement: {error}"))?
        {
            break status;
        }
        if started.elapsed() >= deadline {
            let _ = child.kill();
            let _ = child.wait();
            return Err("server replacement request timed out".to_owned());
        }
        thread::sleep(Duration::from_millis(20));
    };
    // Concurrency: the outcome line is written before the request exits; allow the reader a
    // moment to collect it without waiting on a pipe a detached server may still hold.
    let collected = std::time::Instant::now();
    loop {
        let text = printed
            .lock()
            .map(|bytes| String::from_utf8_lossy(&bytes).into_owned())
            .unwrap_or_default();
        if text.contains("\"outcome\"") || collected.elapsed() >= Duration::from_millis(500) {
            return Ok((status, text));
        }
        thread::sleep(Duration::from_millis(10));
    }
}

/// Asks for a replacement server. Ok(false) means the registry no longer wants any tab to run.
fn request_server_replacement(config: &HolderLaunchConfig) -> Result<bool, String> {
    let child = crate::launch::command([
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
    .map_err(|error| error.to_string())?
    .env("A1_TABS_ENDPOINT", &config.server.endpoint)
    .stdin(std::process::Stdio::null())
    .stdout(std::process::Stdio::piped())
    .stderr(std::process::Stdio::null())
    .spawn()
    .map_err(|error| format!("request server replacement: {error}"))?;
    // Invariant: a replacement request that never finishes must not strand the holder; it is
    // abandoned at its deadline and the holder's reconnect loop asks again.
    let (status, printed) = wait_for_replacement(child, SERVER_REPLACEMENT_DEADLINE)?;
    if status.success() {
        Ok(!printed.contains("\"not-needed\""))
    } else {
        Err(format!("server replacement stopped with {status}"))
    }
}

fn reconnect_holder(
    config: &HolderLaunchConfig,
    child: Option<&crate::identity::ProcessIdentity>,
    highest_epoch: u64,
    diagnostics_root: &Path,
) -> Result<(endpoint::EndpointStream, u64), String> {
    let role = format!("holder-{}", config.tab_id);
    let mut backoff = Duration::from_millis(100);
    // Invariant: a holder keeps its tab's server alive. Every attempt asks for a replacement, so
    // a start that was blocked while another contender held the start gate is tried again; the
    // server's lease keeps a single owner, and a server that cannot admit this holder terminates
    // it by its recorded identity after the admission deadline.
    loop {
        match request_server_replacement(config) {
            Ok(true) => {}
            Ok(false) => {
                let _ = crate::roles::diagnostics::append_log(
                    diagnostics_root,
                    &role,
                    "server-replacement-not-needed",
                );
                // Invariant: no recorded tab should run any more, so this holder ends with its tab.
                return Err("the resident tab is no longer wanted".to_owned());
            }
            Err(_) => {
                let _ = crate::roles::diagnostics::append_log(
                    diagnostics_root,
                    &role,
                    "server-replacement-request-failed",
                );
            }
        }
        match connect_holder(config, false, child, highest_epoch) {
            Ok(replacement) => {
                let _ = crate::roles::diagnostics::append_log(
                    diagnostics_root,
                    &role,
                    "server-replacement-connected",
                );
                return Ok(replacement);
            }
            Err(error) => {
                let _ = crate::roles::diagnostics::append_log(
                    diagnostics_root,
                    &role,
                    match error.as_str() {
                        "server refused holder handshake" => "server-replacement-refused",
                        "server closed holder handshake" => "server-replacement-handshake-closed",
                        _ => "server-replacement-connect-failed",
                    },
                );
            }
        }
        thread::sleep(backoff);
        backoff = backoff.saturating_mul(2).min(Duration::from_secs(2));
    }
}

/// Long enough for a server to verify the holder and child identities it admits.
const HOLDER_HANDSHAKE: Duration = Duration::from_secs(10);

fn connect_holder(
    config: &HolderLaunchConfig,
    retry_forever: bool,
    child: Option<&crate::identity::ProcessIdentity>,
    highest_epoch: u64,
) -> Result<(endpoint::EndpointStream, u64), String> {
    let mut stream = connect_retry(&config.endpoint, retry_forever)?;
    // Platform: macOS refuses socket options once the peer has closed, so Unix bounds the
    // handshake before sending; a server that accepts but never answers cannot hold the holder.
    #[cfg(unix)]
    endpoint::set_handshake_deadline(&stream, HOLDER_HANDSHAKE)
        .map_err(|error| error.to_string())?;
    crate::fault_injection::crash_at("holder-before-ready");
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
            features: HOLDER_FEATURES
                .iter()
                .map(|feature| (*feature).into())
                .collect(),
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
    // Platform: on Windows the deadline waits for the answer, so it follows the hello.
    #[cfg(windows)]
    endpoint::set_handshake_deadline(&stream, HOLDER_HANDSHAKE)
        .map_err(|error| error.to_string())?;
    let welcome = wire::read_payload(&mut stream)?
        .ok_or_else(|| "server closed holder handshake".to_owned())?;
    if wire::kind(&welcome)?.message_type != "welcome" {
        return Err("server refused holder handshake".to_owned());
    }
    endpoint::clear_handshake_deadline(&stream).map_err(|error| error.to_string())?;
    let (_, welcome): (Option<u64>, Welcome) = wire::body(&welcome)?;
    crate::fault_injection::crash_at("holder-after-ready");
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
                "input.event" => {
                    if let Ok((_, input)) = wire::body::<SemanticInput>(&payload)
                        && protocol::validate_input_event(&input.event).is_ok()
                    {
                        let _ = command_tx.send(HolderCommand::Semantic(input));
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
                        let _ = command_tx.send(HolderCommand::SurfaceSubscription(subscription));
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
    fn shell(script: &str) -> std::process::Child {
        let mut command = if cfg!(windows) {
            let mut command = std::process::Command::new("cmd");
            command.args(["/C", script]);
            command
        } else {
            let mut command = std::process::Command::new("sh");
            command.args(["-c", script]);
            command
        };
        command
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .spawn()
            .expect("spawn shell")
    }

    #[test]
    fn child_exit_report_is_a_crashed_snapshot_followed_by_its_exit_status() {
        let exit = HolderExit {
            code: Some(137),
            signal: Some("SIGKILL".into()),
        };
        let [snapshot, status] = child_exit_frames("tab-a", 3, &exit).unwrap();
        assert_eq!(
            wire::kind(&snapshot[4..]).unwrap().message_type,
            "holder.snapshot"
        );
        let (_, snapshot): (_, wire::HolderSnapshot) = wire::body(&snapshot[4..]).unwrap();
        assert_eq!(snapshot.tab_id, "tab-a");
        assert_eq!(snapshot.incarnation, 3);
        assert_eq!(snapshot.status, "crashed");
        assert_eq!(
            wire::kind(&status[4..]).unwrap().message_type,
            "holder.exit"
        );
        let (_, replayed): (_, HolderExit) = wire::body(&status[4..]).unwrap();
        assert_eq!(replayed.code, Some(137));
        assert_eq!(replayed.signal.as_deref(), Some("SIGKILL"));
    }

    #[test]
    fn synchronization_recovery_deadline_is_not_renewed_and_releases_publication() {
        let started = std::time::Instant::now();
        let mut synchronization = SynchronizationState::new(true);
        synchronization.begin(started);
        let deadline = synchronization.deadline.expect("deadline");
        synchronization.begin(started + Duration::from_millis(200));
        assert_eq!(synchronization.deadline, Some(deadline));
        assert!(!synchronization.may_publish(started));
        assert!(!synchronization.recover_if_due(
            started + SYNCHRONIZED_OUTPUT_RECOVERY_DELAY - Duration::from_millis(1)
        ));
        assert!(synchronization.recover_if_due(started + SYNCHRONIZED_OUTPUT_RECOVERY_DELAY));
        assert!(synchronization.may_publish(started + SYNCHRONIZED_OUTPUT_RECOVERY_DELAY));
        assert_eq!(synchronization.commit_kind(), SurfaceCommitKind::Recovery);
        assert!(
            !synchronization.recover_if_due(
                started + SYNCHRONIZED_OUTPUT_RECOVERY_DELAY + Duration::from_secs(1)
            )
        );
        synchronization.close();
        assert_eq!(synchronization.commit_kind(), SurfaceCommitKind::Complete);
    }

    #[test]
    fn verbatim_markers_publish_at_every_boundary_without_settling() {
        let started = std::time::Instant::now();
        let mut synchronization = SynchronizationState::new(true);
        assert!(synchronization.observe(SynchronizedOutputBoundary::Begin, started));
        assert!(!synchronization.may_publish(started));
        assert!(synchronization.observe(SynchronizedOutputBoundary::End, started));
        assert!(synchronization.may_publish(started));
        synchronization.note_output(started);
        assert!(synchronization.may_publish(started));
        assert_eq!(synchronization.wake_timeout(started), HOLDER_IDLE_WAKE);
        assert!(synchronization.observe(SynchronizedOutputBoundary::Reset, started));
    }

    #[test]
    fn relayed_end_marker_waits_for_its_render_pass_and_settles_it() {
        let started = std::time::Instant::now();
        let mut synchronization = SynchronizationState::new(false);
        assert!(synchronization.observe(SynchronizedOutputBoundary::Begin, started));
        // Protocol: a render pass landing between the markers stays private while the transaction is open.
        synchronization.note_output(started + Duration::from_millis(1));
        assert!(!synchronization.may_publish(started + Duration::from_millis(5)));
        let ended = started + Duration::from_millis(6);
        assert!(!synchronization.observe(SynchronizedOutputBoundary::End, ended));
        assert!(!synchronization.may_publish(ended + RENDER_PASS_WAIT - Duration::from_millis(1)));
        assert_eq!(synchronization.wake_timeout(ended), HOLDER_IDLE_WAKE);
        assert_eq!(
            synchronization.wake_timeout(ended + RENDER_PASS_WAIT - Duration::from_millis(3)),
            Duration::from_millis(3)
        );
        let rendered = ended + Duration::from_millis(23);
        synchronization.note_output(rendered);
        assert!(!synchronization.may_publish(rendered));
        assert_eq!(synchronization.wake_timeout(rendered), RENDER_PASS_SETTLE);
        assert!(synchronization.may_publish(rendered + RENDER_PASS_SETTLE));
        assert_eq!(
            synchronization.wake_timeout(rendered + RENDER_PASS_SETTLE),
            HOLDER_IDLE_WAKE
        );
    }

    #[test]
    fn relayed_end_marker_without_a_render_pass_publishes_at_its_bound() {
        let started = std::time::Instant::now();
        let mut synchronization = SynchronizationState::new(false);
        synchronization.observe(SynchronizedOutputBoundary::Begin, started);
        assert!(!synchronization.observe(SynchronizedOutputBoundary::End, started));
        assert!(
            !synchronization.may_publish(started + RENDER_PASS_WAIT - Duration::from_millis(1))
        );
        assert!(synchronization.may_publish(started + RENDER_PASS_WAIT));
        assert_eq!(synchronization.commit_kind(), SurfaceCommitKind::Complete);
        // Invariant: the expired wait no longer schedules wakes or blocks the next begin marker.
        let later = started + RENDER_PASS_WAIT + Duration::from_millis(1);
        assert_eq!(synchronization.wake_timeout(later), HOLDER_IDLE_WAKE);
        assert!(synchronization.observe(SynchronizedOutputBoundary::Begin, later));
    }

    #[test]
    fn begin_marker_during_a_pending_render_pass_keeps_the_torn_state_private() {
        let started = std::time::Instant::now();
        let mut synchronization = SynchronizationState::new(false);
        synchronization.observe(SynchronizedOutputBoundary::Begin, started);
        synchronization.note_output(started);
        synchronization.observe(SynchronizedOutputBoundary::End, started);
        let next = started + Duration::from_millis(1);
        assert!(!synchronization.observe(SynchronizedOutputBoundary::Begin, next));
        assert!(!synchronization.may_publish(next));
        assert!(!synchronization.observe(SynchronizedOutputBoundary::End, next));
        synchronization.note_output(next + Duration::from_millis(1));
        assert!(synchronization.may_publish(next + Duration::from_millis(1) + RENDER_PASS_SETTLE));
    }

    #[test]
    fn synchronized_begin_does_not_manufacture_a_commit_and_end_captures_content() {
        let mut terminal = GhosttyTerminal::new(8, 2).expect("terminal");
        let mut builder = RetainedSurfaceBuilder::default();
        let initial =
            CommittedSurface::capture(&mut terminal, &mut builder, 0, SurfaceCommitKind::Complete)
                .expect("initial commit");
        let (_, boundary) = terminal
            .write_until_sync_boundary(b"\x1b[?2026h")
            .expect("begin transaction");
        assert_eq!(boundary, Some(SynchronizedOutputBoundary::Begin));
        let after_begin =
            CommittedSurface::capture(&mut terminal, &mut builder, 0, SurfaceCommitKind::Complete)
                .expect("begin snapshot");
        assert_eq!(after_begin, initial);

        terminal.write(b"X");
        let (_, boundary) = terminal
            .write_until_sync_boundary(b"\x1b[?2026l")
            .expect("end transaction");
        assert_eq!(boundary, Some(SynchronizedOutputBoundary::End));
        let completed =
            CommittedSurface::capture(&mut terminal, &mut builder, 0, SurfaceCommitKind::Complete)
                .expect("completed snapshot");
        assert_ne!(completed, initial);
        assert_eq!(
            completed.retained.structured().unwrap().row_data[0].cells[0].text,
            "X"
        );

        let (_, boundary) = terminal
            .write_until_sync_boundary(b"\x1b[?2026h")
            .expect("begin reset transaction");
        assert_eq!(boundary, Some(SynchronizedOutputBoundary::Begin));
        let (_, boundary) = terminal
            .write_until_sync_boundary(b"\x1bc")
            .expect("reset transaction");
        assert_eq!(boundary, Some(SynchronizedOutputBoundary::Reset));
    }

    #[test]
    fn replacement_requests_are_bounded_and_read_their_outcome() {
        let (status, printed) = wait_for_replacement(
            shell("echo {\"outcome\":\"not-needed\"}"),
            Duration::from_secs(10),
        )
        .expect("finished request");
        assert!(status.success());
        assert!(printed.contains("not-needed"), "{printed}");

        let started = std::time::Instant::now();
        let hung = if cfg!(windows) {
            shell("ping -n 30 127.0.0.1 >NUL")
        } else {
            shell("sleep 30")
        };
        assert_eq!(
            wait_for_replacement(hung, Duration::from_millis(300)).unwrap_err(),
            "server replacement request timed out"
        );
        assert!(started.elapsed() < Duration::from_secs(5));

        // Invariant: a detached child that inherited stdout keeps the pipe open after the request
        // exits; the outcome is still returned instead of waiting for end-of-file.
        if cfg!(unix) {
            let started = std::time::Instant::now();
            let (status, printed) = wait_for_replacement(
                shell("echo '{\"outcome\":\"started\"}'; (sleep 30 &)"),
                Duration::from_secs(10),
            )
            .expect("request with a lingering child");
            assert!(status.success());
            assert!(printed.contains("\"started\""), "{printed}");
            assert!(started.elapsed() < Duration::from_secs(5));
        }
    }

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
            child_input::bracketed_paste("wide 开发 e\u{301}".as_bytes()),
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
