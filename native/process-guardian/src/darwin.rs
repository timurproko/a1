use std::ffi::CString;
use std::ptr::{null, null_mut};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

use crate::SpawnContainedOptions;

const CLEANUP_DEADLINE: Duration = Duration::from_millis(1_500);
const POLL_INTERVAL: Duration = Duration::from_millis(25);

pub(super) struct Runtime {
    pid: u32,
    process_group: i32,
    original_foreground_group: Option<i32>,
    start_identity: String,
    containment_token: String,
    wait_result: Mutex<Option<u32>>,
    closed: AtomicBool,
}

pub(super) fn spawn(options: SpawnContainedOptions) -> Result<Runtime, String> {
    let original_foreground_group = foreground_group();
    unsafe {
        libc::signal(libc::SIGTTOU, libc::SIG_IGN);
    }

    let executable = c_string(&options.executable, "contained executable")?;
    let cwd = c_string(&options.cwd, "contained working directory")?;
    let mut argument_values = Vec::with_capacity(options.arguments.len() + 1);
    argument_values.push(c_string(&options.executable, "contained executable")?);
    for argument in &options.arguments {
        argument_values.push(c_string(argument, "contained argument")?);
    }
    let mut arguments = argument_values
        .iter()
        .map(|value| value.as_ptr().cast_mut())
        .collect::<Vec<_>>();
    arguments.push(null_mut());

    let mut environment_entries = options.environment.iter().collect::<Vec<_>>();
    environment_entries.sort_by(|(left, _), (right, _)| left.cmp(right));
    let environment_values = environment_entries
        .into_iter()
        .map(|(key, value)| c_string(&format!("{key}={value}"), "contained environment"))
        .collect::<Result<Vec<_>, _>>()?;
    let mut environment = environment_values
        .iter()
        .map(|value| value.as_ptr().cast_mut())
        .collect::<Vec<_>>();
    environment.push(null_mut());

    let mut attributes = SpawnAttributes::new()?;
    posix_result(
        unsafe { libc::posix_spawnattr_setflags(&mut attributes.value, libc::POSIX_SPAWN_SETPGROUP as i16) },
        "cannot configure the contained process group",
    )?;
    posix_result(
        unsafe { libc::posix_spawnattr_setpgroup(&mut attributes.value, 0) },
        "cannot configure the contained process-group leader",
    )?;
    let mut actions = SpawnFileActions::new()?;
    posix_result(
        unsafe { addchdir(&mut actions.value, cwd.as_ptr()) },
        "cannot configure the contained working directory",
    )?;

    let mut pid = 0;
    posix_result(
        unsafe {
            libc::posix_spawn(
                &mut pid,
                executable.as_ptr(),
                &actions.value,
                &attributes.value,
                arguments.as_ptr(),
                environment.as_ptr(),
            )
        },
        "cannot create contained runtime",
    )?;
    let process_group = pid;
    if let Err(error) = transfer_foreground(process_group) {
        stop_group(process_group);
        let _ = restore_foreground(original_foreground_group);
        return Err(error);
    }
    let start_identity = inspect_process_start(pid as u32)?.ok_or_else(|| {
        stop_group(process_group);
        let _ = restore_foreground(original_foreground_group);
        "contained runtime exited before its start identity was observed".to_owned()
    })?;
    let containment_token = format!("darwin-pgrp:{}:{process_group}", std::process::id());

    Ok(Runtime {
        pid: pid as u32,
        process_group,
        original_foreground_group,
        start_identity,
        containment_token,
        wait_result: Mutex::new(None),
        closed: AtomicBool::new(false),
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
        "darwin-process-group"
    }

    pub(super) fn containment_token(&self) -> &str {
        &self.containment_token
    }

    pub(super) fn process_group(&self) -> Option<i32> {
        Some(self.process_group)
    }

    pub(super) fn wait(&self) -> Result<u32, String> {
        if let Some(result) = *self.wait_result.lock().map_err(|_| "runtime wait state is poisoned")? {
            return Ok(result);
        }
        let mut status = 0;
        let waited = loop {
            let result = unsafe { libc::waitpid(self.pid as i32, &mut status, 0) };
            if result >= 0 {
                break result;
            }
            if std::io::Error::last_os_error().raw_os_error() != Some(libc::EINTR) {
                return Err(format!(
                    "cannot wait for contained runtime: {}",
                    std::io::Error::last_os_error()
                ));
            }
        };
        if waited != self.pid as i32 {
            return Err("contained runtime wait returned a mismatched PID".to_owned());
        }
        let code = wait_status_code(status);
        stop_group(self.process_group);
        let _ = restore_foreground(self.original_foreground_group);
        self.closed.store(true, Ordering::Release);
        *self.wait_result.lock().map_err(|_| "runtime wait state is poisoned")? = Some(code);
        Ok(code)
    }

    pub(super) fn terminate(&self, _code: u32) -> Result<(), String> {
        signal_group(self.process_group, libc::SIGKILL)
    }

    pub(super) fn stop(&self) -> Result<(), String> {
        signal_group(self.process_group, libc::SIGTERM)
    }

    pub(super) fn close(&self) -> Result<(), String> {
        if !self.closed.swap(true, Ordering::AcqRel) {
            stop_group(self.process_group);
            restore_foreground(self.original_foreground_group)?;
        }
        Ok(())
    }
}

impl Drop for Runtime {
    fn drop(&mut self) {
        if !self.closed.swap(true, Ordering::AcqRel) {
            stop_group(self.process_group);
            let _ = restore_foreground(self.original_foreground_group);
        }
    }
}

pub(super) fn inspect_process_start(pid: u32) -> Result<Option<String>, String> {
    let mut info: libc::proc_bsdinfo = unsafe { std::mem::zeroed() };
    let expected = std::mem::size_of::<libc::proc_bsdinfo>();
    let received = unsafe {
        libc::proc_pidinfo(
            pid as libc::c_int,
            libc::PROC_PIDTBSDINFO,
            0,
            (&mut info as *mut libc::proc_bsdinfo).cast(),
            expected as libc::c_int,
        )
    };
    if received == 0 {
        if !process_exists(pid as i32) {
            return Ok(None);
        }
        return Err(format!(
            "cannot inspect Darwin process start time: {}",
            std::io::Error::last_os_error()
        ));
    }
    if received as usize != expected || info.pbi_pid != pid {
        return Err(
            "Darwin process inspection returned incomplete or mismatched identity".to_owned(),
        );
    }
    Ok(Some(format!(
        "darwin-proc-start:{}:{}",
        info.pbi_start_tvsec, info.pbi_start_tvusec
    )))
}

pub(super) fn wait_for_process_exit(pid: u32) -> Result<(), String> {
    while process_exists(pid as i32) {
        thread::sleep(POLL_INTERVAL);
    }
    Ok(())
}

pub(super) fn stop_process_group(process_group: i32) -> Result<(), String> {
    if process_group <= 0 {
        return Err("process group must be positive".to_owned());
    }
    stop_group(process_group);
    Ok(())
}

pub(super) fn restore_foreground_group(process_group: i32) -> Result<(), String> {
    if process_group <= 0 {
        return Ok(());
    }
    restore_foreground(Some(process_group))
}

fn wait_status_code(status: i32) -> u32 {
    if libc::WIFEXITED(status) {
        libc::WEXITSTATUS(status).clamp(0, 255) as u32
    } else if libc::WIFSIGNALED(status) {
        (128 + libc::WTERMSIG(status)).clamp(0, 255) as u32
    } else {
        1
    }
}

fn stop_group(process_group: i32) {
    let _ = signal_group(process_group, libc::SIGTERM);
    if wait_for_group_exit(process_group, CLEANUP_DEADLINE) {
        return;
    }
    let _ = signal_group(process_group, libc::SIGKILL);
    let _ = wait_for_group_exit(process_group, CLEANUP_DEADLINE);
}

fn signal_group(process_group: i32, signal: i32) -> Result<(), String> {
    if process_group <= 0 {
        return Ok(());
    }
    if unsafe { libc::kill(-process_group, signal) } != 0 {
        let error = std::io::Error::last_os_error();
        if error.raw_os_error() != Some(libc::ESRCH) {
            return Err(format!("cannot signal contained process group: {error}"));
        }
    }
    Ok(())
}

fn wait_for_group_exit(process_group: i32, deadline: Duration) -> bool {
    let end = Instant::now() + deadline;
    while Instant::now() < end {
        if !process_group_exists(process_group) {
            return true;
        }
        thread::sleep(POLL_INTERVAL);
    }
    !process_group_exists(process_group)
}

fn process_exists(pid: i32) -> bool {
    if pid <= 0 {
        return false;
    }
    let result = unsafe { libc::kill(pid, 0) };
    result == 0 || std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
}

fn process_group_exists(process_group: i32) -> bool {
    if process_group <= 0 {
        return false;
    }
    let result = unsafe { libc::kill(-process_group, 0) };
    result == 0 || std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
}

fn foreground_group() -> Option<i32> {
    if unsafe { libc::isatty(libc::STDIN_FILENO) } != 1 {
        return None;
    }
    let group = unsafe { libc::tcgetpgrp(libc::STDIN_FILENO) };
    (group > 0).then_some(group)
}

fn transfer_foreground(process_group: i32) -> Result<(), String> {
    if unsafe { libc::isatty(libc::STDIN_FILENO) } != 1 {
        return Ok(());
    }
    if unsafe { libc::tcsetpgrp(libc::STDIN_FILENO, process_group) } != 0 {
        return Err(format!(
            "cannot transfer the inherited terminal foreground group: {}",
            std::io::Error::last_os_error()
        ));
    }
    Ok(())
}

fn restore_foreground(process_group: Option<i32>) -> Result<(), String> {
    if let Some(process_group) = process_group
        && unsafe { libc::tcsetpgrp(libc::STDIN_FILENO, process_group) } != 0
    {
        return Err(format!(
            "cannot restore the inherited terminal foreground group: {}",
            std::io::Error::last_os_error()
        ));
    }
    Ok(())
}

fn c_string(value: &str, description: &str) -> Result<CString, String> {
    CString::new(value).map_err(|_| format!("{description} contains a null byte"))
}

fn posix_result(result: i32, context: &str) -> Result<(), String> {
    if result == 0 {
        Ok(())
    } else {
        Err(format!(
            "{context}: {}",
            std::io::Error::from_raw_os_error(result)
        ))
    }
}

unsafe extern "C" {
    #[link_name = "posix_spawn_file_actions_addchdir_np"]
    fn addchdir(
        actions: *mut libc::posix_spawn_file_actions_t,
        path: *const libc::c_char,
    ) -> libc::c_int;
}

struct SpawnAttributes {
    value: libc::posix_spawnattr_t,
}

impl SpawnAttributes {
    fn new() -> Result<Self, String> {
        let mut value = unsafe { std::mem::zeroed() };
        posix_result(
            unsafe { libc::posix_spawnattr_init(&mut value) },
            "cannot initialize process spawn attributes",
        )?;
        Ok(Self { value })
    }
}

impl Drop for SpawnAttributes {
    fn drop(&mut self) {
        unsafe { libc::posix_spawnattr_destroy(&mut self.value) };
    }
}

struct SpawnFileActions {
    value: libc::posix_spawn_file_actions_t,
}

impl SpawnFileActions {
    fn new() -> Result<Self, String> {
        let mut value = unsafe { std::mem::zeroed() };
        posix_result(
            unsafe { libc::posix_spawn_file_actions_init(&mut value) },
            "cannot initialize process spawn file actions",
        )?;
        Ok(Self { value })
    }
}

impl Drop for SpawnFileActions {
    fn drop(&mut self) {
        unsafe { libc::posix_spawn_file_actions_destroy(&mut self.value) };
    }
}

#[cfg(test)]
mod tests {
    use super::inspect_process_start;

    #[test]
    fn inspects_the_current_process_start_identity() {
        assert!(
            inspect_process_start(std::process::id())
                .expect("inspect current process")
                .expect("current process is alive")
                .starts_with("darwin-proc-start:")
        );
    }
}
