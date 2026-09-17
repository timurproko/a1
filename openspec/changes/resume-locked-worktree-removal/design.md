# Design

## Why the lock lands on Git

`inspectWorktree` already walks `node_modules` and the other disposable roots to prove they contain nothing but ignored regular files, then hands the whole directory to `git worktree remove`. Git deletes entries in directory order and fails at the first `EBUSY`/`EPERM`; on this machine that is always inside `node_modules`, which on a fresh install holds about 13,000 files and is exactly where Defender and test workers keep handles open for a few seconds. By the time Git fails it has usually already unlinked the `.git` pointer file, so `captureWorktree` can never validate the path again, and `absent()` reports `residual-or-reused-path` on every retry. Nothing in the script distinguishes "a lock interrupted my own removal" from "someone put a new directory here".

## Disposable roots are removed first

The disposable roots are the only content that inspection permits beyond the tracked tree, and the central policy already declares them repository-generated. Removing them before Git removal with a deadline-aware retry loop around `fs.rm({ recursive: true, force: true, maxRetries: 0 })` (six attempts, linear 300 ms backoff, about six seconds in total, retrying only `EBUSY`, `EPERM`, `EACCES`, and `ENOTEMPTY`) has three effects: the lock-prone tree is deleted by a call that waits out a transient handle; Node's own `maxRetries` is not used because it multiplies the wait across nested entries, and a single held file measured 66 seconds with `maxRetries: 10`; Git's non-force removal is left with tracked content only, which no tool holds open after the session leaves the directory; and a persistent lock surfaces before any journal transition. The purge happens after the second content inspection and before `remove-intent` is journaled, so a failure returns `blocked` with `disposable-path-locked` and the path, the worktree keeps its `.git` pointer, and the next pass starts from `none` again. The purge is limited to the roots listed on the entry, each of which inspection has just confirmed to be a plain directory tree inside the worktree without links, special files, or nested repositories.

## Resuming `remove-intent`

A journal at `remove-intent` with the path present has two shapes.

If `captureWorktree` still validates the exact entry (same path, filesystem fingerprint, head, and ref), Git aborted before dismantling anything; the pass repeats content inspection and non-force Git removal exactly as the first attempt did.

Otherwise the pass verifies residue. Git's worktree inventory must either omit the path or list it as prunable with a `gitdir` file that resolves to `<path>/.git`; a valid registration with a different identity is a reuse. The residue may not contain a `.git` entry, a link, a special file, or a nested repository. Every remaining regular file is either below a disposable root or is compared against `git ls-tree -r <journaled head>`: the relative path must be tracked there and `git hash-object --stdin-paths` (with the repository's filters, so `autocrlf` and attribute conversions are honoured) must return the same blob identity. The walk reuses the ordinary and generated entry allowances and the pass deadline. Any unknown path, changed blob, or boundary violation reports `residual-content` with up to one hundred offending paths and retains the directory; that is the only outcome that still needs a human, and it names the exact bytes to look at.

Verified residue is removed with the same bounded retrying removal. If it still cannot be removed the pass reports `residual-locked` and keeps the journal at `remove-intent` for a later attempt. After removal the pass checks Git's inventory once more: a row for this path that is prunable and whose `gitdir` resolves to the removed pointer is this candidate's own dangling registration, and its metadata directory under `<git-common-dir>/worktrees` is removed. No other row is touched and `git worktree prune` is never run. From here the existing `absent()` check passes and the pass continues to unchanged local-ref deletion exactly as before.

## What stays the same

Evidence verification, ownership, generations, the mutation lock, the disposable-path policy, discard's remote-ref compare-and-delete, and the `worktree-removed` step are unchanged. A path that reappears after a fully verified removal still reports `residual-or-reused-path` and requires a new registration, because at that step the journal proves the directory was gone. Reports keep listing paths only, never file contents.

## What this is measured by

The four entries currently journaled at `remove-intent` on the maintainer's machine (PRs #443, #448, #450, #451) should complete on one pass each after merge: the two whose directories were removed by hand continue to branch cleanup as they already would, and the two with residue are repaired by the new step. A fresh completion on Windows should either finish in one pass or report `disposable-path-locked` naming the locked root while the worktree stays intact.
