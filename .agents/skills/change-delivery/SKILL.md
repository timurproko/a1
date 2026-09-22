---
name: change-delivery
description: Repository policy for planning, implementation, acceptance, merge, archival, and cleanup.
---

# Change delivery

Read [project workflow](../../../openspec/config.yaml) and [delivery runbook](../../../docs/openspec-archive-automation.md) first.

## Deliver

1. Keep primary on `develop`. Run `local-worktree-cleanup.mjs sweep --repo <primary>` first; relay `lines`; results never delay. From fresh `origin/develop`, create a worktree; run `a1 session link-worktree <worktree>` in the owning session. One branch/draft PR. Start with `## Proposal` containing one or two sentences of intent, then `## Implementation` with two to five bullets; do not add a quoted phase line. Omit routine validation commands; put link JSON last under `## Automation` in an explained collapsed disclosure.
2. A planning request authorizes only planning artifacts; no implementation, canonical-spec synchronization, finalization, or merge until the maintainer approves the plan and explicitly requests implementation.
3. Continue approved implementation in the same worktree, branch, history, and PR without a body-phase edit; keep it draft while incomplete; reconcile approved planning refinements before related code edits.
4. Complete implementation, evidence, gap disposition, and substantive tasks. Keep the body phase-free; add one to ten implementation-specific behavior-and-result bullets under `## Acceptance`, never checkboxes or generic items.
5. Reconcile `origin/develop` and mark the phase-free PR ready. The trusted `OpenSpec finalization` workflow synchronizes deltas, stages the archive and manifest, commits as the archive App, and updates the fence. Pull before pushing; push fixes on top and let it re-finalize; never revert a finalization commit. A `BEHIND` PR: merge `origin/develop`, push, re-finalize, hand off again.
6. One exact-head CI run validates the finalized delivery and selected scopes, including PR-attached Full regression whenever selected. When the stable protected aggregate succeeds, hand off the unchanged PR for manual merge, then run `local-worktree-cleanup.mjs handoff` from primary for the exact worktree, change, and PR (again after repairs). Do not add a lifecycle body edit, start a second validation run, wait for merge, or start a watcher; a new commit, acceptance list, or target requires revalidation.
7. Only CI-created failed-Full-regression repairs use PR-attached Full regression; all other PRs retain bounded validation. Follow the runbook.
8. Never enable auto-merge, merge queue, App/bot merge, or documentation integration for implementation-bound work; only the maintainer's manual merge of the exact validated head accepts the listed scenarios.
9. Create no acceptance, spec-only, or archive-only follow-up PR. After merge, report `Archived` only after verifying archive, specs, acceptance provenance, and exact-head remote cleanup; never edit the accepted body.

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
