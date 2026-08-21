## 1. Baseline and Work Accounting

- [x] 1.1 Add an instrumented release filesystem/stream harness that records source content reads, destination writes, destination verification reads, file counts, bytes, and phase durations for a representative large payload; validate the current three-pass baseline with focused release-store tests.
- [x] 1.2 Add deterministic phase timing and operation-count evidence for npm completion, payload discovery, materialization, certification, activation, endpoint verification, and process settlement; validate ordering and accounting with focused update tests and typecheck.

## 2. Single-Pass Immutable Materialization

- [x] 2.1 Refactor payload discovery from content hashing so all declared package/dependency paths and totals are known before copy without reading file contents; validate symlink, unsupported-entry, missing-dependency, path-escape, and deterministic-order cases.
- [x] 2.2 Implement bounded-concurrency source-to-candidate streaming that hashes the exact written buffers, records metadata, computes the unchanged release identity/manifest, and atomically commits the candidate; validate one source read plus one destination write per file, content identity parity, concurrent materialization, and cleanup after injected stream/write/rename failures.
- [x] 2.3 Add an opaque module-private, single-use fresh-materialization proof and make certification consume it without a destination payload reread; validate that forged, reused, restarted, pre-existing, concurrent-winner, and uncertified release paths still require complete content verification.
- [ ] 2.4 Preserve full verification, certified-manifest reuse, immutable entry resolution, rollback, and release garbage collection for existing on-disk cohorts; run the complete release-store, cohort-state, cohort-activation, and release-gating test groups.

## 3. Update Transaction Integration

- [ ] 3.1 Integrate single-pass materialization and timing evidence through npm execution, ownership release, package unlock, certification, activation, and endpoint verification without changing durable transaction phase ordering; validate stable/next success, already-current, interruption at every phase, resumed ownership recheck, and rollback tests.
- [ ] 3.2 Ensure every success and failure path closes child streams, sockets, timers, and listeners before `runSelfUpdate` resolves; validate a packaged outer-process regression that observes the terminal prompt/clean process exit without `Ctrl+C`.
- [ ] 3.3 Verify a successful update leaves the exact target certified and active so the next bare `a1` launch emits no installation/activation message and performs no package materialization; validate packaged update-to-launch transition evidence.

## 4. Performance and Release Acceptance

- [ ] 4.1 Add the exact packaged Windows update fixture with at least 10,000 files and unchanged dependency versions, recording npm-excluded phase durations, payload operation counts, active endpoint identity, and process settlement; validate it independently on the accepted Windows release runner.
- [ ] 4.2 Enforce the 30-second post-npm activation budget and one-read/one-write fresh-payload budget with cause-specific diagnostics, while keeping deterministic operation counts blocking on every platform; validate both passing evidence and deliberate extra-read/time-budget failures.
- [ ] 4.3 Run typecheck, architecture/customization/dependency checks, focused CLI/release/update suites, containing unit and integration tiers, exact package-surface/install gates, complete non-physical release gates, and strict OpenSpec validation; record the accepted before/after Windows timing and confirm no weakening of release identity, recovery, rollback, or terminal return.
- [ ] 4.4 Review the optimized packaged and user-visible update duration before deciding whether progress UI is necessary; document the result and leave progress-bar implementation outside this change.
