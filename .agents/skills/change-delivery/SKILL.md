---
name: change-delivery
description: Policy for repository change delivery.
---

# Change delivery

Use the owning procedure for the operation; do not reconstruct it from duplicated summaries:

| Operation | Procedure owner |
| --- | --- |
| Planning, approval, implementation, validation, finalization, merge, handoff | [Delivery runbook](../../../docs/openspec-archive-automation.md) |
| Creating, resuming, or switching worktrees; runtime adapters | [Worktree protocol](../../../docs/architecture/project-structure.md#development-worktrees) |
| Cleanup, export decisions, process stops, ownership recovery | [Local cleanup](../../../docs/local-worktree-cleanup.md) |

## Working checklist

1. Keep primary on `develop`. Sweep once at session start and relay its result lines, then use the shared Worktrees guidance in `AGENTS.md`. A1 owns attachment verification; do not add an inventory approval gate. Blocked cleanup does not block a separate delivery.
2. Start a planning-only draft PR. After explicit approval and an implementation request, continue in that same worktree, branch, history, and PR. One clear instruction can supply both authorization requirements for an already presented plan; ask only about a genuinely missing decision.
3. Keep progress truthful. Check each delivered Implementation outcome promptly; before the final item, finish tasks/gaps, add Acceptance, reconcile/push current `origin/develop`, and check the final body. Trusted automation owns readiness, finalization, and CI; agents never mark implementation PRs ready.
4. Use the runbook's bounded validation and handoff procedure. Keep scratch secret-free in the owning worktree's ignored `.artifacts/`. Follow `AGENTS.md` for attribution and user-command formatting.
5. Use integrated primary-checkout cleanup tooling for worktrees and branches; from an attached A1 session, finish a merged task with `a1 worktree complete`, never direct cleanup of the attached checkout. Follow the cleanup runbook for a named export decision; a generic cleanup request does not authorize deleting unknown user files.

## Authority boundaries

Implementation approval is not merge permission. Only an explicit current exact-candidate request permits the protected agent-merge route, with fresh finalized-head, current-target, required-CI, mergeability, and authorized-human checks. Never wait, retry later, arm auto-merge, use a queue or automation identity, or bypass protection.

Protect uncommitted/unpublished work, other owners, primary/current checkouts, external link targets, and unverifiable identities. Respect locks and reported blockers. Do not substitute force removal or improvised worktree deletion. Detailed exceptions, confirmations, and recovery steps belong in the procedure owners above.
