# resident-terminal-host Specification

## Purpose
Define the cross-platform native primitives, bounded protocol, and controller-transfer foundation that later resident terminal sessions can use without introducing product wiring or user-visible tab behavior.

## Requirements

### Requirement: Resident host primitives identify processes, boots, and OS sessions exactly
The native terminal host SHALL identify a process by its pid together with its native start time on Windows x64, Linux x64, and macOS arm64, and SHALL treat a process whose start time differs from the recorded one as unrelated. It SHALL report a native-precision boot identity that changes on reboot and remains stable within one boot, and an OS-session identity that distinguishes a later login session without using rounded wall-clock inference. An unavailable or malformed identity source SHALL produce a typed failure rather than a guessed identity.

#### Scenario: Process identifier reuse
- **WHEN** a recorded pid now belongs to a process with a different start time
- **THEN** the primitive SHALL report the recorded process as gone and SHALL NOT identify, adopt, or signal the new process as it

#### Scenario: Stable boot and OS session
- **WHEN** boot and OS-session identities are read twice without a reboot or new login between them
- **THEN** each pair of reads SHALL return the same identity

#### Scenario: Identity source is malformed
- **WHEN** the platform identity source returns incomplete or malformed data
- **THEN** the primitive SHALL report identity unavailable and SHALL NOT synthesize a pid-only or rounded-time identity

### Requirement: Resident host endpoints admit only their owner
The native terminal host SHALL create its local endpoints so that only the creating operating-system user can connect: a named pipe with an owner-only security descriptor and first-instance protection on Windows, and a Unix domain socket in a verified owner-only directory on Linux and macOS with the peer's credentials checked on every connection. The Unix path SHALL remain within the platform limit by hashing the canonical profile identity. Ownership SHALL be verified before any protocol frame is read.

#### Scenario: Another local user connects
- **WHEN** a process of another operating-system user connects to the endpoint
- **THEN** the connection SHALL be refused before any message is read or parsed

#### Scenario: Endpoint name is already taken
- **WHEN** another process already owns the Windows pipe name or Unix socket location
- **THEN** creation SHALL fail rather than share, unlink, or replace that endpoint

#### Scenario: Runtime directory is unsafe
- **WHEN** the proposed Unix runtime directory is symlinked, has a different owner, or grants access beyond the owner
- **THEN** endpoint creation SHALL fail without binding inside it

### Requirement: Resident roles launch outside terminal containment through a fixed path
The native terminal host SHALL start resident roles only through a launch primitive that accepts the canonical profile and a role from a fixed enum and resolves the currently running verified terminal-host artifact itself. The primitive SHALL accept no executable or free-form argv, SHALL use a fixed role argument grammar, explicit allowlisted environment and cwd, and non-inherited handles, and SHALL refuse an unverified profile, role, artifact, or result before spawning or reporting readiness. The launched process SHALL run outside the launching terminal's containment: outside the caller's kill-on-close job on Windows, using WMI when that job forbids direct breakaway, and after double-fork and `setsid` without a controlling terminal on Linux and macOS, remaining in the caller's per-user bootstrap namespace on macOS. The primitive SHALL verify launched process identity and containment, report its observed mode, and signal cleanup only for an exact verified identity. Ordinary descendants SHALL gain no generic escape path.

#### Scenario: Launching tree is killed
- **WHEN** a fixed resident fixture role was verified and its launching process tree is then killed, or on Linux and macOS its session is hung up
- **THEN** the resident fixture SHALL keep running with the same verified process identity

#### Scenario: Request names an arbitrary executable or argument
- **WHEN** a launch request supplies an executable, free-form argument, role, profile, or artifact outside the fixed contract
- **THEN** the primitive SHALL refuse it without spawning a process

#### Scenario: Windows job forbids direct breakaway
- **WHEN** the verified launcher runs inside a synthetic kill-on-close Windows job that denies direct breakaway
- **THEN** it SHALL use the bounded WMI mode with the fixed artifact and arguments and SHALL report readiness only after identity and job-containment verification

#### Scenario: Ordinary child stays contained
- **WHEN** an ordinary child of the launching tree attempts to outlive that tree and the tree is killed
- **THEN** the ordinary child SHALL end with the tree

#### Scenario: Spawn result cannot be verified
- **WHEN** the primitive cannot verify the returned pid, start identity, session, process group, job membership, or controlling-terminal state required by that platform
- **THEN** it SHALL report failure and SHALL NOT claim resident readiness or signal an unverifiable process

### Requirement: Session-writer locks belong to the writing process
The native terminal host SHALL provide one session-writer lock implementation usable from Rust and in-process from Node through a Node-API 9 artifact produced by the same Cargo package. The writing process itself SHALL hold the operating-system lock with non-inherited custody, so kernel cleanup releases it after that writer exits. Existing-file authority SHALL be keyed by stable volume/device and file identity derived and revalidated from an opened handle so case, symbolic-link, junction, and hard-link aliases contend. A new session SHALL first hold a canonical-parent-and-name reservation, then create/open without writing session content, acquire its file-identity authority while retaining the reservation, and only then return writable admission; losing that transition SHALL write no session content.

