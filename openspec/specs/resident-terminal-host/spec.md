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
The native terminal host SHALL start resident roles only through a launch primitive that accepts the canonical profile and a role from a fixed enum and resolves the hosting Node runtime executable and the release's fixed role entry itself, as recorded when the addon was loaded. The primitive SHALL accept no executable or free-form argv, SHALL use a fixed role argument grammar, explicit allowlisted environment and cwd, and non-inherited handles, and SHALL refuse an unverified profile, role, artifact, or result before spawning or reporting readiness. The launched process SHALL run outside the launching terminal's containment: outside the caller's kill-on-close job on Windows, using WMI when that job forbids direct breakaway, and after double-fork and `setsid` without a controlling terminal on Linux and macOS, remaining in the caller's per-user bootstrap namespace on macOS. The primitive SHALL verify launched process identity and containment, report its observed mode, and signal cleanup only for an exact verified identity. Ordinary descendants SHALL gain no generic escape path.

#### Scenario: Launching tree is killed
- **WHEN** a fixed resident fixture role was verified and its launching process tree is then killed, or on Linux and macOS its session is hung up
- **THEN** the resident fixture SHALL keep running with the same verified process identity

#### Scenario: Request names an arbitrary executable or argument
- **WHEN** a launch request supplies an executable, free-form argument, role, profile, or artifact outside the fixed contract
- **THEN** the primitive SHALL refuse it without spawning a process

#### Scenario: Launched role is the hosting runtime
- **WHEN** the primitive spawns a server or holder role
- **THEN** the spawned process image SHALL be the Node runtime that loaded the addon and its program SHALL be the release's fixed role entry
- **AND** no terminal-host executable SHALL be resolved or started

#### Scenario: Windows job forbids direct breakaway
- **WHEN** the verified launcher runs inside a synthetic kill-on-close Windows job that denies direct breakaway
- **THEN** it SHALL use the bounded WMI mode with the fixed runtime, entry, and arguments and SHALL report readiness only after identity and job-containment verification

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
Viewing a tab SHALL deliver a complete committed retained surface of cells, attributes, hyperlinks, cursor, and modes, followed by either newer complete surfaces or negotiated patches against an explicitly matching base. Output produced while no client viewed the tab SHALL be present because the holder's model absorbed it. Logs or replayed byte streams SHALL NOT be used to reconstruct a screen. The server SHALL forward replaceable complete state through a bounded latest-value lane, SHALL require full resynchronization for unavailable patch bases, and SHALL NOT block the holder on the client. Subscriber ownership SHALL account for every client viewing the tab; metadata and retained progress SHALL remain independent of body delivery.

#### Scenario: Reattach after hours detached
- **WHEN** a client views the tab after it produced output for hours while detached
- **THEN** it SHALL render the tab's current committed screen without replaying the history

#### Scenario: One of two viewers disconnects
- **WHEN** two clients view a tab and one disconnects or selects another tab
- **THEN** the remaining client's fresh complete state and subsequent updates SHALL continue
- **AND** losing the final viewer SHALL suppress only unnecessary external body delivery, not child rendering or retained progress

#### Scenario: Stale cached state is offered repeatedly
- **WHEN** a requested view receives repeated cached stale surfaces while awaiting its fresh commit
- **THEN** the bounded fallback deadline SHALL remain anchored to the request rather than restarting for every offer
- **AND** re-offering a cached revision SHALL not count as child-render progress

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

### Requirement: Crashed and hung tabs restart within a bounded budget
When a tab's A1 process exits without a requested stop, or is terminated as unresponsive, the server SHALL restart it by instructing its holder to start `ui.js --tab --session <file>` for the tab's Pi session, with backoff of 1, 5, and 30 seconds, at most one start in flight per tab, and only after the previous child and its process tree are verified gone and the session-writer lock is acquired. The restart budget SHALL be persisted in the registry before each restart. After three restarts within ten minutes the tab SHALL become failed and SHALL NOT restart automatically until the user chooses retry, start fresh, or close. A restart SHALL NOT resend an interrupted prompt. If child standard error is separately available, it SHALL be stored only as private bounded recovery data, not as a diagnostic log.

#### Scenario: Tab process killed
- **WHEN** a tab's A1 process is killed externally
- **THEN** the holder SHALL restart it from its session after the first backoff interval and the tab SHALL show its transcript again

#### Scenario: Interrupted turn after restart
- **WHEN** a tab crashed after the user's prompt was journaled but before a reply settled
- **THEN** the restarted tab SHALL be idle and SHALL offer the prompt without resubmitting it

#### Scenario: Restart budget survives server replacement
- **WHEN** a tab has used two restarts and the server is replaced before the tab crashes again
- **THEN** the replacement server SHALL count the next crash as the third restart within the window

#### Scenario: Previous writer not yet gone
- **WHEN** a restart is due but the previous child's exit cannot be verified or its session-writer lock is still held
- **THEN** the tab SHALL stay crashed with the reason and SHALL NOT start a second writer

### Requirement: Reboot and logout end tabs without losing sessions
Resident processes SHALL end with the operating-system session, and this version SHALL NOT restore tabs after reboot or logout. When the server starts under a different boot identity or operating-system session identity, or finds every recorded holder gone while the operating-system session identity cannot be determined, it SHALL move the previous tab set to registry history in one durable mutation instead of starting those tabs, and bare `a1` SHALL start with one new tab. Every previous Pi session SHALL stay resumable through the normal session picker or `a1 --session`. A pending journaled prompt SHALL be offered, without replay, when its session is next opened in a tab within seven days. A reserved first-turn identity whose journal proves the session file was never created SHALL be recoverable the same way rather than treated as a missing transcript.

#### Scenario: Reboot with three tabs
- **WHEN** the machine reboots with three running tabs and the user runs `a1`
- **THEN** A1 SHALL start one new tab, and all three previous sessions SHALL be listed in the session picker with every committed transcript entry

#### Scenario: First-turn session file does not yet exist
- **WHEN** a reboot leaves a durable reserved session identity and pending journal but Pi had not created the first session file
- **THEN** opening that identity SHALL offer the prompt idle rather than treat it as a missing existing transcript or automatically resend it

#### Scenario: Journaled prompt older than seven days
- **WHEN** a previous session is opened in a tab more than seven days after its prompt was journaled
- **THEN** the prompt SHALL NOT be offered and the session SHALL open normally

#### Scenario: Same boot and session after a server crash
- **WHEN** the server restarts under the same boot and operating-system session identity and finds a tab's holder gone
- **THEN** that tab SHALL follow crash restart rather than move to history

