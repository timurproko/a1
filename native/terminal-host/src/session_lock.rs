use std::fmt;
use std::fs::{File, OpenOptions};
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

#[derive(Debug)]
pub struct LockError(pub String);
impl fmt::Display for LockError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for LockError {}

#[derive(Debug)]
pub struct SessionLock {
    requested: PathBuf,
    reservation: Option<LockedFile>,
    identity: Option<LockedFile>,
}

impl SessionLock {
    pub fn acquire(path: impl AsRef<Path>) -> Result<Self, LockError> {
        let requested = absolute(path.as_ref())?;
        if requested.exists() {
            // Concurrency: existing-file writers take the location gate while moving to stable
            // identity authority, so a creator cannot be overtaken between create and bind.
            let location_key = new_location_identity(&requested)?;
            let reservation = LockedFile::acquire(&lock_path("location", &location_key)?)?;
            let key = existing_identity(&requested)?;
            let identity = LockedFile::acquire(&lock_path("identity", &key)?)?;
            let after = existing_identity(&requested)?;
            if after != key {
                return Err(LockError(
                    "session identity changed while its writer lock was acquired".to_owned(),
                ));
            }
            drop(reservation);
            Ok(Self {
                requested,
                reservation: None,
                identity: Some(identity),
            })
        } else {
            let key = new_location_identity(&requested)?;
            let reservation = LockedFile::acquire(&lock_path("location", &key)?)?;
            if requested.exists() {
                return Err(LockError(
                    "session appeared while its new-file reservation was acquired".to_owned(),
                ));
            }
            Ok(Self {
                requested,
                reservation: Some(reservation),
                identity: None,
            })
        }
    }

    pub fn is_bound(&self) -> bool {
        self.identity.is_some()
    }

    /// Bind a newly-created session before any session content is written.
    pub fn bind_created(&mut self, path: impl AsRef<Path>) -> Result<(), LockError> {
        if self.identity.is_some() || self.reservation.is_none() {
            return Err(LockError(
                "session lock is not an unbound new-file reservation".to_owned(),
            ));
        }
        let path = absolute(path.as_ref())?;
        if normalized_location(&path)? != normalized_location(&self.requested)? {
            return Err(LockError(
                "created session does not match the reserved location".to_owned(),
            ));
        }
        if !path.is_file() {
            return Err(LockError("created session file is unavailable".to_owned()));
        }
        let key = existing_identity(&path)?;
        let identity = LockedFile::acquire(&lock_path("identity", &key)?)?;
        if existing_identity(&path)? != key {
            return Err(LockError(
                "created session identity changed during bind".to_owned(),
            ));
        }
        self.identity = Some(identity);
        self.reservation.take();
        Ok(())
    }

    pub fn release(mut self) {
        self.identity.take();
        self.reservation.take();
    }
}

#[derive(Debug)]
struct LockedFile {
    file: File,
}

impl LockedFile {
    fn acquire(path: &Path) -> Result<Self, LockError> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(path)
            .map_err(|error| LockError(format!("open lock {}: {error}", path.display())))?;
        platform_lock(&file)
            .map_err(|error| LockError(format!("acquire lock {}: {error}", path.display())))?;
        Ok(Self { file })
    }
}

impl Drop for LockedFile {
    fn drop(&mut self) {
        let _ = platform_unlock(&self.file);
    }
}

fn absolute(path: &Path) -> Result<PathBuf, LockError> {
    if path.as_os_str().is_empty() {
        return Err(LockError("session path is empty".to_owned()));
    }
    if path.is_absolute() {
        Ok(path.to_path_buf())
    } else {
        std::env::current_dir()
            .map(|cwd| cwd.join(path))
            .map_err(|error| LockError(format!("resolve session path: {error}")))
    }
}

fn normalized_location(path: &Path) -> Result<String, LockError> {
    let parent = path
        .parent()
        .ok_or_else(|| LockError("session path has no parent".to_owned()))?;
    let parent = std::fs::canonicalize(parent).map_err(|error| {
        LockError(format!(
            "canonicalize session parent {}: {error}",
            parent.display()
        ))
    })?;
    let name = path
        .file_name()
        .ok_or_else(|| LockError("session path has no file name".to_owned()))?
        .to_string_lossy();
    #[cfg(windows)]
    let name = name.to_lowercase();
    #[cfg(not(windows))]
    let name = name.into_owned();
    Ok(format!("{}\0{name}", parent.to_string_lossy()))
}

fn new_location_identity(path: &Path) -> Result<String, LockError> {
    normalized_location(path)
}

#[cfg(unix)]
fn existing_identity(path: &Path) -> Result<String, LockError> {
    use std::os::unix::fs::MetadataExt;
    let metadata = std::fs::metadata(path)
        .map_err(|error| LockError(format!("inspect session {}: {error}", path.display())))?;
    Ok(format!("unix:{}:{}", metadata.dev(), metadata.ino()))
}

#[cfg(windows)]
fn existing_identity(path: &Path) -> Result<String, LockError> {
    use std::mem::{size_of, zeroed};
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{
        FILE_ID_INFO, FileIdInfo, GetFileInformationByHandleEx,
    };
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(path)
        .map_err(|error| LockError(format!("open session identity {}: {error}", path.display())))?;
    let mut info: FILE_ID_INFO = unsafe { zeroed() };
    let accepted = unsafe {
        GetFileInformationByHandleEx(
            file.as_raw_handle() as _,
            FileIdInfo,
            (&mut info as *mut FILE_ID_INFO).cast(),
            size_of::<FILE_ID_INFO>() as u32,
        )
    };
    if accepted == 0 {
        return Err(LockError(format!(
            "read session identity {}: {}",
            path.display(),
            std::io::Error::last_os_error()
        )));
    }
    Ok(format!(
        "windows:{}:{}",
        info.VolumeSerialNumber,
        hex::encode(info.FileId.Identifier)
    ))
}

