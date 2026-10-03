## 1. Define deterministic release-note classification

- [x] 1.1 Refactor release-note title classification so explicit breaking changes remain visible, historical Pi upgrade chores remain `Changed`, ordinary non-breaking chores and generated regression-triage titles are omitted, and an all-filtered range reports no user-facing changes.
- [x] 1.2 Add focused release-note fixtures for scoped and unscoped chores, breaking chores, historical/new Pi upgrades, historical/new regression titles, ordinary fixes, ordering, escaping, and empty-user-impact fallback.

## 2. Align generated proposal titles

- [x] 2.1 Change newly generated regression-triage pull-request titles from `fix(regression)` to `chore(regression)` while preserving branch/change identity, provenance, refresh behavior, and validation selection; update focused triage fixtures.
- [x] 2.2 Change Pi sync pull-request titles from `chore(pi)` to `upgrade(pi)` while preserving generated commit and branch identity, ownership checks, refresh behavior, and human review; update focused workflow fixtures and applicable title normalization.

## 3. Reconcile specification and operator guidance

- [x] 3.1 Update release documentation to describe the user-facing title policy, the regression retitle path when investigation proves a product defect, Pi upgrade grouping, breaking precedence, and the maintainer's unchanged draft-edit authority.
- [x] 3.2 Run focused release-note, regression-triage, Pi-sync workflow, release-command, documentation, and strict OpenSpec validation; disposition any known gaps before finalization and leave required exact-head CI as the handoff gate.