### Requirement: The tab bridge reports structured A1 state and controller identity
Each A1 tab process SHALL receive a derived per-tab/per-incarnation credential and SHALL connect an authenticated bridge to the server that reports sequenced status from engine events, an event-loop heartbeat, its resolved A1 accent color, the Pi session file and name with name source, whether its last prompt was interrupted, pending extension UI/trust/permission request count, queued-input state, and origin-stamped `/quit` and empty-editor `Ctrl+D` requests. The server SHALL drop reports from superseded incarnations or non-increasing sequences. Before input from a new controller is accepted, holder and child SHALL establish the milestone-1 causal boundary across native, PTY, and child buffers. Client-scoped requests SHALL retain immutable controller identity/revision captured at admission and be rejected when stale or ambiguous. The server SHALL send visibility, rename, and graceful-stop notifications; hidden A1 SHALL continue advancing child-owned content and animation frames under the same render scheduling rules as viewed A1, while the host SHALL withhold inactive surface delivery and provide the latest complete resident terminal surface when the tab is viewed again; rename SHALL set the Pi session name. Bridge messages SHALL NOT carry prompts, transcripts, terminal input, or credentials. Credentials SHALL be private and removed from inherited environments before extensions or descendants. A missing bridge SHALL degrade status and disable client-scoped child requests without breaking terminal input or attach-local double-`Ctrl+C`. This requirement supersedes the minimal bridge requirement added by milestone 2.

#### Scenario: Pending extension request
- **WHEN** an extension opens a confirmation
- **THEN** the bridge SHALL report needs-input until answered

#### Scenario: Pending trust or permission request
- **WHEN** A1 waits for trust or permission
- **THEN** the bridge SHALL report needs-input until resolved

#### Scenario: Per-tab accent
- **WHEN** a tab's resolved A1 accent changes
- **THEN** its next sequenced bridge status SHALL report that accent without carrying terminal or prompt content

#### Scenario: Bridge unavailable
- **WHEN** a bridge cannot connect
- **THEN** the tab SHALL continue with process-level status, terminal input, and attach-local actions while client-scoped child requests stay disabled

#### Scenario: Buffered command crosses transfer
- **WHEN** an old controller's command remains buffered while a new controller is acknowledged
- **THEN** it SHALL retain the old generation or be rejected and SHALL affect neither client after supersession

#### Scenario: Hidden tab throttles animation
- **WHEN** no client views a working tab while streamed content and child-owned animations advance
- **THEN** the tab SHALL continue normal child rendering into its resident terminal while the host throttles only inactive surface delivery to attach clients
- **AND** viewing the tab SHALL present its latest complete surface without a visibility-triggered catch-up burst

#### Scenario: Bridge carries no content
- **WHEN** traffic is captured during prompts, streaming, and dialogs
- **THEN** it SHALL contain no prompt text, transcript text, terminal bytes, or credentials

### Requirement: Resident resources are bounded and observable
During a resident bare-A1 launch, A1 SHALL expose only `tabsAutoName` as an Agent-tab control in Settings > Tabs; it SHALL NOT expose or enforce `tabsMax`, a resident enable/disable toggle, or another user tab-count quota. During `a1 solo`, the complete Tabs settings section SHALL be absent. A legacy stored `tabsMax` property SHALL be ignored while remaining preserved by forward-compatible settings writes. Completed tab count SHALL be constrained only by successfully acquired process, persistence, containment, protocol, memory, and operating-system resources. Concurrent starts SHALL remain independently bounded by internal default 2 and hard cap 8, and prewarm SHALL use internal count and hard cap 1. One hidden prewarmed Agent MAY load Pi, settings, and extensions but SHALL own no session or writer lease before exact cwd/environment-matched promotion and SHALL start only when no visible start is pending. Every open Agent and the singleton Settings utility SHALL retain its process until explicit close; A1 SHALL provide no idle-suspension setting, timer, lifecycle, or glyph. The server SHALL exit only after ten minutes with no running tabs, clients, holders, or standby. Logs SHALL rotate and exclude terminal content, prompt text, and credentials. Cold launch, warm creation, Settings creation, reattach paint/input, input-to-process, and output-to-present SHALL be measured separately on Windows x64, macOS arm64, and Linux x64 against declared budgets, recording every miss.

#### Scenario: Bare A1 uses tabs
- **WHEN** bare `a1` launches on a supported platform
- **THEN** A1 SHALL use the resident host and present the tab strip

#### Scenario: Resident Settings omits a tab quota
- **WHEN** the user opens the resident Settings utility
- **THEN** Settings > Tabs SHALL expose automatic naming without a maximum-tabs entry
- **AND** no stored legacy value SHALL limit creation

#### Scenario: Stored tab limit above cap
- **WHEN** a profile retains a legacy `tabsMax` value such as 80
- **THEN** A1 SHALL ignore it for creation and preserve it as unknown compatibility data
- **AND** no clamp or tab-limit notice SHALL appear

#### Scenario: Solo mode omits tab settings
- **WHEN** the user runs `a1 solo` and opens Settings
- **THEN** A1 SHALL use the direct path without a tab strip
- **AND** Settings SHALL contain no Tabs section

#### Scenario: Many completed tabs remain open
- **WHEN** sequential tab starts continue to acquire all real required resources
- **THEN** the resident server SHALL retain every explicitly open tab without applying a configured or hard count refusal

#### Scenario: Concurrent starts remain bounded
- **WHEN** many creation requests arrive together
- **THEN** start work SHALL remain within the internal concurrent-start cap while completed tabs remain free of a count quota

#### Scenario: Prewarmed tab is promoted
- **WHEN** a standby exactly matches an Agent request's cwd and environment
- **THEN** it SHALL reserve and commit a new session identity before accepting input and then become visible

#### Scenario: Open tab remains resident
- **WHEN** an open idle Agent or Settings tab remains unviewed for any duration
- **THEN** its holder and child process SHALL remain running until explicit close

#### Scenario: Performance budget missed
- **WHEN** one platform exceeds a declared budget
- **THEN** evidence SHALL record that value and miss without inference from another platform

#### Scenario: Latency sample is matched to its own input
- **WHEN** a fixture echo predates its measured token send or a latency is negative or non-numeric
- **THEN** the earlier echo SHALL be ignored and the invalid metric SHALL fail rather than entering the p95 sample

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

### Requirement: Host status reports resident identity and health
`a1 tabs host status` SHALL report the server id, process id, build, release, protocol generation, epoch, uptime, observed detachment mode and any detachment verification failure reason, tab count by status, client count, the configured and hard limits, and the paths of the structured logs. It SHALL also report counters since server start for crash restarts, failed tabs, hang recoveries, unresponsive transitions, full-surface resyncs, and persistence, checkpoint, and bridge degradation. Counters SHALL be volatile and SHALL NOT contain prompt text, terminal content, or credentials.

#### Scenario: Status after a tab restart
- **WHEN** one tab crashed and restarted since the server started
- **THEN** `a1 tabs host status` SHALL show one crash restart and the server's detachment mode

#### Scenario: Status with no server
- **WHEN** the user runs `a1 tabs host status` and no server runs
- **THEN** A1 SHALL report that no host runs, exit successfully, and SHALL NOT start a server

### Requirement: An idle resident server exits after ten minutes
The resident server SHALL exit after ten minutes with no attached client and no user tab with a live holder. A prewarmed standby tab SHALL NOT keep the server alive; the server SHALL stop it before exiting. The server SHALL record the verified process identity of the standby holder it launched, and whenever it discards the standby or exits it SHALL offer that holder a graceful shutdown and then terminate it by that identity within a bounded deadline, whether or not the holder is connected. The server SHALL remove its endpoint and owner marker only while both still identify it.

