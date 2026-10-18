# Process guardian provenance

A1 launch-instance containment uses the Node-API 9 addon `process-guardian.node`. The approved implementation is the separate Rust crate at `native/process-guardian`; it produces no product executable. The foreground Node launch guardian loads the addon and holds the containment boundary in-process.

## Boundary

The addon owns platform process containment and launches one immutable A1 UI runtime with inherited terminal handles. It also provides native process-start inspection, terminal-mode capture and restoration, exit-notice delivery, and the bounded process-wait and process-group operations used by the exit watcher. It does not create a PTY, read ordinary terminal input, capture or parse runtime output, render, or relay terminal bytes.

On Windows it uses `windows-sys 0.61.2` to create a Job Object, enables `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, and creates the runtime directly in that job through `PROC_THREAD_ATTRIBUTE_JOB_LIST`. The runtime is a job member from its first instruction; the former suspended-create, assign, and resume sequence is gone. Ordinary jobs do not enable breakaway, and closing the addon-held job handle terminates remaining members.

On Linux and macOS it uses `posix_spawn` to create a dedicated process group, transfers foreground-terminal ownership only when a terminal is present, applies bounded TERM/KILL cleanup to that group, and restores the prior foreground group. Linux derives process start identity from procfs. macOS derives it from `proc_pidinfo(PROC_PIDTBSDINFO)`; PID liveness alone is never treated as identity.

## Exit watcher

After the contained runtime starts, the launch guardian starts `dist/foundation/launch-guardian/exit-watcher.js` in another Node runtime outside the guardian's containment. The watcher waits for the guardian, performs bounded Unix process-group cleanup when needed, and claims and delivers the armed exit notice with the captured terminal modes. On Windows the addon creates that Node process outside both the runtime job and the guardian's inherited job; on Unix it remains in the terminal session so terminal hang-up reaches it naturally. The guardian itself delivers the notice on ordinary completion, and claim-by-rename ensures only one owner can print it.

There is one accepted gap: a machine-wide kill aimed at every Node process, such as `taskkill /IM node.exe` or `pkill node`, kills the watcher together with the guardian and runtime. No exit notice is then printed and, on Unix, non-Node descendants left in the runtime process group are not signalled by the watcher. A1 does not work around that case by starting an A1-built executable. Terminal closure, `Ctrl+Break`, guardian failure, runtime termination, and a kill aimed only at the guardian remain covered.

## Artifact contract

Release builds place the addon at:

```text
dist/native/win32-x64/process-guardian.node
dist/native/linux-x64/process-guardian.node
dist/native/darwin-x64/process-guardian.node
dist/native/darwin-arm64/process-guardian.node
```

The publication `guardians` job builds them on `windows-2025`, `ubuntu-24.04`, and `macos-15` arm64; the macOS arm64 job also cross-compiles x64 with `--target x86_64-apple-darwin`. A native build is identified by loading the addon into Node and reading `version()`. When the producing runner cannot load the cross-compiled x64 addon, its manifest records only the observed Mach-O architecture.

Each `a1-process-guardian-artifact-v2` manifest records `kind: "node-addon"`, Node-API 9, target platform and architecture, crate and protocol versions, SHA-256, byte size, build provenance, and signature/attestation status. A supported artifact is verified before loading. A missing, altered, incompatible, unsupported, or wrong-platform artifact is a concise containment launch error; A1 never silently falls back to PID-only cleanup. If a certified immutable release file disappears or changes, bootstrap restores it only from a matching installed package whose source bytes reproduce the certified size and digest, then verifies the complete release again.

## Licensing

The guardian is A1-owned MIT-licensed source. Its Windows API binding is `windows-sys`, dual-licensed MIT or Apache-2.0 by its upstream project. Exact transitive notices are generated from the locked release dependency graph.
