## Why

Accepted implementation PRs merge while their OpenSpec changes remain active because archiving requires another remembered handoff. Recent merged changes still contain unchecked acceptance/administrative tasks, and the exceptional history archive (#358) shows why merge status alone cannot justify claiming completion or synchronizing contradictory specifications.

## What Changes

- Automatically reconcile explicitly linked OpenSpec changes after accepted implementation PRs merge into `develop`; add scheduled catch-up and manual dry-run/retry through the same script.
- Record a machine-readable change link and exact-head maintainer acceptance during the normal implementation handoff, before merge. No separate archive request is needed for eligible completed changes.
- Check implementation merge identity, current-head required CI, acceptance, artifacts, and implementation/manual-review task completion. Never infer acceptance from CI, a title, or the merge alone.
- Stage conservative delta synchronization and archival in an isolated checkout, validate the complete result, and publish one OpenSpec-only archive PR per change. Reuse existing documentation auto-merge behind protected-branch validation.
- Make retries, duplicate events, older eligible changes, and concurrent archives safe. Report missing evidence, unfinished tasks, ambiguous synchronization, collisions, and missing credentials without inventing completion or modifying unrelated changes.
- Keep known-gap archival an explicitly authorized manual exception. Do not bulk-archive the existing backlog or alter code-PR acceptance/merge policy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Define implementation-to-change linkage, recorded acceptance, automatic archive eligibility, conservative synchronization, task accounting, and catch-up/blocker behavior.
- `github-repository-governance`: Define trusted post-merge archive orchestration, bot-created PR validation, idempotent publication, restricted mutation scope, and live lifecycle evidence.

## Impact

- Planned implementation: one Node orchestration script under `scripts/governance/`, one workflow under `.github/workflows/`, focused governance tests, and updates to the reviewed workflow inventory and delivery guidance.
- Reuse the existing OpenSpec CLI for parsing/validation/archive operations and existing documentation auto-merge and merged-branch cleanup owners. Do not introduce an LLM service, database, independent merge engine, or general-purpose workflow framework.
- Provision a narrowly scoped GitHub App for archive branch/PR publication so GitHub triggers ordinary PR validation; missing setup blocks publication. No ruleset bypass, privileged PR-head execution, or fallback that silently suppresses CI.
- Machine-readable metadata belongs in implementation PR descriptions and maintainer acceptance comments; generated `acceptance.md` preserves exact source evidence with the archived change.
- This delivery contains planning artifacts only. Workflow/script implementation and credential provisioning require the separately authorized implementation stream after this specification merges. No runnable product behavior changes here.
