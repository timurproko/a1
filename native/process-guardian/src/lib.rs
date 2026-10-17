use std::collections::HashMap;
use std::sync::Arc;

use napi::bindgen_prelude::AsyncTask;
use napi::{Env, Error, Result, Status, Task};
use napi_derive::napi;

#[cfg(target_os = "macos")]
mod darwin;
mod exit_notice;
#[cfg(target_os = "linux")]
mod linux;
#[cfg(windows)]
mod windows;

const GUARDIAN_PROTOCOL_VERSION: u32 = 2;

#[napi(object)]
pub struct VersionReport {
    pub crate_version: String,
    pub protocol_version: u32,
    pub target: String,
}

#[napi]
pub fn version() -> VersionReport {
    VersionReport {
        crate_version: env!("CARGO_PKG_VERSION").to_owned(),
        protocol_version: GUARDIAN_PROTOCOL_VERSION,
        target: std::env::consts::OS.to_owned(),
    }
}

#[napi]
pub fn inspect_process_start(pid: u32) -> Result<Option<String>> {
    if pid == 0 {
        return Err(Error::new(Status::InvalidArg, "inspected PID must be positive"));
    }
    platform_inspect_process_start(pid).map_err(node_error)
}

fn platform_inspect_process_start(pid: u32) -> std::result::Result<Option<String>, String> {
    #[cfg(windows)]
    {
        return windows::inspect_process_start(pid);
    }
    #[cfg(target_os = "linux")]
    {
        return linux::inspect_process_start(pid);
    }
    #[cfg(target_os = "macos")]
    {
        return darwin::inspect_process_start(pid);
    }
    #[allow(unreachable_code)]
    Err(format!(
        "process inspection is not implemented for {}",
        std::env::consts::OS
    ))
}

#[napi]
pub fn capture_terminal_modes() -> String {
    exit_notice::terminal::Snapshot::capture().encode()
}

#[napi]
pub fn restore_terminal_modes(encoded: String) {
    exit_notice::terminal::Snapshot::decode(&encoded).restore();
}

#[napi]
pub fn deliver_exit_notice(path: String, encoded_modes: String) {
    exit_notice::ExitNotice::for_watcher(path, &encoded_modes).deliver();
}

#[napi(object)]
pub struct SpawnContainedOptions {
    pub executable: String,
    pub arguments: Vec<String>,
    pub cwd: String,
    pub environment: HashMap<String, String>,
    pub instance_id: String,
}

#[napi(object)]
pub struct SpawnWatcherOptions {
    pub executable: String,
    pub arguments: Vec<String>,
}

#[cfg(windows)]
type PlatformRuntime = windows::Runtime;
#[cfg(target_os = "linux")]
type PlatformRuntime = linux::Runtime;
#[cfg(target_os = "macos")]
type PlatformRuntime = darwin::Runtime;

#[napi]
pub struct ContainedRuntime {
    inner: Arc<PlatformRuntime>,
}

#[napi]
impl ContainedRuntime {
    #[napi(getter)]
    pub fn pid(&self) -> u32 {
        self.inner.pid()
    }

    #[napi(getter)]
    pub fn start_identity(&self) -> String {
        self.inner.start_identity().to_owned()
    }

    #[napi(getter)]
    pub fn containment_provider(&self) -> String {
        self.inner.containment_provider().to_owned()
    }

    #[napi(getter)]
    pub fn containment_token(&self) -> String {
        self.inner.containment_token().to_owned()
    }

    #[napi(getter)]
    pub fn process_group(&self) -> Option<i32> {
        self.inner.process_group()
    }

    #[napi]
    pub fn wait(&self) -> AsyncTask<RuntimeWaitTask> {
        AsyncTask::new(RuntimeWaitTask {
            runtime: Arc::clone(&self.inner),
        })
    }

    #[napi]
    pub fn terminate(&self, code: u32) -> Result<()> {
        self.inner.terminate(code).map_err(node_error)
    }

    #[napi]
    pub fn stop(&self) -> Result<()> {
        self.inner.stop().map_err(node_error)
    }

    #[napi]
    pub fn close(&self) -> Result<()> {
        self.inner.close().map_err(node_error)
    }
}

pub struct RuntimeWaitTask {
    runtime: Arc<PlatformRuntime>,
}

impl Task for RuntimeWaitTask {
    type Output = u32;
    type JsValue = u32;

