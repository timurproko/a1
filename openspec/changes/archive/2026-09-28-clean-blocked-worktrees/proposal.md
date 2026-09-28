## Why

Two safe cleanup shapes currently have no repository-owned completion path. A merged worktree remains blocked when an exact generated `.artifacts` tree contains an installer-created junction whose target stays inside that same disposable root, while a clean redundant checkout with no pull request remains unmanaged even when its branch has no remote and contributes no commit beyond `develop`. The current fail-closed policy correctly prevents ad hoc deletion, so these cases need explicit bounded support rather than manual bypasses.

## What Changes

- Permit a link below an exact central disposable root only when its canonical target remains inside that same root; revalidate and unlink the link itself before bounded root removal, while retaining every escape, root-level link, special file, nested repository, and unknown-content blocker.
- Add an exact, explicitly confirmed `retire-redundant` operation for one unregistered Git worktree whose clean topic branch has no pull request or remote ref and whose tip is already contained by fresh `origin/develop`.
- Reuse mutation locking, exact filesystem/Git identity checks, bounded inspection, journaling, non-force worktree removal, and compare-and-delete local-ref handling; do not let sweep adopt unmanaged worktrees automatically.
- Extend temporary-repository fixtures and cleanup guidance for both paths, including Windows junction topology and interruption/race failures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Safely handle contained generated links and add explicit retirement for redundant no-PR worktrees.
- `change-delivery-workflow`: Allow agents to use the repository-owned redundant-worktree operation only after exact maintainer cleanup authorization, while preserving the ban on ad hoc adoption or deletion.

## Impact

The local cleanup CLI, generated-content inspection/purge, local cleanup state and journaling, unmanaged-worktree handling, delivery guidance, cleanup documentation, and focused temporary-repository tests are affected. Automatic sweep adoption, user-content deletion, force removal, open or dirty worktree cleanup, remote branch deletion, and product runtime behavior remain unchanged.
