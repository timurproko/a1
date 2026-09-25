## Purpose

Defines the Windows x64 opt-in resident capability that keeps bare-A1 tabs alive independently of any terminal: the native resident server, per-tab session holders, and attach client, together with their protocols, controller attribution, durable registry, writer authority, derived credentials, detachment, crash/reboot recovery, limits, diagnostics, and preview certification.

## ADDED Requirements

### Requirement: One authoritative resident server serves each user profile
A1 SHALL run at most one authoritative resident terminal-host server per Windows user and canonical A1 profile root. Its endpoint SHALL be derived from the canonical profile home and runtime directory, SHALL be independent of the release cohort, and SHALL honor hermetic overrides. The endpoint SHALL provide discovery, while an owner-only operating-system exclusive registry-writer lease SHALL provide mutation authority. A starting server that completes a handshake with a live server SHALL exit as already running and its caller SHALL join the winner. After a failed handshake, the starter SHALL verify and terminate the recorded native owner before acquiring the released lease; if ownership or lease acquisition cannot be verified, startup SHALL fail closed. A server SHALL mutate the registry or remove its endpoint/marker only while it holds the lease and the durable epoch remains current. The server SHALL execute no A1, Pi, or extension code and SHALL own no pseudoterminal.

#### Scenario: Two launches race
- **WHEN** two bare `a1` invocations of one profile start concurrently with no server running
- **THEN** exactly one server SHALL bind and both clients SHALL attach to it

#### Scenario: Stale endpoint with verified owner
- **WHEN** the endpoint does not answer and its recorded native owner verifies
- **THEN** the starter SHALL terminate that exact owner, acquire its released writer lease, increment the epoch, and only then reclaim the endpoint

#### Scenario: Stale endpoint with unverifiable owner
- **WHEN** the endpoint does not answer but its recorded owner or writer lease cannot be verified
- **THEN** A1 SHALL report recovery blocked and SHALL NOT start a second writer

#### Scenario: Different profiles
- **WHEN** bare A1 runs with two different profile roots
- **THEN** each SHALL have its own server, registry, and tabs without cross-visibility

### Requirement: Each tab is owned by its own session holder
Each tab SHALL be owned by exactly one native session holder process that creates and owns that tab's pseudoterminal (ConPTY on Windows), child process tree, and retained libghostty-vt terminal model with bounded scrollback, and that encodes input for the child's current terminal modes. Holders SHALL keep parsing child output whether or not any client views the tab. A holder exit SHALL affect only its tab. A server exit SHALL NOT terminate holders, their children, or their retained models. At most one live tab SHALL own a given Pi session file.

#### Scenario: Server killed
- **WHEN** the server process is killed while tabs stream
- **THEN** every holder, child process, and retained screen SHALL continue unaffected

#### Scenario: Holder panics
- **WHEN** one holder fails on malformed output
- **THEN** only its tab SHALL enter crash recovery and other tabs SHALL continue

#### Scenario: Open a held session
- **WHEN** a session file already owned by a live tab is selected
- **THEN** A1 SHALL focus that tab and SHALL NOT start a second tab on the file

### Requirement: Windows resident processes start outside terminal containment
The server and every holder SHALL be started by the native terminal-host binary's Windows detach routine outside the launching terminal's console, session, and launch-instance containment. The routine SHALL start detached with no console window, SHALL use explicit verified job breakaway where the job allows it, SHALL launch outside a foreign kill-on-close job that denies breakaway, and SHALL record the mode used. The launch-instance containment SHALL permit only this explicit terminal-host breakaway. When survival cannot be established, A1 SHALL report degraded mode or use the direct fallback rather than claim persistence. macOS and Linux SHALL remain on the direct path in this change.

#### Scenario: Close Windows Terminal
- **WHEN** the Windows Terminal window running bare `a1` is closed
- **THEN** the server, holders, and tab processes SHALL keep running and a later `a1` SHALL reattach

#### Scenario: Launch inside a kill-on-close job
- **WHEN** bare `a1` starts inside a job that kills its processes on close, such as a Windows OpenSSH session
- **THEN** the server SHALL start outside that job and survive the session's end, or A1 SHALL report the degraded mode

