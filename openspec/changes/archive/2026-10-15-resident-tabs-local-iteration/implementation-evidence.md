# Implementation evidence

## 1. Baseline

Recorded on the branch after merging `develop` at `491c2151` (#750 merged).

**Fast governance gates CI runs** (`.github/workflows/ci.yml`), all against `.artifacts/validation/impact.json` from `scripts/release/select-validation-impact.mjs`:

| Gate | Job | Command |
| --- | --- | --- |
| Install build and receipt | core modular job | `npm ci` (runs `prepare` = `npm run build`), then `node scripts/release/record-validation-prerequisite.mjs build` |
| Type check, architecture | core modular job, scopes `typecheck`, `architecture` | `npm run typecheck`, `npm run check:architecture` |
| Changed code documentation | Changed-file documentation validation | `node scripts/governance/check-code-documentation.mjs --mode changed --selection … --result …` |
| Release documentation | Documentation jobs | `node scripts/release/check-release-documentation.mjs --selection …` |
| Changed naming | Internal naming validation | `node scripts/governance/product-identifier-policy.mjs --check --selection … --result …` |
| Docs governance | Documentation governance validation | `node scripts/governance/check-docs-governance.mjs` |
| Strict OpenSpec | Documentation governance validation | `npx --yes @fission-ai/openspec@1.8.0 validate --all --strict --no-interactive` |
| Changed tests | core modular job, scopes `pr-core-tests`, `pr-selected-tests` | `node scripts/release/run-validation-tier.mjs` with `VALIDATION_TESTS_JSON` = `prCore.tests` |

Changed-file naming rejects a selection whose changes differ from the committed `merge-base..HEAD` diff (`runNamingValidation`), so a local selection must exclude uncommitted paths.

**Chaos random draws** (`scripts/development/run-resident-chaos.mjs`): one unseeded `random(limit)` over `crypto.randomBytes` drives the action kind (`random(6)`, drawn only while a tab is open), the stream mode (`random(2)`), the fake-tab stream bytes (`1 + random(64 KiB)`), the target tab (`random(open.length)`, twice), and the pause (`50 + random(500)` ms). The Windows endpoint name also uses `randomBytes`; it is not part of the schedule.

**Terminal library build** (`native/terminal-host/build.rs`): copies `vendor/libghostty-vt` into `env::temp_dir()/a1-libghostty-vt-<commit>-<target>` and runs `zig build -Demit-lib-vt -Doptimize=ReleaseFast -Dsimd=true -Dtarget=<triple> -Dcpu=<cpu> -Dversion-string=<VERSION> -Demit-xcframework=false`. It links `zig-out/lib/ghostty-vt-static` on Windows and the `libghostty-vt.a` archive elsewhere. Local Windows builds are refused unless `CI` is set or `TERMINAL_HOST_LOCAL_BUILD=1`. `docs/validation.md` attributes the antivirus quarantine to Zig's package fetch, which unpacks upstream test data. The prebuilt route never runs Zig.

## 2. Preflight

- `npx vitest run test/repository-governance/preflight.test.ts test/repository-governance/change-delivery-guidance.test.ts`: 15 passed. The preflight test compares every step with `ci.yml`, `config/validation-suites.json`, the core job resolution in `validation-matrix.mjs`, and `package.json` `prepare`.
- `npm run preflight` on the committed head: 11 committed changed paths, 11 steps, all passed in about eight minutes (build, build-receipt, typecheck, architecture, code-documentation-changed, release-documentation, naming-changed, docs-governance, openspec-strict, delivery-guidance, changed-tests).
- After the guidance commit (`config.yaml` and the skill widen the changed-test selection to 115 files), two consecutive preflight runs passed every gate but failed `changed-tests` on one test: `test/features/owned-ui/graceful-quit-process.test.ts` › chord quit exceeds its 10-second child timeout (10177 ms) under the full parallel run on the developer workstation, where the sibling slash-quit case already takes 7.5 s. Run alone it passed 3 of 3 in about 4 s. This is a pre-existing load-sensitive timeout unrelated to this change; it is left for CI, which runs the same selection on its own runner, and recorded as a gap.
- Two first-run failures, now fixed: `typecheck` failed without `dist/` (CI builds during `npm ci`), so preflight now builds first and records the receipt; `naming-changed` rejected a selection that included uncommitted paths, so preflight now selects committed changes only and reports uncommitted paths.

## 3. Seeded, replayable chaos

- `run-resident-chaos.mjs` draws every choice from one mulberry32 generator (`--seed`, default a fresh seed printed at start), writes schema `a1-resident-chaos-v2` with `seed` and the executed `schedule` (kind, resolved parameters, tab by creation ordinal, `atMs`, outcome), and labels every violation with the seed and report path. `--replay <report.json>` issues the recorded actions through `nextAction`, never drawing from the generator, and records unappliable actions under `divergence`.
- `npx vitest run test/repository-governance/resident-chaos.test.ts`: 7 passed, covering generator determinism for a seed, a seeded schedule covering all six action kinds and targeting only open tabs, schedule round-trip through a serialized report with malformed-report rejection, replay issuing exactly the recorded actions without a random draw, and seed and report labels on every violation.
- A live seeded run and its replay need a native host, which this workstation cannot build; they are recorded under section 6.

## 4. Prebuilt terminal library

- 4.1: with `TERMINAL_HOST_EXPORT_VT=<dir>`, `build.rs` copies `zig-out/lib`, the vendored headers, and `terminal-vt.manifest.json` (schema `a1-terminal-vt-v1`, vendored version, Ghostty commit, Cargo target, Zig target and CPU, SHA-256 per library file) after its unchanged Zig build. Native validation lanes set it and upload `terminal-vt-<platform>-<architecture>-attempt-<n>` for 14 days, a retention `config/github-repository-governance.json` already approves for `ci.yml` (preflight caught an unapproved 7-day value through `github-repository-governance.test.ts`). `npx vitest run test/repository-governance/release-pipeline-policy.test.ts`: 24 passed; the new case requires the export and upload on terminal-host lanes only, and that no workflow sets `TERMINAL_HOST_PREBUILT_VT` and the release workflow never sets the export. The Rust export path compiles only in CI (no local Zig build).
- 4.2 spike (2026-10-15, maintainer's Windows 11 workstation, ESET real-time protection active): `terminal-vt-win32-x64-attempt-1` from run 38726193361 matched its manifest hashes and the vendored `VERSION` `1.3.2-HEAD-+c5a21edfc`. Through a minimal uncommitted override, `cargo test --features resident-fixtures --test role_integration server_holder_and_attach_survive_client_loss_and_retain_output` compiled, linked, and ran the test binary and the host server processes it launched; ESET reported nothing. **Spike passed.** The test itself failed at `role_integration.rs:2452` (both concurrent server starts reported `already-running`) on both runs, unrelated to the library: every shell on this desktop runs inside a job (no kill-on-close, breakaway allowed), the WMI-launched server is in one too, and `verify_detached` rejects any job membership, so the launch is misreported. A single uncontended start reproduced it. CI runners have no such job. This is a host behavior defect, out of scope here (Non-Goals), and recorded for a separate change; `docs/architecture/resident-tabs.md` names the local limit.
- 4.3: `native/terminal-host/build_vt_manifest.rs`, shared by `build.rs` and the crate's unit tests like `build_target.rs`, renders the export manifest and verifies a prebuilt directory (schema, version, Ghostty commit, Cargo target, Zig target and CPU, each listed file's SHA-256 under `lib/` only, and the target's linked archive). `build.rs` reads `TERMINAL_HOST_PREBUILT_VT` only when `CI` is unset and `TERMINAL_HOST_LOCAL_BUILD=1` (otherwise it warns and ignores it), links the verified directory, and exits with one line on a mismatch without running Zig. `serde_json =1.0.145` joins the build dependencies; it is already a pinned dependency, and `cargo --locked` leaves `Cargo.lock` unchanged. With the prebuilt library linked locally: `cargo test --locked --lib build_vt_manifest`: 4 passed; a copy whose manifest names version `0.0.0-other` failed the build with `prebuilt terminal library … does not match this build: version is 0.0.0-other, expected 1.3.2-HEAD-+c5a21edfc` and Zig was not invoked. `cargo fmt --check` passes.
- 4.4: `node scripts/development/fetch-terminal-vt.mjs` fetched `terminal-vt-win32-x64-attempt-1` from run 38726193361 on this branch into `.artifacts/terminal-vt/` (download to `.partial`, then replace). It selects the branch's newest run carrying an unexpired artifact for the platform; the upload runs only after the native lane's tests pass, so that is the newest passing native validation, and the requirement now says so. `test/repository-governance/fetch-terminal-vt.test.ts`: 2 passed. The local loop is documented under Local native iteration in `docs/architecture/resident-tabs.md`, referenced from `docs/validation.md`; both new variables are registered in `docs/architecture/internal-naming.md`.
- `ci.yml` keeps `develop`'s mixed line endings; the change adds only its 11 lines (`git diff origin/develop --stat` equals the `--ignore-cr-at-eol` stat).

## 5. Specification

- The `continuous-integration` delta names `terminal-host` and `resident-chaos` as the only permitted exclusions. `npx vitest run test/repository-governance/validation-suite-policy.test.ts`: 3 passed; it already requires exactly `["terminal-host", "resident-chaos"]` with non-empty reasons. Strict OpenSpec validation: 35 passed.

## 6. Validation

**6.1 local validation (2026-10-15, maintainer's Windows workstation):**

- `npm run preflight` on `f7c5c8da`: all 11 gates passed. An earlier run failed `changed-tests` on `test/foundation/release/resident-release-retention.integration.test.ts`, which runs only when `native/terminal-host/target/debug` holds the host and `fake-tab` binaries; the spike build had left them there. Its unheld release was retained because the live server's release was unrecorded, a consequence of the desktop-job defect in section 4. The CI core job has no native binaries and skips the test. With the binaries moved aside, preflight passed.
- Native test from the prebuilt library: see the 4.2 spike. It linked and ran; the test failed only from the desktop-job defect.
- Seeded chaos and replay, built through the prebuilt library (`cargo build --release --locked --features resident-fixtures --bin terminal-host --bin fake-tab` with `TERMINAL_HOST_LOCAL_BUILD=1` and `TERMINAL_HOST_PREBUILT_VT`; `--build` is unavailable locally because the release packaging build records the Zig version):
  - `run-resident-chaos.mjs --host … --fake-tab … --seed 4242 --seconds 60 --result .artifacts/validation/chaos-local.json` printed `resident chaos seed 4242` and recorded 25 actions. It found 2 violations, each labeled with seed 4242 and the report path: "server was not replaced after it was killed" at steps 3 and 11. Holder diagnostics show `server-replacement-request-failed` and `server-replacement-connect-failed`. This is consistent with the desktop-job defect, since a holder's replacement launch passes the same detachment check, but not yet proven; the CI Windows chaos run on `9a7e697e` had none.
  - `--replay .artifacts/validation/chaos-local.json` printed `replaying 25 actions of seed 4242`, issued the same 25 actions in the same order with no divergence, and reproduced both violations at steps 3 and 11.
- No resident process survived any run.

**Dispatched CI run:**

- Dispatched Development validation [run 38726193361](https://github.com/timurproko/a1/actions/runs/38726193361) on `9a7e697e` (conservative selection). All three native terminal-host lanes passed and published `terminal-vt-win32-x64-attempt-1`, `terminal-vt-linux-x64-attempt-1`, and `terminal-vt-darwin-arm64-attempt-1`. The Linux and macOS chaos lanes passed.
- Windows chaos was cancelled by its 20-minute job timeout during post-job cleanup after every step succeeded. Its uploaded report is `a1-resident-chaos-v2` with seed `890278119`, a 246-action recorded schedule, and no violations. The terminal-host build cache missed because this change adds a build dependency, so Zig rebuilt for about five and a half minutes before the 600-second run. On #750 the lane took 16.5 to 17 minutes with a warm cache. Chaos lanes now share the native lanes' 45-minute timeout (task 6.2).
- The resource-sensitive partition failed one test, `prompt-history/concurrency.integration.test.ts` › serializes simultaneous first-open, writes and pruning, with `EBUSY` unlinking `history.sqlite3` during fixture removal after the body completed. Its removals now retry cleanup only, within the bound the `continuous-integration` specification permits (task 6.2).
