# Implementation Evidence

## Delivered behavior

- Newly authored version-3 delivery bodies begin with `## Proposal` and contain no quoted proposal or implementation phase line; approval, draft/readiness, exact-head validation, manual merge, and archival boundaries remain unchanged.
- Open candidates and local finalization require the phase-free layout and retain strict section, proposal, acceptance-list, and automation-disclosure validation.
- Read-only reconciliation of already merged version-3 deliveries narrowly accepts the former `Implementation` or `Acceptance` phase prefix without allowing that format for new open candidates.
- Trusted CI detects the deployed phase-free parser through `PHASE_FREE_VERSION3_BODY_POLICY` so only this bootstrap candidate uses exact-head policy and subsequent candidates return to base-controlled policy.

## Focused validation

- `npm ci --ignore-scripts` — completed; 285 packages installed. npm reported two pre-existing moderate audit findings and no install failure.
- `npx vitest run test/repository-governance/change-delivery-guidance.test.ts test/repository-governance/impact-aware-validation-workflows.test.ts test/repository-governance/openspec-acceptance-checklist.test.ts test/repository-governance/openspec-delivery-finalization.test.ts test/repository-governance/openspec-single-pr-github.test.ts` — passed: 5 files, 46 tests.
- `npm run typecheck` — passed.
- `openspec validate remove-redundant-pr-phase-line --strict` — passed.
- `git diff --check` — passed.
- Repository search confirmed current guidance surfaces no longer author or promote `Phase: Proposal` or `Phase: Implementation`; remaining occurrences before finalization are the active delta's explanatory text, canonical requirements awaiting conservative synchronization, and explicit historical-compatibility fixtures.

## Acceptance scenarios

- New version-3 pull request descriptions begin with `Proposal` and omit proposal/implementation phase banners while preserving the existing delivery workflow.
- Open candidates and local finalization reject the superseded phase-prefixed body while retaining strict structural validation.
- Read-only verification continues to recognize immutable merged version-3 deliveries created with the former phase prefix.

## Known gaps

None.
