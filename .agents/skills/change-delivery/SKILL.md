---
name: change-delivery
description: Policy for repository change delivery.
---

# Change delivery

Read [project workflow](../../../openspec/config.yaml) and [delivery runbook](../../../docs/openspec-archive-automation.md) first.

## Deliver

1. Keep primary on `develop`; run `local-worktree-cleanup.mjs sweep --repo <primary>`, relay `lines`, then `a1 session worktrees`. Never use `busy` or `unverifiable`. Reuse `available` only after `a1 session link-worktree <absolute-worktree>` succeeds; else create fresh. Claude Code uses `EnterWorktree`. Before planning or implementation edits, continue only after link confirms the exact path; if the task link fails or has another owner, stop feature edits and report the blocker. Prunable registration elsewhere: prune and retry. Relink when resuming or switching streams. Linking claims editing, not tool cwd or cleanup authority.
2. Store scratch in the owning worktree's ignored `.artifacts/`, never OS temp, home/desktop, primary, or another worktree. Keep it unstaged, non-authoritative, secret-free; tool/runtime/test-internal temp is out of scope.
3. Start one planning-only draft PR: `## Proposal` with one or two sentences of intent, one or more unchecked outcomes under `## Implementation` with no fixed maximum, then collapsed `## Automation`; do not add a quoted phase line. Deliver only after the maintainer approves the plan and explicitly requests implementation.
4. Continue in the same worktree, branch, history, and PR; keep draft. When code, tests, and tasks complete an outcome, change only its `[ ]` to `[x]`; manual validation never blocks a checkbox, finalization, or merge. Outcome edits are scope refinement requiring approval before code.
5. Before ready/finalization, finish tasks/gaps, add `## Acceptance`, reconcile and push `origin/develop`, and pass `check-delivery-body.mjs --final`. Keep `## Acceptance` plain; maintainer integration accepts. Check the final item last; agents never mark implementation PRs ready. Checks are not progress.
6. The `OpenSpec finalization` workflow synchronizes deltas, archives, writes the manifest, commits, and binds the head. Pull before pushing and never revert a finalization commit. A `BEHIND` PR: merge `origin/develop`, push, re-finalize, hand off again.
7. After exact-head CI succeeds, run `local-worktree-cleanup.mjs handoff` from primary with exact worktree, change, and PR. Do not add a lifecycle body edit, rerun validation, wait, or watch. Repairs need renewed validation.
8. Only CI-created failed-Full repairs select PR Full regression; all others retain bounded validation.
9. Never infer integration authority. Only when an authorized maintainer explicitly asks in the current interaction to merge one eligible PR, re-read exact head, current `develop`, finalized binding, successful `Development validation required`, positive mergeability, and authorized human `User`. Issue one protected squash merge with expected-head enforcement. Changed or ineligible state needs a fresh request. Never wait, arm auto-merge, use queue/automation credentials, retry, or bypass protection.
10. Create no acceptance, spec-only, or archive-only follow-up PR. After merge, report `Archived` only after archive, specs, acceptance provenance, and remote cleanup verify; never edit its body.

Allowlisted docs/OpenSpec and verified release reopening retain CI-gated integration; documentation automation never creates a human arm.

## Reject or refine

- PR closure alone authorizes nothing. Closing an unmerged change integrates and archives nothing; cleanup needs separate approval.
- Refine in the same PR; if finalized, restore active form, update planning, reconcile, and finalize again.
- Unapproved implementation: stop and disclose. Never direct-push lifecycle corrections to `develop`.

## Handoff

Provide worktree, commit, commands, behavior, and gaps. Use `./scripts/dev` or `./scripts/dev pi` interactively. Runnable replies end with `🧪 Manual test:` plus one forward-slash inline command.

## Cleanup

Never remove open, unverifiable, dirty, or unowned work. Follow [local cleanup](../../../docs/local-worktree-cleanup.md): `local-worktree-cleanup.mjs sweep`, exact-candidate `local-worktree-cleanup.mjs complete`, or `discard --confirm-closed-unmerged`. Exact authorization permits `retire-redundant --confirm-redundant` only for clean unregistered no-PR/no-remote work contained by fresh `origin/develop`; sweep never adopts it. Run from primary and never delete those ad hoc or bypass blockers.
