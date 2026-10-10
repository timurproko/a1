## ADDED Requirements

### Requirement: One authoritative resident server serves each user profile
A1 SHALL run at most one authoritative resident terminal-host server per operating-system user and canonical A1 profile root on Windows x64, macOS, and Linux. Its endpoint SHALL be derived from the canonical profile home and runtime directory, SHALL be independent of the release cohort, and SHALL honor hermetic overrides. The endpoint SHALL provide discovery, while the owner-only operating-system exclusive registry-writer lease SHALL provide mutation authority. A starting server SHALL acquire that lease and increment the durable epoch before it serves. A starter that completes a handshake with a live server SHALL exit as already running and its caller SHALL attach to the winner. When the endpoint does not answer and the lease cannot be acquired, startup SHALL report blocked recovery, SHALL NOT start a second writer, and SHALL NOT signal the recorded owner. The server SHALL execute no A1, Pi, or extension code and SHALL own no pseudoterminal.

#### Scenario: Two launches race
- **WHEN** two bare `a1` invocations of one profile start concurrently with resident tabs enabled and no server running
- **THEN** exactly one server SHALL hold the writer lease and serve the endpoint
- **AND** the other invocation SHALL either attach to it or be refused as attached elsewhere, without starting a second server

#### Scenario: Endpoint silent while the lease is held
- **WHEN** the endpoint does not answer but the registry-writer lease is still held
- **THEN** startup SHALL report blocked recovery, bare `a1` SHALL use the direct fallback with its notice, and no process SHALL be signalled

#### Scenario: Different profiles
- **WHEN** bare A1 runs with resident tabs enabled under two different profile roots
- **THEN** each SHALL have its own server, registry, and tab without cross-visibility

### Requirement: Each tab is owned by its own session holder
Each tab SHALL be owned by exactly one native session holder process that creates and owns that tab's pseudoterminal (ConPTY on Windows), child process tree, and retained libghostty-vt terminal model with bounded scrollback, and that encodes input for the child's current terminal modes. The holder SHALL read and parse child output continuously whether or not any client views the tab, so the child never blocks on output. The holder SHALL answer the child's terminal queries from its own model. Holder input SHALL pass through a bounded queue: a paste SHALL be admitted only when it fits completely, an over-capacity paste SHALL be rejected visibly without delivering a prefix, and admitted bytes SHALL be written in order and never silently dropped. A server exit SHALL NOT terminate the holder, its child, or its retained model. When the child exits, the holder SHALL report the exit, the tab SHALL end without automatic restart, and its session SHALL remain resumable.

#### Scenario: Server killed
- **WHEN** the server process is killed while the tab streams
- **THEN** the holder, its child process, and its retained screen SHALL continue unaffected

#### Scenario: Paste larger than the input queue
- **WHEN** a paste larger than the holder's free input capacity is sent to a busy child
- **THEN** the holder SHALL reject the whole paste with a visible notice and SHALL deliver none of it

#### Scenario: Tab child exits
- **WHEN** the A1 process in the tab exits
- **THEN** the server SHALL record the tab as ended, an attached client SHALL show that the agent exited, and the next bare `a1` SHALL start a new tab

### Requirement: Resident processes start outside terminal containment
The server and the holder SHALL be started only through milestone 1's authenticated fixed-role native resident-launch path, outside the launching terminal's console and launch-instance containment. The path SHALL verify the immutable terminal-host artifact, requested role, canonical profile, and request authority, SHALL NOT accept arbitrary executable or argv requests, and SHALL NOT enable job-wide or silent breakaway on ordinary launch-instance or tab-child jobs. On Windows it SHALL support bounded creation outside a foreign kill-on-close job, including WMI where breakaway is denied; on macOS and Linux it SHALL start resident roles in a new session without a controlling terminal so terminal close and hang-up do not reach them, and on macOS it SHALL keep them in the user's per-user bootstrap namespace. A1 SHALL verify the resulting process identity and containment before announcing resident readiness, and SHALL record the observed detachment mode and any verification failure. When survival cannot be established, bare `a1` SHALL use the direct fallback with one notice and SHALL preserve existing resident records. This boundary SHALL NOT claim to sandbox malicious same-user code.

#### Scenario: Close Windows Terminal
- **WHEN** the Windows Terminal window running bare `a1` with resident tabs enabled is closed
- **THEN** the server, the holder, and the tab process SHALL keep running and a later `a1` SHALL reattach

#### Scenario: Close a macOS or Linux terminal or lose SSH
- **WHEN** the terminal or SSH session running bare `a1` with resident tabs enabled on macOS or Linux closes or hangs up
- **THEN** the server, the holder, and the tab process SHALL keep running and a later `a1` SHALL reattach

#### Scenario: Launch inside a kill-on-close job
- **WHEN** bare `a1` starts with resident tabs enabled inside a job that kills its processes on close, such as a Windows OpenSSH session
- **THEN** the server SHALL start outside that job and survive the session's end, or A1 SHALL refuse resident readiness and use the direct fallback with its notice

#### Scenario: Ordinary descendants stay contained
- **WHEN** an ordinary process in the bare-A1 launch instance or in the tab-child tree tries to leave its containment, such as with `CREATE_BREAKAWAY_FROM_JOB` on Windows
- **THEN** A1 SHALL NOT grant escape, and the contained process SHALL still terminate with its owning tree

#### Scenario: Resident launch request names an arbitrary executable
- **WHEN** a request supplies an unapproved executable, role, profile, or request identity to the resident-launch path
- **THEN** native admission SHALL reject it without spawning a process

