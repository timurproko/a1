## MODIFIED Requirements

### Requirement: One authoritative resident server serves each user profile
A1 SHALL run at most one authoritative resident terminal-host server per operating-system user, canonical A1 profile root and immutable release identity on Windows x64, macOS and Linux. Different releases under one profile SHALL use separate hosts. Discovery endpoints and runtime authority SHALL include both canonical profile and immutable release identity, SHALL remain within platform limits, and SHALL honor hermetic overrides without implicit cross-release attachment. A matching protocol generation or displayed version alone SHALL NOT establish release equality. Only the explicit verified profile-workspace source route MAY expose another release's tabs; it SHALL NOT transfer registry authority or admit foreign holders or bridges. The endpoint SHALL provide discovery, while the owner-only operating-system exclusive registry-writer lease SHALL provide mutation authority within that exact namespace. A starting server SHALL acquire its namespace's lease and increment its durable epoch before it serves. A starter that completes an exact-release handshake with a live server SHALL exit as already running and its caller SHALL join that winner under the existing controller policy. When its endpoint does not answer and its lease cannot be acquired, startup SHALL report blocked recovery, SHALL NOT start a second writer in that namespace, and SHALL NOT signal another namespace's owner. The server SHALL execute no A1, Pi or extension code and SHALL own no pseudoterminal. Configuration and session-storage roots SHALL NOT be changed to implement runtime isolation.

#### Scenario: Two launches race
- **WHEN** two invocations of the same immutable release and profile start concurrently with no matching server running
- **THEN** exactly one server SHALL hold that namespace's writer lease and serve its endpoint
- **AND** the other invocation SHALL join that winner or be refused under the existing controller policy without creating a second server

#### Scenario: Endpoint silent while the lease is held
- **WHEN** the matching release's endpoint does not answer but its registry-writer lease is held
- **THEN** startup SHALL report blocked recovery without signalling any unverified or different-release process
- **AND** existing workspace entries SHALL remain visible as recovering or blocked rather than being replaced with an empty workspace

#### Scenario: Different profiles
- **WHEN** the same release runs under two different canonical profile roots
- **THEN** each SHALL have its own server, registry and workspace without cross-visibility

#### Scenario: Different releases under one profile
- **WHEN** release A already has a host and release B starts under the same profile with the same protocol generation
- **THEN** B SHALL start or attach to B's host for new execution and SHALL expose A's open Agents only through verified profile-workspace source routes
- **AND** A's server, holders and working children SHALL remain unchanged until a safe acknowledged handoff

#### Scenario: Display version is not immutable identity
- **WHEN** two immutable payload identities have the same displayed version
- **THEN** their resident namespaces SHALL remain distinct

#### Scenario: Wrong-release endpoint
- **WHEN** an override or discovered endpoint responds with an immutable release identity other than the exact identity selected for that connection
- **THEN** the caller SHALL refuse that peer without adopting its state, negotiating an implicit fallback, or signalling its owner

### Requirement: Updates retain the active resident cohort
Installing or activating a release SHALL NOT terminate or migrate already-running servers, holders, tab processes or solo sessions. Resident processes SHALL use immutable release directories. An ordinary new launch SHALL execute its workspace and new Agents on its selected immutable release while restoring access to the canonical profile's existing resident Agents through explicit verified source routes. Existing source processes SHALL retain their originating release until safe per-Agent handoff after relaunch; a busy Agent SHALL remain running and controllable until an acknowledged quiescent boundary. A running older solo session SHALL NOT determine another release's multitab host and SHALL remain untouched. Existing unversioned legacy cohorts and obsolete private-launch contracts SHALL NOT become executable fallback or automatic migration destinations. Unsupported or unverifiable source cohorts SHALL produce visible recovery entries rather than being silently omitted. Every release referenced by live verified resident processes or an unsettled handoff/checkpoint obligation SHALL remain retained across all namespaces; unreadable state or unavailable identity inspection SHALL remain conservative retention outcomes. A generation mismatch SHALL NOT authorize killing another cohort or silently starting a duplicate session writer.

#### Scenario: Update mid-turn
- **WHEN** B is installed and activated while A streams a turn
- **THEN** A's server, holder, child and unfinished turn SHALL continue uninterrupted and A's immutable artifacts SHALL remain retained
- **AND** a subsequent B workspace SHALL expose that Agent with live control while it finishes on A

#### Scenario: Agent becomes safe to upgrade
- **WHEN** an A Agent exposed in the B workspace reaches an acknowledged quiescent checkpoint
- **THEN** A1 SHALL transfer that logical Agent to B with preserved session identity and recovery state and at most one session writer

