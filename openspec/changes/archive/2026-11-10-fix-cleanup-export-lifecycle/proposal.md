# Prevent routine export and development-process cleanup blockers

## Why

Recent accepted worktrees were retained first by a live development process holding a native module, then by a session export created in the checkout. Preserve these safety boundaries while keeping user exports outside disposable worktrees and making eligible development-process remediation explicit and predictable.

## What Changes

- Default bare-A1 session exports to the persistent user directory `~/.a1/exports/`, independently of checkout and temporary development state. Preserve explicit destinations and comparison behavior; use unique timestamp/session filenames without overwriting existing exports. Allow format-only HTML/JSONL selection without supplying a destination.
- Report ordinary local-content and development-process blockers together before generated-content removal. Preserve existing top-level reason compatibility while adding actionable identity-only diagnostics; inability to inspect processes is not evidence that none are running.
- Add explicit exact-candidate development-process shutdown to completed-delivery cleanup. Require eligible merged/released work, fresh process identity, exact checkout code association, caller/ancestor exclusion, bounded shutdown, and fresh ordinary cleanup checks. Ordinary sweeps do not acquire process-stop authority.
- Add an explicit named-export preservation operation for eligible completed worktrees. Copy the selected regular untracked HTML/JSONL file into the persistent export directory without overwriting, verify bytes and source identity, journal progress, and remove the original only after preservation is durable. Never classify arbitrary exports as disposable or bypass other dirty-worktree blockers.

## Capabilities

### Modified Capabilities

- `a1-shell`: persistent default export destinations and explicit-path/comparison compatibility.
- `local-worktree-cleanup`: combined diagnostics, exact authorized development-process shutdown, and explicit safe export preservation.

## Impact

Product path/export workflow ownership, repository-local process discovery and cleanup commands, focused tests, cleanup documentation and agent guidance. No new service, supervisor, job object, merge authority, background cleanup watcher, or global process-kill rule is introduced. The current blocked worktree and export remain unchanged until an integrated authorized preservation operation can handle them.
