use sha2::{Digest, Sha256};
use std::fmt;
use std::path::Path;
#[cfg(unix)]
use std::path::PathBuf;

#[cfg(unix)]
pub type EndpointStream = std::os::unix::net::UnixStream;
#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use windows::{
    ConnectionGuard, EndpointStream, OwnerEndpoint, clear_handshake_deadline, close_on_drop,
    connect, set_handshake_deadline,
};

/// Unix socket shutdown semantics are unchanged; Windows split workers explicitly cancel peers.
#[cfg(unix)]
pub struct ConnectionGuard;
#[cfg(unix)]
pub fn close_on_drop(_stream: &EndpointStream) -> ConnectionGuard {
    ConnectionGuard
}

#[cfg(unix)]
pub fn connect(address: &str) -> Result<EndpointStream, EndpointError> {
    std::os::unix::net::UnixStream::connect(address)
        .map_err(|error| EndpointError(format!("connect endpoint {address}: {error}")))
}

#[cfg(unix)]
pub fn set_handshake_deadline(
    stream: &EndpointStream,
    timeout: std::time::Duration,
) -> Result<(), EndpointError> {
    stream
        .set_read_timeout(Some(timeout))
        .map_err(|error| EndpointError(format!("set endpoint handshake deadline: {error}")))
}
#[cfg(unix)]
pub fn clear_handshake_deadline(stream: &EndpointStream) -> Result<(), EndpointError> {
    stream
        .set_read_timeout(None)
        .map_err(|error| EndpointError(format!("clear endpoint handshake deadline: {error}")))
}

#[cfg(unix)]
pub fn remove_stale(address: &str) -> Result<(), EndpointError> {
    use std::os::unix::fs::{FileTypeExt, MetadataExt};
    let path = Path::new(address);
    let metadata = match std::fs::symlink_metadata(path) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(EndpointError(format!("inspect stale endpoint: {error}"))),
    };
    if metadata.file_type().is_socket() && metadata.uid() == unsafe { libc::geteuid() } {
        std::fs::remove_file(path)
            .map_err(|error| EndpointError(format!("remove stale endpoint: {error}")))
    } else {
        Err(EndpointError(
            "stale endpoint is not an owner socket".to_owned(),
        ))
    }
}

#[cfg(windows)]
pub fn remove_stale(_address: &str) -> Result<(), EndpointError> {
    Ok(())
}

#[derive(Debug)]
pub struct EndpointError(pub String);
impl fmt::Display for EndpointError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for EndpointError {}

#[cfg(any(unix, test))]
fn verify_peer_identity(owner: u64, peer: u64) -> Result<(), EndpointError> {
    if owner == peer {
        Ok(())
    } else {
        Err(EndpointError(format!(
            "endpoint peer identity {peer} does not match owner {owner}"
        )))
    }
}

pub fn endpoint_token(profile: &Path) -> Result<String, EndpointError> {
    let canonical = std::fs::canonicalize(profile).map_err(|error| {
        EndpointError(format!(
            "canonicalize profile {}: {error}",
            profile.display()
        ))
    })?;
    let mut digest = Sha256::new();
    digest.update(canonical.to_string_lossy().as_bytes());
    Ok(hex::encode(digest.finalize())[..20].to_owned())
}

#[cfg(unix)]
pub struct OwnerEndpoint {
    listener: std::os::unix::net::UnixListener,
    path: PathBuf,
    uid: u32,
    /// Device, inode and change time prevent removing a replacement socket on exit.
    socket: Option<(u64, u64, i64, i64)>,
}

#[cfg(unix)]
impl OwnerEndpoint {
    pub fn bind(profile: &Path, runtime: &Path) -> Result<Self, EndpointError> {
        let path = runtime.join(format!("a1-tabs-{}.sock", endpoint_token(profile)?));
        Self::bind_path(runtime, path)
    }
    pub fn bind_name(name: String) -> Result<Self, EndpointError> {
        let path = PathBuf::from(name);
        let runtime = path
            .parent()
            .ok_or_else(|| EndpointError("endpoint has no runtime directory".to_owned()))?;
        Self::bind_path(runtime, path.clone())
    }
    fn bind_path(runtime: &Path, path: PathBuf) -> Result<Self, EndpointError> {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        if runtime.exists() {
            let metadata = std::fs::symlink_metadata(runtime)
                .map_err(|error| EndpointError(format!("inspect runtime directory: {error}")))?;
            if metadata.file_type().is_symlink()
                || !metadata.is_dir()
                || metadata.uid() != unsafe { libc::geteuid() }
                || metadata.mode() & 0o077 != 0
            {
                return Err(EndpointError(
                    "runtime directory is not an owner-only real directory".to_owned(),
                ));
            }
        } else {
            std::fs::create_dir_all(runtime)
                .map_err(|error| EndpointError(format!("create runtime directory: {error}")))?;
            std::fs::set_permissions(runtime, std::fs::Permissions::from_mode(0o700))
                .map_err(|error| EndpointError(format!("protect runtime directory: {error}")))?;
        }
        if path.as_os_str().len() >= 96 {
            return Err(EndpointError(
                "Unix endpoint path exceeds the conservative platform limit".to_owned(),
            ));
        }
        if path.exists() {
            return Err(EndpointError(format!(
                "endpoint already exists: {}",
                path.display()
            )));
        }
        let listener = std::os::unix::net::UnixListener::bind(&path)
            .map_err(|error| EndpointError(format!("bind endpoint {}: {error}", path.display())))?;
        let socket = socket_identity(&path);
        Ok(Self {
            listener,
            path,
            uid: unsafe { libc::geteuid() },
            socket,
        })
    }
    pub fn accept(&mut self) -> Result<EndpointStream, EndpointError> {
        loop {
            let (stream, _) = self
                .listener
                .accept()
                .map_err(|error| EndpointError(format!("accept endpoint: {error}")))?;
            // Invariant: an unverifiable peer is dropped alone, never the listening endpoint.
            if peer_uid(&stream)
                .and_then(|uid| verify_peer_identity(self.uid as u64, uid as u64))
                .is_ok()
            {
                return Ok(stream);
            }
        }
    }
    pub fn path(&self) -> &Path {
        &self.path
    }
    pub fn still_owned(&self) -> bool {
        self.socket.is_some() && socket_identity(&self.path) == self.socket
    }
}

