# Design

The product design, decisions, and roadmap live in [`docs/architecture/resident-tabs.md`](../../../docs/architecture/resident-tabs.md). This document covers only what milestone 1 builds and how it is proven.

## Context

`native/terminal-host` is a Rust crate (`portable-pty`, `crossterm`, pinned `libghostty-vt`) that today builds only the fixed 2×2 proof, and CI builds and probes it on Windows (#588). `native/process-guardian` already has Windows, macOS, and Linux process code. No resident role exists.

## Goals / Non-Goals

**Goals:**

- Every operating-system behavior that milestones 2–6 rely on exists as a tested primitive on all three platforms.
- The generation-1 wire format is frozen before any role speaks it.
- The controller-transfer barrier is proven in simulation before any client can send input.

**Non-Goals:**

- Server, holder, or attach roles; any product wiring; the `residentTabs` setting; packaging the terminal host in releases.
- Removing the 2×2 proof (milestone 2).

## Decisions

### 1. One crate, a platform layer, and an I/O-free core

Add `platform` (with `windows`, `unix`, `macos`, and `linux` submodules), `protocol`, and `core` modules to `native/terminal-host`. Platform code exposes small typed functions with explicit deadlines; `core` performs no I/O. Splitting into several crates was rejected for now, because the release pipeline and provenance gate already treat `native/terminal-host` as one artifact. Process-guardian code is reused by copying the relevant functions under the terminal host's provenance, not through a cross-crate dependency, so the two binaries keep independent release cadences.

### 2. Process and boot identity

A process is identified by pid plus its native start time (Windows creation time, Linux `/proc/<pid>/stat` start ticks, macOS `proc_pidinfo` start time). A mismatch means the pid was reused. Boot identity is the Windows boot sequence or `LastBootUpTime`, Linux `/proc/sys/kernel/random/boot_id`, and macOS `kern.boottime` at full precision. Milestone 4 must also tell a logout from a crash without a reboot, so this milestone adds an OS-session identity: the Windows logon session id plus its logon time, the systemd login session id (falling back to the session leader's start time) on Linux, and the audit session id on macOS.

### 3. Owner-only endpoints

Windows uses a named pipe whose security descriptor grants only the current user, created with the first-instance flag so another process cannot squat on the name. macOS and Linux use a Unix domain socket in a `0700` directory (`$XDG_RUNTIME_DIR` when set) and check the peer with `SO_PEERCRED` or `getpeereid` on every accept. Socket paths stay under the platform's length limit by hashing the profile identity.

### 4. Fixed-role detached launch

`launch_resident(role, profile)` spawns only the verified terminal-host artifact with a role from a fixed list; any other executable or role is refused before spawning.

- Windows: detached, console-free creation flags. If the caller's job forbids breakaway, use WMI `Win32_Process.Create` with an explicit environment and cwd. Never set `JOB_OBJECT_LIMIT_BREAKAWAY_OK` on ordinary jobs.
- macOS and Linux: double fork with `setsid`, no controlling terminal, and standard streams on `/dev/null`. On macOS the child stays in the caller's per-user bootstrap namespace.

Every launch returns the observed detachment mode and is verified by process identity and by a probe that the child is outside the caller's containment. Tests kill the launching tree (and on Unix send `SIGHUP` to its session) and assert the child survives, and assert that an ordinary contained child does not.

### 5. Session-writer lock held by the writer

The process that writes the session takes the lock, so the kernel releases it exactly when that process is gone: `LockFileEx` on Windows, open-file-description `fcntl` locks on Linux, and `flock` on macOS. The lock target is a sidecar keyed by the session file's canonical identity (resolved path plus volume and file id), so case, symlink, junction, and hard-link aliases share one lock. A not-yet-created session reserves its canonical parent and name first, then binds the file identity after creation without releasing. Because Windows and POSIX locks belong to the process that takes them, a helper process cannot hold the lock for the Node writer. Milestone 1 therefore ships the primitive twice from one Rust source: inside the terminal host, and as a small Node-API addon (`a1-session-lock`, built with the same toolchain and provenance) that the Node writer loads in-process. Wiring the addon into every launch and switch route is milestone 3.

### 6. Durable atomic replacement

Write a temporary file in the same directory, flush it, replace the target atomically, then flush metadata:

- Windows: `FlushFileBuffers` on a write handle, then `MoveFileExW` with `MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH`.
- Linux: `fsync` the file, `rename`, then `fsync` the directory.
- macOS: `F_FULLFSYNC` on the file and the directory.

Supported filesystems (NTFS, ext4, xfs, btrfs, APFS) are documented; network filesystems are unsupported. Crash tests kill the writer at each step and assert the target holds either the complete old or the complete new content.

### 7. Protocol generation 1

Frames are a u32 little-endian length plus a typed payload, capped at 2 MiB per frame and 1 MiB per input message; the handshake times out after 4 s. Messages belong to a generation, and changes within a generation are additive only. Every message shape has a frozen fixture, and CI checks the recorded digest of the fixture set. A `cargo-fuzz` target decodes arbitrary bytes and must never panic or allocate past the caps. Milestones 2–5 add messages under generation 1 additively; each adds fixtures and re-records the digest, so the digest changes in merge order and a rebase re-records it rather than merging it by hand.

### 8. Controller-transfer barrier

In `core`, input admission per tab carries a controller generation. A transfer freezes admission for the old controller, waits until the holder has written every accepted byte and the child has read a marker through the same PTY input stream, and only then admits the new controller. Commands record their admitting generation at admission and are rejected, never relabelled, once that generation is superseded. A deterministic simulator explores interleavings of buffered input, delayed commands, and transfers, and asserts that no command executes under a generation that did not admit it. If the PTY-ordered marker proves unworkable on a platform, transfer stays disabled there and milestone 5 keeps a single controller.

## Risks / Trade-offs

- **[macOS bootstrap namespace behavior differs across launch contexts]** → Tests cover Terminal-launched and SSH-launched callers. The observed mode is reported, and an unverified launch is a failure, not a silent success.
- **[Linux logout policies kill user processes]** → Documented as logout behavior. Tests cover terminal close and `SIGHUP`, not logout.
- **[CI runners cannot model every terminal and job configuration]** → Primitives are tested with synthetic jobs, sessions, and process trees. Physical evidence on real terminals is milestone 6.
