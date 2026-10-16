# Design

This document is written for the agent that implements the change. Section "Current mechanics" states how the workflows work today, verified against the files and logs named; do not act on a different model of them. Section "Invariants" lists what must not change. Each decision then names the exact files, identifiers, and the evidence that proves it landed. Every number below was measured on the runs of 15 and 16 October 2026 through the Actions API, job logs, and uploaded outcome artifacts.

## Context

### Measured critical paths

| Workflow | Run | Wall clock | Critical path |
| --- | --- | ---: | --- |
| PR validation, full lanes | #783, run 38932922175 | 27 min | Native terminal host (Windows x64) 24.9 min |
| PR validation, small change | #788, run 38936639049 | 3.5 min | PR core 2.5 min |
| Nightly publication | run 38851688028 | 46 min | Intel macOS host build 11 min, package 2.5 min, Windows Node 22 `package` shard 24.5 min, publish 3.3 min, Windows smoke 3.2 min |
| Full regression | run 38836452313 | 26 min | Windows `package` shards 25 min |
| Development publication | run 38770221164 | 29 min | Intel macOS host build 9.7 min, package 2 min, win32 validate 7 min, publish 6.9 min, Windows smoke 3.5 min |

Inside the Windows terminal host job (1498 s):

| Segment | Seconds | Source |
| --- | ---: | --- |
| checkout, Node, npm pin, `npm ci`, Rust, Zig, caches | 160 | step timings |
| `cargo test` build, features `resident-fixtures,fault-injection` | 86 | log: `Finished test profile in 1m 26s` |
| `role_integration` binary, 23 tests | 775 | log: `23 passed ... finished in 775.19s` |
| release build with `resident-fixtures`, dev build, dev addon build, release bin and addon via `build-terminal-host.mjs` | 377 | log `Finished` lines |
| probes, fidelity and latency certification, uploads | 100 | step timings |

The same test binary took 747 s on macOS and 706 s on Linux. All 23 tests in `native/terminal-host/tests/role_integration.rs` take `ROLE_TEST_SERIAL` (a global `Mutex<()>`), so the binary runs them strictly one at a time; the tests contain fixed waits (`wait(Duration::from_secs(8))`, 15 to 50 s output deadlines). Resident chaos lanes took 1053 s (Windows), 930 s (macOS), 830 s (Linux); `run-resident-chaos.mjs` runs a fixed 600-second action budget (`DEFAULT_SECONDS`) after a release build with `resident-fixtures`. The chaos lane was the failing job in each of the four most recent failed PR runs (38884454064, 38877825409, 38877772898, 38874197809) and in PR #787's first attempt, whose 45-minute wall clock was two 27-minute attempts.

Inside the nightly Windows Node 24 `package` shard (929 s of gates, 1212 s of job): `vitest-update-predecessor` 737 s, `exact-package-preparation` 161 s, `vitest-package-smoke-2` 63 s, `vitest-package-startup` 53 s, `vitest-package-contracts` 38 s. On Linux the same predecessor invocation took 24 s and preparation 9 s. The other Windows shards took 285 to 466 s.

Release terminal host builds, `Build, verify, and record the release terminal host` step: Windows 270 s (rust-cache miss, 15 Oct) and 279 s (hit, 16 Oct); Linux 166 s (miss) and 157 s (hit); macOS arm64 162 s (miss) and 194 s (hit); macOS Intel 364 s (miss) and 506 s (miss). The cache state does not change these builds materially because the crate's own compile with `lto = "thin"` and `codegen-units = 1` dominates. The debug `terminal-host` rust-cache key reported `No cache found.` on all three PR lanes because caches saved on one PR's merge ref are invisible to other PRs and `ci.yml` never runs on `develop`.

Caches: 114 entries, 9.9 GiB of the 10 GiB limit; 43 Zig caches of 120 to 230 MB keyed `setup-zig-cache-v2-<job>-zig-<triple>-<version>-<cache-key>-<run id>-<attempt>`. The pinned `mlugg/setup-zig` saves one new cache per job per run by design (`post.js` appends `runId-runAttempt`) and restores by prefix; `cache-key` changes only the prefix, and `cache-size-limit` clears the directory before saving when it exceeds the limit. `prepare-ci-rust.sh` runs `rustup toolchain install stable`; rustc moved 1.98.0, 1.99.0, 1.99.1 inside the window, and each move changed every rust-cache key.

