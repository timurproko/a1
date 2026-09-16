## Context

See `proposal.md` for motivation. Version-3 delivery currently treats a quoted first-line phase as both visible guidance and a mechanically validated body field. The same parser serves local finalization, open-candidate CI, and read-only verification of immutable merged deliveries, including the first deployed version-3 record. The CI bootstrap path also detects the deployed policy through a phase-specific source marker.

## Goals / Non-Goals

**Goals:**
- Make `## Proposal` the first visible content in newly authored version-3 PR bodies.
- Preserve every approval, draft/readiness, validation, manual-merge, archival, and cleanup boundary.
- Keep strict body-layout validation and historical read-only verification.
- Bootstrap the changed validator without weakening base-controlled validation after deployment.

**Non-Goals:**
- Inferring implementation authorization solely from GitHub draft status.
- Changing when a PR becomes ready, when CI runs, or who may merge it.
- Reformatting immutable merged PRs or changing version-1/version-2 formats.

## Decisions

### Use sections and repository state instead of a body phase field

New version-3 bodies will begin with `## Proposal` and retain the existing ordered `Proposal`, `Implementation`, optional-until-finalization `Acceptance`, and final collapsed `Automation` sections. Explicit maintainer approval remains the authority to begin implementation; draft/ready status remains the review-state signal. No replacement hidden phase field is needed because the phase line never granted approval or merge authority.

Alternative considered: derive a formal phase only from draft/ready state. This was rejected because implementation can proceed while the PR remains draft, so GitHub state alone is not an authorization record.

### Keep new-candidate validation strict while preserving immutable history

The canonical parser path used by authoring and finalization will reject quoted phase lines and require `## Proposal` as the first nonblank line. Read-only reconciliation of already merged version-3 deliveries will opt into narrowly scoped compatibility for the previously supported `Implementation`/`Acceptance` phase lines. Open candidates will not receive that compatibility path.

Alternative considered: accept an optional phase line everywhere. This would preserve compatibility but fail to enforce the requested phase-free format for new PRs.

### Remove phase-specific candidate logic rather than returning a synthetic phase

Candidate readiness will continue to require a non-draft open PR, finalized metadata, the complete ordered body structure, matching acceptance scenarios, exact-head validation, and authorized manual merge. The phase-returning helper and its `delivery-phase-not-implementation` check will be replaced by direct canonical-layout validation; returning a fabricated `implementation` value would retain a misleading internal abstraction.

### Bootstrap with an explicit phase-free policy marker

The trusted CI bootstrap detector will use a stable marker for the phase-free body policy. This change's finalized PR may validate with its exact head because the deployed base cannot parse the new body contract; after merge, later candidates return to base-controlled policy. Tests will pin both bootstrap selection and the absence of a permanent head-policy fallback.

## Risks / Trade-offs

- **[Risk] Historical version-3 reconciliation breaks when the shared parser becomes phase-free** → Route compatibility only for already merged immutable records and cover the deployed historical layout with focused tests.
- **[Risk] Removing the current source marker accidentally makes every future candidate use head policy** → Replace the bootstrap detector and test its deployed-state transition.
- **[Risk] A draft PR could be mistaken for authorization to implement** → Keep explicit maintainer plan approval mandatory and document that draft/ready state communicates review posture, not implementation authority.
- **[Trade-off] Two version-3 body layouts remain readable** → Restrict the old layout to post-merge verification so authoring and open-candidate validation have one canonical format.

## Migration Plan

1. Update guidance, validator code, declarations, fixtures, and CI bootstrap detection in the same implementation branch.
2. Finalize this PR with the phase-free body and validate it through the one-time exact-head bootstrap path.
3. After authorized manual merge, use the deployed phase-free marker so subsequent candidates validate against base policy.
4. Roll back with an ordinary corrective PR if needed; do not edit immutable merged PR bodies or historical acceptance records.
