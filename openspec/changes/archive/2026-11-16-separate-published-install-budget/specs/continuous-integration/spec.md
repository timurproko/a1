## MODIFIED Requirements

### Requirement: Published installer smoke replacement budget

The published-installer smoke harness SHALL bound fresh application installation, predecessor installation, and authenticated installer recovery commands to five minutes on every platform. Installer acquisition and predecessor update commands SHALL retain two-minute deadlines. Metadata queries and non-interactive launch commands SHALL retain thirty-second deadlines. On timeout it SHALL retain failure evidence and settle fixture-owned descendants within the existing thirty-second settlement budget before removal, without trusting a partially installed target or relaxing promotion assertions. It SHALL print each command's phase and timeout before waiting, phase and elapsed time with the timeout every thirty seconds while waiting, and outcome and elapsed time afterward. Progress timers SHALL stop when the command returns or throws.

#### Scenario: Windows predecessor update runs long

- **WHEN** a published-predecessor update has not finished within two minutes
- **THEN** the harness SHALL fail that stage, collect bounded diagnostics, and settle the fixture-owned process tree
- **AND** promotion SHALL remain blocked even if target files already exist

#### Scenario: A phase is running without child output

- **WHEN** the harness starts a smoke command that buffers its child output
- **THEN** it SHALL print the smoke phase and timeout before awaiting that command and periodic phase, elapsed-time, and timeout progress while waiting
- **AND** it SHALL print the outcome and duration when the command returns and stop its progress timer on return or exception

#### Scenario: Other platforms and stages keep their budget

- **WHEN** the smoke runs metadata queries or non-interactive launch commands on any platform
- **THEN** those commands SHALL retain their thirty-second deadlines

#### Scenario: Installation and short commands retain bounded deadlines

- **WHEN** the smoke runs fresh application installation, predecessor installation, or authenticated installer recovery
- **THEN** that command SHALL have a five-minute deadline
- **AND** installer acquisition and predecessor update SHALL retain two-minute deadlines while metadata queries and launch commands SHALL retain thirty-second deadlines

#### Scenario: Installation completes beyond the former deadline

- **WHEN** an installation command completes after two minutes but within five minutes
- **THEN** the harness SHALL continue its existing transcript, manifest, activation, and launcher assertions rather than fail at the former two-minute deadline

### Requirement: Published pair smoke backstops and failure checkpoint

Each native Published pair job SHALL have a thirty-minute job timeout and a twenty-five-minute exercise-step timeout. Its evidence-upload step SHALL remain unconditional after step failure. Command deadlines SHALL remain the primary failure mechanism, and the outer limits SHALL be emergency backstops with headroom for sequential bounded installation, update, recovery, diagnostics, and settlement. After collecting a stage failure's sanitized diagnostics the smoke SHALL attempt to persist that failure snapshot before process settlement or fixture removal, then write the final cleanup-aware record. A failed checkpoint or final evidence write SHALL NOT replace the primary stage error. Existing authenticated legacy-crash detection, strict recovery eligibility, exact candidate checks, and failure-blocked promotion SHALL remain unchanged.

#### Scenario: Cleanup fails after a command timeout

- **WHEN** a failed command has produced diagnostics and fixture settlement or removal later fails
- **THEN** a failure checkpoint SHALL already have been attempted before cleanup
- **AND** the final evidence SHALL retain the primary failure and add the secondary cleanup failure

#### Scenario: A smoke lane exceeds its outer deadline

- **WHEN** a native smoke exercise is still running after twenty-five minutes or its job reaches thirty minutes
- **THEN** the applicable outer timeout SHALL stop it and promotion SHALL remain blocked
- **AND** the evidence-upload step SHALL retain its unconditional execution policy subject to runner and job cancellation

#### Scenario: A generic timeout does not qualify for legacy recovery

- **WHEN** the predecessor update times out without an authenticated known legacy heartbeat crash
- **THEN** the smoke SHALL fail rather than invoke installer recovery or promote the candidate
