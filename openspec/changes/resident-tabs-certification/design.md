# Design

The product design, decisions, and roadmap live in [`docs/architecture/resident-tabs.md`](../../../docs/architecture/resident-tabs.md). This document covers only what milestone 6 builds and how it is proven. It implements Decisions 10 and 12–16 and Roadmap row 6.

## Context

After milestones 1–5, `develop` contains the three native roles, the tab bridge, failure isolation, crash recovery, and the full tab UX. Milestone 5 removed the `residentTabs` setting (settings migration v16): bare `a1` always takes the resident route, and `a1 solo` is the direct single-agent path. The terminal host is still built only by CI validation jobs as a debug executable (`native/terminal-host/build.rs` refuses local Windows builds), and no release contains it, so every installed bare `a1` falls back to single-agent mode with the notice `A1 normal mode unavailable (<reason>); running in single agent mode.`

The existing pieces this milestone extends (exact paths are listed in `implementation-evidence.md`):

- `native/process-guardian` is built per platform by the `guardians` job in `.github/workflows/publish.yml` (`windows-2025`, `ubuntu-24.04`, `macos-15`) through `scripts/development/build-process-guardian.mjs`, which writes `dist/native/<platform>-<arch>/process-guardian[.exe]` plus a `manifest.json` (schema `a1-process-guardian-artifact-v1`, protocol, crate version, SHA-256, size, provenance). The `package` job merges all platform artifacts before packing once, and refuses to pack without every guardian. `src/foundation/process-containment/artifact.ts` verifies the manifest and hash before use. `scripts/release/repair-native-executable-modes.mjs` and `guardianBinaryReference()` in `scripts/governance/candidate-evidence.mjs` know only that guardian manifest.
- #588 made `terminal-host` an impact-selected CI owner (`scripts/release/validation-matrix.mjs`, group `terminal-host`) with pinned Zig 0.15.2 on Windows x64, Linux x64, and macOS arm64. `native/terminal-host/build_target.rs` maps only those three Cargo targets. `config/terminal-host-provenance.json` and `scripts/governance/check-terminal-host-provenance.mjs` pin `libghostty-vt`, `portable-pty`, `crossterm`, and seven other direct sources, but the record names change `resident-tabs-contracts` and only a Windows C toolchain.
- `src/foundation/resident-tabs/ensure-terminal-host.ts` resolves `dist/native/<platform>-<arch>/a1-terminal-host[.exe]`, which does not match the Cargo binary name `terminal-host`; honors `A1_TERMINAL_HOST_PATH` unconditionally; and checks only that the file is executable.
- The Node-API session-writer lock (`a1_session_lock.node`, the crate's `node-addon` feature) is not packaged. `src/foundation/session-writer-lock/index.ts` resolves it relative to `process.cwd()` and otherwise uses a portable backend documented as a development fallback.
- The native host records macOS start identities as `macos-proc-start:<sec>:<usec>`, while the TypeScript `DarwinNativeProcessInspector` and the process guardian use `darwin-proc-start:`. Linux and Windows prefixes match.
- Release retention (`src/foundation/release/cohort-state.ts`, `release-gc.ts`) protects the active, rollback, pending-transaction, and live-cohort releases plus explicit external holds with authority `agent` or `migration`. The resident registry's `TabRecord.release` records the release root path, not a release id, and the `server.json` owner marker records no release.
- The idle exit already exists in the server shell (`RuntimeState::is_idle()` in `roles/server.rs`), but the prewarmed standby holder counts as a holder and keeps the server alive, and `server.json` is not removed on exit.
- Crash points exist as `fault_injection::crash_at("<point>")` behind the `fault-injection` Cargo feature; the simulator is `native/terminal-host/src/core/sim/`; one fuzz target (`decode_frame`) exists under `native/terminal-host/fuzz/`.
- `src/cli/dispatch.ts` owns the command grammar and silently ignores `tabs` today; `a1-shell` restricts complete help to a fixed command list.

## Goals / Non-Goals

**Goals:**

- Every published release contains a verified terminal-host executable and session-writer lock for each supported platform (Windows x64, Linux x64, macOS arm64, macOS x64), with provenance, hashes, licenses, and notices, and installed bare `a1` runs resident tabs on each of them.
- No update or release collection can remove a release that a live resident process runs from.
- Users can list, stop, inspect, and diagnose resident tabs without attaching.
- Host health and bounds are observable without reading logs.
- The verification program in Decision 16 runs in CI on each platform, and each platform's certification state is recorded truthfully from its exact-package evidence.

**Non-Goals:**

- A runtime gate that disables tabs on an uncertified platform (user decision, 2026-10-14: certification is evidence, not a gate).
- The 24-hour soak, which remains a separate later authorization.
- Automatic cohort handoff, idle tab recycling to a newer release, reboot or logout restore, CLI tabs, split layouts, remote attach, worktree isolation, and agent coordination.
- Platforms A1 does not release for (Windows arm64, Linux arm64, musl).
- Any behavior already delivered by milestones 2–5, including the `tabsMax` cap, prewarm, `a1 solo`, and the direct fallback path itself.

## Decisions

### 1. The terminal host is a release artifact built on the guardian matrix

Add `scripts/development/build-terminal-host.mjs` (new file), modeled on `build-process-guardian.mjs`. It runs `cargo build --release --locked` for `native/terminal-host` and writes the executable to `dist/native/<platform>-<arch>/` under the name given by `src/product-identity.json` (`artifacts.nativeExecutable`, currently `terminal-host`). `resolveTerminalHostPath()` switches to that name, and the remaining `a1-terminal-host` references become the role name only. Its manifest is a separate file, `terminal-host.manifest.json`, because the guardian already owns `manifest.json` in that directory. The manifest schema `a1-terminal-host-artifact-v1` records protocol generation, crate version, target triple, the executable's and the session-lock addon's SHA-256 and size, the `libghostty-vt` commit, Zig and Rust versions, `Cargo.lock` digest, and signature/attestation status. The script checks the built binary's `--version` JSON for the expected `protocolVersion`, and `--version` gains `generation` and `crateVersion` so the check covers both.

`build_target.rs` maps `x86_64-apple-darwin` to Zig `x86_64-macos` at the baseline CPU. `publish.yml` gains a `terminal_hosts` job on `windows-2025`, `ubuntu-24.04`, `macos-15`, and `macos-15-intel`, and `guardians` gains `macos-15-intel` (see Resolved Questions), with Zig 0.15.2 from `mlugg/setup-zig` at the digest `ci.yml` already pins, and `scripts/development/prepare-ci-rust.sh`. The `package` job downloads `release-terminal-host-*` beside the guardians and refuses to pack unless all four platform artifacts and manifests are present, using the same skip invariant as `guardians`. `repair-native-executable-modes.mjs` and candidate evidence recognize `terminal-host.manifest.json`, so Unix binaries keep their executable bit through packing.

The local `npm run build` does not build the terminal host (Zig's fetch is quarantined by workstation antivirus on Windows); local development uses a CI artifact through `A1_TERMINAL_HOST_PATH`, which is honored only in development builds and ignored by installed releases.

Rejected: building the terminal host inside the `package` job (one runner cannot produce every platform); merging it into the guardian binary (separate provenance, separate failure domains, and the guardian must stay free of PTY code).

### 2. Provenance, licenses, and notices come from the locked graph

Update `config/terminal-host-provenance.json` and its checker: the change identity becomes `resident-tabs-certification`, the platform list adds macOS x64, and build prerequisites name the C toolchain per platform (MSVC on Windows, the runner's Clang on macOS, GCC on Linux) with the pinned Zig range. A new `scripts/release/generate-terminal-host-notices.mjs` runs `cargo metadata --locked` against `native/terminal-host` and emits `dist/native/<platform>-<arch>/terminal-host-THIRD-PARTY-NOTICES.txt` from the license files in the locked sources and the vendored `libghostty-vt` tree. It fails on a missing license text or a license outside an allowlist (MIT, Apache-2.0, BSD-2/3-Clause, ISC, Unicode-3.0, Zlib). This closes the open "crossterm notice must be vendored before packaging" note in `docs/architecture/terminal-host-provenance.md`.

### 3. Verification before every execution

New `src/foundation/process-containment/terminal-host-artifact.ts` mirrors `artifact.ts`: it checks schema, generation, platform, architecture, filename, size, and SHA-256, and returns typed codes (`TERMINAL_HOST_ARTIFACT_MISSING`, `_INCOMPATIBLE`, `_UNSUPPORTED`, `_TAMPERED`). `ensureTerminalHost()` and every maintenance command call it before spawning or exec'ing the binary, and its supported-platform list adds `darwin-x64`. Any failure takes the existing direct fallback with one notice; it never runs an unverified binary. The hash pass is part of measured cold launch (Decision 11).

The session-writer lock addon is built by the same job (`--features node-addon`), listed in the same manifest, verified the same way, and resolved relative to the installed release root rather than `process.cwd()`. The portable backend stays a development fallback; an installed release with a missing or altered addon takes the direct fallback for resident launches instead of running the host without its lock.

Rejected: verifying only at release activation. A release directory is immutable by contract but not by OS enforcement, and the guardian already sets the per-launch precedent.

### 4. Resident processes hold their releases

Add authority `resident` to `ExternalReleaseHoldAuthority` in `src/foundation/release/cohort-state.ts`. A new read-only `terminal-host release-holds --data-dir <dir>` command reads, without starting or recovering anything, the owner marker and `registry.json` for every profile under `<dataDir>/tabs/`, verifies the server, each holder, and each tab child by pid plus native start identity with the host's own inspector, and reports the release roots that live processes run from. `src/foundation/resident-tabs/release-holds.ts` runs it through a verified installed terminal host only when resident records exist, and `protectionInputs` in `release-gc.ts` maps each root to its release id and merges the holds on every reconciliation, including the cleanup worker path; `parseWorkerHolds` accepts the new authority. The owner marker gains the server's release root so the server is held too.

Rejected: a TypeScript reader verifying identities with the guardian-backed inspectors. The host records macOS start identities as `macos-proc-start:` while the TypeScript inspector and guardian use `darwin-proc-start:`; letting the host judge its own records removes that mismatch without changing what older hosts already wrote.

Retention fails closed: if a registry or marker is unreadable, quarantined, or locked, a recorded root does not map to a known release, or an identity cannot be inspected, every release it records stays held. A hold is dropped only when its process is verified gone or verified to be a different process (pid reuse).

Rejected: copying resident binaries into a separate store (duplicates content and splits provenance); OS file locks on release directories (no portable semantics, and Windows locks would block legitimate cleanup of unrelated files).

### 5. Updates leave the resident cohort alone; generation mismatch needs an explicit stop

Cohort update coordination (`src/foundation/release/update.ts`, `src/foundation/supervision/server.ts`) already drains launch instances. Attach clients are launch instances, so an update may detach them; the server, holders, and children are not launch instances and are never signalled. A test asserts that the update path issues no signal or stop request to any process recorded in a resident registry.

There is no automatic handoff. A newer client with the same generation attaches and disables optional methods the server lacks. A newer client with a different generation receives `incompatible-generation`; bare `a1` prints one notice naming `a1 tabs host stop` and uses the direct fallback, with the session-writer lease still enforced.

Maintenance commands must work across that mismatch. When the handshake reports a different generation, `a1 tabs` and `a1 tabs host status|stop` execute the recorded cohort's own terminal-host binary from its retained release (after verifying that release's manifest) in a non-interactive `maintain` mode. Rejected: a generation-independent maintenance sub-protocol, because it would be a second frozen contract to keep forever.

### 6. Maintenance commands

`src/cli/dispatch.ts` recognizes `tabs`; new `src/cli/tabs.ts` implements it. The commands run before and without the supervisor, launch guardian, or interactive runtime.

| Command | Behavior |
|---|---|
| `a1 tabs` | Probe the endpoint with a bounded connect. No answer: print `No resident tabs are running.` and exit 0, without starting anything. Otherwise list id, name, status, cwd, release, and holder pid. |
| `a1 tabs stop <id>` | Graceful child shutdown, bounded wait, verified tree termination, tab removed; session stays resumable. The explicit command is the confirmation. Unknown id: nonzero with one line. |
| `a1 tabs stop --all` | Same for every tab; the server stays up. |
| `a1 tabs host status` | Decision 7 content. No server: report that none runs, exit 0. |
| `a1 tabs host stop` | Stop all tabs gracefully, then the server. If the server does not answer within its deadline, terminate it only after native identity verification; if holders survive, start an ordinary replacement with an explicit restart, which re-admits the verified holders, and send it the same stop at once, so no client attaches, no stopped tab restarts, and the server exits after its tabs stop. An unverifiable owner fails with a nonzero status and touches nothing. |
| `a1 tabs doctor` | Write a redacted bundle (Decision 8) and print its path. Works with no server. |

Every form accepts `--json` for scripts and `--help`. Invalid arguments fail before any I/O with one concise diagnostic and a nonzero status. `a1 tabs` is advertised in complete help, which requires a delta to the `a1-shell` help requirement; the delta also lists the already-shipped `solo` and `session` forms so the spec matches `cliHelp()`.

### 7. Host status, counters, and idle exit

The server keeps volatile counters since its start: crash restarts, failed tabs, holder and child hang recoveries, `unresponsive` and `stalled` transitions, full-surface resyncs to slow clients, render-lane replacements, persistence-degraded and checkpoint-degraded entries, bridge-degraded tabs, and server replacements observed (from the epoch). `a1 tabs host status` prints server id, pid, build, release, protocol generation, epoch, uptime, observed detachment mode and any verification failure reason, tab count by status, client count, configured and hard limits, these counters, and the paths of the structured logs. Counters are not persisted; per-tab restart totals already persist in the registry.

The server exits after ten minutes with no client connected and no user tab whose holder is live. The idle decision moves from `RuntimeState::is_idle()` into the sans-IO core as a timer, and the prewarmed standby tab no longer counts: when the idle timer expires, the server stops the standby first, then exits and removes its endpoint and `server.json` marker while it still owns them. The timer is tested with simulated time.

### 8. Doctor bundle

`a1 tabs doctor` writes `<dataDir>/tabs/<profile-token>/doctor/a1-tabs-doctor-<timestamp>.zip`, owner-only, capped at 25 MiB (oldest log generations dropped first, with a manifest line saying so). Contents: host status JSON, structured server and holder logs with their rotated generations, crash records, the registry with `cwd` and session paths reduced to a home-relative form and file names replaced by a stable hash, the owner marker without secrets, artifact manifests and their verification result, platform and detachment facts, and the effective `tabsMax` and `tabsAutoName` settings. Excluded by construction, and asserted by test: profile secret, client token, derived credentials, environment values, prompt journals, draft checkpoints, last-screen snapshots, the private child-stderr sink from milestone 4 (no platform captures child stderr separately yet, so the sink is usually empty), and terminal content. A redaction test seeds every excluded class with canary strings and fails if any canary appears in the archive.

### 9. Verification program

- **Simulation and properties.** Extend the milestone-1 simulator (`native/terminal-host/src/core/sim/`) into a full server-core harness driven by a seeded scheduler that injects process death, message loss, reorder, delay, stale epochs, controller transfer, client churn, and mutations. Invariants: no lost committed mutation, one registry writer, one live incarnation per tab and session, attributable client-scoped requests, convergence to running or failed, idle exit only when idle. A failure prints the seed and a minimized event sequence. CI runs a fixed seed corpus on every change and a larger random budget nightly.
- **Crash points.** The existing `fault-injection` Cargo feature, compiled only into test builds, gains a named point at every persistence and IPC step (registry temp write, flush, replace, directory flush, history rotation, journal append and retirement, marker write, lease acquire, frame send and receive, holder ready, bridge admit). Each test kills the process at that point and asserts recovery. An exact-package test asserts the feature is absent from the shipped binary.
- **Fuzzing.** `cargo-fuzz` targets for the frame decoder (milestone 1), the bridge message decoder, the registry and marker parsers, the boundary-marker codec, and arbitrary child VT output through the holder model and attach composition. Surface patches are opaque full surfaces today, so there is no patch codec to fuzz. Fuzzing runs on Linux with a bounded time per target; it proves parser robustness and is not platform evidence.
- **Chaos.** An impact-selected `resident-chaos` validation group on Windows x64, Linux x64, and macOS arm64 builds the release terminal host and a fixture agent in its lane and runs a bounded randomized schedule (at most 15 minutes) against that release-built artifact: echo and high-rate streaming agents, random kills of servers, holders, and agents, tab creation and stops, and duplicate checks after every action; it ends with `a1 tabs host stop` and requires zero orphaned processes. Controller transfer and client churn run in the simulator, pseudoterminal hangs and blocked writes in the fault-injection integration tests, and journaled prompts in the TypeScript crash-point tests, because the release-built host compiles no fault hooks and fixture agents keep no journal.

### 10. Exact-package acceptance per platform

New `docs/manual-resident-tabs-acceptance.md` defines a checklist run against the published candidate package (installed by `a1 update --develop <version>`), on a manual operator machine or an isolated worker, never by automation on an active workstation. Each platform record lives in `docs/architecture/evidence/resident-tabs/<platform>.md` (`windows-x64`, `linux-x64`, `macos-arm64`, `macos-x64`) with package version, artifact SHA-256, OS build, terminal, operator or worker identity, date, and a verdict per item: terminal close mid-turn; SSH or remote-session loss; forced attach-client kill and terminal restoration; reattach fidelity; input and render smoothness (typing, paste, resize, high-rate output); extension text UI; two-client attribution and controller transfer; server, holder, and child failure; sensitive-data separation in the doctor bundle; conflict-safe direct rollback (open a session held by a live tab with `a1 solo`, confirm it is refused or forked and never double-written, then `a1 tabs host stop`).

This change records each platform from its CI exact-package evidence (Decision 9 and the `terminal-host` group) and leaves every physical item `pending` until an operator runs it; the user runs the macOS checks after this change. A platform is `CI-verified` while any physical verdict is pending and `certified` only when every item has a recorded pass. Earlier physical evidence (milestone 2 Windows terminal-close and OpenSSH loss) is cited only for the package it was recorded against. Evidence is never copied between platforms.

### 11. Performance is measured, not promised

The chaos and acceptance harnesses record cold launch to first input, warm tab creation (prewarm promotion and cold creation separately), reattach to retained first paint and to first input, tab restart, and server recovery, per platform, in implementation evidence. They are reported against the later soak targets (reattach p95 under 300 ms, restart under 3 s, server recovery under 2 s) but do not gate this change.

### 12. Release state and known gaps

Resident tabs run by default on every packaged platform; `a1 solo` is the direct path and `a1 tabs host stop` stops the cohort. `docs/architecture/resident-tabs.md` records status `implemented`, the per-platform certification state (`CI-verified` or `certified`), the bounds table, and a known-gaps list: physical acceptance for each platform still pending, the 24-hour soak per platform, reboot and logout restore, CLI tabs, splits, remote attach, worktree isolation, coordination, automatic cohort handoff, image protocols, separate capture of raw child stderr (milestone 4 provides only a tested private sink), downgrade to a release without the session-writer guard, and chaos coverage on Intel macOS.

## Risks / Trade-offs

- **[Packaging turns tabs on for every installed user at once]** → Verification-before-execution and the direct fallback make any host failure a single-agent launch with one notice, never a broken `a1`; `a1 solo` is always available; CI exact-package and chaos evidence run on every platform before the release.
- **[A release used by a tab is collected]** → Fail-closed `resident` holds, a collection test with live recorded identities on each platform, and a chaos assertion that every live process's release directory exists.
- **[Hash verification adds cold-launch time]** → Measured in Decision 11; the binary is verified once per launch, not per tab.
- **[Old cohorts accumulate when users never stop tabs]** → Bounded by `tabsMax`, the idle server exit, and `a1 tabs host stop`; `a1 tabs host status` shows the cohort release; automatic recycling is a listed follow-up.
- **[The doctor bundle leaks content]** → Allowlist construction, not deny-list scrubbing, plus canary tests for every excluded class.
- **[Chaos time inflates CI]** → Impact-selected like the existing `terminal-host` owner, bounded per platform, and the long random budget runs nightly only.
- **[Intel macOS has never been built]** → The release build and exact-package tests run on `macos-15-intel`; a build failure blocks packing rather than shipping a partial set.
- **[A user downgrades A1 below the session-writer guard while tabs run]** → Documented gap; the rollback checklist stops the host first.
- **[Physical evidence lags the release]** → Each platform's state is recorded truthfully as `CI-verified` until its operator record exists; evidence is never inferred across platforms.

## Resolved Questions

- **`darwin-x64`.** `docs/architecture/process-guardian-provenance.md` listed `darwin-x64`, but the release matrix built only `macos-15` (arm64). Decision (user, 2026-10-14): both release binaries add an Intel macOS runner. The `guardians` and `terminal-hosts` jobs gain `macos-15-intel`, the terminal host's Zig target resolver maps `x86_64-apple-darwin` to `x86_64-macos`, and the `package` invariant requires all four platform artifacts (`win32-x64`, `linux-x64`, `darwin-arm64`, `darwin-x64`). `darwin-x64` is a separate platform for certification: its physical record is independent of `darwin-arm64`, and the chaos group runs on macOS arm64 only.
- **Rollout without physical records.** Decision (user, 2026-10-14): tabs ship on every packaged platform; certification is recorded evidence, not a runtime gate. CI is the evidence for this change, and the user runs the macOS physical checks later.
