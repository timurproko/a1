use std::fmt;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DurabilityStep {
    TemporaryCreated,
    BytesWritten,
    FileSynchronized,
    TargetReplaced,
    DirectorySynchronized,
}

pub const ALL_DURABILITY_STEPS: [DurabilityStep; 5] = [
    DurabilityStep::TemporaryCreated,
    DurabilityStep::BytesWritten,
    DurabilityStep::FileSynchronized,
    DurabilityStep::TargetReplaced,
    DurabilityStep::DirectorySynchronized,
];

impl DurabilityStep {
    pub fn name(self) -> &'static str {
        match self {
            Self::TemporaryCreated => "temporary-created",
            Self::BytesWritten => "bytes-written",
            Self::FileSynchronized => "file-synchronized",
            Self::TargetReplaced => "target-replaced",
            Self::DirectorySynchronized => "directory-synchronized",
        }
    }

    pub fn parse(value: &str) -> Option<Self> {
        ALL_DURABILITY_STEPS
            .into_iter()
            .find(|step| step.name() == value)
    }
}

#[derive(Debug)]
pub struct DurableError(pub String);
impl fmt::Display for DurableError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for DurableError {}

pub fn replace(target: impl AsRef<Path>, bytes: &[u8]) -> Result<(), DurableError> {
    replace_with_observer(target.as_ref(), bytes, |step| {
        match step {
            DurabilityStep::TemporaryCreated => {
                crate::fault_injection::crash_at("durable-temporary-created")
            }
            DurabilityStep::BytesWritten => {
                crate::fault_injection::crash_at("durable-bytes-written")
            }
            DurabilityStep::FileSynchronized => {
                crate::fault_injection::crash_at("durable-file-synchronized")
            }
            DurabilityStep::TargetReplaced => {
                crate::fault_injection::crash_at("durable-target-replaced")
            }
            DurabilityStep::DirectorySynchronized => {
                crate::fault_injection::crash_at("durable-directory-synchronized")
            }
        }
        Ok(())
    })
}

pub fn replace_with_observer(
    target: &Path,
    bytes: &[u8],
    mut observe: impl FnMut(DurabilityStep) -> Result<(), DurableError>,
) -> Result<(), DurableError> {
    let parent = target
        .parent()
        .ok_or_else(|| DurableError("replacement target has no parent".to_owned()))?;
    if !parent.is_dir() {
        return Err(DurableError(format!(
            "replacement parent {} is unavailable",
            parent.display()
        )));
    }
    ensure_supported_filesystem(parent)?;
    let temporary = temporary_path(target)?;
    let result = (|| {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .read(true)
            .open(&temporary)
            .map_err(|error| {
                DurableError(format!(
                    "create temporary replacement {}: {error}",
                    temporary.display()
                ))
            })?;
        observe(DurabilityStep::TemporaryCreated)?;
        file.write_all(bytes)
            .map_err(|error| DurableError(format!("write temporary replacement: {error}")))?;
        file.flush()
            .map_err(|error| DurableError(format!("flush temporary replacement: {error}")))?;
        observe(DurabilityStep::BytesWritten)?;
        crate::fault_injection::delay("A1_TABS_FAULT_DELAY_FSYNC_MS");
        if target.file_name().and_then(|name| name.to_str()) == Some("registry.json")
            && target.exists()
        {
            crate::fault_injection::delay("A1_TABS_FAULT_DELAY_REGISTRY_FSYNC_MS");
        }
        sync_file(&file)?;
        observe(DurabilityStep::FileSynchronized)?;
        drop(file);
        atomic_replace(&temporary, target)?;
        observe(DurabilityStep::TargetReplaced)?;
        sync_parent(parent)?;
        observe(DurabilityStep::DirectorySynchronized)?;
        Ok(())
    })();
    if result.is_err() && temporary.exists() {
        let _ = std::fs::remove_file(&temporary);
    }
    result
}

