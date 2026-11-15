## ADDED Requirements

### Requirement: Published installer smoke replacement budget

The published-installer smoke harness SHALL allow the Windows published-predecessor update command a budget longer than the published updater's own protected-replacement deadline, so the updater can settle or report its own timeout before the harness intervenes. Other platforms and all other smoke stages SHALL keep their existing budgets. A longer budget SHALL NOT relax any smoke assertion or promotion gate.

#### Scenario: Windows predecessor update runs long

- **WHEN** the Windows published-predecessor update has not finished after the budget used on other platforms
- **THEN** the harness SHALL keep waiting until the Windows budget, which exceeds the updater's protected-replacement deadline
- **AND** an update that still has not settled by that budget SHALL fail the stage and keep promotion blocked

#### Scenario: Other platforms and stages keep their budget

- **WHEN** the smoke runs a stage other than the Windows predecessor update
- **THEN** that command SHALL keep its existing budget

### Requirement: Published installer smoke stall evidence

When a published-installer smoke stage fails, the harness SHALL record in its failure evidence the fixture-owned process inventory captured before settlement, bounded sanitized tails of the fixture's update journal and recovery-capsule records with their sizes and modification times, and the identities, sizes, and modification times of the newest fixture npm logs. Success and failure evidence SHALL record the duration of each smoke stage. Evidence collection SHALL remain fixture-scoped and bounded, SHALL NOT disclose credentials, and SHALL redact only credential-like environment values of at least eight characters.

#### Scenario: Predecessor update times out

- **WHEN** the published-predecessor update exceeds its budget
- **THEN** the evidence SHALL list the fixture-owned processes that were alive before they were stopped, with sanitized arguments
- **AND** the evidence SHALL include the update journal and any recovery-capsule owner, result, or cancellation records present in the fixture
- **AND** the evidence SHALL identify the newest fixture npm logs by name, size, and modification time

#### Scenario: Process inventory is unavailable

- **WHEN** fixture-owned process inspection fails during evidence collection
- **THEN** the evidence SHALL record that inventory error and the primary stage failure SHALL remain authoritative

#### Scenario: A short environment value matches a credential-like key

- **WHEN** an environment variable under a credential-like key holds a value shorter than eight characters
- **THEN** evidence text equal to that value SHALL remain readable while longer credential values are still redacted
