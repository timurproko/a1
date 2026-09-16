---
name: change-delivery
description: Repository policy for planning, implementation, acceptance, merge, archival, and cleanup.
---

# Change delivery

Read [project workflow](../../../openspec/config.yaml) and [delivery runbook](../../../docs/openspec-archive-automation.md) completely before acting.

## Deliver

1. Keep the primary checkout on `develop`. Use one worktree from fresh `origin/develop`, one normal branch, and one draft PR. Start with `## Proposal` containing one or two sentences of intent, then `## Implementation` with two to five implementation bullets; do not add a quoted phase line. Omit routine validation commands; put link JSON last under `## Automation` in an explained collapsed disclosure.
2. A planning request authorizes only planning artifacts. Do not implement, synchronize canonical specs, finalize, or merge until the maintainer approves the plan and explicitly requests implementation.
3. Continue approved implementation in the same worktree, branch, history, and PR without a body-phase edit; keep it draft while incomplete. Reconcile approved planning refinements before related code edits.
4. Complete implementation, evidence, gap disposition, and substantive tasks. Keep the body phase-free and add one to three implementation-specific behavior-and-result bullets under `## Acceptance`; never use checkboxes or generic process items.
5. Reconcile current `origin/develop`, then run the documented in-branch finalization. It must conservatively synchronize deltas, stage the dated archive and conditional acceptance manifest, fail closed, and mutate no remote state. Update the existing PR body with its exact emitted metadata.
6. Mark the finalized phase-free PR ready for one exact-head CI run that validates the finalized delivery plus every selected product/governance scope. When the stable protected aggregate succeeds, hand off that unchanged PR for maintainer review and authorized manual merge. Do not add a lifecycle body edit or start a second validation run. A new commit, acceptance list, or target requires revalidation.
7. Never enable auto-merge, merge queue, App/bot merge, or documentation integration for implementation-bound work. Green CI is not acceptance. An authorized maintainer's manual merge of the exact validated head accepts the listed scenarios and authorizes integration.
8. Create no acceptance, spec-only, or archive-only follow-up PR. After merge, report `Archived` only after verifying the archive, specs, acceptance provenance, and exact-head remote cleanup. Do not edit the accepted body.

Unassociated standalone README/docs/OpenSpec updates within the exact documentation allowlist may retain CI-gated auto-merge. Existing legacy delivery records and follow-ups retain their documented compatibility path; never convert them implicitly.

## Reject or refine

- Closing an unmerged change integrates and archives nothing. Worktree removal and remote branch deletion require their separate safety approvals.
- Refine in the same open PR. If already finalized, restore the active form through branch history, update plan and implementation coherently, reconcile the target, and finalize again.
- If implementation began without approval, stop and disclose it. Mixed plan/code content grants no authority.
- Never direct-push lifecycle corrections to `develop` or infer missing acceptance, evidence, task completion, or cleanup authority.

## Handoff

Provide the exact worktree, branch/commit, commands, expected behavior, and known gaps. For interactive repository tests, build first and launch only with `./scripts/dev` or `./scripts/dev pi`.

End a runnable handoff with exactly two lines: `🧪 Manual test:` and one copy-pasteable forward-slash shell command in a single Markdown inline-code span. If nothing is runnable, omit the block.

## Cleanup

Retain worktrees until merge/archive verification and remote-ref absence. Never remove open, unverifiable, dirty, or unowned work. Closed-unmerged cleanup requires exact candidate and remote-deletion confirmation; PR closure alone authorizes nothing.

Follow [local cleanup](../../../docs/local-worktree-cleanup.md): run `local-worktree-cleanup.mjs complete` for integrated work or exact `discard --confirm-closed-unmerged` for explicitly rejected work. Both run from primary and own registration, disposables, applicable remote authority, and worktree/ref removal; never delete those ad hoc or bypass blockers.
