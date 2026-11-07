# resident-tab-reliability Specification

## Purpose
TBD - created by archiving change resident-tabs-failure-isolation. Update Purpose after archive.

## Requirements

### Requirement: Interrupted sessions resume from their saved session file
A1 SHALL NOT journal or replay prompts on behalf of a stopped UI; an interrupted session SHALL be resumed only from its persisted Pi session file.

#### Scenario: The UI stops unexpectedly
- **WHEN** the owned UI process ends uncleanly while a session is open
- **THEN** A1 SHALL restore the terminal and print the session's `a1 --session` resume command
- **AND** no prompt journal or tab recovery state SHALL be written or replayed
