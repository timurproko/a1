# Implementation evidence

Evidence is recorded by platform. CI role fixtures are native process-integration evidence; they are not relabeled as physical terminal-emulator certification, which remains a milestone 6 concern.

## Implementation coverage

### Sans-I/O cores, deadlines, and supervision

- `native/terminal-host/src/core/server.rs` and `core/holder.rs` implement typed `step(state, event, now) -> effects` state machines. `scripts/governance/check-architecture.mjs` rejects filesystem, network, process, thread, and platform imports under `core/`.
- `src/shell/workers.rs` bounds work, deadlines, stale-incarnation completion, and the eight-abandoned-worker fail-fast limit. Native role fixtures verify that delayed identity inspection and delayed registry fsync fail on deadline while server probes continue.
- `src/shell/watchdog.rs` supplies independent one-second role watchdogs, a 15-second limit, owner-only crash records, and process-local abort. The native watchdog fixture freezes server, holder, and attach roles independently and observes each crash record.
- `fault-injection` is an explicit Cargo feature. `scripts/development/run-terminal-host-probe.mjs` builds a release-profile binary without the feature and verifies that a hook variable is refused rather than executed.
- `src/core/sim/mod.rs` runs 10,000 deterministic schedules in the ordinary native suite. The manual million-schedule target was run locally with the repository test itself:

  `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --manifest-path native/terminal-host/Cargo.toml --lib --features fault-injection core::sim::tests::million_schedules_preserve_invariants -- --ignored --exact`

  Result: 1 passed; 1,000,000 schedules; 23.32 seconds.

### Multi-tab isolation and recovery

The native library tests cover bounded control/render lanes, full-surface resynchronization, a 50 MiB stalled-reader workload, exclusive control, stale detach rejection, whole-paste admission, ordered split writes, lower-epoch rejection, healthy-loop heartbeat rules, concurrent-start limits, durable replacement, registry fencing, PID/start-identity checks, and stale-incarnation completion.

`native/terminal-host/tests/role_integration.rs` contains eight real-process fixtures. Together they exercise:

- concurrent server start and one registry writer;
- two-tab create/list/view/close and read-only secondary viewing;
- retained output, attach loss, reattach, and server replacement without replacing holders;
- delayed identity and fsync deadline isolation while probes remain responsive;
- start crash points without an empty or split registry;
- independent server, holder, and attach watchdog records;
- ten concurrent tab starts and six concurrent graceful stops while probes remain responsive;
- unverifiable-owner refusal, the three-in-sixty-seconds start budget, and explicit restart;
- two-tab re-admission with unchanged holder identities and retained surfaces.

The fake child binary supplies echo, streaming, stop-reading, hang, exit, ignore-shutdown, and grandchild modes. The implementation uses a one-slot holder-to-server surface lane, a one-slot per-client render lane, bounded per-client control lanes, a dedicated bounded PTY writer, holder heartbeat supervision, verified graceful/forced termination, and epoch/incarnation fencing.

### Session-writer guard

- `src/foundation/session-writer-lock/index.ts` exposes `acquireExisting`, `reserveNew`, `bind`, `release`, and `SessionWriterConflict`.
- The native Node-API probe runs on every terminal-host matrix platform. It verifies reservation-to-bind continuity, same-process and cross-process exclusion, hard-link identity, symlink/junction identity, Windows case aliases, release on writer-process exit, and non-inheritance by descendants.
- `runtime-integration.ts` acquires a target before creating/rebinding a Pi runtime and releases the old writer only after activation. Because Pi's new, switch, fork, import, adapter, workflow, and replacement routes all invoke this guarded runtime factory, they share one ownership transition.
- `session-selection.ts` guards direct selection and explicit fork handling; `workflow-contexts.ts` guards rename; resident children use the same runtime path and identify conflicts as resident-tab ownership.
- Unit/integration tests verify held-target refusal with the old runtime still active and locked, bind-before-old-release for new targets, alias exclusion, reservation continuity, and held-session rename refusal without file mutation.
- `scripts/governance/check-session-writer-guard.mjs`, called by `check:architecture`, rejects unguarded production Pi session-manager calls.

