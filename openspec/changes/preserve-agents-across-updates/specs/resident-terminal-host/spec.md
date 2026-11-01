## MODIFIED Requirements

### Requirement: One authoritative resident server serves each user profile
A1 SHALL run at most one authoritative resident terminal-host server per operating-system user, canonical A1 profile root and immutable execution-release identity on Windows x64, macOS and Linux. Different execution releases SHALL retain separate hosts and authority. Discovery endpoints and runtime authority SHALL include canonical profile and immutable execution identity, remain within platform limits and honor hermetic overrides without implicit cross-release attachment. Matching protocol generation or displayed version SHALL NOT establish release equality. An explicit verified profile-workspace client route MAY select an existing source execution release and SHALL authenticate its exact namespace/identity before optional negotiation without admitting foreign holders or bridges. The endpoint SHALL provide discovery; the owner-only OS-exclusive registry-writer lease and durable epoch SHALL provide mutation authority in that namespace. A starting server SHALL acquire its lease and increment its epoch before serving. Same-source starters SHALL join the verified winner or fail under existing controller policy. An unavailable endpoint/lease SHALL NOT authorize another writer or signalling a different namespace. The server SHALL execute no A1, Pi or extension code and own no pseudoterminal. User profile and session-storage roots SHALL NOT change for isolation or client continuity.

#### Scenario: Two launches race
- **WHEN** two invocations start the same execution release/profile concurrently
- **THEN** exactly one server SHALL hold that namespace's writer lease and the other SHALL join the winner or fail without creating a second writer

#### Scenario: Endpoint silent while the lease is held
- **WHEN** the selected source endpoint does not answer but its registry-writer lease remains held
- **THEN** recovery SHALL preserve existing source state and SHALL NOT signal unverified/different-release processes or overwrite workspace topology with an empty set

#### Scenario: Different profiles
- **WHEN** the same release runs under different canonical profile roots
- **THEN** each SHALL have independent runtime authority and workspace without cross-visibility

#### Scenario: Different releases under one profile
- **WHEN** B's client opens a profile with live A execution
- **THEN** B SHALL reconnect through verified A source routes without restarting A's server, holders or Agents
- **AND** new B execution SHALL use B's own namespace and artifacts

#### Scenario: Display version is not immutable identity
- **WHEN** two immutable payload identities share a displayed version
- **THEN** their execution namespaces SHALL remain distinct

#### Scenario: Wrong-release endpoint
- **WHEN** an endpoint responds with an identity other than the exact source selected for that connection
- **THEN** admission SHALL refuse it without adopting its state, implicit cross-release fallback or signalling its owner

### Requirement: Updates retain the active resident cohort
Installing, activating or reconnecting an updated A1 client SHALL NOT stop, restart, suspend, recreate or wait for idle of existing resident Agents, holders, their active tool processes or source servers merely to apply the update. Busy and idle Agents SHALL retain originating immutable code, live state, process identities and session-writer authority until explicit lifecycle action or independent crash recovery. A selected-release client SHALL reconnect the canonical profile's existing live workspace through verified compatible source routes; new Agent execution SHALL use the selected release. Normal source recovery SHALL retain originating custody rather than follow the mutable client-release pointer. Every live or unsettled workspace/control-recovery reference SHALL retain its required immutable code, dependencies and private recovery artifacts; unreadable evidence or unavailable native identity inspection SHALL remain conservative holds. Unsupported source compatibility SHALL block candidate activation/readiness rather than terminate or hide Agents, create duplicate writers, or present inaccessible tabs as successful restoration. Old solo/external writers and obsolete private-launch contracts SHALL NOT become automatic resident execution/migration destinations.

#### Scenario: Update mid-turn
- **WHEN** B updates in the background while two A Agents work and another is idle
- **THEN** all existing server, holder, Agent and tool process identities SHALL remain unchanged by the update
- **AND** reopening compatible B SHALL provide live view/control of the same three Agents with no idle wait

#### Scenario: Working Agents later become idle
- **WHEN** previously busy A Agents settle after a B client reconnect
- **THEN** they SHALL remain the same live Agents with no delayed update-triggered restart

#### Scenario: Newer client with a different generation
- **WHEN** B cannot provide a compatible control route to live A execution
- **THEN** B SHALL NOT become the active/restart-ready client and a verified eligible prior client SHALL remain callable without ending A

#### Scenario: Recorded resident identity cannot be inspected
- **WHEN** cleanup cannot safely inspect runtime identity or read workspace/runtime/recovery state
- **THEN** it SHALL retain affected releases rather than interpret uncertainty as no live work

