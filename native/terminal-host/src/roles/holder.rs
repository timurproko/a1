use std::collections::VecDeque;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::mpsc;
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
    self, HolderExit, HolderLaunchConfig, Input, PasteStart, Resize, RoleHello, Surface,
};

pub const HOLDER_INPUT_CAPACITY: usize = 4 * 1024 * 1024;

enum HolderCommand {
    Input(Input),
    PasteStart(usize),
    Resize(Resize),
    Disconnected,
}
enum PendingPaste {
    Collect { expected: usize, bytes: Vec<u8> },
    Discard { remaining: usize },
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
            messages: VecDeque::new(),
        }
    }
    pub fn queued_bytes(&self) -> usize {
        self.queued
    }
    pub fn admit_paste(&mut self, bytes: &[u8]) -> Result<usize, InputAdmissionError> {
        if bytes.len() > self.capacity.saturating_sub(self.queued) {
            return Err(InputAdmissionError::Capacity);
        }
        let count = bytes.len().div_ceil(MAX_INPUT_BYTES);
        for chunk in bytes.chunks(MAX_INPUT_BYTES) {
            self.messages.push_back(chunk.to_vec());
            self.queued += chunk.len();
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
    }
}

/// Bounded retained output used by the holder even while no client is attached.
#[derive(Debug)]
pub struct RetainedOutput {
    bytes: VecDeque<u8>,
    capacity: usize,
    revision: u64,
}
impl RetainedOutput {
    pub fn new(capacity: usize) -> Self {
        Self {
            bytes: VecDeque::new(),
            capacity,
            revision: 0,
        }
    }
    pub fn absorb(&mut self, output: &[u8]) {
        self.revision = self.revision.saturating_add(1);
        self.bytes.extend(output.iter().copied());
        while self.bytes.len() > self.capacity {
            self.bytes.pop_front();
        }
    }
    pub fn snapshot(&self) -> (u64, Vec<u8>) {
        (self.revision, self.bytes.iter().copied().collect())
    }
}

