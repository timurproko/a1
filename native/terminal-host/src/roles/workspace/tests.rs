use super::*;

fn source(root: &Path, letter: char, revision: u64) -> SourceIdentity {
    SourceIdentity {
        scope: letter.to_string().repeat(20),
        release_id: letter.to_string().repeat(64),
        release_root: root
            .join(format!("release-{letter}"))
            .to_string_lossy()
            .into_owned(),
        epoch: 1,
        revision,
    }
}
fn tab(source: &SourceIdentity, local: &str) -> WorkspaceTab {
    WorkspaceTab {
        id: WorkspaceTab::id_for(&source.scope, local),
        source_scope: source.scope.clone(),
        source_tab: local.into(),
        incarnation: 1,
        name: "Agent".into(),
        name_source: "default".into(),
        session_file: None,
    }
}
fn setup() -> (tempfile::TempDir, PathBuf, PathBuf) {
    let root = tempfile::tempdir().unwrap();
    let profile = root.path().join("profile");
    let data = root.path().join("data");
    std::fs::create_dir_all(&profile).unwrap();
    (root, profile, data)
}

#[test]
fn workspace_survives_client_release_changes_with_selection_order_and_colliding_ids() {
    let (root, profile, data) = setup();
    let a = source(root.path(), 'a', 1);
    let b = source(root.path(), 'b', 1);
    let first = tab(&a, "tab-1");
    let mut second = tab(&b, "tab-1");
    second.name = "other Agent".into();
    second.name_source = "user".into();
    second.session_file = Some(
        root.path()
            .join("session.jsonl")
            .to_string_lossy()
            .into_owned(),
    );
    let mut store = WorkspaceStore::open(&profile, &data).unwrap();
    let profile_id = store.snapshot().profile.clone();
    store
        .reconcile_verified_source(&profile_id, a.clone(), vec![first.clone()])
        .unwrap();
    store
        .reconcile_verified_source(&profile_id, b.clone(), vec![second.clone()])
        .unwrap();
    assert_ne!(first.id, second.id);
    store.select(&second.id).unwrap();
    store
        .reorder(&[second.id.clone(), first.id.clone()])
        .unwrap();
    let before = store.snapshot().clone();
    assert!(
        WorkspaceStore::open(&profile, &data).is_err(),
        "there is only one kernel writer"
    );
    drop(store);
    let mut reopened = WorkspaceStore::open(&profile.join("."), &data).unwrap();
    assert_eq!(reopened.snapshot().tabs, before.tabs);
    assert_eq!(reopened.snapshot().selected, before.selected);
    assert_eq!(reopened.snapshot().epoch, before.epoch + 1);
    assert!(!reopened.recovered());
    let revision = reopened.snapshot().revision;
    reopened
        .reconcile_verified_source(&profile_id, a, vec![first])
        .unwrap();
    reopened
        .reconcile_verified_source(&profile_id, b, vec![second])
        .unwrap();
    assert_eq!(
        reopened.snapshot().revision,
        revision,
        "re-offering the same source is idempotent"
    );
}

#[test]
fn absence_does_not_remove_a_source_but_positive_closed_snapshot_does() {
    let (root, profile, data) = setup();
    let mut store = WorkspaceStore::open(&profile, &data).unwrap();
    let id = store.snapshot().profile.clone();
    let mut a = source(root.path(), 'a', 1);
    let b = source(root.path(), 'b', 1);
    let one = tab(&a, "tab-1");
    let two = tab(&b, "tab-1");
    store
        .reconcile_verified_source(&id, a.clone(), vec![one.clone()])
        .unwrap();
    store
        .reconcile_verified_source(&id, b.clone(), vec![two.clone()])
        .unwrap();
    store.select(&two.id).unwrap();
    a.revision += 1;
    let mut updated = one;
    updated.name = "renamed".into();
    updated.name_source = "user".into();
    store
        .reconcile_verified_source(&id, a.clone(), vec![updated])
        .unwrap();
    assert_eq!(
        store.snapshot().tabs.len(),
        2,
        "an absent B snapshot cannot close B"
    );
    assert_eq!(store.snapshot().selected.as_deref(), Some(two.id.as_str()));
    a.revision += 1;
    store.reconcile_verified_source(&id, a, vec![]).unwrap();
    assert_eq!(store.snapshot().tabs, vec![two]);
}

