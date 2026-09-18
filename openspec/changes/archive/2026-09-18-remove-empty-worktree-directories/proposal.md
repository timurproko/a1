## Why

`.worktrees/` accumulates empty directories that nothing owns. `D:/Git/a1/.worktrees/erasable-syntax-only` is the current example: it holds no files, Git lists no worktree for it, no local branch or cleanup registration names it, and every `sweep` and `preview` still reports it as `unmanaged (not-registered)` forever. The shape comes from how Git removes a worktree on Windows: `git worktree remove` deletes the checkout's contents, and when the final directory removal fails because a shell, editor, or indexer still holds the directory open, Git reports the failure but still deletes the worktree's administrative directory, so the empty top-level folder outlives its registration. The same leftover appears when a session removes a worktree outside the cleanup tooling. Managed removals already recover from this through the journaled residue step; unregistered leftovers have no path that removes them, so they must be deleted by hand.

## What Changes

- During the unmanaged scan that `sweep`, `once`, `watch`, `complete`, and `discard` already perform, treat an unregistered entry directly under `.worktrees/` as removable only when it is a real directory (not a link), Git holds no worktree row for that path, its whole subtree contains only directories (no files, links, special entries, or `.git` metadata), and its modification time is older than a ten-minute grace so an in-progress `git worktree add` or removal is never raced. Such a directory is deleted bottom-up with non-recursive directory removal only, reported as `removed (empty-directory)` with the step `empty-directory-removed`, and named in the sweep lines.
- Anything else stays exactly as today: a directory with any file, link, or Git metadata, a directory younger than the grace, or a path that Git still lists remains `unmanaged`, is never adopted, and is never deleted. A directory that cannot be removed because a handle is still open is reported `blocked (empty-directory-locked)` for that pass and retried on the next one.
- Preview reports the same classification as `unmanaged (empty-directory)` without deleting anything, and the disabled stop control still halts the pass before removal.
- Document the outcome in `docs/local-worktree-cleanup.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: empty unregistered directories under the worktree root are removed during execution passes; the unmanaged rule otherwise stands.

## Impact

Implementation affects `scripts/governance/local-cleanup-git.mjs` (empty-tree verification and bottom-up removal), `scripts/governance/local-cleanup-reconcile.mjs` (the unmanaged scan), `scripts/governance/local-worktree-cleanup.mjs` (sweep lines), their fixtures under `test/repository-governance/`, `docs/local-worktree-cleanup.md`, and the `local-worktree-cleanup` specification. It changes no evidence, ownership, registration, discard, residue, or branch-pruning rule, and it never deletes a file, a link, a Git row, or a directory that contains one.
