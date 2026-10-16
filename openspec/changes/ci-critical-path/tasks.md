# Tasks

Each numbered section is one Implementation item of the pull request and one commit, landed in the order 2, 6, 5, 3, 1, 4. Read `design.md` "Current mechanics" and "Invariants" before editing; every task names the files it may touch, and a file not named is out of scope for that task. Run the listed tests and `npm run typecheck` before each push.

## 1. Terminal host test partitions

- [ ] 1.1 In `scripts/development/run-terminal-host-probe.mjs`, add `--partition <i>/<n>` (env `TERMINAL_HOST_PARTITION`) that runs `cargo test --lib` with the current features, lists `role_integration` tests with `-- --list --format terse`, sorts the names, selects index `i-1` modulo `n`, runs them with `-- --exact`, and runs `assertNoFixtureProcesses`; add `--skip-role-tests` (env value `none`) that runs today's sequence without the `role_integration` target. With neither flag the script is unchanged. Cover the partition selection with a unit test that proves every name lands in exactly one partition and that an empty partition fails.
- [ ] 1.2 In `scripts/release/validation-matrix.mjs`, add `TERMINAL_HOST_TEST_PARTITIONS = 3` and nine `terminal-host` entries with `partition`, `build: false`, `terminalHost: false`, activated with the owner; update `test/repository-governance/validation-job-selection.test.ts` (matrix length, partition activation, inactive ordering).
- [ ] 1.3 In `scripts/release/validation-outcome.mjs` accept optional `VALIDATION_PARTITION` and emit `partition`; in `scripts/release/require-modular-validation.mjs` accept optional envelope `partition`, append it to `targetKey()`, and expand the `terminal-host` descriptor into the build job plus three partitions; update `test/repository-governance/modular-validation-aggregate.test.ts` to prove a missing or duplicated partition fails and evidence without the field still passes.
- [ ] 1.4 In `.github/workflows/ci.yml` modular job: set `TERMINAL_HOST_PARTITION` and `VALIDATION_PARTITION` from `matrix.partition`, suffix outcome, envelope, and artifact names with `-part<i>of<n>` for partition entries, use `npm ci --ignore-scripts` and skip guardian cache, certification, fuzzing, and host uploads on partitions, and set their `timeout-minutes` to 25; update `test/repository-governance/impact-aware-validation-workflows.test.ts` and the terminal-host paragraph of `docs/validation.md`.

## 2. Pull-request chaos budget

- [ ] 2.1 In `.github/workflows/ci.yml`, add `RESIDENT_CHAOS_SECONDS: ${{ github.event_name == 'pull_request' && '300' || '600' }}` to the `Run exact selected scopes` step env; assert the expression in `test/repository-governance/impact-aware-validation-workflows.test.ts`. Do not edit `scripts/development/run-resident-chaos.mjs`, which already reads the variable and records `seconds`.

## 3. Predecessor shard

- [ ] 3.1 In `scripts/release/full-regression-shards.mjs` add `predecessor`; in `scripts/release/validation-tier.mjs` move `vitest-update-predecessor` to a `predecessor` assignment that also owns `candidate-pack`, give both `package` and `predecessor` the preparation entry, narrow each shard plan's preparation consumers to the invocations it owns, and prepare the shard plan's consumers under `--full-shard`; update `test/repository-governance/full-regression-shards.test.ts`.
- [ ] 3.2 In `scripts/release/full-regression-evidence.mjs` merge both shards' preparation evidence (`exactPackagePreparation` stays the package shard's; add `exactPackagePreparations`); update `test/repository-governance/full-regression-policy.test.ts` for five expected shards. Leave `FULL_LANES` and the `All four exact-run lanes passed.` summary unchanged.
- [ ] 3.3 In `.github/workflows/full-regression-shared.yml` and `.github/workflows/publish.yml`, widen the Zig, release host cache and build, pack, and `Prepare the exact package` conditions to `matrix.shard == 'package' || matrix.shard == 'predecessor'`, keeping Defender and the startup summary on `package` only; update `test/repository-governance/full-regression-policy.test.ts`, `pr-full-regression.test.ts`, `release-pipeline-policy.test.ts`, `validation-receipt-workflows.test.ts` where they pin those conditions or the shard matrix, and the shard paragraph of `docs/validation.md`.

## 4. macOS x64 cross-compilation

- [ ] 4.1 Add `--target <triple>` to `scripts/development/build-terminal-host.mjs` and `scripts/development/build-process-guardian.mjs`: Cargo `--target`, `target/<triple>/release` input, `dist/native/darwin-x64` output, platform and architecture and notices triple derived from the target, identity check through Rosetta 2 or the Mach-O header with `identityCheck` recorded in the manifest; unit-test the triple mapping and both identity branches with fixtures; update `test/repository-governance/terminal-host-release-artifact.test.ts` if it pins manifest fields.
- [ ] 4.2 In `.github/workflows/publish.yml` remove `macos-15-intel` from `guardians` and `terminal_hosts`, add the `rustup target add x86_64-apple-darwin` step and the second `--target` build to the `macos-15` entries, and keep one `dist/native` upload per job; update `test/repository-governance/release-pipeline-policy.test.ts`, the 2026-10-14 decision note in `docs/architecture/resident-tabs.md`, and the runner sentence in `docs/architecture/toolchain.md`.

## 5. Pinned toolchain and bounded Zig cache

- [ ] 5.1 Add `rust-toolchain.toml` (`channel = "1.99.1"`, `profile = "minimal"`); change `scripts/development/prepare-ci-rust.sh` to install and default that pinned version; cache the `cargo-fuzz` binary in `.github/workflows/ci.yml` keyed by its version and the nightly date; update `test/repository-governance/environment-probe.test.ts` and `docs/architecture/toolchain.md`.
- [ ] 5.2 Add `cache-key` and `cache-size-limit: 512` to every `mlugg/setup-zig` step in `ci.yml`, `full-regression-shared.yml`, and `publish.yml`; measure the Zig share of one cold partition build with `use-cache: false` on one platform in this PR's run and set the final `use-cache` value from that measurement, recording it in `docs/architecture/toolchain.md`; assert the inputs in `test/repository-governance/release-pipeline-policy.test.ts`.

## 6. npm pin gating

- [ ] 6.1 Add `if: matrix.node == 22` to `Use the pinned npm for packing` in `ci.yml` (modular), `full-regression-shared.yml` (`windows-shard`; remove the step from the Node-24-only `full-regression` job), and `publish.yml` (`validate_sequential`, `validate_windows_shard`); assert the gate in `test/repository-governance/release-pipeline-policy.test.ts` and `impact-aware-validation-workflows.test.ts`.