#### Scenario: Only a standby tab remains
- **WHEN** every user tab is closed, no client is attached, and ten minutes pass
- **THEN** the server SHALL stop the standby tab, remove its own endpoint and marker, and exit
- **AND** the standby holder process SHALL NOT be running after the server has exited

#### Scenario: Client returns before the deadline
- **WHEN** a client attaches before the ten-minute interval ends
- **THEN** the server SHALL stay running and restart the interval only after it is idle again

### Requirement: Resident support is packaged, certified per platform, and reversible
The terminal-host binary and its session-writer lock SHALL ship for Windows x64, Linux x64, macOS arm64, and macOS x64 with artifact hashes, pinned source provenance, licenses, notices, and immutable-release placement verified before execution. A release SHALL NOT be packed unless every supported platform's terminal-host artifact and manifest are present. Bare `a1` SHALL run resident tabs on every packaged platform; certification SHALL be recorded evidence and SHALL NOT disable resident tabs at runtime. A platform SHALL be recorded as certified only after exact-package automated suites and manual or isolated-worker physical evidence on that platform for terminal closure, remote-session loss, forced attach-client termination, reattach, input fidelity and rendering, extension text UI, two-client attribution, server, holder, and child failure, sensitive-data separation, and conflict-safe direct rollback; until then it SHALL be recorded as CI-verified with each missing physical verdict marked pending. Physical automation SHALL NOT run on an active workstation. When the terminal-host artifact or its session-writer lock is missing, altered, incompatible, or unsupported, bare `a1` SHALL run the direct single-agent owned UI with one notice; registry records and sessions SHALL be preserved. Installed releases SHALL ignore the development terminal-host path override. Each additional platform requires a separate approved change and evidence.

#### Scenario: Server cannot start
- **WHEN** the terminal-host binary is missing, unverified, or fails its start budget
- **THEN** bare `a1` SHALL use the direct single-agent path with one notice, preserving records and applying the shared writer-lease check to any selected session rather than bypassing a live writer

#### Scenario: Altered terminal-host artifact
- **WHEN** the terminal-host executable in an installed release does not match its manifest hash or size
- **THEN** A1 SHALL NOT execute it and SHALL use the direct single-agent path with one notice

#### Scenario: Development override in an installed release
- **WHEN** `A1_TERMINAL_HOST_PATH` names another executable while an installed release launches
- **THEN** A1 SHALL ignore the override and verify the release's own terminal-host artifact

#### Scenario: Platform without recorded physical evidence
- **WHEN** automated suites pass on a platform but its physical acceptance record lacks a verdict for any required item
- **THEN** bare `a1` SHALL still run resident tabs there, the platform SHALL be documented as CI-verified rather than certified, and evidence from another platform SHALL NOT be used in its place

#### Scenario: Roll back with tabs running
- **WHEN** the user runs `a1 solo` for a session held by a live tab
- **THEN** A1 SHALL NOT write the held session, SHALL refuse or fork it, and the resident tabs SHALL keep running until `a1 tabs host stop`

### Requirement: Resident frame composition preserves terminal intensity

The resident terminal host SHALL preserve each unselected cell's bold and faint intensity when it composes retained libghostty state into an initial paint, patch, full repaint, or reattached surface. A style transition from faint content to ordinary content SHALL clear faint intensity before the ordinary cells are emitted. Host-owned selected-cell presentation MAY replace child intensity with its uniform selection style, but SHALL NOT leak that replacement or a prior faint attribute into following unselected cells.

#### Scenario: Contextual suggestion is repainted through a resident tab

- **WHEN** the bare-A1 editor emits an unaccepted contextual suggestion using faint ghost-text styling through a resident tab
- **THEN** the attached terminal SHALL display the suggestion with faint intensity rather than ordinary white prompt-text intensity
- **AND** retained repaint or reattach SHALL preserve the same faint presentation

#### Scenario: Tab accepts a contextual suggestion

- **WHEN** the user accepts the faint contextual suggestion with the configured Tab action and the editor repaints it as ordinary editable text
- **THEN** resident frame composition SHALL clear faint intensity before that text
- **AND** the accepted text SHALL use the same normal intensity as typed prompt text

#### Scenario: Selection overrides a faint cell

- **WHEN** the native host paints a selected region containing faint child cells
- **THEN** the region SHALL use the host's uniform selection style
- **AND** following unselected cells SHALL recover their own intensity without inheriting selection or stale faint state

### Requirement: Resident prompt admission is attachment-size independent
A resident tab SHALL durably record bounded submission identity and recoverable prompt text before dispatch without copying attachment payloads into the prompt-journal record. A prompt accepted by the owned attachment limits SHALL reach the agent with every validated attachment exactly once. Journal failure SHALL still preserve the draft and dispatch nothing.

#### Scenario: Valid screenshots exceed the journal record cap
- **WHEN** a resident-tab prompt contains valid screenshots whose combined encoded payload exceeds the prompt journal's per-record limit
- **THEN** journal admission SHALL remain within its bound
- **AND** the agent SHALL receive the prompt text and every validated screenshot exactly once

#### Scenario: Bounded journal admission fails
- **WHEN** the resident journal cannot durably record the bounded submission metadata and recoverable text
- **THEN** A1 SHALL retain the draft with visible recovery-journal feedback
- **AND** it SHALL dispatch neither text nor attachments

### Requirement: Resident prompt settlement closes the current admission
A completed resident submission SHALL be correlated, synchronized, settled, and retired even when command completion is observed after the session lifecycle has already returned to ready. When no unfinished submission remains, the journal SHALL become compactable without requiring another user prompt.

#### Scenario: First prompt completes while the tab stays open
- **WHEN** a resident tab completes its first prompt and no later prompt is submitted
- **THEN** that prompt SHALL be retired after the session is synchronized
- **AND** a later restart SHALL NOT offer it as unfinished
- **AND** the fully retired journal SHALL be compactable without another submission

#### Scenario: Steering remains active
- **WHEN** a steering or follow-up command is admitted while the session remains busy
- **THEN** its journal entry SHALL remain unfinished until the associated run settles
- **AND** ready-state reconciliation SHALL NOT retire it early

### Requirement: Interrupted image prompt recovery is honest
Recovery SHALL rehydrate image chips only from validated attachment sidecars available to the selected profile. Missing or unavailable attachments SHALL be removed from recovered editor text rather than shown as live-looking inert chips. Recovery SHALL never resend an interrupted prompt automatically.

#### Scenario: Verified sidecars remain available
- **WHEN** an interrupted image-bearing prompt is recovered and every referenced sidecar validates
- **THEN** the editor SHALL restore the recoverable text with live attachments in their original positions
- **AND** A1 SHALL wait for an explicit user submission

#### Scenario: Sidecar is missing or history is disabled
- **WHEN** an interrupted image-bearing prompt is recovered without a valid sidecar for one or more image chips
- **THEN** the editor SHALL preserve the remaining recoverable text and attachments
- **AND** it SHALL remove every unresolved image token instead of presenting it as an attached screenshot
- **AND** A1 SHALL wait for an explicit user submission