### Current mechanics the decisions depend on

Development validation (`ci.yml`):

- `changes` runs `select-validation-impact.mjs`, then `validation-matrix.mjs` selects entries of `DEVELOPMENT_VALIDATION_MATRIX` (15 entries) whose `group` resolves active through `resolveValidationJob()`; the `modular` job's matrix is that `include` list. The terminal host entries are `{ group: "terminal-host", terminalHost: true, terminalHostBinary, build: true }` for `win32/x64/24`, `linux/x64/24`, `darwin/arm64/24`.
- Inside `modular`, `resolve-validation-job.mjs` writes `active`, `packs_candidate`, `head`, `selection_id`, `owners_json`, `scopes_json`, `tests_json`. The step `Run exact selected scopes` runs `run-validation-tier.mjs --result .artifacts/validation/outcome-<group>-<platform>-node<node>-attempt-<attempt>.json` with `VALIDATION_JOB_ID=<group>`; the `terminal-host` scope is `config/validation-suites.json` kind `commands` with one command `terminal-host-build-and-probes` = `npm run test:terminal-host` = `scripts/development/run-terminal-host-probe.mjs`, which has no build prerequisite (`requiresBuild` is unset, so no `candidate-build` command is emitted).
- The outcome carries `authority` from `validationOutcomeAuthority()` (`scripts/release/validation-outcome.mjs`, schema `a1-validation-outcome-authority-v1`, strict field validation), and the job writes `job-envelope-<group>-<platform>-node<node>-attempt-<attempt>.json` (schema `a1-validation-job-envelope-v2`). Both upload under artifact `development-validation-outcome-<group>-<platform>-node<node>-attempt-<attempt>`; `required` downloads `development-validation-outcome-*` with `merge-multiple: true` into one directory, so file names must be unique across jobs.
- `require-modular-validation.mjs` builds one expected descriptor per selected owner target as `{ job: validationJobGroup(owner, platform), platform, architecture, node, scopes }`, keys evidence by `job:platform:architecture:node` (`targetKey`), demands a current-attempt envelope with `status: success` and `active: "true"` per key, and matches an outcome by `matchesOwner()` (job, platform, architecture, node, owner in `authority.owners`, every expected scope in `authority.selected`). A duplicate key in one attempt throws `required modular outcome duplicated`.
- `development-validation-timing.mjs` computes `criticalPathMs` and `maxScopeMs` from the accepted outcomes against 480 000 ms and 300 000 ms targets; the aggregate for #783 recorded 1 445 993 ms and 1 297 909 ms, both unmet.
- `run-resident-chaos.mjs` reads `--seconds`, then `RESIDENT_CHAOS_SECONDS`, then `DEFAULT_SECONDS` (600), bounds it to 1 to 900, and already writes `seconds` into the report (schema `a1-resident-chaos-v2`) beside `seed` and `schedule`.
- `prepare-ci-rust.sh` is sourced by `test/repository-governance/environment-probe.test.ts`, which asserts the exact command sequence `rustup toolchain install stable --profile minimal --no-self-update`, `rustup default stable`, `cargo --version`, `rustc --version`.
- The step `Use the pinned npm for packing` installs `npm@<packageManager version>` when the lane's npm differs. Packing requires only npm major 11 or newer (`assertPackingNpm` in `scripts/release/npm-pack-metadata.mjs`, `MINIMUM_PACK_NPM_MAJOR = 11`); Node 24 lanes ship npm 11, Node 22 lanes ship npm 10.

Complete regression (`full-regression-shared.yml`, `publish.yml`, `validation-tier.mjs`):

