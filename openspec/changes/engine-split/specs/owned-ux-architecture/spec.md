## ADDED Requirements

### Requirement: Engine collaborators own one concern each
The engine runtime SHALL own session binding and lifecycle. Repository metadata polling SHALL be owned by one collaborator that starts, resets, and cancels its own probes and reports changes through one callback. Workflow execution SHALL map each command to one named handler. A rarely used workflow that carries its own network client SHALL load when it is first run, not at startup.

#### Scenario: A new session is bound while a repository probe is running
- **WHEN** the engine binds a new session while a branch or pull-request probe for the previous binding is still in flight
- **THEN** the polling collaborator SHALL abort that probe and drop its result
- **AND** the footer SHALL show only metadata read for the current binding

#### Scenario: The application starts
- **WHEN** A1 starts an interactive session
- **THEN** the share workflow and its network client SHALL NOT be part of the startup module graph
- **AND** the first `/share` SHALL load them and produce the same result as before
