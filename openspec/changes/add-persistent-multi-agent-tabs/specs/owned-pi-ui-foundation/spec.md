## MODIFIED Requirements

### Requirement: Graceful user quit returns control to the parent shell
The owned interactive UI SHALL treat `/quit` and the second `Ctrl+C` in the existing clear/exit chord as complete graceful-exit requests. Each route SHALL stop the agent session, dispose the owned presentation, restore all terminal modes and screen state owned by A1, terminate the interactive A1 process successfully, and return control to the invoking shell without requiring another signal or keystroke. In bare A1 with resident agents enabled, each route SHALL instead detach the foreground client from the resident host and leave every resident agent running, while completing the same presentation disposal, terminal restoration, successful exit, and parent-shell return. The built-in quit command's autocomplete description SHALL be exactly `Quit`.

#### Scenario: Quit with the slash command
- **WHEN** the user submits `/quit` from an active owned interactive session
- **THEN** A1 SHALL complete graceful shutdown, restore the terminal, exit successfully, and make the invoking shell prompt available
- **AND** no inactive or blank A1 fullscreen surface SHALL remain

#### Scenario: Quit with the clear/exit chord
- **WHEN** the user presses `Ctrl+C` twice within the existing clear/exit interval
- **THEN** the second press SHALL complete the same graceful shutdown, terminal restoration, successful process exit, and parent-shell return as `/quit`

#### Scenario: Quit bare A1 with resident agents
- **WHEN** resident agents are enabled and the user quits bare A1 through any graceful route
- **THEN** A1 SHALL restore the terminal and exit successfully without stopping any resident agent
- **AND** `a1 pi` SHALL continue to stop its single agent session on quit

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