#[cfg(target_os = "linux")]
fn ensure_supported_filesystem(parent: &Path) -> Result<(), DurableError> {
    use std::os::unix::ffi::OsStrExt;
    let path = std::ffi::CString::new(parent.as_os_str().as_bytes())
        .map_err(|_| DurableError("replacement path contains NUL".to_owned()))?;
    let mut status: libc::statfs = unsafe { std::mem::zeroed() };
    if unsafe { libc::statfs(path.as_ptr(), &mut status) } != 0 {
        return Err(DurableError(format!(
            "inspect replacement filesystem: {}",
            std::io::Error::last_os_error()
        )));
    }
    const CIFS_MAGIC: libc::c_long = 0xFF53_4D42_u32 as libc::c_long;
    const SMB2_MAGIC: libc::c_long = 0xFE53_4D42_u32 as libc::c_long;
    if matches!(
        status.f_type as libc::c_long,
        libc::NFS_SUPER_MAGIC | CIFS_MAGIC | SMB2_MAGIC
    ) {
        return Err(DurableError(
            "durable replacement refuses a remote Linux filesystem".to_owned(),
        ));
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn ensure_supported_filesystem(parent: &Path) -> Result<(), DurableError> {
    use std::os::unix::ffi::OsStrExt;
    let path = std::ffi::CString::new(parent.as_os_str().as_bytes())
        .map_err(|_| DurableError("replacement path contains NUL".to_owned()))?;
    let mut status: libc::statfs = unsafe { std::mem::zeroed() };
    if unsafe { libc::statfs(path.as_ptr(), &mut status) } != 0 {
        return Err(DurableError(format!(
            "inspect replacement filesystem: {}",
            std::io::Error::last_os_error()
        )));
    }
    if status.f_flags & libc::MNT_LOCAL as u32 == 0 {
        return Err(DurableError(
            "durable replacement refuses a remote macOS filesystem".to_owned(),
        ));
    }
    Ok(())
}

#[cfg(windows)]
fn ensure_supported_filesystem(parent: &Path) -> Result<(), DurableError> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{GetDriveTypeW, GetVolumePathNameW};
    const DRIVE_REMOTE: u32 = 4;
    let path = parent
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let mut volume = vec![0_u16; 1024];
    if unsafe { GetVolumePathNameW(path.as_ptr(), volume.as_mut_ptr(), volume.len() as u32) } == 0 {
        return Err(DurableError(format!(
            "resolve replacement volume: {}",
            std::io::Error::last_os_error()
        )));
    }
    if unsafe { GetDriveTypeW(volume.as_ptr()) } == DRIVE_REMOTE {
        return Err(DurableError(
            "durable replacement refuses a remote Windows filesystem".to_owned(),
        ));
    }
    Ok(())
}

fn temporary_path(target: &Path) -> Result<PathBuf, DurableError> {
    let name = target
        .file_name()
        .ok_or_else(|| DurableError("replacement target has no file name".to_owned()))?
        .to_string_lossy();
    for _ in 0..32 {
        let nonce: u64 = rand::random();
        let candidate = target.with_file_name(format!(".{name}.a1-{nonce:016x}.tmp"));
        if !candidate.exists() {
            return Ok(candidate);
        }
    }
    Err(DurableError(
        "could not reserve a unique replacement file".to_owned(),
    ))
}

#[cfg(target_os = "linux")]
fn sync_file(file: &File) -> Result<(), DurableError> {
    file.sync_all()
        .map_err(|error| DurableError(format!("fsync replacement file: {error}")))
}

#[cfg(target_os = "macos")]
fn sync_file(file: &File) -> Result<(), DurableError> {
    use std::os::fd::AsRawFd;
    let result = unsafe { libc::fcntl(file.as_raw_fd(), libc::F_FULLFSYNC) };
    if result == -1 {
        Err(DurableError(format!(
            "F_FULLFSYNC replacement file: {}",
            std::io::Error::last_os_error()
        )))
    } else {
        Ok(())
    }
}

#[cfg(windows)]
fn sync_file(file: &File) -> Result<(), DurableError> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::FlushFileBuffers;
    if unsafe { FlushFileBuffers(file.as_raw_handle() as _) } == 0 {
        Err(DurableError(format!(
            "FlushFileBuffers replacement file: {}",
            std::io::Error::last_os_error()
        )))
    } else {
        Ok(())
    }
}

