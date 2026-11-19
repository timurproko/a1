## 1. Empty-Tree Verification And Removal

- [x] 1.1 In `scripts/governance/local-cleanup-git.mjs`, add a bounded emptiness check that accepts a path only when it is a non-link directory whose entire subtree holds nothing but non-link directories, and a bottom-up remover that uses non-recursive `rmdir` only and surfaces `EBUSY`/`EPERM`/`EACCES`/`ENOTEMPTY` as `empty-directory-locked` without widening to recursive deletion.
- [x] 1.2 Give the check the ordinary content-inspection allowance and deadline so a pathological tree defers the pass instead of stalling it.

## 2. Unmanaged Scan

- [x] 2.1 In `scripts/governance/local-cleanup-reconcile.mjs`, classify each unregistered entry under the worktree root: a real directory with no Git worktree row, an all-empty subtree, and a modification time older than ten minutes is removable; anything else stays `unmanaged` with `not-registered`, `empty-directory-recent`, or the existing reason.
- [x] 2.2 In preview, report a removable directory as `unmanaged (empty-directory)` and delete nothing. In execution, check the stop control and cancellation before each removal, remove the tree, and report `removed (empty-directory)` with the step `empty-directory-removed`; a locked directory reports `blocked (empty-directory-locked)` and is retried on a later pass.
- [x] 2.3 In `scripts/governance/local-worktree-cleanup.mjs`, keep plain `unmanaged` rows out of the sweep lines but name each removed or locked empty directory.

## 3. Documentation And Specification

- [x] 3.1 Update `docs/local-worktree-cleanup.md`: the unmanaged rule, the empty-directory exception with its grace and lock behaviour, and the new outcome and step names.
- [x] 3.2 Synchronize the `local-worktree-cleanup` specification delta at finalization.

## 4. Fixtures And Evidence

- [x] 4.1 Fixtures in `test/repository-governance/local-cleanup.node.mjs`: an aged empty directory is removed and named in the lines; a nested tree of only empty directories is removed as one row; a directory with a file, a symbolic link, or nested `.git` metadata stays `unmanaged` with its content untouched; a directory younger than the grace stays; a path Git still lists stays; preview deletes nothing; an open handle reports `blocked (empty-directory-locked)` and the next pass removes the directory after release.
- [x] 4.2 Run the focused cleanup fixtures, the governance bridges, typechecking, and the governance commands; record outcomes, including the live sweep that removes `.worktrees/erasable-syntax-only` from the maintainer's repository.