### Requirement: Resident terminal transport preserves semantic input events
The attach, server, and holder path SHALL preserve the key identity, modifiers, text, paste boundary, focus, mouse gesture, and resize represented by each accepted outer-terminal event until the viewed child consumes it. Transport and controller handoff SHALL deliver accepted events exactly once in order or reject them visibly before any partial delivery.

#### Scenario: Forward supported modified input
- **WHEN** the outer terminal reports a supported Ctrl, Alt, Shift, navigation, function, text/IME, focus, mouse, or resize event not owned by the tab shell
- **THEN** the child SHALL observe the same effective event that direct A1 observes on that platform

#### Scenario: Preserve one paste transaction
- **WHEN** the outer terminal reports a bounded paste whose payload spans transport frames
- **THEN** the holder SHALL admit and expose one complete child paste in order or reject the whole payload before delivering a prefix

#### Scenario: Transfer control during input
- **WHEN** a view change or focus claim occurs while prior and new input are in flight
- **THEN** no accepted event SHALL be duplicated, reordered, attributed to the wrong tab, or silently dropped

### Requirement: Resident terminal transport preserves child controls and modes
The resident path SHALL reproduce every supported child terminal effect needed for direct A1 parity, including clipboard writes, hyperlink targets and IDs, cursor visibility/shape/blink, styling, and Unicode cell widths. Styles SHALL preserve default/indexed/RGB colors, intensity, underline kind/color, italic, inverse, conceal, strike, overline, and supported blink. Child focus, mouse, paste, keyboard, alternate-screen and synchronization modes SHALL retain their semantic behavior while attach preserves ownership of outer input modes and holder encodes input against child modes. Replayable visual state SHALL be distinct from bounded ordered foreground one-shot effects, whose identity SHALL include incarnation and an independent sequence rather than a visual revision alone. Retained snapshots SHALL not replay historical effects.

#### Scenario: Child writes the terminal clipboard
- **WHEN** viewed A1 emits a supported clipboard control for selected or copied content
- **THEN** the outer terminal SHALL receive one bounded equivalent control for the user's clipboard without exposing it as visible cells or diagnostic content

#### Scenario: Child changes terminal interaction modes
- **WHEN** viewed A1 changes a supported cursor, focus, mouse, keyboard, hyperlink, alternate-screen, or presentation mode
- **THEN** the resident path SHALL preserve the equivalent semantic effect without surrendering attach-owned outer mode handling
- **AND** detach or failure SHALL restore every attach-owned mode

#### Scenario: Hidden child emits terminal controls
- **WHEN** an unviewed child emits a control whose effect is meaningful only while presented
- **THEN** the holder SHALL retain the child's current semantic state without applying that hidden tab's one-shot effect to the outer terminal
- **AND** later subscription SHALL not replay the suppressed effect

#### Scenario: Two effects share a visual revision
- **WHEN** two valid foreground clipboard writes occur before the next visual commit or obsolete visual states are replaced
- **THEN** both writes SHALL retain their separate ordered once-only identity rather than being deduplicated or replayed by visual revision

#### Scenario: An obsolete holder delivers an effect
- **WHEN** an effect arrives from an old incarnation or superseded foreground authority
- **THEN** it SHALL not be applied to the current outer view

#### Scenario: Link label remains unchanged
- **WHEN** a retained hyperlink's target or explicit identity changes while its label text stays the same
- **THEN** the new semantics SHALL survive reconstruction and damage output
- **AND** hyperlink/style state SHALL not leak into the strip or host overlay

### Requirement: Resident presentation commits coherent current state
The attach client SHALL present one coherent state derived from a committed tab topology, viewed identity, complete current child surface, strip, host overlay, terminal modes, and cursor. A create, close, switch, resize, status change, recovery, or overlay transition SHALL NOT expose a new strip state over stale child content, a blank intermediate frame, or a superseded later repaint. Presentation identity SHALL include the tab, process incarnation, revision, and geometry, with response fencing for superseded view/resize requests. Geometry identity SHALL remain distinct from server epoch and input-controller generation. Old geometry SHALL NOT be replayed as unbounded cursor-addressed content into a differently sized viewport; the prior coherent state MAY remain safely fitted until the matching replacement arrives. Revision ordering SHALL remain scoped to its tab and incarnation.

#### Scenario: Create and select a tab
- **WHEN** a new tab becomes the requested view
- **THEN** the prior coherent frame SHALL remain until the new topology and complete target surface can be committed together without flashing the old child under the new chip

#### Scenario: Close the viewed tab
- **WHEN** the active tab closes and a survivor becomes viewed
- **THEN** the removal, successor selection, complete successor surface, host overlays, and final cursor SHALL become visible coherently

#### Scenario: Update strip and child together
- **WHEN** status, title, hover, clock, child output, or an attach-owned prompt changes during another presentation update
- **THEN** equivalent updates SHALL coalesce to current state and no separately visible clear, strip-only, notice-only, or stale-cursor frame SHALL appear

#### Scenario: Terminal ignores synchronized output
- **WHEN** the outer terminal does not implement synchronized-update controls
- **THEN** each emitted presentation SHALL still be ordered and complete enough to avoid an attach-induced blank or contradictory intermediate frame

#### Scenario: Resize while an old frame is in flight
- **WHEN** the outer terminal shrinks or grows while a previous-size child frame is pending
- **THEN** presentation SHALL not wrap or overwrite unrelated cells by replaying that old frame at new geometry
- **AND** the matching new child surface, overlays, and cursor SHALL commit coherently without waiting for another model token

#### Scenario: Resize clears the parser synchronization mode
- **WHEN** resizing the retained parser clears synchronized-output mode before the child completes its new-size repaint
- **THEN** that mode reset SHALL not be treated as a completed child visual transaction
- **AND** any fitted prior screen SHALL remain explicitly provisional until a compatible replacement or bounded recovery is available

#### Scenario: A view or incarnation is superseded
- **WHEN** A-to-B-to-A switching, child restart, or repeated shrink/grow requests leave delayed responses in flight
- **THEN** stale request, incarnation, or geometry responses SHALL not overwrite the latest compatible committed view even when tab ID or final dimensions match

#### Scenario: Two clients view one child at different dimensions
- **WHEN** a controller and a differently sized spectator view the same tab
- **THEN** child geometry SHALL retain controller authority and the spectator SHALL safely fit its presentation without repeatedly resizing the shared child

### Requirement: Resident hot paths remain independent and bounded
Input routing, holder PTY draining, child render progress, and viewed-surface delivery SHALL use independent bounded work paths that do not wait on tab lifecycle operations or another tab's rendering. Ingress and pending work SHALL be bounded by declared message and byte limits, and sustained output SHALL yield to input, control, other tabs, and animation deadlines within bounded work rounds. Coalescing MAY replace unpublished presentation states but SHALL preserve the latest complete state and SHALL NOT delay an isolated input or output behind a pacing poll. Hidden output SHALL not require continuously shipping full-screen snapshots to shared routing state in order for the child to continue or for a later view to obtain current content. Expensive surface serialization and blocking operations SHALL NOT hold shared routing authority needed by unrelated tabs.

