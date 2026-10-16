---
name: change-delivery
description: Policy for repository change delivery.
---

# Change delivery

Read [project workflow](../../../openspec/config.yaml) and [delivery runbook](../../../docs/openspec-archive-automation.md) first.

## Deliver

1. Keep primary on `develop`; run `local-worktree-cleanup.mjs sweep --repo <primary>`, relay `lines`, then `a1 session worktrees`. Never use `busy`/`unverifiable`; reuse `available` only after exact-stream `a1 session link-worktree <absolute-worktree>` succeeds, else create fresh. From Claude Code, link with `EnterWorktree` (`path` = that worktree) instead. Before any planning or implementation edit, continue only after link confirms the exact path; on failure report the blocker and stop feature edits. Relink when resuming or switching streams. Linking claims editing, not tool cwd or cleanup authority. Use one branch/draft PR: `## Proposal` with one or two sentences of intent, two to ten unchecked scoped `## Implementation` items, final collapsed `## Automation` JSON. Each item names a delivered code outcome; exclude process/ledger, run/verify/validate, evidence, and manual-test items and routine commands; do not add a quoted phase line.
2. Put agent scratch in the owning worktree's ignored `.artifacts/`, never OS temp, home/desktop, primary, or another worktree. Keep it unstaged, non-authoritative, secret-free; tool/runtime/test-internal temp is out of scope.
3. Planning permits artifacts only; no delivery until the maintainer approves the plan and explicitly requests implementation.
4. Continue in the same worktree, branch, history, and PR; keep draft; push after green `npm run preflight`. Toggle `[ ]` to `[x]` as soon as its code, its written tests, and detailed tasks finish; CI runs those tests after readiness, and manual validation never gates a checkbox, finalization, or merge. Never defer progress to handoff. Other edits require scope refinement.
5. Keep `## Acceptance` plain; maintainer integration accepts. Finish items/gaps, push reconciled `origin/develop`, pass `check-delivery-body.mjs --final` before the final marker; check every item before ready/finalization. Agents never mark implementation PRs ready: checking completed work ends their role. GitHub checks are not task progress.
6. The `OpenSpec finalization` workflow promotes an eligible all-checked draft, then synchronizes deltas, archive, manifest, and fence. Pull before pushing; never revert a finalization commit. A `BEHIND` PR: merge `origin/develop`, push, re-finalize, hand off again.
7. Exact-head CI validates finalization and selected scopes. After success or repair, run `local-worktree-cleanup.mjs handoff` from primary with exact worktree/change/PR. Do not add a lifecycle body edit, rerun unchanged validation, wait, or watch; changes require revalidation and a new human arm.
8. Only CI-created failed-Full repairs select PR Full regression; others retain bounded validation.
9. Agents, Apps, bots, merge queue, and automation never integrate implementation. Only an authorized maintainer may manually merge or personally arm native auto-merge for the exact validated head.
10. Create no acceptance, spec-only, or archive-only follow-up PR. After merge, report `Archived` only after verifying archive, specs, acceptance provenance, and remote cleanup; never edit the accepted body.

Allowlisted docs/OpenSpec and verified release reopening may keep automated CI-gated integration. Documentation policy preserves, but never creates or exercises, a valid human-owned finalized arm; legacy records retain their path.

## Reject or refine

- Closing an unmerged change integrates and archives nothing; cleanup needs separate approval.
- Refine in the same PR; if finalized, restore the active form from history, update plan/implementation, reconcile, and finalize again.
- Implementation without approval: stop and disclose; mixed plan/code grants nothing.
- Never direct-push lifecycle corrections to `develop` or infer missing authority.

## Handoff

Provide worktree, commit, commands, behavior, and gaps. Build interactive tests; launch only with `./scripts/dev` or `./scripts/dev pi`. Runnable replies end with `🧪 Manual test:` plus one forward-slash inline-code command.

## Cleanup

Never remove open, unverifiable, dirty, or unowned work; PR closure alone authorizes nothing. Follow [local cleanup](../../../docs/local-worktree-cleanup.md): `local-worktree-cleanup.mjs sweep`, exact-candidate `local-worktree-cleanup.mjs complete`, or rejected-work `discard --confirm-closed-unmerged`. Exact maintainer authorization permits `retire-redundant --confirm-redundant` only for clean unregistered no-PR/no-remote work contained by fresh `origin/develop`; sweep never adopts it. Run from primary; never delete those ad hoc or bypass blockers.
