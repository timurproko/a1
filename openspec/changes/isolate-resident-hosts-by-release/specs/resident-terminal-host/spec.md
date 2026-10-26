## MODIFIED Requirements

### Requirement: One authoritative resident server serves each user profile
A1 SHALL run at most one authoritative resident terminal-host server per operating-system user, canonical A1 profile root and immutable release identity on Windows x64, macOS and Linux. Different releases under one profile SHALL use separate hosts. Discovery endpoints and runtime authority SHALL include both canonical profile and immutable release identity, SHALL remain within platform limits, and SHALL honor hermetic overrides without permitting cross-release attachment. A matching protocol generation or displayed version alone SHALL NOT establish release equality. The endpoint SHALL provide discovery, while the owner-only operating-system exclusive registry-writer lease SHALL provide mutation authority within that exact namespace. A starting server SHALL acquire its namespace's lease and increment its durable epoch before it serves. A starter that completes an exact-release handshake with a live server SHALL exit as already running and its caller SHALL join that winner under the existing controller policy. When its endpoint does not answer and its lease cannot be acquired, startup SHALL report blocked recovery, SHALL NOT start a second writer in that namespace, and SHALL NOT signal another namespace's owner. The server SHALL execute no A1, Pi or extension code and SHALL own no pseudoterminal. Configuration and session-storage roots SHALL NOT be changed to implement runtime isolation.

#### Scenario: Two launches race
- **WHEN** two invocations of the same immutable release and profile start concurrently with no matching server running
- **THEN** exactly one server SHALL hold that namespace's writer lease and serve its endpoint
- **AND** the other invocation SHALL join that winner or be refused under the existing controller policy without creating a second server

#### Scenario: Endpoint silent while the lease is held
- **WHEN** the matching release's endpoint does not answer but its registry-writer lease is held
- **THEN** startup SHALL report blocked recovery and use the ordinary direct fallback with its notice without signalling any unverified or different-release process

#### Scenario: Different profiles
- **WHEN** the same release runs under two different canonical profile roots
- **THEN** each SHALL have its own server, registry and tabs without cross-visibility

#### Scenario: Different releases under one profile
- **WHEN** release A already has a host and release B starts under the same profile with the same protocol generation
- **THEN** B SHALL start or attach only to B's host and A's server, holders and children SHALL remain unchanged

#### Scenario: Display version is not immutable identity
- **WHEN** two immutable payload identities have the same displayed version
- **THEN** their resident namespaces SHALL remain distinct

#### Scenario: Wrong-release endpoint
- **WHEN** an override or discovered endpoint responds with another immutable release identity
- **THEN** the caller SHALL refuse that peer without adopting its state, negotiating a cross-release fallback, or signalling its owner

### Requirement: The tab registry is durable and lease-protected
The server SHALL write only its canonical-profile and immutable-release registry while holding that namespace's owner-only OS-exclusive registry-writer lease and current durable epoch. Every mutation SHALL recheck that authority and SHALL commit through durable atomic replacement before acknowledgment. The registry SHALL record its release namespace and each tab's identity, kind, display name and name source, order, cwd, session location, desired state, lifecycle, incarnation, verified holder identity and release, last exit, registry revision, epoch and boot identity. It SHALL NOT store credentials, environment values, prompt text or terminal content. A failed write SHALL NOT be acknowledged and SHALL NOT stop the running tab. A registry or owner marker from another release or the legacy unversioned namespace SHALL NOT be adopted, overwritten or removed by this namespace.

#### Scenario: Server killed right after a tab is created
- **WHEN** creation is acknowledged and the matching server is killed
- **THEN** its replacement SHALL find the tab's session location and holder identity only in the matching release namespace

#### Scenario: Server without the writer lease
- **WHEN** a server lacks its namespace's registry-writer lease or current epoch
- **THEN** it SHALL reject the mutation without writing or acknowledging success

#### Scenario: Registry contents stay non-secret
- **WHEN** a registry is read after tab execution and reattachment
- **THEN** it SHALL contain no token, derived credential, environment value, prompt text or terminal content

#### Scenario: Two release authorities coexist
- **WHEN** two releases serve the same user profile concurrently
- **THEN** each SHALL hold its independent registry lease and epoch without authorizing mutations in the other release's registry

### Requirement: The server heals itself without losing tabs or creating split brain
When a server exits unexpectedly, its attach clients SHALL show a non-blocking reconnecting indication, and a matching client or holder MAY start a replacement through the verified detached recovery path. Starts SHALL be serialized per canonical profile and immutable release identity. The replacement SHALL use the originating release's fixed Node, role-entry and addon custody even after another release activates, acquire only its namespace's released writer lease, increment that namespace's durable epoch, derive expected credentials, verify native identities and incarnations, and readmit only matching-release holders with their holder and child identities unchanged. Gone or unverifiable holders SHALL leave the live set without creating a second session writer. A recorded owner SHALL be signalled only within the requested namespace after exact identity verification; unavailable leases or unverifiable identities SHALL block replacement. The existing three-starts-within-sixty-seconds budget SHALL apply within each namespace; exhausting it SHALL leave holders and children running. Child restart, utility tabs and prewarm creation SHALL retain originating release custody rather than follow the mutable active-release pointer.

