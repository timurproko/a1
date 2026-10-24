## Delivered behavior

Windows endpoints now create overlapped handles for both peers and use independent operation events for read/write and connection admission. The steady-state reader no longer peeks/sleeps. An operation retains its handle, stable OVERLAPPED storage, and caller buffer until completion or scoped cancel-and-drain. Split-worker shutdown guards wake the other direction without changing ordinary clone custody. A complete fragmented first envelope remains under its absolute admission deadline. Unix sockets and generation-1 bytes remain compatible.

Opt-in native progress records now distinguish frame assembly after first bytes, initial idle waiting, pipe write completion, outer write completion, and a one-shot attach gap/repaint request. Local durations use Instant; clock epochs identify wake or wall-clock discontinuities. Consumers reject negative, epoch-crossing, and discontinuity-crossing derived latencies. Connection-level records may omit tab identity. Queue pressure still drops only diagnostic records with explicit loss accounting. No diagnostic payload contains terminal content or credentials.

The existing multimedia timer request remains for non-I/O deadlines such as ConPTY settling, not pipe correctness. No priority or global power-policy changes, new production environment controls, process restart, or prompt replay were introduced.

## Focused evidence

All native commands use this worktree's manifest-verified CI-built VT library rather than running Zig's Windows fixture fetch. `TERMINAL_HOST_LOCAL_BUILD=1`, `TERMINAL_HOST_PREBUILT_VT` points to this worktree's ignored `.artifacts/terminal-vt`, and the targeted Cargo checks use its `.artifacts/cargo-target`.

- `cargo test --manifest-path native/terminal-host/Cargo.toml --lib endpoint:: -- --nocapture`: 13 passed. Covers first-instance protection, immediate/pending acceptance, an occupied endpoint becoming available, concurrent duplex progress, partial headers/bodies, absolute deadlines, scoped cancellation, slow-peer isolation, non-inherited handles, peer exit, and reconnect custody.
- The endpoint tests include a fresh timer-request-free subprocess, 128 causally matched token echoes in each timer mode, and 32 cancellation/reconnect cycles with kernel-handle accounting. A submitted-operation test seam proves pending reads/writes exist before cancellation; no sleep is used to arrange that race.
- `cargo test --manifest-path native/terminal-host/Cargo.toml --lib roles::progress_observation::`: 3 passed, covering payload-free scalar records, bounded-queue loss, monotonic epochs, and forward/backward wall-time changes.
- `cargo test --manifest-path native/terminal-host/Cargo.toml --lib wake_gap`: 2 passed, including one consumed gap and subsequent traffic on both an existing and newly created connection. This is a simulated clock gap, not real machine sleep.
- `cargo test --manifest-path native/terminal-host/Cargo.toml --lib explicit_resume_clear`: 1 passed, preserving complete repaint of an unchanged cached surface.
- `cargo test --manifest-path native/terminal-host/Cargo.toml --features resident-fixtures --test role_integration maintenance_lists_stops_reports_and_stops_the_host_without_starting_one -- --nocapture`: 1 passed against real hermetic role processes.
- `cargo check --manifest-path native/terminal-host/Cargo.toml --lib --features node-addon`: passed.
- `npm run build`: passed, including a source-built Windows native addon linked to the verified prebuilt VT library.
- `npm run typecheck`: passed after the fresh checkout's build prerequisites were generated.
- `npx vitest run test/foundation/resident-tabs/progress-observations.test.ts test/repository-governance/terminal-architecture-policy.test.ts`: 53 passed. New cases preserve legacy records, separate idle wait from completion duration, validate optional scalar fields, and exclude negative/discontinuous samples while retaining post-gap local timing.
- `node scripts/governance/check-code-documentation.mjs --mode full`: passed.
- Strict validation of `remove-wake-sensitive-pipe-polling`: passed.

The handshake extraction reduces the existing serve_peer size ratchet from 262 to 254 lines; the ratchet is lowered, not relaxed. The existing synthetic latency fixture now assigns chronological per-process event times, including its shared painter; assertions and sample requirements are retained.

## Timing comparison and interpretation

On the investigation Windows 11 x64 workstation, one native 128-echo run reported p50 0.012 ms / p95 0.016 ms without a local timer request and p50 0.013 ms / p95 0.027 ms with the request. Other focused runs remained in the same sub-millisecond range. The request-free fixture proves readiness correctness without short-sleep assistance; these numbers are observations, not hard microsecond assertions or a replacement product budget.

The planning investigation's standalone polling algorithm probe reported one-round-trip p95 31.642 ms without a timer request versus 3.171 ms with one. That .NET probe isolated readiness polling and is not an identical native or complete A1 baseline. The native completion fixture is therefore evidence that the dependency was removed, not a claimed percentage improvement to the whole UI. Existing input-to-child and holder-to-outer presentation budgets are unchanged and remain subject to the normal exact-head CI/native harnesses. No budget was raised or substituted with standalone pipe-echo numbers.

## Known gap disposition

Physical sleep/wake causality and the user's recurring UI delay have not been reproduced or certified. The delivered transport removes a demonstrated timer-sensitive bottleneck, but Windows Terminal/ConPTY, child scheduling, or another shared bottleneck may still cause the reported symptom. Disposition: retain that uncertainty explicitly and use the documented resident-versus-solo, existing-versus-new-client comparison and opt-in observations if it recurs; optional physical investigation is not an incomplete code outcome or readiness gate. No active workstation suspend or user-session restart was performed.

A fixed resident cohort keeps the old endpoint implementation until its ordinary lifecycle completes or a maintainer explicitly stops it. Disposition: preserve the existing no-forced-recycle update contract and do not claim an installed update hot-patches already running holders/servers.

## CI repair

The first finalized-head run rejected an unregistered test-only subprocess environment marker. The fixture now invokes a dedicated child test using libtest's explicit ignored-test selection, with no new environment key. The mandatory parent test requires successful exit and exactly one passed child test; both timer modes, all token echoes, and handle-leak checks still execute in a fresh process. The child helper is not independently scheduled in the ordinary parent suite, preventing its timer request from contaminating other tests. No assertion, policy allowlist, or product behavior is relaxed.

Windows, Linux, and macOS native jobs also exposed an existing wall-clock-dependent strip-width assertion: a single-digit twelve-hour clock correctly permits 18-cell chips, while the assertion assumed the 17-cell layout of a two-digit clock. The exact CI failure was reproduced locally before repair. A thread-local, test-only clock with scoped restoration now exercises midnight, morning, noon, afternoon, and evening explicitly, retaining stable width, twenty-four-hour width, truncation, and overflow assertions for every case. The production clock and strip behavior are unchanged.

Focused repair checks passed: all 30 strip tests, all 13 endpoint parent-suite tests plus the required passed child fixture, typecheck, resident-terminal-host strict validation, code-documentation governance, and naming inspection of both changed native files. The complete Windows native library suite was additionally run to reproduce the CI-reported failure: 320 passed, zero failed; the two directly ignored entries are the existing manual million-seed target and the child helper that the mandatory parent explicitly executes and checks. Exact-head changed naming validation is also run before the repair push. Physical sleep/wake uncertainty is unchanged.