#### Scenario: Legacy host is still running
- **WHEN** source records require an unsupported legacy or obsolete private contract
- **THEN** candidate activation SHALL NOT claim successful continuity, execute that contract, delete the records or terminate its processes
- **AND** the existing eligible access path SHALL remain preserved where available

#### Scenario: Older solo remains active
- **WHEN** a new resident client launches beside an old solo process
- **THEN** the solo process and writer lease SHALL remain untouched and SHALL NOT redirect new resident execution

### Requirement: Resident presentation capabilities are negotiated and bounded
Structured complete surfaces SHALL be negotiated independently on holder-to-server and server-to-client connections after exact selected-source admission. Optional capabilities SHALL NOT establish release equality. Only explicit verified workspace routes MAY connect a newer client to existing source execution; they SHALL bind expected release/namespace and preserve controller attribution without admitting foreign holders/bridges or retargeting execution. Generation-1 changes SHALL remain additive and respect existing frame, nesting, collection, input and memory bounds. Admitted peers lacking an optional feature SHALL use a negotiated complete legacy route or typed unsupported outcome, not reinterpret structured state or restart Agents. Invalid/oversized state SHALL fail locally without silent truncation or unbounded allocation. Missing mandatory control compatibility SHALL block client activation rather than strand live execution.

#### Scenario: Capability differences within an admitted release
- **WHEN** admitted source/client peers differ in optional structured-surface capability
- **THEN** they SHALL use a negotiated complete route or typed incompatibility without terminating Agents

#### Scenario: New attach connects through an old resident cohort
- **WHEN** the updated client explicitly selects and verifies a compatible old source through its workspace route
- **THEN** it SHALL provide that source's live surface and controller-attributed input without changing its Agent processes
- **AND** an unselected different-release endpoint SHALL still be refused before optional negotiation

#### Scenario: Snapshot exceeds a declared bound
- **WHEN** state exceeds negotiated encoded/decoded bounds
- **THEN** validation SHALL reject it before unbounded allocation and preserve the last coherent view or explicit bounded failure

## ADDED Requirements

### Requirement: Persistent execution exposes a minimal stable control API
A1 SHALL separate its replaceable terminal client/control plane from the minimal persistent execution component responsible for autonomous Agent work, subprocess/session/live-state custody and runtime API. Client UI, update orchestration and release-selection policy SHALL NOT require execution restart. The API SHALL have a versioned backward-compatible mandatory core for identity, discovery, reconnect, state/event observation, input admission, outstanding interactions and explicit lifecycle actions. Optional behavior SHALL be additive and capability-negotiated. Endpoint access SHALL remain owner-authenticated. Commands SHALL retain stable request, session/incarnation and controller identity with ordered admission and explicit rejected/accepted/uncertain delivery; reconnect SHALL NOT blindly repeat side effects. Observations SHALL be sequenced with a bounded snapshot/resynchronization path. Candidate support SHALL be established by consumer/provider conformance and actual supported predecessor interoperability rather than version numbers alone.

#### Scenario: Client is replaced while execution continues
- **WHEN** all terminal clients close and an updated client later attaches
- **THEN** autonomous Agent work and subprocesses SHALL continue on the persistent side and the new client SHALL reconnect through the stable API without execution replacement

#### Scenario: Optional API capability is added
- **WHEN** the new client offers a capability an old runtime lacks
- **THEN** mandatory view/input/interaction control SHALL remain usable and only the optional capability SHALL be disabled

#### Scenario: Command outcome is uncertain at disconnect
- **WHEN** a client disconnects after a command may have been admitted
- **THEN** reconnect SHALL reconcile its stable request identity or report uncertainty without automatically executing it again

#### Scenario: Required API semantics are incompatible
- **WHEN** the candidate cannot satisfy the mandatory contract of existing live execution
- **THEN** activation SHALL be rejected while the verified usable prior client and execution remain available

### Requirement: Profile workspace continuity is independent of client release
A1 SHALL preserve one owner-only durable workspace per canonical profile independent of client payload identity, under an exclusive workspace lease/current epoch. It SHALL retain logical Agent/session identity, source-qualified runtime/tab/incarnation, name/name source, order and selection without storing credentials, environment values, prompts, transcripts, drafts or terminal content. Existing supported source tabs SHALL be referenced idempotently without modifying immutable code or directly rewriting foreign registries. Closed/stopped tabs and hidden prewarm SHALL NOT reappear. The same live owner SHALL retain unsent drafts/attachments, queued input, session configuration and active dialogs across reconnect. Source local-ID collisions and concurrent relaunch SHALL NOT duplicate or collapse logical Agents. Corrupt topology SHALL recover a valid last-good generation or preserve recovery evidence; an empty replacement SHALL NOT be a successful recovery.