#### Scenario: Two writers select aliases of one file
- **WHEN** two processes request the writer lock for different case, symbolic-link, junction, or hard-link paths naming the same file
- **THEN** exactly one SHALL acquire file-identity authority and the other SHALL be refused

#### Scenario: Writer is killed
- **WHEN** the Node or native process holding a writer lock is killed
- **THEN** another process SHALL acquire the lock only after the killed process exits and kernel custody is released

#### Scenario: New session is reserved and bound
- **WHEN** a process reserves a session location with no file, creates the file, and binds its opened identity
- **THEN** it SHALL retain the location reservation through identity acquisition and SHALL admit no session write before the identity lock is held

#### Scenario: Identity bind loses a race
- **WHEN** another participating process acquires the created file's identity before the reserving process completes its bind
- **THEN** the reserving process SHALL report a conflict, write no session content, and release its authorities safely

#### Scenario: Lock object is inherited or abandoned
- **WHEN** the writer spawns a grandchild or abandons the Node lock object
- **THEN** the grandchild SHALL NOT inherit custody, the finalizer MAY close process-local custody, and process exit SHALL remain the final release authority

### Requirement: Durable file replacement leaves complete content and reports its evidence boundary
The native terminal host SHALL replace a file by writing a unique temporary file in the same directory, synchronizing it, replacing the target atomically, and synchronizing directory metadata before reporting completion. Windows SHALL use a write-capable `FlushFileBuffers` followed by `MoveFileExW` with replace-existing and write-through flags; Linux SHALL `fsync` the file, rename, and `fsync` the opened parent directory; macOS SHALL `F_FULLFSYNC` the file, rename, and perform the declared supported parent-directory synchronization without ignoring an unavailable required barrier. Supported local filesystems SHALL be documented, and unsupported filesystems SHALL fail or be reported rather than inherit a durability claim. Kill-point evidence SHALL be described as process-crash evidence; physical power-loss certification SHALL remain separate.

#### Scenario: Writer killed during replacement
- **WHEN** the writing process is killed before or after any replacement step
- **THEN** the target SHALL afterwards contain either the complete previous content or the complete new content and SHALL NOT contain a partial mixture

#### Scenario: Required synchronization fails
- **WHEN** a required file or directory synchronization call fails or is unsupported on the observed filesystem
- **THEN** replacement SHALL report failure and SHALL NOT acknowledge durable completion

#### Scenario: Hosted kill-point suite passes
- **WHEN** all injected process-kill points and platform-call ordering assertions pass
- **THEN** the evidence SHALL record process-crash and API-order coverage and SHALL NOT claim that hosted CI physically removed power

### Requirement: Host exchanges use generation-stable bounded MessagePack frames
Every terminal-host connection SHALL begin with a four-second bounded handshake carrying role, protocol generation, build, features, and credentials. Each frame SHALL be a u32 little-endian payload length followed by one MessagePack named-map envelope with stable `type`, optional `requestId`, and typed `body` fields. Frames SHALL be capped at 2 MiB and input-bearing payloads at 1 MiB; declared length, nesting, and collection bounds SHALL be checked before corresponding allocation or recursion. Within generation 1, messages SHALL change only additively with ignored unknown map fields, defaulted optional fields, and explicit unknown enum values. A generation mismatch or unsupported required message SHALL produce a typed outcome. Exact-byte fixtures and a sorted SHA-256 manifest SHALL guard every introduced shape, and the decoder SHALL never panic or allocate outside the frame-derived bounds on arbitrary input.

#### Scenario: Oversized frame
- **WHEN** a peer declares a frame above its limit
- **THEN** the receiver SHALL reject it before allocating the declared size

#### Scenario: Malicious nested payload
- **WHEN** a bounded frame contains nesting or collection declarations beyond their limits
- **THEN** the receiver SHALL reject it without unbounded recursion or allocation

#### Scenario: Generation mismatch
- **WHEN** a peer offers a protocol generation the receiver does not support
- **THEN** the handshake SHALL end with a typed incompatibility outcome

#### Scenario: Additive field arrives
- **WHEN** a generation-1 named map contains an unknown field or omits a defaulted optional field
- **THEN** the decoder SHALL ignore the unknown field or supply the declared default without changing the message's known meaning

#### Scenario: Newer peer uses an unavailable optional method
- **WHEN** a newer same-generation peer offers or requests a method the older peer does not implement
- **THEN** the connection and unrelated methods SHALL remain available while only that optional method is disabled

#### Scenario: Fixture shape changes
- **WHEN** a generation-1 message's canonical bytes change without regenerating the sorted fixture manifest from the pinned encoder
- **THEN** the fixture digest check SHALL fail

