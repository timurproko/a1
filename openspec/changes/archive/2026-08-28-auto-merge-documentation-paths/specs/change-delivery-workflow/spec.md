## MODIFIED Requirements

### Requirement: Auto-merge eligibility uses an exact documentation allowlist
A pull request SHALL be eligible for automatic squash integration only when every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is exactly the root `README.md`. Any pull request containing another path SHALL be classified as code/operational, regardless of whether it claims to preserve behavior. Classification SHALL examine the complete pull-request diff and SHALL fail closed.

For an eligible pull request, automation MAY arm auto-merge while required validation is pending because protected `develop` remains the merge gate. If the pull request is already clean after validation, automation MAY merge directly only when successful validation belongs to the current head and the merge request enforces that expected head SHA.

#### Scenario: OpenSpec-only pull request
- **WHEN** every changed path is under `openspec/**`
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Maintained documentation-only pull request
- **WHEN** every changed path is under `docs/**`
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Root README-only pull request
- **WHEN** every changed path is exactly `README.md`
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Documentation surfaces are combined
- **WHEN** every changed and renamed-from path is under `openspec/**`, under `docs/**`, or exactly root `README.md`
- **THEN** automation SHALL classify the pull request as documentation-only and arrange squash integration behind its required validation

#### Scenario: Validation and reconciliation race
- **WHEN** an eligible current head becomes clean before auto-merge is armed
- **THEN** automation MAY squash-merge only after matching successful validation and with the expected head SHA

#### Scenario: Stale successful validation
- **WHEN** successful validation belongs to an older pull-request head
- **THEN** automation SHALL NOT directly merge the current head

#### Scenario: Behavior-preserving refactor
- **WHEN** a pull request changes source or any other path outside the allowlist
- **THEN** it SHALL NOT be eligible for auto-merge
- **AND** a claim that behavior is unchanged SHALL NOT alter that classification

#### Scenario: Documentation and code are mixed
- **WHEN** a pull request changes an allowed documentation path and any path outside the allowlist
- **THEN** the entire pull request SHALL be classified as code/operational
- **AND** it SHALL NOT be armed for auto-merge

#### Scenario: Specification and code are mixed
- **WHEN** a pull request changes an OpenSpec path and any path outside the allowlist
- **THEN** the entire pull request SHALL be classified as code/operational
- **AND** it SHALL NOT be armed for auto-merge

#### Scenario: Operational file is renamed into documentation
- **WHEN** a renamed file's previous path is outside the allowlist even though its new path is allowed
- **THEN** the pull request SHALL NOT be eligible for auto-merge

#### Scenario: Changed paths cannot be classified
- **WHEN** the complete pull-request diff cannot be obtained or classified
- **THEN** auto-merge SHALL remain disabled