#### Scenario: All tabs produce high-rate output
- **WHEN** multiple children concurrently emit high-rate streamed output
- **THEN** every holder SHALL continue draining its own PTY and updating retained state within bounded resources while the viewed tab remains responsive

#### Scenario: Lifecycle operation stalls
- **WHEN** process spawn, termination, registry persistence, or another lifecycle operation reaches its deadline
- **THEN** unrelated input, PTY draining, tab switching, and presentation SHALL continue and the lifecycle failure SHALL remain isolated

#### Scenario: Rapidly switch among working tabs
- **WHEN** the user rapidly changes the requested view while several tabs stream
- **THEN** obsolete requested surfaces MAY be skipped, but the eventually committed view SHALL promptly receive one complete newest surface and subsequent live updates

#### Scenario: Server reconnect overlaps child output
- **WHEN** the server is unavailable and a holder is retrying its connection while the child continues output
- **THEN** the holder SHALL continue bounded PTY parsing, terminal query replies, and retained-state progress without waiting for reconnect completion
- **AND** a later connection SHALL receive current committed state rather than a raw-output replay backlog

#### Scenario: A terminal or socket writer is blocked
- **WHEN** a client's output writer cannot complete a write while input and other tabs have pending work
- **THEN** blocked output SHALL remain isolated from input processing and shared routing authority within declared resource bounds
- **AND** shutdown or connection failure SHALL not leak writer ownership or claim an incomplete paint succeeded

#### Scenario: Render ingress never becomes empty
- **WHEN** visual updates continuously arrive while input and animation work are pending
- **THEN** rendering SHALL yield within its bounded work round and input, control, and animation SHALL not wait for the render queue to become empty
- **AND** obsolete visual updates MAY be replaced but admitted user input SHALL remain ordered and exactly once

### Requirement: Interaction parity is certified across the complete resident boundary
Resident fidelity SHALL be demonstrated by driving equivalent sanitized interaction scripts through exact built direct and resident candidates on every supported platform and comparing semantic child outcomes, terminal presentation, clipboard/control effects, and responsiveness. Isolated encoder, parser, model, or final-snapshot probes SHALL NOT alone establish parity.

#### Scenario: Compare the parity matrix
- **WHEN** certification exercises prompt editing, effective shortcuts, completion, history, selection, copy, paste, mouse, dialogs, extension text UI, attachments, focus, resize, streaming, and detach
- **THEN** each interaction SHALL match direct A1 except for the explicitly declared resident-only differences

#### Scenario: Compare concurrent resident behavior
- **WHEN** certification runs several independently streaming tabs with rapid switching, lifecycle operations, paste, selection, resize, and slow-client pressure
- **THEN** it SHALL detect delayed background rendering, input stalls, stale surfaces, duplicate or missing events, and cross-tab interference rather than relying only on settled snapshots

#### Scenario: Record a platform-specific divergence
- **WHEN** exact-artifact evidence finds a resident/direct mismatch on one supported platform
- **THEN** that platform's parity verdict SHALL fail with the interaction and boundary named and SHALL NOT be inferred from another platform's result

### Requirement: Resident attach only reads the profile settings document
The attach client SHALL treat the profile settings document it is given as a file it only reads. It SHALL start whether or not that document exists and SHALL NOT create, replace, or change it.

#### Scenario: Start with an existing settings document
- **WHEN** bare `a1` starts the attach client for a profile whose settings document exists
- **THEN** the attach client SHALL start, read the time format from that document, and leave it a regular file

#### Scenario: Start without a settings document
- **WHEN** bare `a1` starts the attach client for a profile with no settings document
- **THEN** the attach client SHALL start with the default time format and SHALL NOT create anything at the settings path

### Requirement: The holder retains complete current terminal surfaces
Each holder SHALL drain its child PTY and update retained terminal state independently of view. A complete `Surface` SHALL contain all current rows, modes, and final cursor, never only dirty rows. Hidden tabs MAY suppress client delivery, but selection and other commit boundaries SHALL request the newest complete surface. Viewed output MAY coalesce superseded frames but SHALL continue presenting complete partial-reply states before settlement.

#### Scenario: Select a hidden streaming Agent
- **WHEN** an Agent streamed while hidden and is selected before its turn settles
- **THEN** its holder SHALL immediately emit a complete current surface containing the newest partial reply
- **AND** subsequent streamed output SHALL continue to update the viewed body

#### Scenario: Repaint after a status-only change
- **WHEN** attach must repaint an overlay or strip after the latest child output changed only some rows
- **THEN** its cached body SHALL still contain every current child row rather than only the last dirty rows

#### Scenario: Several holders drain together
- **WHEN** several Agents produce high-rate output concurrently
- **THEN** each holder SHALL drain and retain its own PTY without sharing another holder's revision, wake, render slot, or backpressure

#### Scenario: Slow client replaces frames
- **WHEN** a client cannot consume every complete frame
- **THEN** only that client's single pending frame SHALL be replaced with the newest complete state
- **AND** no holder or other client SHALL block or replay every skipped state

### Requirement: Resident clipboard delivery reaches the active user's standard clipboard

Resident A1 SHALL preserve the same standard-clipboard result as direct solo A1 for every admitted copy from the viewed tab. A valid bounded clipboard effect from the viewed child SHALL be forwarded exactly once to the outer terminal even when the child process cannot identify that route from Node TTY metadata. Clipboard effects from hidden, stale, switched-away, detached, failed, or replaced child revisions SHALL NOT change the user's clipboard. Internal route failures SHALL NOT be rendered into the child session as clipboard-unavailable status, warning, error, or notice text.

#### Scenario: Viewed tab copies selected text
- **WHEN** the active resident child admits automatic or explicit selection copy
- **THEN** the selected payload SHALL reach the outer user's standard clipboard exactly once
- **AND** resident transport SHALL NOT expose the control as visible cells or diagnostic content

#### Scenario: Process TTY classification hides the resident route
- **WHEN** a viewed child runs behind a pseudoterminal or pipe whose Node `stdout` metadata does not advertise asynchronous terminal output
- **THEN** the owned terminal-host contract SHALL still expose the certified clipboard submission route
- **AND** the triggering copy SHALL NOT fall back to a generic unavailable result

#### Scenario: Tab visibility changes during copy
- **WHEN** a clipboard effect belongs to a child revision that is hidden, switched away, detached, failed, or replaced before delivery authority is established
- **THEN** resident fencing SHALL refuse that stale effect
- **AND** SHALL NOT duplicate it when another tab becomes visible

### Requirement: Resident publication respects child visual transactions
A valid child synchronized-output transaction SHALL not become visible as separate clear, partial repaint, and final repaint states merely because its bytes arrive in separate transport reads. Retained parsing and terminal query responses SHALL continue during the transaction, while normal presentation uses the previous committed visual state until completion. Subscription and reconnect SHALL observe committed state rather than a half-written transaction. A malformed or unfinished transaction SHALL have bounded local recovery that does not block another tab. The final outer presentation SHALL have one synchronization envelope whose end follows all child, overlay, mode, and cursor changes; nested mode markers SHALL NOT end it early.

