## 1. Installed release owns post-activation work

- [x] 1.1 Schedule release maintenance inside the activation entry after the committed phase, best-effort, without changing its verdict or event stream.
- [x] 1.2 Report from `activateInstalled` whether activation was delegated and skip updater maintenance after delegation; keep it for in-process activation.
- [x] 1.3 Ignore unknown activation events while still failing on malformed JSON or malformed known events.
- [x] 1.4 Add focused tests for entry maintenance, delegated skip, and unknown-event tolerance.

## 2. Committed activation is never rolled back

- [x] 2.1 Settle failures at or after `active-reference-committed` as completed with a bounded warning and no rollback, in both the failure path and interrupted-lease recovery.
- [x] 2.2 Make post-commit capsule removal and maintenance best-effort in the success path.
- [x] 2.3 Let a settled post-commit transaction for the active target take the up-to-date path.
- [x] 2.4 Add focused orchestration tests for post-commit failure, interrupted committed lease, and settled retry.

## 3. Compatibility levels for control state

- [x] 3.1 Add `format` read/write levels with defaults, `ReleaseStateNewerError`, monotonic preservation on write, and frozen family identifiers.
- [x] 3.2 Degrade release-use claims, cleanup scheduling, and the cleanup worker to read-only skips on newer state.
- [x] 3.3 Add focused store tests for defaults, unknown-field preservation, read refusal, write refusal, monotonic levels, and degradation.

## 4. Durable control-state writes on Windows

- [x] 4.1 Retry transient rename failures, remove the temporary file on final failure, and reclaim dead writers' orphaned temporary files under the lock.
- [x] 4.2 Add focused tests with an injected failing rename and orphan reclamation.

## 5. Predecessor evidence

- [x] 5.1 Add the capability-detected predecessor case that delegates candidate activation and then reads, updates, and schedules cleanup with predecessor code.

## 6. Delivery bookkeeping

- [x] 6.1 Record focused checks and gap disposition, reconcile current develop, and prepare acceptance outcomes.

## 7. CI predecessor repair

- [x] 7.1 Record the candidate with each predecessor's own store before its warmup, matching the real update order. Published 0.2.7-dev.1285 reserves a launch claim during warmup and refused the unrecorded candidate with "Selected release is no longer available for launch" (reproduced locally, fixed by the record).
- [x] 7.2 Wait for the detached cleanup workers started by the candidate and the predecessor to record completion before removing the post-activation sandbox; Linux removal otherwise raced a worker still writing (ENOTEMPTY).

## Focused checks and gap disposition

- Typecheck reports no errors in changed files. The only errors are in `test/features/owned-ui/event-frame-clock.ts`, which this change does not touch.
- Focused suites pass: `update`, `update-activation-contract`, `release-state-compatibility` (new), `release-state`, `release-state-lock`, `release-gc`, `update-execution-lease`, `update-transaction`, `automatic-update`, and the remaining non-integration release tests.
- `package-surface` and one `warmup` case need the CI package tarball and built `dist/`; they are left to their CI validation scopes.
- `update-predecessor.integration` needs the exact-package handoff and runs in the CI predecessor shard. Locally, the installed published 0.2.7-dev.1285 code read, updated, and scheduled cleanup on state written by this change, preserving its levels and an unknown field.
- Architecture, full naming audit, code-documentation governance, and strict OpenSpec validation pass.
