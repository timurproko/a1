## MODIFIED Requirements

### Requirement: Bare AddOne launches the multi-agent workspace
Bare `addone` and `a1` SHALL launch the AddOne-owned multi-agent workspace through an accepted AddOne-owned UI foundation. The workspace SHALL own its application output and SHALL expose managed agents according to their negotiated structured or composed-terminal capabilities. Pi SHALL be integrated through documented public SDK adapters rather than by modifying its stock interactive UI. `addone pi`/`a1 pi` SHALL remain exact vanilla Pi using ordinary `~/.pi/agent`, and `addone sandbox`/`a1 sandbox` SHALL remain the isolated `~/.a1/sandbox` profile using transparent direct attachment.

#### Scenario: Launch bare AddOne
- **WHEN** the user runs `a1` in a supported terminal
- **THEN** AddOne SHALL start or reconnect the multi-agent workspace without silently launching the vanilla or sandbox profile

#### Scenario: Launch the structured-only development preview
- **WHEN** the user runs bare AddOne after fullscreen UI and structured tabs are accepted but composed proof remains pending
- **THEN** AddOne SHALL provide the structured SDK-backed workspace without launching or connecting to the terminal host and SHALL keep arbitrary terminal panes and splits unavailable

#### Scenario: Launch vanilla Pi
- **WHEN** the user runs `a1 pi`
- **THEN** AddOne SHALL bypass the workspace and transparently attach one exact upstream vanilla Pi process using ordinary `~/.pi/agent`

#### Scenario: Select an AddOne vanilla-style preset
- **WHEN** the user selects a vanilla-style presentation in bare AddOne
- **THEN** AddOne SHALL use its owned UI composition and public SDK engine adapter without claiming that presentation is the exact upstream Pi interactive UI

#### Scenario: Launch sandbox Pi
- **WHEN** the user runs `a1 sandbox`
- **THEN** AddOne SHALL bypass the workspace and transparently attach one Pi process using `~/.a1/sandbox` with project-local executable resources untrusted for that run

#### Scenario: Explicit modes bypass native composed infrastructure
- **WHEN** the user runs `a1 pi` or `a1 sandbox`
- **THEN** AddOne SHALL NOT launch, connect to, initialize, or route terminal activity through the composed terminal host or its parser, renderer, pseudoterminal, topology, or input paths

#### Scenario: Launch after a prior workspace exit
- **WHEN** the user runs bare AddOne after the workspace process exited
- **THEN** AddOne SHALL reconcile durable agent identities and reconnect only resources whose capability-specific ownership and continuity can be verified
