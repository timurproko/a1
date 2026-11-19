## 1. Protection Model and Legacy Migration

- [x] 1.1 Add a pure protected-release planner covering active, approved rollback, pending transaction/current candidate, verified live cohort, and typed external-hold identities; verify focused tests reject unknown holds and produce a deterministic unique set.
- [x] 1.2 Stop candidate recording and activation from treating activation history as permanent retention, and verify cohort-state tests show repeated successful activations keep only the reconciled protection snapshot.
- [x] 1.3 Implement legacy append-only retention migration from valid existing cohort state, and verify a forty-release fixture preserves active, rollback, pending, live, and external references while classifying every other release as collectible.
- [x] 1.4 Include active update-transaction references, including the prior active release needed for rollback, and verify fault-injected transactions at every durable phase retain all recoverable releases.

## 2. Safe Detachment and Physical Collection

- [x] 2.1 Replace deletion-time full payload verification with canonical direct-child containment, non-link metadata, expected directory-name, manifest-identity, state-reference, transaction, and live-endpoint checks; verify escaping, linked, malformed, renamed, and newly protected paths are never passed to recursive deletion.
- [x] 2.2 Add one atomic cohort-state operation that commits the protection snapshot and detaches all currently collectible release records under the existing lock; verify interruption before and after commit leaves no selector pointing at absent content.
- [x] 2.3 Add managed same-volume trash disposition for detached release roots and idempotent recursive removal; verify fault injection after detachment, during rename, and during deletion converges on retry.
- [x] 2.4 Authorize certification deletion from canonical managed root plus validated release identity rather than byte-for-byte persisted path spelling, and verify legacy Windows `A1`/`a1` casing removes only obsolete contained evidence while active, rollback, pending, live, and unrelated files remain untouched.
- [x] 2.5 Discover and reconcile canonical orphan release roots and managed trash without making either selectable, and verify arbitrary files and paths outside the release store survive unchanged.

## 3. Bounded Maintenance and Recovery

- [x] 3.1 Separate the interactive planning/spawn allowance from physical worker batches, start batch time after preparation, and guarantee at least one eligible attempt; verify injected slow preparation cannot produce repeated zero-progress exits.
- [x] 3.2 Make the dependency-light worker acquire a stale-reclaimable per-data-root lease and drain or self-continue repeated bounded batches; verify one update converges a backlog larger than one batch without another user command.
- [x] 3.3 Reconcile abandoned private candidates only after proving no live update transaction can commit them and a conservative age floor has elapsed; verify current and recently created candidates are preserved.
- [x] 3.4 Integrate cleanup planning after verified update activation but before success output, and verify update tests commit the new active/rollback set and schedule obsolete work without waiting for an injected slow deletion.
- [x] 3.5 Keep launch-time reconciliation limited to planning and worker scheduling after stale endpoint sweeping, and verify a large backlog leaves launch selection and terminal output unchanged while background cleanup continues independently.
- [x] 3.6 Ensure a superseded cohort becomes collectible after its final verified endpoint disappears, and verify the next cleanup-capable coordinator preserves it while live and removes it after retirement unless it remains rollback-held.
- [x] 3.7 Persist bounded worker lifecycle evidence for start, completion, progress, continuation, and fatal failure, and verify spawn success alone is not reported as successful maintenance.
- [x] 3.8 Fairly rotate detached releases, trash, stale candidates, certifications, dependency artifacts, caches, and prior failures with bounded backoff, and verify one persistently blocked item cannot starve other eligible work.

## 4. Regression and Exact-Package Evidence

- [x] 4.1 Extend isolated concurrency tests through duplicate update/launch schedulers, worker-lease acquisition, endpoint retirement, state detachment, and continuation; verify one physical owner operates and every selected/live release remains executable.
- [x] 4.2 Extend Windows sharing/antivirus-lock simulation through worker backoff and continuation; verify bounded diagnostics, progress on unrelated items, and successful retry after lock release.
- [x] 4.3 Add an exact packaged-worker migration scenario representative of the observed forty-plus-release, half-million-file state using scalable production-shaped fixtures; verify one update returns promptly, protected releases stay launchable, and obsolete release count and disk usage converge without a second command.
- [x] 4.4 Verify cleanup never reads or mutates A1/Pi profile settings, credentials, sessions, extensions, skills, prompts, or themes through focused path-boundary tests.
- [x] 4.5 Exercise private worker startup, import failure, abnormal exit, stale-lease recovery, and successor handoff from exact packed bytes; verify every incomplete run is observable and safely resumable.
- [ ] 4.6 Submit the implementation to required CI and verify strict OpenSpec, architecture, changed-documentation, focused release/cohort/update tests, and applicable exact-package gates pass before handoff.

## 5. Manual Acceptance and Completion

- [ ] 5.1 Build the exact candidate and provide a manual update command plus before/after release-count, pending-work, worker-evidence, and disk-usage observations; verify the existing detached backlog drains without a second command, the active release launches, a deliberately retained old live session continues, rollback remains available, and obsolete storage is reclaimed asynchronously.
- [ ] 5.2 Record accepted retention/cleanup evidence in the change, complete or deliberately skip every remaining task, and archive the OpenSpec change only after the implementation pull request is accepted and merged.
