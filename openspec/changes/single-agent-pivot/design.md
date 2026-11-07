# Design

## Context

Today bare `a1` runs as a chain: `bin/cli.js` → detached per-release **supervisor** → foreground Node **launch guardian** loading the native **process-guardian** addon → either `bin/ui.js` (direct) or the native terminal host's **attach** role, which talks to a detached **server** and one **holder** per tab, each holder running `node bin/ui.js --tab` in its own PTY. `a1 solo` takes the direct branch of that same chain. The owned UI (`src/app`, `src/ui`, `src/features/owned-ui`, `src/integrations/pi`, `src/contracts`) is identical in both branches; only the process topology, the tab bridge, and a handful of presentation flags differ (see `docs/architecture/resident-tabs.md`, decisions 1, 2, 6, 6a).

The pivot keeps the owned UI and removes the topology around it.

## Goals / Non-Goals

**Goals**

- Bare `a1` is the direct single-agent owned UI, in one directly attached process, on every platform Node runs on.
- No native code, no Rust or Zig toolchain, no per-platform artifacts; the npm package is pure JavaScript.
- No background process survives the terminal: no supervisor, no resident host, no detached update worker beyond the one that performs an installation.
- Updates: `Auto` installs silently and tells the user to restart; `No` does nothing. A restart runs the newest approved release.
- The remaining architecture is small enough to describe on one page and to re-pin against a newer Pi without touching launch code.
- Pi decoupling is preserved: pinned Pi ledger, upstream sync proposal, component/event parity tooling, the engine/component/TUI adapters, and the `a1 pi` comparison launch stay.

**Non-Goals**

- Any multi-agent, tab, split, or multiplexing feature, now or as a reserved extension point.
- Resident processes, reattach, or crash-recovery of an interrupted prompt.
- Reworking the owned UI itself; this change removes, it does not redesign.
- Changing the pinned Pi version.

## Decisions

### 1. Direct launch is the only launch

`dispatchCli` keeps `launch` intents for `a1`, `a1 --session …`, and prerelease `a1 pi`; the `solo` word, `launchMode`, `tabs`/`tabs-request`, and the resident fallback notice disappear. `InteractiveLaunchMode` and `hidesTabSettings` go away with them. `bootstrap.ts` no longer computes a resident launch context; `LaunchContext` loses `launchMode`, `residentRootExecutable`, `residentRootArguments`, and `residentFallback`. Product identity drops the `A1_TAB_*`, `A1_TABS_ENDPOINT`, `A1_TERMINAL_HOST_PATH`, `A1_PROCESS_GUARDIAN_PATH`, and resident-progress environment names.

The exited-session hint is `a1 --session <id>` with the existing quoted `--session-dir` form; `formatSessionResumeCommand` loses its `solo` parameter.

### 2. One process, no supervisor, no containment

`bin/cli.js` → `runBootstrap` selects the approved active immutable release exactly as today (release store, certified manifest, missing-file repair, update-transaction awareness) and then spawns `node <release>/bin/ui.js [session args]` once with inherited stdio, waits for it, and returns its exit code. There is no supervisor endpoint, no control SQLite store, no control protocol, no launch-instance rows, no job object or process group management, and no exit watcher.

What the guardian chain used to provide and how it is covered:

| Former responsibility | After the pivot |
|---|---|
| Kill-on-close containment of the UI tree | The OS does it: console close on Windows and `SIGHUP` on Unix end the attached child; tool subprocesses behave as in upstream Pi. |
| Terminal restoration and the unclean-exit notice when the UI dies | The owned UI keeps its in-process fatal boundary (`terminal-cleanup`). The launcher, which is the parent and still owns the terminal, performs the same bounded reset and prints the armed notice when the child exits uncleanly. |
| Preventing a release from being deleted while a process runs it | Age-based retention (Decision 4). |
| Release superseded during startup | The launcher re-reads the active release once if the child reports `release-superseded`; the retry already exists in `runBootstrapAttempt`. |
| Plural launch instances | Any number of `a1` processes run independently; nothing coordinates them except the session writer guard. |

`src/foundation/{supervision,launch-guardian,process-containment,protocol,storage}` and `bin/{supervisor,guardian}.js` are deleted. `src/foundation/lifecycle` keeps paths, session selection, and the repository-context helpers; launch-instance, supervisor-startup, and native-claim-gate modules are deleted. `a1 session worktrees` / `link-worktree` keep working on the ordinary Git path and without native process inspection.

