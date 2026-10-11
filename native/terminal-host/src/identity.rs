use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProcessIdentity {
    pub pid: u32,
    pub start: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SystemIdentity {
    pub boot: String,
    pub os_session: String,
}

#[derive(Debug)]
pub struct IdentityError(pub String);

impl fmt::Display for IdentityError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for IdentityError {}

pub fn inspect_process(pid: u32) -> Result<Option<ProcessIdentity>, IdentityError> {
    platform::inspect_process(pid)
}

pub fn current_system() -> Result<SystemIdentity, IdentityError> {
    Ok(SystemIdentity {
        boot: platform::boot_identity()?,
        os_session: platform::os_session_identity()?,
    })
}

pub fn same_process(left: &ProcessIdentity, right: &ProcessIdentity) -> bool {
    left.pid == right.pid && left.start == right.start
}

pub fn same_system_epoch(left: &SystemIdentity, right: &SystemIdentity) -> bool {
    left.boot == right.boot && left.os_session == right.os_session
}

#[cfg(target_os = "linux")]
mod platform {
    use super::*;

    pub fn inspect_process(pid: u32) -> Result<Option<ProcessIdentity>, IdentityError> {
        let path = format!("/proc/{pid}/stat");
        let stat = match std::fs::read_to_string(&path) {
            Ok(value) => value,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(error) => return Err(IdentityError(format!("read {path}: {error}"))),
        };
        Ok(Some(ProcessIdentity {
            pid,
            start: format!("linux-proc-start:{}", parse_start_time(&stat)?),
        }))
    }

    pub(super) fn parse_start_time(stat: &str) -> Result<&str, IdentityError> {
        let command_end = stat
            .rfind(')')
            .ok_or_else(|| IdentityError("process stat has no command boundary".to_owned()))?;
        let fields = stat[command_end + 1..]
            .split_whitespace()
            .collect::<Vec<_>>();
        let start = fields
            .get(19)
            .ok_or_else(|| IdentityError("process stat has no start-time field".to_owned()))?;
        if !start.chars().all(|character| character.is_ascii_digit()) {
            return Err(IdentityError(
                "process start-time field is malformed".to_owned(),
            ));
        }
        Ok(start)
    }

    pub fn boot_identity() -> Result<String, IdentityError> {
        let value = std::fs::read_to_string("/proc/sys/kernel/random/boot_id")
            .map_err(|error| IdentityError(format!("read Linux boot identity: {error}")))?;
        let value = value.trim();
        if value.len() < 16
            || !value
                .chars()
                .all(|character| character.is_ascii_hexdigit() || character == '-')
        {
            return Err(IdentityError("Linux boot identity is malformed".to_owned()));
        }
        Ok(format!("linux-boot:{value}"))
    }

    pub fn os_session_identity() -> Result<String, IdentityError> {
        if let Ok(session) = std::env::var("XDG_SESSION_ID")
            && !session.is_empty()
            && session.chars().all(|character| {
                character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.')
            })
        {
            return Ok(format!("linux-systemd-session:{session}"));
        }
        let sid = unsafe { libc::getsid(0) };
        if sid <= 0 {
            return Err(IdentityError(format!(
                "read Linux session leader: {}",
                std::io::Error::last_os_error()
            )));
        }
        let leader = inspect_process(sid as u32)?.ok_or_else(|| {
            IdentityError("Linux session leader exited during inspection".to_owned())
        })?;
        Ok(format!(
            "linux-session-leader:{}:{}",
            leader.pid, leader.start
        ))
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use super::*;
    use std::mem::{size_of, zeroed};

    #[link(name = "bsm")]
    unsafe extern "C" {
        fn audit_session_self() -> i32;
    }

    pub fn inspect_process(pid: u32) -> Result<Option<ProcessIdentity>, IdentityError> {
        let mut info: libc::proc_bsdinfo = unsafe { zeroed() };
        let expected = size_of::<libc::proc_bsdinfo>();
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
            if unsafe { libc::kill(pid as i32, 0) } != 0
                && std::io::Error::last_os_error().raw_os_error() == Some(libc::ESRCH)
            {
                return Ok(None);
            }
            return Err(IdentityError(format!(
                "inspect macOS process: {}",
                std::io::Error::last_os_error()
            )));
        }
        if received as usize != expected || info.pbi_pid != pid {
            return Err(IdentityError(
                "macOS process identity is incomplete or mismatched".to_owned(),
            ));
        }
        Ok(Some(ProcessIdentity {
            pid,
            start: format!(
                "macos-proc-start:{}:{}",
                info.pbi_start_tvsec, info.pbi_start_tvusec
            ),
        }))
    }

    pub fn boot_identity() -> Result<String, IdentityError> {
        let mut boot: libc::timeval = unsafe { zeroed() };
        let mut size = size_of::<libc::timeval>();
        let name = b"kern.boottime\0";
        let result = unsafe {
            libc::sysctlbyname(
                name.as_ptr().cast(),
                (&mut boot as *mut libc::timeval).cast(),
                &mut size,
                std::ptr::null_mut(),
                0,
            )
        };
        if result != 0 || size != size_of::<libc::timeval>() {
            return Err(IdentityError(format!(
                "read macOS boot identity: {}",
                std::io::Error::last_os_error()
            )));
        }
        Ok(format!("macos-boot:{}:{}", boot.tv_sec, boot.tv_usec))
    }

    pub fn os_session_identity() -> Result<String, IdentityError> {
        let session = unsafe { audit_session_self() };
        if session < 0 {
            return Err(IdentityError(format!(
                "read macOS audit session: {}",
                std::io::Error::last_os_error()
            )));
        }
        Ok(format!("macos-audit-session:{session}"))
    }
}

#[cfg(windows)]
mod platform {
    use super::*;
    use std::mem::{size_of, zeroed};
    use windows_sys::Win32::Foundation::{
        CloseHandle, FILETIME, GetLastError, HANDLE, LUID, WAIT_FAILED, WAIT_OBJECT_0, WAIT_TIMEOUT,
    };
    use windows_sys::Win32::Security::{
        GetTokenInformation, TOKEN_QUERY, TOKEN_STATISTICS, TokenStatistics,
    };
    use windows_sys::Win32::System::Threading::{
        GetCurrentProcess, GetProcessTimes, OpenProcess, OpenProcessToken,
        PROCESS_QUERY_LIMITED_INFORMATION, WaitForSingleObject,
    };

    const SYNCHRONIZE_ACCESS: u32 = 0x0010_0000;
    const ERROR_INVALID_PARAMETER: u32 = 87;
    const SYSTEM_BOOT_ENVIRONMENT_INFORMATION_CLASS: u32 = 90;

    #[repr(C)]
    struct Guid {
        data1: u32,
        data2: u16,
        data3: u16,
        data4: [u8; 8],
    }
    #[repr(C)]
    struct BootEnvironment {
        boot_identifier: Guid,
        firmware_type: i32,
        boot_flags: u64,
    }

    #[link(name = "ntdll")]
    unsafe extern "system" {
        fn NtQuerySystemInformation(
            class: u32,
            information: *mut core::ffi::c_void,
            length: u32,
            returned: *mut u32,
        ) -> i32;
    }

    struct OwnedHandle(HANDLE);
    impl Drop for OwnedHandle {
        fn drop(&mut self) {
            if !self.0.is_null() {
                unsafe {
                    CloseHandle(self.0);
                }
            }
        }
    }

    pub fn inspect_process(pid: u32) -> Result<Option<ProcessIdentity>, IdentityError> {
        let handle = unsafe {
            OpenProcess(
                SYNCHRONIZE_ACCESS | PROCESS_QUERY_LIMITED_INFORMATION,
                0,
                pid,
            )
        };
        if handle.is_null() {
            let code = unsafe { GetLastError() };
            return if code == ERROR_INVALID_PARAMETER {
                Ok(None)
            } else {
                Err(last_error("open process", code))
            };
        }
        let handle = OwnedHandle(handle);
        match unsafe { WaitForSingleObject(handle.0, 0) } {
            WAIT_TIMEOUT => {}
            WAIT_OBJECT_0 => return Ok(None),
            WAIT_FAILED => {
                return Err(last_error("inspect process state", unsafe {
                    GetLastError()
                }));
            }
            value => {
                return Err(IdentityError(format!(
                    "inspect process state returned {value}"
                )));
            }
        }
        let mut creation: FILETIME = unsafe { zeroed() };
        let mut exit: FILETIME = unsafe { zeroed() };
        let mut kernel: FILETIME = unsafe { zeroed() };
        let mut user: FILETIME = unsafe { zeroed() };
        if unsafe { GetProcessTimes(handle.0, &mut creation, &mut exit, &mut kernel, &mut user) }
            == 0
        {
            return Err(last_error("read process creation time", unsafe {
                GetLastError()
            }));
        }
        let ticks = ((creation.dwHighDateTime as u64) << 32) | creation.dwLowDateTime as u64;
        Ok(Some(ProcessIdentity {
            pid,
            start: format!("windows-filetime:{ticks}"),
        }))
    }

    pub fn boot_identity() -> Result<String, IdentityError> {
        let mut value: BootEnvironment = unsafe { zeroed() };
        let mut returned = 0u32;
        let status = unsafe {
            NtQuerySystemInformation(
                SYSTEM_BOOT_ENVIRONMENT_INFORMATION_CLASS,
                (&mut value as *mut BootEnvironment).cast(),
                size_of::<BootEnvironment>() as u32,
                &mut returned,
            )
        };
        if status < 0 || returned < size_of::<Guid>() as u32 {
            return Err(IdentityError(format!(
                "read Windows boot identifier: NTSTATUS 0x{:08x}",
                status as u32
            )));
        }
        let guid = value.boot_identifier;
        Ok(format!(
            "windows-boot:{:08x}-{:04x}-{:04x}-{}",
            guid.data1,
            guid.data2,
            guid.data3,
            hex::encode(guid.data4)
        ))
    }

    pub fn os_session_identity() -> Result<String, IdentityError> {
        let mut token: HANDLE = std::ptr::null_mut();
        if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) } == 0 {
            return Err(last_error("open process token", unsafe { GetLastError() }));
        }
        let token = OwnedHandle(token);
        let mut statistics: TOKEN_STATISTICS = unsafe { zeroed() };
        let mut returned = 0u32;
        if unsafe {
            GetTokenInformation(
                token.0,
                TokenStatistics,
                (&mut statistics as *mut TOKEN_STATISTICS).cast(),
                size_of::<TOKEN_STATISTICS>() as u32,
                &mut returned,
            )
        } == 0
        {
            return Err(last_error("read token statistics", unsafe {
                GetLastError()
            }));
        }
        let LUID {
            LowPart: low,
            HighPart: high,
        } = statistics.AuthenticationId;
        Ok(format!("windows-logon-luid:{high:08x}:{low:08x}"))
    }

    fn last_error(action: &str, code: u32) -> IdentityError {
        IdentityError(format!(
            "{action}: {}",
            std::io::Error::from_raw_os_error(code as i32)
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn current_process_and_system_identities_are_stable() {
        let pid = std::process::id();
        let first = inspect_process(pid).expect("inspect").expect("running");
        let second = inspect_process(pid)
            .expect("inspect again")
            .expect("running");
        assert_eq!(first, second);
        let system_a = current_system().expect("system identity");
        let system_b = current_system().expect("system identity again");
        assert_eq!(system_a, system_b);
    }

    #[test]
    fn injected_pid_reuse_reboot_and_logon_changes_are_detected() {
        let process = ProcessIdentity {
            pid: 7,
            start: "first".to_owned(),
        };
        assert!(!same_process(
            &process,
            &ProcessIdentity {
                pid: 7,
                start: "reused".to_owned()
            }
        ));
        let epoch = SystemIdentity {
            boot: "boot-a".to_owned(),
            os_session: "login-a".to_owned(),
        };
        assert!(!same_system_epoch(
            &epoch,
            &SystemIdentity {
                boot: "boot-b".to_owned(),
                os_session: "login-a".to_owned()
            }
        ));
        assert!(!same_system_epoch(
            &epoch,
            &SystemIdentity {
                boot: "boot-a".to_owned(),
                os_session: "login-b".to_owned()
            }
        ));
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn linux_stat_parser_handles_commands_and_rejects_malformed_input() {
        let mut fields = vec!["S"; 19];
        fields.push("12345");
        assert_eq!(
            platform::parse_start_time(&format!(
                "9 (name with ) parenthesis) {}",
                fields.join(" ")
            ))
            .expect("start"),
            "12345"
        );
        assert!(platform::parse_start_time("missing boundary").is_err());
        assert!(platform::parse_start_time("9 (short) S").is_err());
        fields[19] = "invalid";
        assert!(platform::parse_start_time(&format!("9 (name) {}", fields.join(" "))).is_err());
    }
}