#### Scenario: Server killed with no client attached
- **WHEN** a server dies without an attached terminal
- **THEN** its holder SHALL recover that same release and the next launch of that release SHALL reattach its tabs with current screens

#### Scenario: Server killed with two tabs
- **WHEN** a matching server is killed while two tabs stream
- **THEN** its replacement SHALL readmit both matching holders with unchanged holder and child native identities and restore current surfaces

#### Scenario: Start budget exhausted
- **WHEN** a release namespace exhausts its existing automatic server-start budget
- **THEN** its clients SHALL show stopped state with restart and quit actions, its holders and children SHALL keep running, and another release's budget SHALL remain unaffected

#### Scenario: Replacement races
- **WHEN** matching-release client and holder recovery requests race
- **THEN** one replacement SHALL win that namespace's authority and the other requester SHALL join it

#### Scenario: Another release becomes active before recovery
- **WHEN** A's server dies after B becomes the globally active release
- **THEN** A's surviving holders and clients SHALL recover A using A artifacts without attaching to B or modifying B's state

### Requirement: Updates retain the active resident cohort
Installing or activating a release SHALL NOT terminate or migrate already-running servers, holders, tab processes or solo sessions. Resident processes SHALL use immutable release directories. A new launch SHALL select the host for its chosen immutable release, never reuse a different release's host merely because the protocol generation matches. A running older solo session SHALL NOT determine another release's multitab host. Existing unversioned legacy cohorts SHALL remain untouched and SHALL NOT be attach or recovery fallback destinations for new-format releases. Every release referenced by live verified resident processes SHALL remain retained across all namespaces; unreadable state or unavailable identity inspection SHALL remain conservative retention outcomes. A generation mismatch within the selected namespace SHALL use bounded incompatibility/fallback behavior without killing another cohort. Automatic migration, handoff and idle recycling remain outside this change.

#### Scenario: Update mid-turn
- **WHEN** B is installed and activated while A streams a turn
- **THEN** A's server, holder, child and unfinished turn SHALL continue uninterrupted and A's immutable artifacts SHALL remain retained
- **AND** a new B launch SHALL use B's independent host

#### Scenario: Newer client with a different generation
- **WHEN** B launches while a different-generation A host remains running
- **THEN** B SHALL use its own namespace without requiring A to stop or using A as its fallback host

#### Scenario: Recorded resident identity cannot be inspected
- **WHEN** GC cannot inspect a resident identity or safely read release-scoped or legacy state
- **THEN** affected candidate releases SHALL remain retained rather than treating unavailable evidence as proof that no process uses them

#### Scenario: Legacy host is still running
- **WHEN** a new-format release launches beside a legacy unversioned host
- **THEN** it SHALL create or attach its own release namespace without migrating, overwriting, adopting or stopping legacy state or processes

#### Scenario: Older solo remains active
- **WHEN** an older solo process remains running while the user launches a newer installed release in multitab mode
- **THEN** the newer invocation SHALL use its own release's host and SHALL leave the solo process untouched

### Requirement: Resident tabs have non-interactive maintenance commands
A1 SHALL provide the existing `a1 tabs`, `a1 tabs stop <id>`, `a1 tabs stop --all`, `a1 tabs host status`, `a1 tabs host stop` and bounded redacted `a1 tabs doctor` commands scoped to the invoking immutable release and canonical profile. These commands SHALL NOT start an interactive runtime or a server merely to report absence, SHALL verify the terminal-host artifact, and SHALL reject invalid arguments concisely with nonzero status. No operation, including unresponsive-server fallback termination or colliding tab IDs, SHALL adopt, mutate or signal another release's or legacy namespace's processes. Host stop SHALL gracefully stop matching tabs before the matching server, with existing bounded identity-verified termination safeguards. Doctor SHALL exclude secrets, tokens, derived credentials, environment values, prompt journals, draft checkpoints, last screens, private child stderr and terminal content.

#### Scenario: List with no server
- **WHEN** the invoking release has no server but another release does
- **THEN** listing SHALL report no matching running tabs without starting a server or listing the other release's tabs

#### Scenario: Stop one tab
- **WHEN** the user stops a matching tab
- **THEN** the tab SHALL receive graceful shutdown before bounded verified termination, its session SHALL remain resumable, and other tabs and releases SHALL remain unaffected

