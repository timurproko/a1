## Why

The pull request's draft/ready state and existing body sections already communicate whether delivery is under proposal review or implementation review. Repeating `Phase: Proposal` or `Phase: Implementation` at the top adds visual noise and forces a body-only lifecycle edit without providing useful context.

## What Changes

- Remove the quoted phase line from version-3 OpenSpec pull request descriptions.
- Preserve the existing one-PR planning, approval, implementation, finalization, exact-head validation, manual-merge acceptance, and post-merge archival workflow.
- Keep `Proposal`, `Implementation`, final `Acceptance`, and collapsed `Automation` sections in their current order and retain strict structural validation without requiring phase text.
- Update repository guidance, governance validation, and focused tests to use the phase-free body contract while preserving legacy version-1/version-2 behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Version-3 delivery PR bodies no longer carry a redundant first-line phase label while retaining the same approval and delivery boundaries.
- `github-repository-governance`: Version-3 body validation recognizes the phase-free section structure and continues to fail closed on malformed delivery metadata or layout.

## Impact

Repository workflow guidance, canonical and delta specifications, version-3 PR-body parsing/validation, finalization fixtures, and governance tests are affected. Product runtime behavior, public APIs, dependencies, legacy delivery formats, and merge authority are unchanged.
