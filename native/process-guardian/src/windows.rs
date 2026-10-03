use std::ffi::OsStr;
use std::mem::{size_of, zeroed};
use std::os::windows::ffi::OsStrExt;
use std::ptr::{null, null_mut};

use windows_sys::Win32::Foundation::{
    CloseHandle, GetLastError, FILETIME, HANDLE, WAIT_FAILED, WAIT_OBJECT_0, WAIT_TIMEOUT,
};
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    SetInformationJobObject, TerminateJobObject,
};
use windows_sys::Win32::System::Threading::{
    CreateProcessW, GetExitCodeProcess, GetProcessTimes, OpenProcess, ResumeThread, WaitForMultipleObjects,
    WaitForSingleObject, CREATE_SUSPENDED, CREATE_UNICODE_ENVIRONMENT, INFINITE,
    PROCESS_INFORMATION, PROCESS_QUERY_LIMITED_INFORMATION, STARTUPINFOW,
};

use windows_sys::Win32::System::Console::SetConsoleCtrlHandler;

use crate::exit_notice::ExitNotice;
use crate::{Invocation, write_ready_status};

const SYNCHRONIZE_ACCESS: u32 = 0x0010_0000;
const ERROR_INVALID_PARAMETER: u32 = 87;

pub(super) fn inspect_process_start(pid: u32) -> Result<Option<String>, String> {
    let handle = unsafe {
        OpenProcess(
            SYNCHRONIZE_ACCESS | PROCESS_QUERY_LIMITED_INFORMATION,
            0,
            pid,
        )
    };
    if handle.is_null() {
        let error = unsafe { GetLastError() };
        if error == ERROR_INVALID_PARAMETER {
            return Ok(None);
        }
        return Err(format!(
            "cannot inspect process {pid}: {}",
            std::io::Error::from_raw_os_error(error as i32)
        ));
    }
    let process = OwnedHandle(handle);
    inspect_process_handle(process.raw())
}

fn inspect_process_handle(process: HANDLE) -> Result<Option<String>, String> {
    match unsafe { WaitForSingleObject(process, 0) } {
        WAIT_TIMEOUT => {}
        WAIT_OBJECT_0 => return Ok(None),
        WAIT_FAILED => return Err(last_error("cannot inspect process state")),
        outcome => return Err(format!("cannot inspect process state: unexpected wait result {outcome}")),
    }
    Ok(Some(format!(
        "windows-filetime:{}",
        process_creation_ticks(process)?
    )))
}

fn process_creation_ticks(process: HANDLE) -> Result<u64, String> {
    let mut creation: FILETIME = unsafe { zeroed() };
    let mut exit: FILETIME = unsafe { zeroed() };
    let mut kernel: FILETIME = unsafe { zeroed() };
    let mut user: FILETIME = unsafe { zeroed() };
    if unsafe { GetProcessTimes(process, &mut creation, &mut exit, &mut kernel, &mut user) } == 0 {
        return Err(last_error("cannot read process creation time"));
    }
    Ok(((creation.dwHighDateTime as u64) << 32) | creation.dwLowDateTime as u64)
}

