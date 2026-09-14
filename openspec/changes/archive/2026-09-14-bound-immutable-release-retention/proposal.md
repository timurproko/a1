## Why

A1 currently preserves every immutable release indefinitely because candidate recording and activation append release IDs to an unbounded retention reference, while the existing collector is never invoked. The observed installation has accumulated 41 releases containing about 565,000 files and 4.15 GiB, so successful updates need to converge automatically on a small ownership-safe retained set without deleting content beneath live sessions.

## What Changes

- Define a bounded retention policy that protects the active release, one verified rollback release, any pending update candidate, every verified live cohort, and explicitly supplied external migration or agent references.
- Reconcile the historical append-only retention list after a successful update and when a superseded cohort retires, making every other known release eligible for collection.
- Atomically detach obsolete release records before moving their directories to an A1-owned trash area and deleting them, so interruption leaves a recoverable orphan rather than a dangling selector.
- Remove obsolete certification evidence and abandoned candidate/trash directories through bounded, restart-safe cleanup.
- Avoid complete content re-verification solely to delete an already unreferenced release; deletion authority will instead require canonical store containment, expected directory identity, and absence of protected references and live ownership.
- Keep update completion responsive by committing the safe retention plan synchronously and allowing potentially expensive physical deletion to continue through a bounded cleanup worker, with later update or launch reconciliation completing interrupted cleanup.
- Add migration and regression coverage for large legacy retention sets, concurrent launch/update activity, live superseded cohorts, rollback, interruption, malformed paths, and Windows deletion behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `agent-supervision`: Bound immutable release retention and require ownership-safe automatic retirement and restart-safe physical collection.
- `cli-self-update`: Require every successful update to commit and initiate a bounded cleanup plan while preserving active, rollback, pending, and live release content.
- `isolated-regression-testing`: Require release-retention migration, concurrency, interruption, and bounded-cleanup regression evidence.

## Impact

- Affects cohort state retention semantics, release garbage collection, endpoint/live-cohort discovery, update transaction completion, supervisor cohort retirement, and startup/update reconciliation.
- Changes managed files beneath the A1 data directory, including release roots, candidate/trash directories, certification evidence, and `release-state.json`; it does not delete A1 or Pi profile settings, sessions, extensions, prompts, themes, or skills.
- Requires compatibility with existing append-only cohort state and releases created by older versions, without changing public command syntax.