#[cfg(unix)]
fn socket_identity(path: &Path) -> Option<(u64, u64, i64, i64)> {
    use std::os::unix::fs::MetadataExt;
    std::fs::symlink_metadata(path).ok().map(|metadata| {
        (
            metadata.dev(),
            metadata.ino(),
            metadata.ctime(),
            metadata.ctime_nsec(),
        )
    })
}
#[cfg(unix)]
impl Drop for OwnerEndpoint {
    fn drop(&mut self) {
        if self.still_owned() {
            let _ = std::fs::remove_file(&self.path);
        }
    }
}
#[cfg(target_os = "linux")]
fn peer_uid(stream: &std::os::unix::net::UnixStream) -> Result<u32, EndpointError> {
    use std::os::fd::AsRawFd;
    let mut credentials: libc::ucred = unsafe { std::mem::zeroed() };
    let mut length = std::mem::size_of::<libc::ucred>() as libc::socklen_t;
    let result = unsafe {
        libc::getsockopt(
            stream.as_raw_fd(),
            libc::SOL_SOCKET,
            libc::SO_PEERCRED,
            (&mut credentials as *mut libc::ucred).cast(),
            &mut length,
        )
    };
    if result != 0 || length as usize != std::mem::size_of::<libc::ucred>() {
        return Err(EndpointError(format!(
            "read peer credentials: {}",
            std::io::Error::last_os_error()
        )));
    }
    Ok(credentials.uid)
}
#[cfg(target_os = "macos")]
fn peer_uid(stream: &std::os::unix::net::UnixStream) -> Result<u32, EndpointError> {
    use std::os::fd::AsRawFd;
    let mut uid = 0u32;
    let mut gid = 0u32;
    if unsafe { libc::getpeereid(stream.as_raw_fd(), &mut uid, &mut gid) } != 0 {
        return Err(EndpointError(format!(
            "read peer credentials: {}",
            std::io::Error::last_os_error()
        )));
    }
    Ok(uid)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn profile_token_is_stable_and_bounded() {
        let root = tempfile::tempdir().expect("profile");
        let first = endpoint_token(root.path()).expect("token");
        assert_eq!(first, endpoint_token(root.path()).expect("token again"));
        assert_eq!(first.len(), 20);
        assert!(verify_peer_identity(41, 41).is_ok());
        assert!(
            verify_peer_identity(41, 42).is_err(),
            "foreign identity must be rejected before protocol parsing"
        );
    }
    #[cfg(unix)]
    #[test]
    fn refuses_unsafe_runtime_directory_and_occupied_socket() {
        use std::os::unix::fs::PermissionsExt;
        let profile = tempfile::tempdir().expect("profile");
        let runtime = tempfile::tempdir().expect("runtime");
        std::fs::set_permissions(runtime.path(), std::fs::Permissions::from_mode(0o755))
            .expect("permissions");
        assert!(OwnerEndpoint::bind(profile.path(), runtime.path()).is_err());
        std::fs::set_permissions(runtime.path(), std::fs::Permissions::from_mode(0o700))
            .expect("permissions");
        let endpoint = OwnerEndpoint::bind(profile.path(), runtime.path()).expect("endpoint");
        assert!(OwnerEndpoint::bind(profile.path(), runtime.path()).is_err());
        drop(endpoint);
    }
    #[cfg(unix)]
    #[test]
    fn exit_removes_only_a_socket_it_still_owns() {
        use std::os::unix::fs::PermissionsExt;
        let profile = tempfile::tempdir().expect("profile");
        let runtime = tempfile::tempdir().expect("runtime");
        std::fs::set_permissions(runtime.path(), std::fs::Permissions::from_mode(0o700))
            .expect("permissions");
        let owned = OwnerEndpoint::bind(profile.path(), runtime.path()).expect("endpoint");
        let path = owned.path().to_path_buf();
        assert!(owned.still_owned());
        drop(owned);
        assert!(!path.exists(), "an owned socket is removed at exit");
        let stale = OwnerEndpoint::bind(profile.path(), runtime.path()).expect("endpoint");
        std::fs::remove_file(&path).expect("recover stale socket");
        std::thread::sleep(std::time::Duration::from_millis(50));
        let replacement = OwnerEndpoint::bind(profile.path(), runtime.path()).expect("replacement");
        assert!(!stale.still_owned());
        drop(stale);
        assert!(
            path.exists(),
            "the replacement's socket survives the old server's exit"
        );
        assert!(replacement.still_owned());
        drop(replacement);
        assert!(!path.exists());
    }
    #[cfg(windows)]
    #[test]
    fn first_named_pipe_instance_cannot_be_replaced() {
        let profile = tempfile::tempdir().expect("profile");
        let runtime = tempfile::tempdir().expect("runtime");
        let endpoint = OwnerEndpoint::bind(profile.path(), runtime.path()).expect("endpoint");
        assert!(OwnerEndpoint::bind(profile.path(), runtime.path()).is_err());
        drop(endpoint);
    }
}