#### Scenario: Ordinary descendants stay contained
- **WHEN** a process in the bare-A1 launch instance starts a child without the explicit resident breakaway
- **THEN** that child SHALL remain in the instance containment and SHALL be terminated with it

### Requirement: The native binary owns the complete terminal data path
Pseudoterminal output, child input, retained terminal state, input encoding, composition, and outer-terminal writes SHALL remain inside the native terminal-host binary's attach, server, and holder roles. Node SHALL NOT read, relay, parse, or render tab terminal bytes. The attach client SHALL answer no terminal queries on a child's behalf; the holder's model SHALL answer them. The attach client SHALL compose the strip row and the viewed tab's surface, SHALL offset mouse coordinates by the strip, SHALL forward clipboard writes, hyperlinks, and cursor shape from the child, SHALL NOT forward bells, and SHALL restore every outer terminal mode it enabled when it detaches or fails.

#### Scenario: Child enables enhanced keyboard reporting
- **WHEN** an A1 tab enables an enhanced keyboard protocol and the outer terminal supports it
- **THEN** keys SHALL reach the child encoded for its mode and tab shortcuts SHALL still be intercepted

#### Scenario: Attach client crashes
- **WHEN** the attach client exits abnormally
- **THEN** the outer terminal SHALL be restored by the fatal path and every tab SHALL continue

### Requirement: Host exchanges use a generation-stable bounded protocol
Every connection SHALL begin with a handshake carrying role, protocol generation, build, features, and credentials. Within a generation, messages SHALL change only additively with defaulted optional fields and unknown-value fallbacks, guarded by frozen shape fixtures; a missing optional method SHALL disable only that operation; a generation mismatch SHALL produce a typed incompatibility outcome. Frames, input messages, and handshakes SHALL be bounded. Topology mutations SHALL carry expected revisions and SHALL apply atomically or be rejected.

#### Scenario: Newer client, same generation
- **WHEN** a client of a newer release attaches to an older server of the same generation
- **THEN** the attach SHALL succeed and only operations the server lacks SHALL be unavailable

#### Scenario: Oversized frame
- **WHEN** a peer sends a frame above its limit
- **THEN** the receiver SHALL reject it and SHALL keep unrelated tabs and connections healthy

### Requirement: Reattach renders from retained terminal state
Viewing a tab SHALL deliver a complete retained surface of cells, attributes, hyperlinks, cursor, and modes, followed by patches against its revision. Output produced while no client viewed the tab SHALL be present because the holder's model absorbed it. Logs or replayed byte streams SHALL NOT be used to reconstruct a screen. Only viewed tabs SHALL stream surfaces to a client; status and attention SHALL stream for all tabs.

#### Scenario: Reattach after hours detached
- **WHEN** a client views a tab that produced output for hours while detached
- **THEN** it SHALL render the tab's current screen immediately without replaying the history

### Requirement: Slow clients never stall tabs
Each client connection SHALL have a bounded reliable control lane and a single-slot render lane in which newer surface updates replace unsent ones. A client that falls behind SHALL receive a full surface once it drains. The server SHALL NOT block holders, other clients, or registry writes on a slow client, and holders SHALL NOT block children on output.

#### Scenario: Suspended terminal
- **WHEN** one attached terminal stops reading while tabs stream
- **THEN** tabs and other clients SHALL continue normally and the stalled client SHALL show the current surface when it resumes

### Requirement: The tab bridge reports structured A1 state and controller identity
Each A1 tab process SHALL receive a derived per-tab/per-incarnation credential and SHALL connect an authenticated bridge to the server that reports sequenced status from engine events, the Pi session file and name, whether its last prompt was interrupted, and semantic requests. Before terminal input from a new controller is accepted, the holder SHALL deliver an input-owner marker containing client identity and controller revision through the bridge and receive acknowledgement. Client-scoped requests SHALL include that acknowledged identity and revision and SHALL be rejected when stale. The server SHALL send visibility and rename notifications through the bridge, and A1 SHALL reduce animation work while hidden. Bridge messages SHALL NOT carry prompt, transcript, or terminal input content. Bridge credentials SHALL NOT be passed to descendants. A missing bridge SHALL degrade status and disable client-scoped child requests without breaking terminal input or attach-local detach.

