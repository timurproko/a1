//! Release-local resident authority. Session file locks deliberately do not use this namespace.

use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

static RELEASE: OnceLock<String> = OnceLock::new();

/// The identity of the immutable release whose fixed command loaded this addon.
pub fn release_id() -> Result<String, String> {
    if let Some(id) = RELEASE.get() {
        return Ok(id.clone());
    }
    let host = crate::launch::host_command().map_err(|error| error.to_string())?;
    let entry = host
        .arguments
        .first()
        .map(PathBuf::from)
        .unwrap_or_else(|| host.executable.clone());
    let entry = std::fs::canonicalize(entry).map_err(|error| error.to_string())?;
    let root = super::release_holds::own_release_root();
    let id = match root.as_deref() {
        Some(root) => identity_for(Path::new(root), Path::new("")),
        None => identity_for(&entry, &host.artifact),
    };
    let _ = RELEASE.set(id.clone());
    Ok(id)
}

fn identity_for(identity: &Path, artifact: &Path) -> String {
    let mut digest = Sha256::new();
    digest.update(b"a1-resident-release-v1\0");
    for path in [identity, artifact] {
        let text = path.to_string_lossy();
        #[cfg(windows)]
        let text = text.to_lowercase();
        digest.update(text.as_bytes());
        digest.update([0]);
    }
    hex::encode(digest.finalize())
}

/// A bounded flat namespace keeps old and new registries independently discoverable by GC.
pub fn token(profile: &Path) -> Result<String, String> {
    token_for(profile, &release_id()?)
}

#[cfg(feature = "resident-fixtures")]
/// Namespace for a compiled role fixture, which hosts its roles without a JavaScript entry.
pub fn fixture_token(profile: &Path, executable: &Path) -> Result<String, String> {
    let executable = std::fs::canonicalize(executable).map_err(|error| error.to_string())?;
    token_for(profile, &identity_for(&executable, &executable))
}

#[cfg(feature = "resident-fixtures")]
/// Release identity for the standalone compiled role fixture only.
pub fn fixture_release_id(executable: &Path) -> Result<String, String> {
    let executable = std::fs::canonicalize(executable).map_err(|error| error.to_string())?;
    Ok(identity_for(&executable, &executable))
}

fn token_for(profile: &Path, release: &str) -> Result<String, String> {
    let canonical = std::fs::canonicalize(profile).map_err(|error| error.to_string())?;
    let mut digest = Sha256::new();
    digest.update(b"a1-resident-scope-v1\0");
    let text = canonical.to_string_lossy();
    #[cfg(windows)]
    let text = text.to_lowercase();
    digest.update(text.as_bytes());
    digest.update([0]);
    digest.update(release.as_bytes());
    Ok(hex::encode(digest.finalize())[..20].to_owned())
}

/// Reject a different release before optional capability negotiation or state adoption.
pub fn admit(offered: &str) -> Result<(), String> {
    if !offered.is_empty() && offered == release_id()? {
        Ok(())
    } else {
        Err("resident release mismatch".into())
    }
}

/// Child launch targets must remain the fixed originating release and Node runtime.
pub fn pin_launch(release: &mut String, node: &mut String) -> Result<(), String> {
    let host = crate::launch::host_command().map_err(|error| error.to_string())?;
    if let Some(root) = super::release_holds::own_release_root() {
        let selected = std::fs::canonicalize(&*release).map_err(|error| error.to_string())?;
        if selected != PathBuf::from(&root) {
            return Err("resident child release mismatch".into());
        }
        *release = root;
        *node = host.executable.to_string_lossy().into_owned();
    } else if !cfg!(feature = "resident-fixtures") {
        return Err("resident immutable release is unavailable".into());
    }
    Ok(())
}

/// Records the namespace owner before readiness, so GC can retain the serving release.
pub fn write_owner_marker(root: &Path, endpoint: &str) -> Result<(), String> {
    let owner = crate::identity::inspect_process(std::process::id())
        .map_err(|error| error.to_string())?
        .ok_or("inspect server owner identity")?;
    let marker = serde_json::to_vec_pretty(&serde_json::json!({
        "pid": owner.pid, "startIdentity": owner.start, "endpoint": endpoint,
        "generation": crate::protocol::GENERATION, "verified": true,
        "releaseId": release_id()?, "releaseRoot": super::release_holds::own_release_root(),
        "detachmentMode": "resident-child",
    }))
    .map_err(|error| error.to_string())?;
    crate::durable::replace(root.join("server.json"), &marker).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn releases_and_profiles_have_separate_bounded_authority() {
        let a = tempfile::tempdir().unwrap();
        let b = tempfile::tempdir().unwrap();
        let first = token_for(a.path(), "release-a").unwrap();
        assert_eq!(first.len(), 20);
        assert_eq!(first, token_for(&a.path().join("."), "release-a").unwrap());
        assert_ne!(first, token_for(a.path(), "release-b").unwrap());
        assert_ne!(first, token_for(b.path(), "release-a").unwrap());
        assert_ne!(first, crate::endpoint::endpoint_token(a.path()).unwrap());
    }

    #[test]
    fn equal_tab_ids_do_not_share_credentials_across_releases() {
        let root = tempfile::tempdir().unwrap();
        let a = super::super::credentials::ProfileCredentials::load_or_create(&root.path().join(token_for(root.path(), "a").unwrap())).unwrap();
        let b = super::super::credentials::ProfileCredentials::load_or_create(&root.path().join(token_for(root.path(), "b").unwrap())).unwrap();
        assert_ne!(a.client_token, b.client_token);
        assert_ne!(a.derive("holder", "tab-1", 1), b.derive("holder", "tab-1", 1));
        assert_ne!(a.derive("bridge", "tab-1", 1), b.derive("bridge", "tab-1", 1));
    }

    #[test]
    fn payload_roots_not_display_versions_define_release_identity() {
        let a = identity_for(Path::new("/releases/1.0-hash-a"), Path::new("/a/host.node"));
        let b = identity_for(Path::new("/releases/1.0-hash-b"), Path::new("/b/host.node"));
        assert_ne!(a, b);
        assert_eq!(a.len(), 64);
        assert_eq!(
            a,
            identity_for(Path::new("/releases/1.0-hash-a"), Path::new("/a/host.node"))
        );
    }
}
