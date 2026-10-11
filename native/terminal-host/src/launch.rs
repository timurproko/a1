use std::fmt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

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
        #[cfg(not(windows))]
        unreachable!()
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
    let mut command = Command::new(&artifact);
    command
        .args([
            "--resident-fixture-child",
            role.argument(),
            &profile.to_string_lossy(),
            &result.to_string_lossy(),
        ])
        .env_clear()
        .env("PATH", std::env::var_os("PATH").unwrap_or_default())
        .current_dir(&profile)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    let configured_mode = configure_detached(&mut command)?;
    let mut child = spawn_with_fallback(command, &artifact, role, &profile, &result)?;
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

/// Fixed fixture entrypoint. Production server/holder role bodies are introduced by milestone 2.
pub fn run_fixture_child(role: &str, profile: &str, ready: &str) -> Result<(), LaunchError> {
    sanitize_fixture_environment();
    if !matches!(role, "fixture" | "server" | "holder") {
        return Err(LaunchError("unapproved resident role".to_owned()));
    }
    let profile = std::fs::canonicalize(profile)
        .map_err(|error| LaunchError(format!("verify fixture profile: {error}")))?;
    if std::env::current_dir().map_err(|error| LaunchError(error.to_string()))? != profile {
        return Err(LaunchError(
            "resident fixture cwd does not match its canonical profile".to_owned(),
        ));
    }
    std::fs::write(ready, format!("{}:{}\n", std::process::id(), role))
        .map_err(|error| LaunchError(format!("write resident readiness: {error}")))?;
    loop {
        std::thread::sleep(Duration::from_secs(60));
    }
}

fn sanitize_fixture_environment() {
    let path = std::env::var_os("PATH").unwrap_or_default();
    let keys = std::env::vars_os().map(|(key, _)| key).collect::<Vec<_>>();
    // This fixed-role fixture executes before starting threads. Rust 2024 marks process-global
    // environment mutation unsafe; this entrypoint has exclusive startup custody here.
    unsafe {
        for key in keys {
            std::env::remove_var(key);
        }
        std::env::set_var("PATH", path);
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
    mut command: Command,
    _artifact: &Path,
    _role: ResidentRole,
    _profile: &Path,
    _result: &Path,
) -> Result<ResidentProcess, LaunchError> {
    match command.spawn() {
        Ok(child) => Ok(ResidentProcess {
            pid: child.id(), child: Some(child),
            #[cfg(windows)] handle: std::ptr::null_mut(),
        }),
        #[cfg(windows)]
        Err(direct_error) => spawn_via_wmi(_artifact, _role, _profile, _result)
            .map_err(|wmi_error| LaunchError(format!("direct detached launch failed ({direct_error}); WMI fallback failed ({wmi_error})"))),
        #[cfg(not(windows))]
        Err(error) => Err(LaunchError(format!("spawn detached resident role: {error}"))),
    }
}

#[cfg(windows)]
fn spawn_via_wmi(
    artifact: &Path,
    role: ResidentRole,
    profile: &Path,
    result: &Path,
) -> Result<ResidentProcess, String> {
    use windows_sys::Win32::Storage::FileSystem::SYNCHRONIZE;
    use windows_sys::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
    };
    // The PowerShell process is only a fixed WMI client. Win32_Process.Create performs the
    // actual creation outside the foreign job; no caller-supplied executable or argv is accepted.
    let quote = |value: &Path| value.to_string_lossy().replace('\'', "''");
    let command_line = format!(
        "\"{}\" --resident-fixture-child {} \"{}\" \"{}\"",
        artifact.display(),
        role.argument(),
        profile.display(),
        result.display()
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
