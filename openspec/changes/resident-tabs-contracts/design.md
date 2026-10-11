# Design

The product design, decisions, and roadmap live in [`docs/architecture/resident-tabs.md`](../../../docs/architecture/resident-tabs.md). This document covers only what milestone 1 builds and how it is proven.

## Context

`native/terminal-host` is one Rust package (`portable-pty`, `crossterm`, pinned `libghostty-vt`) that today builds only the fixed 2×2 proof, and CI builds and probes it on Windows x64 (#588). `native/process-guardian` already has reusable process-identity patterns for Windows, Linux, and macOS. No resident role, product setting, or Node lock addon exists.

The supported milestone-1 targets are exactly Windows x64, Linux x64, and macOS arm64. A later platform requires its own plan and evidence.

## Goals / Non-Goals

**Goals:**

- Every operating-system behavior that milestones 2–6 rely on exists as a tested primitive on all three exact targets.
- The generation-1 wire encoding and initial message fixtures are frozen before any resident role speaks them.
- The controller-transfer state machine is proven independently of I/O, and the proposed child-observed PTY boundary is exercised by a native fixture on each target.
- The writer-bound lock is callable both from Rust and from Node in the process that owns the session writer.

**Non-Goals:**

- Server, holder, or attach roles; product wiring; the `residentTabs` setting; release packaging; or changing the published npm surface.
- Loading the Node addon from A1, Pi-comparison, startup, resume, switch, import, fork, rename, or fallback paths. Milestone 3 owns that wiring.
- Claiming physical power-loss evidence from process-kill tests. Exact-package physical evidence belongs to milestone 6.
- Removing the 2×2 proof (milestone 2).

## Decisions

### 1. One Cargo package with a shared library and two artifacts

Keep `native/terminal-host` as one Cargo package and source authority. Move reusable platform, protocol, and core code behind its library target; the existing `terminal-host` binary imports that library. A feature-gated `cdylib` wrapper exports the session lock through Node-API 9 as `a1_session_lock.node`. The wrapper contains no second lock implementation.

The addon exposes an opaque process-local lock object: `acquire(path)` obtains existing-file authority or a new-file reservation, `bindCreated(path)` completes a new-file transition before any session content is written, and `release()` closes it explicitly. The finalizer closes an abandoned object, and kernel handle/descriptor cleanup remains the authority after process death. Paths and credentials never enter addon diagnostics. Milestone 1 builds and loads this artifact only from hermetic Node tests; release placement and product loading are deferred.

Splitting the primitive into independently versioned crates was rejected because the release pipeline and provenance gate treat `native/terminal-host` as one artifact family. Copying the lock into a JavaScript helper was rejected because the writer process must hold the operating-system lock itself.

### 2. Process, boot, and OS-session identity

A process is identified by pid plus native start time: Windows creation `FILETIME`, Linux `/proc/<pid>/stat` start ticks parsed after the final command-name parenthesis, and macOS `proc_pidinfo` start seconds plus microseconds. Inspection opens or queries the process first, derives identity from that observed process, and treats a mismatch as PID reuse.

Boot identity is the Windows boot sequence/`LastBootUpTime` value at native precision, Linux `/proc/sys/kernel/random/boot_id`, and macOS `kern.boottime` without minute rounding. OS-session identity is the Windows logon-session LUID plus logon time, the systemd login-session identifier on Linux with the session leader's process identity as the declared fallback, and the macOS audit-session identifier. Repeated reads must be stable; parser and injected-provider tests cover identity changes that hosted CI cannot produce by rebooting or logging out.

Relevant process-guardian functions are copied under terminal-host ownership and adapted behind typed interfaces rather than linked across release cadences.

### 3. Owner-only endpoints

Windows creates a named pipe with a security descriptor granting the current user only and `FILE_FLAG_FIRST_PIPE_INSTANCE`; an occupied name fails. Linux and macOS create a Unix socket under an owner-verified `0700` directory, reject symlinked or incorrectly owned directories, hash the canonical profile identity to stay below the socket-path limit, and verify `SO_PEERCRED`/`getpeereid` on every accepted connection before reading a frame.

Each CI target runs a helper under a second local identity and proves rejection before protocol parsing. The terminal-host lane must provision that fixture identity; inability to run the ownership test fails the selected lane rather than silently skipping it. Unit tests separately cover descriptor construction, ownership checks, hashing, and occupied-name behavior.

### 4. Fixed-role detached launch

The launch API accepts a typed resident role and canonical profile only. It has no executable or free-form argv parameter. It resolves the currently running terminal-host artifact, opens it for identity verification, and launches only that path with a fixed argument grammar. Production roles are `server` and `holder`; a separately feature-gated fixture role exists only in native tests. Same-user malicious code is outside the sandbox claim, but ordinary descendants receive no generic breakaway service.

- **Windows:** use console-free detached creation when containment inspection proves it escaped the caller's kill-on-close job. If the foreign job denies breakaway, call WMI `Win32_Process.Create` with the same verified path, a fixed command line, explicit allowlisted environment, and explicit cwd. Disable unintended handle inheritance. WMI's returned pid is opened and verified by start identity and job membership before success is reported.
- **Linux and macOS:** fork, call `setsid`, fork again, set an explicit cwd and allowlisted environment, attach standard streams to `/dev/null`, and close every non-allowlisted descriptor. The bounded parent-result pipe reports the final pid and closes before the role begins. Verify session id, process group, controlling-terminal absence, and process identity. macOS additionally records that the child remains in the caller's per-user bootstrap namespace.

Initial and recovery callers invoke this fixed routine inside the native terminal-host executable; there is no arbitrary-spawn IPC method. Every request records an observed mode and bounded failure reason. An unverified child is never reported resident. Cleanup signals only a child whose exact pid/start identity was observed; unverifiable state fails closed.

Platform fixtures kill the launching process tree, and on Unix send `SIGHUP` to its session, then prove the fixed-role child survives while an ordinary contained child does not. Windows fixtures cover both direct detached creation and a synthetic job that forces the WMI fallback.

### 5. Session-writer lock held by the writer

The writer process owns `LockFileEx` on Windows, an open-file-description `fcntl` lock on Linux, and `flock` on macOS. Every descriptor/handle is non-inheritable or close-on-exec. The addon and native API share the same implementation and lock namespace.

For an existing file, admission opens the target, derives its stable volume/device and file identifier from the handle, locks the owner-only sidecar for that identity, and revalidates the opened identity before returning. Case, symlink, junction, and hard-link aliases therefore converge on one authority.

For a new file, admission first locks a reservation keyed by canonical parent identity plus platform-normalized final name. While retaining that reservation, it creates/opens the file without writing session content, derives the new file identity, and acquires the identity lock. Only after both locks are held may `bindCreated` return writable admission; the location reservation is then released while the identity lock remains held for the writer's lifetime. Losing the identity race writes no session content and reports a conflict. Injected races cover create, hard-link, rename, and bind boundaries.

A helper process cannot hold this authority for Node. The Node tests therefore prove that aliases contend across processes, a child cannot acquire before the owning Node writer exits, process death releases the lock, explicit release works, descriptors do not leak to grandchildren, and a failed bind leaves no admitted writer.

### 6. Durable atomic replacement with bounded claims

Write a unique temporary file in the target directory, synchronize its complete bytes, atomically replace the target, then synchronize directory metadata before acknowledging completion:

- Windows: open with write access, call `FlushFileBuffers`, then `MoveFileExW(MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH)` and verify the resulting target identity.
- Linux: `fsync` the temporary file, `rename`, then `fsync` an opened parent directory.
- macOS: `F_FULLFSYNC` the temporary file, `rename`, then synchronize the opened parent directory with `fsync` and use `F_FULLFSYNC` when the filesystem accepts it; an unsupported or failed required barrier is reported, never ignored.

The supported local filesystems are NTFS, ext4, xfs, btrfs, and APFS. Network and virtual filesystems are explicitly unsupported unless a later change certifies them.

A subprocess fixture exposes a kill point before and after every step and proves that process termination leaves complete old or complete new bytes. An instrumented platform layer proves the required synchronization calls and ordering. These are process-crash and API-contract evidence, not a claim that hosted CI simulated power removal; milestone 6 owns exact-package physical interruption evidence.

### 7. Protocol generation 1

A frame is a u32 little-endian payload length followed by one MessagePack payload, capped at 2 MiB; input-bearing messages have a 1 MiB cap. The decoder validates the declared length before allocation, bounds nesting and collection lengths, rejects trailing bytes, and times out an incomplete handshake after 4 seconds.

Payloads are MessagePack named maps with string keys. Every envelope has stable `type`, optional `requestId`, and typed `body` fields. The encoder emits fields in the declared canonical order for fixtures; decoders do not depend on map order, ignore unknown map fields, default absent optional fields, and map unknown enum values to an explicit `unknown` representation. Generation mismatch and unsupported required messages return typed outcomes rather than panicking or guessing.

Every generation-1 shape introduced by this milestone has a named exact-byte fixture. A manifest sorted by fixture name records each fixture SHA-256 and one digest over the ordered names and bytes. Later milestones add fixtures and regenerate that manifest from the pinned encoder; conflicts are regenerated, never merged manually. A `cargo-fuzz` decoder target receives arbitrary bytes and must not panic, exceed frame-derived allocation bounds, or recurse beyond the declared limit.

### 8. Controller-transfer barrier

The I/O-free core models `Active(old) -> Frozen(old) -> Draining(old) -> AwaitingBoundary(new, nonce) -> Active(new)`. Freezing stops old-controller admission. The holder queue writes every already accepted item, then a reserved marker through the same PTY writer path. The marker is a versioned DCS byte sequence carrying the target u64 generation and a 128-bit nonce; tab-mode input handling consumes it rather than exposing it to the editor and acknowledges `{generation, nonce}` over the authenticated bridge only after all earlier input bytes have been admitted by the child input parser.

Milestone 1 does not modify the A1 child. Its native fixture child implements only that marker parser and acknowledgement over a dedicated owner-only test control channel. Each platform probe delays writes and reads around the marker and proves that acknowledgement cannot precede earlier PTY input admission. Milestone 5 owns the production tab-mode parser/bridge wiring and must reuse the frozen marker fixture.

Commands retain the controller generation captured when their bytes were admitted. A later acknowledgement never relabels queued work. The deterministic simulator explores delayed commands, buffered input, duplicate/stale acknowledgements, disconnects, and repeated transfers, and minimizes a failing event sequence. If the fixture cannot establish the boundary on a target, controller transfer remains disabled there; terminal input may remain single-controller, and milestone 5 cannot claim multi-client transfer on that target.

### 9. Validation ownership and evidence

The impact-selected terminal-host owner gains exactly three targets: Windows x64, Linux x64, and macOS arm64. Each builds the terminal-host binary and Node-API artifact, runs unit tests, platform primitive tests, fixture roles, addon lifecycle tests, and existing non-interactive probes, and uploads platform-neutral named artifacts. The Linux target additionally builds and runs the decoder fuzz target for a pinned bounded duration with a checked-in seed corpus. Toolchain or dependency changes update the terminal-host provenance record in the same PR.

Draft planning continues to run no product suites. After implementation and finalization, all three selected targets participate in the protected Development aggregate. The terminal host remains excluded from `full-release` until milestone 6 adds complete packaged lanes.

## Risks / Trade-offs

- **[The writer-lock alias transition is race-sensitive]** → Hold the location reservation through identity acquisition, admit no writes before identity authority, revalidate handles after locking, and inject races at every transition.
- **[macOS bootstrap and metadata synchronization vary by launch context/filesystem]** → Record the observed mode and barrier support; tests cover Terminal- and SSH-shaped callers where CI can model them, and unsupported evidence fails instead of being inferred.
- **[WMI can accidentally broaden arguments or inherited state]** → Construct the command exclusively from the role/profile types, use an allowlisted environment and cwd, disable inheritance, and verify the returned process before success.
- **[A PTY marker could be confused with ordinary input]** → Use a versioned 128-bit nonce, consume it only in tab mode, freeze its exact bytes as a fixture, and reject stale, duplicate, malformed, or unacknowledged boundaries. Product transfer remains disabled until milestone 5 wires and verifies the same contract.
- **[MessagePack implementations can emit different map orders]** → Exact bytes come from one pinned canonical fixture encoder; decoders accept any map order while the fixture manifest detects accidental shape drift.
- **[Hosted tests cannot prove every terminal or power-loss configuration]** → Milestone 1 proves typed primitives, process-kill behavior, API ordering, and synthetic containment. Milestone 6 retains exact-package physical certification.
