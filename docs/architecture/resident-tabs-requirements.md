# Resident tabs — target requirements

Status: remaining certification target. These are the requirements still owned by the final resident certification milestone in [`resident-tabs.md`](resident-tabs.md#roadmap). They are written as OpenSpec deltas against the canonical specs as of 2026-10-10. Each milestone change copies the requirements it implements into its own `specs/` delta, adjusts them to what it actually delivers, and removes them from this file, so this file shrinks to empty as the preview lands. Requirements here bind nothing until a milestone change merges them.

## Capability: `resident-terminal-host`

### Purpose

Defines the resident capability (Windows x64, Linux x64, macOS arm64) that keeps bare-A1 tabs alive independently of any terminal: the native resident server, per-tab session holders, and attach client, together with their protocols, controller attribution, durable registry, writer authority, derived credentials, detachment, crash/reboot recovery, limits, diagnostics, and preview certification.

### ADDED Requirements

#### Requirement: One authoritative resident server serves each user profile
A1 SHALL run at most one authoritative resident terminal-host server per operating-system user and canonical A1 profile root. Its endpoint SHALL be derived from the canonical profile home and runtime directory, SHALL be independent of the release cohort, and SHALL honor hermetic overrides. The endpoint SHALL provide discovery, while an owner-only operating-system exclusive registry-writer lease SHALL provide mutation authority. A starting server that completes a handshake with a live server SHALL exit as already running and its caller SHALL join the winner. After a failed handshake, the starter SHALL verify and terminate the recorded native owner before acquiring the released lease; if ownership or lease acquisition cannot be verified, startup SHALL fail closed. A server SHALL mutate the registry or remove its endpoint/marker only while it holds the lease and the durable epoch remains current. The server SHALL execute no A1, Pi, or extension code and SHALL own no pseudoterminal.

##### Scenario: Two launches race
- **WHEN** two bare `a1` invocations of one profile start concurrently with no server running
- **THEN** exactly one server SHALL bind and both clients SHALL attach to it

##### Scenario: Stale endpoint with verified owner
- **WHEN** the endpoint does not answer and its recorded native owner verifies
- **THEN** the starter SHALL terminate that exact owner, acquire its released writer lease, increment the epoch, and only then reclaim the endpoint

##### Scenario: Stale endpoint with unverifiable owner
- **WHEN** the endpoint does not answer but its recorded owner or writer lease cannot be verified
- **THEN** A1 SHALL report recovery blocked and SHALL NOT start a second writer

##### Scenario: Different profiles
- **WHEN** bare A1 runs with two different profile roots
- **THEN** each SHALL have its own server, registry, and tabs without cross-visibility

#### Requirement: Each tab is owned by its own session holder
Each tab SHALL be owned by exactly one native session holder process that creates and owns that tab's pseudoterminal (ConPTY on Windows), child process tree, and retained libghostty-vt terminal model with bounded scrollback, and that encodes input for the child's current terminal modes. Holders SHALL keep parsing child output whether or not any client views the tab. A holder exit SHALL affect only its tab. A server exit SHALL NOT terminate holders, their children, or their retained models. At most one live tab SHALL own a given Pi session file.

##### Scenario: Server killed
- **WHEN** the server process is killed while tabs stream
- **THEN** every holder, child process, and retained screen SHALL continue unaffected

##### Scenario: Holder panics
- **WHEN** one holder fails on malformed output
- **THEN** only its tab SHALL enter crash recovery and other tabs SHALL continue

##### Scenario: Open a held session
- **WHEN** a session file already owned by a live tab is selected
- **THEN** A1 SHALL focus that tab and SHALL NOT start a second tab on the file

#### Requirement: Resident processes start outside terminal containment
The server and every holder SHALL be started through an authenticated fixed-role native resident-launch path outside the launching terminal's console and launch-instance containment. The path SHALL verify the immutable terminal-host artifact, requested role, canonical profile and request authority, SHALL NOT accept arbitrary executable/argv escape requests, and SHALL NOT enable job-wide or silent breakaway on ordinary launch-instance or tab-child jobs. On Windows it SHALL support bounded native creation outside foreign kill-on-close jobs, including WMI where necessary; on macOS and Linux it SHALL start resident roles in a new session without a controlling terminal so terminal close and hang-up do not reach them, and on macOS it SHALL keep them in the user's per-user bootstrap namespace. It and SHALL verify resulting process identity and containment before announcing resident readiness. It SHALL record the observed mode and failures. When survival cannot be established, A1 SHALL use direct fallback with one notice and preserve existing records rather than claim persistence. This lifecycle boundary SHALL NOT claim to sandbox malicious same-user code.

##### Scenario: Close Windows Terminal
- **WHEN** the Windows Terminal window running bare `a1` is closed
- **THEN** the server, holders, and tab processes SHALL keep running and a later `a1` SHALL reattach

##### Scenario: Close a macOS or Linux terminal or lose SSH
- **WHEN** the terminal or SSH session running bare `a1` on macOS or Linux closes or hangs up
- **THEN** the server, holders, and tab processes SHALL keep running and a later `a1` SHALL reattach

##### Scenario: Launch inside a kill-on-close job
- **WHEN** bare `a1` starts inside a job that kills its processes on close, such as a Windows OpenSSH session
- **THEN** the server SHALL start outside that job and survive the session's end, or A1 SHALL refuse resident readiness and use the direct fallback with a notice

##### Scenario: Ordinary descendants stay contained
- **WHEN** an ordinary process in the bare-A1 launch instance or a tab-child tree tries to leave its containment, such as `CREATE_BREAKAWAY_FROM_JOB` on Windows
- **THEN** A1 SHALL NOT grant escape, and a normal contained child SHALL still terminate with its owning tree

##### Scenario: Resident launch request names an arbitrary executable
- **WHEN** a request supplies an unapproved executable, role, profile or request identity to the resident-launch path
- **THEN** native admission SHALL reject it without spawning a process

##### Scenario: Contained client requests server recovery
- **WHEN** the server dies while a verified attach client remains in its ordinary kill-on-close job
- **THEN** the authorized native recovery path SHALL start a verified replacement outside that job without broadening the client's job permissions

#### Requirement: The native binary owns the complete terminal data path
Pseudoterminal output, child input, retained terminal state, input encoding, composition, and outer-terminal writes SHALL remain inside the native terminal-host binary's attach, server, and holder roles. Node SHALL NOT read, relay, parse, or render tab terminal bytes. The attach client SHALL answer no terminal queries on a child's behalf; the holder's model SHALL answer them. The attach client SHALL compose the strip row and the viewed tab's surface, SHALL offset mouse coordinates by the strip, SHALL forward clipboard writes, hyperlinks, and cursor shape from the child, SHALL NOT forward bells, and SHALL restore every outer terminal mode it enabled when it detaches or fails.

##### Scenario: Child enables enhanced keyboard reporting
- **WHEN** an A1 tab enables an enhanced keyboard protocol and the outer terminal supports it
- **THEN** keys SHALL reach the child encoded for its mode and tab shortcuts SHALL still be intercepted

##### Scenario: Attach client crashes
- **WHEN** the attach client exits abnormally
- **THEN** the outer terminal SHALL be restored by the surviving-owner path even when forced termination prevents in-process fatal hooks, and every tab SHALL continue

#### Requirement: Host topology mutations are revisioned and atomic
Client/server topology messages SHALL use the generation-1 protocol established by `resident-tabs-contracts`. A topology subscription SHALL begin with one complete snapshot and monotonic revision, followed by ordered changes. Every create, rename, reorder, close, retry, fresh-start, and stop-all mutation SHALL carry its expected topology or registry revision and SHALL either commit completely at the next revision or be rejected without a partial change. A method absent from an older same-generation server SHALL disable only that operation.

##### Scenario: Two clients mutate one revision
- **WHEN** two clients submit topology mutations against the same expected revision
- **THEN** at most one SHALL commit, the stale mutation SHALL receive a typed revision conflict, and every client SHALL converge on the committed topology

##### Scenario: Newer client calls an unavailable method
- **WHEN** a newer same-generation client attaches to an older server that lacks one optional topology method
- **THEN** attachment and unrelated operations SHALL remain available while only that method is disabled

#### Requirement: Reattach renders from retained terminal state
Viewing a tab SHALL deliver a complete retained surface of cells, attributes, hyperlinks, cursor, and modes, followed by patches against its revision. Output produced while no client viewed the tab SHALL be present because the holder's model absorbed it. Logs or replayed byte streams SHALL NOT be used to reconstruct a screen. Only viewed tabs SHALL stream surfaces to a client; status and attention SHALL stream for all tabs.

##### Scenario: Reattach after hours detached
- **WHEN** a client views a tab that produced output for hours while detached
- **THEN** it SHALL render the tab's current screen immediately without replaying the history

#### Requirement: The tab registry is durable and lease-protected
The server SHALL write the per-profile registry only while holding the owner-only OS-exclusive writer lease and current durable epoch. Every mutation SHALL recheck that authority and commit through a temporary file, write-capable file sync, atomic rename, and directory sync before acknowledgement. The registry SHALL record each tab's identity, kind, display name and name source, order, cwd, session location, desired state, lifecycle, attention and seen positions, verified holder identity/incarnation/release, controller revision, credential-derivation inputs, restart budget, last exit, registry revision, epoch, and boot identity, and SHALL retain bounded history generations. It SHALL NOT store derived credentials, environment values, prompt text, or terminal content. An unreadable registry SHALL be quarantined, the last good generation loaded, and a notice shown; if existing state has no valid recoverable generation, recovery SHALL fail closed with preserved files rather than initialize an empty registry; persistent write failure SHALL preserve live observed state in memory, reject new durable mutations without acknowledging success, and report degraded health. A failed mutation SHALL NOT become a committed revision merely because it exists in memory.

##### Scenario: Server killed right after a rename
- **WHEN** a rename is acknowledged and the server is then killed
- **THEN** the next server SHALL present the new name

##### Scenario: Corrupt registry
- **WHEN** the registry cannot be parsed
- **THEN** the server SHALL quarantine it, load the last good generation, and name both in a notice

##### Scenario: No valid registry history remains
- **WHEN** an existing registry and all retained generations fail validation
- **THEN** startup SHALL report blocked recovery, preserve the evidence, and SHALL NOT overwrite it with an empty tab set

#### Requirement: Credentials survive server replacement without entering the registry
Clients SHALL authenticate with a random owner-only client token. One random owner-only profile secret stored outside the registry SHALL derive holder and bridge credentials from tab identity and process incarnation. A replacement server SHALL reproduce the expected credential from the secret and recorded non-secret inputs, then also verify pid and native start identity before admission. Endpoint, token, secret, lease, registry, journal, and recovery-file access SHALL be restricted to the owning user. The server SHALL adopt, signal, or terminate a process only after verifying credential, recorded native identity, incarnation, and current epoch, and SHALL leave unverifiable processes untouched and reported.

##### Scenario: Process identifier reuse
- **WHEN** a recorded holder identifier now belongs to an unrelated process
- **THEN** the server SHALL NOT adopt or terminate it and SHALL treat the tab's holder as gone

##### Scenario: Another local user connects
- **WHEN** a process of another operating-system user connects
- **THEN** endpoint access control SHALL refuse it

#### Requirement: Updates retain the active resident cohort
Installing or activating a release SHALL NOT terminate the server, holders, or tab processes. Resident binaries and tab processes SHALL run from immutable release directories, and every release used by a live verified resident process SHALL be retained. In this version a same-generation newer client MAY attach with unsupported optional operations disabled, while the existing resident cohort remains on its release until all tabs stop. A generation mismatch SHALL report that the host must be stopped explicitly and SHALL NOT kill or recycle tabs. Automatic endpoint handoff and idle release recycling require a later change.

##### Scenario: Update mid-turn
- **WHEN** `a1 update` runs while a tab streams
- **THEN** the turn and resident process identities SHALL remain uninterrupted and their immutable release SHALL remain retained

#### Requirement: Resident tabs have non-interactive maintenance commands
A1 SHALL provide `a1 tabs` to list tabs with identity, name, status, and cwd; `a1 tabs stop <id>` and `a1 tabs stop --all`; `a1 tabs host status` and `a1 tabs host stop`, which stops tabs gracefully before the server; and `a1 tabs doctor`, which creates a bounded redacted diagnostic bundle. These commands SHALL NOT start an interactive runtime, SHALL NOT start a server merely to report that none runs, and SHALL fail concisely with nonzero status on invalid arguments.

##### Scenario: List with no server
- **WHEN** the user runs `a1 tabs` and no server runs
- **THEN** A1 SHALL report no running tabs and SHALL NOT start a server

#### Requirement: Resident support is packaged, certified, and reversible
The terminal-host binary SHALL ship for Windows x64, Linux x64, and macOS arm64 with artifact hashes, pinned source provenance, licenses, notices, and immutable-release placement verified before execution. Bare `a1` SHALL use tabs on supported builds, and each platform SHALL require exact-package automated suites plus manual or isolated-worker physical evidence for terminal closure, remote-session loss, input fidelity, extension text UI, recovery, and rendering. Physical automation SHALL NOT run on an active workstation. Explicit `a1 solo` SHALL run the direct single-agent owned UI without initializing the resident host. When the platform is unsupported or the server cannot start safely, bare `a1` SHALL fall back to that direct path with one notice; registry records and sessions SHALL be preserved. Each additional platform requires a separate approved change and evidence.

##### Scenario: Server cannot start
- **WHEN** the terminal-host binary is missing, unverified, or fails its start budget
- **THEN** bare `a1` SHALL use the direct single-agent path with one notice, preserving records and applying the shared writer-lease check to any selected session rather than bypassing a live writer

## Capability: `resident-tab-reliability`

### Purpose

Defines the remaining reliability verification program that gates preview certification and continued bare-A1 enablement. Milestone 4 delivers crash recovery, liveness/progress supervision, durable recovery data, and diagnostic preservation, but does not implement or certify the `a1 tabs doctor` export; that export remains milestone 6 work.

### ADDED Requirements

#### Requirement: Reliability evidence matches the enablement stage
The server state machine SHALL be implemented independently of I/O and SHALL be exercised by deterministic simulation and property tests that inject arbitrary interleavings of process death, message loss, reordering, delay, stale epochs, controller transfer, client churn, and mutations, asserting that no committed mutation is lost, only one registry writer exists, no session gains two live tabs, client-scoped requests remain attributable, and every desired-running tab converges to running or failed. Every persistence and IPC step SHALL expose a failure-injection point exercised by crash-point tests. Protocol decoders and surface encoders SHALL be fuzzed, and bounded chaos/fault-injection suites on each platform SHALL gate resident certification. Implementation SHALL progress through contracts and platform primitives, one persistent tab, failure isolation, crash recovery, complete UX, and packaged certification, each delivered as its own change; milestones 1–4 remain behind `residentTabs: false`, and milestone 5 removes the toggle, routes bare `a1` through resident tabs, and adds `a1 solo` as the explicit direct path. Evidence is required at each milestone before dependent behavior is enabled. Intermediate demonstrations SHALL NOT count as shipping acceptance. Historical v2/herdr results, Unix-only tests, and pending 2×2 proof records SHALL NOT substitute for exact-package resident evidence on each platform.

Before resident tabs are certified for a platform, a separately authorized isolated-worker soak on that platform of at least 24 hours SHALL exercise ten tabs under high-rate output and random termination of servers, holders, tab processes, and clients, controller and resize churn, blocked writes, pseudoterminal creation hangs, and rename denial. It SHALL assert zero lost journaled prompts, zero lost committed entries, zero orphaned processes, zero duplicate tabs, bounded memory and handle growth, reattach p95 under 300 ms, tab restart under 3 s, and server recovery under 2 s. Each later platform SHALL earn equivalent implementation and exact-package evidence before certification; evidence SHALL NOT be inferred across platforms.

##### Scenario: Always-on tabs change resident code
- **WHEN** resident behavior changes while bare `a1` uses tabs
- **THEN** deterministic, crash-point, fuzz, bounded chaos, and exact-package physical evidence SHALL remain required without inferring certification from the launch default

##### Scenario: Prototype evidence is available
- **WHEN** a reference prototype has a passing benchmark or another platform's detach tests pass
- **THEN** A1's resident milestone and physical verdict on each platform SHALL remain unproven until its own exact-artifact evidence is recorded

##### Scenario: Certification soak detects a leak
- **WHEN** the authorized 24-hour soak observes handle or memory growth beyond the declared bound
- **THEN** certification SHALL remain blocked until the growth is fixed or the bound is explicitly re-justified in a later approved plan

##### Scenario: Simulation finds a duplicate start
- **WHEN** a simulated interleaving produces two live incarnations for one tab
- **THEN** the test SHALL fail with the minimized event sequence

## Capability: `launch-instance-lifecycle`

### MODIFIED Requirements

#### Requirement: A launch instance owns its complete runtime process tree
A launch instance SHALL own its selected root runtime and every agent, extension, tool, daemon, helper, and descendant process created within its declared containment boundary. Default interactive instances SHALL be non-detachable; a process that must survive instance closure requires a separately specified explicit resident capability. The resident terminal host is that explicit capability: its server and session holders SHALL be started only through the authenticated fixed-role native resident-launch path, SHALL be owned and cleaned up by the resident capability rather than by any launch instance, and SHALL NOT expose a generic escape service to other components. Ordinary launch-instance and tab-child jobs SHALL NOT enable job-wide or silent breakaway; native admission SHALL verify artifact, role, profile and request authority before resident creation. This lifecycle boundary SHALL NOT claim to sandbox malicious same-user code.

##### Scenario: Runtime starts descendants
- **WHEN** an owned UI or Pi runtime starts extension daemons, agent workers, tools, or further descendants
- **THEN** those processes SHALL remain members of the originating launch instance and SHALL NOT become unowned background runtime processes

##### Scenario: A component requests implicit detachment
- **WHEN** an instance-owned component attempts to survive the closure of its originating instance without an explicit resident capability
- **THEN** A1 SHALL retain it within terminate-on-close ownership rather than silently detaching it

##### Scenario: Resident tabs outlive a bare-A1 instance
- **WHEN** a bare-A1 attach launch instance closes normally or through terminal loss
- **THEN** A1 SHALL terminate that instance's attach-client process tree and SHALL leave the resident server, holders, and tab processes running

##### Scenario: Processes started inside a tab
- **WHEN** A1 running in a resident tab starts tools or extension subprocesses
- **THEN** those processes SHALL belong to that tab's holder-owned process tree and SHALL be terminated when the tab is stopped

##### Scenario: Ordinary descendant requests job breakaway
- **WHEN** a tool or helper requests `CREATE_BREAKAWAY_FROM_JOB` inside an ordinary A1-owned job
- **THEN** A1 SHALL NOT have enabled a job-wide escape permission for it, and an ordinary contained spawn SHALL remain terminate-on-close

##### Scenario: Forced attach termination
- **WHEN** an attach client is killed without running its own cleanup hooks
- **THEN** the surviving terminal-restoration owner SHALL restore the invoking terminal, while guardians remain lifecycle-only and resident tabs continue

## Capability: `agent-supervision`

### ADDED Requirements

#### Requirement: Cohort updates and retention preserve resident tabs
Cohort update coordination SHALL stop and drain launch instances only. It SHALL NOT terminate the resident terminal-host server, session holders, or tab processes. In this version a compatible resident cohort remains on its immutable release until all of its tabs stop; automatic server handoff and idle-boundary recycling are deferred. Immutable release retention SHALL treat the recorded release of every live verified resident server, holder, and tab process as current ownership, and SHALL NOT collect that release while any such process uses it. A superseded supervisor cohort SHALL retire according to its own launch-instance work regardless of resident tabs.

##### Scenario: Update with resident tabs running
- **WHEN** an update activates a new release while resident processes run from the previous release
- **THEN** supervision SHALL drain the previous cohort's launch instances without terminating resident processes

##### Scenario: Garbage collection with a tab on an old release
- **WHEN** release cleanup evaluates a release still used by a live verified holder or tab process
- **THEN** that release SHALL be retained until the process is recycled or stopped
