use std::{
    path::{Path, PathBuf},
    sync::OnceLock,
    time::Duration,
};

const CONTROL_DIRECTORY_ENV: &str = "A1_RESIDENT_FIXTURE_CONTROL_DIR";

static CONTROL_DIRECTORY: OnceLock<Option<PathBuf>> = OnceLock::new();

/// Binds a role launched with a cleared process environment to the control directory its tab
/// was created with; roles started directly by a fixture read their own environment instead.
pub fn configure_from_launch_environment(environment: &[(String, String)]) {
    let directory = environment
        .iter()
        .find_map(|(name, value)| (name == CONTROL_DIRECTORY_ENV).then(|| PathBuf::from(value)));
    let _ = CONTROL_DIRECTORY.set(directory);
}

fn control_directory() -> Option<&'static Path> {
    CONTROL_DIRECTORY
        .get_or_init(|| std::env::var_os(CONTROL_DIRECTORY_ENV).map(PathBuf::from))
        .as_deref()
}

pub fn stopped(stage: &str, tab_id: &str) -> bool {
    marker_exists(tab_id, stage, "stop")
}

/// Reports a newly observed stop once. This observes an existing control; it cannot activate one.
pub(crate) fn take_stop_acknowledgement(
    previous: &mut Option<String>,
    stopped: Option<&str>,
) -> bool {
    if previous.as_deref() == stopped {
        return false;
    }
    *previous = stopped.map(str::to_owned);
    stopped.is_some()
}

pub fn delay(stage: &str, tab_id: &str, duration: Duration) {
    if marker_exists(tab_id, stage, "delay") {
        std::thread::sleep(duration.min(Duration::from_millis(50)));
    }
}

// Rationale: negative controls must exercise the exact shipped addon, so they are compiled into
// every build and stay inert unless a fixture names an isolated control directory.
fn marker_exists(tab_id: &str, stage: &str, action: &str) -> bool {
    let Some(directory) = control_directory() else {
        return false;
    };
    marker_path(directory, tab_id, stage, action).is_some_and(|path| path.is_file())
}

fn marker_path(directory: &Path, tab_id: &str, stage: &str, action: &str) -> Option<PathBuf> {
    if tab_id.is_empty()
        || tab_id.len() > 128
        || !tab_id
            .bytes()
            .all(|value| value.is_ascii_alphanumeric() || value == b'-')
        || !matches!(
            (stage, action),
            ("holder-commit" | "outer-paint", "stop") | ("attach-receipt", "delay")
        )
    {
        return None;
    }
    Some(directory.join(format!("{tab_id}.{stage}.{action}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stop_acknowledgements_are_once_per_observed_stop_and_reset_on_release() {
        let mut previous = None;
        assert!(!take_stop_acknowledgement(&mut previous, None));
        assert!(take_stop_acknowledgement(&mut previous, Some("tab-a")));
        assert!(!take_stop_acknowledgement(&mut previous, Some("tab-a")));
        assert!(take_stop_acknowledgement(&mut previous, Some("tab-b")));
        assert!(!take_stop_acknowledgement(&mut previous, None));
        assert!(take_stop_acknowledgement(&mut previous, Some("tab-b")));
    }

    #[test]
    fn marker_paths_are_bounded_and_cannot_escape_the_control_directory() {
        let root = Path::new("control");
        assert_eq!(
            marker_path(root, "tab-a", "holder-commit", "stop"),
            Some(root.join("tab-a.holder-commit.stop"))
        );
        assert_eq!(
            marker_path(root, "tab-a", "attach-receipt", "delay"),
            Some(root.join("tab-a.attach-receipt.delay"))
        );
        assert!(marker_path(root, "../tab", "holder-commit", "stop").is_none());
        assert!(marker_path(root, "tab-a", "child-render-write", "stop").is_none());
        assert!(marker_path(root, "tab-a", "attach-receipt", "stop").is_none());
    }
}
