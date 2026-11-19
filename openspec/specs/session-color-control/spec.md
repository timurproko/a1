# session-color-control Specification

## Purpose
TBD - created by archiving change session-accent-colors. Update Purpose after archive.

## Requirements

### Requirement: External applications can list colors and control one live session
A1 SHALL expose Current color through the versioned integration API's session-scoped `accentColor` setting, not dedicated color commands. Descriptor discovery SHALL return exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in declaration order without a live session. Reads and updates SHALL require complete explicit session and runtime UUIDs. Updates SHALL use the same application authority as Settings and succeed only after live application. Missing, malformed, stale, replaced, stopped, comparison and unverifiable targets SHALL fail without mutation. Saved Default and invocation replacement policy SHALL remain unchanged by Current edits. A1 SHALL NOT provide a dedicated `session color` command.

#### Scenario: Herdr reads and changes one of two live sessions
- **WHEN** Herdr reads and updates session A's Current color using its exact runtime identity
- **THEN** it receives the applied value only after session A adopts it
- **AND** session B, saved Default and invocation replacement policy remain unchanged

#### Scenario: List available colors without an active agent
- **WHEN** a host requests setting descriptors
- **THEN** it receives the ordered palette without a live session

#### Scenario: JSON is the default API output
- **WHEN** a host invokes the public API
- **THEN** one clean JSON response and the exit status indicate success or failure

#### Scenario: Settings changes are externally visible
- **WHEN** Settings changes Current color
- **THEN** an exact-target API read observes that value

#### Scenario: Reject an implicit external target
- **WHEN** a live operation omits either explicit identity
- **THEN** it fails without selecting a session

#### Scenario: Reject an invalid color or unavailable target
- **WHEN** a value or exact target is invalid or unavailable
- **THEN** the API fails without changing any live color

#### Scenario: Read choices without an agent
- **WHEN** a host discovers supported settings
- **THEN** the Current color descriptor provides the ordered palette without a live target

#### Scenario: Refuse wrong runtime
- **WHEN** a host supplies a session ID with a different runtime ID
- **THEN** the API fails without selecting a different endpoint or changing any live color

### Requirement: Runtime color requests are bounded and identity-safe

Runtime routing SHALL use private local coordination with bounded records, safe filesystem boundaries, atomic publication, correlated requests and acknowledgements, and verified process/session identities. Product color policy SHALL remain outside neutral foundation coordination. Set requests SHALL serialize in the target runtime and SHALL recheck identity before applying. A queued request SHALL NOT be reported as applied. Timeout, disposal, or replacement SHALL expire outstanding requests so they cannot mutate a later session. Runtime teardown SHALL release its coordination state. The API SHALL NOT require a resident service or network listener and SHALL NOT modify worktree attachment authority. Live requests SHALL change Current color only, not the invocation's initial-color replacement policy or saved Default color.

#### Scenario: A request expires before application
- **WHEN** a set request times out or its target stops before accepting it
- **THEN** the caller SHALL receive a failure rather than a successful applied response
- **AND** the expired request SHALL NOT later change a resumed or replacement session

#### Scenario: Replace a session with a pending request
- **WHEN** a session replacement commits before an old-identity request is applied
- **THEN** the old request SHALL fail without changing the replacement session's color initialized from the invocation override when present or latest Default color otherwise

#### Scenario: Serialize concurrent changes
- **WHEN** two external callers set different valid colors on one live session concurrently
- **THEN** the runtime SHALL apply them serially and correlate each acknowledgement with that request's identity and applied color
- **AND** a subsequent get SHALL return the final effective color
- **AND** no peer session SHALL change

#### Scenario: Live control does not replace launch policy
- **WHEN** a runtime launched with green accepts an acknowledged live set to pink and subsequently commits a replacement
- **THEN** the current session SHALL adopt pink before set succeeds and the successful replacement SHALL initialize green
- **AND** the invocation policy and saved Default SHALL not be changed by that set

### Requirement: External hosts can discover delivered session-color integration capabilities
A1 SHALL advertise implemented startup-color, native-identity, settings and snapshot operations through the shared API capabilities response. Discovery SHALL return one correlated versioned JSON response without interactive startup, trust prompts, Core probes, reporters, endpoints or resident processes. Discovery SHALL NOT depend on a dedicated color command or a startup compatibility probe.

#### Scenario: Discover a fully delivered installation
- **WHEN** capabilities is requested
- **THEN** it returns a correlated versioned response describing delivered operations and startup/native support

