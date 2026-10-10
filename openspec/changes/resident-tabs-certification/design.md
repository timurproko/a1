# Design

The product design, decisions, and roadmap live in [`docs/architecture/resident-tabs.md`](../../../docs/architecture/resident-tabs.md). This document covers only what milestone 6 builds and how it is proven. It implements Decisions 10 and 12–16 and Roadmap row 6.

## Context

After milestones 1–5, `develop` contains the three native roles, the tab bridge, failure isolation, crash recovery, and the full tab UX, all behind `residentTabs: false`. The terminal host is still built only by CI validation jobs as a debug executable (`native/terminal-host/build.rs` refuses local Windows builds), and no release contains it.

The existing pieces this milestone extends:

- `native/process-guardian` is built per platform by the `guardians` job in `.github/workflows/publish.yml` (`windows-2025`, `ubuntu-24.04`, `macos-15`) through `scripts/development/build-process-guardian.mjs`, which writes `dist/native/<platform>-<arch>/process-guardian[.exe]` plus a `manifest.json` (schema, protocol, crate version, SHA-256, size, provenance). The `package` job merges all platform artifacts before packing once, and refuses to pack without every guardian. `src/foundation/process-containment/artifact.ts` verifies the manifest and hash before use.
- #588 made `terminal-host` an impact-selected CI owner (`scripts/release/validation-matrix.mjs`, group `terminal-host`) with pinned Zig 0.15.2; milestone 1 extended it to macOS and Linux. `config/terminal-host-provenance.json` and `scripts/governance/check-terminal-host-provenance.mjs` pin `libghostty-vt`, `portable-pty`, and `crossterm`, but the record still names the retired `evolve-bare-a1-into-multi-agent-workspace` change and only a Windows C toolchain.
- Release retention (`src/foundation/release/cohort-state.ts`, `release-gc.ts`) protects the active, rollback, pending-transaction, and live-cohort releases plus explicit external holds with authority `agent` or `migration`.
- `src/cli/dispatch.ts` owns the command grammar; `a1-shell` restricts complete help to a fixed command list.

## Goals / Non-Goals

**Goals:**

- Every published release contains a verified terminal-host executable for each supported platform, with provenance, hashes, licenses, and notices.
- No update or release collection can remove a release that a live resident process runs from.
- Users can list, stop, inspect, and diagnose resident tabs without attaching.
- Host health and bounds are observable without reading logs.
- The verification program in Decision 16 runs to completion on each platform, and exact-package physical evidence exists for each platform before the opt-in is called certified there.

**Non-Goals:**

- Default enablement on any platform, and the 24-hour soak that would gate it.
- Automatic cohort handoff, idle tab recycling to a newer release, reboot or logout restore, CLI tabs, split layouts, remote attach, worktree isolation, and agent coordination.
- Any behavior already delivered by milestones 2–5, including the resource settings and their caps, idle suspension, and the direct fallback path itself.

## Decisions

### 1. The terminal host is a release artifact built on the guardian matrix