- `FULL_REGRESSION_SHARDS = ["core", "resource", "rendering", "package"]` (`full-regression-shards.mjs`). `partitionFullRegressionPlan()` assigns every canonical command and invocation to exactly one shard through `FULL_REGRESSION_SHARD_ASSIGNMENT`, pushes the one `exactPackagePreparation` into `shards.package.preparation`, and throws if any shard owns no invocation. `createFullRegressionShardPlan(plan, shard)` narrows commands and vitest invocations to the shard and sets `exactPackagePreparation` only for a shard with preparation.
- The exact-package preparation plan has `consumers` drawn from `package-startup`, `package-contracts`, `update-predecessor`; `assertExactPackagePreparationPlan()` requires each consumer to have exactly one invocation in the plan it is checked against, and `assertPreparedPackageMatchesPlan()` requires the receipt's `consumers` to equal the plan's. `run-validation-tier.mjs --prepare-exact-package` prepares `canonicalPlan` consumers and writes a handoff; the shard then runs with `--exact-package-handoff`.
- Workflow steps `Set up Zig for the release terminal host`, `Cache release terminal host build`, `Build the release terminal host into the candidate`, `Pack exact regression candidate once`, `Prepare the exact package`, `Enable Defender real-time protection for startup acceptance`, and `Summarize first-attempt startup measurements` are conditioned on `matrix.shard == 'package'`; `test/repository-governance/full-regression-policy.test.ts` asserts those conditions and the shard matrix `{ os: ["windows-2025"], node: [24, 22], shard: FULL_REGRESSION_SHARDS }`.
- `full-regression-evidence.mjs --record-shard` writes `.artifacts/validation/full-shards/<lane>-<shard>.json`; `--merge-shards` requires every key of `partition.shards`, equal plan digest and assigned work per shard, and takes `exactPackagePreparation` from the `package` shard only; `--record` binds a lane; `--require` demands the four `FULL_LANES` (`windows-2025-node24`, `windows-2025-node22`, `ubuntu-24.04-node24`, `macos-15-node24`). The summary text `All four exact-run lanes passed.` counts lanes, not shards, and stays as it is.
- `publication-validation-matrix.mjs` expands `publicationWindowsShardMatrix(mode)` from `FULL_REGRESSION_SHARDS` for `nightly` and `candidate`; `validate_windows_lane` in `publish.yml` merges `release-validation-<version>-<platform>-shard-*` artifacts.

Publication native builds (`publish.yml`):

- `guardians` and `terminal_hosts` run on `[windows-2025, ubuntu-24.04, macos-15, macos-15-intel]`, upload `dist/native` as `release-process-guardian-<runner.os>-<runner.arch>` and `release-terminal-host-<runner.os>-<runner.arch>`; `package` downloads `release-process-guardian-*` and `release-terminal-host-*` with `merge-multiple: true` into `dist/native` and runs `verify-native-artifacts.mjs`, which requires `win32-x64`, `linux-x64`, `darwin-arm64`, `darwin-x64` directories each holding `manifest.json` and `terminal-host.manifest.json` with matching `platform`, `architecture`, hashes, and sizes.
- `build-terminal-host.mjs` derives `platform`, `architecture`, the output directory `dist/native/<platform>-<architecture>`, and the Cargo output directory `native/terminal-host/target/release` from the host; runs the executable with `--version` and checks the report; and calls `writeTerminalHostNotices({ triple: hostTriple() })`, which runs `cargo metadata --filter-platform <triple>`. `build-process-guardian.mjs` does the same for the guardian and checks `--version` output contains `protocol=1`. `native/terminal-host/build_target.rs` already maps `x86_64-apple-darwin` to Zig `x86_64-macos`, and `build.rs` reads Cargo's `TARGET`.
- `test/repository-governance/release-pipeline-policy.test.ts` asserts the runner list string `os: [windows-2025, ubuntu-24.04, macos-15, macos-15-intel]` for both jobs, the setup-zig pin, `run: bash scripts/development/prepare-ci-rust.sh`, and `run: npm run build:terminal-host`; `validation-receipt-workflows.test.ts` asserts the rust-cache `shared-key: terminal-host-release`.

## Out of scope

