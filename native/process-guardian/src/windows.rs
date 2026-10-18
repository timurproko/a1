use std::ffi::OsStr;
use std::mem::{size_of, zeroed};
use std::os::windows::ffi::OsStrExt;
use std::ptr::{null, null_mut};
use std::sync::Mutex;

use windows_sys::Win32::Foundation::{
    CloseHandle, DUPLICATE_SAME_ACCESS, DuplicateHandle, FILETIME, GetLastError, HANDLE,
    INVALID_HANDLE_VALUE, WAIT_FAILED, WAIT_OBJECT_0, WAIT_TIMEOUT,
};
use windows_sys::Win32::System::Console::{
    GetStdHandle, STD_ERROR_HANDLE, STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, SetConsoleCtrlHandler,
};
use windows_sys::Win32::System::JobObjects::{
    CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
    JobObjectExtendedLimitInformation, SetInformationJobObject, TerminateJobObject,
};
use windows_sys::Win32::System::Threading::{
    CREATE_BREAKAWAY_FROM_JOB, CREATE_UNICODE_ENVIRONMENT, CreateProcessW,
    DeleteProcThreadAttributeList, EXTENDED_STARTUPINFO_PRESENT, GetCurrentProcess,
    GetExitCodeProcess, GetProcessTimes, INFINITE, InitializeProcThreadAttributeList, OpenProcess,
    PROC_THREAD_ATTRIBUTE_JOB_LIST, PROCESS_INFORMATION, PROCESS_QUERY_LIMITED_INFORMATION,
    STARTF_USESTDHANDLES, STARTUPINFOEXW, TerminateProcess, UpdateProcThreadAttribute,
    WaitForSingleObject,
};

use crate::SpawnContainedOptions;

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
    let process = OwnedHandle::new(handle)?;
    inspect_process_handle(process.raw())
}

