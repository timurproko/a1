## MODIFIED Requirements

### Requirement: Repository governance is executable
Architecture, documentation, and hygiene rules SHALL be enforced by deterministic checks that report stable rule identifiers and actionable path, line, and symbol violations where applicable. Checks SHALL cover feature dependency direction, forbidden deep imports, nested package/dependency state, generated artifacts in tracked source, prohibited terminal interception, stale redesign markers in current production documentation, production files with no declared ownership, and the complete first-party code-documentation policy. The code-documentation gate SHALL inspect the complete applicable tracked baseline without a grandfathered count, path allowlist, or accepted-violation snapshot and SHALL run in both fast pull-request validation and full release validation.

One local command, `npm run preflight`, SHALL run the fast governance gates pull-request validation runs, in a fixed order, stopping at the first failure, using the same scripts and rule identifiers as validation: type check, architecture, changed-file code documentation, changed-file naming, strict validation of every active OpenSpec change, the delivery-guidance governance test, and the changed test selection. Preflight SHALL NOT build the native host and SHALL NOT replace validation as the authority.

#### Scenario: New code violates a boundary
- **WHEN** a change introduces a forbidden dependency, unowned source location, nested lockfile, prohibited terminal mechanism, or code-documentation violation
- **THEN** the applicable repository gate SHALL fail with the offending path and stable violated-rule identifier
- **AND** it SHALL report the line and declaration symbol when that information is available

#### Scenario: Documentation policy behavior is changed
- **WHEN** an accepted or rejected documentation form or source classification is added or changed
- **THEN** focused governance tests SHALL prove the policy result with representative valid and invalid fixtures

#### Scenario: Existing violation remains when enforcement is enabled
- **WHEN** the complete applicable first-party baseline contains a code-documentation violation
- **THEN** fast and full validation SHALL fail rather than recording or incrementally grandfathering the violation

#### Scenario: Excluded source is scanned
- **WHEN** the documentation gate encounters synchronized, vendored, generated, build, or runtime source
- **THEN** it SHALL apply the repository's explicit classification and provenance rules instead of treating accidental path omission as an exemption

#### Scenario: Governance passes
- **WHEN** the complete baseline check runs
- **THEN** every production file, test, document, workflow, dependency, and applicable source comment SHALL satisfy its current owner and governance contract
- **AND** all mandatory architecture, documentation, type, unit, integration, update, package, and release checks SHALL pass

#### Scenario: Preflight reproduces a validation failure locally
- **WHEN** a change would fail a fast governance gate in pull-request validation
- **THEN** `npm run preflight` SHALL fail before the push with the same rule identifier and path
- **AND** a change with a green preflight SHALL NOT fail that gate in validation for the same bytes
