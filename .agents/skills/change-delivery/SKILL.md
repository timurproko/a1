---
name: change-delivery
description: Repository delivery policy for OpenSpec planning, explicit implementation approval, same-PR refinements, final handoff, rejected changes, and legacy migration. Load alongside the applicable OpenSpec operation skill.
---

# Change delivery

Resolve links from this skill directory. Read [project workflow](../../../openspec/config.yaml) completely and [delivery and archive handoff](../../../docs/openspec-archive-automation.md) before acting. Preserve the OpenSpec CLI's artifact state, allowed roots, and completion checks; guidance and user approval are not evidence that work is complete.

## New change

1. Create an explicitly addressed isolated worktree from fresh `origin/develop`; keep the primary worktree on `develop`.
2. A planning request authorizes only OpenSpec artifacts. Open one **draft** PR with `openspec-implementation` JSON `{ "version": 2, "change": "the-change" }`. Validate strictly. Do not implement, merge, or synchronize unimplemented deltas merely because the plan or CI is green.
3. After the maintainer approves the plan and explicitly requests implementation, keep the **same worktree, branch, history, and PR**. Record the approval in the handoff; it is not final acceptance. Keep the PR draft during planning and unfinished implementation, not while waiting for CI or maintainer validation.
4. For an approved refinement, update proposal, design, delta specs, and tasks coherently before related implementation edits. Keep related product documentation in that PR. If implementation happened without approval, stop and disclose it.
5. Push the completed implementation and mark the same PR **ready for review before CI**. Let normal `ready_for_review`/`synchronize` events run required PR validation and display progress on the PR. Do not manually dispatch ordinary CI just to keep a completed candidate draft and then duplicate it on readiness. Separately required Full regression/native workflows still run as distinct gates. Read and report CI outcomes without foreground watching; failures block acceptance and unrelated work. Repair routine failed checks in this same worktree, branch, and PR, including narrowly scoped inherited failures, then repush for normal current-head CI. No separate proposal or PR is needed solely for the repair. Preserve tested behavior, assertions, coverage, and required checks; record the cause and validation. Clarify substantive new scope rather than silently absorbing it.
6. After applicable CI passes, hand off for actual maintainer validation using the project manual-test command format. Ready status is not acceptance. Prepare the exact-final-head acceptance comment only from actual reported outcomes using the runbook; then merge implementation manually only with explicit authorization. Never enable code or implementation-bound auto-merge. New candidate commits require current-head CI and renewed acceptance; never fabricate review or auto-check substantive work. Only the two exact optional mechanical archive tasks may remain for their corresponding verified operations.
7. After the accepted implementation merges, let the archive workflow record verified evidence, synchronize canonical specs, and prepare the OpenSpec-only archive PR. That follow-up uses documentation auto-merge after its own required CI. Confirm archive **integration**, not just creation, before eligible owning-agent cleanup of retained task/acceptance worktrees under the existing ownership and cleanliness checks. Do not remove another session's worktree or treat remote-branch deletion as proof that local cleanup is safe.

## Local cleanup handoff

Follow [local cleanup](../../../docs/local-worktree-cleanup.md) when the maintainer has explicitly enabled it. Use only the reviewed tool in the primary/stable checkout for mutation; do not launch a worker from a removable task checkout or silently install a service.

- After the PR identity is known, register only this session's exact task/acceptance/archive checkout with a private owner token. Record the returned ID and generation privately. Registration does not release ownership or authorize acceptance.
- Claim a released registration before resuming work. A dead PID, elapsed time, clean status, or missing remote branch is never permission to take another session's worktree.
- Stop related development processes and leave the worktree before releasing its final HEAD/ref. Release only when this session no longer needs it, and request an enabled bounded `once` pass from the stable checkout. An already running watcher can observe later archive integration independently.
- The reconciler must still verify accepted implementation and automatic archive integration, live topic-ref absence, exact identity, and all local safety gates. Report pending/blocked/partial results honestly; do not force-discard files, bypass stale ownership, or globally prune unrelated registrations.
- If cleanup is disabled, unregistered, or no worker is running, retain the worktree and state the pending local handoff. Enabling or starting a live watcher needs separate authorization, not merely an implementation request.

## Reject, revise, or migrate

- **Rejected new draft:** close without merging. No plan/code from this stream landed on `develop`; no main-branch reconciliation or completed-change archive is needed. Closing does not authorize deleting an unmerged branch or dirty worktree; obtain the separate approvals required by project policy.
- **Already-merged legacy plan:** retain its merged history and existing implementation PR, or create an isolated implementation stream only if none exists and implementation is requested. Preserve version-1 `specificationPr` linkage. Rejection needs explicit reconciliation, not a successful archive.
- **Standalone existing-plan revision:** remain OpenSpec-only unless combined refinement in its existing implementation PR is explicitly authorized. Ordinary docs and genuine archive follow-ups retain automatic integration under the exact allowlist.

The documentation merge owner holds drafts, explicit implementation links, and newly introduced active change directories even when the marker is removed or the plan is marked ready. Do not bypass the hold. After an eligible accepted manual merge, the archive workflow handles synchronization and its separate CI-gated archive PR. Missing evidence, unsupported inputs, or App setup remain blockers; live activation/provisioning require separate authorization.
