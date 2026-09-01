use std::ffi::OsStr;
use std::mem::{size_of, zeroed};
use std::os::windows::ffi::OsStrExt;
use std::ptr::{null, null_mut};

use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, FILETIME, HANDLE, WAIT_OBJECT_0};
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    SetInformationJobObject, TerminateJobObject,
};
use windows_sys::Win32::System::Threading::{
    CreateProcessW, GetExitCodeProcess, GetProcessTimes, OpenProcess, ResumeThread, WaitForMultipleObjects,
    CREATE_SUSPENDED, CREATE_UNICODE_ENVIRONMENT, INFINITE, PROCESS_INFORMATION,
    PROCESS_QUERY_LIMITED_INFORMATION, STARTUPINFOW,
};

use crate::{Invocation, write_ready_status};

const SYNCHRONIZE_ACCESS: u32 = 0x0010_0000;
const ERROR_INVALID_PARAMETER: u32 = 87;

pub(super) fn inspect_process_start(pid: u32) -> Result<Option<String>, String> {
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if handle.is_null() {
        let error = unsafe { GetLastError() };
        if error == ERROR_INVALID_PARAMETER {
            return Ok(None);
        }
        return Err(format!("cannot inspect process {pid}: {}", std::io::Error::from_raw_os_error(error as i32)));
    }
    let process = OwnedHandle(handle);
    let mut creation: FILETIME = unsafe { zeroed() };
    let mut exit: FILETIME = unsafe { zeroed() };
    let mut kernel: FILETIME = unsafe { zeroed() };
    let mut user: FILETIME = unsafe { zeroed() };
    if unsafe { GetProcessTimes(process.raw(), &mut creation, &mut exit, &mut kernel, &mut user) } == 0 {
        return Err(last_error("cannot read process creation time"));
    }
    let ticks = ((creation.dwHighDateTime as u64) << 32) | creation.dwLowDateTime as u64;
    Ok(Some(format!("windows-filetime:{ticks}")))
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
    use super::{build_command_line, quote_windows_argument};

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
}
