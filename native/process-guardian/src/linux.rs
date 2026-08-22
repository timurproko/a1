use std::os::unix::process::{CommandExt, ExitStatusExt};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use crate::{Invocation, write_ready_status};

const CLEANUP_DEADLINE: Duration = Duration::from_millis(1_500);
const POLL_INTERVAL: Duration = Duration::from_millis(25);

pub(super) fn run(invocation: Invocation) -> Result<u8, String> {
    let original_foreground_group = foreground_group();
    unsafe {
        libc::signal(libc::SIGTTOU, libc::SIG_IGN);
    }

    let mut command = Command::new(&invocation.executable);
    command
        .args(&invocation.arguments)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());
    unsafe {
        command.pre_exec(|| {
            if libc::setpgid(0, 0) != 0 {
                return Err(std::io::Error::last_os_error());
            }
            libc::signal(libc::SIGTTOU, libc::SIG_DFL);
            Ok(())
        });
    }
    let mut child = command
        .spawn()
        .map_err(|error| format!("cannot create contained runtime: {error}"))?;
    let process_group = child.id() as i32;
    transfer_foreground(process_group)?;
    let start_identity = process_start_identity(child.id())?;
    let containment_token = format!("linux-pgrp:{}:{}", std::process::id(), process_group);
    if let Err(error) = write_ready_status(
        &invocation.status_file,
        child.id(),
        &start_identity,
        "linux-process-group",
        &containment_token,
    ) {
        stop_group(process_group);
        restore_foreground(original_foreground_group);
        return Err(error);
    }

    let status = loop {
        if let Some(status) = child
            .try_wait()
            .map_err(|error| format!("cannot observe contained runtime: {error}"))?
        {
            break status;
        }
        if !process_exists(invocation.parent_pid as i32) {
            stop_group(process_group);
            restore_foreground(original_foreground_group);
            return Ok(143);
        }
        thread::sleep(POLL_INTERVAL);
    };

    stop_group(process_group);
    restore_foreground(original_foreground_group);
    let code = status
        .code()
        .unwrap_or_else(|| 128 + status.signal().unwrap_or(libc::SIGTERM));
    Ok(code.clamp(0, 255) as u8)
}

fn stop_group(process_group: i32) {
    signal_group(process_group, libc::SIGTERM);
    if wait_for_group_exit(process_group, CLEANUP_DEADLINE) {
        return;
    }
    signal_group(process_group, libc::SIGKILL);
    let _ = wait_for_group_exit(process_group, CLEANUP_DEADLINE);
}

fn signal_group(process_group: i32, signal: i32) {
    if process_group > 0 {
        unsafe {
            libc::kill(-process_group, signal);
        }
    }
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

fn process_start_identity(pid: u32) -> Result<String, String> {
    let stat = std::fs::read_to_string(format!("/proc/{pid}/stat"))
        .map_err(|error| format!("cannot inspect contained process start time: {error}"))?;
    let command_end = stat
        .rfind(')')
        .ok_or_else(|| "contained process stat has no command boundary".to_owned())?;
    let fields = stat[command_end + 1..].split_whitespace().collect::<Vec<_>>();
    let start_ticks = fields
        .get(19)
        .ok_or_else(|| "contained process stat has no start-time field".to_owned())?;
    if !start_ticks.chars().all(|character| character.is_ascii_digit()) {
        return Err("contained process start-time field is invalid".to_owned());
    }
    Ok(format!("linux-proc-start:{start_ticks}"))
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

fn restore_foreground(process_group: Option<i32>) {
    if let Some(process_group) = process_group {
        unsafe {
            libc::tcsetpgrp(libc::STDIN_FILENO, process_group);
        }
    }
}