Add `scripts/development/build-terminal-host.mjs` (new file), modeled on `build-process-guardian.mjs`. It runs `cargo build --release --locked` for `native/terminal-host` and writes the executable to `dist/native/<platform>-<arch>/` under the name given by `src/product-identity.json` (`nativeExecutable`, currently `terminal-host`; the design's `a1-terminal-host` is the role name, and any rename goes through product identity). Its manifest is a separate file, `terminal-host.manifest.json`, because the guardian already owns `manifest.json` in that directory. The manifest schema `a1-terminal-host-artifact-v1` records protocol generation, crate version, target triple, SHA-256, size, the `libghostty-vt` commit, Zig and Rust versions, `Cargo.lock` digest, and signature/attestation status. The script also checks the built binary's `--version` output for the expected protocol generation.

`publish.yml` gains a `terminal-hosts` job with the same three runners as `guardians`, Zig 0.15.2 from `mlugg/setup-zig` at the pinned digest, and `scripts/development/prepare-ci-rust.sh`. The `package` job downloads `release-terminal-host-*` beside the guardians and refuses to pack unless every platform artifact and manifest is present, using the same skip invariant as `guardians`. The local `npm run build` does not build the terminal host (Zig's fetch is quarantined by workstation antivirus on Windows); local development uses a CI artifact through `A1_TERMINAL_HOST_PATH`, which is honored only in development builds and rejected by installed releases.

Rejected: building the terminal host inside the `package` job (one runner cannot produce all three platforms); merging it into the guardian binary (separate provenance, separate failure domains, and the guardian must stay free of PTY code).

### 2. Provenance, licenses, and notices come from the locked graph

Update `config/terminal-host-provenance.json` and its checker: the change identity becomes `resident-tabs-certification`, and build prerequisites name the C toolchain per platform (MSVC on Windows, the runner's Clang on macOS, GCC on Linux) with the pinned Zig range. A new `scripts/release/generate-terminal-host-notices.mjs` runs `cargo metadata --locked` against `native/terminal-host` and emits `dist/native/<platform>-<arch>/terminal-host-THIRD-PARTY-NOTICES.txt` from the license files in the locked sources and the vendored `libghostty-vt` tree. It fails on a missing license text or a license outside an allowlist (MIT, Apache-2.0, BSD-2/3-Clause, ISC, Unicode-3.0, Zlib). This closes the open "crossterm notice must be vendored before packaging" note in `docs/architecture/terminal-host-provenance.md`.

### 3. Verification before every execution

New `src/foundation/process-containment/terminal-host-artifact.ts` mirrors `artifact.ts`: it checks schema, generation, platform, architecture, filename, size, and SHA-256, and returns typed codes (`TERMINAL_HOST_ARTIFACT_MISSING`, `_INCOMPATIBLE`, `_UNSUPPORTED`, `_TAMPERED`). The pre-guardian bootstrap (`ensureTerminalHost()`) and every maintenance command call it before spawning or exec'ing the binary. The native detached-launch routine from milestone 1 additionally verifies its own artifact before `server --detach`. Any failure takes the milestone-2 direct fallback with one notice; it never runs an unverified binary. The hash pass is part of measured cold launch (Decision 11).

Rejected: verifying only at release activation. A release directory is immutable by contract but not by OS enforcement, and the guardian already sets the per-launch precedent.

### 4. Resident processes hold their releases

Add authority `resident` to `ExternalReleaseHoldAuthority` in `src/foundation/release/cohort-state.ts`. A new provider (`src/foundation/release/resident-release-holds.ts`, new file) reads, without starting anything, the owner marker and `registry.json` for every profile under `<dataDir>/tabs/`, collects the recorded release of the server, each holder, and each tab child, and verifies each pid plus native start identity with the existing process inspectors. `protectionInputs` in `release-gc.ts` merges these holds on every reconciliation, including the cleanup worker path, and `parseWorkerHolds` accepts the new authority.

Retention fails closed: if a registry or marker is unreadable, quarantined, or locked, or an identity cannot be inspected, every release it records stays held. A hold is dropped only when its process is verified gone or verified to be a different process (pid reuse).

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
| `a1 tabs host stop` | Stop all tabs gracefully, then the server. If the server does not answer within its deadline, terminate it only after native identity verification, then start a maintenance-only replacement (no clients, no restarts, no prewarm) that re-admits verified holders, stops them gracefully, and exits. An unverifiable owner fails with a nonzero status and touches nothing. |
| `a1 tabs doctor` | Write a redacted bundle (Decision 8) and print its path. Works with no server. |

Every form accepts `--json` for scripts and `--help`. Invalid arguments fail before any I/O with one concise diagnostic and a nonzero status. `a1 tabs` is advertised in complete help, which requires a delta to the `a1-shell` help requirement.

### 7. Host status, counters, and idle exit

The server keeps volatile counters since its start: crash restarts, failed tabs, holder and child hang recoveries, `unresponsive` and `stalled` transitions, full-surface resyncs to slow clients, render-lane replacements, persistence-degraded and checkpoint-degraded entries, bridge-degraded tabs, and server replacements observed (from the epoch). `a1 tabs host status` prints server id, pid, build, release, protocol generation, epoch, uptime, observed detachment mode and any verification failure reason, tab count by status, client count, configured and hard limits, these counters, and the paths of the structured logs. Counters are not persisted; per-tab restart totals already persist in the registry.

The server exits after ten minutes with no client connected and no user tab whose holder is live. The prewarmed standby tab (milestone 5) does not count: when the idle timer expires, the server stops the standby first, then exits and removes its endpoint and marker while it still owns them. The timer is part of the sans-IO core and is tested with simulated time.

### 8. Doctor bundle

`a1 tabs doctor` writes `<dataDir>/tabs/<profile-token>/doctor/a1-tabs-doctor-<timestamp>.zip`, owner-only, capped at 25 MiB (oldest log generations dropped first, with a manifest line saying so). Contents: host status JSON, structured server and holder logs with their rotated generations, crash records, the registry with `cwd` and session paths reduced to a home-relative form and file names replaced by a stable hash, the owner marker without secrets, artifact manifests and their verification result, platform and detachment facts, and the effective `residentTabs` and `tabs*` settings. Excluded by construction, and asserted by test: profile secret, client token, derived credentials, environment values, prompt journals, draft checkpoints, last-screen snapshots, the private child-stderr sink from milestone 4 (no platform captures child stderr separately yet, so the sink is usually empty), and terminal content. A redaction test seeds every excluded class with canary strings and fails if any canary appears in the archive.

### 9. Verification program

- **Simulation and properties.** Extend milestone 1's simulator into a full server-core harness (`native/terminal-host/tests/simulation/`) driven by a seeded scheduler that injects process death, message loss, reorder, delay, stale epochs, controller transfer, client churn, and mutations. Invariants: no lost committed mutation, one registry writer, one live incarnation per tab and session, attributable client-scoped requests, convergence to running or failed, idle exit only when idle. A failure prints the seed and a minimized event sequence. CI runs a fixed seed corpus on every change and a larger random budget nightly.
- **Crash points.** A `failpoints` Cargo feature, compiled only into test builds, names every persistence and IPC step (registry temp write, flush, replace, directory flush, history rotation, journal append and retirement, marker write, lease acquire, frame send and receive, holder ready, bridge admit). Each test kills the process at that point and asserts recovery. A release-artifact test asserts the feature is absent from the shipped binary.
- **Fuzzing.** `cargo-fuzz` targets for the frame decoder (milestone 1), the bridge message decoder, the registry and marker parsers, the surface patch encoder/decoder round trip, and arbitrary child VT output through holder model, patch, and attach composition. Fuzzing runs on Linux with a bounded time per target; it proves parser robustness and is not platform evidence.
- **Chaos.** A `resident-chaos` validation group on Windows, Linux, and macOS runs for a bounded 15 minutes per platform with high-rate fake agents, random kills of servers, holders, children, and clients, resize and attach churn, controller transfer, blocked writes, pseudoterminal creation hangs, rename denial, and containment escape attempts. It runs against the exact packed candidate and asserts zero duplicates, zero orphans, and zero lost journaled prompts.

### 10. Exact-package physical acceptance per platform

New `docs/manual-resident-tabs-acceptance.md` defines a checklist run against the published candidate package (installed by `a1 update --develop <version>`), on a manual operator machine or an isolated worker, never by automation on an active workstation. Each platform record lives in `docs/architecture/evidence/resident-tabs/<platform>.md` with package version, artifact SHA-256, OS build, terminal, operator or worker identity, date, and a verdict per item: terminal close mid-turn; SSH or remote-session loss; forced attach-client kill and terminal restoration; reattach fidelity; input and render smoothness (typing, paste, resize, high-rate output); extension text UI; two-client attribution and controller transfer; server, holder, and child failure; sensitive-data separation in the doctor bundle; conflict-safe direct rollback (turn `residentTabs` off with tabs live, confirm a held session is refused or forked and never double-written, then `a1 tabs host stop`). An item without a recorded verdict keeps that platform uncertified; evidence is never copied between platforms.

### 11. Performance is measured, not promised

The chaos and acceptance harnesses record cold launch to first input, warm tab creation (prewarm promotion and cold creation separately), reattach to retained first paint and to first input, tab restart, and server recovery, per platform, in implementation evidence. They are reported against the later default-on targets (reattach p95 under 300 ms, restart under 3 s, server recovery under 2 s) but do not gate the opt-in preview.

### 12. Enablement state and known gaps

`residentTabs` stays `false` by default. The settings text names the preview and points to `a1 tabs host stop` for rollback. `docs/architecture/resident-tabs.md` records status `implemented (opt-in preview)`, the per-platform certification state, and a known-gaps list: 24-hour soak before default-on per platform, reboot and logout restore, CLI tabs, splits, remote attach, worktree isolation, coordination, automatic cohort handoff, image protocols, separate capture of raw child stderr (milestone 4 provides only a tested private sink), downgrade to a release without the session-writer guard, and `darwin-x64` if not built (see Open Questions).

## Risks / Trade-offs

- **[A release used by a tab is collected]** → Fail-closed `resident` holds, a collection test with live recorded identities on each platform, and a chaos assertion that every live process's release directory exists.
- **[Hash verification adds cold-launch time]** → Measured in Decision 11; the binary is verified once per launch, not per tab.
- **[Old cohorts accumulate when users never stop tabs]** → Bounded by `tabsMax` and idle suspension; `a1 tabs host status` shows the cohort release; automatic recycling is a listed follow-up.
- **[The doctor bundle leaks content]** → Allowlist construction, not deny-list scrubbing, plus canary tests for every excluded class.
- **[Chaos time inflates CI]** → Impact-selected like the existing `terminal-host` owner, bounded per platform, and the long random budget runs nightly only.
- **[A user downgrades A1 below the session-writer guard while tabs run]** → Documented gap; the rollback checklist stops the host first.
- **[Physical evidence is slow to collect for three platforms]** → Each platform is certified independently; an uncertified platform keeps the preview documented as unverified there rather than blocking the others.

## Open Questions

- `docs/architecture/process-guardian-provenance.md` lists `darwin-x64`, but the release matrix builds only `macos-15` (arm64). Should the terminal host match the matrix as built (arm64 only, with `darwin-x64` documented as unsupported for resident tabs), or should both binaries add an Intel macOS runner?