#[test]
fn stale_source_epoch_revision_incarnation_and_custody_are_fenced_without_writes() {
    let (root, profile, data) = setup();
    let mut store = WorkspaceStore::open(&profile, &data).unwrap();
    let id = store.snapshot().profile.clone();
    let mut a = source(root.path(), 'a', 3);
    a.epoch = 2;
    let mut one = tab(&a, "tab-1");
    one.incarnation = 4;
    store
        .reconcile_verified_source(&id, a.clone(), vec![one.clone()])
        .unwrap();
    let before = store.snapshot().clone();
    let mut stale = a.clone();
    stale.epoch = 1;
    assert!(store.reconcile_verified_source(&id, stale, vec![]).is_err());
    let mut stale = a.clone();
    stale.revision -= 1;
    assert!(store.reconcile_verified_source(&id, stale, vec![]).is_err());
    assert!(
        store
            .reconcile_verified_source(&id, a.clone(), vec![])
            .is_err(),
        "same revision cannot claim a different topology"
    );
    let mut changed = a.clone();
    changed.release_id = "b".repeat(64);
    assert!(
        store
            .reconcile_verified_source(&id, changed, vec![])
            .is_err()
    );
    let mut updated = a.clone();
    updated.revision += 1;
    one.incarnation -= 1;
    assert!(
        store
            .reconcile_verified_source(&id, updated, vec![one])
            .is_err()
    );
    assert!(
        store
            .reconcile_verified_source(&"c".repeat(20), a, vec![])
            .is_err()
    );
    assert_eq!(store.snapshot(), &before);
    assert_eq!(
        read_document(&store.root.join("workspace.json"), &id).unwrap(),
        Some(before)
    );
}

#[test]
fn rejects_missing_selection_bad_order_duplicate_source_ids_and_unknown_metadata() {
    let (root, profile, data) = setup();
    let mut store = WorkspaceStore::open(&profile, &data).unwrap();
    let id = store.snapshot().profile.clone();
    let a = source(root.path(), 'a', 1);
    let one = tab(&a, "tab-1");
    assert!(store.select(&one.id).is_err());
    assert!(
        store
            .reconcile_verified_source(&id, a.clone(), vec![one.clone(), one.clone()])
            .is_err()
    );
    let mut wrong = one.clone();
    wrong.source_scope = "b".repeat(20);
    assert!(
        store
            .reconcile_verified_source(&id, a.clone(), vec![wrong])
            .is_err()
    );
    store
        .reconcile_verified_source(&id, a, vec![one.clone()])
        .unwrap();
    assert!(store.reorder(&[]).is_err());
    assert!(store.reorder(&["unknown".into()]).is_err());
    let mut raw = serde_json::to_value(store.snapshot()).unwrap();
    raw["credentials"] = "not-allowed".into();
    assert!(decode(&serde_json::to_vec(&raw).unwrap(), &id).is_err());
    let mut raw = serde_json::to_value(store.snapshot()).unwrap();
    raw["tabs"][0]["prompt"] = "not-allowed".into();
    assert!(decode(&serde_json::to_vec(&raw).unwrap(), &id).is_err());
}

#[test]
fn corrupt_primary_recovers_last_good_and_preserves_evidence_without_starting_empty() {
    let (root, profile, data) = setup();
    let mut store = WorkspaceStore::open(&profile, &data).unwrap();
    let id = store.snapshot().profile.clone();
    let a = source(root.path(), 'a', 1);
    let one = tab(&a, "tab-1");
    let two = tab(&a, "tab-2");
    store
        .reconcile_verified_source(&id, a, vec![one.clone(), two.clone()])
        .unwrap();
    store.select(&two.id).unwrap();
    let path = store.root.clone();
    drop(store);
    std::fs::write(path.join("workspace.json"), b"partial-corrupt").unwrap();
    let recovered = WorkspaceStore::open(&profile, &data).unwrap();
    assert!(recovered.recovered());
    assert_eq!(recovered.snapshot().tabs, vec![one, two]);
    let saved = std::fs::read_dir(&path)
        .unwrap()
        .map(Result::unwrap)
        .find(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with("workspace.corrupt-")
        })
        .unwrap();
    assert_eq!(std::fs::read(saved.path()).unwrap(), b"partial-corrupt");
}

#[test]
fn missing_or_all_corrupt_generations_never_initialize_over_existing_workspace() {
    for corrupt in [false, true] {
        let (_root, profile, data) = setup();
        let store = WorkspaceStore::open(&profile, &data).unwrap();
        let path = store.root.clone();
        drop(store);
        if corrupt {
            std::fs::write(path.join("workspace.json"), b"corrupt").unwrap();
        } else {
            std::fs::remove_file(path.join("workspace.json")).unwrap();
        }
        let failed = WorkspaceStore::open(&profile, &data);
        assert!(failed.is_err());
        if corrupt {
            assert_eq!(
                std::fs::read(path.join("workspace.json")).unwrap(),
                b"corrupt"
            );
        } else {
            assert!(!path.join("workspace.json").exists());
        }
    }
}

#[test]
fn future_schema_and_foreign_profile_do_not_authorize_recovery_or_overwrite() {
    for field in ["schema", "profile"] {
        let (root, profile, data) = setup();
        let mut store = WorkspaceStore::open(&profile, &data).unwrap();
        let id = store.snapshot().profile.clone();
        let a = source(root.path(), 'a', 1);
        let one = tab(&a, "tab-1");
        store.reconcile_verified_source(&id, a, vec![one]).unwrap();
        let path = store.root.clone();
        let mut raw = serde_json::to_value(store.snapshot()).unwrap();
        raw[field] = "future-or-foreign".into();
        let bytes = serde_json::to_vec(&raw).unwrap();
        drop(store);
        std::fs::write(path.join("workspace.json"), &bytes).unwrap();
        assert!(WorkspaceStore::open(&profile, &data).is_err());
        assert_eq!(std::fs::read(path.join("workspace.json")).unwrap(), bytes);
    }
}

