## ADDED Requirements

### Requirement: Interrupted sessions resume from their saved session file
A1 SHALL NOT journal or replay prompts on behalf of a stopped UI; an interrupted session SHALL be resumed only from its persisted Pi session file.

#### Scenario: The UI stops unexpectedly
- **WHEN** the owned UI process ends uncleanly while a session is open
- **THEN** A1 SHALL restore the terminal and print the session's `a1 --session` resume command
- **AND** no prompt journal or tab recovery state SHALL be written or replayed

## REMOVED Requirements

### Requirement: Failure domains are isolated processes
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Resident processes are crash-only and fail fast
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Control paths never block on external work
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Resident roles are supervised by heartbeats and watchdogs
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Pseudoterminal I/O is flow-controlled and never silently lossy
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Recovery is level-triggered reconciliation
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Stale servers and registry writers are fenced out
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Session exclusivity is enforced by the operating system
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Concurrent tab starts do not corrupt shared profile state
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Liveness and progress are supervised separately
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Durable data is guaranteed per class
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Diagnostics survive the failures they describe
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Reliability evidence matches the enablement stage
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Resident chaos runs are seeded and replayable
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Native host verification runs locally from a published prebuilt terminal library
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Terminal input is never queued behind tab lifecycle work
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.

### Requirement: Host stop completes when a tab's processes are already gone
**Reason**: Resident tab failure isolation, crash recovery, registry durability, and prompt-journal recovery have no subject once resident tabs are removed.

**Migration**: None. An interrupted direct session is resumed from its Pi session file with `a1 --session <id>`; unsent editor text is not journaled.
