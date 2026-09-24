## MODIFIED Requirements

### Requirement: Graceful user quit returns control to the parent shell
The owned interactive UI SHALL treat `/quit` and the second `Ctrl+C` in the existing clear/exit chord as complete graceful-exit requests. Each route SHALL stop the agent session, dispose the owned presentation, restore all terminal modes and screen state owned by A1, terminate the interactive A1 process successfully, and return control to the invoking shell without requiring another signal or keystroke. When the owned UI runs inside a resident tab, these routes and `Ctrl+D` SHALL instead request, through the tab bridge, that the client which sent the input detach; the tab's agent session and A1 process SHALL keep running, and the attach client SHALL complete terminal restoration and parent-shell return. The built-in quit command's autocomplete description SHALL be exactly `Quit`.

#### Scenario: Quit with the slash command
- **WHEN** the user submits `/quit` from an active owned interactive session
- **THEN** A1 SHALL complete graceful shutdown, restore the terminal, exit successfully, and make the invoking shell prompt available
- **AND** no inactive or blank A1 fullscreen surface SHALL remain

#### Scenario: Quit with the clear/exit chord
- **WHEN** the user presses `Ctrl+C` twice within the existing clear/exit interval
- **THEN** the second press SHALL complete the same graceful shutdown, terminal restoration, successful process exit, and parent-shell return as `/quit`

#### Scenario: Quit inside a resident tab
- **WHEN** the user submits `/quit` or presses `Ctrl+C` twice inside a resident A1 tab
- **THEN** the attach client SHALL restore the terminal and exit successfully, and the tab's agent session SHALL keep running
- **AND** `a1 pi` SHALL continue to stop its single agent session on quit

#### Scenario: Resident tab bridge is unavailable
- **WHEN** a quit route runs inside a resident tab whose bridge is unavailable
- **THEN** A1 SHALL NOT exit the tab process and SHALL show a concise notice that `Alt+Q` detaches

#### Scenario: An extension retains an event-loop handle
- **WHEN** owned UI cleanup has completed but a loaded extension leaves a server, timer, or comparable event-loop handle active
- **THEN** the interactive A1 executable SHALL preserve completed terminal restoration and configured exit output
- **AND** it SHALL still terminate successfully and return control to the parent shell

#### Scenario: Repository-local quit returns promptly
- **WHEN** a user quits an interactive A1 session launched through the supported repository-local development command
- **THEN** development-only cache persistence SHALL NOT introduce a visible post-restoration pause before the parent-shell prompt appears
- **AND** production compile-cache behavior and completed owned cleanup SHALL remain unchanged

#### Scenario: Describe the quit command
- **WHEN** slash-command autocomplete presents the built-in `quit` command
- **THEN** its description SHALL be `Quit`
- **AND** the description SHALL NOT include `Pi`, `A1`, or another product qualifier
