## MODIFIED Requirements

### Requirement: Documentation-only changes merge on their own
Repository automation SHALL arrange automatic squash integration only when every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is exactly the root `README.md`. It MAY arm an eligible pull request while required validation is pending because protected `develop` remains the merge gate. After successful validation for the current head, automation SHALL reconcile that head when GitHub reports `clean` or positively mergeable `unstable` state through a normal protected squash-merge request enforcing that expected head SHA. A specifically recognized unstable-status rejection when arming SHALL be handled by bounded re-evaluation or an explicit deferred outcome, not by creating another failed check solely for that state transition.

An eligible pull request SHALL pass documentation-sensitive governance and, when OpenSpec is touched, strict OpenSpec validation. A pull request containing any other path SHALL remain open for local maintainer validation and manual merge, including behavior-preserving refactors and mixed documentation-plus-code changes. CI success SHALL NOT substitute for local maintainer acceptance of code. Failed validation or successful validation for an older head SHALL NOT authorize direct integration. State recovery SHALL NOT change required checks, grant bypass authority, or turn unrelated API failures into success.

#### Scenario: Complete diff is auto-merge eligible
- **WHEN** every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is the root `README.md`
- **THEN** automation SHALL arrange squash integration behind the required validation gate

#### Scenario: Maintained docs change is validated
- **WHEN** an eligible pull request changes a path under `docs/**`
- **THEN** CI SHALL run documentation-sensitive governance before the required validation gate succeeds

#### Scenario: OpenSpec change is validated
- **WHEN** an eligible pull request changes a path under `openspec/**`
- **THEN** CI SHALL run strict OpenSpec validation before the required validation gate succeeds

#### Scenario: Eligible pull request is still validating
- **WHEN** an eligible current head is blocked only because required validation is pending
- **THEN** automation MAY arm squash auto-merge and SHALL rely on protected `develop` to prevent premature integration

#### Scenario: Eligible pull request is already clean
- **WHEN** successful required validation belongs to the current head and GitHub already reports that head clean
- **THEN** automation SHALL reconcile squash integration using that exact head SHA

#### Scenario: Successful validation belongs to an older head
- **WHEN** the pull request head differs from the head that passed required validation
- **THEN** automation SHALL NOT directly merge the current head

#### Scenario: Behavior-preserving code changed
- **WHEN** a pull request contains any changed or renamed-from path outside the auto-merge allowlist
- **THEN** it SHALL NOT be armed to merge automatically even if behavior is intended to remain unchanged
- **AND** it SHALL wait for local maintainer acceptance and manual merge

#### Scenario: Documentation and code are mixed
- **WHEN** a pull request contains both an allowed documentation path and a path outside the allowlist
- **THEN** the entire pull request SHALL follow the manual code path

#### Scenario: Validation passes while the policy check is unstable
- **WHEN** an eligible current head passes required validation while a pending or failed non-required check leaves GitHub reporting a positively mergeable unstable head
- **THEN** automation SHALL attempt normal protected squash integration with the validated head SHA
- **AND** a failed attempt to arm auto-merge SHALL NOT be a prerequisite to that attempt

#### Scenario: Arming reports an unstable-state transition
- **WHEN** GitHub specifically rejects arming because the pull request is in unstable status
- **THEN** automation SHALL refresh state and re-evaluate its eligibility and current-head validation within a bounded recovery attempt
- **AND** if safe integration cannot yet be established it SHALL report deferral without claiming the pull request merged or that required validation passed

#### Scenario: Real validation or API failure remains visible
- **WHEN** required validation fails or the automation encounters an authentication, permission, transport, malformed-response, or unrelated API error
- **THEN** that failure SHALL remain visible and SHALL NOT be reclassified as a successful unstable-state recovery
