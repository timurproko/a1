## ADDED Requirements

### Requirement: Bare A1 restores queued messages with Alt+Up by default
Bare A1's default agent-input keybindings SHALL assign `Alt+Up` to the queued-message restore action on every supported platform, including Windows and WSL. Invoking the action SHALL remove every pending steering and follow-up message from the engine queue and restore their text to the editor in queue order. The pinned comparison profile SHALL retain its upstream platform-specific default. An explicit user binding for the restore action SHALL replace the bare-A1 default through the existing keybinding resolution rules.

#### Scenario: Restore queued steering with the default shortcut
- **WHEN** bare A1 has pending steering or follow-up messages and the agent input receives `Alt+Up`
- **THEN** every pending message SHALL be removed from the queue and restored to the editor in queue order

#### Scenario: Use the default on Windows or WSL
- **WHEN** bare A1 runs on Windows or WSL without an explicit queued-message restore override
- **THEN** `Alt+Up` SHALL invoke queued-message restoration and `Alt+Q` SHALL NOT be the default for that action

#### Scenario: Preserve an explicit override
- **WHEN** a user explicitly binds the queued-message restore action to another key
- **THEN** the configured key SHALL invoke restoration and the default `Alt+Up` assignment SHALL no longer be effective for that action

#### Scenario: Keep the comparison profile unchanged
- **WHEN** the pinned comparison profile resolves its queued-message restore binding
- **THEN** it SHALL retain the pinned upstream platform-specific default rather than the bare-A1 override

### Requirement: Queued-message restore hints reflect effective dispatch
Bare A1's startup help, shortcut listing, and pending-queue edit hint SHALL derive the queued-message restore key label from the effective agent-input declaration used for dispatch. Default presentation SHALL identify `Alt+Up`; an explicit user override SHALL replace that label without requiring a separate presentation edit. A visible queued-message restore hint SHALL name only a key that invokes the action in the current input scope.

#### Scenario: Show the default queued-message hint
- **WHEN** bare A1 presents startup help or pending queued messages with default keybindings
- **THEN** the restore action SHALL be labeled `Alt+Up`

#### Scenario: Show an overridden queued-message hint
- **WHEN** bare A1 presents startup help, the shortcut listing, or pending queued messages after an explicit restore-key override
- **THEN** each presentation SHALL show the effective override and SHALL NOT continue to advertise `Alt+Up`

#### Scenario: Keep listing and dispatch aligned
- **WHEN** a queued-message restore hint names a key in the active bare-A1 input scope
- **THEN** sending that key to the agent input SHALL invoke the queued-message restore action
