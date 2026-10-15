# Implementation evidence

## Baseline (task 1.1)

Reconciled with `origin/develop` at `ff11eab6` (milestone 5, #749) on 2026-10-14. Paths chosen by milestones 1–5:

| Area | Paths and symbols |
|---|---|
| Native crate | `native/terminal-host` (package `terminal-host`, lib `terminal_host_contracts`, binary `terminal-host`, test binary `fake-tab`); features `node-addon`, `resident-fixtures`, `fault-injection`; `build.rs` pins `libghostty-vt` and refuses local Windows builds without `CI`/`TERMINAL_HOST_LOCAL_BUILD=1`; `build_target.rs` maps the Cargo target to Zig. |
| Roles | `src/main.rs` `run_from_args` (`--version`, `server`, `holder`, `attach`, `probe`); detached start `resident_server_command()`; probe exit 3 = not running, 4 = incompatible generation. |
| Server | `src/roles/server.rs` (`run_server_child`, `RuntimeState`, `serve_bridge`, `serve_holder`, render lanes, prewarm `StandbyTab`/`launch_standby`/`promote_standby`/`discard_standby`, idle `RuntimeState::is_idle()`). |
| Holder / attach / strip | `src/roles/holder.rs`, `src/roles/attach.rs`, `src/roles/strip.rs`. |
| Registry and marker | `src/roles/registry.rs` (`TabRecord.release` = release root path, `RegistryStore`); owner marker `server.json` written in `src/main.rs`, no release field. |
| Sans-IO core and simulator | `src/core/{mod,server,holder}.rs`; simulator `src/core/sim/mod.rs` (`run`, `run_seeds`, `SimulationFailure`). |
| Protocol | `src/protocol.rs` (`GENERATION = 1`, `FrameDecoder`), `src/controller.rs` (boundary marker codec). |
| Identity | `src/identity.rs` (macOS writes `macos-proc-start:`; TS and the guardian use `darwin-proc-start:`). |
| Crash points and fuzz | `src/fault_injection.rs` (`crash_at`, `A1_TABS_FAULT_*`); `fuzz/` with target `decode_frame`. |
| Diagnostics and recovery | `src/roles/diagnostics.rs` (`terminal-host-<role>.log`, 5 MiB × 3; crash records); `src/roles/recovery_artifacts.rs` (stderr sink, last screen). |
| TS bootstrap and fallback | `src/foundation/resident-tabs/ensure-terminal-host.ts` (`ensureTerminalHost`, `resolveTerminalHostPath` expecting `a1-terminal-host`), `routing.ts` `selectResidentHost`, called from `src/foundation/release/bootstrap.ts`; notice `formatResidentFallbackNotice` in `bin/tab-launch-context.js`. |
| TS bridge and recovery | `src/foundation/resident-tabs/{bridge-client,protocol,recovery,prompt-journal,draft-checkpoint,session-sync,settings}.ts`; `src/features/resident-tab/`. |
| Session-writer lock | `src/foundation/session-writer-lock/index.ts` (addon `a1_session_lock.node` resolved from `process.cwd()`; not packaged). |
| Settings | `src/ui/settings/declarations.ts` v16: `tabsMax` (10, 1–50), `tabsAutoName` (on); `residentTabs` removed by migration v16 (`src/ui/settings/migrations.ts`). Direct path: `a1 solo`. |
| CI group | `scripts/release/validation-matrix.mjs` group `terminal-host` (Windows x64, Linux x64, macOS arm64); `config/validation-ownership.json` and `config/validation-suites.json` owner `terminal-host` (`npm run test:terminal-host`); `.github/workflows/ci.yml` pins `mlugg/setup-zig@d1434d08867e3ee9daa34448df10607b98908d29` (Zig 0.15.2). |
| Release pipeline | `.github/workflows/publish.yml` jobs `guardians` and `package`; `scripts/development/build-process-guardian.mjs`; `src/foundation/process-containment/artifact.ts`; `scripts/release/repair-native-executable-modes.mjs`; `scripts/governance/candidate-evidence.mjs` `guardianBinaryReference()`; `test/foundation/release/package-surface.test.ts`. |
| Retention | `src/foundation/release/cohort-state.ts` (`ExternalReleaseHoldAuthority`, `planProtectedReleases`), `release-gc.ts` (`protectionInputs`, `parseWorkerHolds`, cleanup worker `bin/release-cleanup.js`); inspectors under `src/foundation/process-containment/`. |
| CLI | `src/cli/dispatch.ts` (`cliUsage`, `cliHelp`, `parseCliCommand`, unknown words are a silent no-op); tests `test/cli/dispatch.test.ts`. |
| Provenance | `config/terminal-host-provenance.json` (change `resident-tabs-contracts`), `scripts/governance/check-terminal-host-provenance.mjs`, `docs/architecture/terminal-host-provenance.md`, `docs/architecture/toolchain.md`. |

Plan corrections made before code: `residentTabs` wording replaced by the milestone-5 bare-`a1` route and `a1 solo`; `failpoints` became the existing `fault-injection` feature; the simulator path became `src/core/sim/`; the patch-codec fuzz target was dropped because surfaces are opaque full snapshots; added the binary-name, macOS identity-prefix, release-root mapping, session-lock packaging, executable-mode repair, and development-override fixes; `darwin-x64` added as a fourth platform.

## Validation (task 9.1)

Head `54a091ea` on 2026-10-14, Development validation run [38601085798](https://github.com/timurproko/a1/actions/runs/38601085798) dispatched on `feature/resident-tabs-certification`: every job succeeded. Platform lanes: `windows-2025`, `ubuntu-24.04`, `macos-15`. Intel macOS has build and identity evidence only (publication `terminal_hosts` and `guardians` jobs on `macos-15-intel`); its pull-request behavior suite is a known gap below.

| Lane and command | Windows x64 | Linux x64 | macOS arm64 |
|---|---|---|---|
| `npm run test:terminal-host` (terminal-host lane): crate unit tests | 85 passed, 1 ignored (manual million-seed target) | 87 passed, 1 ignored | 86 passed, 1 ignored |
| Same lane: `tests/role_integration.rs` with `resident-fixtures,fault-injection` | 17 passed (592 s) | 17 passed (545 s) | 17 passed (588 s) |
| Same lane: TypeScript probe suites (`vitest`, 8 files incl. real-process release retention and mid-turn update) | 8 files passed | 8 files passed | 8 files passed |
| Same lane: `verify-terminal-fidelity.mjs` | passed | passed | passed |
| Same lane: bounded fuzzing (`cargo fuzz run` ×4 targets, 30 s each, nightly-2026-10-01) | n/a | 4 targets ran clean | n/a |
| `npm run test:resident-chaos` (resident-chaos lane, 600 s on the release-built host) | 0 violations | 0 violations | 0 violations |
| Exact-package contracts (`package-surface` incl. `--version` features `faultInjection=false`, `residentFixtures=false`) | 6 passed (Windows lane) | — | — |

Simulation corpus: `core::sim::tests::ten_thousand_schedules_preserve_invariants` and `every_fault_kind_occurs_in_the_corpus` pass on every lane; the million-schedule target stays ignored for manual nightly evidence. Crash points: `every_named_crash_point_recovers_to_a_clean_start_with_a_working_tab` and `server_crash_points_recover_without_empty_or_split_registry_state` pass on every lane. Strict OpenSpec validation (`npx openspec validate resident-tabs-certification --strict`) and the changed-file documentation, internal naming, and rendering governance jobs pass on the same run.

### Tested binaries (run 38601085798 artifacts `terminal-host-<platform>-attempt-1`, test builds)

| Platform | `terminal-host` SHA-256 | `a1_session_lock.node` SHA-256 |
|---|---|---|
| win32-x64 | `a8806f50d6783fe7db8d581d8d5035241529adb50d77b8dd8a4ea8796dd2102a` | `6d451a4c61be80935686619e7e80857ce75edc18f0f44bd897a6d3f1fd5ad34e` |
| linux-x64 | `74c2b74594d7227d6557f040bbdf2fcaba321be26deb99e284e20ee6c7163ca9` | `848d11ce092ee5519b88a632b7fe767c761b341dc3151a2678a746ce984c578d` |
| darwin-arm64 | `1024b6956b9d95bd07c2ef053e6c5f5ec01fdd48b0280e05992ae79ba691fc59` | `f130867a94338011254c011af1eff91a635667965b3aecfe135abda770776daa` |

The hashes above identify the exact test builds the suites ran; release-artifact hashes are produced by the publication `terminal_hosts` job in each `terminal-host.manifest.json` and are recorded per platform in `docs/architecture/evidence/resident-tabs/` when the first candidate carrying the host is published.

### Chaos counts and measurements (task 6.5; reported, not gating)

| Platform | Actions (create / stop / kill-holder / kill-child / kill-server) | cold tab create p95 | server recovery p95 | holder restart p50 / p95 | child restart p50 / p95 | tab stop p95 |
|---|---|---|---|---|---|---|
| win32-x64 | 46 / 46 / 23 / 26 / 21 | 274 ms | 405 ms | 1.10 s / 30.1 s | 1.17 s / 30.1 s | 5.3 s |
| linux-x64 | 61 / 61 / 44 / 39 / 18 | 262 ms | 31 ms | 1.02 s / 30.0 s | 1.04 s / 30.0 s | 5.1 s |
| darwin-arm64 | 44 / 42 / 29 / 18 / 22 | 494 ms | 71 ms | 1.15 s / 34.0 s | 1.22 s / 56.5 s | 5.3 s |

Server recovery meets the soak target (< 2 s) on every platform. Restart p95 values reflect the chaos schedule itself: it kills the same tab repeatedly inside one restart window, so the third restart waits the policy's 30-second backoff step; the p50 is the undisturbed restart (about 1 s, within the 3 s target). Tab stop p95 is the five-second graceful grace a streaming child ignores before termination.

### Resident latency (`measure-resident-tabs.mjs`, p95 against the milestone-5 budgets; all passed)

| Platform | cold launch (budget 3300) | warm create (250) | reattach first paint (300) | reattach first input (400) | input→process (16) | output→present (33) |
|---|---|---|---|---|---|---|
| win32-x64 | 1045 ms | 58 ms | 77 ms | 79 ms | 3.7 ms | 14.5 ms |
| linux-x64 | 67 ms | 9 ms | 3 ms | 3 ms | 0.5 ms | 0.8 ms |
| darwin-arm64 | 247 ms | 50 ms | 34 ms | 35 ms | 7.3 ms | 3.9 ms |

### Acceptance state and gaps

Every platform record in `docs/architecture/evidence/resident-tabs/` is `CI-verified`; no physical item has run on a published candidate, and the per-platform 24-hour soak remains a separate authorization. Intel macOS has no automated behavior suite because modular validation outcomes are keyed by platform without architecture. The remaining gaps are listed under "Release state and known gaps" in `docs/architecture/resident-tabs.md`.

### Final head (task 4.4 and task 9.1 closure)

Head `81cc411d` on 2026-10-14, Development validation run [38620254089](https://github.com/timurproko/a1/actions/runs/38620254089): every job succeeded. Changes after the record above: `a1 tabs host stop` reports only once no owner and no tab process remain; a holder that must be forced has its recorded child terminated by its own verified identity; a tab stopped during its restart backoff is never relaunched; the host-stop command carries named crash points (`host-stop-after-terminate`, `host-stop-after-replacement`, `host-stop-after-answer`) and `host_stop_killed_at_each_step_leaves_no_orphan_or_duplicate_host` kills it at each one, then recovers with a stop that leaves no orphan and no duplicate host; the latency harness proves a reattach paint by the retained last line.

| Lane | Windows x64 | Linux x64 | macOS arm64 |
|---|---|---|---|
| Crate unit tests | 85 passed, 1 ignored | 87 passed, 1 ignored | 86 passed, 1 ignored |
| `tests/role_integration.rs` (18 tests, incl. the host-stop crash test) | 18 passed (703 s) | 18 passed (628 s) | 18 passed (664 s) |
| TypeScript probe suites, fidelity, latency budgets | 8 files passed; all budgets passed | 8 files passed; all budgets passed | 8 files passed; all budgets passed |
| `npm run test:resident-chaos` (600 s) | 0 violations | 0 violations | 0 violations |
| Exact-package contracts | 6 passed | — | — |

Chaos measurements on this run (reported, not gating): server recovery p95 473 ms (Windows), 106 ms (Linux), 2442 ms (macOS: one of 18 recoveries on a loaded runner exceeded the 2 s soak target; the earlier run measured 71 ms); undisturbed holder restart p50 1.0–1.2 s on every platform; cold tab create p95 269 / 293 / 459 ms. The soak target itself is judged by the separately authorized 24-hour soak, not by a 600-second chaos run.
