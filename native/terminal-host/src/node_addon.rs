use napi::{Error, Result, Status};
use napi_derive::napi;

use crate::session_lock::SessionLock;

#[napi(object)]
pub struct RoleHost {
    pub executable: String,
    pub entry: String,
}

#[napi(object)]
pub struct NodeVersionFeatures {
    pub fault_injection: bool,
    pub resident_fixtures: bool,
}

#[napi(object)]
pub struct NodeVersionReport {
    pub schema: String,
    pub protocol_version: u32,
    pub generation: u32,
    pub crate_version: String,
    pub features: NodeVersionFeatures,
    pub host_mode: String,
    pub desktop_window: bool,
    pub libghostty_vt_commit: String,
    pub libghostty_target: String,
    pub libghostty_cpu: String,
    pub portable_pty: String,
    pub crossterm: String,
}

#[napi]
pub fn version() -> NodeVersionReport {
    let report = crate::roles::entry::version_report();
    NodeVersionReport {
        schema: report.schema.to_owned(),
        protocol_version: report.protocol_version,
        generation: u32::from(report.generation),
        crate_version: report.crate_version.to_owned(),
        features: NodeVersionFeatures {
            fault_injection: report.features.fault_injection,
            resident_fixtures: report.features.resident_fixtures,
        },
        host_mode: report.host_mode.to_owned(),
        desktop_window: report.desktop_window,
        libghostty_vt_commit: report.libghostty_vt_commit.to_owned(),
        libghostty_target: report.libghostty_target.to_owned(),
        libghostty_cpu: report.libghostty_cpu.to_owned(),
        portable_pty: report.portable_pty.to_owned(),
        crossterm: report.crossterm.to_owned(),
    }
}

#[napi]
pub fn run_role(arguments: Vec<String>, host: RoleHost) -> Result<u32> {
    crate::launch::set_host_command(host.executable, [host.entry]).map_err(node_error)?;
    // Platform: the native role blocks this thread and owns the process. A 1 ms Windows timer
    // period keeps the synchronous readiness polls from adding a full default timer tick per hop.
    #[cfg(windows)]
    unsafe {
        windows_sys::Win32::Media::timeBeginPeriod(1);
    }
    Ok(crate::roles::entry::run_from_args(arguments))
}

/// Opaque writer-held lease. The Node process owns the native descriptor directly.
#[napi(js_name = "SessionLock")]
pub struct NodeSessionLock {
    inner: Option<SessionLock>,
}

#[napi]
impl NodeSessionLock {
    #[napi(factory)]
    pub fn acquire(path: String) -> Result<Self> {
        SessionLock::acquire(path)
            .map(|lock| Self { inner: Some(lock) })
            .map_err(node_error)
    }

    #[napi]
    pub fn bind_created(&mut self, path: String) -> Result<()> {
        self.inner
            .as_mut()
            .ok_or_else(|| Error::new(Status::InvalidArg, "session lock was released"))?
            .bind_created(path)
            .map_err(node_error)
    }

    #[napi(getter)]
    pub fn bound(&self) -> bool {
        self.inner.as_ref().is_some_and(SessionLock::is_bound)
    }

    #[napi]
    pub fn release(&mut self) -> Result<()> {
        let lock = self
            .inner
            .take()
            .ok_or_else(|| Error::new(Status::InvalidArg, "session lock was already released"))?;
        lock.release();
        Ok(())
    }
}

fn node_error(error: impl std::fmt::Display) -> Error {
    Error::new(Status::GenericFailure, error.to_string())
}
