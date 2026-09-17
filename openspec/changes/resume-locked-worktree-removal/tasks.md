## 1. Disposable Purge

- [x] 1.1 Add a bounded retrying recursive removal helper in `scripts/governance/local-cleanup-git.mjs` and a `purgeDisposable` step that removes each entry-declared disposable root under the verified worktree; call it in `scripts/governance/local-cleanup-reconcile.mjs` after the second content inspection and before the `remove-intent` journal write, mapping a failure to `blocked` with `disposable-path-locked` and the path.
- [x] 1.2 Add a Windows fixture holding an exclusive handle inside `node_modules` of an entry with that disposable root; verify the pass reports `blocked` / `disposable-path-locked`, the `.git` pointer and journal step `none` survive, and the pass after release completes with `removed`.

## 2. Resumable Removal

- [x] 2.1 Add a stdin-capable variant to `gitRunner` and a `repairResidue` procedure in `scripts/governance/local-cleanup-git.mjs` that, for a `remove-intent` entry whose path exists, either revalidates the exact worktree for a Git retry or verifies residue (no valid foreign registration, no `.git`/link/special/nested content, every regular file disposable or tracked at the journaled head with an identical blob) within the existing entry allowances and deadline, removes the verified residue with the retrying helper, and retires only this candidate's prunable registration.
- [x] 2.2 Route the `remove-intent` branch of the reconciler and of the discard operation through that procedure, and run the disposable purge before both journal intent writes, reporting `residual-content` with offending paths, `residual-locked` for a still-locked directory, and `residual-or-reused-path` only for a valid foreign worktree or a reappearance after `worktree-removed`.
- [x] 2.3 Update the existing fixtures and add new ones: the Windows exclusive-handle case completes on the pass after release; a `.git`-less residue with unchanged tracked files is removed and the dangling registration retired while an unrelated worktree's registration is untouched; a modified tracked file or foreign file in the residue blocks with `residual-content` and its path; an intact worktree after a thrown removal is retried and removed; the `worktree-removed` reuse fixture is unchanged.

## 3. Documentation And Evidence

- [x] 3.1 Update `docs/local-worktree-cleanup.md` to describe the disposable purge, the resumable `remove-intent` step, the new reasons, and the narrowed manual-repair case.
- [x] 3.2 Run the focused cleanup fixtures on Windows plus typechecking and the governance commands and record the outcomes; after merge, record the disposition of the four journaled `remove-intent` entries on the maintainer's machine as post-merge evidence.
