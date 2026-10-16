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
Each A1 tab process SHALL receive a derived per-tab/per-incarnation credential and SHALL connect an authenticated bridge to the server that reports sequenced status from engine events, an event-loop heartbeat, its resolved A1 accent color, the Pi session file and name with name source, whether its last prompt was interrupted, pending extension UI/trust/permission request count, queued-input state, and origin-stamped `/quit` and empty-editor `Ctrl+D` requests. The server SHALL drop reports from superseded incarnations or non-increasing sequences. Before input from a new controller is accepted, holder and child SHALL establish the milestone-1 causal boundary across native, PTY, and child buffers. Client-scoped requests SHALL retain immutable controller identity/revision captured at admission and be rejected when stale or ambiguous. The server SHALL send visibility, rename, and graceful-stop notifications; hidden A1 SHALL reduce animation work and rename SHALL set the Pi session name. Bridge messages SHALL NOT carry prompts, transcripts, terminal input, or credentials. Credentials SHALL be private and removed from inherited environments before extensions or descendants. A missing bridge SHALL degrade status and disable client-scoped child requests without breaking terminal input or attach-local double-`Ctrl+C`. This requirement supersedes the minimal bridge requirement added by milestone 2.

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
- **WHEN** no client views a working tab
- **THEN** A1 SHALL stop advancing child-owned animation frames while heartbeat and status continue

#### Scenario: Bridge carries no content
- **WHEN** traffic is captured during prompts, streaming, and dialogs
- **THEN** it SHALL contain no prompt text, transcript text, terminal bytes, or credentials

### Requirement: Resident resources are bounded and observable
During a resident bare-A1 launch, A1 SHALL expose only `tabsMax` and `tabsAutoName` as tab controls in Settings > Tabs. `tabsMax` SHALL appear with default 10 and range 1–50, and `tabsAutoName` SHALL appear defaulted on. A1 SHALL expose no `residentTabs` or enable/disable toggle. During `a1 solo`, the complete Tabs settings section SHALL be absent. Out-of-range `tabsMax` SHALL clamp with one notice. Unresponsive restart and stall-notice timing SHALL not be user-facing controls and SHALL use internal values of 120 and 300 seconds respectively. Concurrent starts SHALL use internal default 2 and hard cap 8; prewarm SHALL use internal count and hard cap 1. One hidden prewarmed standby MAY load Pi, settings, and extensions but SHALL own no session or writer lease before exact cwd/environment-matched promotion and SHALL start only when no visible start is pending. Every open tab SHALL retain its process until explicit close; A1 SHALL provide no idle-suspension setting, timer, lifecycle, or glyph. The server SHALL exit only after ten minutes with no running tabs, clients, holders, or standby. Logs SHALL rotate and exclude terminal content, prompt text, and credentials. Cold launch, warm creation, reattach paint/input, input-to-process, and output-to-present SHALL be measured separately on Windows x64, macOS arm64, and Linux x64 against declared budgets, recording every miss.

#### Scenario: Bare A1 uses tabs
- **WHEN** bare `a1` launches on a supported platform
- **THEN** A1 SHALL use the resident host and present the tab strip

#### Scenario: Solo mode omits tab settings
- **WHEN** the user runs `a1 solo` and opens Settings
- **THEN** A1 SHALL use the direct path without a tab strip
- **AND** Settings SHALL contain no Tabs section

#### Scenario: Stored tab limit above cap
- **WHEN** stored `tabsMax` is 80
- **THEN** A1 SHALL apply 50 and report the clamp once

#### Scenario: Prewarmed tab is promoted
- **WHEN** a standby exactly matches cwd and environment
- **THEN** it SHALL reserve and commit a new session identity before accepting input and then become visible

#### Scenario: Open tab remains resident
- **WHEN** an open idle tab remains unviewed for any duration
- **THEN** its holder and A1 process SHALL remain running until explicit close

#### Scenario: Performance budget missed
- **WHEN** one platform exceeds a declared budget
- **THEN** evidence SHALL record that value and miss without inference from another platform

### Requirement: Updates retain the active resident cohort
Installing or activating a release SHALL NOT terminate the server, holders, or tab processes. Resident binaries and tab processes SHALL run from immutable release directories, and every release used by a live verified resident process SHALL be retained; when a recorded resident identity cannot be verified or read, its release SHALL be retained. In this version a same-generation newer client MAY attach with unsupported optional operations disabled, while the existing resident cohort remains on its release until all tabs stop. A generation mismatch SHALL report that the host must be stopped explicitly with `a1 tabs host stop`, SHALL use the direct single-agent path for that launch, and SHALL NOT kill or recycle tabs. Automatic endpoint handoff and idle release recycling require a later change.