pub fn run_holder_child(_profile: &Path, ready: &Path, context: &[u8]) -> Result<(), String> {
    let config: HolderLaunchConfig = serde_json::from_slice(context)
        .map_err(|error| format!("decode holder context: {error}"))?;
    fixture_trace(&config, "decoded");
    let mut stream = connect_holder(&config, false)?;
    fixture_trace(&config, "connected");

    let pty = NativePtySystem::default();
    let pair = pty
        .openpty(PtySize {
            rows: config.rows,
            cols: config.columns,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| format!("open resident tab PTY: {error}"))?;
    fixture_trace(&config, "pty-opened");
    let mut command = CommandBuilder::new(&config.node_executable);
    command.arg(Path::new(&config.release_root).join("bin").join("ui.js"));
    command.arg("--tab");
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
    fixture_trace(&config, "child-spawned");
    let child_pid = child
        .process_id()
        .ok_or_else(|| "resident child pid is unavailable".to_owned())?;
    let _containment = match ChildContainment::acquire(child_pid) {
        Ok(value) => value,
        Err(error) => {
            let _ = child.kill();
            return Err(error);
        }
    };
    fixture_trace(&config, "child-contained");
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
    thread::spawn(move || {
        while let Ok((bytes, admitted)) = write_rx.recv() {
            let result = pty_writer
                .write_all(&bytes)
                .and_then(|()| pty_writer.flush())
                .map(|()| admitted)
                .map_err(|error| format!("write resident PTY input: {error}"));
            let failed = result.is_err();
            if write_result_tx.send(result).is_err() || failed {
                break;
            }
        }
    });
    let (output_tx, output_rx) = mpsc::channel::<Vec<u8>>();
    thread::spawn(move || {
        let mut buffer = [0_u8; 16 * 1024];
        loop {
            match pty_reader.read(&mut buffer) {
                Ok(0) | Err(_) => break,
                Ok(count) => {
                    if output_tx.send(buffer[..count].to_vec()).is_err() {
                        break;
                    }
                }
            }
        }
    });
    let (command_tx, command_rx) = mpsc::sync_channel::<HolderCommand>(4);
    spawn_command_reader(
        stream
            .try_clone()
            .map_err(|error| format!("clone holder server stream: {error}"))?,
        command_tx.clone(),
    );
    std::fs::write(ready, format!("{}:holder\n", std::process::id()))
        .map_err(|error| format!("write holder readiness: {error}"))?;
    fixture_trace(&config, "ready");
    let mut terminal = GhosttyTerminal::new(config.columns, config.rows)?;
    fixture_trace(&config, "terminal-created");
    terminal.mark_dirty()?;
    let mut revision = 0_u64;
    let mut input = BoundedInputQueue::default();
    let mut pending_paste: Option<PendingPaste> = None;
    loop {
        while let Ok(result) = write_result_rx.try_recv() {
            let completed = result?;
            fixture_trace(&config, &format!("write-complete:{completed}"));
            input.complete(completed);
        }
        while let Ok(command) = command_rx.try_recv() {
            if matches!(command, HolderCommand::Disconnected) {
                stream = connect_holder(&config, true)?;
                spawn_command_reader(
                    stream
                        .try_clone()
                        .map_err(|error| format!("clone reconnected holder stream: {error}"))?,
                    command_tx.clone(),
                );
                revision = revision.saturating_add(1);
                terminal.mark_dirty()?;
                let frame = terminal.frame_at(0, 1, true)?.into_bytes();
                wire::send(
                    &mut stream,
                    "surface",
                    None,
                    Surface {
                        revision,
                        bytes: frame,
                        status: "idle".into(),
                    },
                )?;
            } else if let HolderCommand::Resize(resize) = command {
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
            } else if let HolderCommand::PasteStart(bytes) = command {
                pending_paste = if bytes == 0 {
                    None
                } else if bytes <= HOLDER_INPUT_CAPACITY {
                    Some(PendingPaste::Collect {
                        expected: bytes,
                        bytes: Vec::with_capacity(bytes),
                    })
                } else {
                    Some(PendingPaste::Discard { remaining: bytes })
                };
            } else if let HolderCommand::Input(message) = command {
                let admitted = if !message.paste {
                    input.admit_input(&message.bytes)
                } else if let Some(pending) = pending_paste.as_mut() {
                    match pending {
                        PendingPaste::Collect { expected, bytes } => {
                            bytes.extend_from_slice(&message.bytes);
                            if bytes.len() == *expected {
                                let complete = std::mem::take(bytes);
                                pending_paste = None;
                                input.admit_paste(&complete).map(|_| ())
                            } else if bytes.len() > *expected {
                                pending_paste = None;
                                Err(InputAdmissionError::MessageTooLarge)
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
                    input.admit_paste(&message.bytes).map(|_| ())
                };
                if admitted.is_ok() {
                    while let Some(chunk) = input.take_for_write() {
                        let count = chunk.len();
                        write_tx
                            .send((chunk, count))
                            .map_err(|_| "resident PTY writer stopped".to_owned())?;
                    }
                }
            }
        }
        let mut changed = false;
        while let Ok(bytes) = output_rx.try_recv() {
            fixture_trace(&config, &format!("output:{}", bytes.len()));
            terminal.write(&bytes);
            let answers = terminal.take_responses();
            if !answers.is_empty() {
                fixture_trace(&config, &format!("response:{}", answers.len()));
                write_tx
                    .send((answers, 0))
                    .map_err(|_| "resident PTY writer stopped".to_owned())?;
            }
            changed = true;
        }
        if changed {
            revision = revision.saturating_add(1);
            fixture_trace(&config, "mark-dirty-start");
            terminal.mark_dirty()?;
            fixture_trace(&config, "mark-dirty-complete");
            let frame = terminal.frame_at(0, 1, true)?.into_bytes();
            fixture_trace(&config, &format!("frame:{}", frame.len()));
            let _ = wire::send(
                &mut stream,
                "surface",
                None,
                Surface {
                    revision,
                    bytes: frame,
                    status: "idle".into(),
                },
            );
            fixture_trace(&config, "surface-sent");
        }
        if let Some(status) = child
            .try_wait()
            .map_err(|error| format!("inspect resident child: {error}"))?
        {
            wire::send(
                &mut stream,
                "holder.exit",
                None,
                HolderExit {
                    code: Some(status.exit_code() as i32),
                    signal: status.signal().map(str::to_owned),
                },
            )?;
            return Ok(());
        }
        thread::sleep(Duration::from_millis(8));
    }
}

fn fixture_trace(config: &HolderLaunchConfig, stage: &str) {
    #[cfg(feature = "resident-fixtures")]
    if let Some(path) = config
        .environment
        .iter()
        .find(|(name, _)| name == "TERMINAL_HOST_FIXTURE_TRACE_PATH")
        .map(|(_, value)| value)
    {
        use std::fs::OpenOptions;
        let _ = OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .and_then(|mut file| writeln!(file, "holder-fixture:{stage}"));
    }
    let _ = (config, stage);
}

fn connect_holder(
    config: &HolderLaunchConfig,
    retry_forever: bool,
) -> Result<endpoint::EndpointStream, String> {
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
        },
    )?;
    let welcome = wire::read_payload(&mut stream)?
        .ok_or_else(|| "server closed holder handshake".to_owned())?;
    if wire::kind(&welcome)?.message_type != "welcome" {
        return Err("server refused holder handshake".to_owned());
    }
    let _: (Option<u64>, Welcome) = wire::body(&welcome)?;
    Ok(stream)
}

fn spawn_command_reader(
    mut stream: endpoint::EndpointStream,
    command_tx: mpsc::SyncSender<HolderCommand>,
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
                "paste.start" => {
                    if let Ok((_, paste)) = wire::body::<PasteStart>(&payload) {
                        let _ = command_tx.send(HolderCommand::PasteStart(paste.bytes));
                    }
                }
                "resize" => {
                    if let Ok((_, resize)) = wire::body::<Resize>(&payload) {
                        let _ = command_tx.send(HolderCommand::Resize(resize));
                    }
                }
                _ => {}
            }
        }
        let _ = command_tx.send(HolderCommand::Disconnected);
    });
}

fn connect_retry(address: &str, retry_forever: bool) -> Result<endpoint::EndpointStream, String> {
    let deadline = std::time::Instant::now() + Duration::from_secs(4);
    loop {
        match endpoint::connect(address) {
            Ok(stream) => return Ok(stream),
            Err(error) if retry_forever || std::time::Instant::now() < deadline => {
                let _ = error;
                thread::sleep(Duration::from_millis(20));
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
    #[test]
    fn output_is_retained_without_a_viewer() {
        let mut retained = RetainedOutput::new(6);
        retained.absorb(b"before");
        retained.absorb(b"-after");
        assert_eq!(retained.snapshot(), (2, b"-after".to_vec()));
    }
}