#### Scenario: Do not claim undelivered reporting
- **WHEN** a capability is not implemented
- **THEN** discovery does not advertise it as supported

#### Scenario: Discover outside Core
- **WHEN** a host invokes capabilities without hc or a terminal context
- **THEN** discovery describes delivered support without a Core subprocess or interactive session

### Requirement: Core-hosted bare A1 publishes its ready public color-control identity

Interactive bare A1 with a valid local `HC_TERMINAL_ID` SHALL automatically publish through the supported local `hc label` API the native terminal labels `a1.session`, `a1.runtime`, and `a1.at`. Session SHALL be the complete active session/history UUID accepted by Current-color control; runtime SHALL be the exact runtime UUID used by that endpoint; publication time SHALL be Unix epoch milliseconds. All three SHALL be submitted together only after the endpoint and current binding are available. Identity SHALL NOT be guessed from titles, PIDs, terminal content, transcripts, or private endpoint-record discovery. Comparison and noninteractive modes SHALL NOT publish. Outside a valid Core context A1 SHALL do nothing.

#### Scenario: Start inside Core with a ready endpoint
- **WHEN** bare A1 starts in a valid local Core terminal and its color endpoint becomes available
- **THEN** it SHALL publish all three native labels using the endpoint's complete active history/session and exact runtime identity with a current publication timestamp
- **AND** no optional companion, App, customization tree, extra daemon, or TCP listener SHALL be required

#### Scenario: Fail to start the endpoint
- **WHEN** endpoint startup fails or the active endpoint binding is not available
- **THEN** A1 SHALL NOT publish a newly usable native binding
- **AND** normal interactive use SHALL continue without integration failure becoming startup failure

#### Scenario: Run outside the supported reporting mode
- **WHEN** `HC_TERMINAL_ID` is absent or invalid, or the invocation is comparison or noninteractive
- **THEN** no Core reporting subprocess, heartbeat, or label mutation SHALL be created

#### Scenario: Replace the active session successfully
- **WHEN** new, resume, fork, or import commits a new active session binding
- **THEN** A1 SHALL promptly publish the new complete identity after the color endpoint publishes that binding
- **AND** it SHALL discard superseded generation work rather than advertise an unavailable or earlier session

### Requirement: Ordinary publication contention preserves ordered successor eligibility

For both ordinary and packaged compatible normal-product launches in a valid supported Core terminal, a legitimate predecessor publication that outlasts a short reservation attempt but later settles normally SHALL NOT permanently disable a still-current successor's identity reporting. The successor SHALL retain its ordered eligibility and attempt bounded promotion and endpoint-ready publication on the normal refresh cadence without a relaunch. Only the latest eligible live successor SHALL promote; delayed older startup or retry work SHALL NOT supersede a later intent, reclaim after successor exit or publish before its own current endpoint binding is ready.

Core read/write settlement and exact public-binding ownership checks SHALL remain serialized across runtimes. A predecessor write already in flight SHALL settle before successor publication. Its acknowledged binding SHALL remain available for safe ownership comparison without rolling back newer ownership. Existing participating runtime versions SHALL NOT gain authority to overwrite a successor through record evolution. Persistent locks, unsettled writes, unsafe coordination and partial or foreign native labels SHALL continue to fail closed; eligibility SHALL NOT authorize lock stealing, coordination reset, guessed ownership or label clearing.

#### Scenario: Successor arrives during a normally settling publication
- **WHEN** a predecessor holds its publication fence longer than the initial reservation attempt and then settles normally while an endpoint-ready successor remains the latest eligible runtime
- **THEN** that successor SHALL be able to publish its complete current session/runtime/timestamp binding on the bounded normal cadence without restarting
- **AND** temporary publication contention SHALL NOT permanently remove its reporting path

#### Scenario: A third runtime supersedes a pending successor
- **WHEN** a later runtime establishes newer ordered intent while an earlier successor still awaits publication authority
- **THEN** the earlier pending successor SHALL lose promotion authority permanently
- **AND** settling the predecessor or stopping the later runtime SHALL NOT let the earlier successor reclaim the terminal

#### Scenario: Old publication finishes after new intent
- **WHEN** a predecessor write is already in flight when a successor establishes intent
- **THEN** successor publication SHALL wait for verified settlement and retain the exact acknowledged predecessor binding needed for ownership comparison
- **AND** predecessor completion SHALL NOT restore an older owner or overwrite a binding already published by a promoted successor

