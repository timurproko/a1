## Why

Updating from 0.2.7-dev.1276 to 0.2.7-dev.1285 activated the new release, then failed with "invalid release state; rollback failed". The old updater ran post-activation cleanup and rollback with its own code against control state that the new release had already rewritten in a format the old code rejects. A release must never be able to break the updater or running agents of the release before it, and the control state must stop losing writes on Windows.

## What Changes

- Make the installed release the sole owner of its post-activation work: a tree activated through its own activation entry also schedules its own release maintenance, and the updater no longer runs maintenance with its older code after delegating activation.
- Once the active reference is committed, a later failure never rolls back. The update completes and reports the failure as a warning that cleanup will retry.
- Replace exact schema-string equality with read/write compatibility levels. The control state records the lowest reader level that may read it and the lowest that may write it. Additive changes raise neither, and older code ignores unknown fields. Code below the read level refuses with a clear "newer release" error; code below the write level treats the state as read-only and skips housekeeping instead of failing. The `a1-release-cohort-v2` family identifier is frozen, so already-published releases keep reading new state.
- Ignore unknown activation progress events, so a newer tree's additional events cannot fail an older updater.
- Add predecessor evidence that each published predecessor able to read the current state family can still read, update, and maintain control state after it delegates activation to the candidate.
- Retry the atomic control-state rename on transient Windows sharing failures, always remove the temporary file on failure, and reclaim orphaned temporary state files.
- Let `a1 update` complete a settled post-commit transaction whose target is already active instead of reinstalling it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: the installed release owns post-activation maintenance, committed activation is never rolled back, control state uses read/write compatibility levels, and control-state writes survive Windows sharing failures.

## Impact

Release state store, activation entry and delegation, update orchestration, release-use claims, release cleanup scheduling, and their focused and predecessor tests. No user data, session, or package layout change.
