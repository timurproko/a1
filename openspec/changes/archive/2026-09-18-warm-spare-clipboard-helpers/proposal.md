## Why

Every paste and every copy in the owned shell forks a fresh Node child (`paste-helper`, `response-copy-helper`) and waits for it to load before any clipboard work starts. On Windows that fork-and-load costs 300 to 700 ms per gesture, which is most of what the reader feels as paste latency, and it is why every text paste case in the shell suites costs about a second. The isolation itself is right: native reads, path probes, and image codecs must not run on the UI thread, and a stuck helper must be killable without touching the shell. What need not be on the critical path is process startup.

## What Changes

- Add `session-ui/helper-pool.ts`: a spare-of-one pool for a forked IPC helper. `warm()` opts the pool in and forks the first spare; a request `take()`s it (with whether it already announced `ready`) and forks cold when none is held; `replenish()` forks the next spare after a request releases its child and does nothing until the owner warmed the pool; an idle spare is stopped after five minutes and never keeps the owner's process alive; a spare that exits on its own is dropped; `dispose()` stops the held spare.
- `paste-executor.ts`: `forkPasteHelper`, `stopPasteHelper`, and `createPasteHelperPool` are the fork, kill, and pool factories; `startPasteExecutor` takes an optional pool, sends the first request itself when the spare already announced, and replenishes the pool after cleanup. Kill semantics are unchanged: one job per child, process-group kill on POSIX, `SIGKILL` fallback, the helper's own worker deadline.
- `PastePreparationClient` owns one paste pool (`warm()`, `warmed`, disposed with the client) and takes an options object: `onEvent`, `execute` (an in-process starter for tests; no pool when set), `helper`, `spareIdleMs`. `PromptChipStore` passes the preparation options through and exposes `warm()`.
- `createResponseCopyExecutor` returns an `OwnedResponseCopyExecutor` with `warm()`, `dispose()`, and `warmed`, backed by a separate copy pool; the copy path's stalled-helper reaping is unchanged.
- `OwnedUiSessionShell.start()` warms both pools on the next immediate after the first frame, custom-viewport shells only; `dispose()` stops the spares. `OwnedUiShellDiagnosticOptions.pastePreparation` carries the `execute` and `helper` seams.
- Shell suites prepare ordinary text pastes in process through `inProcessPasteExecutor` in the shared fixture (same phases, limits, and classification as the helper); images, native reads, and payloads over 256 KiB still fork the real helper. A new `session-shell-clipboard-spares.test.ts` proves the shell forks exactly one paste and one copy spare after start, takes the paste spare for the first paste and replenishes it after settlement, and stops both on dispose.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: a spare paste helper and a spare copy helper are ready before the first gesture and after each one, without changing the isolation or kill guarantees.

## Impact

Production: two idle Node children per custom-viewport session after start (about 40 MiB each), stopped after five idle minutes or on dispose; startup does not wait for them. Paste and copy latency after start is IPC-bound. Startup graph: 153 files, 1,442,658 bytes (one module, 10,041 bytes). Tests: 82-case shell paste suite 24.7 s to 20.7 s locally with the in-process seam; 5-case pool suite, 2 executor cases, 1 transport case, 3 shell cases added.
