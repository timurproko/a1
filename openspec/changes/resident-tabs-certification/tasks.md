# Tasks

Milestone 6 of 6 for resident tabs (see `docs/architecture/resident-tabs.md`). Implementation starts only after the user approves this plan and milestone 5 (`resident-tabs-tab-ux`) has merged.

## 1. Baseline

- [ ] 1.1 Reconcile with current `develop` after milestones 1–5 merge; list in `implementation-evidence.md` the exact paths those milestones chose for the server, registry, bridge, settings, fallback, and terminal-host CI groups, and correct any path in this plan that differs before writing code.
- [ ] 1.2 Resolve the `darwin-x64` open question in `design.md` with the user and record the decision in `docs/architecture/resident-tabs.md`.

## 2. Packaging and provenance

- [ ] 2.1 Add `scripts/development/build-terminal-host.mjs` (new file) per Decision 1: release `--locked` build, executable named from `src/product-identity.json`, `terminal-host.manifest.json` with schema `a1-terminal-host-artifact-v1`, protocol generation check through `--version`, and executable mode on Unix. Prove with a unit test of the manifest shape and a CI run on all three runners.
- [ ] 2.2 Add a `terminal-hosts` job to `.github/workflows/publish.yml` on `windows-2025`, `ubuntu-24.04`, and `macos-15` with Zig 0.15.2 and `prepare-ci-rust.sh`; make `package` merge `release-terminal-host-*` and refuse to pack when any platform artifact or manifest is missing. Extend `test/repository-governance/release-pipeline-policy.test.ts` to assert the job, the pinned action digests, and the pack invariant.
- [ ] 2.3 Update `config/terminal-host-provenance.json` and `scripts/governance/check-terminal-host-provenance.mjs` for change `resident-tabs-certification`, per-platform C toolchains, and the release manifest fields; update `docs/architecture/terminal-host-provenance.md` and the relevant `toolchain.md` entries.
- [ ] 2.4 Add `scripts/release/generate-terminal-host-notices.mjs` (new file) that emits `terminal-host-THIRD-PARTY-NOTICES.txt` from the locked dependency graph and vendored `libghostty-vt`, failing on a missing or non-allowlisted license; wire it into the `terminal-hosts` job and test it with a fixture crate graph.
- [ ] 2.5 Include the terminal host, its manifest, and its notices in the runtime payload inventory (`scripts/release/generate-runtime-payload-inventory.mjs`) and the immutable release payload; extend `test/foundation/release/package-surface.test.ts` to require them for every supported platform.
- [ ] 2.6 Add `src/foundation/process-containment/terminal-host-artifact.ts` (new file) per Decision 3 and call it from `ensureTerminalHost()` and every `a1 tabs` path before any spawn or exec; honor `A1_TERMINAL_HOST_PATH` only in development builds. Tests cover missing, tampered, wrong-platform, wrong-generation, and unsupported artifacts, each ending in the direct fallback with one notice.
- [ ] 2.7 Assert in an exact-package test that the shipped terminal host was built without the `failpoints` feature.

## 3. Release retention and version skew

- [ ] 3.1 Add the `resident` hold authority to `src/foundation/release/cohort-state.ts` and `parseWorkerHolds` in `release-gc.ts`; add `src/foundation/release/resident-release-holds.ts` (new file) that reads markers and registries read-only, verifies pid plus native start identity, and fails closed per Decision 4. Unit tests cover live, dead, reused-pid, unreadable, and quarantined registries.
- [ ] 3.2 Merge resident holds into `protectionInputs` on every reconciliation path, including the detached cleanup worker. Integration test on Windows, Linux, and macOS: a live holder and child recorded on an old release keep that release through `a1 update` and a forced cleanup run, and the release becomes collectible only after the tab stops.
- [ ] 3.3 Assert that cohort update coordination in `src/foundation/release/update.ts` and `src/foundation/supervision/server.ts` never signals or stops a process recorded in a resident registry; an update mid-turn on each platform keeps the turn streaming and every resident identity unchanged.
- [ ] 3.4 Implement generation-mismatch handling per Decision 5: one notice naming `a1 tabs host stop`, direct fallback with the session-writer lease, no signal to resident processes, and maintenance through the recorded cohort's verified binary in `maintain` mode. Test with a fixture server that answers a different generation.

## 4. Maintenance commands

