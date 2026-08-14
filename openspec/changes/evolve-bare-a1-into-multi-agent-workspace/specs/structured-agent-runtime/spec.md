## Purpose

Defines an application-neutral structured/RPC runtime for managed agents whose state and commands are available without terminal screen interpretation.

## ADDED Requirements

### Requirement: Structured adapters negotiate a versioned capability contract
A structured agent adapter SHALL negotiate protocol version, identity, supported commands, event types, snapshot and resume semantics, cancellation, attachment types, and flow-control limits before becoming ready. AddOne SHALL reject incompatible or contradictory declarations without starting a partial managed session.

#### Scenario: Compatible adapter connects
- **WHEN** an adapter declares a supported protocol version and internally consistent capabilities
- **THEN** AddOne SHALL persist the negotiated contract and expose only those capabilities to the workspace

#### Scenario: Pi SDK adapter connects
- **WHEN** AddOne creates a Pi-backed structured agent
- **THEN** the adapter SHALL use documented public Pi SDK entry points, including the session runtime where applicable, and SHALL map Pi-specific types into AddOne-owned versioned contracts before exposing them to the workspace

#### Scenario: Pi interactive internals appear available
- **WHEN** an installed Pi package exposes stock interactive classes or discoverable private implementation state
- **THEN** the structured adapter SHALL NOT patch, inspect, deep-import, or hash those internals as a condition of operation

#### Scenario: Adapter claims incompatible capabilities
- **WHEN** an adapter omits required versioning or declares mutually inconsistent resume and snapshot semantics
- **THEN** AddOne SHALL reject readiness with an actionable protocol error

### Requirement: Structured state uses typed events and authoritative snapshots
Adapters SHALL provide validated typed events with agent identity, monotonic ordering information, and bounded payloads. When declared, snapshots SHALL provide authoritative recoverable state. AddOne SHALL NOT derive structured messages, tool calls, tasks, or readiness from terminal text, timing, or visual content.

#### Scenario: Ordered events arrive
- **WHEN** valid events arrive in declared order
- **THEN** AddOne SHALL apply them once to the identified agent and update its observable state

#### Scenario: An event gap is detected
- **WHEN** ordering information reveals a missing or duplicate event
- **THEN** AddOne SHALL request the declared resynchronization mechanism or mark the agent degraded without guessing the missing state

#### Scenario: Terminal-like text appears in an event
- **WHEN** a structured payload contains ANSI escapes or terminal-looking text
- **THEN** AddOne SHALL treat it as typed payload content and SHALL NOT use it to infer control state

### Requirement: Commands are correlated, cancellable, and bounded
Every structured command SHALL carry an agent identity and unique correlation identity. The runtime SHALL report accepted, rejected, completed, failed, timed-out, and cancelled outcomes and SHALL enforce declared concurrency and payload limits.

#### Scenario: Command completes
- **WHEN** the workspace sends a supported command and the adapter completes it
- **THEN** AddOne SHALL associate progress and final outcome only with the originating agent and correlation identity

#### Scenario: Cancellation races completion
- **WHEN** cancellation and completion occur concurrently
- **THEN** the runtime SHALL resolve one durable terminal outcome and SHALL NOT apply duplicate effects

### Requirement: Backpressure protects workspace availability
The runtime SHALL bound queued commands, events, snapshots, attachments, logs, and reconnect replay. Overload SHALL degrade or isolate the responsible agent rather than exhaust workspace memory or block unrelated agents.

#### Scenario: Adapter exceeds its event window
- **WHEN** an adapter produces events faster than the negotiated consumer window
- **THEN** AddOne SHALL apply the negotiated pause, rejection, compaction, or disconnect behavior and retain actionable evidence

#### Scenario: One agent sends an oversized attachment
- **WHEN** a payload exceeds the negotiated size limit
- **THEN** AddOne SHALL reject that payload without closing healthy agents

### Requirement: Structured reconnection proves continuity
Reconnectable adapters SHALL provide an ownership proof and resume token or authoritative snapshot consistent with the durable agent identity. Non-reconnectable adapters SHALL be reported as ended after workspace restart.

#### Scenario: Valid resume succeeds
- **WHEN** a surviving adapter proves ownership and accepts the persisted resume position
- **THEN** AddOne SHALL resume from the declared boundary without duplicating acknowledged commands or events

#### Scenario: Resume proof fails
- **WHEN** process identity, token, protocol version, or state position does not match
- **THEN** AddOne SHALL refuse reconnection and SHALL NOT attach the durable record to the unverified process
