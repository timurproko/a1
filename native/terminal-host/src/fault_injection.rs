use std::collections::HashMap;
use std::sync::OnceLock;

pub(crate) const VARIABLES: &[&str] = &[
    "A1_TABS_FAULT_HANG_PTY",
    "A1_TABS_FAULT_BLOCK_PTY_WRITE",
    "A1_TABS_FAULT_DELAY_IDENTITY_MS",
    "A1_TABS_FAULT_DELAY_HOLDER_IDENTITY_MS",
    "A1_TABS_FAULT_DELAY_FSYNC_MS",
    "A1_TABS_FAULT_DELAY_REGISTRY_FSYNC_MS",
    "A1_TABS_FAULT_DELAY_TAB_START_MS",
    "A1_TABS_FAULT_START_DEADLINE_MS",
    REGISTRY_REPLACE,
    "A1_TABS_FAULT_CRASH_POINT",
    "A1_TABS_FAULT_CRASH_MARK",
    "A1_TABS_FAULT_STALE_EPOCH",
    "A1_TABS_FAULT_FREEZE_ROLE",
    "A1_TABS_FAULT_SERVER_GENERATION",
];

pub const REGISTRY_REPLACE: &str = "A1_TABS_FAULT_REGISTRY_REPLACE";

/// Every named crash point at a persistence or IPC step. Each one is exercised by a kill-at-point
/// recovery test; none exists in a build without the `fault-injection` feature.
pub const CRASH_POINTS: &[&str] = &[
    "after-lease",
    "after-epoch",
    "after-marker",
    "after-bind",
    "before-registry-commit",
    "after-registry-commit",
    "after-restart-budget-commit",
    "registry-before-history-load",
    "registry-before-quarantine-rename",
    "registry-after-quarantine-rename",
    "registry-before-tabset-move",
    "registry-after-tabset-move",
    "registry-during-rename-retry",
    "durable-temporary-created",
    "durable-bytes-written",
    "durable-file-synchronized",
    "durable-target-replaced",
    "durable-directory-synchronized",
    "frame-before-send",
    "frame-after-send",
    "frame-after-receive",
    "holder-before-ready",
    "holder-after-ready",
    "bridge-before-admit",
    "bridge-after-admit",
    "crash-record-during-write",
    "recovery-file-during-write",
    "recovery-file-before-rename",
    "host-stop-after-terminate",
    "host-stop-after-replacement",
    "host-stop-after-answer",
];

static INSTALLED: OnceLock<HashMap<String, String>> = OnceLock::new();

pub fn capture() -> Vec<(String, String)> {
    #[cfg(feature = "fault-injection")]
    {
        VARIABLES
            .iter()
            .filter_map(|name| {
                std::env::var(name)
                    .ok()
                    .map(|value| ((*name).into(), value))
            })
            .collect()
    }
    #[cfg(not(feature = "fault-injection"))]
    {
        Vec::new()
    }
}

pub fn install(values: &[(String, String)]) {
    let _ = INSTALLED.set(values.iter().cloned().collect());
}

fn value(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .or_else(|| INSTALLED.get().and_then(|values| values.get(name)).cloned())
}

pub fn freeze_requested(role: &str) -> bool {
    #[cfg(feature = "fault-injection")]
    return value("A1_TABS_FAULT_FREEZE_ROLE").as_deref() == Some(role);
    #[cfg(not(feature = "fault-injection"))]
    {
        let _ = role;
        false
    }
}

/// A protocol generation a fixture server answers with instead of its own, so clients can be
/// tested against a server from another release.
pub fn server_generation_override() -> Option<u16> {
    #[cfg(feature = "fault-injection")]
    return value("A1_TABS_FAULT_SERVER_GENERATION").and_then(|value| value.parse().ok());
    #[cfg(not(feature = "fault-injection"))]
    None
}

pub fn freeze_role(role: &str) {
    #[cfg(feature = "fault-injection")]
    if freeze_requested(role) {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(60));
        }
    }
    #[cfg(not(feature = "fault-injection"))]
    let _ = role;
}

pub fn validate_environment() -> Result<(), String> {
    let present = VARIABLES.iter().find(|name| value(name).is_some());
    #[cfg(feature = "fault-injection")]
    {
        let _ = present;
        Ok(())
    }
    #[cfg(not(feature = "fault-injection"))]
    {
        if let Some(name) = present {
            Err(format!(
                "fault injection is unavailable in this build: {name}"
            ))
        } else {
            Ok(())
        }
    }
}

#[cfg(feature = "fault-injection")]
pub fn setting(name: &str) -> Option<String> {
    VARIABLES.contains(&name).then(|| value(name)).flatten()
}
#[cfg(not(feature = "fault-injection"))]
pub fn setting(_name: &str) -> Option<String> {
    None
}

pub fn registry_replace_setting() -> Option<String> {
    setting(REGISTRY_REPLACE)
}

#[cfg(feature = "fault-injection")]
pub fn enabled(name: &str) -> bool {
    VARIABLES.contains(&name) && value(name).is_some()
}
#[cfg(not(feature = "fault-injection"))]
pub fn enabled(_name: &str) -> bool {
    false
}

#[cfg(feature = "fault-injection")]
pub fn delay(name: &str) {
    if !VARIABLES.contains(&name) {
        return;
    }
    if let Ok(milliseconds) = value(name).unwrap_or_default().parse::<u64>() {
        std::thread::sleep(std::time::Duration::from_millis(milliseconds));
    }
}
#[cfg(not(feature = "fault-injection"))]
pub fn delay(_name: &str) {}

#[cfg(feature = "fault-injection")]
pub fn crash_at(point: &str) {
    if value("A1_TABS_FAULT_CRASH_POINT").as_deref() == Some(point) {
        // Rationale: a breadcrumb lets a recovery test prove the process died at this exact point.
        if let Some(directory) = value("A1_TABS_FAULT_CRASH_MARK") {
            let _ = std::fs::write(
                std::path::Path::new(&directory).join(point),
                std::process::id().to_string(),
            );
        }
        std::process::abort();
    }
}
#[cfg(not(feature = "fault-injection"))]
pub fn crash_at(_point: &str) {}

#[cfg(test)]
mod tests {
    #[test]
    fn release_contract_has_no_implicit_hook() {
        assert!(!super::enabled("UNREGISTERED_FAULT"));
    }

    #[test]
    fn every_named_crash_point_is_declared_once_and_used_in_the_source() {
        let mut seen = std::collections::HashSet::new();
        for point in super::CRASH_POINTS {
            assert!(seen.insert(*point), "{point} is declared twice");
        }
        let source = ["src", "src/roles", "src/core"]
            .iter()
            .flat_map(|directory| {
                std::fs::read_dir(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(directory))
                    .unwrap()
                    .filter_map(Result::ok)
                    .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "rs"))
                    .map(|entry| std::fs::read_to_string(entry.path()).unwrap())
                    .collect::<Vec<_>>()
            })
            .collect::<String>();
        for point in super::CRASH_POINTS {
            assert!(
                source.contains(&format!("crash_at(\"{point}\")")),
                "{point} has no crash site"
            );
        }
    }
}
