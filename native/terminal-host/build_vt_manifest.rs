//! The manifest that binds a published terminal library to the build that produced it.
//!
//! CI writes it beside the library it linked; a local development build verifies it before
//! linking those bytes instead of running Zig. Shared by `build.rs` and the crate's unit tests.

use std::fs;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

pub const VT_MANIFEST: &str = "terminal-vt.manifest.json";
pub const VT_MANIFEST_SCHEMA: &str = "a1-terminal-vt-v1";

/// The build identity a published terminal library must match before a development build links it.
pub struct VtIdentity<'a> {
    pub version: &'a str,
    pub ghostty_commit: &'a str,
    pub cargo_target: &'a str,
    pub zig_target: &'a str,
    pub zig_cpu: &'a str,
}

/// The archive a target links: MSVC resolves a static library by name, other targets link the
/// exact `.a` archive.
pub fn linked_archive(cargo_target: &str) -> &'static str {
    if cargo_target.contains("windows") {
        "ghostty-vt-static.lib"
    } else {
        "libghostty-vt.a"
    }
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

/// Render the manifest for library files given as `(file name, SHA-256)` pairs under `lib/`.
pub fn render_manifest(identity: &VtIdentity, files: &[(String, String)]) -> String {
    let files: Vec<_> = files
        .iter()
        .map(
            |(name, sha256)| serde_json::json!({ "path": format!("lib/{name}"), "sha256": sha256 }),
        )
        .collect();
    let manifest = serde_json::json!({
        "schema": VT_MANIFEST_SCHEMA,
        "version": identity.version,
        "ghosttyCommit": identity.ghostty_commit,
        "cargoTarget": identity.cargo_target,
        "zigTarget": identity.zig_target,
        "zigCpu": identity.zig_cpu,
        "files": files,
    });
    format!("{manifest}\n")
}

/// Verify a published library directory against this build and return its `lib` directory.
///
/// Every failure is one line naming the directory and the first mismatch; there is no fallback.
pub fn verify_prebuilt(directory: &Path, identity: &VtIdentity) -> Result<PathBuf, String> {
    let fail = |reason: String| {
        format!(
            "prebuilt terminal library {} does not match this build: {reason}",
            directory.display()
        )
    };
    let text = fs::read_to_string(directory.join(VT_MANIFEST))
        .map_err(|error| fail(format!("read {VT_MANIFEST}: {error}")))?;
    let manifest: serde_json::Value = serde_json::from_str(&text)
        .map_err(|error| fail(format!("parse {VT_MANIFEST}: {error}")))?;
    for (field, expected) in [
        ("schema", VT_MANIFEST_SCHEMA),
        ("version", identity.version),
        ("ghosttyCommit", identity.ghostty_commit),
        ("cargoTarget", identity.cargo_target),
        ("zigTarget", identity.zig_target),
        ("zigCpu", identity.zig_cpu),
    ] {
        let actual = manifest[field].as_str().unwrap_or("<missing>");
        if actual != expected {
            return Err(fail(format!("{field} is {actual}, expected {expected}")));
        }
    }
    let files = manifest["files"]
        .as_array()
        .filter(|files| !files.is_empty())
        .ok_or_else(|| fail("files are missing".to_owned()))?;
    let lib = directory.join("lib");
    let mut verified = Vec::new();
    for file in files {
        let path = file["path"].as_str().unwrap_or_default();
        let sha256 = file["sha256"].as_str().unwrap_or_default();
        // Security: only plain file names under `lib/` are read, so a manifest cannot point the
        // check at a file outside the published directory.
        let name = path
            .strip_prefix("lib/")
            .filter(|name| !name.is_empty() && !name.contains(['/', '\\']) && *name != "..")
            .ok_or_else(|| fail(format!("file path {path:?} is not a library file")))?;
        let bytes =
            fs::read(lib.join(name)).map_err(|error| fail(format!("read {path}: {error}")))?;
        let actual = sha256_hex(&bytes);
        if actual != sha256 {
            return Err(fail(format!(
                "{path} has SHA-256 {actual}, expected {sha256}"
            )));
        }
        verified.push(name);
    }
    let archive = linked_archive(identity.cargo_target);
    if !verified.contains(&archive) {
        return Err(fail(format!("manifest does not list lib/{archive}")));
    }
    Ok(lib)
}

