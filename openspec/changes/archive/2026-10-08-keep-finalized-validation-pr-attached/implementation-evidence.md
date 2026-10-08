# Implementation evidence

## Exact-head publication and policy

- `openspec-finalization-publication.test.ts` exercises first finalization, normalization of an existing unbound finalized body, same-path re-finalization, target reconciliation, body/head/lease races, idempotent termination, and failure paths. All 9 cases pass.
- Metadata, readiness, open-candidate delivery, workflow-shape, and delivery-guidance suites pass together: 100 tests across 5 files.
- Compatibility, acceptance-layout, documentation lifecycle/auto-merge, archive-workflow, and regression-report suites pass: 179 tests across 6 files.
- Previously resource-contended naming, startup-descriptor, terminal-architecture, and impact-selection suites pass independently: 63 tests across 4 files.

## Repository gates

- Typechecking passes for application and binary TypeScript projects.
- The production build passes.
- Architecture, product identity, package identity, pinned Pi source-ledger, and terminal-host provenance checks pass.
- `openspec validate keep-finalized-validation-pr-attached --strict` passes.
- `git diff --check` passes.

## Environment observation

A broad parallel repository-governance run passed 1,476 tests before unrelated local fixture/resource failures. Independent reruns cleared the timeout and missing-build failures. The unchanged `local-cleanup.test.ts` still reports `unsupported-origin` in its standalone-documentation fixture in this checkout; its 105 other cleanup cases pass, including all version-3 cleanup-evidence cases. No local-cleanup source or policy is changed by this delivery, and required CI remains authoritative for that existing environment-specific fixture.
