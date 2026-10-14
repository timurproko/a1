# Design

## Context

`CohortStateStore.update` serializes writers with an exclusive `release-state.json.lock` file: `open(path, "wx")`, then `rm` after the write. `acquireLock` retries only `EEXIST`. When two cleanup coordinators overlap, one can remove the lock while a scanner still holds a handle to it. Windows then keeps the name in a pending-delete state, and an exclusive create of the same name fails with `EPERM` (or `EACCES`) instead of `EEXIST`. The failure needs that extra handle, so it hits the CI runner with real-time protection only some of the time and can't be reproduced on a local NTFS volume, where deletion is immediate.

## Decisions

### 1. Retry Windows sharing violations as contention

On `win32`, `EPERM` and `EACCES` from the lock open mean the name is still being released, so the loop waits 20 ms and retries until the existing deadline. This matches the release lease in `dependency-certification.ts`, which already treats these codes as contention. Mapping them to `EEXIST` was rejected: abandoned-lock reclamation would read and quarantine a file that is being deleted.

### 2. Keep the codes fatal elsewhere

On Linux and macOS, `EPERM` or `EACCES` from an exclusive create is a real permission fault, and retrying would only delay the error.

## Risks / Trade-offs

- **[A persistent Windows permission fault now waits up to 5 seconds before failing]** → It still fails with the original error once the deadline passes.

## Evidence

- Injected-failure coverage: a single `EPERM` or `EACCES` from the lock open is retried on `win32`, and `EPERM` stays fatal on `linux`. Without the fix, the two Windows cases fail.
