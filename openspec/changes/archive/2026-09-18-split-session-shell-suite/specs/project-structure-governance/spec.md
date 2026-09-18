## ADDED Requirements

### Requirement: Test suites are bounded by concern
A test file SHALL cover one concern of its owner and SHALL stay small enough to be read and rebased as a unit; a suite that grows past about 1,500 lines or mixes unrelated concerns SHALL be split along the seams of the source it proves, with the doubles and fixtures the parts share moved into one non-test module beside them. Splitting SHALL move cases verbatim: the case count, the assertions, and the seams each case injects SHALL be unchanged, and any validation partition, ownership registry, or import-graph expectation that named the original file SHALL name the parts that inherit its cost.

#### Scenario: One concern changes
- **WHEN** a change touches one concern of the session shell, such as paste, selection, or a workflow route
- **THEN** only the suite for that concern SHALL need rebasing or re-running, and the impact selector SHALL select that suite through its imports

#### Scenario: A resource-sensitive case moves
- **WHEN** a case that forks helper processes or holds a durable worker moves into a new file
- **THEN** that file SHALL be added to the serial resource-sensitive partition and the remainder SHALL NOT run it

#### Scenario: The split is audited
- **WHEN** a suite is split
- **THEN** running the parts SHALL report the same number of passing cases as the original ran
