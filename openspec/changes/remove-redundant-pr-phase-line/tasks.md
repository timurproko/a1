## 1. Delivery Guidance

- [ ] 1.1 Update `openspec/config.yaml`, the change-delivery skill, and delivery/validation documentation so new version-3 PR bodies begin with `## Proposal` and never instruct agents to add or promote a phase line; verify focused guidance tests assert the phase-free structure and unchanged approval/manual-merge boundaries.
- [ ] 1.2 Update body examples and lifecycle wording without changing draft-to-ready timing, exact-head validation, manual merge, archival, or legacy delivery behavior; verify repository searches find no active authoring instruction for `Phase: Proposal` or `Phase: Implementation` outside historical archives and compatibility fixtures.

## 2. Phase-Free Governance Validation

- [ ] 2.1 Refactor version-3 body parsing and declarations to validate the ordered section layout directly and remove the phase-returning candidate abstraction; verify phase-free finalized bodies pass while malformed ordering, proposal prose, acceptance lists, and automation disclosures still fail closed.
- [ ] 2.2 Restrict support for the former phase-prefixed version-3 layout to read-only verification of already merged deliveries; verify an immutable historical merged body remains verifiable while open candidates and local finalization reject the superseded layout.
- [ ] 2.3 Update finalization, GitHub-reader, and candidate fixtures for the phase-free contract; verify ready, stale, malformed, closed, merged, and invalid-provenance outcomes preserve their current authority boundaries.

## 3. Trusted Bootstrap Policy

- [ ] 3.1 Replace the phase-specific CI policy detector with an explicit phase-free-policy marker and preserve one-time exact-head bootstrap behavior; verify the change candidate can use head policy only while the deployed base lacks that marker and later candidates use base-controlled policy.
- [ ] 3.2 Extend workflow-policy tests to reject a permanent or ambiguous head-policy fallback; verify version-3 candidate validation remains exact-head and fail-closed across the deployment transition.

## 4. Evidence and Handoff

- [ ] 4.1 Run focused governance tests and typechecking for guidance, acceptance-body parsing, finalization, GitHub verification, and workflow policy; record exact commands and outcomes in implementation evidence without running local `test:fast`, `test:full`, or `test:release` absent separate authorization.
- [ ] 4.2 Validate the completed OpenSpec change strictly and prepare one to three behavior-specific acceptance scenarios covering phase-free authoring, strict candidate validation, and historical read-only compatibility; verify the PR list exactly matches the final conditional acceptance manifest.