- [ ] 4.1 Recognize `tabs` in `src/cli/dispatch.ts`, add it to `cliUsage` and complete help, and add focused `a1 tabs --help`; update the help and grammar tests in `test/` for the `a1-shell` delta.
- [ ] 4.2 Implement `a1 tabs` and `a1 tabs host status` in `src/cli/tabs.ts` (new file) with bounded probes that never start a server; tests assert no process is spawned when no server answers, on each platform.
- [ ] 4.3 Implement `a1 tabs stop <id>` and `a1 tabs stop --all` with graceful shutdown, bounded verified tree termination, and resumable sessions; tests cover a busy tab, an unknown id, and a tab whose holder is hung.
- [ ] 4.4 Implement `a1 tabs host stop` including the unresponsive-server path with a maintenance-only replacement, and the unverifiable-owner refusal; crash tests kill the command at each step and assert no orphan, duplicate, or killed unverified process.
- [ ] 4.5 Implement `a1 tabs doctor` per Decision 8 with the 25 MiB cap and an allowlisted archive; a canary test seeds secrets, tokens, environment values, journals, drafts, last screens, the private child-stderr sink (seeded directly, since no platform captures child stderr yet), and terminal content and fails if any appears in the bundle.
- [ ] 4.6 Add `--json` output with a versioned schema for every form, and argument-validation tests asserting one-line diagnostics and nonzero status before any I/O.

## 5. Bounds, counters, and idle exit

- [ ] 5.1 Add the Decision 7 counters to the server core and expose them, with identity, detachment mode, limits, and log paths, through the status method used by `a1 tabs host status`; simulation tests assert each counter increments on its event.
- [ ] 5.2 Audit every queue, buffer, file, and collection in the server, holder, attach client, and bridge for a declared hard cap; add a table to `docs/architecture/resident-tabs.md` and a test per cap that pushes past it and asserts bounded behavior.
- [ ] 5.3 Implement the ten-minute idle server exit in the sans-IO core with the prewarm exclusion; simulated-time tests cover a client connecting at 9:59, a standby-only server, and endpoint/marker removal only while still owned.

## 6. Verification program

- [ ] 6.1 Extend the simulator into the full server-core harness under `native/terminal-host/tests/simulation/` with the Decision 9 fault set and invariants, seed reporting, and minimized failing sequences; run a fixed corpus per change and a larger budget nightly.
- [ ] 6.2 Add the `failpoints` feature and a named failpoint at every persistence and IPC step; add one kill-at-point recovery test per failpoint, run on Windows, Linux, and macOS.
- [ ] 6.3 Add `cargo-fuzz` targets for the bridge decoder, registry and marker parsers, surface patch round trip, and VT-to-composition path; run each for a bounded time in CI on Linux and keep the corpora in-tree.
- [ ] 6.4 Add the `resident-chaos` group to `scripts/release/validation-matrix.mjs`, `config/validation-ownership.json`, and `config/validation-suites.json` on all three platforms, running against the exact packed candidate for at most 15 minutes; extend `test/repository-governance/validation-impact.test.ts` for its selection rules.
- [ ] 6.5 Record cold launch, warm tab creation (prewarmed and cold), reattach first paint and first input, tab restart, and server recovery per platform from the chaos and acceptance harnesses, reported against the default-on targets without gating.

## 7. Physical acceptance

- [ ] 7.1 Write `docs/manual-resident-tabs-acceptance.md` (new file) with the Decision 10 checklist, the record template, and the rule that physical automation never runs on an active workstation.
- [ ] 7.2 Run the checklist against the published candidate on Windows x64 and record `docs/architecture/evidence/resident-tabs/windows-x64.md`.
- [ ] 7.3 Run the checklist against the published candidate on macOS and record `docs/architecture/evidence/resident-tabs/macos.md`.
- [ ] 7.4 Run the checklist against the published candidate on Linux, including a `systemd` logout case, and record `docs/architecture/evidence/resident-tabs/linux.md`.

## 8. Documentation

- [ ] 8.1 Update `docs/architecture/resident-tabs.md`: status `implemented (opt-in preview)`, per-platform certification state, the bounds table, and the known gaps and follow-ups from Decision 12; keep historical spike evidence unchanged.
- [ ] 8.2 Update the `residentTabs` settings text to name the preview and the rollback command, and confirm its default stays `false` with a settings test.
- [ ] 8.3 Remove this change's requirements from `docs/architecture/resident-tabs-requirements.md`; once the file has no remaining requirements, delete it and remove every link to it.

## 9. Validation

- [ ] 9.1 Run the native suites, simulation corpus, failpoint tests, bounded fuzzing, chaos group, exact-package tests, strict OpenSpec validation, and documentation governance on every platform where they apply, and record commands, results, artifact hashes, measurements, and the per-platform physical verdicts in `implementation-evidence.md`.
