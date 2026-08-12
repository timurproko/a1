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

### Requirement: Live AddOne processes use one immutable release cohort
Every live AddOne UI, supervisor, and AddOne-owned worker cohort SHALL have package-derived release identity and SHALL execute from retained immutable release content. Installing a candidate SHALL not overwrite content used by a live cohort or connect a UI from another release to that cohort.

#### Scenario: Update while an old supervisor is active
- **WHEN** a newer AddOne package is installed while an older supervisor still owns live agents
- **THEN** a subsequent `addone` launch SHALL use the UI retained for that supervisor's release or complete a verified cohort replacement before connecting, and SHALL not expose a protocol mismatch to the user

#### Scenario: Busy non-resumable PTY blocks activation
- **WHEN** candidate activation encounters a live PTY that cannot survive or resume after supervisor replacement
- **THEN** activation SHALL remain pending while the existing release cohort remains usable and SHALL complete automatically after the blocking generation exits or the user explicitly stops it

#### Scenario: Safe cohort activation
- **WHEN** every active generation is idle and recoverable or no generation remains active
- **THEN** AddOne SHALL drain the old cohort, verify ownership release, atomically activate the candidate, and start the replacement cohort without requiring manual process termination

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

### Requirement: Control compatibility is negotiated by required features
UI and supervisor peers SHALL negotiate stable control-envelope identity and required feature capabilities before accepting commands. Release and contract identities SHALL be derived from installed metadata and generated protocol artifacts rather than a manually maintained global protocol-version number.

#### Scenario: Additive peer differences
- **WHEN** two peers differ only by unknown optional fields, events, or advertised features
- **THEN** they SHALL negotiate their shared required feature set and safely ignore unsupported additive information

#### Scenario: Required feature is unavailable
- **WHEN** either peer requires a control feature the other does not advertise
- **THEN** no application command SHALL be accepted and the release coordinator SHALL select a matching cohort or perform a safe replacement instead of reporting a generic malformed-message failure

### Requirement: Immediate package replacement is ownership-safe and atomic
For both stable `update` and preview `update:next`, AddOne SHALL coordinate shutdown, npm installation, immutable materialization, certification, stale-generation reconciliation, active-reference commit, and rollback through the same durable transaction. The command itself SHALL authorize interruption of all verified AddOne-owned non-resumable generations. An update SHALL complete with exactly one active release cohort or retain/restore one verified prior cohort; installed, pending, and transaction phases MAY exist internally for crash recovery but SHALL NOT require separate user operations. The npm tag (`latest` or `next`) SHALL select only the exact target version and SHALL NOT change shutdown, ownership, activation, verification, or rollback semantics.

#### Scenario: Active terminal generations exist
- **WHEN** either update command begins while a verified supervisor owns live terminal generations
- **THEN** the coordinator SHALL stop input, request bounded graceful child shutdown, stop the supervisor and process tree, verify endpoint and native-module ownership release, and only then replace the npm package and activate the candidate

#### Scenario: Native dependency is loaded
- **WHEN** the old cohort has loaded a native dependency such as `conpty.node`
- **THEN** that dependency SHALL resolve from the old immutable release root rather than npm's mutable global package root, and the coordinator SHALL verify release before npm replacement

#### Scenario: Installation or activation fails
- **WHEN** npm installation, materialization, certification, or activation fails
- **THEN** the transaction SHALL retain diagnostics, avoid mixed-release ownership, and restore or retain a single verified runnable cohort when possible without deleting user control or conversation data

### Requirement: Generation liveness is boot-scoped and observed
A process generation SHALL be considered live only when it is owned by a currently verified supervisor boot and backed by that supervisor's in-memory driver handle or another authenticated runtime ownership record. Persisted generation state alone SHALL NOT prove liveness. Every supervisor start SHALL transactionally reconcile nonterminal generation rows from prior boot identities as exited, interrupted, orphaned, or otherwise non-live before publishing ownership metadata.

#### Scenario: Supervisor was forcibly terminated
- **WHEN** the owning supervisor process is dead and its database contains generations previously marked starting, ready, or stopping
- **THEN** the next coordinator or supervisor boot SHALL mark those generations non-live, clear them as activation blockers, and SHALL NOT restart the old release merely because those rows exist

#### Scenario: New supervisor starts from existing control data
- **WHEN** a supervisor boots after an unclean exit
- **THEN** its endpoint ownership SHALL contain only generations with handles established by that boot and SHALL never accumulate prior-boot generation identifiers

### Requirement: Stale supervisor ownership is reconciled automatically
AddOne SHALL validate endpoint ownership using live handshake identity, process identity, release identity, and a per-boot nonce rather than treating an accepting socket or metadata file as sufficient evidence. It SHALL perform bounded graceful cleanup and platform-native process-tree termination when stale ownership is proven safe to remove.

#### Scenario: Metadata names a dead process
- **WHEN** endpoint metadata remains after its recorded process has exited
- **THEN** AddOne SHALL remove or replace the stale ownership record and start the selected supervisor without asking the user to find a PID

#### Scenario: Unresponsive process owns no live generation
- **WHEN** the recorded supervisor process is alive but cannot complete its handshake and durable state proves that it owns no live generation
- **THEN** AddOne SHALL attempt graceful termination, apply bounded platform-native process-tree cleanup if needed, and continue startup with retained diagnostics

#### Scenario: Ownership safety is uncertain
- **WHEN** AddOne cannot prove whether an unresponsive supervisor owns a live non-resumable generation
- **THEN** AddOne SHALL preserve the process and present a diagnosable blocked-recovery state rather than blindly terminating it or emitting shell-specific manual kill instructions

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

### Requirement: Terminal process and host presentation authorities are separate
The supervisor SHALL own terminal-agent PTYs, process generations, and bounded resident virtual terminal state independently from foreground UI clients. A foreground UI client SHALL own only its attached physical-terminal state and SHALL render supervisor-provided terminal state without granting a child process direct control of that host terminal.

#### Scenario: UI disconnects from a live terminal session
- **WHEN** the foreground UI disconnects while a terminal-agent PTY remains alive
- **THEN** the supervisor SHALL retain the PTY and its virtual terminal state without requiring the child to change modes or repaint for the disconnected physical terminal

#### Scenario: UI reconnects to a live terminal session
- **WHEN** another release-matched UI attaches to the supervisor
- **THEN** the supervisor SHALL provide a bounded current virtual terminal snapshot and only later ordered updates, without replaying child control sequences against the new physical terminal

#### Scenario: Foreground CLI exits inside a shell-backed session
- **WHEN** Pi or another foreground command exits while its terminal session is rooted in an interactive shell
- **THEN** the shell and terminal session SHALL remain available for subsequent commands unless an explicit lifecycle policy closes the session

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
