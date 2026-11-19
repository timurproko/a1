## Why

`local-worktree-cleanup.mjs complete` removes a worktree with one non-force `git worktree remove`. On Windows that command regularly meets a file handle inside `node_modules` (Defender, an editor, or a lingering `esbuild`/`vitest` worker), deletes everything before the locked entry, and exits non-zero. Git has by then dropped the `.git` pointer, so the next pass finds the path present but no longer a worktree and reports `partial` / `residual-or-reused-path`; the journal stays at `remove-intent` forever. The residue is `node_modules` plus the tracked files that sort after it, all of which are already on `develop`. Four of the last eight completions on this machine (PRs #443, #448, #450, #451) ended in exactly this state, and each one cost an agent three retries plus a request for manual `rm -rf` authority that the documentation forbids the script from exercising.

## What Changes

- Before journaling removal intent, delete the central-policy disposable roots (`node_modules`, `dist`, `.artifacts/validation`, the native `target` roots, and the rest of `COMPLETION_DISPOSABLE_PATHS`) from the verified worktree with Node's bounded retrying recursive removal, so Git's removal only has to delete tracked repository content. A root that stays locked after the retry budget blocks with `disposable-path-locked` and the named path while the worktree, its `.git` pointer, and the `none` journal step remain intact.
- Make the `remove-intent` journal step resumable for both `complete` and `discard`. When the path is still the exact registered worktree, the next pass revalidates content and retries non-force Git removal. When Git has already dismantled the worktree, the next pass verifies that Git no longer treats the path as a valid worktree and that every remaining regular file is either below a disposable root or has the exact tracked path and blob identity of the journaled head, then removes the verified residue with the same bounded retrying removal and retires only this candidate's dangling Git registration.
- Report unverifiable residue as `residual-content` with the offending paths, and residue that is still locked as `residual-locked`, both retained for the next pass; keep `residual-or-reused-path` for a directory that reappears after a fully verified removal.
- Extend the fixtures: the Windows exclusive-handle case completes on the pass after the handle is released, a locked disposable root blocks without journaling intent, a modified or foreign file in the residue blocks, and a dangling registration is retired only for the verified candidate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: completion removes policy-disposable roots before Git removal, and a partially removed worktree is repaired by verified-residue removal on the next pass instead of being retained for manual deletion.

## Impact

Implementation affects `scripts/governance/local-cleanup-git.mjs`, `scripts/governance/local-cleanup-reconcile.mjs`, `test/repository-governance/local-cleanup.node.mjs`, `docs/local-worktree-cleanup.md`, and the `local-worktree-cleanup` specification. It does not change evidence verification, ownership and generation rules, the central disposable-path list, discard's remote-ref procedure, or the rule that a path reused after a completed removal needs a new registration.
