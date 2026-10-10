---
name: change-delivery
description: Repository policy for planning, implementation, acceptance, merge, archival, and cleanup.
---

# Change delivery

Read [project workflow](../../../openspec/config.yaml) and [delivery runbook](../../../docs/openspec-archive-automation.md) first.

## Deliver

1. Keep primary on `develop`; run `local-worktree-cleanup.mjs sweep --repo <primary>`, relay `lines`, then run `a1 session worktrees`. Never use `busy`/`unverifiable`; reuse `available` only for an exact branch/change/PR after atomic `a1 session link-worktree <absolute-worktree>` succeeds, else create a fresh worktree. Before any planning or implementation edit, continue only after link confirms the exact path; on failure report the blocker and stop feature edits. Relink when resuming or switching streams. Linking claims live editing and changes footer/PR context, not tool cwd or cleanup authority. Use one branch/draft PR with `## Proposal` containing one or two sentences of intent, two to five `## Implementation` bullets, and final collapsed `## Automation` link JSON. Omit routine validation commands; do not add a quoted phase line.
2. Put agent scratch (PR bodies, output, patches, logs) in the owning worktree's ignored `.artifacts/`, never OS temp, home/desktop, primary, or another worktree. Keep it unstaged, non-authoritative, secret-free; tool/runtime/test-internal temp is out of scope.
3. Planning permits artifacts only; no delivery until the maintainer approves the plan and explicitly requests implementation.
4. Continue in the same worktree, branch, history, and PR; keep it draft and reconcile refinements before code.
5. Complete implementation, evidence, gaps, and tasks. Add one to ten implementation-specific result bullets under `## Acceptance`, never checkboxes or generic items.
6. Reconcile `origin/develop` and mark ready. The `OpenSpec finalization` workflow synchronizes deltas, archive, manifest, and fence. Pull before pushing; push fixes on top and never revert a finalization commit. A `BEHIND` PR: merge `origin/develop`, push, re-finalize, hand off again.
7. Exact-head CI validates finalization and selected scopes. After success, hand off unchanged; run `local-worktree-cleanup.mjs handoff` from primary with exact worktree/change/PR and after repairs. Do not add a lifecycle body edit, rerun unchanged validation, wait, or watch; changes require revalidation and a new human arm.
8. Only CI-created failed-Full repairs select PR Full regression; others retain bounded validation.
9. Agents, Apps, bots, merge queue, and automation never enable or invoke implementation integration. Only an authorized maintainer may manually merge or personally arm native auto-merge for the exact validated head; never create that arm for them.
10. Create no acceptance, spec-only, or archive-only follow-up PR. After merge, report `Archived` only after verifying archive, specs, acceptance provenance, and remote cleanup; never edit the accepted body.

Allowlisted docs/OpenSpec and verified release reopening may keep automated CI-gated integration. Documentation policy preserves, but never creates or exercises, a valid human-owned finalized arm; legacy records retain their path.

## Reject or refine

- Closing an unmerged change integrates and archives nothing; worktree and remote branch removal need separate approvals.
- Refine in the same open PR; if already finalized, restore the active form from branch history, update plan and implementation, reconcile, finalize again.
- Implementation without approval: stop and disclose; mixed plan/code grants nothing.
- Never direct-push lifecycle corrections to `develop` or infer missing acceptance, evidence, task-completion, or cleanup authority.

## Handoff

Provide worktree, commit, commands, behavior, and gaps. Build interactive tests; launch only with `./scripts/dev` or `./scripts/dev pi`. Runnable replies end with `🧪 Manual test:` plus one forward-slash inline-code command.

## Cleanup

Never remove open, unverifiable, dirty, or unowned work; PR closure alone authorizes nothing. Follow [local cleanup](../../../docs/local-worktree-cleanup.md): `local-worktree-cleanup.mjs sweep`, exact-candidate `local-worktree-cleanup.mjs complete`, or rejected-work `discard --confirm-closed-unmerged`. Exact maintainer authorization permits `retire-redundant --confirm-redundant` only for clean unregistered no-PR/no-remote work contained by fresh `origin/develop`; sweep never adopts it. Run from primary; never delete those ad hoc or bypass blockers.
