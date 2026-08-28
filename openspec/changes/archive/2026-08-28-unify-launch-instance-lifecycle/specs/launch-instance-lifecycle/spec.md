## Purpose

Defines independent ownership, containment, termination, and lifecycle evidence for every interactive A1 command invocation and all processes it creates.

## ADDED Requirements

### Requirement: Every interactive command owns an independent launch instance
Each invocation of `a1` or `a1 pi` SHALL create a unique launch instance whose ownership and outcome are independent from every other invocation. A1 SHALL permit any supported number and combination of those launch forms concurrently and SHALL NOT use product-wide foreground exclusivity to authorize a launch.

#### Scenario: Launch several profiles concurrently
- **WHEN** the user starts multiple `a1` and `a1 pi` commands from separate terminals
- **THEN** A1 SHALL start one independent launch instance for every command without rejecting any command because another interactive instance is active

#### Scenario: One instance exits
- **WHEN** one of several active launch instances exits
- **THEN** A1 SHALL finalize only that instance and SHALL leave every unrelated instance active

### Requirement: A launch instance owns its complete runtime process tree
A launch instance SHALL own its selected root runtime and every agent, extension, tool, daemon, helper, and descendant process created within its declared containment boundary. Default interactive instances SHALL be non-detachable; a process that must survive instance closure requires a separately specified explicit resident capability.

#### Scenario: Runtime starts descendants
- **WHEN** an owned UI or Pi runtime starts extension daemons, agent workers, tools, or further descendants
- **THEN** those processes SHALL remain members of the originating launch instance and SHALL NOT become unowned background runtime processes

#### Scenario: A component requests implicit detachment
- **WHEN** an instance-owned component attempts to survive the closure of its originating instance without an explicit resident capability
- **THEN** A1 SHALL retain it within terminate-on-close ownership rather than silently detaching it

### Requirement: Instance closure terminates all instance-owned runtime processes
When a launch instance closes normally or loses its owner through terminal closure, disconnect, crash, or forced termination, A1 SHALL perform bounded graceful-then-forced termination of that instance's remaining process tree. Cleanup SHALL require no user PID discovery, supervisor restart, control-state deletion, or subsequent launch.

#### Scenario: Root runtime exits while descendants remain
- **WHEN** the root owned UI or Pi process exits but an instance-owned descendant remains
- **THEN** A1 SHALL terminate the remaining descendant within the bounded close sequence before finalizing the instance

#### Scenario: Terminal closes unexpectedly
- **WHEN** the terminal or launch owner disappears without reporting a normal outcome
- **THEN** A1 SHALL automatically close the corresponding process tree and record an interrupted or stopped outcome

#### Scenario: Cleanup exceeds its deadline
- **WHEN** a verified instance-owned process tree does not terminate within the graceful deadline
- **THEN** A1 SHALL escalate once within a bounded forced-cleanup deadline and record the resulting diagnosable outcome

### Requirement: Cleanup is exact and isolated
A1 SHALL bind lifecycle operations to authenticated instance ownership, native process identity, and the instance containment identity. Closing or reconciling one instance SHALL NOT terminate, release, or mutate another instance or an unrelated process; uncertain ownership SHALL fail safely rather than authorize termination.

#### Scenario: One of several instances is closed
- **WHEN** the user closes one active instance while other instances use the same profile and release
- **THEN** A1 SHALL terminate only the selected instance's process tree

#### Scenario: Native identity cannot be verified
- **WHEN** A1 cannot prove that a live process or containment boundary belongs to the affected instance
- **THEN** A1 SHALL preserve that process and report a concise ownership diagnostic without printing an internal stack trace as the primary user message

### Requirement: Terminal behavior remains owned by the shared UI runtime
Launch-instance ownership SHALL carry lifecycle and containment only. It SHALL NOT read ordinary terminal input, parse or relay runtime output, reconstruct display state, synthesize terminal responses, or alter the shared owned rendering and input pipeline selected by either interactive profile.

#### Scenario: Pi comparison runs inside an instance
- **WHEN** prerelease `a1 pi` runs under launch-instance ownership
- **THEN** the owned comparison UI SHALL retain its declared rendering and input authority without a lifecycle guardian interpreting terminal traffic

#### Scenario: Product UI runs inside an instance
- **WHEN** bare `a1` runs under launch-instance ownership
- **THEN** the owned product UI SHALL retain the same rendering and input authority without a lifecycle guardian interpreting terminal traffic

### Requirement: Runtime ownership ends even when control infrastructure remains idle
After the final interactive instance closes, A1 MAY retain an idle verified supervisor for control and release coordination, but it SHALL retain no UI, Pi, agent, extension, tool, daemon, helper, or other runtime process owned by a closed launch instance.

#### Scenario: Last interactive instance closes
- **WHEN** the last active interactive launch instance reaches a terminal outcome
- **THEN** all runtime processes from that instance SHALL be gone even if the supervisor remains available for a later command
