## MODIFIED Requirements

### Requirement: Published installer smoke replacement budget

The published-installer smoke harness SHALL bound fresh application installation, predecessor installation, predecessor update, and authenticated installer recovery commands to five minutes on every platform. Installer acquisition SHALL retain its two-minute deadline. Metadata queries and non-interactive launch commands SHALL retain thirty-second deadlines. On timeout it SHALL retain failure evidence and settle fixture-owned descendants within the existing thirty-second settlement budget before removal, without trusting a partially installed target or relaxing promotion assertions. It SHALL print each command's phase and timeout before waiting, phase and elapsed time with the timeout every thirty seconds while waiting, and outcome and elapsed time afterward. Progress timers SHALL stop when the command returns or throws.

#### Scenario: Windows predecessor update runs long

- **WHEN** a published-predecessor update has not finished within five minutes
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

- **WHEN** the smoke runs fresh application installation, predecessor installation, predecessor update, or authenticated installer recovery
- **THEN** that command SHALL have a five-minute deadline
- **AND** installer acquisition SHALL retain its two-minute deadline while metadata queries and launch commands SHALL retain thirty-second deadlines

#### Scenario: Installation completes beyond the former deadline

- **WHEN** an installation command completes after two minutes but within five minutes
- **THEN** the harness SHALL continue its existing transcript, manifest, activation, and launcher assertions rather than fail at the former two-minute deadline

#### Scenario: Predecessor update completes beyond the former deadline

- **WHEN** the real predecessor update succeeds after two minutes but within five minutes
- **THEN** the harness SHALL continue exact-candidate manifest and launcher checks
- **AND** a live worker, heartbeat, or partial target alone SHALL NOT count as a successful update
