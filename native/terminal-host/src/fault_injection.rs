const VARIABLES: &[&str] = &[
    "A1_TABS_FAULT_HANG_PTY",
    "A1_TABS_FAULT_BLOCK_PTY_WRITE",
    "A1_TABS_FAULT_DELAY_IDENTITY_MS",
    "A1_TABS_FAULT_DELAY_FSYNC_MS",
    "A1_TABS_FAULT_CRASH_POINT",
    "A1_TABS_FAULT_STALE_EPOCH",
];

pub fn validate_environment() -> Result<(), String> {
    let present = VARIABLES
        .iter()
        .find(|name| std::env::var_os(name).is_some());
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
    VARIABLES.contains(&name) && std::env::var_os(name).is_some()
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
    if let Ok(milliseconds) = std::env::var(name).unwrap_or_default().parse::<u64>() {
        std::thread::sleep(std::time::Duration::from_millis(milliseconds));
    }
}
#[cfg(not(feature = "fault-injection"))]
pub fn delay(_name: &str) {}

#[cfg(feature = "fault-injection")]
pub fn crash_at(point: &str) {
    if std::env::var("A1_TABS_FAULT_CRASH_POINT").as_deref() == Ok(point) {
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
