//! Read-only discovery of the releases that live resident processes run from.
//!
//! Release cleanup asks this before collecting anything. It never starts, signals, recovers, or
//! quarantines: it reads each profile's owner marker and registry under `<data>/tabs/` and checks
//! every recorded process by pid plus native start identity. Anything it cannot read or inspect
//! makes the answer incomplete, and the caller then keeps every release.

use std::path::Path;

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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct OwnerMarker {
    pid: u32,
    start_identity: String,
    #[serde(default)]
    release_root: Option<String>,
}

enum Liveness {
    Live,
    Gone,
    Unknown,
}

const MAX_UNCERTAIN: usize = 32;

pub fn collect<F>(data_dir: &Path, inspect: F) -> ReleaseHolds
where
    F: Fn(u32) -> Result<Option<ProcessIdentity>, String>,
{
    let mut roots = std::collections::BTreeSet::new();
    let mut uncertain = Vec::new();
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
    let profiles = match std::fs::read_dir(data_dir.join("tabs")) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return finish(roots, Vec::new());
        }
        Err(_) => {
            note("tabs directory unreadable".to_owned());
            return finish(roots, uncertain);
        }
    };
    for entry in profiles {
        let Ok(entry) = entry else {
            note("tabs directory entry unreadable".to_owned());
            continue;
        };
        let profile = entry.path();
        if !profile.is_dir() {
            continue;
        }
        let token = entry.file_name().to_string_lossy().into_owned();
        match std::fs::read(profile.join("server.json")) {
            Ok(bytes) => match serde_json::from_slice::<OwnerMarker>(&bytes) {
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
        match RegistryStore::read(&profile.join("registry.json")) {
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
    use super::{ReleaseHolds, collect};
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
}
