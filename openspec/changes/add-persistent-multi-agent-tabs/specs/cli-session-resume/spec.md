## MODIFIED Requirements

### Requirement: Normal A1 accepts explicit session selection
Stable and prerelease builds SHALL support `a1 --session <path|id>` with an optional `--session-dir <dir>` before or after `--session`. Each option SHALL occur at most once and require a nonempty value. `--session-dir` alone, missing values, duplicate options, unknown trailing options, and extra positional arguments in this recognized grammar SHALL fail with a focused diagnostic and nonzero exit status before supervisor or interactive startup. Help SHALL list the supported forms. With resident agents disabled, bare `a1` SHALL continue to start a fresh session. With resident agents enabled, bare `a1` SHALL reattach to the profile's resident agents, creating one fresh agent only when none exist, and a session launch SHALL open the selected session as a new tab or focus the tab already holding it.

#### Scenario: Select an existing session by ID
- **WHEN** the user supplies `a1 --session <id>` for a saved A1 session
- **THEN** A1 SHALL execute an interactive session launch rather than return a silent successful no-op

#### Scenario: Supply a custom directory in either order
- **WHEN** the user supplies one valid `--session` and one valid `--session-dir` in either order
- **THEN** both invocations SHALL select the same target and effective session directory

#### Scenario: Malformed session launch
- **WHEN** a recognized session launch has a missing or empty value, duplicate option, unrecognized additional option, extra argument, or no `--session` target
- **THEN** A1 SHALL report one concise error, exit nonzero, and start no supervisor or interactive runtime

#### Scenario: Inspect help without launching
- **WHEN** the user runs `a1 --help` or `a1 -h`
- **THEN** help SHALL include both supported session-selection forms without launching an interactive runtime

#### Scenario: Bare launch with resident agents running
- **WHEN** resident agents are enabled, two agents are running, and the user runs bare `a1`
- **THEN** A1 SHALL show both agents as tabs and SHALL NOT create a third agent

#### Scenario: Session launch with resident agents running
- **WHEN** resident agents are enabled and the user runs `a1 --session <id>` for a session no live agent holds
- **THEN** A1 SHALL add a tab resuming that session alongside the existing tabs and activate it