#### Scenario: First fixed launch finds published predecessor Agents
- **WHEN** B opens a profile containing busy and idle Agents created by a supported published predecessor before workspace indexing existed
- **THEN** B SHALL discover and control the same Agents with unchanged holder/child/tool identities and preserved topology without requiring source migration support

#### Scenario: Source tab IDs collide
- **WHEN** two retained sources both contain local `tab-1`
- **THEN** the workspace SHALL retain distinct logical Agents and route each action only to its qualified owner

#### Scenario: Work progresses while detached
- **WHEN** an Agent produces output or waits for permission while the outer terminal is closed
- **THEN** reconnect SHALL show its current live output/interaction and preserved input state without transcript replay or Agent restart

#### Scenario: Concurrent updated launches
- **WHEN** two updated clients reopen the same profile concurrently
- **THEN** they SHALL converge on the same topology and ordinary controller policy without starting replacement Agents for existing sessions

### Requirement: Control-plane recovery preserves execution and retention
Client/coordinator replacement and interrupted activation SHALL reconcile the committed client selection, workspace epoch, source native identities and controller revisions before issuing commands or creating new default Agents. Control handoff SHALL preserve existing causal input barriers without quiescing Agent work or replaying uncertain input. Existing session-writer exclusion SHALL remain profile-neutral and unchanged. Source server/holder recovery SHALL use originating immutable artifacts. Workspace, fallback-client and unsettled control-recovery references SHALL protect code, dependencies and private recovery artifacts until safe custody is established; live source artifacts SHALL remain held throughout execution and recovery. Stale control owners SHALL NOT mutate current topology, relabel input, acquire foreign authority or start duplicate writers.

#### Scenario: Client dies during route handoff
- **WHEN** a client/coordinator exits before or after committing updated route ownership
- **THEN** the next client SHALL reconcile and reconnect existing execution without restarting Agents, duplicating sessions or committing an empty workspace

#### Scenario: Source server independently crashes after client update
- **WHEN** A's server crashes after B becomes the selected client
- **THEN** existing A recovery SHALL restore A's source authority and surviving holders/children without retargeting their execution to B

#### Scenario: Cleanup runs during client replacement
- **WHEN** cleanup observes an updated client with an empty release-local registry but the profile still references live A execution
- **THEN** A's runtime/dependency/recovery artifacts SHALL remain retained and B's empty registry SHALL NOT establish that the profile has no Agents

### Requirement: Federated tab transitions preserve the visible strip contract
The workspace client SHALL preserve one append-last visible order across source releases, hidden prewarm and asynchronous topology/persistence updates. An initializing Agent SHALL retain its appended position when its committed identity arrives. Opening an already visible singleton SHALL activate it in place; revealing a hidden singleton SHALL append it last. Metadata acknowledgements and lifecycle or color transitions SHALL NOT reorder tabs or steal focus. Settings and Changelog SHALL retain their existing slim composition and common selected background without an Agent initialization fill. Toggling an active utility SHALL hide it for reuse, including when it is the only visible tab; explicit Close SHALL remain a distinct instance-removal operation. Active close/hide SHALL prefer the immediate left neighbour, then a surviving right neighbour, or the landing when none remains. Hidden utilities SHALL NOT become automatic fallback views. Source surfaces SHALL be fenced to the requested logical tab and generation so open/close/switch commits expose no stale tab, duplicate chip, blank child frame, or unintended intermediate selection.

#### Scenario: Hidden Settings opens beside existing Agents
- **WHEN** hidden Settings was prewarmed before one or more Agents joined the visible strip and the user opens it
- **THEN** Settings SHALL append after those Agents and become active without revealing its earlier prewarm position

#### Scenario: Initializing Agent and utility overlap
- **WHEN** the user adds an Agent and opens Settings before its first real frame commits
- **THEN** the Agent's appended position SHALL stay before the later Settings tab and its completion SHALL NOT take focus back

#### Scenario: Delayed persistence follows a newer drag or reveal
- **WHEN** an earlier metadata result arrives after a newer visible reorder or utility reveal
- **THEN** that result SHALL NOT overwrite the newer visible order or select an unrelated tab

#### Scenario: The only visible utility is toggled off
- **WHEN** Settings or Changelog is the only visible tab and its toggle is invoked
- **THEN** the client SHALL show the landing, keep the utility hidden for reuse, and allow a later reveal without starting an Agent

#### Scenario: Source frames race close and selection
- **WHEN** a closed or superseded source view produces a late surface while another logical tab is requested
- **THEN** only the requested source/tab/generation SHALL commit and no stale body, chip selection or child cursor SHALL flash before it