pub(super) fn run(invocation: Invocation) -> Result<u8, String> {
    let parent = OwnedHandle::new(unsafe {
        OpenProcess(
            SYNCHRONIZE_ACCESS | PROCESS_QUERY_LIMITED_INFORMATION,
            0,
            invocation.parent_pid,
        )
    })
    .map_err(|error| format!("cannot observe Node guardian parent: {error}"))?;

    let job = OwnedHandle::new(unsafe { CreateJobObjectW(null(), null()) })
        .map_err(|error| format!("cannot create Job Object: {error}"))?;
    configure_job(job.raw())
        .map_err(|error| format!("instance {}: {error}", invocation.instance_id))?;

    let mut command_line = wide_null(&build_command_line(
        &invocation.executable,
        &invocation.arguments,
    ));
    let executable = wide_null(&invocation.executable);
    let mut startup: STARTUPINFOW = unsafe { zeroed() };
    startup.cb = size_of::<STARTUPINFOW>() as u32;
    let mut process_info: PROCESS_INFORMATION = unsafe { zeroed() };

    let created = unsafe {
        CreateProcessW(
            executable.as_ptr(),
            command_line.as_mut_ptr(),
            null_mut(),
            null_mut(),
            1,
            CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT,
            null(),
            null(),
            &startup,
            &mut process_info,
        )
    };
    if created == 0 {
        return Err(last_error("cannot create contained runtime"));
    }
    let child_process = OwnedHandle::new(process_info.hProcess)
        .map_err(|error| format!("contained process returned no handle: {error}"))?;
    let child_thread = OwnedHandle::new(process_info.hThread)
        .map_err(|error| format!("contained process returned no thread handle: {error}"))?;

    if unsafe { AssignProcessToJobObject(job.raw(), child_process.raw()) } == 0 {
        unsafe { TerminateJobObject(job.raw(), 125) };
        return Err(last_error("cannot assign runtime to Job Object"));
    }
    if unsafe { ResumeThread(child_thread.raw()) } == u32::MAX {
        unsafe { TerminateJobObject(job.raw(), 125) };
        return Err(last_error("cannot resume contained runtime"));
    }
    let start_identity = inspect_process_start(process_info.dwProcessId)?
        .ok_or_else(|| "contained runtime exited before identity observation".to_owned())?;
    let containment_token = format!("windows-job:{}:{}", std::process::id(), process_info.dwProcessId);
    if let Err(error) = write_ready_status(
        &invocation.status_file,
        process_info.dwProcessId,
        &start_identity,
        "windows-job",
        &containment_token,
    ) {
        unsafe { TerminateJobObject(job.raw(), 125) };
        return Err(error);
    }

    let handles = [child_process.raw(), parent.raw()];
    let wait = unsafe { WaitForMultipleObjects(handles.len() as u32, handles.as_ptr(), 0, INFINITE) };
    if wait == WAIT_OBJECT_0 + 1 {
        unsafe { TerminateJobObject(job.raw(), 143) };
        // Rationale: job termination is asynchronous; waiting keeps the runtime's last frame
        // from landing after the exit notice the caller prints next.
        unsafe { WaitForSingleObject(child_process.raw(), 2_000) };
        return Ok(143);
    }
    if wait != WAIT_OBJECT_0 {
        unsafe { TerminateJobObject(job.raw(), 125) };
        return Err(last_error("cannot wait for contained runtime"));
    }

    let mut exit_code = 1u32;
    if unsafe { GetExitCodeProcess(child_process.raw(), &mut exit_code) } == 0 {
        unsafe { TerminateJobObject(job.raw(), 125) };
        return Err(last_error("cannot read contained runtime exit code"));
    }

    // Security: the root has exited. Closing the Job Object is the terminal boundary for
    // every descendant that remained after the root's own graceful shutdown.
    unsafe { TerminateJobObject(job.raw(), exit_code) };
    Ok(exit_code.min(255) as u8)
}

/// Starts the process that delivers the exit notice if this guardian is killed with its owner.
pub(super) fn spawn_notice_watcher(notice: &str, status_file: &str, modes: &str) {
    let Ok(executable) = std::env::current_exe() else { return };
    // Platform: libuv's kill-on-close job allows silent breakaway, so a process this guardian creates
    // is outside the Node owner's job and outlives the owner's death.
    let _ = std::process::Command::new(executable)
        .args(["--watch-exit-notice", &std::process::id().to_string(), notice, status_file, modes])
        .stdin(std::process::Stdio::null())
        .spawn();
}

pub(super) fn watch_exit_notice(guardian_pid: u32, notice: String, status_file: &str, modes: &str) -> Result<u8, String> {
    // Rationale: the watcher shares the console; Ctrl+C there belongs to the runtime, not to it.
    unsafe { SetConsoleCtrlHandler(None, 1) };
    let guardian = OwnedHandle::new(unsafe { OpenProcess(SYNCHRONIZE_ACCESS, 0, guardian_pid) })
        .map_err(|error| format!("cannot observe guardian: {error}"))?;
    let armed = ExitNotice::for_watcher(notice.clone(), modes);
    unsafe { WaitForSingleObject(guardian.raw(), INFINITE) };
    if std::path::Path::new(&notice).exists() {
        // Rationale: the guardian's job closes asynchronously; waiting for the runtime keeps its
        // last frame from landing after the notice.
        if let Some(runtime) = std::fs::read_to_string(status_file).ok().and_then(|status| status_pid(&status)) {
            if let Ok(process) = OwnedHandle::new(unsafe { OpenProcess(SYNCHRONIZE_ACCESS, 0, runtime) }) {
                unsafe { WaitForSingleObject(process.raw(), 2_000) };
            }
        }
    }
    armed.deliver();
    Ok(0)
}