The analysis also proposed six items this change does not deliver: chaos lane flakiness, reusing one release host build across pull-request jobs, moving Linux fuzzing to nightly, nightly reuse of the development publication's host builds, the registry propagation wait, and publication concurrency serialization. `proposal.md` lists each with its measurement and the reason it is deferred; none is partially applied here.

## Invariants

These hold before and after every decision. A task that cannot keep one stops and reports instead of working around it.

1. No test, assertion, timeout, retry count, predecessor count, Defender requirement for startup, startup budget, or publication gate is removed, weakened, or retried. Only where work runs and how long the chaos budget is on pull requests change.
2. Every outcome, envelope, shard record, and lane record keeps its schema name unless a decision below says it adds an optional field; readers stay backward compatible with evidence that lacks the field.
3. `required` (PR), `Complete regression required` (Full regression), and `Validate publication lanes` (publication) must still fail closed on a missing, duplicate, stale, cancelled, or skipped job; each decision adds the new job shape to those checks before adding the job to a workflow.
4. Stable publication keeps adopting candidate-validated bytes without building; `mode == 'stable'` paths in `publish.yml` are untouched.
5. Development (`develop` mode) publication keeps its sequential Node 24 lanes and schedules no Windows shards.
6. The `terminal-host` owner's selection rules (`config/integration-owners.json` entries and support paths) are unchanged; partition jobs are scheduled exactly when the owner is selected.
7. Local commands keep working unchanged: `npm run test:terminal-host`, `npm run test:resident-chaos`, `npm run test:full`, `npm run build:terminal-host`, `npm run build:process-guardian`.
8. Nothing is committed under `.artifacts/`; policy tests under `test/repository-governance/` are updated in the same commit as the shape they pin.
9. Decisions land as separate commits in the order 2, 6, 5, 3, 1, 4, each leaving every workflow valid; a decision that cannot be finished is left out and reported, not half-applied.

## Decisions

### 1. Partition the terminal host integration tests across jobs

Shape: per platform, the existing `terminal-host` entry keeps builds, probes, certification, fuzzing, and uploads but runs no role tests; three new entries `{ group: "terminal-host", partition: "1/3" | "2/3" | "3/3", label: "Native terminal host tests <platform> <i>/3", build: false, terminalHost: false, chaos: false }` run only the role tests. Partition selection uses libtest, not a new tool: the probe script lists test names with `cargo test --test role_integration --features resident-fixtures,fault-injection -- --list --format terse`, sorts them, keeps index `i - 1` modulo `n`, and runs `cargo test --test role_integration --features resident-fixtures,fault-injection -- --exact <names...>`. Sorting makes the partition deterministic for a given test set; adding a test changes the partitions, which is acceptable because every partition runs on every selected PR.

Script changes in `scripts/development/run-terminal-host-probe.mjs`:

- `--partition <i>/<n>` (also env `TERMINAL_HOST_PARTITION`): run the unit tests of the lib target (`cargo test --lib`, 0.5 s) and the partition of `role_integration`, then `assertNoFixtureProcesses`, then exit. Skip vitest, probes, release builds, addon, and `build-terminal-host.mjs`.
- `--skip-role-tests` (also env `TERMINAL_HOST_PARTITION=none`): run everything the script runs today except the `role_integration` test target (`cargo test --lib --bins` plus the current `--features` for the unit tests, so the unit tests still run once), keeping `assertNoFixtureProcesses` after the step that spawned fixtures.
- With neither flag, behaviour is byte-identical to today, so local runs and `test:terminal-host` are unchanged.

Selection and evidence:

