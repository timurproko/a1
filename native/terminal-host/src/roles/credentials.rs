use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

use hmac::{Hmac, Mac};
use rand::Rng;
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone)]
pub struct ProfileCredentials {
    pub client_token: [u8; 32],
    secret: [u8; 32],
    pub client_token_path: PathBuf,
    pub secret_path: PathBuf,
}

impl ProfileCredentials {
    pub fn load_or_create(root: &Path) -> Result<Self, String> {
        protect_directory(root)?;
        let client_token_path = root.join("client-token");
        let secret_path = root.join("profile-secret");
        let client_token = load_or_create_secret(&client_token_path)?;
        let secret = load_or_create_secret(&secret_path)?;
        Ok(Self {
            client_token,
            secret,
            client_token_path,
            secret_path,
        })
    }

    pub fn derive(&self, role: &str, tab_id: &str, incarnation: u64) -> [u8; 32] {
        derive_credential(&self.secret, role, tab_id, incarnation)
    }
}

pub fn derive_credential(
    secret: &[u8; 32],
    role: &str,
    tab_id: &str,
    incarnation: u64,
) -> [u8; 32] {
    let mut mac = HmacSha256::new_from_slice(secret).expect("HMAC accepts a 32-byte key");
    mac.update(role.as_bytes());
    mac.update(&[0]);
    mac.update(tab_id.as_bytes());
    mac.update(&[0]);
    mac.update(&incarnation.to_be_bytes());
    mac.finalize().into_bytes().into()
}

fn load_or_create_secret(path: &Path) -> Result<[u8; 32], String> {
    match fs::read(path) {
        Ok(bytes) => return decode_secret_after_create_race(path, bytes),
        Err(error) if error.kind() != std::io::ErrorKind::NotFound => {
            return Err(format!("read {}: {error}", path.display()));
        }
        Err(_) => {}
    }
    let mut value = [0_u8; 32];
    rand::rng().fill_bytes(&mut value);
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    match options.open(path) {
        Ok(mut file) => {
            file.write_all(&value)
                .and_then(|()| file.sync_all())
                .map_err(|error| format!("commit {}: {error}", path.display()))?;
            protect_file(path)?;
            Ok(value)
        }
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            let bytes = fs::read(path)
                .map_err(|error| format!("read raced {}: {error}", path.display()))?;
            decode_secret_after_create_race(path, bytes)
        }
        Err(error) => Err(format!("create {}: {error}", path.display())),
    }
}

fn decode_secret_after_create_race(path: &Path, mut bytes: Vec<u8>) -> Result<[u8; 32], String> {
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(1);
    while bytes.len() != 32 && std::time::Instant::now() < deadline {
        std::thread::sleep(std::time::Duration::from_millis(5));
        bytes =
            fs::read(path).map_err(|error| format!("read raced {}: {error}", path.display()))?;
    }
    bytes
        .try_into()
        .map_err(|_| format!("{} does not contain 32 bytes", path.display()))
}

fn protect_directory(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|error| format!("create credential directory: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))
            .map_err(|error| format!("protect credential directory: {error}"))?;
    }
    #[cfg(windows)]
    protect_windows_path(path)?;
    Ok(())
}

fn protect_file(path: &Path) -> Result<(), String> {
    let _ = path;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|error| format!("protect credential file: {error}"))?;
    }
    #[cfg(windows)]
    protect_windows_path(path)?;
    Ok(())
}

