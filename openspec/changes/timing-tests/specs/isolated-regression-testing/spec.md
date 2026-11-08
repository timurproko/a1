## ADDED Requirements

### Requirement: Concurrency tests do not assume an unspecified order
A test of concurrent operations SHALL assert each operation's outcome without depending on which operation reaches a shared boundary first, unless the product guarantees that order. Test temporary-directory teardown SHALL remove the test's own storage with bounded retries, so a closing Windows handle does not fail a test whose assertions passed, and SHALL NOT retry the test's assertions.

#### Scenario: Two launches reach spawn in either order
- **WHEN** two concurrent launches are started and either one records its UI child first
- **THEN** closing one recorded child SHALL settle exactly one launch, with that child's exit code
- **AND** the other launch SHALL settle only when its own child closes, with that child's exit code

#### Scenario: A handle is still closing at teardown on Windows
- **WHEN** a test's assertions have passed and its temporary directory is briefly locked by a closing handle
- **THEN** teardown SHALL retry the removal and the test SHALL pass
- **AND** a handle that stays open past the bound SHALL still fail the test
