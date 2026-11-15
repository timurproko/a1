## MODIFIED Requirements

### Requirement: External applications can list colors and control one live session
A1 SHALL expose Current color through the versioned integration API's session-scoped `accentColor` setting, not dedicated color commands. Descriptor discovery SHALL return exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey` in declaration order without a live session. Reads and updates SHALL require complete explicit session and runtime UUIDs. Updates SHALL use the same application authority as Settings and succeed only after live application. Missing, malformed, stale, replaced, stopped, comparison and unverifiable targets SHALL fail without mutation. Saved Default and invocation replacement policy SHALL remain unchanged by Current edits. The retired `session color` route SHALL NOT remain available.

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

### Requirement: External hosts can discover delivered session-color integration capabilities
A1 SHALL advertise implemented startup-color, native-identity, settings and snapshot operations through the shared API capabilities response. Discovery SHALL return one correlated versioned JSON response without interactive startup, trust prompts, Core probes, reporters, endpoints or resident processes. Hosts SHALL target the coordinated current contract; no old-command fallback or startup compatibility probe is required.

#### Scenario: Discover a fully delivered installation
- **WHEN** capabilities is requested
- **THEN** it returns a correlated versioned response describing delivered operations and startup/native support

#### Scenario: Do not claim undelivered reporting
- **WHEN** a capability is not implemented
- **THEN** discovery does not advertise it as supported

#### Scenario: Discover outside Core
- **WHEN** a host invokes capabilities without hc or a terminal context
- **THEN** discovery describes delivered support without a Core subprocess or interactive session

### Requirement: Core identity reporting is bounded and ownership-safe across runtimes
Reporting SHALL refresh approximately every 30 seconds, serialize publication/shutdown, coalesce replacement triggers and use bounded literal subprocess calls. Missing Core and unsafe coordination SHALL NOT break normal interactive use. Cross-runtime fencing SHALL prevent superseded publication and cleanup from overwriting or clearing newer bindings, including after a successor exits. Shutdown SHALL stop subscriptions/timers and clear only verifiably owned complete native bindings. Unrelated and legacy labels SHALL remain untouched by A1; consumers SHALL accept only complete native `a1.session`, `a1.runtime`, `a1.at` labels, without legacy fallback. Unverifiable ownership and unsettled writes SHALL fail closed; no atomic protection against arbitrary noncooperating writers is claimed.

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

#### Scenario: Native labels coexist with a legacy companion
- **WHEN** native and legacy labels coexist
- **THEN** only complete fresh native identity authorizes consumer control and unrelated labels remain untouched

#### Scenario: Legacy labels remain present
- **WHEN** a terminal has legacy labels but no complete fresh native identity
- **THEN** the consumer leaves it uncontrolled and neither repairs nor deletes labels

#### Scenario: Bound reporter failure
- **WHEN** Core resolution, publication or settlement fails
- **THEN** bounded reporting fails safely without breaking the agent or accumulating replay work