#### Scenario: Pending startup is disposed
- **WHEN** a successor stops before obtaining publication authority
- **THEN** its pending promotion and scheduled integration work SHALL be cancelled
- **AND** it SHALL neither publish later nor clear another runtime's labels

#### Scenario: Coordination cannot prove safe promotion
- **WHEN** an existing or older-format coordination record, retained lock, unsettled child write or public labels cannot establish safe ownership
- **THEN** A1 SHALL leave the uncertain state untouched and keep normal interactive use available
- **AND** no timeout, label age or unavailable old color endpoint SHALL authorize a takeover

### Requirement: Ready compatible bindings support existing membership-driven color consumers

A supported packaged compatible session SHALL expose its ready identity and acknowledged Current-color API through the same producer contract as ordinary normal-product A1. Moving its tab between spaces on the same machine SHALL NOT require a producer restart, focus change or alternative API path. An existing host consumer using current membership, fresh complete native identity, exact session/runtime checks and expiring requests SHALL be able to address that session with the destination's named color after membership and adoption metadata agree. Local and connected Core-only remote contexts SHALL use their respective machine's supported A1 API without a companion installation.

The producer SHALL retain the existing identity, expiry, ambiguity, replacement and post-application acknowledgement protections. Consumer freshness and membership checks SHALL NOT be weakened to admit stale native identity. This contract SHALL NOT claim an atomic transaction between a host membership check and a later color application, or automatic first-frame host coloring for an arbitrary manually invoked wrapper.

#### Scenario: Move an inactive compatible tab on one machine
- **WHEN** a ready compatible session's inactive tab moves from one fixture space to another on the same machine and current membership and adoption labels agree
- **THEN** the existing supported consumer path SHALL be able to apply the destination named color to that session and receive its acknowledged applied color
- **AND** focus, peer sessions, saved Default color and invocation replacement policy SHALL remain unchanged

#### Scenario: Route a connected Core-only machine
- **WHEN** that ready compatible session runs on a connected remote Core-only machine
- **THEN** its native identity and supported color commands SHALL be usable through the existing per-machine routing contract
- **AND** no remote App, customization tree or companion SHALL be required by the producer

#### Scenario: Captured membership is no longer current
- **WHEN** the consumer rechecks an expired, stale, partial, moved-again or membership-unacknowledged captured target before requesting application
- **THEN** that capture SHALL NOT authorize a color write or selection of another session
- **AND** native identity precedence and existing freshness limits SHALL remain unchanged

#### Scenario: Session replacement wins over a pending color request
- **WHEN** a compatible session commits replacement before an old-binding color request is admitted
- **THEN** the request SHALL fail without recoloring the replacement
- **AND** newly advertised identity SHALL follow endpoint readiness for the replacement binding

### Requirement: Core identity reporting is bounded and fenced across runtimes
Reporting SHALL refresh approximately every 30 seconds, serialize publication/shutdown, coalesce replacement triggers and use bounded literal subprocess calls. Missing Core and unsafe coordination SHALL NOT break normal interactive use. Cross-runtime fencing SHALL prevent superseded publication and cleanup from overwriting or clearing newer bindings, including after a successor exits. Shutdown SHALL stop subscriptions/timers and clear only verifiably owned complete native bindings. Labels that A1 does not verifiably own SHALL remain untouched. Unverifiable ownership and unsettled writes SHALL fail closed; no atomic protection against arbitrary noncooperating writers is claimed.

#### Scenario: A successor binds the same terminal
- **WHEN** a newer runtime supersedes an older reporter
- **THEN** queued old publication and disposal cannot overwrite or clear the newer binding or reclaim after it exits

#### Scenario: Refresh at a bounded cadence
- **WHEN** a reporter remains active
- **THEN** ordinary publication uses the bounded cadence without overlapping queues

#### Scenario: Dispose during publication
- **WHEN** shutdown starts during publication
- **THEN** settlement and ownership-checked cleanup remain bounded and timers stop

#### Scenario: Observe partial or foreign labels during cleanup
- **WHEN** native ownership cannot be proved
- **THEN** cleanup leaves the labels untouched

#### Scenario: Resolve a command on Windows or Unix
- **WHEN** a reporter invokes the supported local Core command
- **THEN** bounded literal executable/argument resolution handles supported installations without shell interpolation

#### Scenario: Bound reporter failure
- **WHEN** Core resolution, publication or settlement fails
- **THEN** bounded reporting fails safely without breaking the agent or accumulating replay work