#### Scenario: Child paint arrives in installments
- **WHEN** a synchronized clear-and-repaint is split across reads, including splits inside its control sequences
- **THEN** the previous committed screen SHALL remain presented until the replacement transaction is complete
- **AND** the clear or partially repainted child SHALL NOT be published as a completed normal frame

#### Scenario: End and next begin share a read
- **WHEN** one transport read completes a child transaction and starts another unfinished transaction
- **THEN** the completed transaction SHALL remain available as a committed surface independently of the final synchronized-output mode
- **AND** the unfinished transaction SHALL not replace it merely because both arrived in one read

#### Scenario: Subscribe during an open transaction
- **WHEN** a client requests a tab while that child is halfway through a synchronized repaint
- **THEN** the response SHALL use a committed surface or preserve the prior coherent view until the new committed surface is available
- **AND** terminal query responses and other tabs SHALL continue independently

#### Scenario: Transaction never ends
- **WHEN** a child's synchronized transaction remains unfinished beyond the declared recovery bound
- **THEN** recovery SHALL remain local and bounded, SHALL be distinguishable from a normally completed frame, and SHALL not suppress valid subsequent output indefinitely
- **AND** additional bytes, repeated begin controls, and repeated subscriptions SHALL not extend the original recovery deadline

#### Scenario: Compose an overlay and cursor over child damage
- **WHEN** one outer frame changes the child, a host overlay, and the final cursor
- **THEN** no inner synchronization end SHALL make part of that frame visible before its final outer end

### Requirement: Resident live painting is damage proportional
Complete retained visual state SHALL remain available for activation, reconnection, overlay restoration, and resynchronization. Ordinary same-geometry live updates SHALL paint only changed content and required cursor or mode effects rather than repainting the entire child viewport. Equivalent visual state SHALL produce no redundant body paint. Coalescing SHALL preserve the latest complete state, and any incremental update with an unavailable or mismatched base SHALL require resynchronization rather than being mistaken for a complete body.

#### Scenario: Type one character in a stable prompt
- **WHEN** an ordinary prompt edit changes only a bounded subset of child rows at unchanged geometry
- **THEN** unchanged transcript rows SHALL not be repainted merely because the host retains a complete snapshot

#### Scenario: Animate the strip while the child is unchanged
- **WHEN** only a tab title, progress icon, clock, or hover decoration changes
- **THEN** presentation SHALL repaint only the affected host damage and restore the child's cursor without rewriting its unchanged body

#### Scenario: Drop obsolete visual updates
- **WHEN** a slow client cannot present every intermediate update
- **THEN** it SHALL receive a coherent latest state without replaying every obsolete frame or applying a patch to an unavailable base

#### Scenario: Remove an overlay over unchanged content
- **WHEN** an overlay closes after several child updates were coalesced
- **THEN** its damaged cells SHALL be restored from the newest complete retained state without a blank repair frame

#### Scenario: Frame waits behind a slow terminal writer
- **WHEN** a composed frame is queued but not completely written to the outer terminal
- **THEN** it SHALL not advance the actually painted baseline used for subsequent damage
- **AND** replacement or partial-write failure SHALL not leave later damage based on a frame the terminal never received

#### Scenario: Only cursor or visual attributes change
- **WHEN** cursor state, hyperlink target, palette, or cell attributes change without changing the displayed text
- **THEN** the changed semantics SHALL reach presentation without forcing unchanged body content to repaint

### Requirement: Concurrent presentation has independently measured progress
Resident concurrency evidence SHALL exercise at least three real owned A1 children with deterministic overlapping streamed turns, child animations, and all first-responder orders. It SHALL separately establish engine-event progress, child-render progress, terminal-state progress, and selected outer-presentation progress before settlement. It SHALL include hidden and detached intervals, switching, typing, resize, lifecycle pressure, and a slow client. Per-tab missing progress or excessive stalls SHALL NOT be concealed by aggregate percentiles, final snapshots, static status icons, or eventual token presence. Existing controlled-workload p95 budgets SHALL remain input-to-process 16 ms, committed-output-to-present 33 ms, retained activation paint 300 ms, and activation first accepted input 400 ms; engine-to-render delay and worst per-tab gaps SHALL also be reported separately.

#### Scenario: One frozen Agent among two fast Agents
- **WHEN** two Agents keep rendering but the third stops producing intermediate engine, renderer, retained, or presentation checkpoints during an otherwise advancing deterministic workload
- **THEN** concurrency evidence SHALL fail for that Agent and boundary even if pooled latency and final text would pass

#### Scenario: Small terminal fixture passes
- **WHEN** a key recorder or small counter fixture passes but the real A1 streaming workload has not exercised child rendering and animation
- **THEN** that fixture SHALL remain component evidence and SHALL NOT establish real-Agent parallel presentation parity

#### Scenario: Observation cannot establish a duration
- **WHEN** expected stage observations are missing, duplicated, stale, or timed with incompatible clock origins
- **THEN** evidence SHALL report an instrumentation failure instead of dropping the sample or reporting a passing latency
- **AND** forced rendering or pooled samples from other tabs SHALL not replace actual progress at the missing boundary

#### Scenario: Platform evidence differs
- **WHEN** exact built artifacts pass on one platform but another platform is unrun or divergent
- **THEN** each platform SHALL retain its own verdict and no successful platform SHALL certify another

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

### Requirement: Registry commits and viewer fan-out go through one path
Every registry mutation in the resident server SHALL advance the revision through one bump function, stage its commit through one snapshot function while the lock is held, and commit after the lock is released through one commit path with bounded duration. Every lookup of the clients viewing a tab SHALL go through one viewer helper, and the runtime lock SHALL be taken through one function that reports a poisoned lock as one error. Holder respawn orders, the crash-restart budget, explicit child restart, surface subscription and bridge visibility pushes, and result bodies SHALL each have one implementation shared by the attach, holder, bridge, and lifecycle handlers.

#### Scenario: A handler mutates a tab record
- **WHEN** any role handler changes a tab's record
- **THEN** the revision SHALL advance exactly once for that change through the bump function
- **AND** the commit SHALL run on a snapshot taken under the lock, after the lock is released

#### Scenario: The runtime lock is poisoned
- **WHEN** a handler takes the poisoned runtime lock
- **THEN** it SHALL fail with the one poisoned-state error
- **AND** no document SHALL be committed by that handler

### Requirement: The attach client's interaction is a pure state machine
The attach client SHALL model its interaction mode, its own view intent (the view a prompt opened in, Settings tab visibility and prewarm, the pending jump, and a pending tab creation), deferred input, hover, failure, notices, and the pending manual name in one state type stepped by a pure function from events to effects. Interaction mode SHALL be one enumerated value, so at most one of popup, rename, or drag is active, and key, mouse, and paste precedence SHALL be resolved by that one value. The coherent view transition (the requested tab, staged registry, and pending surface) SHALL stay with the presentation view model that owns the surfaces. The role loop SHALL own only the handshake, reader threads, the outer terminal, bindings, settings observation, encoding, presentation, and effect application. The simulator SHALL be able to drive the attach core with seeded server messages and input.

