## ADDED Requirements

### Requirement: External applications can list colors and control one live session

A1 SHALL expose a documented local JSON process-invocation API through `a1 session color list --json`, `a1 session color get --session <id> --json`, and `a1 session color set <color> --session <id> --json`. Inventory SHALL return exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in that order and identify blue as the default without requiring a live session. Get SHALL return the targeted live session identity and effective color. Set SHALL use the same authoritative session-local change path as Settings and return the identity and effective color applied for that request only after the live interface adopts it.

Outside an exact A1 shell runtime environment, get and set SHALL require an explicit complete session id. Within that environment, omission MAY select only the exact environment session/runtime identity. Missing, malformed, ambiguous, stale, stopped, unverifiable, replaced, and comparison-profile targets SHALL fail explicitly without changing any session. No operation SHALL infer a machine-wide current, first, last, or only session. Unknown colors SHALL fail without mutation. Help, capability discovery, and integration documentation SHALL describe stable JSON success/error shapes and exit statuses.

#### Scenario: List available colors without an active agent
- **WHEN** an external application invokes the JSON inventory command without a running session
- **THEN** it SHALL receive the ordered seven-color inventory and blue default with a successful exit status

#### Scenario: Herdr reads and changes one of two live sessions
- **WHEN** Herdr gets session A's color, sets session A to pink, and gets session A again while session B uses the same profile
- **THEN** set SHALL acknowledge pink only after session A applies it and the subsequent get SHALL report pink
- **AND** session B and all profile settings documents SHALL remain unchanged
- **AND** session A's Settings SHALL show pink as its effective value

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

Runtime routing SHALL use private local coordination with bounded records, safe filesystem boundaries, atomic publication, correlated requests and acknowledgements, and verified process/session identities. Product color policy SHALL remain outside neutral foundation coordination. Set requests SHALL serialize in the target runtime and SHALL recheck identity before applying. A queued request SHALL NOT be reported as applied. Timeout, disposal, or replacement SHALL expire outstanding requests so they cannot mutate a later session. Runtime teardown SHALL release its coordination state. The API SHALL NOT require a resident service or network listener and SHALL NOT modify worktree attachment authority.

#### Scenario: A request expires before application
- **WHEN** a set request times out or its target stops before accepting it
- **THEN** the caller SHALL receive a failure rather than a successful applied response
- **AND** the expired request SHALL NOT later change a resumed or replacement session

#### Scenario: Replace a session with a pending request
- **WHEN** a session replacement commits before an old-identity request is applied
- **THEN** the old request SHALL fail without changing the replacement session's blue color

#### Scenario: Serialize concurrent changes
- **WHEN** two external callers set different valid colors on one live session concurrently
- **THEN** the runtime SHALL apply them serially and correlate each acknowledgement with that request's identity and applied color
- **AND** a subsequent get SHALL return the final effective color
- **AND** no peer session SHALL change
