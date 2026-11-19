## Why

Delivery of changes moved to the shared workflow in `timurproko/MyWorkflows`, but the governance and validation specs still specify what that workflow owns, how agents must behave while delivering, finished one-time procedures, and statements the code has since superseded. Specs are read by agents as the current state of this repository, so each stale requirement misleads the next change.

## What Changes

- Remove requirements that restate the shared workflow (rulesets, the delivery check, promotion, finalization, branch deletion) or prescribe agent conduct and instruction-file text.
- Rewrite the CI-side requirements this repository implements to what `ci.yml` and its scripts do: draft and pre-finalization deferral, the single required check, nightly regression triage, and release reopening preparation.
- Correct statements the code contradicts: startup-budget enforcement per channel, five Windows shards, conservative selection, three integration cadences, the predecessor shard's own installation, the non-existent `delivery` scope, and reopening auto-merge.
- Remove finished one-time procedures and acceptance or phase language.
- No code, workflow, configuration, or documentation changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: readiness, required check, triage, reopening, selection, cadence, shard, and startup-enforcement requirements corrected; delivery and conduct requirements removed.
- `github-repository-governance`: ruleset, live-acceptance, and delivery-delegation requirements removed; policy application and workflow-inventory requirements corrected.
- `isolated-regression-testing`: startup, predecessor, preview-trigger, and scope contradictions corrected; finished recovery and acceptance requirements removed.
- `project-structure-governance`: detached-worktree and OpenSpec hold procedures removed; preflight step list corrected.
- `session-worktree-recovery`: instruction-file requirement removed; runtime-shutdown claim release kept as its own requirement.

## Impact

Only `openspec/specs/` once the deltas are applied. `validation-efficiency` and `windows-filesystem-hygiene` were audited and need no requirement change.