#### Scenario: Stop the host while the server is unresponsive
- **WHEN** a release-local host stop cannot reach its identity-verified server within the deadline
- **THEN** only that namespace's verified server and holders SHALL be stopped and other namespaces SHALL remain running

#### Scenario: Colliding tab identities
- **WHEN** A and B both contain the same local tab ID and B's stop command targets that ID
- **THEN** only B's tab SHALL be eligible for termination

#### Scenario: Doctor bundle with sensitive recovery data present
- **WHEN** doctor collects a bundle with private recovery data present
- **THEN** it SHALL contain only the selected namespace's bounded structured diagnostics and redacted state, excluding all sensitive recovery content

#### Scenario: Invalid arguments
- **WHEN** a stop command provides neither a tab ID nor the existing stop-all option
- **THEN** it SHALL print a concise diagnostic, exit nonzero and perform no resident-process I/O

### Requirement: Resident presentation capabilities are negotiated and bounded
Structured complete surfaces SHALL be negotiated independently on holder-to-server and server-to-attach connections only after exact release admission. Optional presentation capabilities SHALL NOT authorize attachment across immutable releases. Generation-1 changes SHALL remain additive and respect encoded-frame, nesting, collection, input and decoded-memory limits. Admitted peers without a capability SHALL retain a complete legacy-surface route with an explicit fidelity limitation rather than interpreting structured state as legacy ANSI or automatically restarting tabs. Invalid or oversized state SHALL fail locally with a typed outcome without silent truncation or unbounded allocation.

#### Scenario: Capability differences within an admitted release
- **WHEN** exact-release peers differ in optional structured-surface capability
- **THEN** the connection SHALL use its negotiated complete legacy route or typed incompatibility outcome without claiming repaired parity or terminating tabs to upgrade them

#### Scenario: New attach connects through an old resident cohort
- **WHEN** a newer-release attach encounters an older release's cohort, even if it offers matching generation and surface capabilities
- **THEN** exact release admission SHALL reject cross-release attachment before capability negotiation without terminating existing tabs

#### Scenario: Snapshot exceeds a declared bound
- **WHEN** dimensions, cells, attributes, links or encoded state exceed negotiated bounds
- **THEN** validation SHALL reject before unbounded allocation and preserve the last coherent view or an explicit bounded failure state

### Requirement: Credentials survive server replacement without entering the registry
Clients SHALL authenticate with a random owner-only token scoped to the canonical profile and immutable release. One random owner-only secret outside each namespace's registry SHALL derive that namespace's holder and bridge credentials from tab identity and incarnation. A replacement server SHALL reproduce credentials only from its matching namespace and SHALL adopt a matching-release holder only after credential, pid, native start identity and boot identity verification. Exact release admission SHALL precede optional capabilities. Endpoint, token, secret, lease and registry access SHALL remain owner-only. Unverifiable processes and different-release or legacy namespaces SHALL remain untouched.

#### Scenario: Process identifier reuse
- **WHEN** a recorded holder pid now belongs to an unrelated process
- **THEN** the server SHALL NOT adopt or terminate it and SHALL treat the recorded holder as gone

#### Scenario: Holder survives a server restart
- **WHEN** a server exits while its holder survives and a later launch of that same release recovers it
- **THEN** the matching server SHALL readmit the verified holder and restore its retained screen without adopting another cohort

#### Scenario: Another local user connects
- **WHEN** another operating-system user connects to the endpoint
- **THEN** endpoint access control SHALL refuse that process

#### Scenario: Equal tab identities in two releases
- **WHEN** two release namespaces use the same tab identity and incarnation
- **THEN** their independent secrets and exact release admission SHALL prevent cross-release holder or bridge authority

## ADDED Requirements

### Requirement: Release-isolated hosts preserve shared-session writer exclusion
Host release partitioning SHALL NOT partition the process-owned session-writer lock or new-file reservation protocol. Existing-file authority SHALL continue to use verified OS file identity across profiles, releases and canonical aliases. A release-local registry that lacks another release's live tab SHALL NOT authorize a second writer. Conflict handling SHALL NOT silently fork, migrate, take over or replay a prompt; existing explicit conflict or explicit fork behavior SHALL remain available. A new host SHALL use the same shared profile configuration and session-storage roots selected before runtime partitioning.

#### Scenario: Another release owns the selected session
- **WHEN** A's process holds the writer lock and B selects the same session through any filesystem alias
- **THEN** B SHALL report the existing writer conflict without writing session content or disturbing A

#### Scenario: New-file reservation races across releases
- **WHEN** A and B attempt to create the same new session concurrently
- **THEN** exactly one process SHALL obtain writable admission and the loser SHALL write no session content

#### Scenario: Writer exits before another release resumes
- **WHEN** A's writer has exited and B later selects its session
- **THEN** B MAY acquire the released lock through ordinary verified admission without automatically replaying any interrupted prompt
