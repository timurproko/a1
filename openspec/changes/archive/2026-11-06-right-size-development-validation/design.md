## Context

Development validation (`ci.yml`) resolves a matrix from `scripts/release/validation-matrix.mjs`. Lanes whose selected scopes consume a packed candidate (`packs_candidate`) provision the pinned Rust toolchain and Zig 0.15.2, restore a Cargo target cache, and run `npm run build:terminal-host` so the candidate carries the release terminal host. On a UI-only pull request (run 42201645010) the `pi` lane did this in 2.6 minutes and finished at 7.5 minutes, the longest job of an 8.6-minute run; on a resident-tabs pull request (run 42184900293) `pi`, `package`, `startup`, and `promoted` each rebuilt the same artifact, the `package` lane taking 3.4 minutes to do so. The `rust-cache` restore makes the compile incremental but still pays toolchain installation, a large target-directory restore, Zig setup, and the final link.

When the `terminal-host` owner is selected, each platform schedules one build-and-probe lane and three partition jobs. `run-terminal-host-probe.mjs --partition i/3` runs `cargo test --lib` and then its third of `role_integration`; the build-and-probe lane runs `cargo test --lib --bins`, `release_isolation`, the builds, probes, certification, and on Linux four fuzz targets after `rustup toolchain install nightly-2026-10-01` and `cargo +nightly install cargo-fuzz --version 0.13.2`. Unit tests therefore execute four times per target, and the Linux lane, the longest job at 18.1 minutes, compiles `cargo-fuzz` on every run.

Scheduled Full regression and scheduled Publish ran against the same `develop` commit on 38 of the last 40 days; a repeated commit (no merge in a day) occurred twice. The two nightly runs disagreed on their conclusion on four of those days.

## Goals / Non-Goals

**Goals:**
- Build the release terminal host at most once per distinct input set per platform across Development runs, and never in a lane whose inputs already produced a verified artifact.
- Run each terminal-host unit test once per target per run.
- Stop compiling `cargo-fuzz` on every Linux run.
- Keep every owner, scope, platform, partition, probe, certificate, fuzz target, and budget that runs today.

**Non-Goals:**
- Changing which owners a pull request selects, their cadence, or the `fullReleaseExclusion` set.
- Sharing build output between publication or Full regression lanes; publication validates bytes built in its own run.
- Skipping a scheduled nightly run on an unchanged commit: two repeats in 40 days do not justify a cross-run skip, and the spec keeps Full regression independent of publication.
- Reducing Windows Node 22 shard coverage or merging the two nightly complete-regression runs; those are policy decisions for a separate change.
- Rebalancing or reducing the partition count; partitions are not on the critical path, and runner time is unchanged by redistribution.

## Decisions

### 1. Cache the release terminal-host output by exact inputs, not by job dependency

Candidate lanes restore the release files in `dist/native/<platform>-<arch>/` (the addon, `terminal-host.manifest.json`, and notices, listed explicitly so the guardian files written by `npm ci` are never clobbered) from `actions/cache` after dependency installation and before any toolchain step. The key names the runner OS and architecture, the macOS image and SDK pin where applicable, the Zig version, and `hashFiles` over `native/terminal-host/**` (including `Cargo.lock` and the vendored VT tree), `rust-toolchain.toml`, `config/terminal-host-provenance.json`, `scripts/development/prepare-ci-rust.sh`, `scripts/development/build-terminal-host.mjs`, and the modules it imports. On a hit the toolchain, Zig, Cargo-cache, and build steps are skipped; on a miss the lane builds exactly as today and saves the three files. Parallel misses in one run build independently and race harmlessly on save.

A shared predecessor job was rejected: `needs` would serialize the build before every consumer, adding about 4 minutes to the 7.5-minute `pi` lane that currently defines light-run wall-clock. The cache has no dependency edge and pays only a few megabytes of restore.

The manifest's `entry` record digests `dist/foundation/resident-tabs/host-entry.js`, which the runtime and `verify-native-artifacts.mjs` both check and which changes with every TypeScript build, so a restored manifest cannot be used verbatim. On a hit the lane runs `build-terminal-host.mjs --reuse`, which refuses the restored files unless the manifest schema, target, crate version, and `Cargo.lock` digest match the checkout and the addon and notices match their records byte for byte, then re-records only the `entry` digest and rewrites the manifest with `builtAt` and provenance unchanged. Every candidate lane then runs `verify-native-artifacts.mjs --local` before `record-validation-prerequisite.mjs build`, and `prepare-validation-package.mjs` re-checks the same problems before packing. Provenance fields (`cargoLockSha256`, `rustVersion`, `zigVersion`, `libghosttyVtCommit`) are inputs of the key and therefore identical for every consumer.

### 2. Partitions run the role slice only

The partition branch of `run-terminal-host-probe.mjs` drops `cargo test --lib`. The build-and-probe lane keeps `cargo test --lib --bins` and `release_isolation`, so the union per target still executes every unit, binary, integration, and role test exactly once, matching the partition scenario of the native-host requirement. Cargo compiles the library once for the role test binary either way, so the removed cost is unit-test execution, not compilation.

