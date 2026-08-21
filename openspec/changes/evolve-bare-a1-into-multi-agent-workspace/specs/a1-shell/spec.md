## MODIFIED Requirements

### Requirement: Bare A1 launches the multi-agent workspace
Bare `a1` SHALL launch the A1-owned multi-agent workspace through an accepted A1-owned UI foundation and vendor-neutral A1 runtime contracts. The workspace SHALL own its application output and SHALL expose managed agents according to their negotiated structured or composed-terminal capabilities. Pi SHALL be selected at the composition root and integrated through a bounded implementation using documented public SDK entry points rather than by modifying its stock interactive UI or exposing Pi-specific contracts to workspace features. `a1 pi` SHALL remain exact vanilla Pi using ordinary `~/.pi/agent`, and `a1 sandbox` SHALL remain the isolated `~/.a1/sandbox` profile using transparent direct attachment.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1` in a supported terminal
- **THEN** A1 SHALL start or reconnect the multi-agent workspace without silently launching the vanilla or sandbox profile

#### Scenario: Launch the structured-only development preview
- **WHEN** the user runs bare A1 after fullscreen UI and structured tabs are accepted but composed proof remains pending
- **THEN** A1 SHALL provide the structured SDK-backed workspace without launching or connecting to the terminal host and SHALL keep arbitrary terminal panes and splits unavailable

#### Scenario: Launch vanilla Pi
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL bypass the workspace and transparently attach one exact vanilla Pi process from the A1-selected dependency using ordinary `~/.pi/agent` through a documented public child entry point rather than ambient `PATH` resolution

#### Scenario: Select an A1 vanilla-style preset
- **WHEN** the user selects a vanilla-style presentation in bare A1
- **THEN** A1 SHALL use its owned UI composition and public SDK engine adapter without claiming that presentation is the exact upstream Pi interactive UI

#### Scenario: Launch sandbox Pi
- **WHEN** the user runs `a1 sandbox`
- **THEN** A1 SHALL bypass the workspace and transparently attach one Pi process using `~/.a1/sandbox` with project-local executable resources untrusted for that run

#### Scenario: Explicit modes bypass native composed infrastructure
- **WHEN** the user runs `a1 pi` or `a1 sandbox`
- **THEN** A1 SHALL NOT launch, connect to, initialize, or route terminal activity through the composed terminal host or its parser, renderer, pseudoterminal, topology, or input paths

#### Scenario: Launch after a prior workspace exit
- **WHEN** the user runs bare A1 after the workspace process exited
- **THEN** A1 SHALL reconcile durable agent identities and reconnect only resources whose capability-specific ownership and continuity can be verified
