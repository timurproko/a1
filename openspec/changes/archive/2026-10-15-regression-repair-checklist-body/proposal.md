## Why

Since trusted readiness promotes only all-checked task-list drafts, the nightly regression triage still opens its repair candidate with a plain-bullet `## Implementation` section that carries the triage key and the run evidence. That body can never become a checklist, so a finished repair stays draft with the stable reason `draft-implementation-progress-legacy-draft` and never reaches finalization or CI unless a maintainer marks it ready by hand; `#768` is the first candidate to stall this way.

## What Changes

- Generate the repair body in the ordinary delivery layout: the proposal, two unchecked implementation outcomes the fixer checks as the work completes, one generated acceptance outcome, and the automation block, which also carries the triage key the next triage matches.
- Move the run evidence out of the body into a triage comment on the candidate, next to the record the change's design already carries; a refresh with the same failed scope set posts another comment and appends to the design and provenance instead of editing the body.
- Keep readiness, finalization, selection, and provenance verification unchanged: a repair whose two outcomes are checked is promoted exactly like any other complete draft, and a human lookalike still gains nothing.
- Say in the delivery guidance and the CI runbook that the generated outcomes are checked, never rewritten, and that the evidence lives in the comment and the design.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: a failed nightly regression proposes its fix as a draft in the ordinary delivery layout whose triage comment and change carry the evidence, so the finished repair advances through the same readiness path as every other draft.

## Impact

The change affects the triage report renderer, the proposal script's open and refresh paths, their declaration file and tests, the delivery context in the OpenSpec configuration, and the CI runbook. It changes no readiness, finalization, selection, or provenance policy and no workflow permissions; the triage workflow already holds the pull-request write permission the comment needs.