Alternative considered: keep `native/process-guardian` for containment only. Rejected: it keeps the Rust toolchain, per-platform artifacts, provenance policy, and macOS certification lanes alive for a behavior upstream Pi does not have.

### 3. Session writer guard in Node

`src/foundation/session-writer-lock` keeps its public surface (`acquireSessionWriter`, `SessionWriterConflict`, bind-created, release) and the places that call it (startup, `--session`, in-runtime switch, fork, import, new session, picker rename). The backend changes from the `terminal-host.node` `SessionLock` class to `proper-lockfile`, which the package already depends on, locking a sibling `<session>.lock` directory with its stale-lock detection and periodic mtime refresh. Conflicts keep the existing safe behavior: no silent attach or overwrite, the existing fork offer. A crashed writer's lock becomes stale after the library's bound instead of being released by the kernel; this is the accepted trade-off for zero native code. `check-session-writer-guard.mjs` keeps enforcing that every writer route calls the guard.

### 4. Updates: Auto or No, applied on restart

- `Update` setting: `auto` (default) and `no`. Migration maps stored `notify` and legacy `true` to `auto`, `false` to `no`.
- `Auto` keeps `createStartupReleaseUpdateObservation`'s fifteen-minute same-channel cadence, the single-owner execution lease, the durable update transaction, atomic activation, rollback, and the detached installer worker. It drops: the `notify` branch and update-available popup, the invoking-package channel logic, resident continuity inspection (`update-activation.ts` `resident-continuity-blocked`), activation-blocked retries, the `blocked`/`blocked-cleared`/`client-connected` statuses, and `Update prepared; activation blocked` wording.
- The only update UI is the existing green `Update installed, restart to update` status, shown by the restart-readiness observer when the approved active release is newer and same-channel. Explicit `a1 update` keeps its visible progress and one result line.
- **Retention.** `release-gc` no longer asks a supervisor or resident registry which releases are live. It keeps the approved active release, the release the running command was launched from, and any release approved within the last seven days; everything else is removed at update time and at the next launch. A long-running session that spans more than seven days and two updates could lose its files; that is documented rather than guarded.
- `agent-supervision`'s cohort tracking, generation liveness, and resident holds (`release_holds`, `resident-release-retention`) are deleted. Dependency-layer sharing and certification of materialized releases stay as they are; they do not depend on supervision.

### 5. Owned UI cleanup

- Remove `src/features/resident-tab` (shortcut declarations `alt+1…9`, `alt+a`, `alt+w`, `alt+,`, `alt+/`, projection, bindings file, auto-name, status deriver), `src/composition/resident-tab-bridge.ts`, `src/composition/utility-tab.ts`, `src/app/session-shell/resident-tab-coordinator.ts`, the `residentTab` engine option and its journal/checkpoint/controller-boundary hooks in `session-shell.ts`, `prompt-submission.ts`, `workflow-router.ts`, and `workflow-output.ts`.
- Settings: delete the Tab Bar section (`tabsPosition`, `tabBarPlusMenu`, `tabBarRightItems`, `tabBarBackgroundStyle`, `tabsAutoName`) and the resident launch settings reader; migration deletes those keys when the document is next written. `timeFormat` and the `OwnedUiTimeFormat` contract are deleted together with every wall-clock rendering: the submitted-prompt timestamp, the pinned-row and compaction-header timestamps in `transcript-document.ts`, `session-shell-root.ts`, and `session-viewport-controller.ts`, and the tab bar's Time and Version widgets, which go with the tab bar. Copy of a selected prompt no longer has a timestamp to exclude. `Update` keeps `restart` application.
- `/hotkeys` loses the Tabs section; the changelog hint text no longer refers to a tab or `Alt+/`; autocomplete no longer hides `settings`, `changelog`, `name`; the footer always shows the session name; the quit outro and startup intro are unconditional for bare `a1`.
- `OwnedUiReleaseUpdate` keeps `available` (used by explicit paths and `a1 pi` extension presentation) and `installed`; `client-connected`, `blocked`, and `blocked-cleared` go.

### 6. Tests, scripts, CI, governance

