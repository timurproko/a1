# session-color-control Specification

## Purpose
TBD - created by archiving change session-accent-colors. Update Purpose after archive.

## Requirements

### Requirement: External applications can list colors and control one live session

A1 SHALL expose a documented local JSON process-invocation API through `a1 session color list`, `a1 session color get --session <id>`, and `a1 session color set <color> --session <id>`. These API commands SHALL always return exactly one JSON success or error object on stdout without requiring a `--json` flag. Success SHALL exit zero and errors SHALL exit nonzero; progress and diagnostics SHALL NOT contaminate the JSON response stream. Ordinary CLI help MAY remain human-readable. Inventory SHALL return exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in that order without requiring a live session or reading the configured startup default. Get SHALL return the targeted live session identity and effective Current color. Set SHALL use the same authoritative session-local Current color change path as Settings and return the identity and effective color applied for that request only after the live interface adopts it. Neither get nor set SHALL change the persisted Default color. Inventory SHALL return colors only rather than a hard-coded default that could misrepresent the configured startup preference.

Outside an exact A1 shell runtime environment, get and set SHALL require an explicit complete session id. Within that environment, omission MAY select only the exact environment session/runtime identity. Missing, malformed, ambiguous, stale, stopped, unverifiable, replaced, and comparison-profile targets SHALL fail explicitly without changing any session. No operation SHALL infer a machine-wide current, first, last, or only session. Unknown colors SHALL fail without mutation. Help, capability discovery, and integration documentation SHALL describe stable JSON success/error shapes and exit statuses.

#### Scenario: List available colors without an active agent
- **WHEN** an external application invokes the JSON inventory command without a running session
- **THEN** it SHALL receive the ordered seven-color inventory with a successful exit status

#### Scenario: JSON is the default API output
- **WHEN** an application invokes list, get, or set without an output-format flag
- **THEN** stdout SHALL contain exactly one parseable JSON success or error object without progress or human-readable prefixes
- **AND** the exit status SHALL distinguish success from failure

#### Scenario: Herdr reads and changes one of two live sessions
- **WHEN** Herdr gets session A's color, sets session A to pink, and gets session A again while session B uses the same profile
- **THEN** set SHALL acknowledge pink only after session A applies it and the subsequent get SHALL report pink
- **AND** session B and all profile settings documents SHALL remain unchanged
- **AND** session A's Settings SHALL show pink as its Current color
- **AND** the persisted Default color SHALL remain unchanged

#### Scenario: Settings changes are externally visible
- **WHEN** the reader accepts green through session A's Settings and an external application gets session A's color
- **THEN** the API SHALL return green from the same authoritative state rather than a saved profile value

#### Scenario: Reject an implicit external target
- **WHEN** an external application invokes get or set without an explicit selector or exact shell runtime identity
- **THEN** the command SHALL return a documented JSON error and nonzero exit status without choosing any live session

#### Scenario: Reject an invalid color or unavailable target
- **WHEN** an application supplies an unknown color or a malformed, ambiguous, stale, stopped, replaced, unverifiable, or comparison-profile session target
- **THEN** the command SHALL return a documented JSON error and nonzero exit status
- **AND** every live session color SHALL remain unchanged

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

A1 SHALL expose the noninteractive command `a1 session color capabilities`. The fully delivered integration SHALL return exactly `{"version":1,"launchColor":true,"terminalIdentity":true}` followed by one newline on stdout and exit zero. `launchColor` SHALL mean invocation-scoped startup color support is delivered; `terminalIdentity` SHALL mean automatic supported Core terminal identity reporting is delivered. A capability SHALL NOT be advertised as true before its implementation is delivered. Discovery SHALL describe installed support independently of a current Core connection and SHALL NOT initialize an interactive profile/session, prompt for project trust, start the color endpoint/reporter, probe Core, or create a resident process. Existing list/get/set syntax, JSON shapes, exit semantics, and post-application acknowledgements SHALL remain unchanged.

#### Scenario: Discover a fully delivered installation
- **WHEN** a host invokes `a1 session color capabilities` on an installation implementing both features
- **THEN** stdout SHALL contain exactly the version-1 both-true JSON object and one trailing newline with exit status zero
- **AND** no interactive session, trust prompt, endpoint, reporter, or resident process SHALL start

