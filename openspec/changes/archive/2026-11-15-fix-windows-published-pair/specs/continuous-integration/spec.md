## ADDED Requirements

### Requirement: Published installer smoke process settlement

The published-installer smoke harness SHALL settle its fixture-owned process descendants before deleting the fixture after command timeout or failure. Native Windows coverage SHALL include public command-shim execution and detached replacement ownership. Process cleanup SHALL be bounded and SHALL NOT stop unrelated processes. Real published predecessor replacement, exact candidate assertions, and promotion eligibility SHALL remain unchanged.

#### Scenario: Windows predecessor update times out

- **WHEN** the Windows published-predecessor update exceeds its command deadline
- **THEN** the harness SHALL report the update-predecessor stage and timeout as the primary failure
- **AND** fixture-owned descendants SHALL be settled before fixture deletion is attempted
- **AND** the smoke SHALL remain unsuccessful and promotion SHALL remain blocked

### Requirement: Published installer smoke failure precedence

The smoke harness SHALL preserve its primary failure when fixture cleanup also fails. A cleanup-only failure SHALL produce an unsuccessful evidence outcome. The harness SHALL emit bounded sanitized Actions failure annotations naming the failing stage and available primary child failure, with cleanup failure distinguished as secondary when applicable. Evidence collection SHALL remain fixture-scoped and SHALL NOT disclose credentials.

#### Scenario: Cleanup fails after an update failure

- **WHEN** predecessor update fails and fixture deletion also reports a sharing violation
- **THEN** the original update failure SHALL remain the primary error in evidence and the job diagnostic
- **AND** the cleanup problem SHALL be reported separately without replacing that error

#### Scenario: Cleanup fails after smoke assertions succeed

- **WHEN** every smoke assertion succeeds but owned process settlement or fixture removal fails
- **THEN** the harness SHALL report an unsuccessful cleanup outcome and a nonzero exit

#### Scenario: Publication client reads smoke diagnostics

- **WHEN** a published-pair smoke fails in GitHub Actions
- **THEN** the job SHALL expose a bounded sanitized failure annotation identifying its smoke stage and available primary child failure
- **AND** the local publication summary SHALL be able to show that annotation without manually downloading artifact archives