#[cfg(any(target_os = "linux", target_os = "macos"))]
fn atomic_replace(from: &Path, to: &Path) -> Result<(), DurableError> {
    std::fs::rename(from, to).map_err(|error| DurableError(format!("rename replacement: {error}")))
}

#[cfg(windows)]
fn atomic_replace(from: &Path, to: &Path) -> Result<(), DurableError> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH, MoveFileExW,
    };
    let from = from
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let to = to
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    if unsafe {
        MoveFileExW(
            from.as_ptr(),
            to.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    } == 0
    {
        Err(DurableError(format!(
            "MoveFileExW replacement: {}",
            std::io::Error::last_os_error()
        )))
    } else {
        Ok(())
    }
}

#[cfg(target_os = "linux")]
fn sync_parent(parent: &Path) -> Result<(), DurableError> {
    File::open(parent)
        .and_then(|directory| directory.sync_all())
        .map_err(|error| DurableError(format!("fsync replacement directory: {error}")))
}

#[cfg(target_os = "macos")]
fn sync_parent(parent: &Path) -> Result<(), DurableError> {
    use std::os::fd::AsRawFd;
    let directory = File::open(parent)
        .map_err(|error| DurableError(format!("open replacement directory: {error}")))?;
    directory
        .sync_all()
        .map_err(|error| DurableError(format!("fsync replacement directory: {error}")))?;
    let result = unsafe { libc::fcntl(directory.as_raw_fd(), libc::F_FULLFSYNC) };
    if result == -1 {
        let error = std::io::Error::last_os_error();
        if !matches!(error.raw_os_error(), Some(code) if code == libc::EINVAL || code == libc::ENOTSUP)
        {
            return Err(DurableError(format!(
                "F_FULLFSYNC replacement directory: {error}"
            )));
        }
        // Platform: APFS/macOS may reject F_FULLFSYNC for directory descriptors after accepting
        // fsync; that explicit capability result leaves the completed directory fsync required.
    }
    Ok(())
}

#[cfg(windows)]
fn sync_parent(_parent: &Path) -> Result<(), DurableError> {
    // Platform: MOVEFILE_WRITE_THROUGH is the supported metadata barrier for this primitive.
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_injected_boundary_leaves_complete_old_or_new_content() {
        for fail_at in [
            DurabilityStep::TemporaryCreated,
            DurabilityStep::BytesWritten,
            DurabilityStep::FileSynchronized,
            DurabilityStep::TargetReplaced,
            DurabilityStep::DirectorySynchronized,
        ] {
            let root = tempfile::tempdir().expect("tempdir");
            let target = root.path().join("registry.json");
            std::fs::write(&target, b"complete-old").expect("old");
            let _ = replace_with_observer(&target, b"complete-new", |step| {
                if step == fail_at {
                    Err(DurableError("injected termination boundary".to_owned()))
                } else {
                    Ok(())
                }
            });
            let observed = std::fs::read(&target).expect("target");
            assert!(
                observed == b"complete-old" || observed == b"complete-new",
                "partial target at {fail_at:?}: {observed:?}"
            );
        }
    }

    #[test]
    fn successful_replacement_is_complete() {
        let root = tempfile::tempdir().expect("tempdir");
        let target = root.path().join("registry.json");
        std::fs::write(&target, b"old").expect("old");
        replace(&target, b"new").expect("replace");
        assert_eq!(std::fs::read(target).expect("read"), b"new");
    }
}