#### Scenario: Newer client with a different generation
- **WHEN** B launches while a different-generation A host remains running and no supported source adapter exists
- **THEN** B SHALL leave A running, preserve a visible recovery entry and explain the access or migration limitation without claiming an empty workspace is successful restoration

#### Scenario: Recorded resident identity cannot be inspected
- **WHEN** GC cannot inspect a resident identity or safely read release-scoped, workspace, handoff or legacy state
- **THEN** affected candidate releases SHALL remain retained rather than treating unavailable evidence as proof that no process or recovery obligation uses them

#### Scenario: Legacy host is still running
- **WHEN** a new-format release launches beside an unsupported legacy unversioned host
- **THEN** it SHALL preserve legacy state and processes without adopting or executing an unsupported contract
- **AND** it SHALL report the bounded recovery limitation rather than deleting state or claiming those Agents migrated

#### Scenario: Older solo remains active
- **WHEN** an older solo process remains running while the user launches a newer installed release in multitab mode
- **THEN** the newer invocation SHALL use its own release's host and SHALL leave the solo process and its writer lease untouched

### Requirement: Resident presentation capabilities are negotiated and bounded
Structured complete surfaces SHALL be negotiated independently on holder-to-server and server-to-attach connections only after exact selected-release admission. Optional presentation capabilities SHALL NOT establish release equality or authorize implicit attachment across immutable releases. An explicit verified profile-workspace source route MAY select a retained source release for attach/control only, SHALL authenticate that source's exact identity and namespace before negotiation, and SHALL NOT admit foreign holders or bridges or retarget child execution. Generation-1 changes SHALL remain additive and respect encoded-frame, nesting, collection, input and decoded-memory limits. Admitted peers without a capability SHALL retain a complete legacy-surface route with an explicit fidelity limitation rather than interpreting structured state as legacy ANSI or automatically restarting tabs. Invalid or oversized state SHALL fail locally with a typed outcome without silent truncation or unbounded allocation.

#### Scenario: Capability differences within an admitted release
- **WHEN** exact selected-release peers differ in optional structured-surface capability
- **THEN** the connection SHALL use its negotiated complete legacy route or typed incompatibility outcome without claiming repaired parity or terminating tabs to upgrade them

#### Scenario: New attach connects through an old resident cohort
- **WHEN** a newer-release attach encounters an older release's cohort without a verified workspace source route selecting it
- **THEN** admission SHALL reject that connection before capability negotiation without terminating existing tabs

#### Scenario: Updated workspace views a verified source Agent
- **WHEN** a profile-workspace route explicitly selects and authenticates an existing A Agent while the workspace executes B
- **THEN** the native path SHALL provide the negotiated live surface and controller-attributed input without claiming the Agent already executes B

#### Scenario: Snapshot exceeds a declared bound
- **WHEN** dimensions, cells, attributes, links or encoded state exceed negotiated bounds
- **THEN** validation SHALL reject before unbounded allocation and preserve the last coherent view or an explicit bounded failure state

## ADDED Requirements

### Requirement: Profile workspace continuity is durable and release independent
A1 SHALL preserve the canonical profile's open resident Agent topology across ordinary post-update launches in an owner-only durable workspace independent of release execution namespaces. It SHALL preserve logical tab/session identity, name and name source, user order and selected tab, qualify release-local IDs by source namespace, and serialize workspace mutations under an exclusive lease and current epoch. Source discovery SHALL verify the exact canonical profile/release namespace and native process identities before live routing. Existing supported release-scoped predecessor tabs SHALL be referenced idempotently without modifying their immutable payloads or directly overwriting their registries. Stopped tabs and hidden prewarm SHALL NOT reappear. Workspace metadata SHALL exclude credentials, environment values, prompt/transcript text, drafts and terminal content. Corruption SHALL recover a valid last-good generation or preserve a visible blocked recovery state, never overwrite existing topology with an empty workspace.

#### Scenario: First fixed release finds existing Agents
- **WHEN** B launches for the first time while a supported published predecessor A has three open resident Agents in the same profile
- **THEN** B SHALL expose all three logical tabs and live control through their verified source routes without requiring A to implement the new migration capability
- **AND** new Agent and singleton utility creation SHALL execute on B

#### Scenario: Sources use colliding local tab identities
- **WHEN** two retained releases in the same profile both have a local tab named `tab-1`
- **THEN** the workspace SHALL preserve two distinct logical entries and route actions only to their qualified source

#### Scenario: Two updated terminals launch concurrently
- **WHEN** two B launches discover the same A tabs concurrently
- **THEN** they SHALL converge on one workspace topology without duplicate entries or competing handoff ownership

