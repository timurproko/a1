use std::path::{Path, PathBuf};

const CONTROL_DIRECTORY_ENV: &str = "A1_RESIDENT_FIXTURE_CONTROL_DIR";

pub fn stopped(stage: &str, tab_id: &str) -> bool {
    #[cfg(feature = "resident-fixtures")]
    {
        let Some(directory) = std::env::var_os(CONTROL_DIRECTORY_ENV) else {
            return false;
        };
        return marker_path(Path::new(&directory), tab_id, stage)
            .is_some_and(|path| path.is_file());
    }
    #[cfg(not(feature = "resident-fixtures"))]
    {
        let _ = (stage, tab_id);
        false
    }
}

fn marker_path(directory: &Path, tab_id: &str, stage: &str) -> Option<PathBuf> {
    if tab_id.is_empty()
        || tab_id.len() > 128
        || !tab_id
            .bytes()
            .all(|value| value.is_ascii_alphanumeric() || value == b'-')
        || !matches!(stage, "holder-commit" | "outer-paint")
    {
        return None;
    }
    Some(directory.join(format!("{tab_id}.{stage}.stop")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn marker_paths_are_bounded_and_cannot_escape_the_control_directory() {
        let root = Path::new("control");
        assert_eq!(
            marker_path(root, "tab-a", "holder-commit"),
            Some(root.join("tab-a.holder-commit.stop"))
        );
        assert!(marker_path(root, "../tab", "holder-commit").is_none());
        assert!(marker_path(root, "tab-a", "child-render-write").is_none());
    }
}
