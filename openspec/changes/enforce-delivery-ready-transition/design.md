## Context

See `proposal.md` for motivation. Version-3 delivery already uses PR-body task items and rejects incomplete checklists during finalization. The missing behavior is operational: the detailed rule lives in a selectively loaded skill, an agent can finish code without updating the PR body, and nothing ensures that a fully prepared draft transitions to ready so CI can start.

Drafts deliberately run no Development suites. Ready version-3 PRs deliberately defer those suites until trusted finalization archives the active change and binds the finalized head. The repair must therefore advance only genuinely complete pre-ready candidates and must not reinterpret readiness as acceptance or integration authority.

## Goals / Non-Goals

**Goals:**
- Make progress and closeout rules visible to every repository implementation agent without relying on skill routing.
- Update PR-body implementation progress during the draft implementation, not after handoff.
- Make checking the final item, adding acceptance, pushing, and marking ready one mandatory closeout operation.
- Recover safely when an agent completed every authoritative pre-ready input but forgot only the ready mutation.
- Preserve draft CI suppression for incomplete work and all existing finalization and maintainer-integration safeguards.

**Non-Goals:**
- Inferring that code, evidence, or a task is complete from commits or CI checks.
- Automatically checking an unchecked item or rewriting approved item wording.
- Treating GitHub check counts as implementation task progress.
- Running Development validation on incomplete drafts.
- Accepting behavior, enabling auto-merge, or merging implementation PRs.
- Retrofitting merged historical bodies or automatically converting historical plain Implementation bullets.

## Decisions

### Put the closeout contract in always-loaded agent context

The root context used by repository coding agents will carry a concise mandatory rule: implementation-bound work loads the detailed delivery skill, keeps the PR draft while work is incomplete, updates each exact marker as soon as its outcome and pre-ready evidence are complete, and may not report implementation complete while an eligible PR remains draft. The final item is checked only after the plain acceptance list and every other pre-ready input are ready; the same agent turn then reconciles and pushes the branch, marks the PR ready, and confirms the remote state.

The detailed skill, OpenSpec configuration, and runbook remain authoritative for edge cases. Focused tests will keep the always-loaded wording aligned with them. This avoids copying the entire runbook into the system prompt while removing optional skill selection as the only route to the critical transition.

Alternative considered: strengthen only the skill description. This was rejected because the observed failure occurred despite the skill existing and because skill loading remains model-selected. Alternative considered: add a project extension that continues the model at settlement. This was rejected for the first repair because lifecycle heuristics cannot reliably distinguish planning, partial implementation, and a completed feature without duplicating repository/GitHub policy inside the interactive runtime.

### Keep task completion agent-owned

Neither GitHub automation nor a parser will infer completion or turn `[ ]` into `[x]`. The implementation agent owns that mutation after completing the matching approved outcome, focused pre-ready evidence, and detailed task bookkeeping. Item wording and ordering remain immutable outside an approved refinement.

This preserves review meaning: a checked item says the implementing agent completed that scope, not that a workflow guessed from commits or green checks. It also keeps post-ready CI as independent machine evidence rather than a prerequisite hidden inside a draft-only deadlock.

### Make all-checked drafts eligible for trusted promotion

The trusted default-branch finalization entrypoint will inspect associated version-3 drafts on its existing draft-capable pull-request events. It will promote a draft only when all of the following are true for one exact same-repository head/body snapshot:

- the PR targets `develop` and carries one valid version-3 association;
- `Implementation` uses the current task-list form and every distinct item is checked;
- final plain `Acceptance` scenarios are present and valid;
- the active OpenSpec change, detailed tasks, evidence, known-gap disposition, and target relationship satisfy the existing pre-finalization checks; and
- a final re-read still matches the inspected PR identity, head, body, base, and draft state.

The normal ready-for-review event then runs the existing finalization path, whose eventual exact-head body binding starts Development validation. Promotion itself edits no body text, code, task file, evidence, specification, archive, acceptance manifest, auto-merge setting, or branch ref.

This fallback makes the workflow resilient when the agent forgets only `gh pr ready`; the agent remains required to perform and verify the transition directly. A completed candidate therefore normally advances in the implementation turn, while trusted automation closes the single omitted-mutation gap.

Alternative considered: let any all-checked body become ready immediately. This was rejected because body state alone cannot prove detailed tasks, evidence, acceptance, or branch identity. Alternative considered: let CI check the boxes. This was rejected because automation cannot truthfully attest implementation completion.

### Fail closed without creating draft noise

Unchecked, mixed, malformed, duplicated, generic, historical plain-list, unassociated, forked, stale, behind-policy, or otherwise incomplete drafts remain drafts. The workflow summary reports a stable skip/block reason but does not comment repeatedly or run Development suites. Concurrency remains per PR. A changed head or body between inspection and mutation aborts promotion; if GitHub changes immediately after the final re-read, existing ready/finalization validation still fails closed on the changed state and emits no protected aggregate until reconciled.

### Preserve readiness, acceptance, and integration boundaries

Ready-for-review means only that implementation and pre-ready evidence are complete enough to start trusted finalization and exact-head CI. It is not maintainer acceptance. Automation continues never to enable auto-merge or merge implementation PRs. The authorized maintainer retains the only integration decision after finalized exact-head CI succeeds.

## Risks / Trade-offs

- **[Risk] Always-loaded guidance becomes stale** → Add parity tests against the canonical delivery policy and keep the root rule intentionally concise.
- **[Risk] An agent checks items prematurely** → Keep completion agent-owned, require pre-ready evidence and detailed bookkeeping, and retain strict finalization validation.
- **[Risk] Automation promotes a stale snapshot** → Re-read exact head/body/base/draft state immediately before the mutation and rely on existing exact-head finalization/validation after the ready event.
- **[Risk] Draft workflow events create noisy failures** → Report stable skipped/incomplete outcomes in the run summary without comments or Development jobs.
- **[Trade-off] The fallback uses automation for readiness** → Readiness starts validation but grants no acceptance or merge authority; this is preferable to indefinitely suppressing CI for an otherwise complete candidate.

## Migration Plan

1. Add and test the concise always-loaded implementation closeout contract while aligning the skill and runbook.
2. Extend trusted finalization publication policy to inspect draft task-list candidates and perform only the guarded ready mutation.
3. Add fixtures for direct agent closeout, fallback promotion, incomplete/invalid drafts, races, forks, historical bodies, and unrelated PRs.
4. After this change integrates, active implementation branches can reconcile `develop`; their owning agents then update truthful progress and use the same closeout path.
5. Roll back through an ordinary corrective PR by disabling automatic promotion while retaining the explicit agent closeout rule; never rewrite accepted historical bodies.
