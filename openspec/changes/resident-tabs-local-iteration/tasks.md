# Tasks

Workflow change for resident tabs iteration (see `design.md`). Implementation starts after `resident-tabs-certification` (#750) merges or this branch rebases onto it.

## 1. Baseline

- [ ] 1.1 Reconcile with current `develop` after #750; record in `implementation-evidence.md` the exact Zig invocation, artifact names, and validation owners this change builds on.

## 2. Local native tests from a prebuilt terminal library

- [ ] 2.1 Extend `native/terminal-host/build.rs` per Decision 1: honor `TERMINAL_HOST_PREBUILT_VT` only in non-release builds, verify `terminal-vt.manifest.json` against the vendored `VERSION` and the Cargo target, link the prebuilt library, and fail with one line on a mismatch; unit-test the manifest check.
- [ ] 2.2 Upload `terminal-vt-<platform>-<architecture>` (library, headers, manifest) from the terminal-host validation and `terminal_hosts` jobs; extend `test/repository-governance/release-pipeline-policy.test.ts` for the upload.
- [ ] 2.3 Add `scripts/development/fetch-terminal-vt.mjs` that downloads the artifact for the current platform from the latest green run of a branch into `.artifacts/terminal-vt/`, and document `cargo test --test role_integration <name>` with it in `docs/architecture/resident-tabs.md`.

## 3. Preflight

- [ ] 3.1 Add `npm run preflight` per Decision 2 with the exact gate order and stop-at-first-failure; a governance test proves it runs the same scripts CI runs.
- [ ] 3.2 Name preflight as the pre-push rule in `.agents/skills/change-delivery/SKILL.md` (within its word bound), `openspec/config.yaml`, and `docs/validation.md`.

## 4. Seeded, replayable chaos

- [ ] 4.1 Replace the unseeded random source in `scripts/development/run-resident-chaos.mjs` with a seeded generator; print the seed at start and in the report; record every action with parameters and timestamp.
- [ ] 4.2 Add `--replay <seed>`; `test/repository-governance/resident-chaos.test.ts` proves the same seed yields the same action sequence and that a violation names its seed.

## 5. Lane-scoped dispatch

- [ ] 5.1 Add the `lanes` input to `.github/workflows/ci.yml` and honor `native` in `scripts/release/validation-matrix.mjs`; record the selection in the impact artifact; a lane-scoped dispatch emits no protected aggregate; extend the validation selection tests.

## 6. Validation

- [ ] 6.1 Run preflight, the native suites locally from the prebuilt library on Windows, one seeded chaos replay, and one `lanes=native` dispatch; record commands, seeds, and results in `implementation-evidence.md`.