### 3. Cache the fuzz tool, not the fuzz run

`cargo-fuzz` is a fixed-version binary of a pinned nightly toolchain. The Linux lane caches `~/.cargo/bin/cargo-fuzz` under a key naming `0.13.2` and `nightly-2026-10-01`, installing only on a miss. The nightly toolchain install, corpus, targets, `-max_total_time=30`, and `-timeout=5` are unchanged; only the prerequisite build disappears.

### 4. Governance tests pin the reused shapes

`native-ci-workflows.test.ts` already asserts that Development builds, scopes, certifies, and fuzzes directly. It gains assertions that the cache restore precedes the release build with a key covering every input group, that the toolchain, build, and save steps are conditional on a miss, that the reuse and verify steps precede the build receipt, that the fuzz-binary cache exists and gates the install, and that the partition command set includes no unit-test invocation. `terminal-host-release-artifact.test.ts` covers the reuse decision: matching files pass, and a tampered addon, missing notices, changed `Cargo.lock`, crate version, target, or schema each name their reason.

## Risks / Trade-offs

- [A cache key misses an input that changes the artifact] → the key hashes the whole native tree, the toolchain pin, and the build script with its imports; the restored output is re-verified; and `builtAt` identifies the producing run so a stale entry can be traced and the key version bumped.
- [`actions/cache` eviction or outage] → every miss falls back to today's build path; no step depends on a hit.
- [Fewer unit-test executions per target] → one execution per target remains in the build-and-probe lane; partitions never were the unit-test authority.
- [Measured savings differ from estimates] → the change reports structural reductions separately from observed run timings in the design evidence, per the validation-efficiency auditability requirement.
- [Expectation that this change reduces nightly cost] → nightly duplication is real (same commit in both scheduled workflows on 38 of 40 days) but removing it is a cadence and exact-bytes policy decision, deferred explicitly.

## Migration Plan

No data migration. Reverting restores unconditional release builds, partition unit-test runs, and the per-run `cargo-fuzz` install.

## Implementation Evidence

Structural reductions (measured on the runs named in Context, before this change):
- Release terminal-host builds per candidate run: one per `packs_candidate` lane (four on a resident-tabs pull request, 2.6 to 3.4 minutes each) → one per distinct input set per platform across runs; a hit replaces toolchain, Zig, Cargo-cache, and build steps with a cache restore of three files plus `--reuse` and `--local` verification.
- Terminal-host unit-test executions per target per run: four (three partitions plus the build-and-probe lane) → one.
- `cargo-fuzz` compiles per Linux terminal-host run: one → zero on a hit.

Local validation in the task worktree (Windows, no `bash` on PATH, no `dist/` build):
- `npx vitest run test/repository-governance/native-ci-workflows.test.ts test/repository-governance/terminal-host-release-artifact.test.ts`: 20 passed, 1 failed. The failure is the pre-existing `exports the selected SDK with spaces…` case, which spawns `bash` and is unrelated to this change; it passes on CI runners.
- `npm run typecheck`: no diagnostics in the changed files; the remaining diagnostics are `bin/*.js` imports of the unbuilt `dist/` tree, identical before the change.
- `npx openspec validate right-size-development-validation --strict`: valid.

Known gaps: observed run timings for the cache hit path are recorded only once Development validation runs on this pull request's head; the first run on any platform is a miss by construction, so the hit timing appears from the second run with unchanged native inputs.

### CI repair: supervisor shutdown reconciliation

The Pi release/resume integration job in run `42229356128` passed its assertions but failed on an unhandled `database is not open` rejection. Owner-disconnect reconciliation could resume after its process wait and write a terminal outcome after supervisor shutdown had closed SQLite. Shutdown now blocks new reconciliation and settles existing reconciliation before retiring the endpoint and closing storage, retaining the existing bounded process wait.

The regression uses a real supervisor, authenticated socket, and SQLite store with controlled root liveness and timers. Both exited-root and surviving-root cases reproduced premature storage closure and the exact unhandled rejection before the fix. After the fix:

- `foreground-terminal-lease.test.ts` and `supervisor-release-exit.test.ts`: 17 tests passed, including both new cases.
- `supervisor-recovery.integration.test.ts`: all 16 tests passed, including the original kill-all recovery case.
- `npm run typecheck`: passed after building the TypeScript output and startup assets.
- `openspec validate right-size-development-validation --archived --strict`: this archive passed. The CLI scans all archives despite the supplied name and exits nonzero for 69 unrelated historical archives with incomplete tasks.

Local Windows validation used the installed release process-guardian addon and matching manifest (protocol 2, N-API 9, crate `0.1.0-dev`) because the local Microsoft C++ tools and Windows SDK are unavailable. CI retains the native build and platform coverage. Separately, run `42251993339` cancelled two macOS arm64 partitions before any runner or step started; GitHub annotated hosted-runner acquisition failures and capacity constraints. Those infrastructure cancellations do not justify weakening checks or assertions.
