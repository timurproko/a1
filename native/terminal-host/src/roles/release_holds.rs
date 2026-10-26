//! Read-only discovery of the releases that live resident processes run from.
//!
//! Release cleanup asks this before collecting anything. It never starts, signals, recovers, or
//! quarantines: it reads each profile's owner marker and registry under `<data>/tabs/` and checks
//! every recorded process by pid plus native start identity. Anything it cannot read or inspect
//! makes the answer incomplete, and the caller then keeps every release.

use std::path::Path;
use std::io::Read;

use serde::{Deserialize, Serialize};

use crate::identity::ProcessIdentity;
use crate::roles::registry::RegistryStore;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseHolds {
    pub schema: &'static str,
    /// False when any record or identity could not be verified; every release must then be kept.
    pub complete: bool,
    /// Release roots recorded by verified live servers, holders, and tab children, sorted.
    pub release_roots: Vec<String>,
    /// Bounded, content-free reasons for an incomplete answer.
    pub uncertain: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnerMarker {
    pub pid: u32,
    pub start_identity: String,
    #[serde(default)]
    pub release_root: Option<String>,
}

/// Decodes an owner marker's identity fields; anything malformed is `None`.
pub fn parse_owner_marker(bytes: &[u8]) -> Option<OwnerMarker> {
    serde_json::from_slice(bytes).ok()
}

enum Liveness {
    Live,
    Gone,
    Unknown,
}

const MAX_UNCERTAIN: usize = 32;
const MAX_NAMESPACES: usize = 4096;

/// The installed release root of the loaded addon, `<root>/dist/native/<target>/terminal-host.node`.
/// A development build outside that layout has none.
pub fn own_release_root() -> Option<String> {
    let artifact = crate::launch::host_command().ok()?.artifact;
    let target = artifact.parent()?;
    let native = target.parent()?;
    let dist = native.parent()?;
    if native.file_name()? != "native" || dist.file_name()? != "dist" {
        return None;
    }
    dist.parent()
        .map(|root| root.to_string_lossy().into_owned())
}

pub fn collect<F>(data_dir: &Path, inspect: F) -> ReleaseHolds
where
    F: Fn(u32) -> Result<Option<ProcessIdentity>, String>,
{
    let mut profiles = Vec::new();
    let mut uncertain = Vec::new();
    match std::fs::read_dir(data_dir.join("tabs")) {
        Ok(entries) => {
            for (index, entry) in entries.enumerate() {
                if index >= MAX_NAMESPACES { uncertain.push("resident namespace limit reached".into()); break; }
                match entry {
                    Ok(entry) if safe_namespace(&entry.path()) => profiles.push(entry.path()),
                    Ok(_) => uncertain.push("resident namespace ownership unverified".into()),
                    Err(_) => uncertain.push("tabs directory entry unreadable".to_owned()),
                }
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(_) => uncertain.push("tabs directory unreadable".to_owned()),
    }
    scan(&profiles, uncertain, inspect)
}

fn safe_namespace(path: &Path) -> bool {
    let Ok(metadata) = std::fs::symlink_metadata(path) else { return false; };
    if !metadata.is_dir() || metadata.file_type().is_symlink() { return false; }
    #[cfg(unix)] {
        use std::os::unix::fs::MetadataExt;
        if metadata.uid() != unsafe { libc::geteuid() } || metadata.mode() & 0o022 != 0 { return false; }
    }
    true
}

/// The holds of one profile/release directory only, as used when that host is stopped.
pub fn collect_profile<F>(profile: &Path, inspect: F) -> ReleaseHolds
where
    F: Fn(u32) -> Result<Option<ProcessIdentity>, String>,
{
    scan(&[profile.to_path_buf()], Vec::new(), inspect)
}

fn scan<F>(profiles: &[std::path::PathBuf], mut uncertain: Vec<String>, inspect: F) -> ReleaseHolds
where
    F: Fn(u32) -> Result<Option<ProcessIdentity>, String>,
{
    let mut roots = std::collections::BTreeSet::new();
    let mut remaining = 16 * 1024 * 1024;
    uncertain.truncate(MAX_UNCERTAIN);
    let mut note = |reason: String| {
        if uncertain.len() < MAX_UNCERTAIN {
            uncertain.push(reason);
        }
    };
    let liveness = |pid: u32, start: &str| match inspect(pid) {
        Ok(None) => Liveness::Gone,
        Ok(Some(observed)) if observed.start == start => Liveness::Live,
        // Invariant: a different start identity is pid reuse, not the recorded process.
        Ok(Some(_)) => Liveness::Gone,
        Err(_) => Liveness::Unknown,
    };
    for profile in profiles {
        let token = profile
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        match read_record(&profile.join("server.json"), &mut remaining) {
            Ok(bytes) => match parse_owner_marker(&bytes).ok_or(()) {
                Ok(marker) => match liveness(marker.pid, &marker.start_identity) {
                    Liveness::Live => match marker.release_root {
                        Some(root) => {
                            roots.insert(root);
                        }
                        None => note(format!("{token}: live server release is unrecorded")),
                    },
                    Liveness::Gone => {}
                    Liveness::Unknown => note(format!("{token}: server identity uninspectable")),
                },
                Err(_) => note(format!("{token}: owner marker unreadable")),
            },
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(_) => note(format!("{token}: owner marker unreadable")),
        }
        match read_registry(&profile.join("registry.json"), &mut remaining) {
            Ok(None) => {}
            Ok(Some(document)) => {
                for tab in document.tabs {
                    let processes = [
                        tab.holder_pid.zip(tab.holder_start_identity.as_deref()),
                        tab.child_pid.zip(tab.child_start_identity.as_deref()),
                    ];
                    for (pid, start) in processes.into_iter().flatten() {
                        match liveness(pid, start) {
                            Liveness::Live => {
                                roots.insert(tab.release.clone());
                            }
                            Liveness::Gone => {}
                            Liveness::Unknown => {
                                note(format!("{token}: tab process identity uninspectable"))
                            }
                        }
                    }
                }
            }
            Err(_) => note(format!("{token}: registry unreadable")),
        }
    }
    finish(roots, uncertain)
}

fn read_record(path: &Path, remaining: &mut usize) -> std::io::Result<Vec<u8>> {
    let metadata = std::fs::symlink_metadata(path)?;
    if !metadata.is_file() || metadata.len() > *remaining as u64 {
        return Err(std::io::Error::other("resident record boundary or size limit"));
    }
    let mut bytes = Vec::new();
    std::fs::File::open(path)?.take(*remaining as u64 + 1).read_to_end(&mut bytes)?;
    if bytes.len() > *remaining { return Err(std::io::Error::other("resident record budget exceeded")); }
    *remaining -= bytes.len();
    Ok(bytes)
}

fn read_registry(path: &Path, remaining: &mut usize) -> Result<Option<super::registry::RegistryDocument>, String> {
    match read_record(path, remaining) {
        Ok(bytes) => RegistryStore::parse(&bytes).map(Some),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

fn finish(roots: std::collections::BTreeSet<String>, uncertain: Vec<String>) -> ReleaseHolds {
    ReleaseHolds {
        schema: "a1-resident-release-holds-v1",
        complete: uncertain.is_empty(),
        release_roots: roots.into_iter().collect(),
        uncertain,
    }
}

#[cfg(test)]
mod tests {
    use super::{MAX_UNCERTAIN, ReleaseHolds, collect, collect_profile};
    use crate::identity::ProcessIdentity;
    use std::path::Path;

    fn profile(root: &Path, token: &str, marker: Option<&str>, registry: Option<&str>) {
        let directory = root.join("tabs").join(token);
        std::fs::create_dir_all(&directory).unwrap();
        if let Some(marker) = marker {
            std::fs::write(directory.join("server.json"), marker).unwrap();
        }
        if let Some(registry) = registry {
            std::fs::write(directory.join("registry.json"), registry).unwrap();
        }
    }

    fn registry(tabs: &str) -> String {
        format!(
            "{{\"registryRevision\":1,\"epoch\":1,\"bootId\":\"boot\",\"osSessionId\":\"session\",\"tabs\":[{tabs}]}}"
        )
    }

    fn tab(
        id: &str,
        holder: Option<(u32, &str)>,
        child: Option<(u32, &str)>,
        release: &str,
    ) -> String {
        let field = |value: Option<(u32, &str)>| match value {
            Some((pid, start)) => (pid.to_string(), format!("\"{start}\"")),
            None => ("null".to_owned(), "null".to_owned()),
        };
        let (holder_pid, holder_start) = field(holder);
        let (child_pid, child_start) = field(child);
        format!(
            "{{\"tabId\":\"{id}\",\"kind\":\"a1\",\"createdAt\":\"2026-10-14T00:00:00Z\",\"displayName\":\"t\",\"nameSource\":\"auto\",\"order\":0,\"cwd\":\"/w\",\"sessionFile\":null,\"sessionDir\":null,\"desired\":\"running\",\"lifecycle\":\"running\",\"incarnation\":1,\"holderPid\":{holder_pid},\"holderStartIdentity\":{holder_start},\"childPid\":{child_pid},\"childStartIdentity\":{child_start},\"release\":\"{release}\",\"lastExit\":null}}"
        )
    }

    fn inspector(pid: u32) -> Result<Option<ProcessIdentity>, String> {
        match pid {
            10 => Ok(Some(ProcessIdentity {
                pid,
                start: "s10".to_owned(),
            })),
            11 => Ok(Some(ProcessIdentity {
                pid,
                start: "s11".to_owned(),
            })),
            12 => Ok(Some(ProcessIdentity {
                pid,
                start: "reused".to_owned(),
            })),
            13 => Err("access denied".to_owned()),
            _ => Ok(None),
        }
    }

    fn holds(root: &Path) -> ReleaseHolds {
        collect(root, inspector)
    }

    #[test]
    fn a_real_live_process_holds_its_release_through_native_identity() {
        let root = tempfile::tempdir().unwrap();
        let own = crate::identity::inspect_process(std::process::id())
            .unwrap()
            .expect("the test process is inspectable");
        profile(
            root.path(),
            "p",
            None,
            Some(&registry(&tab(
                "a",
                Some((own.pid, own.start.as_str())),
                None,
                "/releases/live",
            ))),
        );
        let result = collect(root.path(), |pid| {
            crate::identity::inspect_process(pid).map_err(|error| error.to_string())
        });
        assert!(result.complete, "{:?}", result.uncertain);
        assert_eq!(result.release_roots, ["/releases/live"]);
    }

    #[test]
    fn no_tabs_directory_holds_nothing() {
        let root = tempfile::tempdir().unwrap();
        let result = holds(root.path());
        assert!(result.complete);
        assert!(result.release_roots.is_empty());
    }

    #[test]
    fn flat_release_namespaces_and_legacy_records_are_collected_together() {
        let root = tempfile::tempdir().unwrap();
        for (namespace, release) in [("legacy", "/legacy"), ("release-a", "/a"), ("release-b", "/b")] {
            profile(root.path(), namespace, Some(&format!("{{\"pid\":10,\"startIdentity\":\"s10\",\"releaseRoot\":\"{release}\"}}")), None);
        }
        let result = holds(root.path());
        assert!(result.complete);
        assert_eq!(result.release_roots, ["/a", "/b", "/legacy"]);
    }

    #[test]
    fn a_stopped_release_is_not_held_by_another_live_namespace() {
        let root = tempfile::tempdir().unwrap();
        profile(root.path(), "release-a", Some(r#"{"pid":10,"startIdentity":"s10","releaseRoot":"/a"}"#), None);
        profile(root.path(), "release-b", Some(r#"{"pid":99,"startIdentity":"gone","releaseRoot":"/b"}"#), None);
        let result = holds(root.path());
        assert!(result.complete);
        assert_eq!(result.release_roots, ["/a"]);
    }

    #[cfg(unix)]
    #[test]
    fn linked_namespace_is_not_followed_or_reported_absent() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(root.path().join("tabs")).unwrap();
        std::os::unix::fs::symlink(outside.path(), root.path().join("tabs/linked")).unwrap();
        assert!(!holds(root.path()).complete);
    }

    #[test]
    fn live_server_holder_and_child_hold_their_releases() {
        let root = tempfile::tempdir().unwrap();
        let tabs = [
            tab("a", Some((10, "s10")), None, "/releases/old"),
            tab("b", None, Some((11, "s11")), "/releases/older"),
            tab(
                "c",
                Some((99, "gone")),
                Some((98, "gone")),
                "/releases/dead",
            ),
        ];
        profile(
            root.path(),
            "p",
            Some(
                "{\"pid\":11,\"startIdentity\":\"s11\",\"endpoint\":\"e\",\"generation\":1,\"verified\":true,\"detachmentMode\":\"m\",\"releaseRoot\":\"/releases/server\"}",
            ),
            Some(&registry(&tabs.join(","))),
        );
        let result = holds(root.path());
        assert!(result.complete, "{:?}", result.uncertain);
        assert_eq!(
            result.release_roots,
            ["/releases/old", "/releases/older", "/releases/server"]
        );
    }

    #[test]
    fn reused_pid_does_not_hold_its_release() {
        let root = tempfile::tempdir().unwrap();
        profile(
            root.path(),
            "p",
            None,
            Some(&registry(&tab(
                "a",
                Some((12, "original")),
                None,
                "/releases/old",
            ))),
        );
        let result = holds(root.path());
        assert!(result.complete);
        assert!(result.release_roots.is_empty());
    }

    #[test]
    fn unreadable_records_and_uninspectable_identities_are_incomplete() {
        let root = tempfile::tempdir().unwrap();
        profile(root.path(), "corrupt", Some("{not json"), Some("{not json"));
        profile(
            root.path(),
            "denied",
            None,
            Some(&registry(&tab(
                "a",
                Some((13, "s13")),
                None,
                "/releases/old",
            ))),
        );
        profile(
            root.path(),
            "legacy",
            Some(
                "{\"pid\":10,\"startIdentity\":\"s10\",\"endpoint\":\"e\",\"generation\":1,\"verified\":true,\"detachmentMode\":\"m\"}",
            ),
            None,
        );
        let result = holds(root.path());
        assert!(!result.complete);
        let reasons = result.uncertain.join("\n");
        assert!(reasons.contains("corrupt: owner marker unreadable"));
        assert!(reasons.contains("corrupt: registry unreadable"));
        assert!(reasons.contains("denied: tab process identity uninspectable"));
        assert!(reasons.contains("legacy: live server release is unrecorded"));
    }

    #[test]
    fn uncertainty_reasons_stay_within_their_cap() {
        let root = tempfile::tempdir().unwrap();
        for index in 0..(MAX_UNCERTAIN + 8) {
            profile(
                root.path(),
                &format!("corrupt-{index:02}"),
                Some("{not json"),
                None,
            );
        }
        let result = holds(root.path());
        assert!(!result.complete);
        assert_eq!(result.uncertain.len(), MAX_UNCERTAIN);
    }

    #[test]
    fn a_profile_scan_ignores_other_profiles_live_tabs() {
        let root = tempfile::tempdir().unwrap();
        profile(
            root.path(),
            "other",
            None,
            Some(&registry(&tab(
                "a",
                Some((10, "s10")),
                None,
                "/releases/other",
            ))),
        );
        profile(
            root.path(),
            "own",
            None,
            Some(&registry(&tab(
                "b",
                Some((99, "gone")),
                None,
                "/releases/own",
            ))),
        );
        let own = collect_profile(&root.path().join("tabs").join("own"), inspector);
        assert!(own.complete, "{:?}", own.uncertain);
        assert!(own.release_roots.is_empty());
        assert_eq!(holds(root.path()).release_roots, ["/releases/other"]);
    }
}
