use sha2::{Digest, Sha256};
use std::fmt;
use std::path::Path;
#[cfg(unix)]
use std::path::PathBuf;

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
    digest.update([0]);
    if let Some(runtime) = std::env::var_os("A1_RUNTIME_DIR") {
        digest.update(runtime.to_string_lossy().as_bytes());
    }
    Ok(hex::encode(digest.finalize())[..20].to_owned())
}

#[cfg(unix)]
pub struct OwnerEndpoint {
    listener: std::os::unix::net::UnixListener,
    path: PathBuf,
    uid: u32,
}

#[cfg(unix)]
impl OwnerEndpoint {
    pub fn bind(profile: &Path, runtime: &Path) -> Result<Self, EndpointError> {
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
        let path = runtime.join(format!("a1-tabs-{}.sock", endpoint_token(profile)?));
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
        Ok(Self {
            listener,
            path,
            uid: unsafe { libc::geteuid() },
        })
    }

    pub fn accept(&self) -> Result<std::os::unix::net::UnixStream, EndpointError> {
        let (stream, _) = self
            .listener
            .accept()
            .map_err(|error| EndpointError(format!("accept endpoint: {error}")))?;
        let uid = peer_uid(&stream)?;
        verify_peer_identity(self.uid as u64, uid as u64)?;
        Ok(stream)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

#[cfg(unix)]
impl Drop for OwnerEndpoint {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
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
    handle: windows_sys::Win32::Foundation::HANDLE,
    name: String,
}

#[cfg(windows)]
impl OwnerEndpoint {
    pub fn bind(profile: &Path, _runtime: &Path) -> Result<Self, EndpointError> {
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

        let name = format!(r"\\.\pipe\a1-tabs-{}", endpoint_token(profile)?);
        let wide = std::ffi::OsStr::new(&name)
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
        let handle = unsafe {
            CreateNamedPipeW(
                wide.as_ptr(),
                PIPE_ACCESS_DUPLEX | FILE_FLAG_FIRST_PIPE_INSTANCE,
                PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
                PIPE_UNLIMITED_INSTANCES,
                64 * 1024,
                64 * 1024,
                0,
                &mut attributes,
            )
        };
        unsafe {
            LocalFree(descriptor);
        }
        if handle == INVALID_HANDLE_VALUE {
            return Err(EndpointError(format!(
                "create owner-only named pipe: {}",
                std::io::Error::last_os_error()
            )));
        }
        Ok(Self { handle, name })
    }

    /// Accepts only after the pipe ACL and a fresh client-token comparison both identify owner.
    pub fn accept_owner(&self) -> Result<(), EndpointError> {
        use windows_sys::Win32::Foundation::{ERROR_PIPE_CONNECTED, GetLastError};
        use windows_sys::Win32::System::Pipes::{
            ConnectNamedPipe, DisconnectNamedPipe, GetNamedPipeClientProcessId,
        };
        let connected = unsafe { ConnectNamedPipe(self.handle, std::ptr::null_mut()) };
        if connected == 0 && unsafe { GetLastError() } != ERROR_PIPE_CONNECTED {
            return Err(EndpointError(format!(
                "accept named-pipe client: {}",
                std::io::Error::last_os_error()
            )));
        }
        let mut pid = 0_u32;
        if unsafe { GetNamedPipeClientProcessId(self.handle, &mut pid) } == 0
            || !same_user_as_current_process(pid)?
        {
            unsafe {
                DisconnectNamedPipe(self.handle);
            }
            return Err(EndpointError(
                "named-pipe peer does not match the endpoint owner".to_owned(),
            ));
        }
        Ok(())
    }

    pub fn name(&self) -> &str {
        &self.name
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

#[cfg(windows)]
impl Drop for OwnerEndpoint {
    fn drop(&mut self) {
        unsafe {
            windows_sys::Win32::Foundation::CloseHandle(self.handle);
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
