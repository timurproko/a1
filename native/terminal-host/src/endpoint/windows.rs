//! Completion-driven owner-only Windows pipes. No readiness polling or timer-period assumption.

use super::{EndpointError, endpoint_token};
use std::io::{self, Read, Write};
use std::os::windows::ffi::OsStrExt;
use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use windows_sys::Win32::{
    Foundation::{
        ERROR_BROKEN_PIPE, ERROR_IO_PENDING, ERROR_NO_DATA, ERROR_PIPE_BUSY, ERROR_PIPE_CONNECTED,
        HANDLE, INVALID_HANDLE_VALUE, WAIT_OBJECT_0, WAIT_TIMEOUT,
    },
    Storage::FileSystem::{
        FILE_FLAG_FIRST_PIPE_INSTANCE, FILE_FLAG_OVERLAPPED, PIPE_ACCESS_DUPLEX, ReadFile,
        WriteFile,
    },
    System::{
        IO::{CancelIoEx, GetOverlappedResult, OVERLAPPED},
        Pipes::{
            ConnectNamedPipe, CreateNamedPipeW, DisconnectNamedPipe, GetNamedPipeClientProcessId,
            PIPE_READMODE_BYTE, PIPE_REJECT_REMOTE_CLIENTS, PIPE_TYPE_BYTE,
            PIPE_UNLIMITED_INSTANCES, PIPE_WAIT, WaitNamedPipeW,
        },
        Threading::{
            CreateEventW, INFINITE, SetEvent, WaitForMultipleObjects, WaitForSingleObject,
        },
    },
};

fn raw(handle: &OwnedHandle) -> HANDLE {
    handle.as_raw_handle().cast()
}
fn wide(value: &str) -> Vec<u16> {
    std::ffi::OsStr::new(value)
        .encode_wide()
        .chain(Some(0))
        .collect()
}
fn event() -> io::Result<OwnedHandle> {
    let handle = unsafe { CreateEventW(std::ptr::null(), 1, 0, std::ptr::null()) };
    if handle.is_null() {
        Err(io::Error::last_os_error())
    } else {
        // Security: this fresh, non-inherited handle has exactly one owner.
        Ok(unsafe { OwnedHandle::from_raw_handle(handle.cast()) })
    }
}
fn error(context: &str, cause: impl std::fmt::Display) -> EndpointError {
    EndpointError(format!("{context}: {cause}"))
}

struct Connection {
    pipe: OwnedHandle,
    closed: OwnedHandle,
    read_deadline: Mutex<Option<Instant>>,
}

/// Clones share pipe custody and shutdown, not operation events or a read/write mutex.
/// Buffers stay borrowed on the calling worker until the kernel completes/cancels that operation.
pub struct EndpointStream {
    connection: Arc<Connection>,
}
impl EndpointStream {
    fn new(pipe: OwnedHandle) -> io::Result<Self> {
        Ok(Self {
            connection: Arc::new(Connection {
                pipe,
                closed: event()?,
                read_deadline: Mutex::new(None),
            }),
        })
    }
    pub fn try_clone(&self) -> io::Result<Self> {
        Ok(Self {
            connection: self.connection.clone(),
        })
    }
    fn read_deadline(&self) -> io::Result<Option<Instant>> {
        self.connection
            .read_deadline
            .lock()
            .map(|value| *value)
            .map_err(|_| io::Error::other("pipe deadline poisoned"))
    }
}

/// Held by each split connection owner/worker. Exiting one wakes pending operations on the other.
/// Merely dropping an ordinary stream clone does not tear down a healthy connection.
pub struct ConnectionGuard {
    connection: Arc<Connection>,
}
pub fn close_on_drop(stream: &EndpointStream) -> ConnectionGuard {
    ConnectionGuard {
        connection: stream.connection.clone(),
    }
}
impl Drop for ConnectionGuard {
    fn drop(&mut self) {
        unsafe {
            SetEvent(raw(&self.connection.closed));
        }
    }
}

pub fn set_handshake_deadline(
    stream: &EndpointStream,
    timeout: Duration,
) -> Result<(), EndpointError> {
    *stream
        .connection
        .read_deadline
        .lock()
        .map_err(|_| error("set handshake deadline", "poisoned"))? = Some(Instant::now() + timeout);
    Ok(())
}
pub fn clear_handshake_deadline(stream: &EndpointStream) -> Result<(), EndpointError> {
    *stream
        .connection
        .read_deadline
        .lock()
        .map_err(|_| error("clear handshake deadline", "poisoned"))? = None;
    Ok(())
}

