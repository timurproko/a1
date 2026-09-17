## Why

Version-3 delivery ends when the agent hands the validated candidate to the maintainer; the merge happens later, in another session or none. The specification requires the owning agent to run `complete` after verified merge, but no session is alive at that moment, so every merged worktree under `.worktrees/` and its local topic branch stay behind until someone runs the command by hand. Three mechanics make even that manual step fail or leave residue. Since `automate-openspec-finalization` (#456) the finalization App pushes a commit onto the PR branch after the worktree was registered, so `complete` blocks with `candidate-head-association` unless the worktree is fast-forwarded first (today's reports for #457 and #458). A worktree deleted by hand leaves its local branch; this morning `develop` sat next to `fix/build-script-stdout`, `fix/close-absent-and-skewed-cleanup`, and `fix/focus-pull-request-selection`, all merged and already deleted on `origin`. And a merged local branch with no registration is never touched by any cleanup path, because cleanup adopts nothing it did not register.

## What Changes

- Add one standard `handoff` operation that the delivering agent runs from the primary checkout when it hands the validated PR to the maintainer, and again after any repair push: it registers the exact worktree if needed, records its head and branch, applies the central disposable policy, and releases it to local cleanup without deleting or enabling anything. That release is the candidate-scoped completed-delivery authorization, exercised only once the merge, archive, and remote-ref gates later verify.
- Add one bounded `sweep` operation that every delivery session runs from the primary checkout before creating a worktree, and again when it verifies or is told of a merge. It evaluates every released registration, completes each candidate whose PR is verified merged under exactly the existing evidence, identity, content, journal, and non-force removal safeguards, reports open or pending candidates untouched, reports closed-unmerged candidates as awaiting explicit discard, and needs neither queue enablement nor a persistent process.
- Accept the finalization App's commits: a registered head, live worktree HEAD, or local topic-ref tip that equals or is an ancestor of the merged PR head is eligible; a tip holding commits outside the merged PR head still blocks.
- Let the sweep prune merged local topic branches that have no live registration when one same-repository PR with that head ref name merged into `develop`, no PR with that name is open, the tip equals or is an ancestor of that merged head, the remote ref is absent, and no worktree has the branch checked out; every other branch is reported and retained.
- Update `docs/local-worktree-cleanup.md`, `openspec/config.yaml`, and the change-delivery skill so hand-off and session-start sweep are the documented agent steps.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: hand-off release, released-candidate sweep, finalization ancestry, and evidence-based local branch pruning.
- `change-delivery-workflow`: agents hand off through the standard command and sweep at session start and on observed merge.

## Impact

Implementation affects `scripts/governance/local-worktree-cleanup.mjs`, `scripts/governance/local-cleanup-complete.mjs`, `scripts/governance/local-cleanup-evidence.mjs`, `scripts/governance/local-cleanup-reconcile.mjs`, `scripts/governance/local-cleanup-git.mjs`, their fixtures under `test/repository-governance/`, `docs/local-worktree-cleanup.md`, `openspec/config.yaml`, `.agents/skills/change-delivery/SKILL.md`, and the two specifications. It does not change the evidence sources, ownership and generation rules, the queue/watch modes, discard's remote-ref procedure, or which pull requests count as merged. GitHub Actions still never reaches into a developer machine.
