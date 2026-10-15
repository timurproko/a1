use sha2::{Digest, Sha256};
use std::fmt;
use std::path::Path;
#[cfg(unix)]
use std::path::PathBuf;

#[cfg(unix)]
pub type EndpointStream = std::os::unix::net::UnixStream;
#[cfg(windows)]
pub type EndpointStream = std::fs::File;

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

#[cfg(windows)]
pub fn set_handshake_deadline(
    stream: &EndpointStream,
    timeout: std::time::Duration,
) -> Result<(), EndpointError> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::System::Pipes::PeekNamedPipe;
    let deadline = std::time::Instant::now() + timeout;
    loop {
        let mut available = 0_u32;
        if unsafe {
            PeekNamedPipe(
                stream.as_raw_handle(),
                std::ptr::null_mut(),
                0,
                std::ptr::null_mut(),
                &mut available,
                std::ptr::null_mut(),
            )
        } == 0
        {
            return Err(EndpointError(format!(
                "inspect endpoint handshake: {}",
                std::io::Error::last_os_error()
            )));
        }
        if available > 0 {
            return Ok(());
        }
        if std::time::Instant::now() >= deadline {
            return Err(EndpointError("endpoint handshake timed out".to_owned()));
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
}
#[cfg(windows)]
pub fn clear_handshake_deadline(_stream: &EndpointStream) -> Result<(), EndpointError> {
    Ok(())
}

#[cfg(windows)]
pub fn connect(address: &str) -> Result<EndpointStream, EndpointError> {
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(2);
    loop {
        match std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .open(address)
        {
            Ok(stream) => return Ok(stream),
            Err(error)
                if error.raw_os_error() == Some(231) && std::time::Instant::now() < deadline =>
            {
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
            Err(error) => {
                return Err(EndpointError(format!(
                    "connect endpoint {address}: {error}"
                )));
            }
        }
    }
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
    /// The device, inode, and change time of the socket this endpoint bound, so exit removes only
    /// its own file even when a replacement reuses the freed inode.
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
            // Invariant: one peer that is refused, or already gone before its identity could be
            // read, is dropped alone; it never ends the endpoint every other peer depends on.
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

    /// True while the socket file at this endpoint's path is still the one it bound.
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
        // Invariant: a replacement server may already have bound a new socket at this path after
        // recovering this one; exit removes the file only while it is still this endpoint's own.
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

#[cfg(windows)]
pub struct OwnerEndpoint {
    pending: windows_sys::Win32::Foundation::HANDLE,
    name: String,
}

#[cfg(windows)]
impl OwnerEndpoint {
    pub fn bind(profile: &Path, _runtime: &Path) -> Result<Self, EndpointError> {
        let name = format!(r"\\.\pipe\a1-tabs-{}", endpoint_token(profile)?);
        Self::bind_name(name)
    }

    pub fn bind_name(name: String) -> Result<Self, EndpointError> {
        let pending = create_owner_pipe(&name, true)?;
        Ok(Self { pending, name })
    }

    /// Accepts only after the pipe ACL and a fresh process-owner comparison identify the peer.
    /// A replacement instance is created before the connected handle is handed to its worker.
    pub fn accept(&mut self) -> Result<EndpointStream, EndpointError> {
        use std::os::windows::io::FromRawHandle;
        use windows_sys::Win32::Foundation::{ERROR_NO_DATA, ERROR_PIPE_CONNECTED, GetLastError};
        use windows_sys::Win32::System::Pipes::{
            ConnectNamedPipe, DisconnectNamedPipe, GetNamedPipeClientProcessId,
        };
        loop {
            let connected = unsafe { ConnectNamedPipe(self.pending, std::ptr::null_mut()) };
            if connected == 0 {
                match unsafe { GetLastError() } {
                    ERROR_PIPE_CONNECTED => {}
                    // Platform: a client that connected and closed before this call, as a short
                    // probe can, leaves the instance to be reset and reused, not a failed endpoint.
                    ERROR_NO_DATA => {
                        unsafe { DisconnectNamedPipe(self.pending) };
                        continue;
                    }
                    _ => {
                        return Err(EndpointError(format!(
                            "accept named-pipe client: {}",
                            std::io::Error::last_os_error()
                        )));
                    }
                }
            }
            // Invariant: one peer that is refused, or already gone before its identity could be
            // read, is dropped alone; it never ends the endpoint every other peer depends on.
            let mut pid = 0_u32;
            if unsafe { GetNamedPipeClientProcessId(self.pending, &mut pid) } == 0
                || !same_user_as_current_process(pid).unwrap_or(false)
            {
                unsafe { DisconnectNamedPipe(self.pending) };
                continue;
            }
            break;
        }
        let replacement = create_owner_pipe(&self.name, false)?;
        let accepted = std::mem::replace(&mut self.pending, replacement);
        Ok(unsafe { std::fs::File::from_raw_handle(accepted) })
    }

    pub fn name(&self) -> &str {
        &self.name
    }
}

#[cfg(windows)]
fn create_owner_pipe(
    name: &str,
    first: bool,
) -> Result<windows_sys::Win32::Foundation::HANDLE, EndpointError> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::{INVALID_HANDLE_VALUE, LocalFree};
    use windows_sys::Win32::Security::Authorization::{
        ConvertStringSecurityDescriptorToSecurityDescriptorW, SDDL_REVISION_1,
    };
    use windows_sys::Win32::Security::SECURITY_ATTRIBUTES;
    use windows_sys::Win32::Storage::FileSystem::{
        FILE_FLAG_FIRST_PIPE_INSTANCE, PIPE_ACCESS_DUPLEX,
    };
    use windows_sys::Win32::System::Pipes::{
        CreateNamedPipeW, PIPE_READMODE_BYTE, PIPE_REJECT_REMOTE_CLIENTS, PIPE_TYPE_BYTE,
        PIPE_UNLIMITED_INSTANCES, PIPE_WAIT,
    };
    let wide = std::ffi::OsStr::new(name)
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let sddl = std::ffi::OsStr::new("D:P(A;;GA;;;OW)")
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let mut descriptor = std::ptr::null_mut();
    if unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            sddl.as_ptr(),
            SDDL_REVISION_1,
            &mut descriptor,
            std::ptr::null_mut(),
        )
    } == 0
    {
        return Err(EndpointError(format!(
            "create owner-only pipe descriptor: {}",
            std::io::Error::last_os_error()
        )));
    }
    let mut attributes = SECURITY_ATTRIBUTES {
        nLength: std::mem::size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: descriptor,
        bInheritHandle: 0,
    };
    let first_flag = if first {
        FILE_FLAG_FIRST_PIPE_INSTANCE
    } else {
        0
    };
    let handle = unsafe {
        CreateNamedPipeW(
            wide.as_ptr(),
            PIPE_ACCESS_DUPLEX | first_flag,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
            PIPE_UNLIMITED_INSTANCES,
            64 * 1024,
            64 * 1024,
            0,
            &mut attributes,
        )
    };
    unsafe { LocalFree(descriptor) };
    if handle == INVALID_HANDLE_VALUE {
        Err(EndpointError(format!(
            "create owner-only named pipe: {}",
            std::io::Error::last_os_error()
        )))
    } else {
        Ok(handle)
    }
}