- Delete `test/foundation/resident-tabs`, `test/features/resident-tab`, `test/composition/{resident-tabs,utility-tab}.test.ts`, `test/cli/tabs.test.ts`, supervisor/launch-guardian/process-containment tests, resident recovery and utility-tab shell tests, and the repository-governance tests for terminal-host provenance, proof gate, partition, release artifact, resident chaos, fixture custody, measurements, native CI workflows, native build environment, native target, fetch-terminal-vt, local terminal-host build, verify-native-artifacts, and the damage-aware/native-host boundary policies. Tests of retained behavior that were parameterised over `solo` keep only the direct case.
- Delete `scripts/development/{build-terminal-host,prepare-local-terminal-host,run-terminal-host*,certify-ci-terminal-host,fetch-terminal-vt,measure-resident-tabs,resident-*,run-resident-chaos,verify-interaction-parity,verify-resident-parallel-progress,verify-terminal-fidelity,test-session-lock-addon,build-process-guardian,native-build-environment,native-target,prepare-ci-rust.sh}`, `scripts/release/{generate-terminal-host-notices,verify-native-artifacts}`, `scripts/governance/{check-terminal-host-provenance,naming-rust}`, and the matching `package.json` scripts. `run-build.mjs` becomes `tsc` plus the existing resource generators.
- `.github/workflows/ci.yml`: remove the native build/cache steps, Ghostty VT tests, fuzzing, fidelity/parity/chaos/measure steps, and the terminal-host artifact matrix; `publish.yml` and `full-regression-shared.yml` lose native artifact assembly and cross-compilation. `config/{terminal-host-proof-policy,terminal-host-provenance}.json` are deleted; `validation-suites.json`, `validation-ownership.json`, `integration-owners.json`, `architecture-allowlist.json`, `internal-naming-policy.json`, product-identity inventories, `size-ratchet.json`, and `startup-graph-baseline.json` are regenerated or pruned with the existing scripts. `rust-toolchain.toml` is deleted. `node-pty` and `@xterm/headless` stay only while a retained test imports them.
- `check-architecture.mjs` drops the Rust and terminal-host rules and gains one rule: no module under `src/` may import `node-pty`, a terminal emulator, or spawn a pseudoterminal.

### 7. Specs and documentation

- Whole-capability removals list every requirement under `## REMOVED Requirements` with one shared reason. After archive those spec files hold no requirements; if finalization leaves the empty files behind, a push on the same branch deletes them and re-finalizes.
- Partial amendments restate the affected requirements in full. Requirements elsewhere that merely mention resident, solo, supervisor, or guardian in passing (listed in `tasks.md` §7) are restated during implementation under the same change so the archive leaves no stale references.
- Delete `docs/architecture/{resident-tabs,resident-tabs-requirements,terminal-host-proof-gate,terminal-host-provenance,terminal-host-spike-evidence,process-guardian-provenance,native-fixture-isolation}.md`, `docs/architecture/evidence/terminal-host-spike`, `docs/{manual-resident-tabs-acceptance,manual-launch-instance-acceptance,launch-recovery}.md`; rewrite `docs/architecture/boundaries.md` (module responsibilities, dependency direction, no "planned multi-agent boundaries"), `docs/architecture/project-structure.md`, `docs/features/launch-profiles.md`, `docs/validation.md`, `docs/ci-release-runbook.md`, and the README Launch/Tabs/Update sections.

## Risks / Trade-offs

- **Orphaned tool subprocesses on terminal close.** Without containment a tool the agent started with a detached console could outlive the terminal. Upstream Pi has the same behavior; documented, not guarded.
- **Session lock after a crash.** `proper-lockfile` staleness replaces kernel release; a crashed writer blocks resume for the staleness bound (seconds), after which the lock is reclaimed. Acceptable for a single-user tool.
- **Release deletion under a very long session.** Covered by the seven-day retention window; documented.
- **Size of the change.** This is one large deletion-heavy PR. Mitigation: each outcome in `tasks.md` leaves `npm run typecheck` and the retained tests green on its own, and the retained UI code is not refactored, only unhooked.
- **Governance baselines.** Startup-graph, size-ratchet, product-identity, and naming baselines will drift; they are regenerated with their own scripts in the same PR, never hand-edited.

## Migration Plan

1. Users on an older release with resident tabs: tabs are not restored; `a1 tabs host stop` from the old release, or simply logging out, ends them. Their sessions remain in `~/.a1/agent/sessions` and resume with `a1 --session <id>`.
2. `Update: Notify` becomes `Auto` on first launch of the new release.
3. Registry, journal, and tab data under `<data>/tabs/` are left untouched; `a1 uninstall` removes the data directory as before.

## Open Questions

- None blocking. Whether to keep `node-pty`/`@xterm/headless` as dev dependencies is decided by which retained tests still import them at implementation time.
