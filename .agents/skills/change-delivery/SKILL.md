---
name: change-delivery
description: Policy for repository change delivery.
---

# Change delivery

Read [project workflow](../../../openspec/config.yaml) and [delivery runbook](../../../docs/openspec-archive-automation.md).

## Deliver

1. Keep primary on `develop`; run `local-worktree-cleanup.mjs sweep --repo <primary>`, relay `lines`, then `git worktree list --porcelain`. Follow the [worktree protocol](../../../docs/architecture/project-structure.md) before planning or implementation edits and when resuming or switching streams. External agents use ordinary Git without an A1 installation, runtime, or session link. Verify root/repository/branch/state. Reuse: continuing ownership or explicit handoff; claim any released cleanup registration. Foreign owners, Git locks, and unverifiable handoffs block reuse. Inside an active A1 shell-tool session only, use `a1 session worktrees` and `a1 session link-worktree <absolute-worktree>`; failed links block edits. Claude Code retains `EnterWorktree`. Association changes neither tool cwd nor cleanup authority.
2. Store scratch in the owning worktree's ignored `.artifacts/`, never OS temp, home/desktop, primary, or another worktree. Unstaged, non-authoritative, secret-free; tool/runtime/test-internal temp is out of scope.
3. Start one planning-only draft PR: `## Proposal` with one or two sentences of intent, one or more unchecked outcomes under `## Implementation` with no fixed maximum, then collapsed `## Automation`; do not add a quoted phase line. Deliver only after the maintainer approves the plan and explicitly requests implementation.
4. Continue in the same worktree, branch, history, and PR; keep draft. When code, tests, and tasks complete an outcome, change only its `[ ]` to `[x]`; manual validation never blocks a checkbox, finalization, or merge. Outcome edits are scope refinement requiring approval before code.
5. Before ready/finalization, finish tasks/gaps, add `## Acceptance`, reconcile and push `origin/develop`, and pass `check-delivery-body.mjs --final`. Keep `## Acceptance` plain; maintainer integration accepts. Check the final item last; agents never mark implementation PRs ready. Checks are not progress.
6. The `OpenSpec finalization` workflow synchronizes deltas, archives, writes the manifest, commits, and binds the head. Pull before pushing and never revert a finalization commit. A `BEHIND` PR: merge `origin/develop`, push, re-finalize, hand off again.
7. After exact-head CI succeeds, run `local-worktree-cleanup.mjs handoff` from primary with exact worktree, change, and PR. Do not add a lifecycle body edit, rerun validation, wait, or watch. Repairs need renewed validation.
8. Only CI-created failed-Full repairs select PR Full regression; all others retain bounded validation.
9. Never infer integration authority. Only when an authorized maintainer explicitly asks in the current interaction to merge one eligible PR, re-read exact head, current `develop`, finalized binding, successful `Development validation required`, positive mergeability, and authorized human `User`. Issue one protected squash merge with expected-head enforcement. Changed or ineligible state needs a fresh request. Never wait, arm auto-merge, use queue/automation credentials, retry, or bypass protection.
10. Create no acceptance, spec-only, or archive-only follow-up PR. After merge, report `Archived` only after archive, specs, acceptance provenance, and remote cleanup verify; never edit its body.

Docs/release exceptions retain CI-gated integration, never human authority.

## Reject or refine

- PR closure alone authorizes nothing. Closing an unmerged change integrates and archives nothing; cleanup needs separate approval.
- Refine in the same PR; if finalized, restore active form, update planning, reconcile, and finalize again.
- Unapproved implementation: stop and disclose. Never direct-push lifecycle corrections to `develop`.

## Handoff

Provide worktree, branch, change, PR, commit, commands, behavior, gaps, and editing handoff. Use `./scripts/dev` or `./scripts/dev pi` interactively. Runnable replies end with `🧪 Manual test:` plus one forward-slash inline command.

## Cleanup

Follow [local cleanup](../../../docs/local-worktree-cleanup.md) from primary: `local-worktree-cleanup.mjs sweep`, exact-candidate `local-worktree-cleanup.mjs complete`, or `discard --confirm-closed-unmerged` (`--path`/`--branch`). Integrated `unlink-disposable-link --confirm-link-only`: named ignored disposable link only, never its target. `retire-redundant --confirm-redundant` requires exact authorization and documented no-PR/no-remote containment. Retain open/unverifiable/dirty/unowned work; never delete those ad hoc or bypass blockers.