#### Scenario: A rename is requested while the context menu is open
- **WHEN** the rename action is chosen from the open context menu
- **THEN** the mode SHALL change from popup to rename in one step
- **AND** no frame SHALL show the menu and the rename editor together

#### Scenario: Input arrives while a view change is pending
- **WHEN** keys or a paste arrive after a tab switch was requested and before its surface arrived
- **THEN** the input SHALL be held, within the existing byte and frame limits, for the tab it targets
- **AND** when the view commits, input held for that tab SHALL be delivered to it in order and input held for any other target SHALL be dropped, exactly as the attach client did before

#### Scenario: A view transition completes
- **WHEN** the requested tab's complete surface arrives after its list snapshot was staged
- **THEN** the presentation view model SHALL commit the tabs, the viewed tab, and the surface together
- **AND** any popup or rename prompt that belonged to the previous viewed tab SHALL be cleared in that same step

#### Scenario: The simulator drives the attach core
- **WHEN** the seeded simulator feeds interleaved server messages, key, mouse, paste, resize, focus, and tick events
- **THEN** every step SHALL yield at most one mode and a paint effect after every change to what a paint shows
- **AND** once the client exits, no step SHALL yield any effect

### Requirement: Role reader threads never block on recovery waits
A holder or bridge reader thread SHALL NOT sleep for a restart delay or block waiting for a recovery slot. A respawn's delay SHALL be a timer effect of the server core, and the delay, the session-writer check, and the recovery-slot wait SHALL complete outside the reader thread, so input from that peer is processed while they are pending.

#### Scenario: A child restart is delayed by the budget
- **WHEN** a holder exits and the restart budget schedules a delayed restart
- **THEN** the holder's reader thread SHALL continue processing its frames during the delay
- **AND** the restart SHALL start when the timer effect completes, unless a newer restart for that tab superseded it

#### Scenario: Recovery slots are exhausted
- **WHEN** a respawn needs a recovery slot and none is free
- **THEN** the holder's reader thread SHALL keep processing its frames while the respawn waits
- **AND** the respawn SHALL proceed when a slot is released, or the tab SHALL be marked failed when the start gate stays closed past its bound

### Requirement: Resident tabs fit current controller geometry before presentation

Whenever an authoritative attach controller reports new terminal geometry, A1 SHALL route that geometry to the selected holder and SHALL pre-fit every resident holder that is globally hidden and unclaimed. A1 SHALL exclude any tab currently viewed or controlled by another client. Whenever an attach client requests a resident tab view, the request SHALL carry that client's current terminal geometry, and after granting controller authority A1 SHALL queue any target resize before enabling the target holder's fresh surface publication. This SHALL include switching to a tab that was hidden during an outer-terminal resize and attaching directly to an already-running tab. The selected child SHALL publish a complete surface for the current controller geometry without requiring another user input, model event, or terminal resize, and the outer UI SHALL NOT commit an intermediate old-geometry target surface. A read-only spectator SHALL NOT resize any shared child.

#### Scenario: Hidden tabs reflow during authoritative resize

- **WHEN** the outer terminal changes size while a client controls one resident tab
- **THEN** A1 SHALL resize that selected holder and every globally hidden, unclaimed holder to the controller's current columns and rows
- **AND** hidden holders SHALL reflow without enabling full-surface publication to the outer terminal

#### Scenario: Switch to a pre-fitted hidden tab

- **WHEN** the user switches to a resident tab that was hidden during the latest authoritative outer resize
- **THEN** the newly selected holder SHALL already use the current controller columns and rows
- **AND** its first fresh replacement surface SHALL be fitted to those dimensions without a visible old-size target frame or another resize event

#### Scenario: Activation repairs a missed background resize

- **WHEN** a requested resident holder started after the last background resize or otherwise retained different dimensions
- **THEN** the view request SHALL carry the current controller geometry
- **AND** A1 SHALL queue that resize before enabling the target's fresh surface subscription

#### Scenario: Reattach at a different size

- **WHEN** an attach client opens an already-running resident tab from a terminal whose current dimensions differ from the tab's retained geometry
- **THEN** activation SHALL resize that holder to the attaching controller's current geometry before a fresh replacement surface commits

#### Scenario: Differently sized spectator and active tabs remain isolated

- **WHEN** another client views or controls a tab using different terminal dimensions, or a read-only client switches views
- **THEN** background fitting SHALL leave the other client's viewed or controlled tab unchanged
- **AND** the spectator SHALL fit the controller-sized presentation without resizing any shared child

### Requirement: A holder without a record ends instead of replacing its server
When the server refuses a holder's hello for a definitive reason, it SHALL answer with a `refused` message naming that reason before closing the connection. A holder SHALL treat a refusal for no registry or standby record, a rejected credential, a newer server epoch, or an incarnation, holder identity, child identity, or role mismatch as definitive and SHALL exit, ending its child, without requesting a replacement server. A holder SHALL keep its bounded reconnect only for transient failures, and the interval between replacement requests SHALL grow to at least fifteen seconds. A standby holder SHALL NOT request a replacement server; it SHALL exit when its server disconnects or refuses it.

#### Scenario: Orphaned standby holder meets a new server
- **WHEN** a standby holder outlives the server that prewarmed it and a replacement server refuses its hello for having no record
- **THEN** the holder SHALL exit within its handshake deadline and SHALL spawn no further replacement request

#### Scenario: Registered holder loses its server
- **WHEN** a holder with a registry record cannot connect because no server runs
- **THEN** it SHALL keep requesting a replacement with a growing interval, exactly as before, and SHALL be re-admitted when one starts

### Requirement: Role-spawned children never show a console window on Windows
On Windows, every child process a resident role spawns through the host's fixed command path (replacement-server requests, bounded probes, and maintenance children) SHALL be created without a console window, and detached resident launches SHALL continue to receive no console at all.

#### Scenario: Console-less holder requests a replacement server
- **WHEN** a detached holder spawns a replacement-server request on Windows
- **THEN** no console window SHALL appear for the request process

### Requirement: Windows resident transport readiness is completion-driven

On Windows, resident endpoint connection admission and frame transfer SHALL use bounded operating-system waits and overlapped completion rather than sleep-based pipe readiness polling. Readiness progress SHALL NOT depend on a successful or effective multimedia timer-period request. A pending read SHALL NOT serialize an independent write on the same connection. The transport SHALL preserve the existing owner-only admission, peer verification, first-instance protection, non-inherited custody, generation-1 frame bounds, reliable control ordering, latest-surface replacement, and slow-peer isolation. Unix endpoint semantics SHALL remain unchanged.

#### Scenario: An idle connection receives interactive traffic under coarse timers

- **WHEN** an existing Windows resident connection receives input or a surface after an idle period and its process has no effective short timer-period request
- **THEN** the corresponding pipe operation SHALL progress from operating-system completion without waiting for a periodic readiness sleep
- **AND** other peers and tab children SHALL retain independent progress

#### Scenario: One direction is waiting for data

- **WHEN** a Windows connection has a pending read and its owner admits a frame for writing
- **THEN** the write SHALL progress independently of that read
- **AND** admitted frame bytes SHALL retain their original order

#### Scenario: A peer sends only part of its handshake

