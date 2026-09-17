## 1. Hand-off Operation

- [x] 1.1 In `scripts/governance/local-worktree-cleanup.mjs` and `scripts/governance/local-cleanup-complete.mjs`, add `handoff --repo --path --change --pr`: register the exact worktree when no registration exists or reclaim the existing one, record current HEAD and branch, apply the central disposable policy, and release; block with the affected paths on tracked/staged/unstaged/untracked content, and with a named reason on a primary, foreign, or identity-changed path. Never evaluate, delete, or enable.
- [x] 1.2 Fixtures: hand-off of a clean pushed worktree yields one released entry and leaves the tree; repeated hand-off updates the head without a second entry; hand-off after a repair push records the new head; a dirty worktree blocks and stays owned.
- [x] 1.3 Let `handoff` and `complete` release a still-owned low-level registration when `LOCAL_CLEANUP_OWNER_TOKEN` matches its owner hash; a missing or wrong token keeps `owned-worktree`. Fixtures cover both commands.

## 2. Finalization Ancestry

- [x] 2.1 In `scripts/governance/local-cleanup-evidence.mjs`, replace the head-equality checks for completed-delivery candidates with equal-or-ancestor of the merged PR head (fetch the head by hash, `git merge-base --is-ancestor`), applied to the registered head and the live worktree HEAD; keep the branch attachment exact and keep discard's equality rule.
- [x] 2.2 In `scripts/governance/local-cleanup-reconcile.mjs` and `scripts/governance/local-cleanup-git.mjs`, make topic-ref deletion read the tip immediately before deletion, require it to be equal to or an ancestor of the merged head, and compare-and-delete against that tip.
- [x] 2.4 In `cleanupReader`, memoize SHA-addressed blob, tree, commit, and compare responses for the reader's lifetime under a bounded cache so the three per-candidate verifications do not refetch immutable content; keep pull-request, ref, run, and timeline reads uncached.
- [x] 2.3 Fixtures: a registered head one App commit behind the merged head is removed with `local-ref-removed`; a local commit after registration blocks with `candidate-head-association`; a changed branch attachment still blocks.

## 3. Sweep And Branch Pruning

- [x] 3.1 Add `sweep --repo`: one bounded pass over released registrations using the queue limits and cursor without requiring `enable`, honoring a stop sentinel before each destructive step, reporting `pending`, `awaiting-discard`, `blocked`, `removed`, `already-absent`, `deferred`, and coverage; concurrent sweeps yield `deferred` on the mutation lock.
- [x] 3.2 Add the branch-pruning pass to `sweep`: enumerate `refs/heads/` topic branches not checked out and not registered, look up same-repository pull requests by head ref name, require one merged-into-`develop` PR and no open PR, tip equal to or ancestor of that merged head, and absent remote ref; compare-and-delete; report retained branches with `branch-no-pull-request`, `branch-open-pull-request`, `branch-unmerged-commits`, `branch-checked-out`, or `branch-remote-present`. Optionally prune-fetch `origin` first.
- [x] 3.3 Fixtures: a sweep after merge removes a handed-off worktree and ref while an open candidate stays `pending` and a closed-unmerged candidate reports `awaiting-discard`; a hand-deleted worktree's branch is pruned; a branch with a local-only commit, an open PR, or a checkout is retained; a disabled queue does not stop the sweep but a stop sentinel does.

## 4. Stale Mutation Lock

- [x] 4.1 In `scripts/governance/local-cleanup-state.mjs`, write PID, nonce, start, and heartbeat into `mutation.lock`, refresh the heartbeat every five seconds while held, and on `EEXIST` evict once when the heartbeat (or legacy mtime) is older than two minutes and the PID does not exist, journaling `lock-evicted-*.json`; otherwise fail `mutation-busy`.
- [x] 4.2 Fixtures: a dead PID with a stale heartbeat is evicted and journaled; a fresh heartbeat, a live PID, and an unreadable fresh file stay busy; a legacy lock is judged by its mtime.

## 5. Guidance And Evidence

- [x] 5.1 Update `docs/local-worktree-cleanup.md` (hand-off, sweep, ancestry, branch pruning, outcome list) and the CLI help text.
- [x] 5.2 Update `openspec/config.yaml` and `.agents/skills/change-delivery/SKILL.md`: hand off with `handoff` at maintainer hand-off and after repair pushes; run `sweep` from the primary checkout at the start of every delivery session and on verified or reported merge; relay its per-candidate line.
- [x] 5.3 Run the focused cleanup fixtures, typechecking, and the governance commands; record outcomes, including live `preview` and `sweep` runs against the maintainer's repository from a copy of the tooling outside the removable root.
