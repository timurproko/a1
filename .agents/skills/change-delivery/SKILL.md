---
name: change-delivery
description: Policy for repository change delivery.
---

# Change delivery

Read [project workflow](../../../openspec/config.yaml) and [delivery runbook](../../../docs/openspec-archive-automation.md) first.

## Deliver

1. Keep primary on `develop`; run `local-worktree-cleanup.mjs sweep --repo <primary>`, relay `lines`, then `a1 session worktrees`. Never use `busy`/`unverifiable`; reuse `available` only after exact-stream `a1 session link-worktree <absolute-worktree>` succeeds, else create fresh. Claude Code uses `EnterWorktree` by name, then branches. Before any planning or implementation edit, continue only after link confirms the exact path; stop feature edits and report the blocker only when linking the task's own worktree fails or reports another owner. A stale entry for some other worktree (its directory is gone; `git worktree list` marks it `prunable`) is never a blocker, even when it makes `a1 session worktrees` fail: run `git worktree prune` from primary, rerun the inventory, and continue. Relink when resuming or switching streams. Linking claims editing, not tool cwd or cleanup authority. Use one branch/draft PR with `## Proposal` (one or two sentences of intent), one or more unchecked scoped `## Implementation` outcomes with no fixed maximum, and final collapsed `## Automation`; do not add a quoted phase line.
2. Put agent scratch in the owning worktree's ignored `.artifacts/`, never OS temp, home/desktop, primary, or another worktree. Keep it unstaged, non-authoritative, secret-free; tool/runtime/test-internal temp is out of scope.
3. Planning permits artifacts only; no delivery until the maintainer approves the plan and explicitly requests implementation.
4. Continue in the same worktree, branch, history, and PR; keep draft; push after typecheck and touched tests. Toggle `[ ]` to `[x]` once code, tests, and tasks finish; manual validation never gates a checkbox, finalization, or merge. Other edits require scope refinement.
5. Keep `## Acceptance` plain; maintainer integration accepts. Finish items/gaps, push reconciled `origin/develop`, pass `check-delivery-body.mjs --final` before the final marker; check every item before ready/finalization. Agents never mark implementation PRs ready: checking completed work ends their role. GitHub checks are not task progress.
6. The `OpenSpec finalization` workflow promotes complete drafts and writes synchronized specs, archive, manifest, and fence. Pull before pushing; never revert a finalization commit. A `BEHIND` PR: merge `origin/develop`, push, re-finalize, hand off again.
7. After exact-head CI succeeds, run `local-worktree-cleanup.mjs handoff` from primary with exact worktree/change/PR. Do not add a lifecycle body edit or rerun validation. Never wait or watch; changes require revalidation and a fresh decision.
8. Only CI-created failed-Full repairs select PR Full regression; others retain bounded validation.
9. Never infer integration authority. If an authorized maintainer explicitly asks in the current interaction to merge one identified eligible PR, re-read its exact head, current `develop`, finalized binding, successful `Development validation required`, positive mergeability, and authorized human `User` credential. Issue one protected squash merge with expected-head enforcement. Otherwise require a fresh request; never wait, arm auto-merge, use queue/App/bot/workflow credentials, retry, or bypass protection.
10. Create no acceptance, spec-only, or archive-only follow-up PR. After merge, report `Archived` only after verifying archive, specs, acceptance provenance, and remote cleanup; never edit the accepted body.

Allowlisted docs/OpenSpec and verified release reopening retain CI-gated integration; documentation automation never creates a human arm.

## Reject or refine

- Closing an unmerged change integrates and archives nothing; cleanup needs separate approval.
- Refine in the same PR; if finalized, restore active form, update planning, reconcile, and finalize again.
- Unapproved implementation: stop and disclose; mixed plan/code grants nothing.
- Never direct-push lifecycle corrections to `develop` or infer authority.

## Handoff

Provide worktree, commit, commands, behavior, and gaps. Launch interactive tests only with `./scripts/dev` or `./scripts/dev pi`. Runnable replies end with `🧪 Manual test:` plus one forward-slash inline-code command.

## Cleanup

Never remove open, unverifiable, dirty, or unowned work; PR closure alone authorizes nothing. Follow [local cleanup](../../../docs/local-worktree-cleanup.md): `local-worktree-cleanup.mjs sweep`, exact-candidate `local-worktree-cleanup.mjs complete`, or `discard --confirm-closed-unmerged`. Exact authorization permits `retire-redundant --confirm-redundant` only for clean unregistered no-PR/no-remote work contained by fresh `origin/develop`; sweep never adopts it. Run from primary; never delete those ad hoc or bypass blockers.
