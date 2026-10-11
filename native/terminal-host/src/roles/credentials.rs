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
        Ok(bytes) => {
            return bytes
                .try_into()
                .map_err(|_| format!("{} does not contain 32 bytes", path.display()));
        }
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
            bytes
                .try_into()
                .map_err(|_| format!("{} does not contain 32 bytes", path.display()))
        }
        Err(error) => Err(format!("create {}: {error}", path.display())),
    }
}

fn protect_directory(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|error| format!("create credential directory: {error}"))?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))
            .map_err(|error| format!("protect credential directory: {error}"))?;
    }
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
    Ok(())
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
