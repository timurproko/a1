## Context

See `proposal.md` for motivation. After the update releases ownership of the package it verifies that nothing still holds the installed tree by renaming the package directory to a probe name and back. On Windows that rename is refused with `EPERM` while any file or directory under the tree is open by any process, or while any process has its working directory inside it; this was confirmed empirically against the reported installation with a single read handle on `package.json`. The check ran exactly once, and a failure ended the transaction with a rollback and a diagnostic that blamed a lock the user could not see.

The ownership step that precedes the check waits only for the supervisor process it recorded and returns immediately when the active cohort runs from a retained release. Nothing in that path waits for handles to settle, so the check ran at the earliest possible instant after a session ended. The failure reproduced in the field was transient: the same rename succeeded from three different probing processes minutes later, with a session still open.

## Goals / Non-Goals

**Goals:**
- Absorb transient holders of the package tree so an update that has changed nothing yet is not abandoned over a brief hold.
- Keep the wait bounded and predictable so a persistent lock still fails clearly, within a time the user will tolerate.
- Tell the user what holds the package, where, and that retrying is safe.
- Prove the behaviour deterministically, including against the real Windows condition.

**Non-Goals:**
- Replace the rename-based check with handle enumeration or a platform API; no supported Node primitive reports holders, and the rename is the operation whose success the replacement actually needs.
- Change which sessions the update ends, how it ends them, or how long it waits for a recorded owner to exit.
- Change the transaction journal, rollback behaviour, progress presentation, or exit codes.
- Wait for antivirus or indexer activity to finish by any means other than re-checking.

## Decisions

### 1. Re-check with capped exponential backoff inside a fixed window

The coordinator retries the probe rename while the error is a lock and the elapsed time is under a fifteen-second window, sleeping 100 ms after the first failure and doubling to a one-second cap; the final pause is trimmed to the window's edge so the wait ends when promised. Fifteen seconds outlasts a scanner pass or a process tree finishing its exit without feeling hung under the progress bar, which continues to creep during the wait. The schedule yields roughly nineteen checks in the default window.

Alternative: a fixed number of immediate retries. Rejected because the holders seen are measured in seconds, not milliseconds, and a tight loop hammers the filesystem while a scan is reading it.

Alternative: wait longer in the ownership step before probing. Rejected because most updates have nothing to wait for and would pay the delay every time; re-checking only spends time when something is actually held.

### 2. Classify lock errors narrowly

Only `EPERM`, `EACCES`, `EBUSY`, and `ENOTEMPTY` are treated as a held tree. Any other rename failure, such as `ENOENT` for a tree that is no longer there, fails immediately with a diagnostic that says the package could not be verified rather than that it is locked.

Alternative: retry every rename failure. Rejected because it would hide a genuinely wrong installation behind fifteen seconds of waiting and a misleading lock message.

### 3. Restore the tree with the same patience and never leave it unnamed silently

The rename back from the probe name is subject to the same bounded retry, because renaming a directory is exactly what invites a scanner to open it. If the tree cannot be renamed back within the window, the diagnostic names the probe path and the original path so the user can restore it by hand. The previous behaviour attempted the restore once and discarded the error.

### 4. Make the persistent failure actionable and honest

When the window closes the diagnostic states how long the update waited and how many checks it made, repeats the underlying error, names the package root, lists the kinds of program that hold a tree on Windows, and says that nothing was changed and the update can simply be run again. The outer update failure line and the transaction journal are unchanged.

### 5. Inject the clock and the rename, not the platform

`createUpdateLifecycleCoordinator` takes an optional patience object with `windowMs`, `sleep`, and `now`, and the update filesystem seam gains an optional `rename`. Unit tests script rename outcomes per call and advance a fake clock only when the coordinator sleeps, so the exact schedule is asserted. Two Windows-gated tests hold a real file handle under a temporary package tree: one releases it during the wait and expects success, one keeps it and expects the bounded failure with the tree left under its own name.

## Risks / Trade-offs

- **[A persistent lock now takes fifteen seconds to report]** → The bar keeps moving during the wait, the message explains what happened, and the failure still ends in the same rollback and journal as before.
- **[A launch could start while the tree wears the probe name]** → Unchanged exposure; the probe window per attempt is two renames, and a launch during an active transaction already falls back to the retained release.
- **[A holder that never releases on a non-Windows platform]** → Renaming a held directory succeeds on POSIX, so the check passes there as it always has; the retry is inert.
- **[Lock code list misses a spelling]** → The listed codes are what Node reports for a held Windows directory; an unlisted code fails fast with the verification diagnostic rather than hanging.

## Implementation Evidence

- Twelve tests in the new unlock-probe suite pass on Windows, including the two real held-handle cases; the fifty-nine tests in the existing self-update, live-cohort, process-exit, and CLI update suites pass unchanged.
- `tsgo` typecheck for source and bin, the architecture and product identity checks, the pinned Pi ledger, terminal-host provenance, and the code documentation policy pass locally.
- The rename check was reproduced against the reported installation: it passed from PowerShell, from a bare Node process, and from a Node process that loaded the package as the launcher does, while a session was open; a single open read handle on one file under the tree made it fail with `EPERM`.

## Migration Plan

1. Ship the bounded retry, the narrow lock classification, and the diagnostics in the coordinator; no data or schema changes.
2. Roll back by restoring the single-attempt probe; no user-visible state depends on the new behaviour.
