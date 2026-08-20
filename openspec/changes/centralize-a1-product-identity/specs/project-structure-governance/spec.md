## ADDED Requirements

### Requirement: Live repository surfaces use centralized A1 identity
Production source, scripts, workflows, current tests and fixtures, current documentation, main specifications, and non-archived changes SHALL use the A1 product-identity authority for executable identity values and SHALL NOT define former product identity literals independently. Repository validation SHALL fail on an unapproved legacy occurrence or an identity-bearing literal outside the declared authority and its explicit boundary tests.

#### Scenario: Feature adds a branded diagnostic
- **WHEN** a feature needs to display the product name
- **THEN** it SHALL obtain `A1` from the product-identity authority rather than embedding a local display-name string

#### Scenario: Script needs package or command metadata
- **WHEN** a build, release, or governance script needs the current command or package name
- **THEN** it SHALL read or derive the value from the authoritative product identity or package manifest and SHALL NOT maintain a divergent copy

#### Scenario: Legacy name is reintroduced
- **WHEN** a live repository surface introduces a former product identity literal outside an approved historical or rejection/deprecation exception
- **THEN** the non-desktop repository gates SHALL fail with the file and legacy occurrence

#### Scenario: Archived record contains the old identity
- **WHEN** an archived change or immutable historical evidence contains a factually correct legacy identity
- **THEN** governance SHALL preserve and allow that record while proving no live runtime or generation path consumes it as current identity