    fn compute(&mut self) -> Result<Self::Output> {
        self.runtime.wait().map_err(node_error)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn spawn_contained(options: SpawnContainedOptions) -> Result<ContainedRuntime> {
    if options.executable.is_empty() || options.executable.contains('\0') {
        return Err(Error::new(Status::InvalidArg, "contained executable is invalid"));
    }
    if options.cwd.is_empty() || options.cwd.contains('\0') {
        return Err(Error::new(Status::InvalidArg, "contained working directory is invalid"));
    }
    if options.instance_id.is_empty()
        || options.instance_id.len() > 512
        || options.instance_id.contains('\0')
    {
        return Err(Error::new(Status::InvalidArg, "instance identity is invalid"));
    }
    if options.arguments.iter().any(|value| value.contains('\0'))
        || options
            .environment
            .iter()
            .any(|(key, value)| key.is_empty() || key.contains(['=', '\0']) || value.contains('\0'))
    {
        return Err(Error::new(
            Status::InvalidArg,
            "contained command environment or arguments are invalid",
        ));
    }

    #[cfg(windows)]
    let runtime = windows::spawn(options);
    #[cfg(target_os = "linux")]
    let runtime = linux::spawn(options);
    #[cfg(target_os = "macos")]
    let runtime = darwin::spawn(options);
    #[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
    let runtime: std::result::Result<PlatformRuntime, String> = Err(format!(
        "CONTAINMENT_UNSUPPORTED: process containment is not certified for {}",
        std::env::consts::OS
    ));

    runtime
        .map(|inner| ContainedRuntime {
            inner: Arc::new(inner),
        })
        .map_err(node_error)
}

#[napi]
pub fn spawn_watcher(options: SpawnWatcherOptions) -> Result<u32> {
    #[cfg(windows)]
    {
        return windows::spawn_watcher(&options.executable, &options.arguments).map_err(node_error);
    }
    #[cfg(not(windows))]
    {
        let _ = options;
        Err(Error::new(
            Status::GenericFailure,
            "spawnWatcher is available only on Windows",
        ))
    }
}

pub struct ProcessWaitTask {
    pid: u32,
}

impl Task for ProcessWaitTask {
    type Output = ();
    type JsValue = ();

    fn compute(&mut self) -> Result<Self::Output> {
        platform_wait_for_process_exit(self.pid).map_err(node_error)
    }

    fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
        Ok(output)
    }
}

#[napi]
pub fn wait_for_process_exit(pid: u32) -> Result<AsyncTask<ProcessWaitTask>> {
    if pid == 0 {
        return Err(Error::new(Status::InvalidArg, "watched PID must be positive"));
    }
    Ok(AsyncTask::new(ProcessWaitTask { pid }))
}

fn platform_wait_for_process_exit(pid: u32) -> std::result::Result<(), String> {
    #[cfg(windows)]
    {
        return windows::wait_for_process_exit(pid);
    }
    #[cfg(target_os = "linux")]
    {
        return linux::wait_for_process_exit(pid);
    }
    #[cfg(target_os = "macos")]
    {
        return darwin::wait_for_process_exit(pid);
    }
    #[allow(unreachable_code)]
    Err(format!("cannot wait for a process on {}", std::env::consts::OS))
}

#[napi]
pub fn stop_process_group(process_group: i32) -> Result<()> {
    #[cfg(target_os = "linux")]
    {
        return linux::stop_process_group(process_group).map_err(node_error);
    }
    #[cfg(target_os = "macos")]
    {
        return darwin::stop_process_group(process_group).map_err(node_error);
    }
    #[cfg(not(unix))]
    {
        let _ = process_group;
        Err(Error::new(
            Status::GenericFailure,
            "process groups are unavailable on Windows",
        ))
    }
}

#[napi]
pub fn restore_foreground_group(process_group: i32) -> Result<()> {
    #[cfg(target_os = "linux")]
    {
        return linux::restore_foreground_group(process_group).map_err(node_error);
    }
    #[cfg(target_os = "macos")]
    {
        return darwin::restore_foreground_group(process_group).map_err(node_error);
    }
    #[cfg(not(unix))]
    {
        let _ = process_group;
        Ok(())
    }
}

#[napi]
pub fn ignore_console_control() -> Result<()> {
    #[cfg(windows)]
    {
        return windows::ignore_console_control().map_err(node_error);
    }
    #[cfg(not(windows))]
    Ok(())
}

fn node_error(error: impl std::fmt::Display) -> Error {
    Error::new(Status::GenericFailure, error.to_string())
}
