## 1. Provenance and selection

- [x] 1.1 Extend trusted triage output with bounded machine-readable failed-Full-regression provenance and preserve it through candidate refresh/finalization.
- [x] 1.2 Extend PR identity parsing with immutable GitHub App author identity and reject incomplete or contradictory metadata.
- [x] 1.3 Restrict PR Full regression selection to App-created nightly-repair candidates carrying valid failed-Full-regression provenance.
- [x] 1.4 Remove release/publishing, shared-support, build/prerequisite, validation-authority, unknown-path, bootstrap, and label selection reasons without changing ordinary Development impact selection.

## 2. Required execution boundaries

- [x] 2.1 Preserve planning-only draft exemption and selected implementation/final-head behavior for eligible generated repairs.
- [x] 2.2 Preserve the shared four-lane complete suite and exact-head selected-result verification in `Development validation required`.
- [x] 2.3 Preserve scheduled/manual Full regression, nightly/stable release coverage, triage eligibility, and non-publication permissions.
- [x] 2.4 Ensure ordinary, docs-only, version-only, and human-authored lookalike PRs record a trusted unselected decision and schedule no complete-regression lanes.

## 3. Policy, tests, and evidence

- [x] 3.1 Update continuous-integration and isolated-regression policy, delivery guidance, validation documentation, and affected governance inventory/pins to state the single eligible PR class.
- [x] 3.2 Add positive fixtures for generated failed-Full-regression repair creation, refresh, implementation, and finalization history.
- [x] 3.3 Add negative fixtures for ordinary release/workflow/config/shared-support changes, labels, unknown paths, human-authored lookalikes, non-Full-regression triage, and malformed/stale provenance.
- [x] 3.4 Run focused selector, triage, workflow, aggregate, documentation, and OpenSpec checks; record results and explicitly disposition known gaps.
- [x] 3.5 Reconcile current `develop`, prepare the candidate for standard finalization, and retain the current base policy's one-time required Full regression if it selects this rollout PR.