- `validation-matrix.mjs`: add `TERMINAL_HOST_TEST_PARTITIONS = 3` and the nine partition entries; `selectDevelopmentValidationMatrix()` activates them whenever the `terminal-host` owner target is active; `resolveValidationJob()` is unchanged (the partition is a job attribute, not a scope).
- `ci.yml` modular job: pass `TERMINAL_HOST_PARTITION: ${{ matrix.partition || 'none' }}` only for `matrix.group == 'terminal-host'`, so other groups see no variable; set `VALIDATION_PARTITION: ${{ matrix.partition || '' }}`; name outcome, envelope, and artifact with a `-part<i>of<n>` suffix when `matrix.partition` is set (artifact `development-validation-outcome-terminal-host-win32-node24-part1of3-attempt-1`); partition jobs run `npm ci --ignore-scripts` instead of `npm ci` because they run no vitest and need no `dist/`, and skip `Cache process guardian build`, `Certify terminal fidelity`, fuzzing, and the terminal host uploads; `timeout-minutes` 25 for partitions.
- `validation-outcome.mjs`: accept optional `VALIDATION_PARTITION` matching `^[1-9]\d*/[1-9]\d*$`; when present, add `partition` to the authority. `assertValidationOutcomeAuthority()` validates the field when present and keeps accepting authorities without it.
- Envelope: add optional `partition` with the same grammar; `assertEnvelope()` in `require-modular-validation.mjs` accepts both shapes.
- `require-modular-validation.mjs`: `targetKey()` appends `:${partition}` when present; for owner `terminal-host` the expected descriptors become one without partition plus `TERMINAL_HOST_TEST_PARTITIONS` with partitions `1/3`, `2/3`, `3/3`, every one with `scopes: ["terminal-host"]`; everything else, including reuse of successful prior-attempt evidence, is unchanged. `selectModularEvidenceFiles()` already accepts the new file names.
- `docs/validation.md` terminal-host paragraph describes the four jobs per platform.
- The certification step runs one unmeasured `measure-resident-tabs.mjs` pass before the measured one. The branch's first diagnostic run (38947886232) failed that step on Windows with `warmCreateMs` 314 ms against the 250 ms budget, where the last run before the change measured 62 ms; the only difference in that job was the 13 minutes of role tests that no longer precede certification and that spawned the host, holder, and fixture paths hundreds of times. The warm-up pass restores that state; the measured pass, its single-sample budgets, and its evidence file are unchanged, and the warm-up's exit status is ignored because its result is not evidence.

Expected result: the Windows critical path becomes the build-and-probe job at about 11 minutes (160 + 86 + 377 + 100 s) or a partition at about 8.5 minutes (160 + 86 + 260 s), down from 24.9. Evidence: the aggregate summary line `Runner critical path` on the PR's own run and the four `Native terminal host` jobs per platform in the checks list.

Rejected: cargo-nextest partitions (adds a 2 to 3 minute `cargo install` or a downloaded binary to every partition job for no functional gain over libtest filters); parallel tests inside one job (the tests bind resident endpoints and registry paths written to run one at a time; auditing them is a separate change); shortening the tests' fixed waits (changes what they prove).

### 2. Pull-request chaos budget of 300 seconds

In the `Run exact selected scopes` step env of `ci.yml` add `RESIDENT_CHAOS_SECONDS: ${{ github.event_name == 'pull_request' && '300' || '600' }}`. The script already bounds, records (`seconds` in the report), and honours the variable; it is not changed. Full regression and publication do not run the chaos owner (its `fullReleaseExclusion` in `validation-suites.json`), so no other workflow changes. `test/repository-governance/impact-aware-validation-workflows.test.ts` asserts the expression. Expected: chaos lanes 5 minutes shorter; with Decision 1 the Windows chaos lane at about 12.5 minutes is the new critical path.

### 3. A fifth Windows shard for the published-predecessor invocation