/// Owns one stable OVERLAPPED address/event. Drop drains cancellation before any storage is freed.
struct Operation<'a> {
    pipe: &'a OwnedHandle,
    overlapped: Box<OVERLAPPED>,
    _event: OwnedHandle,
    pending: bool,
}
impl<'a> Operation<'a> {
    fn new(pipe: &'a OwnedHandle) -> io::Result<Self> {
        let event = event()?;
        let mut overlapped = Box::<OVERLAPPED>::default();
        overlapped.hEvent = raw(&event);
        Ok(Self {
            pipe,
            overlapped,
            _event: event,
            pending: false,
        })
    }
    fn finish(
        &mut self,
        started: bool,
        closed: Option<&OwnedHandle>,
        deadline: Option<Instant>,
    ) -> io::Result<usize> {
        if !started {
            let cause = io::Error::last_os_error();
            if cause.raw_os_error() != Some(ERROR_IO_PENDING as i32) {
                return Err(cause);
            }
        }
        self.pending = true;
        let handles = [
            self.overlapped.hEvent,
            closed.map_or(self.overlapped.hEvent, raw),
        ];
        // Rationale: the test seam announces a submitted operation before its single kernel wait.
        #[cfg(test)]
        WAIT_ENTERED.with(|hook| {
            if let Some(sender) = hook.borrow_mut().take() {
                let _ = sender.send(());
            }
        });
        // Performance: one completion/shutdown wait, never a periodic readiness timeout.
        let outcome = unsafe {
            WaitForMultipleObjects(
                if closed.is_some() { 2 } else { 1 },
                handles.as_ptr(),
                0,
                wait_millis(deadline)?,
            )
        };
        if outcome != WAIT_OBJECT_0 {
            return Err(if outcome == WAIT_TIMEOUT {
                io::Error::new(io::ErrorKind::TimedOut, "pipe operation deadline expired")
            } else if outcome == WAIT_OBJECT_0 + 1 {
                io::Error::new(io::ErrorKind::BrokenPipe, "pipe connection closed")
            } else {
                io::Error::last_os_error()
            });
        }
        let mut transferred = 0;
        let success = unsafe {
            GetOverlappedResult(
                raw(self.pipe),
                self.overlapped.as_ref(),
                &mut transferred,
                0,
            )
        } != 0;
        self.pending = false;
        if success {
            Ok(transferred as usize)
        } else {
            Err(io::Error::last_os_error())
        }
    }
}
impl Drop for Operation<'_> {
    fn drop(&mut self) {
        if self.pending {
            // Invariant: cancel ONLY this operation. A completion racing cancellation is also drained.
            unsafe {
                CancelIoEx(raw(self.pipe), self.overlapped.as_ref());
                let mut ignored = 0;
                GetOverlappedResult(raw(self.pipe), self.overlapped.as_ref(), &mut ignored, 1);
            }
        }
    }
}
#[cfg(test)]
thread_local! {
    static WAIT_ENTERED: std::cell::RefCell<Option<std::sync::mpsc::Sender<()>>> = const { std::cell::RefCell::new(None) };
}

