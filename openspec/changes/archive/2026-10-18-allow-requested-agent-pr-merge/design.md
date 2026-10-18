## Context

See `proposal.md` for motivation. The repository already finalizes version-3 candidates, binds their acceptance lists to an exact head, requires an up-to-date `develop`, and protects integration with `Development validation required`. The active `gh` credential in an interactive maintainer session is a human account with repository authority, and GitHub's protected merge API supports an expected head SHA. Current agent guidance nevertheless forbids every implementation merge.

GitHub records a direct API/CLI merge under the authenticated human account but does not record whether that account clicked the web UI or explicitly delegated the command to an interactive agent. The operational authorization therefore lives in the maintainer's current-session instruction; durable post-merge verification continues to prove the authenticated human actor, permission, exact source head, successful required check, merge event, commit, and target ancestry.

## Goals / Non-Goals

**Goals:**

- Let the maintainer say “merge this PR” after a candidate is currently ready and have the active agent complete the protected squash merge.
- Bind the instruction to one observed PR and head, and re-read all mutable merge gates immediately before mutation.
- Preserve existing finalization, exact-head CI, branch protection, acceptance-manifest, provenance, archive, and cleanup guarantees.
- Make the permission visible in always-loaded agent context and test the required refusal boundaries.

**Non-Goals:**

- Standing permission to merge future candidates, waiting for pending CI, or arming auto-merge on the maintainer's behalf.
- Allowing an agent to decide acceptance without a new explicit merge instruction.
- Using an App, bot, workflow token, merge queue, administrator bypass, or force operation.
- Changing documentation/release automation or legacy acceptance routes.
- Retrofitting GitHub with proof of the chat instruction.

## Decisions

### 1. Treat an explicit current-session merge instruction as the maintainer decision

The agent may integrate only after the authorized maintainer explicitly asks it to merge the uniquely identified current candidate. A same-session phrase such as “merge it” is sufficient only when the conversation has one unambiguous handed-off PR and head. General implementation approval, a previous request for another head, green CI, or a standing preference is insufficient.

This preserves a human acceptance decision while delegating only the mechanical merge invocation. Allowing the agent to infer consent from successful checks was rejected because CI cannot accept behavior. Requiring the maintainer to operate GitHub personally was rejected because it is the unnecessary handoff this change removes.

### 2. Re-read and bind every mutable gate immediately before merge

Before mutation, the agent will fetch authoritative PR state and require:

- the requested PR is open, non-draft, same-repository, and targets `develop`;
- the current head is the exact head covered by the maintainer's instruction;
- the candidate is positively mergeable, current with `develop`, and not conflicted or blocked;
- `Development validation required` succeeded for that exact head;
- a version-3 candidate's body and finalization fence bind the same finalized head; and
- the active GitHub principal is an authorized human `User`, not an App or bot.

The merge will be a normal protected squash merge with expected-head enforcement, equivalent to `gh pr merge --squash --match-head-commit <sha>`. The agent will not use an administrative bypass. If any read is unavailable or any condition fails, it reports the blocker without waiting, watching, arming auto-merge, or retrying after a candidate change.

Relying only on a stale handoff report was rejected because the base, body, checks, or head can change. Adding a new privileged workflow was rejected because existing branch protection and the authenticated maintainer route are sufficient and safer.

### 3. Keep existing post-merge provenance and acceptance verification

A delegated CLI/API merge is recorded by GitHub as a direct merge by the authenticated authorized human. Existing shared verification can therefore continue to require the exact source head, human account and permission, non-App merge event, required check, merge commit/time, and `develop` ancestry. The pre-merge instruction changes agent authorization policy; it does not weaken or synthesize GitHub provenance.

The maintainer's explicit instruction accepts the plain scenarios for that exact candidate. Post-merge readers need no chat-log dependency and continue to fail closed when GitHub evidence is absent or contradictory. Persisting a bot-authored “authorization” comment was rejected because it would not prove the maintainer instruction and would add editable lifecycle state.

### 4. Separate requested direct merge from auto-merge

The agent may execute only an immediate merge of a currently eligible head. It may not translate “merge when ready” into native auto-merge, poll pending checks, or retain authority for a later head. Human-enabled native auto-merge remains available only when the maintainer personally arms it under the existing route.

This keeps the authorization short-lived and observable. Treating a request as an unattended future arm was rejected because a later base, body, or head could differ from what the maintainer selected.

### 5. Bootstrap under the old policy

This PR changes the rule that currently forbids agent integration. It must therefore be manually merged by the maintainer (or personally armed under the already-deployed human auto-merge route). Agent-requested direct merging may be exercised only by a later candidate after this policy reaches `develop`.

## Risks / Trade-offs

- **[GitHub cannot prove the conversational instruction]** → Keep the instruction as an interactive agent authorization boundary and retain immutable human-account merge provenance, exact-head CI, and branch protection as durable evidence.
- **[“Merge it” is ambiguous]** → Permit shorthand only with one clearly identified handed-off PR/head; otherwise require clarification.
- **[State changes between review and mutation]** → Refresh immediately and use expected-head merge enforcement; any mismatch cancels authority.
- **[A human credential is unavailable or belongs to automation]** → Refuse rather than falling back to an App, bot, workflow, or bypass route.
- **[The agent waits and merges a later state]** → Forbid polling, auto-merge arming, and standing requests; require the candidate to be mergeable at invocation time.

## Migration Plan

1. Update canonical policy, always-loaded guidance, runbook wording, and focused governance assertions in the same implementation-bound PR.
2. Have the maintainer integrate this bootstrap PR under the currently deployed rule.
3. On a later finalized green candidate, issue an explicit merge request and confirm the agent performs an expected-head protected squash merge and post-merge verification.
4. Roll back by restoring the maintainer-personal integration wording. Previously integrated candidates remain verifiable because their GitHub provenance is unchanged.