- `full-regression-shards.mjs`: `FULL_REGRESSION_SHARDS = ["core", "resource", "rendering", "package", "predecessor"]`.
- `validation-tier.mjs` `FULL_REGRESSION_SHARD_ASSIGNMENT`: remove `/^vitest-update-predecessor$/u` from `package.invocations`; add `predecessor: { commands: ["candidate-pack"], invocations: [/^vitest-update-predecessor$/u] }` so the shard packs its own candidate exactly as `package` does (`consumesPackage` derives from `candidate-pack`). In `partitionFullRegressionPlan()`, push the preparation id into both `shards.package.preparation` and `shards.predecessor.preparation`. In `createFullRegressionShardPlan()`, narrow `exactPackagePreparation.consumers` to the consumers whose invocation the shard owns (`package`: `package-startup`, `package-contracts`; `predecessor`: `update-predecessor`) so `assertExactPackagePreparationPlan()` passes per shard. `prepareSharedExactPackage()` must receive the shard plan when `--full-shard` is set so the receipt's `consumers` equal the shard plan's; the unsharded sequential lanes keep the canonical three consumers. `fullRegressionPlanDigest()` hashes the canonical plan and is unaffected.
- `full-regression-evidence.mjs` `mergeFullShards()`: the merged `exactPackagePreparation` becomes the `package` shard's evidence with a second entry recorded for `predecessor`; store it as `exactPackagePreparation` (package) plus `exactPackagePreparations: { package, predecessor }`, keeping the existing field for readers. The `expected` list already comes from `partition.shards`, so five shards are required without further change.
- Workflows: in `full-regression-shared.yml` `windows-shard` and `publish.yml` `validate_windows_shard`, change the conditions of `Set up Zig for the release terminal host`, `Cache release terminal host build`, `Build the release terminal host into the candidate`, `Pack exact regression candidate once`, and `Prepare the exact package` to `matrix.shard == 'package' || matrix.shard == 'predecessor'`; leave `Enable Defender real-time protection` and `Summarize first-attempt startup measurements` on `package` only. Publication's `validate_windows_shard` has no pack step (it downloads the candidate) and needs only the preparation condition widened.
- Tests: `full-regression-shards.test.ts` (shard list, assignment, per-shard preparation consumers), `full-regression-policy.test.ts` (conditions and matrix), `pr-full-regression.test.ts` and `release-pipeline-policy.test.ts` (publication matrix expands five shards per runtime), `validation-receipt-workflows.test.ts` if it pins the package-only condition. `docs/validation.md` describes five shards.

Expected: nightly and Full regression critical path becomes the predecessor shard at about 18 minutes (setup about 200 s, release host build 320 s on the first run or less with cache, pack and preparation 160 s, invocation 740 s) instead of 24.5; the package shard falls to about 12 minutes. Evidence: the `Windows shards` summary table in the `Reconstruct Windows lane` job.

Rejected: concurrent predecessor installs and a lower `UPDATE_PREDECESSOR_COUNT`, both forbidden by the published-predecessor evidence requirement.

### 4. Cross-compile macOS x64 on the arm64 publication runner

- `build-terminal-host.mjs` and `build-process-guardian.mjs`: accept `--target <triple>` (default none). With a target: pass `--target <triple>` to every `cargo build`; read artifacts from `native/<crate>/target/<triple>/release/`; derive `platform` and `architecture` from the triple (`x86_64-apple-darwin` gives `darwin`, `x64`); write under `dist/native/darwin-x64`; pass the triple to `writeTerminalHostNotices()` instead of `hostTriple()`; set the manifest `target` to the triple. The `--version` identity check runs the x86_64 binary through Rosetta 2 when `arch -x86_64 /usr/bin/true` succeeds; otherwise it reads the Mach-O header (`cputype` 0x01000007) and records `identityCheck: "mach-o-header"` in the manifest, and the test asserts both branches with a fixture.
- `publish.yml`: remove `macos-15-intel` from both matrices; in the `macos-15` jobs add `rustup target add x86_64-apple-darwin` after `prepare-ci-rust.sh`, run the native build, then run it again with `--target x86_64-apple-darwin`; upload `dist/native` once (it then holds `darwin-arm64` and `darwin-x64`), so the artifact names `release-terminal-host-macOS-ARM64` and `release-process-guardian-macOS-ARM64` carry both and `package`'s `merge-multiple` download and `verify-native-artifacts.mjs` need no change. Keep the nightly `core::sim` budget step on Linux only.
- `release-pipeline-policy.test.ts`: the runner list becomes `os: [windows-2025, ubuntu-24.04, macos-15]` and a new assertion requires the `x86_64-apple-darwin` target step and second build in both jobs. `docs/architecture/resident-tabs.md` records the change from the 2026-10-14 Intel-runner decision and `docs/architecture/toolchain.md` names the cross-compiled lane.
- Published-pair smoke keeps its lanes (`publicationValidationMatrix` is unchanged). It has no macOS x64 lane, so the `darwin-x64` bytes are executed in CI only by the build's identity check, exactly as before when only the Intel build job ran `--version`; this change does not reduce that coverage, and it does not add any.

