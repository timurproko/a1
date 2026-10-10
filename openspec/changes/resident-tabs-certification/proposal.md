# Proposal

## Why

Milestones 1–5 build resident tabs behind `residentTabs: false`, but nothing yet ships the native terminal host in a release, keeps the releases that live tabs run from, gives users a non-interactive way to inspect or stop resident processes, or proves the whole slice on each platform. Without those, the preview cannot be offered even as an opt-in: an update could collect a release under a running tab, a user could not stop a host without a terminal attached, and no evidence would show that the packaged artifact behaves like the tested one. The design is in `docs/architecture/resident-tabs.md` (Decisions 10 and 12–16, Roadmap row 6).

This is milestone 6 of 6. It depends on `resident-tabs-contracts` (#586), `resident-tabs-persistent-tab`, `resident-tabs-failure-isolation`, `resident-tabs-crash-recovery`, and `resident-tabs-tab-ux`, all merged to `develop` first. After it merges the preview is usable as an opt-in on Windows x64, macOS, and Linux; `residentTabs` stays `false` by default everywhere.

## What Changes

- Build the terminal host in release mode on the process-guardian release matrix (Windows x64, Linux x64, macOS), with pinned Zig 0.15.2 and Rust toolchains, an artifact manifest with SHA-256 and size, source provenance, licenses, and generated third-party notices; place it in every immutable release and verify it before any execution.
- Retain every release recorded by a live, identity-verified resident server, holder, or tab child through a new `resident` release-hold authority; keep the cohort on its release until its tabs stop; handle a protocol-generation mismatch with an explicit stop instruction and the direct fallback, never an automatic handoff.
- Add the maintenance command family: `a1 tabs`, `a1 tabs stop <id>|--all`, `a1 tabs host status|stop`, and `a1 tabs doctor` (redacted, bounded bundle). None starts a server just to report state.
- Report host identity, detachment mode, bounds, and health counters (restarts, stalls, resyncs, degraded states) in `a1 tabs host status`; exit an idle server after ten minutes with no user tabs and no clients.
- Complete the verification program: deterministic simulation and property tests of the whole server core, named failpoints at every persistence and IPC step, fuzzing of every decoder and the surface patch path, and bounded chaos suites on each platform in CI.
- Define and record exact-package physical acceptance per platform (manual or isolated worker, never an active workstation), plus separate performance measurements for cold launch, warm tab creation, reattach, and recovery.
- Document known gaps and follow-ups, mark the architecture `implemented (opt-in preview)`, and retire `docs/architecture/resident-tabs-requirements.md`.

## Capabilities

### New Capabilities

- `resident-terminal-host`: adds cohort retention, maintenance commands, host status, idle exit, and packaged opt-in certification (the capability exists once milestone 1 merges; these are new requirements).
- `resident-tab-reliability`: adds the enablement-stage evidence requirement (an earlier milestone creates the capability; this is a new requirement).

### Modified Capabilities

- `agent-supervision`: cohort updates and release retention must preserve resident processes and their releases.
- `a1-shell`: complete help and the recognized command grammar gain the `tabs` maintenance command.

## Impact

- Native: `native/terminal-host` release profile, failpoint feature (test builds only), fuzz targets, chaos fixtures.
- Release and CI: `.github/workflows/publish.yml`, `.github/workflows/ci.yml`, `scripts/release/validation-matrix.mjs`, `config/validation-ownership.json`, `config/validation-suites.json`, new `scripts/development/build-terminal-host.mjs`, new notices generator, `config/terminal-host-provenance.json`, `scripts/governance/check-terminal-host-provenance.mjs`.
- TypeScript: `src/foundation/release/cohort-state.ts`, `src/foundation/release/release-gc.ts`, `src/cli/dispatch.ts`, new `src/cli/tabs.ts`, new terminal-host artifact verification beside `src/foundation/process-containment/artifact.ts`.
- Documentation: new `docs/manual-resident-tabs-acceptance.md`, per-platform evidence under `docs/architecture/evidence/resident-tabs/`, `docs/architecture/terminal-host-provenance.md`, `docs/architecture/resident-tabs.md`; `docs/architecture/resident-tabs-requirements.md` is deleted.
- Users: with `residentTabs: false` nothing changes except the new `a1 tabs` command in help. With it on, releases used by live tabs are kept, and tabs survive `a1 update`.
