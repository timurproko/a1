use super::*;

/// Advances the registry revision once for one registry change.
pub(super) fn bump_registry_revision(registry: &mut RegistryDocument) {
    registry.registry_revision = registry.registry_revision.saturating_add(1);
}

/// What a registry commit needs, cloned under the lock so the commit itself runs after it is released.
pub(super) fn registry_snapshot(state: &RuntimeState) -> (RegistryStore, RegistryDocument) {
    (state.registry_store.clone(), state.registry.clone())
}

/// Commits a snapshot staged under the lock, if the change produced one.
pub(super) fn commit_staged(
    staged: Option<(RegistryStore, RegistryDocument)>,
) -> Result<(), String> {
    match staged {
        Some((store, document)) => commit_registry(store, document),
        None => Ok(()),
    }
}

pub(super) fn commit_registry(
    store: RegistryStore,
    document: RegistryDocument,
) -> Result<(), String> {
    let diagnostics_root = store.path().parent().map(|root| root.join("diagnostics"));
    let result = commit_registry_bounded(store, document);
    if let Err(error) = &result {
        counters::record(CounterEvent::PersistenceDegraded);
        if let Some(root) = diagnostics_root {
            let _ = crate::roles::diagnostics::append_log(
                &root,
                "server",
                registry_commit_event(error),
            );
        }
    }
    result
}

/// The diagnostic event for a failed registry commit, without any text from the error itself.
pub(super) fn registry_commit_event(error: &str) -> &'static str {
    if error.contains("degraded") {
        "registry-commit-degraded"
    } else if error.contains("fenced") {
        "registry-commit-fenced"
    } else if error.contains("epoch mismatch") {
        "registry-commit-epoch-mismatch"
    } else if error.contains("lease") {
        "registry-commit-lease-lost"
    } else if error.contains("deadline") {
        "registry-commit-deadline"
    } else if error.contains("worker limit") {
        "registry-commit-worker-limit"
    } else {
        "registry-commit-failed"
    }
}

pub(super) fn commit_registry_bounded(
    store: RegistryStore,
    document: RegistryDocument,
) -> Result<(), String> {
    let incarnation = document.registry_revision;
    let mut worker = crate::shell::workers::WorkerPool::new(1);
    worker
        .execute(incarnation, std::time::Duration::from_secs(5), move || {
            store.commit(&document)
        })
        .map_err(str::to_owned)?;
    loop {
        for event in worker.poll(std::time::Instant::now()) {
            match event {
                crate::shell::workers::WorkerEvent::Completed { value, .. } => return value,
                crate::shell::workers::WorkerEvent::DeadlineMissed { .. } => {
                    return Err("registry persistence deadline exceeded".into());
                }
                crate::shell::workers::WorkerEvent::FailFast { .. } => {
                    return Err("registry persistence worker limit reached".into());
                }
            }
        }
        thread::sleep(std::time::Duration::from_millis(2));
    }
}