fn status_pid(status: &str) -> Option<u32> {
    let digits = status.split("\"pid\":").nth(1)?;
    digits.chars().take_while(char::is_ascii_digit).collect::<String>().parse().ok()
}

fn configure_job(job: HANDLE) -> Result<(), String> {
    let mut information: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = unsafe { zeroed() };
    information.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    let accepted = unsafe {
        SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &information as *const _ as *const _,
            size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        )
    };
    if accepted == 0 {
        return Err(last_error("cannot configure kill-on-close Job Object"));
    }
    Ok(())
}

fn build_command_line(executable: &str, arguments: &[String]) -> String {
    std::iter::once(executable)
        .chain(arguments.iter().map(String::as_str))
        .map(quote_windows_argument)
        .collect::<Vec<_>>()
        .join(" ")
}

fn quote_windows_argument(argument: &str) -> String {
    if !argument.is_empty()
        && !argument
            .chars()
            .any(|character| character == ' ' || character == '\t' || character == '"')
    {
        return argument.to_owned();
    }

    let mut quoted = String::from("\"");
    let mut backslashes = 0;
    for character in argument.chars() {
        if character == '\\' {
            backslashes += 1;
            continue;
        }
        if character == '"' {
            quoted.push_str(&"\\".repeat(backslashes * 2 + 1));
            quoted.push('"');
            backslashes = 0;
            continue;
        }
        quoted.push_str(&"\\".repeat(backslashes));
        backslashes = 0;
        quoted.push(character);
    }
    quoted.push_str(&"\\".repeat(backslashes * 2));
    quoted.push('"');
    quoted
}

fn wide_null(value: &str) -> Vec<u16> {
    OsStr::new(value).encode_wide().chain(Some(0)).collect()
}

fn last_error(context: &str) -> String {
    format!("{context}: {}", std::io::Error::last_os_error())
}

struct OwnedHandle(HANDLE);

impl OwnedHandle {
    fn new(handle: HANDLE) -> Result<Self, std::io::Error> {
        if handle.is_null() {
            Err(std::io::Error::last_os_error())
        } else {
            Ok(Self(handle))
        }
    }

    fn raw(&self) -> HANDLE {
        self.0
    }
}

impl Drop for OwnedHandle {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe { CloseHandle(self.0) };
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_command_line, inspect_process_handle, inspect_process_start,
        process_creation_ticks, quote_windows_argument, status_pid,
    };
    use std::os::windows::io::AsRawHandle;
    use std::process::Command;
    use windows_sys::Win32::Foundation::{HANDLE, WAIT_OBJECT_0};
    use windows_sys::Win32::System::Threading::WaitForSingleObject;

    #[test]
    fn reads_the_runtime_pid_from_ready_status() {
        assert_eq!(status_pid("{\"pid\":4242,\"startIdentity\":\"x\"}"), Some(4242));
        assert_eq!(status_pid("{}"), None);
    }

    #[test]
    fn quotes_windows_arguments_without_shell_interpretation() {
        assert_eq!(quote_windows_argument("plain"), "plain");
        assert_eq!(quote_windows_argument("value with spaces"), "\"value with spaces\"");
        assert_eq!(quote_windows_argument(""), "\"\"");
        assert_eq!(
            build_command_line("C:\\Program Files\\node.exe", &["a\\\"b".to_owned()]),
            "\"C:\\Program Files\\node.exe\" \"a\\\\\\\"b\"",
        );
    }

    #[test]
    fn rejects_a_terminated_but_still_queryable_process_object() {
        let mut child = Command::new("cmd.exe")
            .args(["/D", "/C", "exit /b 0"])
            .spawn()
            .expect("spawn short-lived Windows child");
        let pid = child.id();
        let status = child.wait().expect("wait for Windows child");
        assert!(status.success());

        let process = child.as_raw_handle() as HANDLE;
        assert_eq!(unsafe { WaitForSingleObject(process, 0) }, WAIT_OBJECT_0);
        assert!(process_creation_ticks(process).is_ok());
        assert_eq!(inspect_process_handle(process).expect("inspect retained process object"), None);
        assert_eq!(inspect_process_start(pid).expect("inspect terminated PID"), None);
    }
}
