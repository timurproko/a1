# Implementation evidence

Evidence is recorded independently by platform. Native role fixtures are executable process-integration evidence; they are not relabeled as physical terminal-emulator or SSH-loss certification, which remains a milestone 6 concern.

## Validated implementation head

Development validation run [38358329297](https://github.com/timurproko/a1/actions/runs/38358329297) passed on implementation head `2aa5884a2aa28199a1f72b1d1adf35b00840a488`.

The run passed every selected validation owner: native Windows, Linux, and macOS; PR core and affected unit owners; exact-package contracts; resource-sensitive tests; Pi release/resume; changed full-only integrations; Unix integrations; image/history compatibility; first-attempt startup budget; rendering; naming; changed-file documentation; and the aggregate diagnostic.

## Implementation coverage

### Recovery state and process ownership

- `native/terminal-host/src/core/server.rs` and `core/sim/mod.rs` implement the restart gate, 1/5/30-second backoff, three-in-ten-minutes budget, stale-incarnation rejection, persisted-before-respawn effects, healthy-supervision liveness clock, and retry/fresh/close transitions.
- `native/terminal-host/src/roles/holder.rs` retains holder ownership while replacing children, verifies prior child/session-writer release, performs graceful then forced tree termination, and reconnects across server replacement.
- `native/terminal-host/tests/role_integration.rs` contains ten serialized executable fixtures covering blocked identity and registry work, restart after the server dies following budget commit, all role watchdogs, registry sharing/disk failures, crash points, attach loss and retained output, ten concurrent starts, unverifiable owners/start budget, two-tab isolation, and holder-driven server replacement.
- Fixture teardown now reconciles exact executable identities through the complete replacement-launch window. `scripts/development/run-terminal-host-probe.mjs` independently fails if any fixture host survives the role suite. This converts the prior Windows Cargo image-lock symptom into an explicit no-orphan contract.

### Durable prompt, draft, and session recovery

- `prompt-journal.ts`, `draft-checkpoint.ts`, and `session-sync.ts` provide durable admission/correlation/settlement/retirement, bounded compaction, torn-tail tolerance, duplicate-safe reconciliation, periodic draft replacement, degraded-state deadlines, and write-capable session synchronization.
- `session-shell.ts` journals before dispatch, rejects uncertain admission without dispatch, correlates accepted submissions, settles after the busy lifecycle, synchronizes during graceful stop, and restores recovered prompts/drafts without automatic resend.
- The seven-file resident Node suite covers storage codecs and fault points, admission failure/timeout, first-turn and historical-journal recovery, duplicate text, draft degradation, synchronization order, launch context, feature-gated bridge behavior, settings, and session-backend integration.

### Protocol, supervision, and presentation

- Generation-1 protocol fixtures include heartbeat, recovery lifecycle status, restart request, holder respawn, and retained snapshot shapes. Feature negotiation keeps older generation-1 peers on process-level status.
- Bridge heartbeat and model/tool progress are supervised separately. Healthy supervision is required before silence accrues; restart/reconnect/gaps reset the clock; stalls remain advisory; `/restart-tab` is explicit and does not spend crash budget.
- Settings declare bounded unresponsive-restart and stall-notice choices and remain hidden unless resident tabs are enabled.
- Attach presentation supports crashed, restarting, failed, unresponsive, stalled, and degraded states, with failed-tab retry/fresh/close actions fenced to the viewed failed tab.

### Registry, reboot, artifacts, and diagnostics

- Registry recovery quarantines unreadable state, selects the newest valid history, rejects invalid generations fail-closed, retries transient replacement failures, and archives prior tab sets on boot/OS-session changes.
- Historical journals are adopted by stable submission identity with age limits and idempotent source retirement.
- Last-screen, stderr-fixture, log, and crash-record artifacts are owner-only, bounded by size/count/age, and separated under tab recovery or diagnostics directories. Diagnostic serialization uses an allowlist; tab-mode fatal records are redirected to the tab diagnostics directory.
- Release binaries refuse hermetic fault hooks. Native and Node unit/process fixtures exercise the enabled hooks only in their explicit test environments.

## CI Windows x64

- [Native terminal host (Windows x64)](https://github.com/timurproko/a1/actions/runs/38358329297/job/115166497701) passed.
- Native library/model result: 55 passed, 1 ignored manual stress target, 0 failed.
- Native executable role integration: 10 passed, 0 failed.
- Resident Node recovery suite: 7 files / 74 tests passed.
- Durable journal admission, 10 synchronized samples: p50 `34.602 ms`, p95 `61.736 ms`.
- Release fault-hook refusal, native addon/session-lock checks, exact-path no-orphan assertion, release/debug builds, and terminal host probes all passed.

## CI Linux x64

- [Native terminal host (Linux x64)](https://github.com/timurproko/a1/actions/runs/38358329297/job/115166497760) passed.
- Native library/model result: 56 passed, 1 ignored manual stress target, 0 failed.
- Native executable role integration: 10 passed, 0 failed.
- Resident Node recovery suite: 7 files / 74 tests passed.
- Durable journal admission, 10 synchronized samples: p50 `0.701 ms`, p95 `2.948 ms`.
- Release fault-hook refusal, native addon/session-lock checks, no-orphan assertion, release/debug builds, and terminal host probes all passed.
- [Unix integration (Linux)](https://github.com/timurproko/a1/actions/runs/38358329297/job/115166497745) passed its selected scopes.

## CI macOS arm64

- [Native terminal host (macOS arm64)](https://github.com/timurproko/a1/actions/runs/38358329297/job/115166497899) passed.
- Native library/model result: 55 passed, 1 ignored manual stress target, 0 failed.
- Native executable role integration: 10 passed, 0 failed.
- Resident Node recovery suite: 7 files / 74 tests passed.
- Durable journal admission, 10 synchronized samples: p50 `1.256 ms`, p95 `1.658 ms`.
- Release fault-hook refusal, native addon/session-lock checks, no-orphan assertion, release/debug builds, and terminal host probes all passed.
- [Unix integration (macOS)](https://github.com/timurproko/a1/actions/runs/38358329297/job/115166497926) passed its selected scopes.

## Local Windows governance and stress evidence

- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --manifest-path native/terminal-host/Cargo.toml --lib --features fault-injection core::sim::tests::million_schedules_preserve_invariants -- --ignored --exact` — passed 1,000,000 deterministic schedules in 18.54 seconds on the implementation head.
- Contracts-only Rust formatting/checks, strict OpenSpec validation, architecture boundaries, documentation governance, code-documentation governance, naming policy, and targeted native-host boundary tests passed locally.
- Local Zig was unavailable, so local contracts-only checks are not presented as executable native certification; the three CI native jobs above are authoritative.

## Skips and interpretation

- No native role fixture or resident Node recovery test was skipped on Windows, Linux, or macOS.
- The ordinary native matrix intentionally ignores `million_schedules_preserve_invariants` because it is the manual million-seed stress target. It passed explicitly on local Windows as recorded above; that result is not inferred for Linux or macOS.
- Hosted runners do not provide a controlled disposable quota/small-volume facility. Platform-specific sharing/disk-full behavior is therefore exercised with the hermetic `ebusy-once`/sharing-violation and `enospc` injections; no physical quota result is claimed.
- Results are stated only for the platform that produced them. Contracts-only and fixture results are not substituted for physical terminal-emulator closure or SSH-loss certification; those milestone 6 checks remain deferred.
