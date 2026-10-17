# Proposal: Cut the CI critical path

## Why

Development validation reports its own targets unmet on every full-lane pull request: the aggregate for PR #783 recorded a 24.1-minute runner critical path against the 8-minute target and a 21.6-minute longest scope against the 5-minute target. Measured on the runs of 15 and 16 October 2026, the time goes to a few specific places rather than to generic setup: the native terminal host lane spends 12 to 13 minutes in one serialized Rust integration test binary on every platform, the resident chaos lane runs a fixed 10-minute budget plus a release build, the Windows `package` shard of Full regression and nightly publication spends 11 to 12 minutes in the published-predecessor invocation alone, the macOS Intel release host build takes 8 to 11 minutes and gates packing, and 43 per-run Zig caches hold 6 GB of the repository's 10 GB cache budget so every other cache is evicted within a day. Generic remedies are already in place: npm caches hit, 20 jobs run in parallel, superseded PR runs are cancelled, and larger runners are not available to this account.

## What Changes

- The terminal host validation lane runs its Rust integration tests as parallel partition jobs per platform while one job per platform keeps the builds, probes, fidelity and latency certification, fuzzing, and artifact uploads.
- Resident chaos keeps its exhaustive 600-second budget on nightly, Full regression, and manual runs, and uses a 300-second budget on pull-request lanes.
- Full regression and nightly/candidate publication validation run each Windows runtime as five shards: the existing `core`, `resource`, `rendering`, and `package` shards plus a `predecessor` shard that owns the published-predecessor invocation with its own exact-package preparation; lane reconstruction requires all five.
- The macOS x64 release terminal host and process guardian are cross-compiled on the macOS arm64 publication runner, and the Intel runner leaves the publication build matrices.
- The Zig cache uses one stable key per platform with a size limit instead of one cache per run, the Rust toolchain is pinned by a `rust-toolchain.toml` instead of installing the newest stable in every job, and the Linux fuzz toolchain and `cargo-fuzz` binary are cached.
- The pinned npm installation step runs only on Node 22 lanes, where the pack-script compatibility it exists for applies.

## Deferred

These were proposed in the same analysis and are intentionally outside this change. Each needs its own change if pursued.

- **Chaos lane flakiness.** The chaos lane failed in the four most recent failed PR runs and in PR #787's first attempt; each re-run costs a full 27-minute run. Diagnosing it starts from the `resident-chaos-<platform>-<arch>-attempt-<n>` report artifacts of runs 38884454064, 38877825409, 38877772898, and 38874197809 and is a correctness fix, not a speed change.
- **Reusing one release host build across pull-request jobs.** Five PR jobs each build the release host (Exact-package contracts 228 s, startup 230 s, Pi 167 s, Unix macOS 125 s, Unix Linux 81 s), all in parallel. A shared build stage would add a sequential stage before them and gain nothing on the critical path; it saves runner minutes only.
- **Moving Linux decoder fuzzing to nightly.** The Linux lane spends 220 s on the nightly toolchain, `cargo-fuzz`, and four 30-second fuzz runs. The `continuous-integration` requirement says Linux x64 runs the fuzz target on every selected pull request; this change only caches the toolchain and binary.
- **Nightly reuse of the development publication's host builds.** On 16 October nightly rebuilt all four hosts for a commit the per-merge publication had just built. Reuse needs artifact lookup by source commit across runs with provenance verification inside the publication authority and is reviewed separately.
- **Registry propagation wait.** `Verify the registry serves the validated bytes` took 165 s and 379 s waiting for npm to serve the published bytes (up to 60 polls at 10 s). That is external; starting published-pair smoke from the same poll would save about a minute and is not included.
- **Publication concurrency serialization.** A no-op development publication waited 29 minutes behind the previous run in the `a1-registry-publication` group. Letting `plan` run outside the group changes the documented single critical section and is reviewed separately.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: terminal host tests may be partitioned across jobs; Windows complete validation has a fifth `predecessor` shard; pull-request chaos uses a shorter bounded budget; native toolchains and caches are pinned and stable; macOS x64 release artifacts are cross-compiled.
- `isolated-regression-testing`: the published-predecessor invocation may run in a dedicated shard separate from the package shard.

## Impact

Workflows `.github/workflows/ci.yml`, `full-regression-shared.yml`, and `publish.yml`; `scripts/release/validation-matrix.mjs`, `full-regression-shards.mjs`, `validation-tier.mjs`, `publication-validation-matrix.mjs`, `full-regression-evidence.mjs`; `scripts/development/run-terminal-host-probe.mjs`, `run-resident-chaos.mjs`, `build-terminal-host.mjs`, `build-process-guardian.mjs`, `prepare-ci-rust.sh`; a new `rust-toolchain.toml`; the repository-governance policy tests that pin those shapes; `docs/validation.md` and `docs/architecture/resident-tabs.md`. No product runtime code changes. Expected effect, from the measured runs: full-lane pull requests from about 27 to about 13 minutes, nightly publication from 46 to about 33 minutes, Full regression from 26 to about 19 minutes, per-merge development publication from 29 to about 24 minutes.
