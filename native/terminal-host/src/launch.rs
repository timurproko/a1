use std::fmt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use serde::Serialize;

use crate::identity::{ProcessIdentity, inspect_process};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResidentRole {
    Server,
    Holder,
    #[cfg(feature = "resident-fixtures")]
    Fixture,
}

impl ResidentRole {
    fn argument(self) -> &'static str {
        match self {
            Self::Server => "server",
            Self::Holder => "holder",
            #[cfg(feature = "resident-fixtures")]
            Self::Fixture => "fixture",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LaunchObservation {
    pub process: ProcessIdentity,
    pub mode: String,
    pub profile: PathBuf,
}

pub struct ResidentProcess {
    pid: u32,
    child: Option<Child>,
    #[cfg(windows)]
    handle: windows_sys::Win32::Foundation::HANDLE,
}

impl ResidentProcess {
    pub fn id(&self) -> u32 {
        self.pid
    }
    pub fn has_exited(&mut self) -> Result<bool, LaunchError> {
        if let Some(child) = self.child.as_mut() {
            return child
                .try_wait()
                .map(|status| status.is_some())
                .map_err(|error| LaunchError(format!("observe resident launch: {error}")));
        }
        #[cfg(windows)]
        {
            use windows_sys::Win32::Foundation::{WAIT_OBJECT_0, WAIT_TIMEOUT};
            use windows_sys::Win32::System::Threading::WaitForSingleObject;
            return match unsafe { WaitForSingleObject(self.handle, 0) } {
                WAIT_OBJECT_0 => Ok(true),
                WAIT_TIMEOUT => Ok(false),
                value => Err(LaunchError(format!(
                    "observe WMI resident process: wait result {value}"
                ))),
            };
        }
        #[cfg(unix)]
        return inspect_process(self.pid)
            .map(|identity| identity.is_none())
            .map_err(|error| LaunchError(format!("observe detached resident process: {error}")));
    }

    pub fn terminate(&mut self) -> Result<(), LaunchError> {
        if let Some(child) = self.child.as_mut() {
            child
                .kill()
                .map_err(|error| LaunchError(format!("terminate resident fixture: {error}")))?;
            let _ = child.wait();
            return Ok(());
        }
        #[cfg(windows)]
        {
            use windows_sys::Win32::System::Threading::TerminateProcess;
            if unsafe { TerminateProcess(self.handle, 125) } == 0 {
                return Err(LaunchError(format!(
                    "terminate WMI resident fixture: {}",
                    std::io::Error::last_os_error()
                )));
            }
            return Ok(());
        }
        #[cfg(unix)]
        {
            if unsafe { libc::kill(self.pid as i32, libc::SIGTERM) } != 0 {
                return Err(LaunchError(format!(
                    "terminate detached resident fixture: {}",
                    std::io::Error::last_os_error()
                )));
            }
            return Ok(());
        }
    }
}

#[cfg(windows)]
impl Drop for ResidentProcess {
    fn drop(&mut self) {
        if self.child.is_none() && !self.handle.is_null() {
            unsafe {
                windows_sys::Win32::Foundation::CloseHandle(self.handle);
            }
        }
    }
}

#[derive(Debug)]
pub struct LaunchError(pub String);
impl fmt::Display for LaunchError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for LaunchError {}

/// Starts only this terminal-host artifact with a fixed role/profile grammar.
pub fn launch_resident(
    role: ResidentRole,
    profile: &Path,
) -> Result<(ResidentProcess, LaunchObservation), LaunchError> {
    launch_resident_with_config(role, profile, &serde_json::json!({}))
}

pub fn launch_resident_with_config<T: Serialize>(
    role: ResidentRole,
    profile: &Path,
    context: &T,
) -> Result<(ResidentProcess, LaunchObservation), LaunchError> {
    let executable = std::env::current_exe()
        .map_err(|error| LaunchError(format!("resolve terminal-host artifact: {error}")))?;
    let artifact = std::fs::canonicalize(&executable)
        .map_err(|error| LaunchError(format!("verify terminal-host artifact: {error}")))?;
    let profile = std::fs::canonicalize(profile)
        .map_err(|error| LaunchError(format!("canonicalize resident profile: {error}")))?;
    let result = profile.join(format!(
        ".a1-resident-launch-{}-{}.ready",
        std::process::id(),
        rand::random::<u64>()
    ));
    let context_path = result.with_extension("context.json");
    write_private_context(&context_path, context)?;
    let _context_cleanup = ContextCleanup(context_path.clone());
    let mut command = Command::new(&artifact);
    command
        .args([
            "--resident-role-child",
            role.argument(),
            &profile.to_string_lossy(),
            &result.to_string_lossy(),
            &context_path.to_string_lossy(),
        ])
        .env_clear()
        .env("PATH", std::env::var_os("PATH").unwrap_or_default())
        .current_dir(&profile)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    let configured_mode = configure_detached(&mut command)?;
    let mut child =
        spawn_with_fallback(command, &artifact, role, &profile, &result, &context_path)?;
    let mode = if cfg!(windows) && child.child.is_none() {
        "windows-wmi-fixed-role".to_owned()
    } else {
        configured_mode
    };
    let deadline = Instant::now() + Duration::from_secs(4);
    let identity = loop {
        if result.exists() {
            let ready = std::fs::read_to_string(&result)
                .map_err(|error| LaunchError(format!("read resident readiness: {error}")))?;
            let pid = ready
                .split(':')
                .next()
                .and_then(|value| value.parse::<u32>().ok())
                .ok_or_else(|| LaunchError("resident readiness has no valid pid".to_owned()))?;
            if pid != child.id() {
                if let Some(mut bootstrap) = child.child.take() {
                    let _ = bootstrap.wait();
                }
                child.pid = pid;
            }
            let identity = inspect_process(child.id())
                .map_err(|error| LaunchError(error.to_string()))?
                .ok_or_else(|| {
                    LaunchError("resident child exited before identity verification".to_owned())
                })?;
            break identity;
        }
        if child.has_exited()? && cfg!(windows) {
            return Err(LaunchError(
                "resident fixture exited before readiness".to_owned(),
            ));
        }
        if Instant::now() >= deadline {
            return Err(LaunchError(
                "resident launch did not report readiness within four seconds".to_owned(),
            ));
        }
        std::thread::sleep(Duration::from_millis(20));
    };
    let _ = std::fs::remove_file(&result);
    verify_detached(child.id())?;
    Ok((
        child,
        LaunchObservation {
            process: identity,
            mode,
            profile,
        },
    ))
}

/// Fixed-role entrypoint. The context path is created owner-only by the trusted parent and
/// removed by the child immediately after it has been parsed.
pub fn run_resident_child(
    role: &str,
    profile: &str,
    ready: &str,
    context: &str,
) -> Result<(), LaunchError> {
    sanitize_fixture_environment();
    if !matches!(role, "fixture" | "server" | "holder") {
        return Err(LaunchError("unapproved resident role".to_owned()));
    }
    let profile = std::fs::canonicalize(profile)
        .map_err(|error| LaunchError(format!("verify resident profile: {error}")))?;
    let current_dir = std::env::current_dir()
        .and_then(std::fs::canonicalize)
        .map_err(|error| LaunchError(format!("verify resident cwd: {error}")))?;
    if current_dir != profile {
        return Err(LaunchError(
            "resident cwd does not match its canonical profile".to_owned(),
        ));
    }
    let context_bytes = std::fs::read(context)
        .map_err(|error| LaunchError(format!("read resident role context: {error}")))?;
    let _ = std::fs::remove_file(context);
    match role {
        "server" => {
            crate::roles::server::run_server_child(&profile, Path::new(ready), &context_bytes)
                .map_err(LaunchError)
        }
        "holder" => {
            crate::roles::holder::run_holder_child(&profile, Path::new(ready), &context_bytes)
                .map_err(LaunchError)
        }
        "fixture" => {
            std::fs::write(ready, format!("{}:{role}\n", std::process::id()))
                .map_err(|error| LaunchError(format!("write resident readiness: {error}")))?;
            loop {
                std::thread::sleep(Duration::from_secs(60));
            }
        }
        _ => unreachable!(),
    }
}

struct ContextCleanup(PathBuf);
impl Drop for ContextCleanup {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.0);
    }
}

