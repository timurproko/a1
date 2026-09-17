## 1. Hand-off Operation

- [ ] 1.1 In `scripts/governance/local-worktree-cleanup.mjs` and `scripts/governance/local-cleanup-complete.mjs`, add `handoff --repo --path --change --pr`: register the exact worktree when no registration exists or reclaim the existing one, record current HEAD and branch, apply the central disposable policy, and release; block with the affected paths on tracked/staged/unstaged/untracked content, and with a named reason on a primary, foreign, or identity-changed path. Never evaluate, delete, or enable.
- [ ] 1.2 Fixtures: hand-off of a clean pushed worktree yields one released entry and leaves the tree; repeated hand-off updates the head without a second entry; hand-off after a repair push records the new head; a dirty worktree blocks and stays owned.

## 2. Finalization Ancestry

- [ ] 2.1 In `scripts/governance/local-cleanup-evidence.mjs`, replace the head-equality checks for completed-delivery candidates with equal-or-ancestor of the merged PR head (fetch the head by hash, `git merge-base --is-ancestor`), applied to the registered head and the live worktree HEAD; keep the branch attachment exact and keep discard's equality rule.
- [ ] 2.2 In `scripts/governance/local-cleanup-reconcile.mjs` and `scripts/governance/local-cleanup-git.mjs`, make topic-ref deletion read the tip immediately before deletion, require it to be equal to or an ancestor of the merged head, and compare-and-delete against that tip.
- [ ] 2.3 Fixtures: a registered head one App commit behind the merged head is removed with `local-ref-removed`; a local commit after registration blocks with `candidate-head-association`; a changed branch attachment still blocks.

## 3. Sweep And Branch Pruning

- [ ] 3.1 Add `sweep --repo`: one bounded pass over released registrations using the queue limits and cursor without requiring `enable`, honoring a stop sentinel before each destructive step, reporting `pending`, `awaiting-discard`, `blocked`, `removed`, `already-absent`, `deferred`, and coverage; concurrent sweeps yield `deferred` on the mutation lock.
- [ ] 3.2 Add the branch-pruning pass to `sweep`: enumerate `refs/heads/` topic branches not checked out and not registered, look up same-repository pull requests by head ref name, require one merged-into-`develop` PR and no open PR, tip equal to or ancestor of that merged head, and absent remote ref; compare-and-delete; report retained branches with `branch-no-pull-request`, `branch-open-pull-request`, `branch-unmerged-commits`, `branch-checked-out`, or `branch-remote-present`. Optionally prune-fetch `origin` first.
- [ ] 3.3 Fixtures: a sweep after merge removes a handed-off worktree and ref while an open candidate stays `pending` and a closed-unmerged candidate reports `awaiting-discard`; a hand-deleted worktree's branch is pruned; a branch with a local-only commit, an open PR, or a checkout is retained; a disabled queue does not stop the sweep but a stop sentinel does.

## 4. Guidance And Evidence

- [ ] 4.1 Update `docs/local-worktree-cleanup.md` (hand-off, sweep, ancestry, branch pruning, outcome list) and the CLI help text.
- [ ] 4.2 Update `openspec/config.yaml` and `.agents/skills/change-delivery/SKILL.md`: hand off with `handoff` at maintainer hand-off and after repair pushes; run `sweep` from the primary checkout at the start of every delivery session and on verified or reported merge; relay its per-candidate line.
- [ ] 4.3 Run the focused cleanup fixtures, typechecking, and the governance commands; record outcomes. After merge, run `sweep` on the delivering machine and record the dispositions for the released #457 and #458 entries as post-merge evidence.
