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
