# Proposal

## Why

Milestones 1–5 made resident tabs the bare-`a1` route, with `a1 solo` as the direct single-agent path, but no release ships the native terminal host, so every installed launch falls back to single-agent mode. Nothing yet keeps the releases that live tabs run from, gives users a non-interactive way to inspect or stop resident processes, or proves the packaged slice on each platform. Without those, packaging the host would let an update collect a release under a running tab, leave users unable to stop a host without a terminal attached, and give no evidence that the packaged artifact behaves like the tested one. The design is in `docs/architecture/resident-tabs.md` (Decisions 10 and 12–16, Roadmap row 6).

This is milestone 6 of 6. It depends on `resident-tabs-contracts` (#586), `resident-tabs-persistent-tab` (#746), `resident-tabs-failure-isolation` (#747), `resident-tabs-crash-recovery` (#748), and `resident-tabs-tab-ux` (#749), all merged to `develop`. After it merges, every release carries a verified terminal host for Windows x64, Linux x64, macOS arm64, and macOS x64, and bare `a1` runs resident tabs on each of them. Certification is evidence per platform, not a runtime gate (user decision, 2026-10-14): a platform without its physical record is documented as unverified, and `a1 solo` remains the direct path.

## What Changes

- Build the terminal host in release mode on the process-guardian release matrix, extended with an Intel macOS runner (`windows-2025`, `ubuntu-24.04`, `macos-15`, `macos-15-intel`), with pinned Zig 0.15.2 and Rust toolchains, an artifact manifest with SHA-256 and size, source provenance, licenses, and generated third-party notices; place it in every immutable release, resolve it by its product-identity name, and verify it before any execution.
- Retain every release recorded by a live, identity-verified resident server, holder, or tab child through a new `resident` release-hold authority; keep the cohort on its release until its tabs stop; handle a protocol-generation mismatch with an explicit stop instruction and the direct fallback, never an automatic handoff.
- Add the maintenance command family: `a1 tabs`, `a1 tabs stop <id>|--all`, `a1 tabs host status|stop`, and `a1 tabs doctor` (redacted, bounded bundle). None starts a server just to report state.
- Report host identity, detachment mode, bounds, and health counters (restarts, stalls, resyncs, degraded states) in `a1 tabs host status`; exit an idle server after ten minutes with no user tabs and no clients, without the prewarmed standby keeping it alive.
- Complete the verification program: deterministic simulation and property tests of the whole server core, named fault-injection points at every persistence and IPC step, fuzzing of every decoder and persisted-state parser, and bounded chaos suites in CI against the exact packed candidate.
- Define and record exact-package physical acceptance per platform (manual or isolated worker, never an active workstation), plus separate performance measurements for cold launch, warm tab creation, reattach, and recovery.
- Document known gaps and follow-ups, mark the architecture `implemented`, and retire `docs/architecture/resident-tabs-requirements.md`.

## Capabilities

### New Capabilities

- `resident-terminal-host`: adds cohort retention, maintenance commands, host status, idle exit, and packaged per-platform certification (the capability exists since milestone 1; these are new requirements).
- `resident-tab-reliability`: adds the release-stage evidence requirement (an earlier milestone creates the capability; this is a new requirement).

### Modified Capabilities

- `agent-supervision`: cohort updates and release retention must preserve resident processes and their releases.
- `a1-shell`: complete help and the recognized command grammar gain the `tabs` maintenance command.

## Impact

- Native: `native/terminal-host` release build, Intel macOS target mapping, the existing `fault-injection` feature extended to every persistence and IPC step (test builds only), fuzz targets, chaos fixtures, and macOS start-identity normalization.
- Release and CI: `.github/workflows/publish.yml`, `.github/workflows/ci.yml`, `scripts/release/validation-matrix.mjs`, `config/validation-ownership.json`, `config/validation-suites.json`, new `scripts/development/build-terminal-host.mjs`, new notices generator, executable-mode repair and candidate evidence for the new manifest, `config/terminal-host-provenance.json`, `scripts/governance/check-terminal-host-provenance.mjs`.
- TypeScript: `src/foundation/release/cohort-state.ts`, `src/foundation/release/release-gc.ts`, `src/foundation/resident-tabs/ensure-terminal-host.ts`, `src/foundation/session-writer-lock/index.ts`, `src/cli/dispatch.ts`, new `src/cli/tabs.ts`, new terminal-host artifact verification beside `src/foundation/process-containment/artifact.ts`.
- Documentation: new `docs/manual-resident-tabs-acceptance.md`, per-platform evidence under `docs/architecture/evidence/resident-tabs/`, `docs/architecture/terminal-host-provenance.md`, `docs/architecture/toolchain.md`, `docs/architecture/resident-tabs.md`; `docs/architecture/resident-tabs-requirements.md` is deleted.
- Users: installed releases start running resident tabs instead of the single-agent fallback; releases used by live tabs are kept, tabs survive `a1 update`, `a1 tabs` appears in help, and `a1 solo` stays the direct path.