#[cfg(windows)]
fn protect_windows_path(path: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Authorization::{
        ConvertStringSecurityDescriptorToSecurityDescriptorW, SDDL_REVISION_1,
    };
    use windows_sys::Win32::Security::{DACL_SECURITY_INFORMATION, SetFileSecurityW};
    let sddl = std::ffi::OsStr::new("D:P(A;;FA;;;OW)")
        .encode_wide()
        .chain(Some(0))
        .collect::<Vec<_>>();
    let wide = path
        .as_os_str()
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
        return Err(format!(
            "create credential ACL: {}",
            std::io::Error::last_os_error()
        ));
    }
    let accepted =
        unsafe { SetFileSecurityW(wide.as_ptr(), DACL_SECURITY_INFORMATION, descriptor) };
    unsafe { LocalFree(descriptor) };
    if accepted == 0 {
        Err(format!(
            "protect credential path: {}",
            std::io::Error::last_os_error()
        ))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn credentials_survive_restart_and_are_domain_separated() {
        let root = tempfile::tempdir().unwrap();
        let first = ProfileCredentials::load_or_create(root.path()).unwrap();
        let second = ProfileCredentials::load_or_create(root.path()).unwrap();
        assert_eq!(first.client_token, second.client_token);
        assert_eq!(
            first.derive("bridge", "tab-1", 1),
            second.derive("bridge", "tab-1", 1)
        );
        assert_ne!(
            first.derive("bridge", "tab-1", 1),
            first.derive("holder", "tab-1", 1)
        );
        assert_ne!(
            first.derive("bridge", "tab-1", 1),
            first.derive("bridge", "tab-2", 1)
        );
        assert_ne!(
            first.derive("bridge", "tab-1", 1),
            first.derive("bridge", "tab-1", 2)
        );
    }

    #[cfg(windows)]
    fn assert_owner_only(path: &Path) {
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::Foundation::LocalFree;
        use windows_sys::Win32::Security::Authorization::{GetNamedSecurityInfoW, SE_FILE_OBJECT};
        use windows_sys::Win32::Security::{
            ACCESS_ALLOWED_ACE, DACL_SECURITY_INFORMATION, GetAce, IsWellKnownSid,
            PSECURITY_DESCRIPTOR, WinCreatorOwnerRightsSid,
        };
        use windows_sys::Win32::Storage::FileSystem::FILE_ALL_ACCESS;

        let wide = path
            .as_os_str()
            .encode_wide()
            .chain(Some(0))
            .collect::<Vec<_>>();
        let mut dacl = std::ptr::null_mut();
        let mut descriptor: PSECURITY_DESCRIPTOR = std::ptr::null_mut();
        let result = unsafe {
            GetNamedSecurityInfoW(
                wide.as_ptr(),
                SE_FILE_OBJECT,
                DACL_SECURITY_INFORMATION,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                &mut dacl,
                std::ptr::null_mut(),
                &mut descriptor,
            )
        };
        assert_eq!(result, 0, "read ACL for {}", path.display());
        assert!(!dacl.is_null(), "missing DACL for {}", path.display());
        assert_eq!(
            unsafe { (*dacl).AceCount },
            1,
            "unexpected ACE count for {}",
            path.display()
        );
        let mut raw_ace = std::ptr::null_mut();
        assert_ne!(unsafe { GetAce(dacl, 0, &mut raw_ace) }, 0);
        let ace = unsafe { &*(raw_ace.cast::<ACCESS_ALLOWED_ACE>()) };
        assert_eq!(ace.Header.AceType, 0);
        assert_eq!(ace.Mask, FILE_ALL_ACCESS);
        assert_ne!(
            unsafe {
                IsWellKnownSid(
                    std::ptr::addr_of!(ace.SidStart).cast_mut().cast(),
                    WinCreatorOwnerRightsSid,
                )
            },
            0,
            "ACE is not owner-rights for {}",
            path.display()
        );
        unsafe { LocalFree(descriptor) };
    }

    #[cfg(windows)]
    #[test]
    fn credential_storage_is_owner_only() {
        let root = tempfile::tempdir().unwrap();
        let credentials = ProfileCredentials::load_or_create(root.path()).unwrap();
        assert_owner_only(root.path());
        assert_owner_only(&credentials.client_token_path);
        assert_owner_only(&credentials.secret_path);
    }

    #[cfg(unix)]
    #[test]
    fn credential_storage_is_owner_only() {
        use std::os::unix::fs::PermissionsExt;
        let root = tempfile::tempdir().unwrap();
        let credentials = ProfileCredentials::load_or_create(root.path()).unwrap();
        assert_eq!(
            fs::metadata(root.path()).unwrap().permissions().mode() & 0o777,
            0o700
        );
        assert_eq!(
            fs::metadata(credentials.client_token_path)
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o600
        );
        assert_eq!(
            fs::metadata(credentials.secret_path)
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o600
        );
    }
}
