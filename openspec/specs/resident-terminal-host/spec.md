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
