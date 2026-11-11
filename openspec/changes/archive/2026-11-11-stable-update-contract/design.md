## Context and authorization

The maintainer reported a failed `a1 update` (1276 to 1285), asked for a stable inter-release contract so no update breaks another, and approved items 1–6 of the presented plan. They also asked whether hashes could replace `v1`/`v2` names. A hash only says "identical or different", so every change, including additive ones, would lock older code out. That is the failure being fixed. The design uses ordered compatibility levels instead, as SQLite and Git do for their on-disk formats.

## Root cause

`#905` changed the control-state identifier from `a1-release-cohort-v1` to `-v2`. The 1276 updater delegated activation to the 1285 tree, which wrote v2 state and committed the active reference. The updater then ran `maintenance()` with 1276 code, which requires schema equality, and that threw. `settleUpdateFailure` then attempted rollback with the same code, which threw again. The user was already running 1285; only the report and the journal were wrong. Had rollback succeeded, it would have moved the active reference back under running agents.

Separately, every orphaned `release-state.json.*.tmp` file carries the PID of a cleanup worker run stuck in `running`. Each was a durable write whose `rename` failed (Windows `EPERM`/`EACCES` while another process read the target), so the write was lost and the temporary file leaked.

## Decisions

- **Ownership boundary.** After a delegated activation, the updater does not mutate release state. The activation entry schedules maintenance with the tree's own code after it commits, best-effort; a maintenance failure goes to the entry's stderr and does not change its `completed` verdict. In-process activation is used only for trees older than the contract, and there the updater is the newer code, so it keeps running maintenance. `activateInstalled` reports which path ran.
- **Commit is the point of no return.** `settleUpdateFailure` and interrupted-lease recovery check the journal phase. At `active-reference-committed` they finish the transaction as `completed`, print the success line with a bounded warning, and never call rollback. Post-commit capsule removal and maintenance in the updater are best-effort for the same reason.
- **Compatibility levels.** `format: { read, write }` is an additive field, defaulting to `{1, 1}` when absent. This code is level 1 for both. `read()` throws `ReleaseStateNewerError` when `format.read` exceeds the reader's level, and `update()` throws it before running the operation when `format.write` does. Writers keep the higher of the stored and own levels and never lower them. The family identifiers `v1` (normalized) and `v2` remain accepted and new code keeps writing `v2`, so 1285 reads the state. Unknown top-level and record fields survive writes. Raising a level is reserved for changes that older code would misinterpret; the constant documents this rule.
- **Read-only degradation.** Release-use claims, cleanup scheduling, and the cleanup worker treat `ReleaseStateNewerError` as "a newer release owns this state": they skip the claim or housekeeping instead of failing a launch or update. Newer code already retains releases conservatively when ownership is uncertain.
- **Forward-compatible activation stream.** An unknown event is ignored instead of failing delegation. Malformed JSON and malformed known events still fail.
- **Durable writes on Windows.** Retry `rename` with short backoff, about 2 s in total, on `EPERM`/`EACCES`/`EBUSY`. On final failure, remove the temporary file and rethrow. Under the state lock, remove `release-state.json.<pid>.*.tmp` files whose writer PID is not alive; a live writer's file is never touched.
- **Settled post-commit retry.** A non-active transaction whose phase reached `active-reference-committed` for an already-active target takes the up-to-date path: maintenance, journal clearing, "up to date".
- **Evidence.** The predecessor integration test gains a case for each published predecessor that exports `delegateActivation`, `ReleaseStateStore`, and `scheduleReleaseCleanup` and whose `RELEASE_STATE_SCHEMA` is in the current family. The predecessor seeds a sandbox with its own store and delegates activation to the exact candidate, then reads, updates, and schedules cleanup with its own code. Predecessors from before the family identifier are skipped by capability. That is the documented one-time v1-to-v2 break, which this change prevents from recurring.

## Scope boundaries

Already-published releases up to 1276 cannot be changed, so their updaters keep the old behavior against v2 state; the installed 1285 is unaffected. Package replacement, launcher recovery, the transaction journal schema, and retention policy do not change.
