## 1. Large authoritative snapshot delivery

- [x] 1.1 Implement bounded authoritative snapshot representation/accounting without charging already-owned history as repeated pending payload or retaining unbounded obsolete state.
- [x] 1.2 Preserve FIFO semantic boundaries, emitted revisions, per-turn yielding, generation isolation, and asset lease release across admission, consumption, rejection, and disposal.
- [x] 1.3 Add focused queue, delivery, and adapter regressions for snapshots larger than 8 MiB, repeated notices, ordered distinct snapshots, genuine protected saturation, and image lifetimes.
- [x] 1.4 Add model-selection workflow regressions for large idle sessions and sessions with an admitted prompt still running; preserve exactly-once model application, truthful workflow completion, enabled submission, active work, and subsequent input.

## 3. Recovery and diagnostics

- [x] 3.1 Coordinate genuine overload recovery with cancellation and actual admitted-operation settlement, with safe late completion and generation/disposal fencing.
- [x] 3.2 Separate applied mutation outcomes from presentation cancellation and keep safe quit available while admission is closed.
- [x] 3.3 Retain bounded classified incident metadata and fatal reason codes without private error messages or conversation content.
- [x] 3.4 Add delayed/failed cancellation, outcome, disposal-race, and diagnostic privacy regressions.

## 4. Session writer lifecycle

- [x] 4.1 Prevent stale-heartbeat takeover of a live or unverifiable writer and fence compromised ownership.
- [x] 4.2 Release writer ownership on runtime construction failure and all adapter/runtime disposal paths.
- [x] 4.3 Add stalled-owner, dead-owner, alias, initialization-failure, and adapter-disposal regressions.

## 5. Executing release lifetime

- [x] 5.1 Acquire process-lifetime release-use protection atomically against cleanup and release on process exit.
- [x] 5.2 Protect release/dependency/certification roots during cleanup, including expired releases, uncertain owners, launch races, and legacy clients.
- [x] 5.3 Add lifetime, multiple-update, dead-owner, uncertainty, and late-entry regression fixtures.

## 2. Publish and restore continuity

- [x] 2.1 Add isolated adapter and composition/update-observation regression coverage proving installed-update notices leave large-session work and executing-release identity unchanged and permit subsequent commands, including an admitted still-running prompt that must not become failed or disable submission.
- [x] 2.2 Add same-pin large persisted-session public-entry exit/resume coverage with uncompacted and supported compacted histories, independent conversation markers, identity/context parity, and unchanged source bytes.

## 6. Pre-ready bookkeeping

- [ ] 6.1 Complete focused checks and reconcile all discovered gaps before final delivery bookkeeping; keep broader execution with CI and do not claim the personal session has been repaired before a fixed binary is available.
