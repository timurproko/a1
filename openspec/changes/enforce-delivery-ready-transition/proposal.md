## Why

The repository documents implementation checklists and ready-for-review behavior, but that contract is routed through an optional skill and can be missed by an implementation agent. A completed feature can therefore remain a draft with every PR-body task unchecked, which suppresses the CI that should validate the completed candidate.

## What Changes

- Put the implementation-progress and ready-transition contract in always-loaded repository agent context, while retaining the detailed delivery skill and runbook.
- Require agents to update completed `## Implementation` items while the PR remains draft instead of postponing PR-body bookkeeping until handoff.
- Make completion one uninterrupted closeout: after the final implementation outcome and pre-ready evidence are complete, add the plain acceptance list, reconcile and push the branch, check the final item, mark the PR ready, and verify the draft transition before reporting completion.
- Add a trusted fallback that promotes an exact, fully complete version-3 task-list draft when an agent updated all required state but omitted the ready-for-review mutation.
- Keep incomplete, malformed, historical plain-list, unrelated, forked, stale, or raced candidates draft and preserve maintainer-only integration authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Implementation agents receive an always-loaded progress/closeout contract, and completed task-list drafts reliably advance to ready-for-review CI without weakening finalization or acceptance safeguards.

## Impact

The change affects root agent context, the change-delivery skill and runbook, trusted OpenSpec finalization/readiness automation, workflow permissions and summaries, and focused repository-governance tests. It does not infer task completion, check tasks on an agent's behalf, run Development suites for incomplete drafts, accept behavior, enable auto-merge, or merge a pull request.