### Requirement: The native binary owns the complete terminal data path
Pseudoterminal output, child input, retained terminal state, input encoding, composition, and outer-terminal writes SHALL remain inside the native terminal-host binary's attach, server, and holder roles. Node SHALL NOT read, relay, parse, or render tab terminal bytes. The attach client SHALL answer no terminal queries on the child's behalf. The attach client SHALL compose the strip row and the viewed tab's surface, SHALL offset mouse coordinates by the strip, SHALL forward clipboard writes, hyperlinks, and cursor shape from the child, SHALL NOT forward bells, and SHALL restore every outer terminal mode it enabled when it detaches or fails.

#### Scenario: Child enables enhanced keyboard reporting
- **WHEN** the A1 tab enables an enhanced keyboard protocol and the outer terminal supports it
- **THEN** keys SHALL reach the child encoded for its mode and the attach client SHALL still intercept the detach chord

#### Scenario: Attach client crashes
- **WHEN** the attach client exits abnormally, including by forced termination that prevents its own cleanup
- **THEN** the surviving launch owner SHALL restore the outer terminal, and the tab SHALL continue

#### Scenario: Child rings the bell
- **WHEN** the tab child writes BEL
- **THEN** the outer terminal SHALL receive no bell

### Requirement: Reattach renders from retained terminal state
Viewing a tab SHALL deliver a complete retained surface of cells, attributes, hyperlinks, cursor, and modes, followed by patches against its revision. Output produced while no client viewed the tab SHALL be present because the holder's model absorbed it. Logs or replayed byte streams SHALL NOT be used to reconstruct a screen. The server SHALL forward surface updates to the attached client through a single-slot render lane in which a newer update replaces an unsent one, and SHALL NOT block the holder on the client.

#### Scenario: Reattach after hours detached
- **WHEN** a client views the tab after it produced output for hours while detached
- **THEN** it SHALL render the tab's current screen immediately without replaying the history

### Requirement: The tab registry is durable and lease-protected
The server SHALL write the per-profile registry only while holding the owner-only OS-exclusive registry-writer lease and the current durable epoch. Every mutation SHALL recheck that authority and SHALL commit through milestone 1's durable atomic replacement before it is acknowledged. The registry SHALL record the tab's identity, kind, display name and name source, order, cwd, session location, desired state, lifecycle, incarnation, verified holder identity and release, last exit, registry revision, epoch, and boot identity. It SHALL NOT store credentials, environment values, prompt text, or terminal content. A failed write SHALL NOT be acknowledged and SHALL NOT stop the running tab.

#### Scenario: Server killed right after a tab is created
- **WHEN** the tab's creation is acknowledged and the server is then killed
- **THEN** the next server SHALL find the tab's record with its session location and holder identity

#### Scenario: Server without the writer lease
- **WHEN** a server process no longer holds the registry-writer lease or its epoch is no longer current
- **THEN** it SHALL reject the mutation without writing the registry or acknowledging success

#### Scenario: Registry contents stay non-secret
- **WHEN** the registry is read after a tab has run and been reattached
- **THEN** it SHALL contain no token, derived credential, environment value, prompt text, or terminal content

### Requirement: Credentials survive server replacement without entering the registry
Clients SHALL authenticate with a random owner-only client token. One random owner-only profile secret stored outside the registry SHALL derive the holder and bridge credentials from the tab identity and process incarnation. A server starting over an existing registry SHALL reproduce the expected credential from the secret and the recorded non-secret inputs, and SHALL adopt a recorded holder only after it presents that credential and its pid, native start identity, and boot identity verify. Endpoint, token, secret, lease, and registry access SHALL be restricted to the owning user. The server SHALL adopt, signal, or terminate a process only after that verification, and SHALL leave unverifiable processes untouched and reported.

#### Scenario: Process identifier reuse
- **WHEN** a recorded holder pid now belongs to an unrelated process
- **THEN** the server SHALL NOT adopt or terminate it and SHALL treat the tab's holder as gone

#### Scenario: Holder survives a server restart
- **WHEN** the server exits while its holder keeps running, and a later bare `a1` starts a new server
- **THEN** the new server SHALL re-admit the verified holder and the client SHALL view the same tab with its retained screen

#### Scenario: Another local user connects
- **WHEN** a process of another operating-system user connects to the endpoint
- **THEN** endpoint access control SHALL refuse it

### Requirement: A minimal tab bridge reports readiness, session, and working state
The A1 process in a tab SHALL receive its tab identity, a derived per-tab and per-incarnation bridge credential, and the endpoint through a fixed startup contract, SHALL move them into private memory and remove them from its environment before loading extensions or spawning descendants, and SHALL never restore them to the environment. It SHALL connect an authenticated bridge to the server and SHALL report the Pi session file and name, and a sequenced status of `starting`, `working`, or `idle` derived from engine events rather than screen text. The server SHALL report the tab ready once the holder is ready and the bridge has reported its session, or after a bounded wait with the holder alone. Bridge messages SHALL NOT carry prompt, transcript, or terminal input content. A missing or broken bridge SHALL degrade the tab to process-level status and SHALL NOT break terminal input or attach-local detach.

#### Scenario: Agent starts and finishes a turn
- **WHEN** the user submits a prompt in the tab and the turn settles
- **THEN** the strip SHALL show working while the turn runs and idle after it settles

#### Scenario: Credentials do not reach tools
- **WHEN** a tool or extension in the tab starts a subprocess
- **THEN** that subprocess's environment SHALL contain no tab identity, credential, or bridge endpoint

#### Scenario: Bridge unavailable
- **WHEN** the tab's bridge cannot connect
- **THEN** the tab SHALL keep running with process-level status, terminal input, and attach-local detach
