---
name: change-delivery
description: Repository policy for planning, implementation, acceptance, merge, archival, and cleanup.
---

# Change delivery

Read [project workflow](../../../openspec/config.yaml) and [delivery runbook](../../../docs/openspec-archive-automation.md) first.

## Deliver

1. Keep primary on `develop`. Run `local-worktree-cleanup.mjs sweep --repo <primary>` first; relay `lines`; results never delay. From fresh `origin/develop`, create one task worktree. Before any planning or implementation edit, run `a1 session link-worktree <absolute-worktree>` in the owning session; continue only after it confirms the exact path, otherwise stop edits and report the blocker. Relink before resuming or switching streams. This changes footer/PR context, not tool cwd; address the worktree explicitly. Use one branch/draft PR with `## Proposal` containing one or two sentences of intent, two to five `## Implementation` bullets, and final explained/collapsed `## Automation` link JSON. Omit routine validation commands; do not add a quoted phase line.
2. Planning authorizes artifacts only; no code, synchronization, finalization, or merge until the maintainer approves the plan and explicitly requests implementation.
3. Continue approved work in the same worktree, branch, history, and PR; keep it draft and reconcile approved planning refinements before code.
4. Complete implementation, evidence, gaps, and substantive tasks. Add one to ten implementation-specific result bullets under `## Acceptance`, never checkboxes or generic items.
5. Reconcile `origin/develop` and mark the phase-free PR ready. The trusted `OpenSpec finalization` workflow synchronizes deltas, archive, manifest, and fence. Pull before pushing; push fixes on top and let it re-finalize; never revert a finalization commit. A `BEHIND` PR: merge `origin/develop`, push, re-finalize, hand off again.
6. One exact-head CI run validates finalization and selected scopes, including selected PR Full regression. After the stable aggregate succeeds, hand off unchanged for manual merge, then run `local-worktree-cleanup.mjs handoff` from primary with exact worktree, change, and PR (again after repairs). Do not add a lifecycle body edit, rerun unchanged validation, wait for merge, or watch; changed head, acceptance, or target requires revalidation.
7. Only CI-created failed-Full-regression repairs select PR Full regression; all others retain bounded validation.
8. Never enable auto-merge, merge queue, App/bot merge, or documentation integration; only manual merge of the exact validated head accepts implementation.
9. Create no acceptance, spec-only, or archive-only follow-up PR. After merge, report `Archived` only after verifying archive, specs, acceptance provenance, and remote cleanup; never edit the accepted body.

Standalone README/docs/OpenSpec updates inside the documentation allowlist may keep CI-gated auto-merge; legacy delivery records keep their documented path.

## Reject or refine

- Closing an unmerged change integrates and archives nothing; worktree and remote branch removal need separate approvals.
- Refine in the same open PR; if already finalized, restore the active form from branch history, update plan and implementation, reconcile, finalize again.
- Implementation without approval: stop and disclose; mixed plan/code grants nothing.
- Never direct-push lifecycle corrections to `develop` or infer missing acceptance, evidence, task-completion, or cleanup authority.

## Handoff

Provide exact worktree, branch/commit, commands, expected behavior, known gaps. Interactive repository tests: build, then launch only with `./scripts/dev` or `./scripts/dev pi`. Every reply reporting a pushed head, ready PR, CI result, or merge ends with `🧪 Manual test:` plus one forward-slash inline-code shell command; omit only when nothing is runnable.

## Cleanup

Never remove open, unverifiable, dirty, or unowned work; PR closure alone authorizes nothing. Follow [local cleanup](../../../docs/local-worktree-cleanup.md): `local-worktree-cleanup.mjs sweep` at session start and on merge, `local-worktree-cleanup.mjs complete` for one named integrated candidate, `discard --confirm-closed-unmerged` for explicitly rejected work. All run from primary and own registration, disposables, remote authority, worktree/ref removal, branch pruning; never delete those ad hoc or bypass blockers.