#### Scenario: Pending extension request
- **WHEN** an extension in a tab opens a confirmation
- **THEN** the bridge SHALL report needs-input until it is answered

#### Scenario: Bridge unavailable
- **WHEN** a tab's bridge cannot connect
- **THEN** the tab SHALL keep running with process-level status and SHALL remain fully usable

### Requirement: The tab registry is durable and lease-protected
The server SHALL write the per-profile registry only while holding the owner-only OS-exclusive writer lease and current durable epoch. Every mutation SHALL recheck that authority and commit through a temporary file, write-capable file sync, atomic rename, and directory sync before acknowledgement. The registry SHALL record each tab's identity, kind, display name and name source, order, cwd, session location, desired state, lifecycle, attention and seen positions, verified holder identity/incarnation/release, controller revision, credential-derivation inputs, restart budget, last exit, registry revision, epoch, and boot identity, and SHALL retain bounded history generations. It SHALL NOT store derived credentials, environment values, prompt text, or terminal content. An unreadable registry SHALL be quarantined, the last good generation loaded, and a notice shown; persistent write failure SHALL leave newer memory authoritative and report degraded health.

#### Scenario: Server killed right after a rename
- **WHEN** a rename is acknowledged and the server is then killed
- **THEN** the next server SHALL present the new name

#### Scenario: Corrupt registry
- **WHEN** the registry cannot be parsed
- **THEN** the server SHALL quarantine it, load the last good generation, and name both in a notice

### Requirement: Credentials survive server replacement without entering the registry
Clients SHALL authenticate with a random owner-only client token. One random owner-only profile secret stored outside the registry SHALL derive holder and bridge credentials from tab identity and process incarnation. A replacement server SHALL reproduce the expected credential from the secret and recorded non-secret inputs, then also verify pid and native start identity before admission. Endpoint, token, secret, lease, registry, journal, and recovery-file access SHALL be restricted to the owning user. The server SHALL adopt, signal, or terminate a process only after verifying credential, recorded native identity, incarnation, and current epoch, and SHALL leave unverifiable processes untouched and reported.

#### Scenario: Process identifier reuse
- **WHEN** a recorded holder identifier now belongs to an unrelated process
- **THEN** the server SHALL NOT adopt or terminate it and SHALL treat the tab's holder as gone

#### Scenario: Another local user connects
- **WHEN** a process of another operating-system user connects
- **THEN** endpoint access control SHALL refuse it

### Requirement: Crashed and hung tabs restart within a bounded budget
Holders SHALL detect child exit immediately and the server SHALL detect holder exit and heartbeat hangs within a bounded timeout, terminating verified hung trees gracefully then forcibly. An unrequested exit SHALL restart the tab by resuming its Pi session with increasing backoff; after three restarts within ten minutes the tab SHALL become failed and require retry, fresh start, or close. Restarts SHALL NOT resend an interrupted prompt. Child standard error SHALL be captured to a rotated per-tab log.

#### Scenario: Tab process killed
- **WHEN** a tab's A1 process is killed externally
- **THEN** the holder SHALL restart it from its session and the tab SHALL show its transcript again

#### Scenario: Interrupted turn after restart
- **WHEN** a tab crashed after the user's prompt was persisted but before a reply settled
- **THEN** the restarted tab SHALL be idle and SHALL offer the prompt without resubmitting it

### Requirement: The server heals itself without losing tabs or creating split brain
When the server exits unexpectedly, attach clients SHALL show a non-blocking reconnecting indication, and any client or holder MAY start a replacement through the detach routine. The replacement SHALL acquire the released writer lease, increment the durable epoch, derive expected holder credentials, verify native identities/incarnations, and re-admit surviving holders; tabs whose holders are gone SHALL enter crash recovery. A live recorded owner SHALL be terminated only after exact identity verification, and an unverifiable owner or unavailable lease SHALL block replacement. After three starts within sixty seconds, clients SHALL show a stopped state with restart and quit actions, preserving diagnostics.

#### Scenario: Server killed with no client attached
- **WHEN** the server dies while no terminal runs `a1`
- **THEN** a holder SHALL start the replacement, and the next `a1` SHALL reattach every tab with its current screen