fn write_private_context(path: &Path, context: &impl Serialize) -> Result<(), LaunchError> {
    use std::io::Write;
    let bytes = serde_json::to_vec(context)
        .map_err(|error| LaunchError(format!("encode resident role context: {error}")))?;
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options
        .open(path)
        .map_err(|error| LaunchError(format!("create resident role context: {error}")))?;
    file.write_all(&bytes)
        .and_then(|()| file.sync_all())
        .map_err(|error| LaunchError(format!("commit resident role context: {error}")))
}

fn sanitize_fixture_environment() {
    const RETAINED: &[&str] = &["PATH", "TEMP", "TMP", "SYSTEMROOT", "WINDIR"];
    let retained = RETAINED
        .iter()
        .filter_map(|name| std::env::var_os(name).map(|value| (*name, value)))
        .collect::<Vec<_>>();
    let keys = std::env::vars_os().map(|(key, _)| key).collect::<Vec<_>>();
    // Security: this fixed-role entry executes before starting threads. Rust 2024 marks
    // process-global environment mutation unsafe; this entrypoint has exclusive startup custody.
    unsafe {
        for key in keys {
            std::env::remove_var(key);
        }
        for (name, value) in retained {
            std::env::set_var(name, value);
        }
    }
}

#[cfg(unix)]
fn configure_detached(command: &mut Command) -> Result<String, LaunchError> {
    use std::os::unix::process::CommandExt;
    unsafe {
        command.pre_exec(|| {
            if libc::setsid() == -1 {
                return Err(std::io::Error::last_os_error());
            }
            let child = libc::fork();
            if child == -1 {
                return Err(std::io::Error::last_os_error());
            }
            if child > 0 {
                libc::_exit(0);
            }
            Ok(())
        });
    }
    Ok("unix-double-fork-setsid-no-controlling-terminal".to_owned())
}

