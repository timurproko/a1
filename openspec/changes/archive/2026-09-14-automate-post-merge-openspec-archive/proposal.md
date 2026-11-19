## Why

Planning PRs merge before implementation proves the plan, so rejected or revised ideas already live on `develop` and require reconciliation. Completed implementations then leave another manual chore: synchronizing and archiving their OpenSpec changes.

## What Changes

- Replace the mandatory planning-merge-first split with one draft PR per new change: propose, obtain explicit approval to implement, and refine the plan and implementation in the same worktree, branch, history, and PR. Planning approval is not a merge or implementation acceptance.
- Keep the plan and related docs off `develop` until the maintainer accepts and manually merges the completed implementation. Rejecting the whole unmerged change means closing its PR, not reconciling or archiving it as completed on `develop`.
- Exclude implementation-bound plans from documentation auto-merge even while their diff is OpenSpec-only or they are accidentally marked ready. Ordinary standalone docs and generated archive PRs retain their existing auto-merge behavior.
- Automatically reconcile the PR's explicitly linked OpenSpec change after its accepted implementation merges into `develop`; retain scheduled recovery and manual dry-run/retry through the same script. No separate pending docs PR or PR-dependency merge chain is needed.
- Record a machine-readable change link and exact-head maintainer acceptance during the normal implementation handoff, before merge. No separate archive request is needed for eligible completed changes.
- Check implementation merge identity, current-head required CI, acceptance, artifacts, and implementation/manual-review task completion. Never infer acceptance from CI, a title, or the merge alone.
- Stage conservative delta synchronization and archival in an isolated checkout, validate the complete result, and publish one OpenSpec-only archive PR per change. Reuse existing documentation auto-merge behind protected-branch validation.
- Make retries, duplicate events, older eligible changes, and concurrent archives safe. Report missing evidence, unfinished tasks, ambiguous synchronization, collisions, and missing credentials without inventing completion or modifying unrelated changes.
- Keep known-gap archival an explicitly authorized manual exception. Do not bulk-archive the existing backlog or alter code-PR acceptance/merge policy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Replace separate planning/implementation delivery with approval in one draft PR; define rejection/refinement handling, implementation-bound auto-merge exclusions, recorded acceptance, and automatic archive eligibility and recovery.
- `github-repository-governance`: Extend documentation auto-merge with the implementation-bound hold; define trusted post-merge archival, real bot-PR validation, safe publication, and live lifecycle evidence.

## Impact

- Planned implementation: update the existing documentation auto-merge policy, add one Node archive orchestrator under `scripts/governance/` and one workflow under `.github/workflows/`, and update focused governance tests, the reviewed workflow inventory, `openspec/config.yaml`, and repository-owned delivery guidance.
- Reuse the existing OpenSpec CLI for parsing/validation/archive operations and existing documentation auto-merge and merged-branch cleanup owners. Do not introduce an LLM service, database, independent merge engine, or general-purpose workflow framework.
- Provision a narrowly scoped GitHub App for archive branch/PR publication so GitHub triggers ordinary PR validation; missing setup blocks publication. No ruleset bypass, privileged PR-head execution, or fallback that silently suppresses CI.
- Machine-readable metadata belongs in implementation PR descriptions and maintainer acceptance comments; generated `acceptance.md` preserves exact source evidence with the archived change.
- This revision contains planning artifacts only and does not activate the new policy. It follows the currently active standalone-specification-revision rules. Existing implementation PR #376 targets the older plan and needs separately authorized reconciliation after this revision is accepted; this update does not modify or replace that PR.
- Activate the single-PR process only after its workflow policy and repository-owned guidance integrate. Existing merged plans remain historical facts and can be completed through their current implementation PRs with explicit evidence; do not rewrite history or automatically abandon/archive the backlog. GitHub App provisioning remains separately authorized.
