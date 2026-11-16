## ADDED Requirements

### Requirement: Stale discovery records do not block live session control

A1 SHALL remove private control discovery records whose owning process is provably gone, both when a session starts its control endpoint and opportunistically while resolving a lookup, within bounded time and count budgets. It SHALL NOT remove records whose owner process exists, records it cannot parse, or records of unknown format. The `control-limit` refusal SHALL bound live candidate records and a much larger raw directory ceiling, so a machine with many abruptly ended sessions keeps a working API while a flooded directory still fails closed. Pruning SHALL NOT change identity, nonce, deadline or serialization checks and SHALL NOT select a session.

#### Scenario: Many abruptly ended sessions
- **WHEN** the discovery directory holds more than 256 records of dead processes and one live session is targeted
- **THEN** the lookup SHALL resolve the live session
- **AND** the dead records examined SHALL be removed

#### Scenario: Live and unreadable records are preserved
- **WHEN** a starting session sweeps the directory
- **THEN** records whose owner process exists and records that cannot be parsed SHALL remain

#### Scenario: Flooded directory still fails closed
- **WHEN** the directory holds more records than the raw ceiling, or more than 256 live candidates
- **THEN** the lookup SHALL fail with `control-limit` without selecting any session