#### Scenario: Do not claim undelivered reporting
- **WHEN** an installation delivers startup override support but has not delivered automatic Core reporting
- **THEN** its discovery SHALL NOT advertise `terminalIdentity` as true
- **AND** discovery SHALL retain the version-1 boolean schema and clean JSON output

#### Scenario: Discover outside Core
- **WHEN** a supporting installation is probed without `hc`, without a terminal context, or with unavailable Core
- **THEN** discovery SHALL still describe delivered support without launching a Core subprocess
- **AND** list/get/set SHALL retain their existing responses and acknowledgement behavior

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

### Requirement: Core identity reporting is bounded and ownership-safe across runtimes

Reporting SHALL refresh approximately every 30 seconds, serialize in-flight publication and shutdown, and coalesce replacement triggers without creating a rapid poll/retry loop or an unbounded work queue. Subprocesses SHALL use literal executable/argument arrays, finite execution/output/settlement budgets, and supported Windows executable/npm and Unix resolution. Missing `hc`, unavailable Core, invalid terminal/runtime/session identity, failed endpoint startup, and subprocess/coordination failure SHALL NOT break normal A1 use.

An older runtime's heartbeat, delayed initial publication, replacement callback, or shutdown cleanup SHALL NOT overwrite or clear a newer runtime's binding. A1 SHALL establish cross-runtime terminal ownership fencing rather than rely only on an in-process Promise chain or an unguarded public-label read followed by a write. Supersession SHALL permanently revoke older publication authority, including after the successor exits. Unverifiable ownership or unsettled writes SHALL fail closed. Shutdown SHALL stop timers/subscriptions and clear only native labels still verifiably owned by that exact runtime and published binding. Unrelated and legacy `custom.a1.*` labels SHALL remain untouched. This cooperative A1 ownership contract SHALL NOT claim atomic protection against arbitrary noncooperating native-label writers when the Core API provides no conditional write.

#### Scenario: Refresh at a bounded cadence
- **WHEN** a ready reporter remains active while Core is responsive or unavailable
- **THEN** it SHALL attempt ordinary refresh around the 30-second cadence without rapid retries or accumulating overlapping jobs
- **AND** each subprocess and shutdown wait SHALL remain bounded

#### Scenario: A successor binds the same terminal
- **WHEN** a newer runtime supersedes an older reporter on one Core terminal
- **THEN** the older reporter's queued heartbeat, late initial publication, replacement callback, and disposal SHALL NOT overwrite or clear the successor's binding
- **AND** the older reporter SHALL NOT reclaim ownership after that successor exits

#### Scenario: Dispose during publication
- **WHEN** shutdown begins while a Core write or replacement publication is in flight
- **THEN** A1 SHALL stop new scheduled work, serialize bounded settlement and ownership-checked cleanup, and dispose all timers/subscriptions
- **AND** an unsettled or foreign-owned write SHALL NOT authorize deletion or an unsafe successor write

#### Scenario: Observe partial or foreign labels during cleanup
- **WHEN** native labels cannot be proved to match this runtime's owned published binding
- **THEN** A1 SHALL leave those labels unchanged rather than clear them based on session identity alone
- **AND** legacy and unrelated labels SHALL remain unchanged

#### Scenario: Resolve a command on Windows or Unix
- **WHEN** the reporter invokes the supported local Core CLI through a Windows executable/npm installation or Unix executable
- **THEN** terminal selectors and labels SHALL remain literal argument data rather than shell-interpolated text
- **AND** missing commands, nonzero exits, timeout, or output overflow SHALL be contained without failing the agent

#### Scenario: Native labels coexist with a legacy companion
- **WHEN** a Core terminal already has legacy `custom.a1.*` labels and bare A1 publishes native identity
- **THEN** A1 SHALL neither require nor reconfigure the companion nor mutate its labels
- **AND** integration documentation SHALL specify that complete native identity takes precedence, partial native identity fails closed, and legacy fallback requires all three native keys to be absent