### Requirement: Tabs are restored after reboot or logout
When the server starts in a new boot, or finds desired-running tabs without live verified holders, it SHALL restore them under a single restore gate that prevents duplicate starts, with bounded start concurrency, resuming each from its Pi session without resuming interrupted turns. A tab whose cwd or session is unavailable SHALL remain as failed with the reason and path and SHALL NOT be relocated or overwritten. Restored tabs SHALL use the environment of the client that triggered restoration and SHALL note that once.

#### Scenario: Reboot with three tabs
- **WHEN** the machine reboots with three running tabs and the user runs `a1`
- **THEN** exactly three tabs SHALL be restored with every committed transcript entry

#### Scenario: Missing cwd
- **WHEN** a restored tab's cwd no longer exists
- **THEN** it SHALL show failed with the missing path and SHALL NOT start elsewhere

### Requirement: Updates retain the active resident cohort
Installing or activating a release SHALL NOT terminate the server, holders, or tab processes. Resident binaries and tab processes SHALL run from immutable release directories, and every release used by a live verified resident process SHALL be retained. In this slice a same-generation newer client MAY attach with unsupported optional operations disabled, while the existing resident cohort remains on its release until all tabs stop. A generation mismatch SHALL report that the host must be stopped explicitly and SHALL NOT kill or recycle tabs. Automatic endpoint handoff and idle release recycling require a later change.

#### Scenario: Update mid-turn
- **WHEN** `a1 update` runs while a tab streams
- **THEN** the turn and resident process identities SHALL remain uninterrupted and their immutable release SHALL remain retained

### Requirement: Resident resources are bounded and observable
A1 SHALL enforce configurable limits on tab count, concurrent starts, scrollback, and client queues, each with a hard cap. When idle suspension is enabled (default 60 minutes), an idle tab with no pending request, queued input, or viewer SHALL stop its A1 process, show suspended, and resume its session on view or prompt. The server SHALL exit only after ten minutes with no running tabs and no clients. Logs SHALL rotate and SHALL exclude terminal content, prompt text, and credentials. `a1 tabs host status` SHALL report server identity, build, generation, detachment mode, tab count, and log locations.

#### Scenario: Idle suspension
- **WHEN** an unviewed idle tab reaches the suspension interval
- **THEN** its A1 process SHALL stop, its chip SHALL show suspended, and viewing it SHALL resume the session with no lost transcript

### Requirement: Resident tabs have non-interactive maintenance commands
A1 SHALL provide `a1 tabs` to list tabs with identity, name, status, and cwd; `a1 tabs stop <id>` and `a1 tabs stop --all`; `a1 tabs host status` and `a1 tabs host stop`, which stops tabs gracefully before the server; and `a1 tabs doctor`, which creates a bounded redacted diagnostic bundle. These commands SHALL NOT start an interactive runtime, SHALL NOT start a server merely to report that none runs, and SHALL fail concisely with nonzero status on invalid arguments.

#### Scenario: List with no server
- **WHEN** the user runs `a1 tabs` and no server runs
- **THEN** A1 SHALL report no running tabs and SHALL NOT start a server

### Requirement: Windows preview support is packaged, opt-in, certified, and reversible
The terminal-host binary SHALL ship for win32-x64 with artifact hashes, pinned source provenance, licenses, notices, and immutable-release placement verified before execution. `tabs.resident` SHALL remain `false` by default on every platform in this change and SHALL be accepted only as a Windows x64 opt-in preview after exact-package automated suites and manual or isolated-worker physical evidence for terminal closure, remote-session loss, reboot restore, input fidelity, extension text UI, recovery, and rendering. Physical automation SHALL NOT run on an active workstation. When the setting is false, the platform unsupported, or the server cannot start safely, bare `a1` SHALL run the direct single-agent owned UI, with one notice for an attempted fallback; registry records and sessions SHALL be preserved. Default-on Windows support and each additional platform require separate approved changes and evidence.

#### Scenario: Server cannot start
- **WHEN** the terminal-host binary is missing, unverified, or fails its start budget
- **THEN** bare `a1` SHALL start the direct single-agent experience with one notice instead of failing
