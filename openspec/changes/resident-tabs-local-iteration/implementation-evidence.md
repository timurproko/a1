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
- `ci.yml` keeps `develop`'s mixed line endings; the change adds only its 11 lines (`git diff origin/develop --stat` equals the `--ignore-cr-at-eol` stat).

## 5. Specification

- The `continuous-integration` delta names `terminal-host` and `resident-chaos` as the only permitted exclusions. `npx vitest run test/repository-governance/validation-suite-policy.test.ts`: 3 passed; it already requires exactly `["terminal-host", "resident-chaos"]` with non-empty reasons. Strict OpenSpec validation: 35 passed.