#[cfg(windows)]
fn configure_detached(command: &mut Command) -> Result<String, LaunchError> {
    use std::os::windows::process::CommandExt;
    const CREATE_BREAKAWAY_FROM_JOB: u32 = 0x01000000;
    const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
    const DETACHED_PROCESS: u32 = 0x00000008;
    command.creation_flags(CREATE_BREAKAWAY_FROM_JOB | CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS);
    Ok("windows-detached-breakaway".to_owned())
}

fn spawn_with_fallback(
    command: Command,
    _artifact: &Path,
    _role: ResidentRole,
    _profile: &Path,
    _result: &Path,
    _context: &Path,
) -> Result<ResidentProcess, LaunchError> {
    #[cfg(windows)]
    {
        // Platform: GitHub and packaged launchers can retain descendants in a foreign job even
        // when direct breakaway creation succeeds. WMI creates this fixed role outside that job.
        drop(command);
        return spawn_via_wmi(_artifact, _role, _profile, _result, _context).map_err(LaunchError);
    }
    #[cfg(not(windows))]
    let mut command = command;
    #[cfg(not(windows))]
    match command.spawn() {
        Ok(child) => Ok(ResidentProcess {
            pid: child.id(),
            child: Some(child),
        }),
        Err(error) => Err(LaunchError(format!(
            "spawn detached resident role: {error}"
        ))),
    }
}

#[cfg(windows)]
fn spawn_via_wmi(
    artifact: &Path,
    role: ResidentRole,
    profile: &Path,
    result: &Path,
    context: &Path,
) -> Result<ResidentProcess, String> {
    use windows_sys::Win32::Storage::FileSystem::SYNCHRONIZE;
    use windows_sys::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
    };
    // Security: PowerShell is only a fixed WMI client. Win32_Process.Create performs creation
    // outside the foreign job; no caller-supplied executable or argv is accepted.
    let quote = |value: &Path| value.to_string_lossy().replace('\'', "''");
    let command_line = format!(
        "\"{}\" --resident-role-child {} \"{}\" \"{}\" \"{}\"",
        artifact.display(),
        role.argument(),
        profile.display(),
        result.display(),
        context.display()
    )
    .replace('\'', "''");
    let script = format!(
        "$r=Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{{CommandLine='{command_line}';CurrentDirectory='{}'}}; if($r.ReturnValue -ne 0){{exit $r.ReturnValue}}; Write-Output $r.ProcessId",
        quote(profile)
    );
    let output = Command::new("powershell.exe")
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            &script,
        ])
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_owned());
    }
    let pid = String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse::<u32>()
        .map_err(|error| format!("parse WMI process id: {error}"))?;
    let handle = unsafe {
        OpenProcess(
            PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_TERMINATE | SYNCHRONIZE,
            0,
            pid,
        )
    };
    if handle.is_null() {
        return Err(format!(
            "open WMI resident process {pid}: {}",
            std::io::Error::last_os_error()
        ));
    }
    Ok(ResidentProcess {
        pid,
        child: None,
        handle,
    })
}

#[cfg(unix)]
fn verify_detached(pid: u32) -> Result<(), LaunchError> {
    let sid = unsafe { libc::getsid(pid as i32) };
    let group = unsafe { libc::getpgid(pid as i32) };
    if sid <= 0 || group != sid || sid == pid as i32 {
        return Err(LaunchError(format!(
            "resident child did not complete double-fork detachment: pid={pid} sid={sid} pgrp={group}"
        )));
    }
    Ok(())
}

#[cfg(windows)]
fn verify_detached(pid: u32) -> Result<(), LaunchError> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::JobObjects::IsProcessInJob;
    use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
    let process = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if process.is_null() {
        return Err(LaunchError(format!(
            "open detached process: {}",
            std::io::Error::last_os_error()
        )));
    }
    let mut in_job = 0;
    let accepted = unsafe { IsProcessInJob(process, std::ptr::null_mut(), &mut in_job) };
    unsafe {
        CloseHandle(process);
    }
    if accepted == 0 {
        return Err(LaunchError(format!(
            "inspect detached process job: {}",
            std::io::Error::last_os_error()
        )));
    }
    if in_job != 0 {
        return Err(LaunchError("resident child remained in a job".to_owned()));
    }
    Ok(())
}