Expected: the package step starts about 5 minutes earlier in every publication (the arm64 job finishes at about 260 s plus the second build, against 506 to 581 s on the Intel runner). Evidence: `Build terminal host (macos-15)` duration and the absence of an Intel job.

Rosetta 2 availability on the hosted `macos-15` arm64 image is not assumed: both identity paths are implemented and unit-tested, and the first publication after merge shows which ran through `provenance.identityCheck` in the packed `darwin-x64` manifests. Publication cannot be exercised from a pull request (it runs only from `develop` and release triggers), so this item's end-to-end evidence is the first nightly or development publication after integration.

### 5. Pinned toolchain and bounded Zig cache

- Add `rust-toolchain.toml` at the repository root with `channel = "1.99.1"` and `profile = "minimal"` (the version the 16 October runs used). Change `prepare-ci-rust.sh` to `rustup toolchain install --profile minimal --no-self-update` (reads the file), `rustup default` of that version, then the two `--version` lines; update the command sequence asserted by `environment-probe.test.ts`. Pin the fuzz nightly the same way: cache `~/.cargo/bin/cargo-fuzz` with `actions/cache` keyed `cargo-fuzz-0.13.2-nightly-2026-10-01-linux` so the install step is skipped on a hit.
- `mlugg/setup-zig` steps: add `cache-key: <workflow>-<platform>` and `cache-size-limit: 512` everywhere. This bounds each entry; the action still saves one entry per run. The first PR run measures the Zig share of a cold build (log time from `Compiling terminal-host` to `Finished` on a partition job with `use-cache: false` on one platform); if the share is under 60 s, set `use-cache: false` on the `modular` jobs and keep it in publication; otherwise keep the cache and record the measurement in `docs/architecture/toolchain.md`. Do not invent the number.
- Do not add a warm-cache job on `develop`: the measurements above show cache state does not change release build time, and the debug key would save about 40 s per lane, which does not justify a workflow.

### 6. Pin npm only where it matters

Gate `Use the pinned npm for packing` with `if: matrix.node == 22` in `ci.yml` (modular), `full-regression-shared.yml` (`windows-shard`; delete the step from `full-regression`, whose matrix is Node 24 only), and `publish.yml` (`validate_sequential`, `validate_windows_shard`). Keep the comment. `assertPackingNpm()` already refuses npm 10 at pack time, so a wrongly gated lane fails loudly rather than packing differently. Assert the gate in `release-pipeline-policy.test.ts` and `impact-aware-validation-workflows.test.ts`. Saves 18 to 30 s per Node 24 job.

## Verification per decision

Before pushing: `npm run typecheck`, the repository-governance test files named in each task, and `npx --yes @fission-ai/openspec@1.8.0 validate ci-critical-path --strict`. After readiness, the PR's own run must show: four `Native terminal host` jobs per platform all green and the aggregate `Runner critical path` line (Decision 1); the chaos report artifact with `"seconds": 300` (Decision 2); the `Windows shards` table with five rows (Decision 3, visible on a dispatched Full regression of the branch, which is diagnostic only); no `macos-15-intel` job and both `darwin-*` directories in the `release-terminal-host-macOS-ARM64` artifact of a dispatched development publication (Decision 4); `rustc 1.99.1` in every job log (Decision 5); no `Use the pinned npm` step on Node 24 jobs (Decision 6).

## Risks

- Partition jobs add nine runners to PRs that select the terminal host owner; all 20 jobs of the measured run started within 15 s, so the hosted concurrency limit was not binding.
- The shorter PR chaos budget finds fewer schedule-dependent violations per run; exhaustive cadence keeps 600 s.
- The fifth shard adds one Windows runner per Windows runtime to nightly, candidate, and Full regression runs.
- A cross-compiled `darwin-x64` artifact may be verified only by its Mach-O header if the arm64 runner cannot execute it; the manifest says which check ran, and no publication lane executed the x64 bytes beyond the build's own identity check before this change either.
