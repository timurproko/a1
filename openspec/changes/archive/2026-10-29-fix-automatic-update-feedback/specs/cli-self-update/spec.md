## ADDED Requirements

### Requirement: Automatic self-update remains visually background-only

Automatic self-update SHALL run without opening, focusing, flashing, or closing an additional console or terminal window. The automatic worker and every child process it starts SHALL remain detached from interactive terminal presentation while preserving bounded diagnostic capture and all existing update, recovery, activation, and cleanup guarantees. Explicit update commands SHALL retain their visible progress and diagnostics in the terminal that invoked them and SHALL NOT open a second terminal window.

#### Scenario: Automatic update runs on Windows
- **WHEN** an eligible interactive session starts automatic installation and the update process tree performs registry, npm, recovery, activation, or cleanup work
- **THEN** no additional console or terminal window SHALL appear or flash
- **AND** the initiating session SHALL remain interactive

#### Scenario: Explicit update is invoked
- **WHEN** the user runs an explicit `a1 update` command
- **THEN** progress and actionable diagnostics SHALL remain visible in the invoking terminal
- **AND** no separate terminal window SHALL be opened for update children
