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
- Two first-run failures, now fixed: `typecheck` failed without `dist/` (CI builds during `npm ci`), so preflight now builds first and records the receipt; `naming-changed` rejected a selection that included uncommitted paths, so preflight now selects committed changes only and reports uncommitted paths.
