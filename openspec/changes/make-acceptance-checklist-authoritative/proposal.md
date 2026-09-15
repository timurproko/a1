## Why

Acceptance PR #412 demonstrated that a maintainer can check every visible validation item and manually merge while archival still reports `acceptance-incomplete` because hidden machine task states remain pending. The acceptance PR must make the small human checklist and authorized manual merge the actual evidence, rather than requiring maintainers to inspect or edit generated JSON or a copied implementation task ledger.

## What Changes

- Show the original implementation PR as a plain reference, then generate one to three curated implementation-specific acceptance scenarios from the implementation handoff instead of generic review/approval items or every implementation task and automated test.
- Reject duplicate, generic, or exactly reused checklists so repeated acceptance PRs do not train maintainers to click identical boilerplate without reviewing behavior.
- Treat an authorized maintainer's exact all-checked implementation checklist plus manual merge as explicit evidence that the listed human validation was completed.
- Keep automated CI, source identity, changed-file scope, and merge provenance machine-verified; maintainers do not edit JSON or reproduce automated test evidence.
- Reconcile unchecked source task bookkeeping from the verified scenario checklist receipt during archival so stale machine task states do not override the maintainer's acceptance.
- Reject unchecked, missing, reordered, renamed, partially removed, or extra checklist items; reject automatic, bot, unauthorized, stale, or wrong-source merges.
- Support multiple historical acceptance records for one evolving change by selecting the record bound to the exact implementation head, allowing the corrected workflow to recover from merged #412 without deleting history.
- Automatically continue to conservative synchronization and archive publication after the exact checklist is fully checked and manually merged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Make the minimal checked acceptance checklist and authorized manual merge the human acceptance evidence that unlocks automatic archival.
- `github-repository-governance`: Verify the exact final checklist, source/CI identity, manual merge provenance, and per-head historical record selection with trusted policy.

## Impact

- Acceptance body rendering and receipt verification, task reconciliation, record selection, retained archive evidence, status reporting, and focused governance fixtures.
- Repository-owned delivery guidance and archive runbook. No product UI, dependency, timeout, workflow permission, repository setting, or automatic acceptance-merge change.
- Existing generated records remain internal machine bindings and legacy comment-backed receipts remain readable; maintainers are not asked to edit JSON.
