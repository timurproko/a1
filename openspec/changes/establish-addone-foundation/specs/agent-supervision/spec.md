## Purpose

Defines durable workspace and logical-agent supervision so UI processes, worker processes, and runtime versions can be replaced without losing control-plane identity or recoverable conversation continuity.

## ADDED Requirements

### Requirement: Logical agents have durable identity
The supervisor SHALL persist each workspace and logical agent independently of any process ID, connection, terminal, or worker generation.

#### Scenario: Worker process replacement
- **WHEN** an agent worker exits and a replacement worker starts
- **THEN** the replacement SHALL remain associated with the same logical agent and workspace while receiving a new process generation

#### Scenario: Supervisor restart
- **WHEN** the supervisor restarts after durable state was committed
- **THEN** it SHALL reconstruct the persisted workspaces, agents, ordering, runtime profiles, and session references

### Requirement: UI lifetime is independent from agent lifetime
The supervisor SHALL continue supervising configured agents when all UI clients disconnect unless an explicit agent or supervisor shutdown policy requires otherwise.

#### Scenario: Last UI disconnects
- **WHEN** the last AddOne UI client disconnects
- **THEN** the supervisor SHALL not stop live agents solely because no UI is attached

#### Scenario: New UI attaches
- **WHEN** a UI client attaches after a period with no connected UI
- **THEN** the supervisor SHALL provide a current snapshot before delivering newer events

### Requirement: Drivers advertise explicit capabilities
Each driver SHALL advertise the operations and surface types it supports, and the supervisor SHALL reject unsupported operations without mutating agent state.

#### Scenario: Unsupported steering operation
- **WHEN** a steering request targets a generic PTY driver that does not advertise steering
- **THEN** the supervisor SHALL reject the request with a capability error and SHALL not inject terminal input as a substitute

#### Scenario: Driver capability change
- **WHEN** a replacement driver generation advertises a different capability set
- **THEN** the supervisor SHALL publish the new capability set with the generation change

### Requirement: Supervisor events are ordered and reconnectable
The supervisor SHALL expose correlated command results, revisioned snapshots, and ordered events so a client can detect gaps and resynchronize without relying on process memory.

#### Scenario: Event gap detected
- **WHEN** a client receives an event revision that does not follow its current revision
- **THEN** the client SHALL request or receive a fresh supervisor snapshot before applying later events

#### Scenario: Duplicate command request
- **WHEN** a client retries a command with the same request identity after losing the response
- **THEN** the supervisor SHALL return the recorded outcome or reject the duplicate without applying the command twice

### Requirement: Recoverable sessions have one live writer
The supervisor SHALL enforce a lease that prevents more than one live worker generation from writing the same resumable session.

#### Scenario: Replacement of an idle worker
- **WHEN** an idle worker holding a session lease is replaced
- **THEN** the supervisor SHALL stop or detach the old writer, release its lease, start the replacement, verify the expected session identity, and only then mark the replacement ready

#### Scenario: Concurrent ownership request
- **WHEN** a second live worker requests a session already leased to another generation
- **THEN** the supervisor SHALL deny the request or require an explicit independent fork

### Requirement: Recovery distinguishes durable context from interrupted work
The supervisor SHALL recover the latest verified durable session and SHALL represent interrupted operations explicitly rather than blindly replaying potentially side-effecting work.

#### Scenario: Crash during a tool operation
- **WHEN** a managed worker crashes after a tool started but before the agent settled
- **THEN** recovery SHALL retain the durable session, mark the operation interrupted, and require reconciliation before any automatic repeat of that operation

#### Scenario: Crash while idle
- **WHEN** a recoverable managed worker crashes while idle
- **THEN** the supervisor SHALL attempt a bounded restart using its existing runtime and exact session reference

### Requirement: Failure is isolated by agent generation
A worker or driver failure SHALL affect only its logical agent unless the supervisor itself is unavailable, and other agents SHALL remain usable.

#### Scenario: Broken Pi extension
- **WHEN** a Pi extension prevents one Managed Pi worker from starting
- **THEN** the affected agent SHALL enter a diagnosable error state while unrelated agents continue running

#### Scenario: PTY child exits
- **WHEN** one PTY child exits
- **THEN** the supervisor SHALL publish its exit status without closing sibling agents or their workspaces

### Requirement: Control state and conversation state have explicit authorities
The supervisor SHALL treat its durable control store as authoritative for AddOne workspace and lifecycle metadata while treating each runtime's session store as authoritative for that runtime's conversation history.

#### Scenario: Pi transcript is updated
- **WHEN** a Managed Pi conversation appends entries to its Pi JSONL session
- **THEN** the supervisor SHALL update the stored session reference or cursor without duplicating the Pi transcript as an independent authoritative conversation

### Requirement: Destructive lifecycle actions are explicit
Closing a UI tab, stopping a process, deleting a logical agent, and deleting conversation data SHALL be distinguishable operations with explicit user-visible consequences.

#### Scenario: Close presentation only
- **WHEN** the user closes a presentation tab under a policy that retains the logical agent
- **THEN** the supervisor SHALL retain the agent and its session while removing that UI binding

#### Scenario: Delete logical agent
- **WHEN** the user confirms deletion of a logical agent
- **THEN** the supervisor SHALL stop its active generation, release leases, remove it from the workspace, and report whether conversation artifacts were retained or deleted