fn lock_root() -> Result<PathBuf, LockError> {
    let base = std::env::temp_dir().join("a1-session-locks");
    std::fs::create_dir_all(&base)
        .map_err(|error| LockError(format!("create lock root {}: {error}", base.display())))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&base, std::fs::Permissions::from_mode(0o700))
            .map_err(|error| LockError(format!("protect lock root {}: {error}", base.display())))?;
    }
    Ok(base)
}

fn lock_path(kind: &str, key: &str) -> Result<PathBuf, LockError> {
    let mut digest = Sha256::new();
    digest.update(kind.as_bytes());
    digest.update([0]);
    digest.update(key.as_bytes());
    Ok(lock_root()?.join(format!("{}-{}.lock", kind, hex::encode(digest.finalize()))))
}

#[cfg(target_os = "linux")]
fn platform_lock(file: &File) -> std::io::Result<()> {
    use std::os::fd::AsRawFd;
    let mut lock: libc::flock = unsafe { std::mem::zeroed() };
    lock.l_type = libc::F_WRLCK as _;
    lock.l_whence = libc::SEEK_SET as _;
    let result = unsafe { libc::fcntl(file.as_raw_fd(), libc::F_OFD_SETLK, &lock) };
    if result == -1 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(target_os = "linux")]
fn platform_unlock(file: &File) -> std::io::Result<()> {
    use std::os::fd::AsRawFd;
    let mut lock: libc::flock = unsafe { std::mem::zeroed() };
    lock.l_type = libc::F_UNLCK as _;
    lock.l_whence = libc::SEEK_SET as _;
    let result = unsafe { libc::fcntl(file.as_raw_fd(), libc::F_OFD_SETLK, &lock) };
    if result == -1 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(target_os = "macos")]
fn platform_lock(file: &File) -> std::io::Result<()> {
    use std::os::fd::AsRawFd;
    let result = unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) };
    if result == -1 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(target_os = "macos")]
fn platform_unlock(file: &File) -> std::io::Result<()> {
    use std::os::fd::AsRawFd;
    let result = unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_UN) };
    if result == -1 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(windows)]
fn platform_lock(file: &File) -> std::io::Result<()> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{
        LOCKFILE_EXCLUSIVE_LOCK, LOCKFILE_FAIL_IMMEDIATELY, LockFileEx,
    };
    let mut overlapped = unsafe { std::mem::zeroed() };
    let accepted = unsafe {
        LockFileEx(
            file.as_raw_handle() as _,
            LOCKFILE_EXCLUSIVE_LOCK | LOCKFILE_FAIL_IMMEDIATELY,
            0,
            1,
            0,
            &mut overlapped,
        )
    };
    if accepted == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(windows)]
fn platform_unlock(file: &File) -> std::io::Result<()> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::UnlockFileEx;
    let mut overlapped = unsafe { std::mem::zeroed() };
    let accepted = unsafe { UnlockFileEx(file.as_raw_handle() as _, 0, 1, 0, &mut overlapped) };
    if accepted == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn existing_aliases_contend_and_release() {
        let root = tempfile::tempdir().expect("tempdir");
        let session = root.path().join("session.jsonl");
        std::fs::write(&session, "").expect("session");
        let alias = root.path().join("alias.jsonl");
        std::fs::hard_link(&session, &alias).expect("hard link");
        let held = SessionLock::acquire(&session).expect("first lock");
        assert!(SessionLock::acquire(&alias).is_err());
        held.release();
        SessionLock::acquire(&alias).expect("released lock");
    }

    #[test]
    fn new_file_is_not_bound_until_identity_lock_is_held() {
        let root = tempfile::tempdir().expect("tempdir");
        let session = root.path().join("new.jsonl");
        let mut held = SessionLock::acquire(&session).expect("reservation");
        assert!(!held.is_bound());
        assert!(SessionLock::acquire(&session).is_err());
        File::create(&session).expect("create without content");
        assert!(
            SessionLock::acquire(&session).is_err(),
            "an existing-file writer must not overtake create/bind"
        );
        held.bind_created(&session).expect("bind");
        assert!(held.is_bound());
        assert!(SessionLock::acquire(&session).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn symbolic_alias_uses_the_same_identity_authority() {
        use std::os::unix::fs::symlink;
        let root = tempfile::tempdir().expect("tempdir");
        let session = root.path().join("session.jsonl");
        let alias = root.path().join("symbolic.jsonl");
        std::fs::write(&session, "").expect("session");
        symlink(&session, &alias).expect("symlink");
        let held = SessionLock::acquire(&session).expect("first lock");
        assert!(SessionLock::acquire(&alias).is_err());
        held.release();
        SessionLock::acquire(&alias).expect("released symbolic alias lock");
    }

    #[cfg(windows)]
    #[test]
    fn case_alias_uses_the_same_location_authority() {
        let root = tempfile::tempdir().expect("tempdir");
        let session = root.path().join("CaseSession.jsonl");
        let alias = root.path().join("casesession.jsonl");
        let held = SessionLock::acquire(&session).expect("first location lock");
        assert!(SessionLock::acquire(&alias).is_err());
        held.release();
        SessionLock::acquire(&alias).expect("released case alias lock");
    }
}
