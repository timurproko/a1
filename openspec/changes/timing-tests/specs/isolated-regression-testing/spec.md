## ADDED Requirements

### Requirement: Test teardown tolerates a closing Windows handle
A test that owns a temporary directory SHALL remove it with bounded retries, so a file handle that pinned dependencies are still closing does not fail a test whose assertions passed. The retries SHALL apply only to removing the test's own temporary storage, never to a test's assertions, and a handle that stays open past the bound SHALL still fail the test.

#### Scenario: A handle is still closing at teardown on Windows
- **WHEN** a test's assertions have passed and its temporary directory is briefly locked by a closing handle
- **THEN** teardown SHALL retry the removal and the test SHALL pass

#### Scenario: A release-coordination test contends for storage
- **WHEN** a test that commits release state and runs concurrent bootstraps passes alone but times out in the parallel worker pool
- **THEN** it SHALL run in the resource-sensitive class with its evidence recorded
- **AND** its timeout and assertions SHALL remain unchanged
