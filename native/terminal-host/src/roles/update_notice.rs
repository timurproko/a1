use std::path::Path;

use serde::Deserialize;

use crate::protocol::{StructuredSurface, SurfaceCell};

const AUTOMATIC_UPDATE_STATE_SCHEMA: u64 = 1;
const AUTOMATIC_UPDATE_STATE_FILENAME: &str = "automatic-update.json";
const RELEASE_STATE_FILENAME: &str = "release-state.json";
const MAX_STATE_BYTES: u64 = 16_384;
const MAX_VERSION_BYTES: usize = 64;
const SATISFIED_RESTART_NOTICE: &str = "Update installed, restart to update";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AutomaticUpdateState {
    schema: u64,
    channel: String,
    status: String,
    target_version: String,
    attempted_at: u64,
    updated_at: u64,
    installed_version: Option<String>,
    failure: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseState {
    schema: String,
    releases: std::collections::HashMap<String, ReleaseRecord>,
    references: ReleaseReferences,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseReferences {
    active: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseRecord {
    package_version: String,
    approval: String,
}

pub fn newer_active_release(data_dir: &Path, client_version: &str) -> bool {
    if !valid_version(client_version) {
        return false;
    }
    let path = data_dir.join(RELEASE_STATE_FILENAME);
    let Ok(metadata) = std::fs::metadata(&path) else {
        return false;
    };
    if metadata.len() > MAX_STATE_BYTES.saturating_mul(64) {
        return false;
    }
    let Ok(source) = std::fs::read(path) else {
        return false;
    };
    if source.len() > MAX_STATE_BYTES as usize * 64 {
        return false;
    }
    let Ok(state) = serde_json::from_slice::<ReleaseState>(&source) else {
        return false;
    };
    if state.schema != "a1-release-cohort-v1" {
        return false;
    }
    let Some(active) = state.references.active else {
        return false;
    };
    let Some(record) = state.releases.get(&active) else {
        return false;
    };
    record.approval == "approved"
        && valid_version(&record.package_version)
        && same_channel(&record.package_version, client_version)
        && version_is_newer(&record.package_version, client_version)
}

fn same_channel(candidate: &str, current: &str) -> bool {
    candidate.contains("-dev.") == current.contains("-dev.")
}

fn version_is_newer(candidate: &str, current: &str) -> bool {
    let numbers = |value: &str| {
        value
            .split(|character: char| !character.is_ascii_digit())
            .filter(|part| !part.is_empty())
            .map(str::parse::<u64>)
            .collect::<Result<Vec<_>, _>>()
    };
    let (Ok(candidate), Ok(current)) = (numbers(candidate), numbers(current)) else {
        return false;
    };
    candidate > current
}

/// True only when durable update state proves this exact immutable client completed the restart.
pub fn restart_is_satisfied(data_dir: &Path, client_version: &str) -> bool {
    if !valid_version(client_version) {
        return false;
    }
    let path = data_dir.join(AUTOMATIC_UPDATE_STATE_FILENAME);
    let Ok(metadata) = std::fs::metadata(&path) else {
        return false;
    };
    if metadata.len() > MAX_STATE_BYTES {
        return false;
    }
    let Ok(source) = std::fs::read(path) else {
        return false;
    };
    if source.len() as u64 > MAX_STATE_BYTES {
        return false;
    }
    let Ok(state) = serde_json::from_slice::<AutomaticUpdateState>(&source) else {
        return false;
    };
    state.schema == AUTOMATIC_UPDATE_STATE_SCHEMA
        && matches!(state.channel.as_str(), "stable" | "development")
        && state.status == "installed"
        && state.attempted_at <= state.updated_at
        && state.failure.is_none()
        && state.installed_version.as_deref() == Some(state.target_version.as_str())
        && state.target_version == client_version
        && valid_version(&state.target_version)
}

/// Leaves raw fallback bytes untouched when no complete structured surface is available.
pub fn suppress_satisfied_restart_surface(surface: &mut Option<StructuredSurface>) -> bool {
    surface.as_mut().is_some_and(suppress_satisfied_restart)
}

/// Removes one exact owned restart instruction without interpreting any other terminal content.
fn suppress_satisfied_restart(surface: &mut StructuredSurface) -> bool {
    let expected = SATISFIED_RESTART_NOTICE
        .chars()
        .map(|character| character.to_string())
        .collect::<Vec<_>>();
    let mut found: Option<(usize, usize)> = None;
    for (row_index, row) in surface.row_data.iter().enumerate() {
        if row.cells.len() != surface.columns as usize {
            continue;
        }
        for start in 1..=row.cells.len().saturating_sub(expected.len()) {
            let end = start + expected.len();
            let cells = &row.cells[start..end];
            let style = cells.first().map_or(0, |cell| cell.style);
            if end >= row.cells.len().saturating_sub(1)
                && style != 0
                && cells.iter().zip(&expected).all(|(cell, text)| {
                    cell.text == *text
                        && cell.width == 1
                        && cell.style == style
                        && cell.link.is_none()
                })
            {
                if found.is_some() {
                    return false;
                }
                found = Some((row_index, start));
            }
        }
    }
    let Some((row_index, start)) = found else {
        return false;
    };
    for cell in &mut surface.row_data[row_index].cells[start..start + expected.len()] {
        *cell = SurfaceCell::default();
    }
    true
}

fn valid_version(version: &str) -> bool {
    !version.is_empty()
        && version.len() <= MAX_VERSION_BYTES
        && !version.chars().any(char::is_control)
}

#[cfg(test)]
mod tests {
    use std::fs::write;

    use tempfile::tempdir;

    use super::*;
    use crate::protocol::SurfaceRow;

    fn state(status: &str, target: &str, installed: Option<&str>) -> String {
        serde_json::json!({
            "schema": 1,
            "channel": "development",
            "targetVersion": target,
            "status": status,
            "attemptedAt": 1,
            "updatedAt": 2,
            "installedVersion": installed,
            "failure": null,
        })
        .to_string()
    }

    fn surface(rows: &[&str]) -> StructuredSurface {
        let columns = rows
            .iter()
            .map(|row| row.chars().count())
            .max()
            .unwrap_or(0);
        StructuredSurface {
            columns: columns as u16,
            rows: rows.len() as u16,
            row_data: rows
                .iter()
                .map(|text| SurfaceRow {
                    cells: text
                        .chars()
                        .map(|character| SurfaceCell {
                            text: character.to_string(),
                            width: 1,
                            style: 7,
                            link: None,
                        })
                        .chain(std::iter::repeat_n(
                            SurfaceCell::default(),
                            columns - text.chars().count(),
                        ))
                        .collect(),
                })
                .collect(),
            ..StructuredSurface::default()
        }
    }

    fn row_text(surface: &StructuredSurface, row: usize) -> String {
        surface.row_data[row]
            .cells
            .iter()
            .map(|cell| cell.text.as_str())
            .collect()
    }

    #[test]
    fn exact_installed_client_satisfies_restart() {
        let root = tempdir().unwrap();
        write(
            root.path().join(AUTOMATIC_UPDATE_STATE_FILENAME),
            state("installed", "0.2.7-dev.1235", Some("0.2.7-dev.1235")),
        )
        .unwrap();
        assert!(restart_is_satisfied(root.path(), "0.2.7-dev.1235"));
        assert!(!restart_is_satisfied(root.path(), "0.2.7-dev.1234"));
    }

    #[test]
    fn native_observer_accepts_only_a_newer_approved_active_release() {
        let root = tempdir().unwrap();
        let release = |version: &str, approval: &str| {
            serde_json::json!({
                "schema": "a1-release-cohort-v1",
                "releases": { "next": { "packageVersion": version, "approval": approval } },
                "references": { "active": "next" }
            })
            .to_string()
        };
        write(
            root.path().join(RELEASE_STATE_FILENAME),
            release("0.2.7-dev.1239", "approved"),
        )
        .unwrap();
        assert!(newer_active_release(root.path(), "0.2.7-dev.1238"));
        assert!(!newer_active_release(root.path(), "0.2.7-dev.1239"));
        write(
            root.path().join(RELEASE_STATE_FILENAME),
            release("0.2.7-dev.1240", "pending"),
        )
        .unwrap();
        assert!(!newer_active_release(root.path(), "0.2.7-dev.1238"));
    }

    #[test]
    fn invalid_or_incomplete_state_stays_visible() {
        let root = tempdir().unwrap();
        for source in [
            state("running", "0.2.7-dev.1235", None),
            state("blocked", "0.2.7-dev.1235", None),
            state("failed", "0.2.7-dev.1235", None),
            state("installed", "0.2.7-dev.1235", Some("0.2.7-dev.1234")),
            serde_json::json!({
                "schema": 2,
                "status": "installed",
                "targetVersion": "0.2.7-dev.1235",
                "installedVersion": "0.2.7-dev.1235",
            })
            .to_string(),
            "not-json".into(),
        ] {
            write(root.path().join(AUTOMATIC_UPDATE_STATE_FILENAME), source).unwrap();
            assert!(!restart_is_satisfied(root.path(), "0.2.7-dev.1235"));
        }
    }

    #[test]
    fn oversized_state_stays_visible() {
        let root = tempdir().unwrap();
        write(
            root.path().join(AUTOMATIC_UPDATE_STATE_FILENAME),
            vec![b' '; MAX_STATE_BYTES as usize + 1],
        )
        .unwrap();
        assert!(!restart_is_satisfied(root.path(), "0.2.7-dev.1235"));
    }

    #[test]
    fn raw_fallback_has_no_projection() {
        assert!(!suppress_satisfied_restart_surface(&mut None));
    }

    #[test]
    fn suppresses_one_exact_phrase_and_preserves_neighbors() {
        let mut value = surface(&[
            "Working",
            "  Update installed, restart to update│",
            "prompt",
        ]);
        let geometry = (value.columns, value.rows);
        assert!(suppress_satisfied_restart(&mut value));
        assert_eq!(row_text(&value, 0).trim_end(), "Working");
        let projected = row_text(&value, 1);
        assert_eq!(projected.trim_start(), "│");
        assert_eq!(
            projected.chars().count(),
            "  Update installed, restart to update│".chars().count()
        );
        assert_eq!(row_text(&value, 2).trim_end(), "prompt");
        assert_eq!((value.columns, value.rows), geometry);
    }

    #[test]
    fn nonexact_or_ambiguous_phrase_stays_visible() {
        for rows in [
            vec!["Update installed; restart to update"],
            vec![SATISFIED_RESTART_NOTICE],
            vec![
                " Update installed, restart to update",
                " Update installed, restart to update",
            ],
            vec!["Update prepared; activation blocked"],
        ] {
            let mut value = surface(&rows);
            let before = value.clone();
            assert!(!suppress_satisfied_restart(&mut value));
            assert_eq!(value, before);
        }
    }

    #[test]
    fn mixed_style_phrase_stays_visible() {
        let mut value = surface(&[" Update installed, restart to update"]);
        value.row_data[0].cells[1].style = 8;
        let before = value.clone();
        assert!(!suppress_satisfied_restart(&mut value));
        assert_eq!(value, before);
    }

    #[test]
    fn linked_phrase_stays_visible() {
        let mut value = surface(&[" Update installed, restart to update"]);
        value.row_data[0].cells[1].link = Some(0);
        let before = value.clone();
        assert!(!suppress_satisfied_restart(&mut value));
        assert_eq!(value, before);
    }
}
