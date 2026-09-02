## 1. Protection Model and Legacy Migration

- [ ] 1.1 Add a pure protected-release planner covering active, approved rollback, pending transaction/current candidate, verified live cohort, and typed external-hold identities; verify focused tests reject unknown holds and produce a deterministic unique set.
- [ ] 1.2 Stop candidate recording and activation from treating activation history as permanent retention, and verify cohort-state tests show repeated successful activations keep only the reconciled protection snapshot.
- [ ] 1.3 Implement legacy append-only retention migration from valid existing cohort state, and verify a forty-release fixture preserves active, rollback, pending, live, and external references while classifying every other release as collectible.
- [ ] 1.4 Include active update-transaction references, including the prior active release needed for rollback, and verify fault-injected transactions at every durable phase retain all recoverable releases.

## 2. Safe Detachment and Physical Collection

- [ ] 2.1 Replace deletion-time full payload verification with canonical direct-child containment, non-link metadata, expected directory-name, manifest-identity, state-reference, transaction, and live-endpoint checks; verify escaping, linked, malformed, renamed, and newly protected paths are never passed to recursive deletion.
- [ ] 2.2 Add one atomic cohort-state operation that commits the protection snapshot and detaches all currently collectible release records under the existing lock; verify interruption before and after commit leaves no selector pointing at absent content.
- [ ] 2.3 Add managed same-volume trash disposition for detached release roots and idempotent recursive removal; verify fault injection after detachment, during rename, and during deletion converges on retry.
- [ ] 2.4 Remove certification evidence only after its release record is detached, and verify active, rollback, pending, live, and unrelated diagnostic files remain untouched.
- [ ] 2.5 Discover and reconcile canonical orphan release roots and managed trash without making either selectable, and verify arbitrary files and paths outside the release store survive unchanged.

## 3. Bounded Maintenance and Recovery

- [ ] 3.1 Implement bounded cleanup scheduling with explicit concurrency, elapsed-time, and item limits plus structured release/stage/error diagnostics; verify a synthetic large backlog returns when its allowance is exhausted and preserves retry work.
- [ ] 3.2 Add a dependency-light detached cleanup entry or equivalent resumable maintenance owner that reacquires all state/path/liveness proofs, and verify it can outlive the updater without deleting content that becomes protected.
- [ ] 3.3 Reconcile abandoned private candidates only after proving no live update transaction can commit them and a conservative age floor has elapsed; verify current and recently created candidates are preserved.
- [ ] 3.4 Integrate cleanup planning after verified update activation but before success output, and verify update tests commit the new active/rollback set and schedule obsolete work without waiting for an injected slow deletion.
- [ ] 3.5 Add bounded launch-time reconciliation after stale endpoint sweeping without delaying UI startup beyond its maintenance allowance, and verify a large backlog leaves launch selection and terminal output unchanged.
- [ ] 3.6 Ensure a superseded cohort becomes collectible after its final verified endpoint disappears, and verify the next cleanup-capable coordinator preserves it while live and removes it after retirement unless it remains rollback-held.

## 4. Regression and Exact-Package Evidence

- [ ] 4.1 Add isolated concurrency tests for overlapping update, launch, endpoint retirement, state detachment, and cleanup; verify every selected/live release remains executable and obsolete work remains idempotently retryable.
- [ ] 4.2 Add Windows sharing/antivirus-lock simulation around trash movement and recursive deletion; verify bounded failure diagnostics and successful retry after lock release.
- [ ] 4.3 Add an exact-package migration scenario representative of the observed forty-plus-release, half-million-file state using scalable fixtures; verify protected releases stay launchable and obsolete disk usage converges downward.
- [ ] 4.4 Verify cleanup never reads or mutates A1/Pi profile settings, credentials, sessions, extensions, skills, prompts, or themes through focused path-boundary tests.
- [ ] 4.5 Submit the implementation to required CI and verify strict OpenSpec, architecture, changed-documentation, focused release/cohort/update tests, and applicable exact-package gates pass before handoff.

## 5. Manual Acceptance and Completion

- [ ] 5.1 Build the exact candidate and provide a manual update command plus before/after release-count and disk-usage observations; verify the maintainer confirms the active release launches, a deliberately retained old live session continues, rollback remains available, and obsolete storage is reclaimed asynchronously.
- [ ] 5.2 Record accepted retention/cleanup evidence in the change, complete or deliberately skip every remaining task, and archive the OpenSpec change only after the implementation pull request is accepted and merged.
