use std::fs::{File, OpenOptions, TryLockError};
use std::path::Path;

use napi::{Error, Result, Status};
use napi_derive::napi;

/// Persistent descriptor authority: process death releases the lock without deleting its path.
#[napi]
pub struct ProcessGate {
    file: Option<File>,
}

#[napi]
impl ProcessGate {
    #[napi(getter)]
    pub fn acquired(&self) -> bool {
        self.file.is_some()
    }

    #[napi]
    pub fn release(&mut self) {
        self.file.take();
    }
}

/// A nonblocking OS lock, not a PID file or a time-based lease. Callers never unlink the gate.
#[napi]
pub fn try_acquire_process_gate(path: String) -> Result<ProcessGate> {
    let path = Path::new(&path);
    if !path.is_absolute() {
        return Err(Error::new(Status::InvalidArg, "process gate path must be absolute"));
    }
    match std::fs::symlink_metadata(path) {
        Ok(metadata) if !metadata.is_file() || metadata.file_type().is_symlink() => {
            return Err(Error::new(Status::InvalidArg, "process gate must be a regular file"));
        }
        Err(error) if error.kind() != std::io::ErrorKind::NotFound => return Err(io_error(error)),
        _ => {}
    }
    let file = OpenOptions::new().read(true).write(true).create(true).truncate(false)
        .open(path).map_err(io_error)?;
    match file.try_lock() {
        Ok(()) => Ok(ProcessGate { file: Some(file) }),
        Err(TryLockError::WouldBlock) => Ok(ProcessGate { file: None }),
        Err(TryLockError::Error(error)) => Err(io_error(error)),
    }
}

fn io_error(error: std::io::Error) -> Error {
    Error::new(Status::GenericFailure, format!("process gate I/O failed: {error}"))
}
