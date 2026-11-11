## 1. Installed release owns post-activation work

- [ ] 1.1 Schedule release maintenance inside the activation entry after the committed phase, best-effort, without changing its verdict or event stream.
- [ ] 1.2 Report from `activateInstalled` whether activation was delegated and skip updater maintenance after delegation; keep it for in-process activation.
- [ ] 1.3 Ignore unknown activation events while still failing on malformed JSON or malformed known events.
- [ ] 1.4 Add focused tests for entry maintenance, delegated skip, and unknown-event tolerance.

## 2. Committed activation is never rolled back

- [ ] 2.1 Settle failures at or after `active-reference-committed` as completed with a bounded warning and no rollback, in both the failure path and interrupted-lease recovery.
- [ ] 2.2 Make post-commit capsule removal and maintenance best-effort in the success path.
- [ ] 2.3 Let a settled post-commit transaction for the active target take the up-to-date path.
- [ ] 2.4 Add focused orchestration tests for post-commit failure, interrupted committed lease, and settled retry.

## 3. Compatibility levels for control state

- [ ] 3.1 Add `format` read/write levels with defaults, `ReleaseStateNewerError`, monotonic preservation on write, and frozen family identifiers.
- [ ] 3.2 Degrade release-use claims, cleanup scheduling, and the cleanup worker to read-only skips on newer state.
- [ ] 3.3 Add focused store tests for defaults, unknown-field preservation, read refusal, write refusal, monotonic levels, and degradation.

## 4. Durable control-state writes on Windows

- [ ] 4.1 Retry transient rename failures, remove the temporary file on final failure, and reclaim dead writers' orphaned temporary files under the lock.
- [ ] 4.2 Add focused tests with an injected failing rename and orphan reclamation.

## 5. Predecessor evidence

- [ ] 5.1 Add the capability-detected predecessor case that delegates candidate activation and then reads, updates, and schedules cleanup with predecessor code.

## 6. Delivery bookkeeping

- [ ] 6.1 Record focused checks and gap disposition, reconcile current develop, and prepare acceptance outcomes.
