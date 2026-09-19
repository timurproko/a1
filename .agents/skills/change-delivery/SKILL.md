---
name: change-delivery
description: Repository policy for planning, implementation, acceptance, merge, archival, and cleanup.
---

# Change delivery

Read [project workflow](../../../openspec/config.yaml) and [delivery runbook](../../../docs/openspec-archive-automation.md) first.

## Deliver

1. Keep the primary checkout on `develop`. First run `local-worktree-cleanup.mjs sweep --repo <primary>` there and relay its `lines`; results never delay new work. Use one worktree from fresh `origin/develop`, one normal branch, one draft PR. Start with `## Proposal` containing one or two sentences of intent, then `## Implementation` with two to five bullets; do not add a quoted phase line. Omit routine validation commands; put link JSON last under `## Automation` in an explained collapsed disclosure.
2. A planning request authorizes only planning artifacts; do not implement, synchronize canonical specs, finalize, or merge until the maintainer approves the plan and explicitly requests implementation.
3. Continue approved implementation in the same worktree, branch, history, and PR without a body-phase edit; keep it draft while incomplete; reconcile approved planning refinements before related code edits.
4. Complete implementation, evidence, gap disposition, and substantive tasks. Keep the body phase-free; add one to three implementation-specific behavior-and-result bullets under `## Acceptance`, never checkboxes or generic items.
5. Reconcile `origin/develop` and mark the phase-free PR ready. The trusted `OpenSpec finalization` workflow synchronizes deltas, stages the dated archive and manifest, commits as the archive App, and updates the fence; local `finalize-openspec-delivery.mjs` is optional. Pull before pushing; push fixes on top and let it re-finalize; never revert a finalization commit. A `BEHIND` PR: merge `origin/develop`, push, re-finalize, hand off again.
6. One exact-head CI run validates the finalized delivery and selected scopes. When the stable protected aggregate succeeds, hand off the unchanged PR for maintainer review and manual merge, then run `local-worktree-cleanup.mjs handoff` from primary for the exact worktree, change, and PR (again after repair pushes). Do not add a lifecycle body edit, start a second validation run, wait for merge, or start a watcher; a new commit, acceptance list, or target requires revalidation.
7. A `fix/nightly-regression-<date>` candidate from the nightly triage is ordinary implementation-bound work in that same branch and PR; its evidence is in the body and `design.md`. Before hand-off, dispatch `gh workflow run full-regression.yml --ref <branch>` on the completed fix head, wait for it, and record the run in the design evidence; no green Full regression on the fix head, no hand-off.
8. Never enable auto-merge, merge queue, App/bot merge, or documentation integration for implementation-bound work. Green CI is not acceptance; only an authorized maintainer's manual merge of the exact validated head accepts the listed scenarios.
9. Create no acceptance, spec-only, or archive-only follow-up PR. After merge, report `Archived` only after verifying archive, specs, acceptance provenance, and exact-head remote cleanup; never edit the accepted body.

Standalone README/docs/OpenSpec updates inside the documentation allowlist may keep CI-gated auto-merge; legacy delivery records keep their documented path.

## Reject or refine

- Closing an unmerged change integrates and archives nothing; worktree removal and remote branch deletion need separate approvals.
- Refine in the same open PR. If already finalized, restore the active form from branch history, update plan and implementation coherently, reconcile, finalize again.
- Implementation without approval: stop and disclose; mixed plan/code grants no authority.
- Never direct-push lifecycle corrections to `develop` or infer missing acceptance, evidence, task completion, or cleanup authority.

## Handoff

Provide exact worktree, branch/commit, commands, expected behavior, known gaps. Interactive repository tests: build, then launch only with `./scripts/dev` or `./scripts/dev pi`. End a runnable handoff with two lines: `🧪 Manual test:` and one copy-pasteable forward-slash shell command in a single Markdown inline-code span; omit the block when nothing is runnable.

## Cleanup

Never remove open, unverifiable, dirty, or unowned work; PR closure alone authorizes nothing. Follow [local cleanup](../../../docs/local-worktree-cleanup.md): `local-worktree-cleanup.mjs sweep` at session start and on verified or reported merge, `local-worktree-cleanup.mjs complete` for one named integrated candidate, `discard --confirm-closed-unmerged` for explicitly rejected work. All run from primary and own registration, disposables, remote authority, worktree/ref removal, branch pruning; never delete those ad hoc or bypass blockers.