- **WHEN** a Windows peer supplies only part of its first frame's length prefix or body
- **THEN** the complete handshake SHALL remain bounded by its absolute four-second deadline rather than a first-byte readiness check
- **AND** expiry SHALL fail only that connection after safely cancelling and draining its pending operation

#### Scenario: Shutdown races with completion

- **WHEN** timeout, peer disconnect, or owning-connection shutdown races with an overlapped completion
- **THEN** the owner SHALL resolve or cancel and drain every affected operation before releasing its buffers, events, or final handle reference
- **AND** operation-scoped cancellation SHALL NOT inadvertently cancel an independent operation or another peer's connection

#### Scenario: A new client joins after a simulated wake gap

- **WHEN** a simulated long attach clock gap occurs and a new client subsequently connects while prior connections remain live
- **THEN** both existing and new connections SHALL continue completion-driven transfer under their normal ownership and queue bounds
- **AND** the gap SHALL NOT authorize process restart, prompt replay, or replacement of a live session writer

### Requirement: Wake responsiveness observations separate local completion from physical presentation

The resident host SHALL provide opt-in, bounded, asynchronous, payload-free observations that identify attach wake-gap/repaint events and local monotonic transport and outer-write completion durations. Normal pending-read idle time SHALL NOT by itself be classified as a delivery-latency fault. Derived latency evidence SHALL use causally matched events and SHALL reject invalid or clock-discontinuity-crossing samples. Diagnostic pressure SHALL drop only observations with explicit loss accounting, never stall terminal I/O. Observation fields SHALL be additive and SHALL contain no terminal content, input text, prompts, transcripts, credentials, or environment values.

#### Scenario: Attach detects one long clock gap

- **WHEN** attach detects one qualifying long gap and then returns to ordinary ticks
- **THEN** it SHALL retain its existing one-shot complete repaint behavior and emit the associated opt-in wake/repaint observation
- **AND** it SHALL NOT repeatedly repaint solely because of that same gap or restart a resident process

#### Scenario: Wall time changes while a trace is active

- **WHEN** wall-clock time moves discontinuously or a wake gap separates observation epochs
- **THEN** local completion durations SHALL remain monotonic
- **AND** derived latency percentiles SHALL exclude invalid or cross-discontinuity samples instead of treating them as delivery evidence

#### Scenario: Observation output falls behind

- **WHEN** the opt-in observation queue reaches its existing bound
- **THEN** terminal transfer SHALL continue without waiting for diagnostics
- **AND** the next admitted observation SHALL report diagnostic loss without including terminal payloads

#### Scenario: An automated wake-gap fixture passes

- **WHEN** simulated-gap and transport fixtures pass without a physical sleep/wake run
- **THEN** the result SHALL be described as simulated-gap and transport evidence only
- **AND** it SHALL NOT claim physical wake recovery or equate outer-write completion with pixels presented by the terminal

### Requirement: Windows publication does not debounce sustained input indefinitely

The holder SHALL retain the earliest pending Windows render-pass publication deadline across subsequent synchronized-output markers and settling output until that publication decision is consumed. A newer frame SHALL NOT restart that deadline. Ordinary publication SHALL still withhold an open transaction, and malformed transactions SHALL retain the existing explicit bounded recovery path. Unix verbatim boundaries SHALL remain immediately publishable.

#### Scenario: Repeated frames contain their cells between relayed markers

- **WHEN** Windows receives complete transactions every 30 ms with changed cells between begin and end markers and no post-end cells
- **THEN** the holder publishes changed retained state during the sustained sequence without waiting for input to stop
- **AND** later end markers do not renew the first pending 16 ms fallback

#### Scenario: Render-pass output keeps extending the quiet interval

- **WHEN** post-marker output continues in fragments less than 2 ms apart
- **THEN** quiet-settle activity does not extend the hard pending publication deadline
- **AND** no ordinary publication exposes an open transaction

#### Scenario: Publication consumes pending wait state

- **WHEN** a complete or explicit recovery publication is consumed
- **THEN** the next independent update receives its own bounded wait
- **AND** an expired old deadline cannot bypass the next update's coherence gate

### Requirement: Real-A1 responsiveness evidence rejects delayed presentation

Healthy resident responsiveness evidence SHALL fail when matched commit-to-first-completed-outer-paint p95 exceeds 33 ms or a viewed healthy scenario supplies no matched presentation samples. Matches SHALL bind tab, incarnation and revision and SHALL exclude invalid clock intervals. Explicitly stopped-stage and slow-sink controls SHALL remain distinguishable from healthy windows. Coalescing obsolete complete surfaces SHALL remain permitted.

#### Scenario: Healthy paint is consistently delayed

- **WHEN** a healthy viewed scenario has matched completed paints 200 ms after its holder commits
- **THEN** the responsiveness verdict fails even if all processes and animations continue progressing

#### Scenario: A later strip repaint repeats a delivered revision

- **WHEN** one revision first paints within budget and is painted again by later chrome changes
- **THEN** delivery latency uses the first completed paint for that revision and incarnation

#### Scenario: Actual input exercises owned UI rendering

- **WHEN** the exact-artifact harness types synthetic text, navigates an owned menu and scrolls through the same real A1 UI directly and through resident roles at matching child dimensions
- **THEN** it observes the resulting completed synthetic screen changes in order
- **AND** it rejects missing changes, prolonged stalls and resident p95 overhead beyond the existing 16 ms input plus 33 ms presentation envelope relative to direct solo

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

### Requirement: Active outer resize repaints the complete frame directly

When an attach client's outer terminal reports changed geometry, A1 SHALL immediately update the host's geometry and generation, forward the new size to the viewed child, and repaint the retained complete strip and child frame at the current dimensions in one synchronized presentation. A1 SHALL NOT show a resize-only curtain, centered status, dimmed reveal, or fade, whether the resize is a quick snap, a prolonged drag, or a background terminal-tab geometry change. Subsequent current-geometry child surfaces SHALL replace the retained rows normally. A resize notification matching already established dimensions SHALL remain a no-op. Focus gain SHALL request a complete current-size repaint without replaying stale resize feedback. Startup first-draw and tab-switch coherence rules SHALL remain unchanged.

#### Scenario: Initial unchanged resize notification stays invisible

- **WHEN** attach startup receives a resize notification matching its established terminal columns and rows
- **THEN** A1 SHALL preserve the ordinary startup presentation path without repainting or showing a resize message

#### Scenario: Continuous window resize keeps the current frame

- **WHEN** the user drags the outer terminal boundary and multiple resize events arrive
- **THEN** each accepted geometry SHALL be forwarded and the complete retained frame SHALL repaint at the new size
- **AND** no centered resize status, blank-only frame, or resize fade SHALL appear

#### Scenario: A fresh surface completes resize

- **WHEN** the active holder publishes a surface for the final geometry
- **THEN** A1 SHALL paint the latest child content at full intensity without waiting for a settle or recovery timer

#### Scenario: Inactive terminal tab returns after resize

- **WHEN** another terminal tab was active while the A1 terminal changed dimensions and the user returns
- **THEN** A1 SHALL repaint the current complete frame without replaying a resize-only curtain or fading the child cursor
