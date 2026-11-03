//! Darwin login identity is a kernel audit session, never a process-local Mach port name.
use crate::identity::IdentityError;
use std::mem::{size_of, size_of_val, zeroed};
use std::os::fd::AsRawFd;
use std::os::unix::net::UnixStream;

#[repr(C)]
struct AuditInfo {
    user: u32,
    mask: [u32; 2],
    terminal: [u32; 6],
    session: i32,
    flags: u64,
}
#[link(name = "bsm")]
unsafe extern "C" {
    fn getaudit_addr(info: *mut AuditInfo, length: libc::c_int) -> libc::c_int;
}

fn current() -> Result<AuditInfo, IdentityError> {
    let mut info: AuditInfo = unsafe { zeroed() };
    if unsafe { getaudit_addr(&mut info, size_of::<AuditInfo>() as libc::c_int) } != 0
        || matches!(info.session, 0 | -1)
    {
        return Err(IdentityError(
            "read macOS kernel audit-session identity".into(),
        ));
    }
    Ok(info)
}
pub(crate) fn identity() -> Result<String, IdentityError> {
    let info = current()?;
    Ok(format!(
        "macos-audit-id:{}:{}",
        info.user, info.session as u32
    ))
}

pub(crate) fn verify_peer(stream: &UnixStream, pid: u32) -> Result<(), IdentityError> {
    let info = current()?;
    let mut token = [0u32; 8];
    let mut length = size_of_val(&token) as libc::socklen_t;
    // Security: LOCAL_PEERTOKEN is supplied by the kernel for this connected Unix socket.
    // It binds the immutable predecessor's actual PID/UID/login, not its broken port-name record.
    let result = unsafe {
        libc::getsockopt(
            stream.as_raw_fd(),
            0,
            0x006,
            token.as_mut_ptr().cast(),
            &mut length,
        )
    };
    if result != 0
        || length as usize != size_of_val(&token)
        || !peer_matches(
            &token,
            pid,
            unsafe { libc::getuid() },
            unsafe { libc::geteuid() },
            info.user,
            info.session as u32,
        )
    {
        return Err(IdentityError(
            "resident peer belongs to another macOS process, user or audit session".into(),
        ));
    }
    Ok(())
}
fn peer_matches(
    token: &[u32; 8],
    pid: u32,
    uid: u32,
    euid: u32,
    audit_user: u32,
    session: u32,
) -> bool {
    token[0] == audit_user
        && token[1] == euid
        && token[3] == uid
        && token[5] == pid
        && token[6] == session
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn kernel_peer_binding_rejects_other_login_uid_and_pid() {
        let token = [501, 501, 20, 501, 20, 42, 1001, 3];
        assert!(peer_matches(&token, 42, 501, 501, 501, 1001));
        for index in [0, 1, 3, 5, 6] {
            let mut wrong = token;
            wrong[index] += 1;
            assert!(!peer_matches(&wrong, 42, 501, 501, 501, 1001));
        }
        assert_eq!(size_of::<AuditInfo>(), 48);
    }
    #[test]
    fn separate_process_observes_the_same_login() {
        const OUTPUT: &str = "NATIVE_FIXTURE_AUDIT_OUTPUT";
        if let Some(path) = std::env::var_os(OUTPUT) {
            std::fs::write(path, identity().unwrap()).unwrap();
            return;
        }
        let file = tempfile::NamedTempFile::new().unwrap();
        let status = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "audit_session::tests::separate_process_observes_the_same_login",
                "--nocapture",
            ])
            .env(OUTPUT, file.path())
            .status()
            .unwrap();
        assert!(status.success());
        assert_eq!(
            std::fs::read_to_string(file.path()).unwrap(),
            identity().unwrap()
        );
    }
    #[test]
    fn independent_queries_return_the_same_kernel_login_identity() {
        assert_eq!(identity().unwrap(), identity().unwrap());
        let (stream, _peer) = UnixStream::pair().unwrap();
        verify_peer(&stream, std::process::id()).unwrap();
        assert!(verify_peer(&stream, std::process::id() + 1).is_err());
    }
}
