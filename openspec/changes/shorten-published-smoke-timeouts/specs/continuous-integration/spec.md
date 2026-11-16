## MODIFIED Requirements

### Requirement: Published installer smoke replacement budget

The published-installer smoke harness SHALL bound installer acquisition, fresh application installation, predecessor installation, predecessor update, and authenticated installer recovery commands to two minutes on every platform. Metadata queries and non-interactive launch commands SHALL retain thirty-second deadlines. On timeout it SHALL retain failure evidence and settle fixture-owned descendants within the existing thirty-second settlement budget before removal, without trusting a partially installed target or relaxing promotion assertions. It SHALL print each command's phase and timeout before waiting, phase and elapsed time with the timeout every thirty seconds while waiting, and outcome and elapsed time afterward. Progress timers SHALL stop when the command returns or throws.

#### Scenario: Windows predecessor update runs long

- **WHEN** a published-predecessor update has not finished within two minutes
- **THEN** the harness SHALL fail that stage, collect bounded diagnostics, and settle the fixture-owned process tree
- **AND** promotion SHALL remain blocked even if target files already exist

#### Scenario: A phase is running without child output

- **WHEN** the harness starts a smoke command that buffers its child output
- **THEN** it SHALL print the smoke phase and timeout before awaiting that command and periodic phase, elapsed-time, and timeout progress while waiting
- **AND** it SHALL print the outcome and duration when the command returns and stop its progress timer on return or exception

#### Scenario: Installation and short commands retain bounded deadlines

- **WHEN** the smoke runs acquisition, application installation, predecessor installation, update, or authenticated recovery
- **THEN** that command SHALL have a two-minute deadline
- **AND** metadata queries and launch commands SHALL retain thirty-second deadlines

### Requirement: Published installer smoke process history

While a published-installer smoke command with a budget of at least two minutes runs, the harness SHALL sample the fixture-owned process inventory every ten seconds using the same ownership selection as settlement, without stopping any process and without altering the identities settlement later verifies. Failure evidence SHALL record each sampled process's first and last sighting, parent, start identity, and sanitized arguments, along with the number of samples and any sampling errors.

#### Scenario: A detached updater descendant disappears before the deadline

- **WHEN** a fixture-owned process seen during sampling is absent from later samples
- **THEN** failure evidence SHALL show its last sighting earlier than the command's end so disappearance order is visible

#### Scenario: Sampling fails

- **WHEN** a process inventory sample cannot be read
- **THEN** the harness SHALL record the sampling error and continue the command and later settlement unchanged

#### Scenario: A two-minute command is running

- **WHEN** an installation or update command has the two-minute budget
- **THEN** it SHALL remain eligible for process sampling while thirty-second commands SHALL not be sampled

## ADDED Requirements

### Requirement: Published pair smoke backstops and failure checkpoint

Each native Published pair job SHALL have a ten-minute job timeout and an eight-minute exercise-step timeout. Its evidence-upload step SHALL remain unconditional after step failure. Command deadlines SHALL remain the primary failure mechanism, and the outer limits SHALL be emergency backstops. After collecting a stage failure's sanitized diagnostics the smoke SHALL attempt to persist that failure snapshot before process settlement or fixture removal, then write the final cleanup-aware record. A failed checkpoint or final evidence write SHALL NOT replace the primary stage error. Existing authenticated legacy-crash detection, strict recovery eligibility, exact candidate checks, and failure-blocked promotion SHALL remain unchanged.

#### Scenario: Cleanup fails after a command timeout

- **WHEN** a failed command has produced diagnostics and fixture settlement or removal later fails
- **THEN** a failure checkpoint SHALL already have been attempted before cleanup
- **AND** the final evidence SHALL retain the primary failure and add the secondary cleanup failure

#### Scenario: A smoke lane exceeds its outer deadline

- **WHEN** a native smoke exercise is still running after eight minutes or its job reaches ten minutes
- **THEN** the applicable outer timeout SHALL stop it and promotion SHALL remain blocked
- **AND** the evidence-upload step SHALL retain its unconditional execution policy subject to runner and job cancellation

#### Scenario: A generic timeout does not qualify for legacy recovery

- **WHEN** the predecessor update times out without an authenticated known legacy heartbeat crash
- **THEN** the smoke SHALL fail rather than invoke installer recovery or promote the candidate
