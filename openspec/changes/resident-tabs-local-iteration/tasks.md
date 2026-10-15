# Tasks

Workflow change for resident tabs iteration (see `design.md`). The branch is reconciled with `develop` after `resident-tabs-certification` (#750).

## 1. Baseline

- [x] 1.1 Record in `implementation-evidence.md` the CI scripts each preflight step mirrors, the chaos script's current random draws, and the Zig invocation and output paths in `native/terminal-host/build.rs` this change builds on.

## 2. Preflight

- [x] 2.1 Add `npm run preflight` per Decision 1 with the exact gate order, stop-at-first-failure, and changed-file naming from the local impact selection; a governance test proves each step invokes the script CI runs.
- [x] 2.2 Name preflight as the pre-push rule in `.agents/skills/change-delivery/SKILL.md` (within its word bound), `openspec/config.yaml`, and `docs/validation.md`.

## 3. Seeded, replayable chaos

- [x] 3.1 Replace the unseeded random source in `scripts/development/run-resident-chaos.mjs` with a seeded generator; print the seed at start and store it in the report; record each executed action with kind, resolved parameters, and timestamp; name the seed and report path in every violation.
- [x] 3.2 Add `--replay <report.json>` that re-executes the recorded schedule and reports divergence; `test/repository-governance/resident-chaos.test.ts` proves generator determinism, schedule round-trip, and replay issuing the recorded actions.

## 4. Prebuilt terminal library (gated)

- [x] 4.1 Add `TERMINAL_HOST_EXPORT_VT` to `build.rs` per Decision 3 and upload `terminal-vt-<platform>-<architecture>` from the terminal-host validation job; extend `test/repository-governance/release-pipeline-policy.test.ts` for the upload.
- [ ] 4.2 Spike gate: on Windows with endpoint protection active, link the fetched library through a minimal development override and run one `role_integration` test; record the result. If anything is quarantined, stop and refine scope to remove section 4's remaining tasks and the prebuilt-library requirement.
- [ ] 4.3 Complete the development override: manifest verification against the vendored `VERSION` and Cargo target, one-line mismatch failure with no fallback, ignored in CI and release builds; unit-test the manifest check.
- [ ] 4.4 Add `scripts/development/fetch-terminal-vt.mjs` (latest successful validation run of a named branch into `.artifacts/terminal-vt/`) and document the local `cargo test --test role_integration <name>` loop in `docs/architecture/resident-tabs.md`.

## 5. Specification

- [x] 5.1 Correct the full-regression exclusion requirement per Decision 4; confirm `test/repository-governance/validation-suite-policy.test.ts` already enforces both exclusions.

## 6. Validation

- [ ] 6.1 Run preflight, one seeded chaos run and its replay, and (if the spike passed) one native test locally from the prebuilt library; record commands, seeds, and results in `implementation-evidence.md`.
