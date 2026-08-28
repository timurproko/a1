## ADDED Requirements

### Requirement: Documentation-only changes merge on their own
Repository automation SHALL arrange automatic squash integration only when every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is exactly the root `README.md`. It MAY arm an eligible pull request while required validation is pending because protected `develop` remains the merge gate. If validation finishes before automation can arm the pull request and GitHub already reports it clean, automation MAY merge only when the successful validation belongs to the current head and the merge request enforces that expected head SHA.

An eligible pull request SHALL pass documentation-sensitive governance and, when OpenSpec is touched, strict OpenSpec validation. A pull request containing any other path SHALL remain open for local maintainer validation and manual merge, including behavior-preserving refactors and mixed documentation-plus-code changes. CI success SHALL NOT substitute for local maintainer acceptance of code. Failed validation or successful validation for an older head SHALL NOT authorize direct integration.

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
- **THEN** automation MAY squash-merge using that exact head SHA

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

## REMOVED Requirements

### Requirement: Only OpenSpec and root README changes merge on their own
**Reason**: Maintained files under `docs/**` are documentation-only and now receive the same validated automatic integration path.

**Migration**: Preserve all current-head and manual-code safeguards while replacing the two-surface allowlist with `openspec/**`, `docs/**`, and root `README.md`.