#### Scenario: Update mid-turn
- **WHEN** `a1 update` runs while a tab streams
- **THEN** the turn and resident process identities SHALL remain uninterrupted and their immutable release SHALL remain retained

#### Scenario: Newer client with a different generation
- **WHEN** bare `a1` from a newer release reaches a resident server of another protocol generation
- **THEN** A1 SHALL print one notice naming `a1 tabs host stop`, run the direct single-agent path, and leave every resident process running

#### Scenario: Recorded resident identity cannot be inspected
- **WHEN** release cleanup cannot read a resident registry or verify a recorded process identity
- **THEN** every release that registry records SHALL be retained

### Requirement: Resident tabs have non-interactive maintenance commands
A1 SHALL provide `a1 tabs` to list tabs with identity, name, status, and cwd; `a1 tabs stop <id>` and `a1 tabs stop --all`; `a1 tabs host status` and `a1 tabs host stop`, which stops tabs gracefully before the server; and `a1 tabs doctor`, which creates a bounded redacted diagnostic bundle. These commands SHALL NOT start an interactive runtime, SHALL NOT start a server merely to report that none runs, SHALL verify the terminal-host artifact before executing it, and SHALL fail concisely with nonzero status on invalid arguments. The doctor bundle SHALL exclude secrets, tokens, derived credentials, environment values, prompt journals, draft checkpoints, last-screen snapshots, the private child-stderr recovery sink, and terminal content.

#### Scenario: List with no server
- **WHEN** the user runs `a1 tabs` and no server runs
- **THEN** A1 SHALL report no running tabs and SHALL NOT start a server

#### Scenario: Stop one tab
- **WHEN** the user runs `a1 tabs stop <id>` for a working tab
- **THEN** that tab's child SHALL receive a graceful shutdown before bounded verified termination, the tab SHALL be removed, its session SHALL remain resumable, and other tabs SHALL be unaffected

#### Scenario: Stop the host while the server is unresponsive
- **WHEN** the user runs `a1 tabs host stop` and the identity-verified server does not answer within its deadline
- **THEN** A1 SHALL terminate only that verified server, stop the surviving holders gracefully, and leave no resident process running

#### Scenario: Doctor bundle with sensitive recovery data present
- **WHEN** the user runs `a1 tabs doctor` while journals, last screens, and content in the private child-stderr sink exist
- **THEN** the bundle SHALL contain structured logs, crash records, host status, and redacted registry data, and SHALL contain none of the excluded data

#### Scenario: Invalid arguments
- **WHEN** the user runs `a1 tabs stop` with no id and no `--all`
- **THEN** A1 SHALL print one concise diagnostic, exit nonzero, and perform no I/O against resident processes

### Requirement: Host status reports resident identity and health
`a1 tabs host status` SHALL report the server id, process id, build, release, protocol generation, epoch, uptime, observed detachment mode and any detachment verification failure reason, tab count by status, client count, the configured and hard limits, and the paths of the structured logs. It SHALL also report counters since server start for crash restarts, failed tabs, hang recoveries, unresponsive and stalled transitions, full-surface resyncs, and persistence, checkpoint, and bridge degradation. Counters SHALL be volatile and SHALL NOT contain prompt text, terminal content, or credentials.

#### Scenario: Status after a tab restart
- **WHEN** one tab crashed and restarted since the server started
- **THEN** `a1 tabs host status` SHALL show one crash restart and the server's detachment mode

#### Scenario: Status with no server
- **WHEN** the user runs `a1 tabs host status` and no server runs
- **THEN** A1 SHALL report that no host runs, exit successfully, and SHALL NOT start a server

### Requirement: An idle resident server exits after ten minutes
The resident server SHALL exit after ten minutes with no attached client and no user tab with a live holder. A prewarmed standby tab SHALL NOT keep the server alive; the server SHALL stop it before exiting. The server SHALL remove its endpoint and owner marker only while both still identify it.

#### Scenario: Only a standby tab remains
- **WHEN** every user tab is closed, no client is attached, and ten minutes pass
- **THEN** the server SHALL stop the standby tab, remove its own endpoint and marker, and exit

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
