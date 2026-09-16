## ADDED Requirements

### Requirement: Graceful user quit returns control to the parent shell
The owned interactive UI SHALL treat `/quit` and the second `Ctrl+C` in the existing clear/exit chord as complete graceful-exit requests. Each route SHALL stop the agent session, dispose the owned presentation, restore all terminal modes and screen state owned by A1, terminate the interactive A1 process successfully, and return control to the invoking shell without requiring another signal or keystroke. The built-in quit command's autocomplete description SHALL be exactly `Quit`.

#### Scenario: Quit with the slash command
- **WHEN** the user submits `/quit` from an active owned interactive session
- **THEN** A1 SHALL complete graceful shutdown, restore the terminal, exit successfully, and make the invoking shell prompt available
- **AND** no inactive or blank A1 fullscreen surface SHALL remain

#### Scenario: Quit with the clear/exit chord
- **WHEN** the user presses `Ctrl+C` twice within the existing clear/exit interval
- **THEN** the second press SHALL complete the same graceful shutdown, terminal restoration, successful process exit, and parent-shell return as `/quit`

#### Scenario: Describe the quit command
- **WHEN** slash-command autocomplete presents the built-in `quit` command
- **THEN** its description SHALL be `Quit`
- **AND** the description SHALL NOT include `Pi`, `A1`, or another product qualifier
