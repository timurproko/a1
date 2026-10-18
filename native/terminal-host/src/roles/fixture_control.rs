use std::{
    path::{Path, PathBuf},
    time::Duration,
};

const CONTROL_DIRECTORY_ENV: &str = "A1_RESIDENT_FIXTURE_CONTROL_DIR";

pub fn stopped(stage: &str, tab_id: &str) -> bool {
    marker_exists(tab_id, stage, "stop")
}

pub fn delay(stage: &str, tab_id: &str, duration: Duration) {
    if marker_exists(tab_id, stage, "delay") {
        std::thread::sleep(duration.min(Duration::from_millis(50)));
    }
}

fn marker_exists(tab_id: &str, stage: &str, action: &str) -> bool {
    #[cfg(feature = "resident-fixtures")]
    {
        let Some(directory) = std::env::var_os(CONTROL_DIRECTORY_ENV) else {
            return false;
        };
        return marker_path(Path::new(&directory), tab_id, stage, action)
            .is_some_and(|path| path.is_file());
    }
    #[cfg(not(feature = "resident-fixtures"))]
    {
        let _ = (tab_id, stage, action);
        false
    }
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