fn wait_millis(deadline: Option<Instant>) -> io::Result<u32> {
    let Some(deadline) = deadline else {
        return Ok(INFINITE);
    };
    let remaining = deadline
        .checked_duration_since(Instant::now())
        .ok_or_else(|| {
            io::Error::new(io::ErrorKind::TimedOut, "pipe operation deadline expired")
        })?;
    if remaining.is_zero() {
        return Err(io::Error::new(
            io::ErrorKind::TimedOut,
            "pipe operation deadline expired",
        ));
    }
    // Rationale: round up the remaining budget rather than expiring sub-millisecond waits early.
    Ok(remaining
        .as_millis()
        .saturating_add(u128::from(remaining.subsec_nanos() % 1_000_000 != 0))
        .min(u128::from(INFINITE - 1)) as u32)
}
impl Read for EndpointStream {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        if buffer.is_empty() {
            return Ok(0);
        }
        let deadline = self.read_deadline()?;
        wait_millis(deadline)?;
        if unsafe { WaitForSingleObject(raw(&self.connection.closed), 0) } == WAIT_OBJECT_0 {
            return Err(io::Error::new(
                io::ErrorKind::BrokenPipe,
                "pipe connection closed",
            ));
        }
        let mut operation = Operation::new(&self.connection.pipe)?;
        // Invariant: buffer, handle and boxed OVERLAPPED remain alive through completion and Drop.
        let started = unsafe {
            ReadFile(
                raw(&self.connection.pipe),
                buffer.as_mut_ptr(),
                buffer.len().min(u32::MAX as usize) as u32,
                std::ptr::null_mut(),
                operation.overlapped.as_mut(),
            )
        } != 0;
        match operation.finish(started, Some(&self.connection.closed), deadline) {
            Err(cause) if matches!(cause.raw_os_error(), Some(code) if code == ERROR_BROKEN_PIPE as i32 || code == ERROR_NO_DATA as i32) => {
                Ok(0)
            }
            outcome => outcome,
        }
    }
}
impl Write for EndpointStream {
    fn write(&mut self, buffer: &[u8]) -> io::Result<usize> {
        if buffer.is_empty() {
            return Ok(0);
        }
        if unsafe { WaitForSingleObject(raw(&self.connection.closed), 0) } == WAIT_OBJECT_0 {
            return Err(io::Error::new(
                io::ErrorKind::BrokenPipe,
                "pipe connection closed",
            ));
        }
        let mut operation = Operation::new(&self.connection.pipe)?;
        let started_at = Instant::now();
        // Concurrency: independent operation storage makes a simultaneous pending read harmless.
        let started = unsafe {
            WriteFile(
                raw(&self.connection.pipe),
                buffer.as_ptr(),
                buffer.len().min(u32::MAX as usize) as u32,
                std::ptr::null_mut(),
                operation.overlapped.as_mut(),
            )
        } != 0;
        let result = operation.finish(started, Some(&self.connection.closed), None);
        if let Ok(bytes) = result {
            crate::roles::progress_observation::observe(
                "transport",
                "pipe-write-complete",
                crate::roles::progress_observation::ProgressMetadata {
                    bytes,
                    duration_us: Some(
                        started_at.elapsed().as_micros().min(u128::from(u64::MAX)) as u64
                    ),
                    ..Default::default()
                },
            );
        }
        result
    }
    // Protocol: completion already handed these bytes to the pipe. FlushFileBuffers would wait for the peer
    // to consume them, breaking the bounded latest-value/reliable-control worker separation.
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

pub fn connect(address: &str) -> Result<EndpointStream, EndpointError> {
    use std::os::windows::fs::OpenOptionsExt;
    let deadline = Instant::now() + Duration::from_secs(2);
    let name = wide(address);
    loop {
        match std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .custom_flags(FILE_FLAG_OVERLAPPED)
            .open(address)
        {
            Ok(file) => {
                return EndpointStream::new(file.into())
                    .map_err(|cause| error("open pipe endpoint", cause));
            }
            Err(cause) if cause.raw_os_error() == Some(ERROR_PIPE_BUSY as i32) => {
                let remaining = wait_millis(Some(deadline))
                    .map_err(|cause| error("connect endpoint", cause))?;
                if unsafe { WaitNamedPipeW(name.as_ptr(), remaining) } == 0 {
                    return Err(error("wait for pipe endpoint", io::Error::last_os_error()));
                }
            }
            Err(cause) => return Err(error("connect endpoint", cause)),
        }
    }
}

pub struct OwnerEndpoint {
    pending: OwnedHandle,
    name: String,
}
impl OwnerEndpoint {
    pub fn bind(profile: &Path, _runtime: &Path) -> Result<Self, EndpointError> {
        Self::bind_name(format!(r"\\.\pipe\a1-tabs-{}", endpoint_token(profile)?))
    }
    pub fn bind_name(name: String) -> Result<Self, EndpointError> {
        Ok(Self {
            pending: create_owner_pipe(&name, true)?,
            name,
        })
    }
    pub fn name(&self) -> &str {
        &self.name
    }
    pub fn accept(&mut self) -> Result<EndpointStream, EndpointError> {
        loop {
            let mut operation = Operation::new(&self.pending)
                .map_err(|cause| error("create accept event", cause))?;
            let started =
                unsafe { ConnectNamedPipe(raw(&self.pending), operation.overlapped.as_mut()) } != 0;
            let result = if !started
                && io::Error::last_os_error().raw_os_error() == Some(ERROR_PIPE_CONNECTED as i32)
            {
                Ok(0) // Concurrency: the client connected before ConnectNamedPipe.
            } else {
                operation.finish(started, None, None)
            };
            drop(operation);
            if let Err(cause) = result {
                if cause.raw_os_error() == Some(ERROR_NO_DATA as i32) {
                    unsafe {
                        DisconnectNamedPipe(raw(&self.pending));
                    }
                    continue;
                }
                return Err(error("accept named-pipe client", cause));
            }
            let mut pid = 0;
            if unsafe { GetNamedPipeClientProcessId(raw(&self.pending), &mut pid) } == 0
                || !same_user_as_current_process(pid).unwrap_or(false)
            {
                unsafe {
                    DisconnectNamedPipe(raw(&self.pending));
                }
                continue;
            }
            let replacement = create_owner_pipe(&self.name, false)?;
            let accepted = std::mem::replace(&mut self.pending, replacement);
            return EndpointStream::new(accepted)
                .map_err(|cause| error("admit pipe endpoint", cause));
        }
    }
}
fn create_owner_pipe(name: &str, first: bool) -> Result<OwnedHandle, EndpointError> {
    use windows_sys::Win32::{
        Foundation::LocalFree,
        Security::{
            Authorization::{
                ConvertStringSecurityDescriptorToSecurityDescriptorW, SDDL_REVISION_1,
            },
            SECURITY_ATTRIBUTES,
        },
    };
    let name = wide(name);
    let sddl = wide("D:P(A;;GA;;;OW)");
    let mut descriptor = std::ptr::null_mut();
    if unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            sddl.as_ptr(),
            SDDL_REVISION_1,
            &mut descriptor,
            std::ptr::null_mut(),
        )
    } == 0
    {
        return Err(error(
            "create owner-only pipe descriptor",
            io::Error::last_os_error(),
        ));
    }
    let mut attributes = SECURITY_ATTRIBUTES {
        nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: descriptor,
        bInheritHandle: 0,
    };
    let handle = unsafe {
        CreateNamedPipeW(
            name.as_ptr(),
            PIPE_ACCESS_DUPLEX
                | FILE_FLAG_OVERLAPPED
                | if first {
                    FILE_FLAG_FIRST_PIPE_INSTANCE
                } else {
                    0
                },
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
            PIPE_UNLIMITED_INSTANCES,
            64 * 1024,
            64 * 1024,
            0,
            &mut attributes,
        )
    };
    // Invariant: preserve the error before releasing the descriptor can change last-error.
    let cause = io::Error::last_os_error();
    unsafe {
        LocalFree(descriptor);
    }
    if handle == INVALID_HANDLE_VALUE {
        Err(error("create owner-only named pipe", cause))
    } else {
        Ok(unsafe { OwnedHandle::from_raw_handle(handle.cast()) })
    }
}
fn same_user_as_current_process(pid: u32) -> Result<bool, EndpointError> {
    use windows_sys::Win32::{
        Security::{EqualSid, TOKEN_USER},
        System::Threading::{GetCurrentProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION},
    };
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if handle.is_null() {
        return Err(error(
            "open named-pipe client process",
            io::Error::last_os_error(),
        ));
    }
    let client = unsafe { OwnedHandle::from_raw_handle(handle.cast()) };
    let current_token = process_token_user(unsafe { GetCurrentProcess() })?;
    let client_token = process_token_user(raw(&client))?;
    let current = unsafe { &*(current_token.as_ptr().cast::<TOKEN_USER>()) };
    let client = unsafe { &*(client_token.as_ptr().cast::<TOKEN_USER>()) };
    Ok(unsafe { EqualSid(current.User.Sid, client.User.Sid) } != 0)
}
fn process_token_user(process: HANDLE) -> Result<Vec<u8>, EndpointError> {
    use windows_sys::Win32::{
        Security::{GetTokenInformation, TOKEN_QUERY, TokenUser},
        System::Threading::OpenProcessToken,
    };
    let mut handle = std::ptr::null_mut();
    if unsafe { OpenProcessToken(process, TOKEN_QUERY, &mut handle) } == 0 {
        return Err(error("open process token", io::Error::last_os_error()));
    }
    let token = unsafe { OwnedHandle::from_raw_handle(handle.cast()) };
    let mut length = 0;
    unsafe {
        GetTokenInformation(raw(&token), TokenUser, std::ptr::null_mut(), 0, &mut length);
    }
    let mut bytes = vec![0; length as usize];
    if unsafe {
        GetTokenInformation(
            raw(&token),
            TokenUser,
            bytes.as_mut_ptr().cast(),
            length,
            &mut length,
        )
    } == 0
    {
        return Err(error("read process token user", io::Error::last_os_error()));
    }
    Ok(bytes)
}

#[cfg(test)]
mod tests;