#### Scenario: Workspace metadata is unreadable
- **WHEN** no valid workspace generation can be recovered
- **THEN** A1 SHALL preserve the evidence and show blocked recovery without stopping Agents or committing an empty replacement

### Requirement: Agent upgrade requires a durable quiescent handoff
After relaunch, A1 SHALL schedule supported resident Agent migration independently to the verified selected release. A working Agent SHALL remain running and controllable until its source atomically freezes all new input admission and acknowledges a safe checkpoint with no active turn/tool, unresolved UI interaction or unpreserved queued/runtime state. A sampled idle status SHALL NOT authorize termination. The checkpoint SHALL preserve synchronized session entries, cwd/session identity, draft and attachment recovery, submission/queued-input identity, session configuration and supported runtime state. Unsupported state SHALL defer migration visibly. A durable transaction SHALL bind source and target identities, epochs/incarnations, logical Agent identity and private checkpoint references before source exit. Source automatic restart SHALL be fenced before release. Target writing SHALL require verified exit of the prior child/tree and acquisition of the existing profile-neutral OS writer lease. Destination commit SHALL follow verified target readiness, and SHALL preserve one visible logical tab without automatic replay of dispatched or uncertain submissions.

#### Scenario: Busy Agent and idle Agent coexist
- **WHEN** B relaunches with one A Agent streaming and another eligible for handoff
- **THEN** the busy Agent SHALL keep its process identity, turn and live input/output while the idle Agent upgrades independently
- **AND** the busy Agent SHALL upgrade only after acknowledging its own safe checkpoint

#### Scenario: Input arrives as idle status changes
- **WHEN** a source reports idle and another controller submits work before quiesce acknowledgement
- **THEN** the source SHALL either admit the work and defer migration or preserve it under the frozen admission barrier
- **AND** A1 SHALL NOT terminate the Agent based on the earlier idle report

#### Scenario: Draft and queued input survive transfer
- **WHEN** an eligible Agent has an unsent draft and durable undispatched queued input
- **THEN** the target SHALL restore their identity and contents according to the checkpoint without duplicating a dispatched prompt

#### Scenario: First-turn session file has not been created
- **WHEN** transfer concerns a reserved session identity whose private journal exists before Pi creates the file
- **THEN** A1 SHALL preserve that reservation and journal rather than inventing another session or replaying uncertain work

#### Scenario: Predecessor lacks safe-handoff support
- **WHEN** an existing source supports live attach/control but cannot acknowledge checkpoint and restart fencing
- **THEN** its Agent SHALL remain accessible with a pending migration reason and SHALL NOT be killed from a status snapshot
- **AND** target resumption SHALL require verified source exit and ordinary exclusive writer admission

### Requirement: Interrupted upgrades reconcile without losing or duplicating Agents
Every handoff SHALL have one durable identity, fenced ownership and retry-safe phases. Recovery SHALL reconcile source/target process identities, registry epochs, restart fences, checkpoint disposition and writer leases before issuing another launch or changing the workspace destination. Failure before source release SHALL preserve or restore source admission. Failure after release SHALL retain the logical tab with retry or verified source-resume recovery, and SHALL NOT allow source and target writers to race. A ready target discovered after a client or coordinator crash SHALL be reconnected rather than duplicated. Another activation SHALL NOT rewrite an in-flight transaction's exact target. Deadlines SHALL produce visible per-tab pending/blocked outcomes without stalling unrelated input. All source/target artifacts and private recovery obligations SHALL remain held until safe settlement, including periods with no live process.

#### Scenario: Coordinator dies after target launch
- **WHEN** the target writer starts and the coordinator exits before committing its destination
- **THEN** the next launch SHALL verify and reconnect that target and commit one logical tab without starting a second writer

#### Scenario: Target launch fails after source exit
- **WHEN** source exit is verified but target readiness fails
- **THEN** the workspace SHALL retain the Agent and its checkpoint with actionable retry or verified source resume
- **AND** it SHALL neither omit the Agent nor automatically resend an uncertain submission

#### Scenario: Source attempts late crash recovery
- **WHEN** an old holder or server attempts to restart an Agent after its transfer fence is committed
- **THEN** the fence and writer authority SHALL prevent a competing source writer

#### Scenario: Cleanup runs between writers
- **WHEN** GC runs after source exit but before the handoff is committed or safely rolled back
- **THEN** it SHALL retain both bound release roots and required checkpoints even when no Agent process is currently live

#### Scenario: Another update activates during handoff
- **WHEN** C activates while an A-to-B transfer remains unsettled
- **THEN** recovery SHALL finish or safely block that exact A-to-B transfer before scheduling a separate move to C
- **AND** no actor SHALL replace the bound target or discard the logical Agent
