use std::collections::HashMap;
use std::sync::OnceLock;

pub(crate) const VARIABLES: &[&str] = &[
    "A1_TABS_FAULT_HANG_PTY",
    "A1_TABS_FAULT_BLOCK_PTY_WRITE",
    "A1_TABS_FAULT_DELAY_IDENTITY_MS",
    "A1_TABS_FAULT_DELAY_HOLDER_IDENTITY_MS",
    "A1_TABS_FAULT_DELAY_FSYNC_MS",
    "A1_TABS_FAULT_DELAY_REGISTRY_FSYNC_MS",
    "A1_TABS_FAULT_CRASH_POINT",
    "A1_TABS_FAULT_STALE_EPOCH",
    "A1_TABS_FAULT_FREEZE_ROLE",
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

pub fn freeze_role(role: &str) {
    #[cfg(feature = "fault-injection")]
    if value("A1_TABS_FAULT_FREEZE_ROLE").as_deref() == Some(role) {
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
}
