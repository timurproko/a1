# Tasks

Each numbered section is one Implementation item of the pull request and one commit, landed in the order 1, 2, 3, 6, 7, 4, 5, 8, 9. Read `design.md` "Current mechanics" and "Invariants" before editing; every task names the files it may touch, and a file not named is out of scope for that task. Run `npm run typecheck` and the listed tests before each push.

## 1. Process-guardian addon

- [x] 1.1 In `native/process-guardian/Cargo.toml` switch the crate to a `cdylib` named `process_guardian` with `napi 2.16.17` (`napi9`) and `napi-derive 2.16.13`; delete `src/main.rs` and add `src/lib.rs` exporting `version`, `inspectProcessStart`, `captureTerminalModes`, `restoreTerminalModes`, `deliverExitNotice`, `spawnContained`, `spawnWatcher`, `waitForProcessExit`, `stopProcessGroup`, and `ignoreConsoleControl` as design Decision 1 specifies; keep `windows.rs`, `linux.rs`, `darwin.rs`, and `exit_notice.rs` with the job-list spawn replacing the suspended create and `posix_spawn` replacing `pre_exec`; keep and adapt the existing Rust unit tests and add the in-crate tree containment test.
- [x] 1.2 In `scripts/development/build-process-guardian.mjs` and `scripts/development/native-target.mjs` build and copy the cdylib as `process-guardian.node`, observe identity by loading it with Node (Mach-O header for the cross build), and write manifest schema `a1-process-guardian-artifact-v2`; update `test/repository-governance/native-target.test.ts` and `build-script-stdout-policy.test.ts`.

## 2. In-process launch-instance containment

- [x] 2.1 Add `src/foundation/process-containment/addon.ts` (typed loader) and `addon-containment.ts` (`AddonContainment`), replace `windows-process-inspector.ts` and `darwin-process-inspector.ts` with `addon-process-inspector.ts`, update `artifact.ts` to the v2 manifest, `native-process-inspector.ts`, and `index.ts`; delete `native-guardian-containment.ts`; update `src/product-identity.json` and `src/product-identity.ts` artifact keys and the governance checks that enumerate them.
- [ ] 2.2 In `src/foundation/launch-guardian/main.ts` capture terminal modes, start the watcher, spawn through `AddonContainment`, and deliver the notice after the outcome; update `test/foundation/process-containment/{artifact,addon-process-inspector,native-process-inspector,source-boundary}.test.ts` and `test/foundation/launch-guardian/{launch-guardian,source-boundary,concurrency.integration}.test.ts`.

## 3. Node-hosted exit watcher

- [ ] 3.1 Add `src/foundation/launch-guardian/exit-watcher.ts` with the argument grammar, wait, Unix group cleanup, and notice delivery from design Decision 3, list it in `scripts/release/generate-runtime-payload-inventory.mjs`, and start it from `main.ts` (Windows `spawnWatcher`, Unix `child_process.spawn`).
- [ ] 3.2 Rewrite `test/foundation/process-containment/windows-job.integration.test.ts` and `unix-process-group.integration.test.ts` around `test/fixtures/process-containment/owner.mjs`, keeping every existing scenario and assertion; update `test/fixtures/process-containment/darwin-pty.py`.

## 4. Terminal-host roles in the addon

- [ ] 4.1 Move `run_from_args` and the role commands from `native/terminal-host/src/main.rs` into `src/roles/entry.rs`, delete `src/main.rs`, export `runRole` and `version` from `src/node_addon.rs`, replace process exits with returned codes, and record the host command in `src/launch.rs` so the detached spawn and `spawn_via_wmi` run `<node> <entry> --resident-role-child ...`; add the `role-host` fixture binary under `tests/fixtures/role-host/` gated by `resident-fixtures`; update `native/terminal-host/tests/role_integration.rs`, the fixture roles, `README.md`, and `scripts/development/run-terminal-host-probe.mjs`.
- [ ] 4.2 Add `src/foundation/resident-tabs/host-entry.ts` that loads the addon beside itself or from `A1_TERMINAL_HOST_PATH` under the development instance id and runs `runRole` with `process.execPath` and its own path.

## 5. Resident-tab code uses the addon

- [ ] 5.1 Update `src/foundation/resident-tabs/{ensure-terminal-host,terminal-host-artifact,bounded-host-command,maintenance}.ts` to resolve `terminal-host.node`, verify the v2 manifest with the entry digest, and run every role as `process.execPath [host-entry.js, ...]`; update `selectResidentHost` in `src/foundation/release/bootstrap.ts` to pass the attach root command; update `src/foundation/session-writer-lock/index.ts` to load `terminal-host.node` with the `A1_TERMINAL_HOST_PATH` development override; update `test/foundation/resident-tabs/*` and `test/foundation/session-writer-lock/*`.

## 6. Addon release surface

- [ ] 6.1 In `scripts/development/build-terminal-host.mjs` build only the addon, load it for identity, and write manifest schema `a1-terminal-host-artifact-v2` with `artifact`, `entry`, and `notices`; in `scripts/release/verify-native-artifacts.mjs`, `generate-runtime-payload-inventory.mjs`, `prepare-validation-package.mjs`, and `scripts/governance/candidate-evidence.mjs` describe addon artifacts without executable modes; delete `scripts/release/repair-native-executable-modes.mjs` and `test/repository-governance/repair-native-executable-modes.test.ts`; update `test/foundation/release/package-surface.test.ts` and `test/repository-governance/{package-surface,terminal-host-release-artifact,verify-native-artifacts}.test.ts`.

## 7. Validation and publication

- [ ] 7.1 In `scripts/release/validation-matrix.mjs` replace `binary` with `addon` and `terminalHostBinary` with `terminalHostAddon`; in `.github/workflows/ci.yml` build the debug guardian addon and export `A1_PROCESS_GUARDIAN_PATH` to it, point the terminal-host certify step at `.artifacts/terminal-host/terminal-host.node`, stop Windows holders by command line instead of `taskkill //IM`, and upload the addon in place of the executable and session lock; in `.github/workflows/publish.yml` compile TypeScript in the `terminal_hosts` job before `npm run build:terminal-host`; leave `full-regression-shared.yml` unchanged; update `test/repository-governance/{release-pipeline-policy,impact-aware-validation-workflows,validation-job-selection,validation-impact}.test.ts` and `scripts/release/generate-validation-selection-replay.mjs` as design Decision 7 specifies.
- [ ] 7.2 In `scripts/development/{verify-terminal-fidelity,measure-resident-tabs,run-resident-chaos,certify-ci-terminal-host,run-terminal-host,test-session-lock-addon}.mjs` take the addon as `--host`, start every role as `process.execPath dist/foundation/resident-tabs/host-entry.js` with `A1_TERMINAL_HOST_PATH` set to it, build `fake-tab` beside the release addon, download the lane artifact by the addon name, stop leftover holders by command line, and load `terminal-host.node`.

## 8. Release self-repair

- [ ] 8.1 In `src/foundation/release/release-store.ts` add `assertCertifiedFilesPresent` and `repairMaterializedRelease` as design Decision 8 specifies and call repair from `materializeRelease` when the existing release fails verification; in `src/foundation/release/bootstrap.ts` check file presence before the certified fast path and repair before `readMaterializedRelease`; update `test/foundation/release/{release-store,bootstrap}.test.ts`.

## 9. Documentation

- [ ] 9.1 Update `docs/architecture/{process-guardian-provenance,terminal-host-provenance,resident-tabs,toolchain,boundaries}.md` and `docs/validation.md` for the addon-hosted native layer, the watcher gap, and the measured holder cost.
