# project-structure-governance Delta

## ADDED Requirements

### Requirement: Oversized units are recorded in a shrinking size baseline
The architecture gate SHALL measure every TypeScript class under `src/` by method count, field count, and line count, and every Rust function under `native/` by line count, excluding vendored sources. A unit above the threshold of twenty methods, fifteen fields, or one hundred function lines SHALL be recorded in one committed baseline under `config/baselines/` with its current counts. The gate SHALL fail when a recorded count grows, when an unrecorded unit exceeds a threshold, or when a recorded unit falls under every threshold without its entry being removed, so the baseline can only shrink. The measurement SHALL be a deterministic source scan with a reproduction test and SHALL NOT depend on a compiler or build.

#### Scenario: A recorded class gains a method
- **WHEN** a change adds a method to a class the baseline records
- **THEN** the architecture gate SHALL fail naming the file, the class, and the count that grew

#### Scenario: A new class exceeds a threshold
- **WHEN** a change introduces a class with more than twenty methods or fifteen fields, or a Rust function longer than one hundred lines, that the baseline does not record
- **THEN** the architecture gate SHALL fail naming the unit and the threshold it crossed

#### Scenario: A recorded unit is split below threshold
- **WHEN** a change reduces a recorded unit under every threshold
- **THEN** the architecture gate SHALL fail until the entry is removed
- **AND** the baseline SHALL never regain that entry

#### Scenario: Counts shrink without reaching threshold
- **WHEN** a change reduces a recorded count but the unit remains above a threshold
- **THEN** the change SHALL lower the recorded count to the new value
- **AND** the gate SHALL pass with the lowered entry