#[cfg(windows)]
fn same_user_as_current_process(pid: u32) -> Result<bool, EndpointError> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::Security::{EqualSid, TOKEN_USER};
    use windows_sys::Win32::System::Threading::{
        GetCurrentProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    let client = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if client.is_null() {
        return Err(EndpointError(format!(
            "open named-pipe client process: {}",
            std::io::Error::last_os_error()
        )));
    }
    let current_token = process_token_user(unsafe { GetCurrentProcess() });
    let client_token = process_token_user(client);
    unsafe {
        CloseHandle(client);
    }
    let current_token = current_token?;
    let client_token = client_token?;
    let current = unsafe { &*(current_token.as_ptr().cast::<TOKEN_USER>()) };
    let client = unsafe { &*(client_token.as_ptr().cast::<TOKEN_USER>()) };
    Ok(unsafe { EqualSid(current.User.Sid, client.User.Sid) } != 0)
}

#[cfg(windows)]
fn process_token_user(
    process: windows_sys::Win32::Foundation::HANDLE,
) -> Result<Vec<u8>, EndpointError> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::Security::{GetTokenInformation, TOKEN_QUERY, TokenUser};
    use windows_sys::Win32::System::Threading::OpenProcessToken;
    let mut token = std::ptr::null_mut();
    if unsafe { OpenProcessToken(process, TOKEN_QUERY, &mut token) } == 0 {
        return Err(EndpointError(format!(
            "open process token: {}",
            std::io::Error::last_os_error()
        )));
    }
    let mut length = 0_u32;
    unsafe {
        GetTokenInformation(token, TokenUser, std::ptr::null_mut(), 0, &mut length);
    }
    let mut bytes = vec![0_u8; length as usize];
    let accepted = unsafe {
        GetTokenInformation(
            token,
            TokenUser,
            bytes.as_mut_ptr().cast(),
            length,
            &mut length,
        )
    };
    unsafe {
        CloseHandle(token);
    }
    if accepted == 0 {
        return Err(EndpointError(format!(
            "read process token user: {}",
            std::io::Error::last_os_error()
        )));
    }
    Ok(bytes)
}

// Concurrency: the endpoint owns its handles; callers move it to one accept loop and do not share it.
#[cfg(windows)]
unsafe impl Send for OwnerEndpoint {}

#[cfg(windows)]
impl Drop for OwnerEndpoint {
    fn drop(&mut self) {
        unsafe {
            windows_sys::Win32::Foundation::CloseHandle(self.pending);
        }
    }
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
        // Rationale: a replacement recovers the stale endpoint and binds a new socket at the same path.
        std::fs::remove_file(&path).expect("recover stale socket");
        // Platform: file change times can be coarse; a real replacement binds far later than this.
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
