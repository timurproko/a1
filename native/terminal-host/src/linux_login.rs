//! Login proof for immutable Linux sources that recorded a POSIX process session instead.
#[cfg(target_os = "linux")]
use {std::io::Read, std::os::fd::AsRawFd, std::os::unix::net::UnixStream};

#[derive(Clone, Debug, PartialEq, Eq)]
struct Login {
    audit_user: u32,
    audit_session: u32,
    namespaces: Vec<std::path::PathBuf>,
    cgroup: String,
}

pub(crate) fn process_session(value: &str) -> bool {
    let (pid, start) = if let Some(pid) = value.strip_prefix("linux-detached-session:") {
        (pid, None)
    } else if let Some(value) = value.strip_prefix("linux-session-leader:") {
        let Some((pid, start)) = value.split_once(":linux-proc-start:") else {
            return false;
        };
        (pid, Some(start))
    } else {
        return false;
    };
    let decimal =
        |value: &str| !value.is_empty() && value.bytes().all(|byte| byte.is_ascii_digit());
    decimal(pid)
        && pid.parse::<u32>().is_ok_and(|pid| pid > 0)
        && start.is_none_or(|start| decimal(start) && start.parse::<u64>().is_ok())
}

#[cfg(target_os = "linux")]
fn record(pid: u32, name: &str) -> Result<String, String> {
    let mut value = String::new();
    std::fs::File::open(format!("/proc/{pid}/{name}"))
        .and_then(|file| file.take(8193).read_to_string(&mut value))
        .map_err(|_| "Linux login evidence unavailable")?;
    if value.is_empty() || value.len() > 8192 {
        return Err("Linux login evidence is invalid".into());
    }
    Ok(value)
}
#[cfg(target_os = "linux")]
fn login(pid: u32) -> Result<Login, String> {
    Ok(Login {
        audit_user: record(pid, "loginuid")?
            .trim()
            .parse()
            .map_err(|_| "Linux audit user is invalid")?,
        audit_session: record(pid, "sessionid")?
            .trim()
            .parse()
            .map_err(|_| "Linux audit session is invalid")?,
        namespaces: ["user", "pid", "cgroup"]
            .into_iter()
            .map(|name| {
                std::fs::read_link(format!("/proc/{pid}/ns/{name}"))
                    .map_err(|_| "Linux login namespace unavailable".to_owned())
            })
            .collect::<Result<_, _>>()?,
        cgroup: record(pid, "cgroup")?,
    })
}
fn same_login(left: &Login, right: &Login) -> bool {
    if left.namespaces != right.namespaces || left.namespaces.len() != 3 {
        return false;
    }
    match (
        left.audit_user,
        left.audit_session,
        right.audit_user,
        right.audit_session,
    ) {
        (u32::MAX, u32::MAX, u32::MAX, u32::MAX) => {
            // Platform: headless service processes have no PAM audit login. Bind their kernel
            // execution scope instead; setsid changes neither namespace nor cgroup membership.
            !left.cgroup.trim().is_empty() && left.cgroup == right.cgroup
        }
        (user, session, peer_user, peer_session) => {
            user != u32::MAX && session != u32::MAX && user == peer_user && session == peer_session
        }
    }
}

/// Invariant: a legacy process-session mismatch needs the connected exact owner and kernel login proof.
#[cfg(target_os = "linux")]
pub(crate) fn verify_peer(stream: &UnixStream, expected_pid: u32) -> Result<(), String> {
    let mut peer: libc::ucred = unsafe { std::mem::zeroed() };
    let mut length = std::mem::size_of::<libc::ucred>() as libc::socklen_t;
    let result = unsafe {
        libc::getsockopt(
            stream.as_raw_fd(),
            libc::SOL_SOCKET,
            libc::SO_PEERCRED,
            (&mut peer as *mut libc::ucred).cast(),
            &mut length,
        )
    };
    if result != 0
        || length as usize != std::mem::size_of::<libc::ucred>()
        || peer.pid <= 0
        || peer.pid as u32 != expected_pid
        || peer.uid != unsafe { libc::geteuid() }
    {
        return Err("resident Linux peer identity mismatch".into());
    }
    if !same_login(&login(std::process::id())?, &login(expected_pid)?) {
        return Err("resident Linux peer belongs to another login".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn scope(user: u32, session: u32) -> Login {
        Login {
            audit_user: user,
            audit_session: session,
            namespaces: ["user:[1]", "pid:[2]", "cgroup:[3]"]
                .map(Into::into)
                .to_vec(),
            cgroup: "0::/system.slice/runner.service\n".into(),
        }
    }
    #[test]
    fn only_known_posix_session_records_use_the_legacy_adapter() {
        assert!(process_session("linux-detached-session:123"));
        assert!(process_session(
            "linux-session-leader:123:linux-proc-start:456"
        ));
        for value in [
            "linux-systemd-session:123",
            "linux-detached-session:0",
            "linux-detached-session:+1",
            "linux-detached-session:4294967296",
            "linux-session-leader:123:linux-proc-start:",
            "linux-session-leader:123:wrong:456",
        ] {
            assert!(!process_session(value), "{value}");
        }
    }
    #[test]
    fn audit_login_matches_across_process_sessions_but_not_other_logins() {
        let original = scope(1000, 7);
        assert!(same_login(&original, &original));
        assert!(!same_login(&original, &scope(1000, 8)));
        assert!(!same_login(&original, &scope(1001, 7)));
        assert!(!same_login(&original, &scope(u32::MAX, u32::MAX)));
        assert!(!same_login(&scope(1000, u32::MAX), &scope(1000, u32::MAX)));
    }
    #[test]
    fn headless_service_requires_the_same_kernel_execution_scope() {
        let original = scope(u32::MAX, u32::MAX);
        assert!(same_login(&original, &original));
        let mut other = original.clone();
        other.cgroup = "0::/user.slice/session-2.scope\n".into();
        assert!(!same_login(&original, &other));
        other = original.clone();
        other.cgroup.clear();
        assert!(!same_login(&other, &other));
        for index in 0..3 {
            other = original.clone();
            other.namespaces[index] = "different".into();
            assert!(!same_login(&original, &other));
        }
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn connected_peer_checks_actual_pid_and_kernel_login() {
        let (stream, _peer) = UnixStream::pair().unwrap();
        verify_peer(&stream, std::process::id()).unwrap();
        assert!(verify_peer(&stream, 0).is_err());
        assert!(verify_peer(&stream, std::process::id().saturating_add(1)).is_err());
    }
}