#[test]
fn changed_durable_writer_epoch_is_fenced_and_byte_bounds_are_enforced() {
    let (_root, profile, data) = setup();
    let mut store = WorkspaceStore::open(&profile, &data).unwrap();
    let mut changed = store.snapshot().clone();
    changed.epoch += 1;
    let bytes = serde_json::to_vec(&changed).unwrap();
    std::fs::write(store.root.join("workspace.json"), &bytes).unwrap();
    let mut next = store.snapshot().clone();
    next.sources.clear();
    assert_eq!(
        store.commit(next).unwrap_err(),
        "workspace writer is fenced"
    );
    std::fs::write(store.root.join("workspace.json"), vec![b' '; MAX_BYTES + 1]).unwrap();
    assert!(read_bytes(&store.root.join("workspace.json")).is_err());
}

#[test]
fn recovery_never_reuses_a_previous_coordinator_epoch() {
    let (root, profile, data) = setup();
    let mut first = WorkspaceStore::open(&profile, &data).unwrap();
    let id = first.snapshot().profile.clone();
    let a = source(root.path(), 'a', 1);
    let one = tab(&a, "tab-1");
    first
        .reconcile_verified_source(&id, a, vec![one.clone()])
        .unwrap();
    drop(first);
    let second = WorkspaceStore::open(&profile, &data).unwrap();
    let epoch = second.snapshot().epoch;
    let path = second.root.clone();
    drop(second);
    std::fs::write(path.join("workspace.json"), b"corrupt-new-coordinator").unwrap();
    let recovered = WorkspaceStore::open(&profile, &data).unwrap();
    assert!(
        recovered.snapshot().epoch > epoch,
        "last-good topology is not last-good authority"
    );
    assert_eq!(recovered.snapshot().tabs, vec![one]);
    drop(recovered);
    let primary = std::fs::read(path.join("workspace.json")).unwrap();
    std::fs::write(path.join("workspace.epoch"), b"invalid").unwrap();
    assert!(WorkspaceStore::open(&profile, &data).is_err());
    assert_eq!(std::fs::read(path.join("workspace.json")).unwrap(), primary);
}

#[test]
fn an_orphaned_epoch_and_duplicate_fields_never_authorize_empty_reinitialization() {
    let (_root, profile, data) = setup();
    let store = WorkspaceStore::open(&profile, &data).unwrap();
    let id = store.snapshot().profile.clone();
    let bytes = serde_json::to_string(store.snapshot()).unwrap();
    let duplicate = format!("{{\"profile\":\"{id}\",{}", &bytes[1..]);
    assert!(decode(duplicate.as_bytes(), &id).is_err());
    let path = store.root.clone();
    drop(store);
    std::fs::remove_file(path.join("workspace.json")).unwrap();
    std::fs::remove_file(path.join("initialized")).unwrap();
    assert!(WorkspaceStore::open(&profile, &data).is_err());
    assert!(!path.join("workspace.json").exists());
}

#[test]
fn recovery_history_is_bounded_without_discarding_corrupt_evidence() {
    let (root, profile, data) = setup();
    let mut store = WorkspaceStore::open(&profile, &data).unwrap();
    let id = store.snapshot().profile.clone();
    let a = source(root.path(), 'a', 1);
    let one = tab(&a, "tab-1");
    store.reconcile_verified_source(&id, a, vec![one]).unwrap();
    let path = store.root.clone();
    drop(store);
    for index in 0..3 {
        std::fs::write(
            path.join(format!("workspace.corrupt-{index}.json")),
            b"old evidence",
        )
        .unwrap();
    }
    std::fs::write(path.join("workspace.json"), b"new corrupt evidence").unwrap();
    assert!(WorkspaceStore::open(&profile, &data).is_err());
    assert_eq!(
        std::fs::read(path.join("workspace.json")).unwrap(),
        b"new corrupt evidence"
    );
}

#[cfg(unix)]
#[test]
fn linked_records_and_unsafe_directories_are_not_followed_or_repaired() {
    use std::os::unix::fs::{PermissionsExt, symlink};
    let (root, profile, data) = setup();
    let store = WorkspaceStore::open(&profile, &data).unwrap();
    let path = store.root.clone();
    drop(store);
    let foreign = root.path().join("foreign");
    std::fs::write(&foreign, "foreign sentinel").unwrap();
    std::fs::remove_file(path.join("workspace.json")).unwrap();
    symlink(&foreign, path.join("workspace.json")).unwrap();
    assert!(WorkspaceStore::open(&profile, &data).is_err());
    assert_eq!(
        std::fs::read_to_string(&foreign).unwrap(),
        "foreign sentinel"
    );
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
    assert!(WorkspaceStore::open(&profile, &data).is_err());
    assert_eq!(
        std::fs::metadata(path).unwrap().permissions().mode() & 0o777,
        0o755
    );
}
