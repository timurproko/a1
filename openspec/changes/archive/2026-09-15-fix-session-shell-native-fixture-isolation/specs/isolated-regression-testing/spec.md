## ADDED Requirements

### Requirement: Integration fixtures isolate test-loader overhead without mutable selection
A file-owned integration fixture SHALL use the current build's real cold emitted helper and worker entries consistently when source-language loader and transpilation startup are not behavior under test and measured native evidence shows that overhead crosses retained assertion boundaries. Entry selection SHALL be immutable for the test file, SHALL preserve a caller's explicit entry, worker data and options, SHALL match only the owned source bootstrap being replaced, and SHALL leave unrelated workers untouched. Every operation SHALL still create a new real child process or worker and exercise the production protocol and asynchronous completion path. Independent tests SHALL retain source-entry contract coverage and prove equivalent source/emitted outcomes.

#### Scenario: Integration file exercises clipboard paste behavior
- **WHEN** a shell integration file starts controlled text or image paste operations whose source-loader startup is outside its asserted contract
- **THEN** each operation SHALL start the current build's real emitted helper or exact corresponding emitted worker without prewarming, caching, process reuse, or synthetic results
- **AND** all payload, ordering, pending-state, cleanup, copy, submission, and failure assertions SHALL remain unchanged
- **AND** existing wait and test deadlines SHALL remain unchanged

#### Scenario: Caller supplies an explicit helper or unrelated worker
- **WHEN** the fixture observes an explicit helper entry, a non-matching worker bootstrap, or unrelated worker options and data
- **THEN** it SHALL preserve that entry, options, and data exactly rather than redirecting them through the emitted clipboard fixture

#### Scenario: Source and emitted contracts are compared
- **WHEN** focused regression coverage validates helper and worker behavior
- **THEN** source entries and built emitted entries SHALL retain equivalent controlled text, image, malformed-input, lifecycle, and protocol outcomes
- **AND** using emitted entries in the integration file SHALL NOT remove the independent source-entry coverage

#### Scenario: Native complete regression is evaluated
- **WHEN** the exact candidate runs the existing complete native validation matrix
- **THEN** every retained session-shell paste case SHALL execute once under its existing assertions and deadlines on each selected runtime
- **AND** a failed lane SHALL remain failed without semantic retry, timeout extension, workload removal, or acceptance inferred from another runtime
