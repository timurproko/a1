# Process guardian provenance

A1 launch-instance containment uses a standalone native executable named `process-guardian`. The approved implementation is a separate Rust crate at `native/process-guardian`; it is not a Node-API addon and does not reuse or resume the held composed terminal-host implementation.

## Boundary

The executable owns platform process containment and launches one immutable `a1-ui` runtime with inherited terminal handles. It does not create a PTY, read ordinary terminal input, capture or parse runtime output, render, or relay terminal bytes. Its private parent/child coordination is restricted to bounded lifecycle and identity data.

On Windows it uses `windows-sys 0.61.2` to create a Job Object, enables `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, assigns the runtime before resuming it, denies silent breakaway by never enabling breakaway limits, monitors the verified Node parent process, and terminates remaining job members after root or parent exit.

On Linux and macOS it creates a dedicated POSIX process group before exec, transfers foreground-terminal ownership only when a terminal is present, monitors the verified parent, applies bounded TERM/KILL cleanup to that group, and restores the prior foreground group. Linux derives process start identity from procfs. macOS derives it from the native `proc_pidinfo(PROC_PIDTBSDINFO)` start timestamp; PID liveness alone is never treated as identity.

## Artifact contract

Release builds place the exact executable at:

```text
dist/native/win32-x64/process-guardian.exe
dist/native/linux-x64/process-guardian
dist/native/darwin-x64/process-guardian
dist/native/darwin-arm64/process-guardian
```

Each supported artifact must be named in the release integrity manifest with target triple, crate version, guardian protocol version, SHA-256, byte size, build provenance, and signature/attestation status. The build marks a platform supported only after its native containment integration runs on that platform. A missing, altered, incompatible, unsupported, or wrong-platform artifact is a concise containment launch error; A1 never silently falls back to PID-only cleanup.

## Licensing

The guardian is A1-owned MIT-licensed source. Its Windows API binding is `windows-sys`, dual-licensed MIT or Apache-2.0 by its upstream project. Exact transitive notices are generated from the locked release dependency graph.