fn inspect_process_handle(process: HANDLE) -> Result<Option<String>, String> {
    match unsafe { WaitForSingleObject(process, 0) } {
        WAIT_TIMEOUT => {}
        WAIT_OBJECT_0 => return Ok(None),
        WAIT_FAILED => return Err(last_error("cannot inspect process state")),
        outcome => {
            return Err(format!(
                "cannot inspect process state: unexpected wait result {outcome}"
            ));
        }
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

pub(super) struct Runtime {
    process: OwnedHandle,
    job: Mutex<Option<OwnedHandle>>,
    pid: u32,
    start_identity: String,
    containment_token: String,
    wait_result: Mutex<Option<u32>>,
}

pub(super) fn spawn(options: SpawnContainedOptions) -> Result<Runtime, String> {
    let job = OwnedHandle::new(unsafe { CreateJobObjectW(null(), null()) })
        .map_err(|error| format!("cannot create Job Object: {error}"))?;
    configure_job(job.raw())
        .map_err(|error| format!("instance {}: {error}", options.instance_id))?;

    let mut attribute_bytes = 0usize;
    unsafe {
        InitializeProcThreadAttributeList(null_mut(), 1, 0, &mut attribute_bytes);
    }
    if attribute_bytes == 0 {
        return Err(last_error("cannot size process thread attribute list"));
    }
    let mut attribute_storage = vec![0u8; attribute_bytes];
    let attribute_list = attribute_storage.as_mut_ptr().cast();
    if unsafe { InitializeProcThreadAttributeList(attribute_list, 1, 0, &mut attribute_bytes) } == 0
    {
        return Err(last_error(
            "cannot initialize process thread attribute list",
        ));
    }
    let attributes = AttributeList(attribute_list);
    let job_handle = job.raw();
    if unsafe {
        UpdateProcThreadAttribute(
            attributes.0,
            0,
            PROC_THREAD_ATTRIBUTE_JOB_LIST as usize,
            (&job_handle as *const HANDLE).cast(),
            size_of::<HANDLE>(),
            null_mut(),
            null(),
        )
    } == 0
    {
        return Err(last_error(
            "cannot assign the Job Object at process creation",
        ));
    }

    let mut command_line = wide_null(&build_command_line(&options.executable, &options.arguments));
    let executable = wide_null(&options.executable);
    let cwd = wide_null(&options.cwd);
    let mut environment = environment_block(&options.environment);
    let input = duplicate_standard_handle(STD_INPUT_HANDLE)?;
    let output = duplicate_standard_handle(STD_OUTPUT_HANDLE)?;
    let error = duplicate_standard_handle(STD_ERROR_HANDLE)?;
    let mut startup: STARTUPINFOEXW = unsafe { zeroed() };
    startup.StartupInfo.cb = size_of::<STARTUPINFOEXW>() as u32;
    startup.lpAttributeList = attributes.0;
    if let (Some(input), Some(output), Some(error)) = (&input, &output, &error) {
        startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
        startup.StartupInfo.hStdInput = input.raw();
        startup.StartupInfo.hStdOutput = output.raw();
        startup.StartupInfo.hStdError = error.raw();
    }
    let mut process_info: PROCESS_INFORMATION = unsafe { zeroed() };

    let created = unsafe {
        CreateProcessW(
            executable.as_ptr(),
            command_line.as_mut_ptr(),
            null(),
            null(),
            1,
            EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT,
            environment.as_mut_ptr().cast(),
            cwd.as_ptr(),
            (&startup as *const STARTUPINFOEXW).cast(),
            &mut process_info,
        )
    };
    if created == 0 {
        return Err(last_error("cannot create contained runtime"));
    }
    let child_process = OwnedHandle::new(process_info.hProcess)
        .map_err(|error| format!("contained process returned no handle: {error}"))?;
    let _child_thread = OwnedHandle::new(process_info.hThread)
        .map_err(|error| format!("contained process returned no thread handle: {error}"))?;

    let start_identity = inspect_process_start(process_info.dwProcessId)?.ok_or_else(|| {
        unsafe { TerminateJobObject(job.raw(), 125) };
        "contained runtime exited before identity observation".to_owned()
    })?;
    let containment_token = format!(
        "windows-job:{}:{}",
        std::process::id(),
        process_info.dwProcessId
    );

    Ok(Runtime {
        process: child_process,
        job: Mutex::new(Some(job)),
        pid: process_info.dwProcessId,
        start_identity,
        containment_token,
        wait_result: Mutex::new(None),
    })
}

impl Runtime {
    pub(super) fn pid(&self) -> u32 {
        self.pid
    }

    pub(super) fn start_identity(&self) -> &str {
        &self.start_identity
    }

    pub(super) fn containment_provider(&self) -> &str {
        "windows-job"
    }

    pub(super) fn containment_token(&self) -> &str {
        &self.containment_token
    }

    pub(super) fn process_group(&self) -> Option<i32> {
        None
    }

    pub(super) fn foreground_group(&self) -> Option<i32> {
        None
    }

    pub(super) fn wait(&self) -> Result<u32, String> {
        if let Some(result) = *self
            .wait_result
            .lock()
            .map_err(|_| "runtime wait state is poisoned")?
        {
            return Ok(result);
        }
        let wait = unsafe { WaitForSingleObject(self.process.raw(), INFINITE) };
        if wait != WAIT_OBJECT_0 {
            return Err(last_error("cannot wait for contained runtime"));
        }
        let mut exit_code = 1u32;
        if unsafe { GetExitCodeProcess(self.process.raw(), &mut exit_code) } == 0 {
            return Err(last_error("cannot read contained runtime exit code"));
        }
        let exit_code = exit_code.min(255);
        *self
            .wait_result
            .lock()
            .map_err(|_| "runtime wait state is poisoned")? = Some(exit_code);
        if let Ok(job) = self.job.lock()
            && let Some(job) = job.as_ref()
        {
            // Security: once the root exits, terminate any descendants that outlived it.
            unsafe { TerminateJobObject(job.raw(), exit_code) };
        }
        Ok(exit_code)
    }

    pub(super) fn terminate(&self, code: u32) -> Result<(), String> {
        let job = self
            .job
            .lock()
            .map_err(|_| "runtime job state is poisoned")?;
        if let Some(job) = job.as_ref()
            && unsafe { TerminateJobObject(job.raw(), code) } == 0
        {
            return Err(last_error("cannot terminate contained Job Object"));
        }
        Ok(())
    }

    pub(super) fn stop(&self) -> Result<(), String> {
        if unsafe { TerminateProcess(self.process.raw(), 143) } == 0 {
            let error = unsafe { GetLastError() };
            if error != ERROR_INVALID_PARAMETER {
                return Err(format!(
                    "cannot stop contained runtime: {}",
                    std::io::Error::from_raw_os_error(error as i32)
                ));
            }
        }
        Ok(())
    }

    pub(super) fn close(&self) -> Result<(), String> {
        let mut job = self
            .job
            .lock()
            .map_err(|_| "runtime job state is poisoned")?;
        if let Some(job) = job.as_ref() {
            unsafe { TerminateJobObject(job.raw(), 143) };
        }
        job.take();
        Ok(())
    }
}

impl Drop for Runtime {
    fn drop(&mut self) {
        if let Ok(job) = self.job.get_mut()
            && let Some(job) = job.take()
        {
            unsafe { TerminateJobObject(job.raw(), 143) };
        }
    }
}

pub(super) fn spawn_watcher(executable: &str, arguments: &[String]) -> Result<u32, String> {
    let mut command_line = wide_null(&build_command_line(executable, arguments));
    let executable = wide_null(executable);
    let input = duplicate_standard_handle(STD_INPUT_HANDLE)?;
    let output = duplicate_standard_handle(STD_OUTPUT_HANDLE)?;
    let error = duplicate_standard_handle(STD_ERROR_HANDLE)?;
    let mut startup: windows_sys::Win32::System::Threading::STARTUPINFOW = unsafe { zeroed() };
    startup.cb = size_of::<windows_sys::Win32::System::Threading::STARTUPINFOW>() as u32;
    if let (Some(input), Some(output), Some(error)) = (&input, &output, &error) {
        startup.dwFlags = STARTF_USESTDHANDLES;
        startup.hStdInput = input.raw();
        startup.hStdOutput = output.raw();
        startup.hStdError = error.raw();
    }
    let mut process_info: PROCESS_INFORMATION = unsafe { zeroed() };
    if unsafe {
        CreateProcessW(
            executable.as_ptr(),
            command_line.as_mut_ptr(),
            null(),
            null(),
            1,
            CREATE_BREAKAWAY_FROM_JOB | CREATE_UNICODE_ENVIRONMENT,
            null(),
            null(),
            &startup,
            &mut process_info,
        )
    } == 0
    {
        return Err(last_error("cannot create exit watcher"));
    }
    let _process = OwnedHandle::new(process_info.hProcess)?;
    let _thread = OwnedHandle::new(process_info.hThread)?;
    Ok(process_info.dwProcessId)
}

fn duplicate_standard_handle(kind: u32) -> Result<Option<OwnedHandle>, String> {
    let source = unsafe { GetStdHandle(kind) };
    if source.is_null() || source == INVALID_HANDLE_VALUE {
        return Ok(None);
    }
    let current = unsafe { GetCurrentProcess() };
    let mut duplicate = null_mut();
    if unsafe {
        DuplicateHandle(
            current,
            source,
            current,
            &mut duplicate,
            0,
            1,
            DUPLICATE_SAME_ACCESS,
        )
    } == 0
    {
        return Err(last_error("cannot duplicate inherited standard handle"));
    }
    OwnedHandle::new(duplicate).map(Some)
}

pub(super) fn wait_for_process_exit(pid: u32) -> Result<(), String> {
    let handle = unsafe { OpenProcess(SYNCHRONIZE_ACCESS, 0, pid) };
    if handle.is_null() {
        let error = unsafe { GetLastError() };
        if error == ERROR_INVALID_PARAMETER {
            return Ok(());
        }
        return Err(format!(
            "cannot observe process {pid}: {}",
            std::io::Error::from_raw_os_error(error as i32)
        ));
    }
    let process = OwnedHandle::new(handle)?;
    if unsafe { WaitForSingleObject(process.raw(), INFINITE) } == WAIT_FAILED {
        return Err(last_error("cannot wait for process exit"));
    }
    Ok(())
}

pub(super) fn ignore_console_control() -> Result<(), String> {
    if unsafe { SetConsoleCtrlHandler(None, 1) } == 0 {
        return Err(last_error("cannot ignore console control events"));
    }
    Ok(())
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

fn environment_block(environment: &std::collections::HashMap<String, String>) -> Vec<u16> {
    let mut entries = environment.iter().collect::<Vec<_>>();
    entries.sort_by(|(left, _), (right, _)| left.to_uppercase().cmp(&right.to_uppercase()));
    let mut block = Vec::new();
    for (key, value) in entries {
        block.extend(OsStr::new(&format!("{key}={value}")).encode_wide());
        block.push(0);
    }
    block.push(0);
    block
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

struct AttributeList(windows_sys::Win32::System::Threading::LPPROC_THREAD_ATTRIBUTE_LIST);

impl Drop for AttributeList {
    fn drop(&mut self) {
        unsafe { DeleteProcThreadAttributeList(self.0) };
    }
}

struct OwnedHandle(HANDLE);

unsafe impl Send for OwnedHandle {}
unsafe impl Sync for OwnedHandle {}

impl OwnedHandle {
    fn new(handle: HANDLE) -> Result<Self, String> {
        if handle.is_null() {
            Err(std::io::Error::last_os_error().to_string())
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
        build_command_line, inspect_process_handle, inspect_process_start, process_creation_ticks,
        quote_windows_argument,
    };
    use std::os::windows::io::AsRawHandle;
    use std::process::Command;
    use windows_sys::Win32::Foundation::{HANDLE, WAIT_OBJECT_0};
    use windows_sys::Win32::System::Threading::WaitForSingleObject;

    #[test]
    fn quotes_windows_arguments_without_shell_interpretation() {
        assert_eq!(quote_windows_argument("plain"), "plain");
        assert_eq!(
            quote_windows_argument("value with spaces"),
            "\"value with spaces\""
        );
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
        assert_eq!(
            inspect_process_handle(process).expect("inspect retained process object"),
            None
        );
        assert_eq!(
            inspect_process_start(pid).expect("inspect terminated PID"),
            None
        );
    }
}
