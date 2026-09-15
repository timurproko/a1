## Authorization

The maintainer approved the combined plan and explicitly requested implementation in this same draft PR on 2026-09-15. Planning approval is not final implementation acceptance or merge authorization.

## Implemented scope

- Added an immutable-base acceptance route classifier that fetches complete live PR metadata and file pages before dependency installation, selecting only one newly added canonical acceptance record.
- Added an acceptance-specific aggregate mode that requires the exact current head, successful trusted acceptance validation, a no-blocker acceptance disposition, and skipped generic lanes.
- Preserved the normal impact-selected route for every non-acceptance candidate and as the fallback when trusted route data is unavailable.
- Added bounded-concurrent acceptance evidence verification and request-scoped archive authority GET deduplication while retaining a fresh final target read and expected-head protected squash merge.
- Clarified automatic archive pending, regeneration, authority-drift, mergeability, integration, and native-pre-arming semantics in workflow summaries and runbooks.

## Local validation

All commands ran from `D:/Git/a1/.worktrees/optimize-acceptance-pr-validation` on the implementation worktree.

- `npm run typecheck`: passed.
- Focused repository-governance suite covering acceptance routing/authority, aggregate validation, documentation routing, archive publication/authority/integration, workflow inventory, and delivery/runbook contracts: **301 tests passed across 16 files**.
- `openspec validate --all --strict --no-interactive`: **36 items passed, 0 failed**, including this change.
- `node scripts/governance/check-docs-governance.mjs`: passed with **75 inventoried legacy occurrences** matching.
- `npm run check:code-documentation:changed`: passed with no violations.
- `git diff --check`: passed.

## Limitations and live evidence still required

- No local product, Full regression, release, UI, or physical desktop suite was run; this governance-only implementation does not change product behavior.
- Unit and workflow-fixture success does not establish the live lifecycle. Normal ready-PR CI must still pass on the final implementation head.
- After implementation integration, the generated acceptance PR must demonstrate that generic impact installation and documentation/all-spec validation are skipped while trusted acceptance validation and `Development validation required` pass.
- After authorized manual acceptance merge, the generated archive PR must demonstrate current-head validation, automatic expected-head protected squash integration without maintainer archive merge or native pre-arming, exact-base enforcement, and branch cleanup.
- GitHub runner queue latency is external and is recorded separately from controllable job/reconciliation execution time.
