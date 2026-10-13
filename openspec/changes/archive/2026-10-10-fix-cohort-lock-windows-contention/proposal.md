# Proposal

## Why

The second 0.2.6 stable candidate validation run (https://github.com/timurproko/a1/actions/runs/38070466542) failed on `win32-node24 / resource` in `test/foundation/release/release-gc.test.ts > bounded immutable release cleanup > converges when two cleanup coordinators overlap` with `EPERM: operation not permitted, open '…\data\release-state.json.lock'`. Every other lane passed. The cohort state lock retries only `EEXIST`. On Windows, opening a lock file that another holder has just removed but that is still held open, for example by real-time scanning, fails with `EPERM` or `EACCES`. The second coordinator then aborts instead of waiting its turn.

## What Changes

- On Windows, treat `EPERM` and `EACCES` from the lock-file open as contention and retry within the existing 5-second deadline, without trying abandoned-lock reclamation.
- Keep both codes fatal on other platforms, and keep the deadline, the abandoned-lock rules, and every caller unchanged.
- Add focused coverage that injects one `EPERM` or `EACCES` from the lock open.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Serialized cohort state updates are already required; this makes the Windows lock honor that requirement under a transient sharing violation.

## Impact

Only `acquireLock` in `src/foundation/release/cohort-state.ts` and a new `test/foundation/release/cohort-state-lock.test.ts` change. No state format, deadline, or dependency changes.