### Settings and default-off behavior

`residentTabs` remains default-off. `src/foundation/release/bootstrap.ts` calls the native host only after `selectResidentHost` reads an enabled setting; therefore `residentTabs=false` retains the prior bare-A1 launch path. Session-writer exclusion is intentionally independent of that setting and remains the only behavior change while resident tabs are off. Settings tests verify disabled, enabled, migrated, malformed, default, and hard-capped `tabsMaxConcurrentStarts` values.

## Local Windows x64

Validated after the implementation audit:

- `npm run test:fast` — passed: 384 files / 4,440 tests in the fast partition and 25 files / 332 tests in the resource-sensitive partition; 3 files / 14 tests were skipped by their declared platform/fixture conditions.
- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --manifest-path native/terminal-host/Cargo.toml --lib --features fault-injection` — 43 passed, 1 ignored manual stress target.
- The ignored million-schedule simulator target — passed explicitly as recorded above.
- `npx vitest run test/foundation/release/restart-certification.test.ts --testTimeout=15000` — 5 passed.
- `npx vitest run test/repository-governance/local-cleanup.test.ts` — passed after adding bounded retry for a successful but truncated Windows Git worktree inventory.
- `npm run check:architecture` — passed.
- `npm run check:docs-governance` — passed.
- `npx openspec validate resident-tabs-failure-isolation --strict --no-interactive` — passed.
- `npx vitest run test/repository-governance/openspec-archive-git.test.ts` — passed.

A full local Zig build was not attempted because `build.rs` intentionally confines the Windows vendored-Zig build to CI unless explicitly overridden. The native three-platform CI evidence below is authoritative for role integration.

## CI Windows x64

Diagnostic run [38251026634](https://github.com/timurproko/a1/actions/runs/38251026634) validated implementation head `a8b6fc9a8adacda669e30914056084053a6beecb`.

- [Native terminal host (Windows x64)](https://github.com/timurproko/a1/actions/runs/38251026634/job/114817265410): 43 native unit/model tests passed, the manual million-schedule target was ignored by the ordinary run, all 8 native role-integration fixtures passed, and PTY/model/selection probes passed.
- PR core and affected owners: 113 files and 1,298 tests passed in the reported partition, including session-writer, runtime-integration, settings, and governance tests.
- Resource-sensitive partition and all selected rendering, package, history, startup, naming, and documentation jobs passed.

## CI Linux x64

- [Native terminal host (Linux x64)](https://github.com/timurproko/a1/actions/runs/38251026634/job/114817265350): 44 native unit/model tests passed, the manual million-schedule target was ignored by the ordinary run, all 8 native role-integration fixtures passed, the release-profile hook-refusal check passed, the Node-API session-lock probe passed, and PTY/model/selection probes passed.
- [Unix integration (Linux)](https://github.com/timurproko/a1/actions/runs/38251026634/job/114817265409): all selected integration scopes passed.

## CI macOS arm64

- [Native terminal host (macOS arm64)](https://github.com/timurproko/a1/actions/runs/38251026634/job/114817266340): 44 native unit/model tests passed, the manual million-schedule target was ignored by the ordinary run, all 8 native role-integration fixtures passed, the release-profile hook-refusal check passed, the Node-API session-lock probe passed, and PTY/model/selection probes passed.
- [Unix integration (macOS)](https://github.com/timurproko/a1/actions/runs/38251026634/job/114817265414): all selected integration scopes passed.

## Skips and interpretation

- No native role-integration fixture was skipped on any supported platform.
- The only ignored native case was `million_schedules_preserve_invariants`, intentionally excluded from routine runs because it is the manual stress target. It passed explicitly on Windows as recorded above; that local result is not inferred for Linux or macOS.
- CI results are stated only for the platform that produced them. No Windows result is used as macOS or Linux evidence.
- Physical terminal-emulator closure and SSH-loss certification are outside this milestone's automated failure-isolation fixtures and remain in milestone 6; they are not claimed here.