### Requirement: Input control transfers only across a proven ordering barrier
The terminal host's I/O-free core SHALL admit input under exactly one controller generation and SHALL model transfer as active, frozen, draining, awaiting-boundary, then active for the new generation. Freezing SHALL stop old-controller admission. After every previously accepted item is written, the holder queue SHALL write a versioned nonce-bearing controller marker through the same pseudoterminal input path. Where the platform pseudoterminal reserves raw DCS input syntax, a fixed printable transport envelope MAY carry the exact marker bytes, provided the child parser reconstructs the frozen DCS marker only after receiving all earlier bytes from that same queue. Tab-mode input handling SHALL consume that marker and acknowledge its generation and nonce only after all earlier bytes have been admitted by the child parser. The new controller SHALL remain blocked until the matching acknowledgement. Each command SHALL retain the generation that admitted it and SHALL be rejected, never relabelled, after that generation is superseded. Deterministic simulation SHALL cover delayed, duplicated, stale, lost, and reordered events, and a fixture on every target SHALL prove PTY ordering; transfer SHALL remain disabled where that boundary is not established.

#### Scenario: Buffered command crosses a transfer
- **WHEN** an old controller's command remains buffered while control transfers to a new controller
- **THEN** the command SHALL retain its old generation and be rejected after supersession, and SHALL NOT execute under the new controller

#### Scenario: Boundary acknowledgement arrives early or stale
- **WHEN** an acknowledgement names the wrong generation or nonce, is duplicated, or arrives without proof that prior PTY input was admitted
- **THEN** the core SHALL reject it and SHALL NOT activate the new controller

#### Scenario: Platform fixture observes PTY ordering
- **WHEN** earlier input and the boundary marker are delayed through the fixture's shared PTY writer queue
- **THEN** the fixture child SHALL acknowledge the marker only after admitting all earlier bytes

#### Scenario: Simulation finds a misattributed command
- **WHEN** a simulated interleaving executes a command under a generation that did not admit it
- **THEN** the simulation test SHALL fail with the minimized event sequence

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

### Requirement: Slow clients never stall tabs
Each client connection SHALL have a bounded reliable control lane and a single-slot render lane in which newer surface updates replace unsent ones. A client that falls behind SHALL receive a full surface once it drains. A client whose control lane overflows SHALL be disconnected with a typed reason rather than have individual control messages dropped. The server SHALL stream surface updates for a tab only to clients that view it. The server SHALL NOT block holders, other clients, or registry writes on a slow client, and holders SHALL NOT block children on output.

#### Scenario: Suspended terminal
- **WHEN** one attached terminal stops reading while tabs stream
- **THEN** tabs and other clients SHALL continue normally and the stalled client SHALL show the current surface when it resumes

#### Scenario: Control lane overflows
- **WHEN** a stalled client's control lane reaches its bound
- **THEN** the server SHALL close only that connection with a typed overrun reason, and the client SHALL reconnect and receive a full topology snapshot

#### Scenario: Unviewed tab streams output
- **WHEN** a tab produces output while no client views it
- **THEN** its holder SHALL keep parsing the output and no client SHALL receive surface updates for that tab

### Requirement: The server heals itself without losing tabs or creating split brain
When the server exits unexpectedly, attach clients SHALL show a non-blocking reconnecting indication, and any client or holder MAY start a replacement through the verified detached recovery path, with starts serialized so that at most one replacement start is in flight per profile. The replacement SHALL acquire the released writer lease, increment the durable epoch, derive expected holder credentials, verify native identities and incarnations, and re-admit surviving holders with their holder and child process identities unchanged. Tabs whose holders are gone or unverifiable SHALL leave the live set without a second writer being started for their session. A live recorded owner SHALL be terminated only after exact identity verification, and an unverifiable owner or unavailable lease SHALL block replacement. After three starts within sixty seconds, clients SHALL show a stopped state with restart and quit actions, and holders and children SHALL keep running.

#### Scenario: Server killed with no client attached
- **WHEN** the server dies while no terminal runs `a1`
- **THEN** a holder SHALL start the replacement, and the next `a1` SHALL reattach every tab with its current screen

#### Scenario: Server killed with two tabs
- **WHEN** the server is killed while two tabs stream and a client is attached
- **THEN** the replacement SHALL re-admit both holders, each holder and child SHALL keep its pid and native start identity, and the client SHALL show each tab's current surface after reconnecting

#### Scenario: Start budget exhausted
- **WHEN** the server has been started three times within sixty seconds and exits again
- **THEN** clients SHALL show the stopped state with restart and quit actions, no further automatic start SHALL occur, and every holder and child SHALL keep running

#### Scenario: Replacement races
- **WHEN** a client and a holder request a replacement at the same time
- **THEN** exactly one replacement SHALL start and the other requester SHALL join it
