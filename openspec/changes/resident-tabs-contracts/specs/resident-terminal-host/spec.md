## ADDED Requirements

### Requirement: Resident host primitives identify processes and boots exactly
The native terminal host SHALL identify a process by its pid together with its native start time on Windows x64, macOS, and Linux, and SHALL treat a process whose start time differs from the recorded one as unrelated. It SHALL report a boot identity that changes on every reboot and never changes within one boot, and an OS-session identity that changes on every logon.

#### Scenario: Process identifier reuse
- **WHEN** a recorded pid now belongs to a process with a different start time
- **THEN** the primitive SHALL report the recorded process as gone and SHALL NOT identify the new process as it

#### Scenario: Same boot
- **WHEN** boot identity is read twice without a reboot in between
- **THEN** both reads SHALL return the same identity

### Requirement: Resident host endpoints admit only their owner
The native terminal host SHALL create its local endpoints so that only the creating operating-system user can connect: a named pipe with an owner-only security descriptor and first-instance protection on Windows, and a Unix domain socket in an owner-only directory on macOS and Linux with the peer's credentials checked on every connection.

#### Scenario: Another local user connects
- **WHEN** a process of another operating-system user connects to the endpoint
- **THEN** the connection SHALL be refused before any message is read

#### Scenario: Endpoint name is already taken
- **WHEN** another process already owns the Windows pipe name
- **THEN** creation SHALL fail rather than share or replace that endpoint

### Requirement: Resident roles launch outside terminal containment through a fixed path
The native terminal host SHALL start resident roles only through a launch primitive that accepts the verified terminal-host artifact and a role from a fixed list, and SHALL refuse any other executable or role before spawning. The launched process SHALL run outside the launching terminal's containment: outside the caller's kill-on-close job on Windows, using WMI when the job forbids breakaway, and in a new session without a controlling terminal on macOS and Linux, staying in the caller's per-user bootstrap namespace on macOS. The primitive SHALL verify the launched process's identity and containment and report the observed detachment mode, and SHALL report failure instead of success when either cannot be verified. Ordinary descendants of the launching tree SHALL gain no way to leave their containment.

#### Scenario: Launching tree is killed
- **WHEN** a resident role was launched and the launching process tree is then killed, or on macOS and Linux its session is hung up
- **THEN** the resident role SHALL keep running with its verified identity

#### Scenario: Request names an arbitrary executable
- **WHEN** a launch request supplies an executable or role outside the fixed list
- **THEN** the primitive SHALL refuse it without spawning a process

#### Scenario: Ordinary child stays contained
- **WHEN** an ordinary child of the launching tree tries to leave its containment and the tree is then killed
- **THEN** that child SHALL end with the tree

### Requirement: Session-writer locks belong to the writing process
The native terminal host SHALL provide a session-writer lock, usable both natively and in-process from Node, that the writing process itself holds through an operating-system lock, so that the lock is released when, and only when, that process has exited. The lock SHALL be keyed by the session file's canonical identity so that case, symbolic-link, junction, and hard-link aliases of one file contend for one lock, and SHALL allow reserving a not-yet-created session by its canonical location and binding the created file without a gap in exclusivity.

#### Scenario: Two writers select aliases of one file
- **WHEN** two processes request the writer lock for two different paths that name the same file
- **THEN** exactly one SHALL acquire it and the other SHALL be refused

#### Scenario: Writer is killed
- **WHEN** the process holding a writer lock is killed
- **THEN** another process SHALL be able to acquire the lock once the killed process has exited, and not before

#### Scenario: New session is reserved
- **WHEN** a process reserves a session location that has no file yet and then creates the file
- **THEN** no other process SHALL acquire the lock for that location or file at any point in between

### Requirement: Durable file replacement leaves complete content
The native terminal host SHALL replace a file by writing a temporary file in the same directory, flushing it, replacing the target atomically, and flushing directory metadata with each platform's durable semantics: a write-capable flush and write-through replacement on Windows, file and directory `fsync` on Linux, and `F_FULLFSYNC` on macOS. A replacement SHALL be reported complete only after every step succeeds. Supported filesystems SHALL be documented.

#### Scenario: Writer killed mid-replacement
- **WHEN** the writing process is killed at any step of a replacement
- **THEN** the target SHALL afterwards contain either the complete previous content or the complete new content

### Requirement: Host exchanges use a generation-stable bounded protocol
Every terminal-host connection SHALL begin with a handshake carrying role, protocol generation, build, features, and credentials, and SHALL fail with a typed outcome when the handshake does not complete within its timeout. Frames SHALL be length-prefixed and bounded, and input messages SHALL have their own lower bound. Within a generation, messages SHALL change only additively with defaulted optional fields and unknown-value fallbacks, guarded by frozen shape fixtures whose recorded digest CI checks; a missing optional method SHALL disable only that operation; a generation mismatch SHALL produce a typed incompatibility outcome. The frame decoder SHALL never panic or allocate beyond its bounds on arbitrary input.

#### Scenario: Oversized frame
- **WHEN** a peer sends a frame above its limit
- **THEN** the receiver SHALL reject it without allocating the declared size

#### Scenario: Generation mismatch
- **WHEN** a peer offers a protocol generation the receiver does not support
- **THEN** the handshake SHALL end with a typed incompatibility outcome

#### Scenario: Fixture shape changes
- **WHEN** a generation-1 message shape changes in a way that is not additive
- **THEN** the fixture digest check SHALL fail

### Requirement: Input control transfers only across a proven ordering barrier
The terminal host's I/O-free core SHALL admit input to a tab under exactly one controller generation at a time. Transferring control SHALL freeze admission for the old controller and SHALL admit the new controller only after every byte already accepted has been written to the pseudoterminal and the child has read an ordering marker through that same input stream. Each command SHALL record the generation that admitted it and SHALL be rejected, never relabelled, once that generation is superseded. Deterministic simulation SHALL prove these properties across interleavings of buffered input, delayed commands, and transfers; where a platform cannot provide the ordering marker, transfer SHALL stay disabled on that platform.

#### Scenario: Buffered command crosses a transfer
- **WHEN** an old controller's command is still buffered while control transfers to a new controller
- **THEN** the command SHALL keep its old generation and be rejected once that generation is superseded, and SHALL NOT execute under the new controller

#### Scenario: Simulation finds a misattributed command
- **WHEN** a simulated interleaving executes a command under a generation that did not admit it
- **THEN** the simulation test SHALL fail with the minimized event sequence
