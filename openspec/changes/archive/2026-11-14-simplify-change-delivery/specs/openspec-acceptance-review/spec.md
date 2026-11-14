## MODIFIED Requirements

### Requirement: Version-3 acceptance is a plain scenario list in the development PR
A finalized version-3 development PR SHALL display one or more implementation-specific behavior-and-expected-result scenarios under `Acceptance` as plain bullets, not checkboxes. The same ordered scenario text SHALL exist in a committed conditional acceptance manifest within the staged archive. The list SHALL exclude generic process attestations and SHALL be complete enough for the maintainer to understand what their manual merge accepts.

#### Scenario: Acceptance list is valid
- **WHEN** the PR and manifest contain the same one or more concise, distinct, implementation-specific scenarios
- **THEN** candidate validation SHALL accept the list structure without claiming the scenarios passed

#### Scenario: Checkbox state is supplied
- **WHEN** the version-3 acceptance section contains checkboxes or automation-authored pass state
- **THEN** candidate validation SHALL reject the section
- **AND** SHALL direct the author to use plain scenario bullets

#### Scenario: Lists disagree
- **WHEN** PR body scenarios differ from the committed manifest by membership, text, order, or duplication
- **THEN** candidate validation SHALL fail closed and identify the mismatch
