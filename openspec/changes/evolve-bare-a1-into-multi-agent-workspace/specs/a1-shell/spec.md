## MODIFIED Requirements

### Requirement: Bare A1 launches the multi-agent workspace
After renewed 1:1 parity acceptance and acceptance of the first custom single-agent Pi experience, bare `a1` SHALL launch the A1-owned multi-agent workspace through that accepted A1-owned UI foundation. Until both prerequisites pass, bare `a1` SHALL remain a single-agent owned Pi experience and SHALL NOT expose structured tabs. The eventual workspace SHALL own its application output and SHALL expose managed agents according to their negotiated structured or composed-terminal capabilities. Pi SHALL be integrated through documented public SDK adapters rather than by modifying its stock interactive UI. `a1 pi` SHALL remain exact vanilla Pi using ordinary `~/.pi/agent`, and `a1 sandbox` SHALL remain the isolated `~/.a1/sandbox` profile using transparent direct attachment.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1` in a supported terminal
- **THEN** A1 SHALL start or reconnect the multi-agent workspace without silently launching the vanilla or sandbox profile

#### Scenario: Launch while parity remediation is active
- **WHEN** user-controlled comparison has found an unresolved divergence between bare `a1` and equivalent-state `a1 pi`
- **THEN** bare A1 SHALL remain the single-agent owned Pi experience, structured tabs SHALL remain unavailable, and the prior parity acceptance SHALL NOT authorize multi-agent work

#### Scenario: Launch the structured-only development preview
- **WHEN** renewed parity, the custom single-agent experience, and structured tabs are accepted but composed proof remains pending
- **THEN** A1 SHALL provide the structured SDK-backed workspace without launching or connecting to the terminal host and SHALL keep arbitrary terminal panes and splits unavailable

#### Scenario: Launch vanilla Pi
- **WHEN** the user runs `a1 pi`
- **THEN** A1 SHALL bypass the workspace and transparently attach one exact upstream vanilla Pi process using ordinary `~/.pi/agent`

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