#[cfg(test)]
mod tests {
    use super::{
        VT_MANIFEST, VtIdentity, linked_archive, render_manifest, sha256_hex, verify_prebuilt,
    };
    use std::fs;
    use std::path::Path;

    const TARGET: &str = "x86_64-unknown-linux-gnu";

    fn identity(version: &str) -> VtIdentity<'_> {
        VtIdentity {
            version,
            ghostty_commit: "c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3",
            cargo_target: TARGET,
            zig_target: "x86_64-linux-gnu",
            zig_cpu: "baseline",
        }
    }

    fn publish(directory: &Path, files: &[(&str, &[u8])], manifest_files: &[(String, String)]) {
        fs::create_dir_all(directory.join("lib")).unwrap();
        for (name, bytes) in files {
            fs::write(directory.join("lib").join(name), bytes).unwrap();
        }
        fs::write(
            directory.join(VT_MANIFEST),
            render_manifest(&identity("1.3.2"), manifest_files),
        )
        .unwrap();
    }

    fn listed(name: &str, bytes: &[u8]) -> (String, String) {
        (name.to_owned(), sha256_hex(bytes))
    }

    #[test]
    fn accepts_a_library_published_for_this_build() {
        let root = tempfile::tempdir().unwrap();
        let archive = linked_archive(TARGET);
        publish(
            root.path(),
            &[(archive, b"archive")],
            &[listed(archive, b"archive")],
        );
        assert_eq!(
            verify_prebuilt(root.path(), &identity("1.3.2")),
            Ok(root.path().join("lib"))
        );
    }

    #[test]
    fn rejects_another_version_or_target_in_one_line() {
        let root = tempfile::tempdir().unwrap();
        let archive = linked_archive(TARGET);
        publish(
            root.path(),
            &[(archive, b"archive")],
            &[listed(archive, b"archive")],
        );
        let error = verify_prebuilt(root.path(), &identity("1.3.3")).unwrap_err();
        assert!(
            error.ends_with("version is 1.3.2, expected 1.3.3"),
            "{error}"
        );
        assert!(!error.contains('\n'));
        let mut other = identity("1.3.2");
        other.cargo_target = "aarch64-apple-darwin";
        assert!(
            verify_prebuilt(root.path(), &other)
                .unwrap_err()
                .contains("cargoTarget is x86_64-unknown-linux-gnu")
        );
    }

    #[test]
    fn rejects_changed_bytes_missing_archives_and_paths_outside_lib() {
        let root = tempfile::tempdir().unwrap();
        let archive = linked_archive(TARGET);
        publish(
            root.path(),
            &[(archive, b"changed")],
            &[listed(archive, b"archive")],
        );
        assert!(
            verify_prebuilt(root.path(), &identity("1.3.2"))
                .unwrap_err()
                .contains("has SHA-256")
        );

        let other = tempfile::tempdir().unwrap();
        publish(
            other.path(),
            &[("ghostty-vt.lib", b"import")],
            &[listed("ghostty-vt.lib", b"import")],
        );
        assert!(
            verify_prebuilt(other.path(), &identity("1.3.2"))
                .unwrap_err()
                .contains(&format!("does not list lib/{archive}"))
        );

        let escaping = tempfile::tempdir().unwrap();
        publish(
            escaping.path(),
            &[],
            &[listed("../terminal-vt.manifest.json", b"")],
        );
        assert!(
            verify_prebuilt(escaping.path(), &identity("1.3.2"))
                .unwrap_err()
                .contains("is not a library file")
        );
    }

    #[test]
    fn rejects_a_directory_without_a_manifest() {
        let root = tempfile::tempdir().unwrap();
        assert!(
            verify_prebuilt(root.path(), &identity("1.3.2"))
                .unwrap_err()
                .contains(&format!("read {VT_MANIFEST}"))
        );
    }
}
