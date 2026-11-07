# Proposal

## Why

A1 exists to give Pi a better terminal UX. Over the last releases the project grew a second product on top of that goal: resident multi-agent tabs backed by a native terminal host (libghostty-vt, ConPTY/PTY holders, a detached server, one Node process per tab, prompt journals, crash recovery), plus the per-release supervisor, launch guardian, process-guardian addon, control SQLite store, and update-continuity machinery that those resident processes required. That stack is roughly 63k lines of Rust, 25k lines of TypeScript, more than fifty resident-specific test files, a dozen development harnesses, three-platform native CI lanes, and five capabilities' worth of specification. Every UX change now has to be certified through it, while `a1 solo`, the direct single-agent surface, is already the behavioural oracle the resident path is measured against.

This change makes that oracle the product. Bare `a1` becomes the direct single-agent terminal, everything that only existed to host several agents or to survive terminal closure is removed, and the architecture is reduced to what the single-agent UX needs: the owned UI, the pinned Pi integration, settings, sessions, and a simple automatic updater. The repository keeps its Pi decoupling so a newer pinned Pi can still be adopted quickly.

## What Changes

- **One launch form.** Bare `a1` and `a1 --session <path|id>` start the direct single-agent owned UI. The `solo` word and the `a1 tabs …` maintenance family leave the grammar, help, and resume hints; an exited session prints `a1 --session <id>`. Prerelease `a1 pi` stays as the development comparison surface.
- **No resident tabs.** The tab strip, Tab Bar settings section, Alt tab shortcuts, utility (Settings/Changelog) tabs, tab bridge, tab auto-naming, prompt journal and draft-checkpoint recovery, controller boundary, and every multiplexing or multi-agent path are removed. Settings, Changelog, Hotkeys, and Session info remain in-shell routes.
- **No clocks.** The tab bar's Time and Version widgets go with the tab bar. Submitted-prompt timestamps (naturally visible, pinned, and on compaction headers) and the `Time format` setting are removed too; the transcript shows no wall-clock anywhere.
- **No native code.** The `native/terminal-host` crate (with vendored libghostty-vt, the Zig and Rust toolchains, proof/provenance/certification tooling, native CI lanes, and publish artifacts) and the `native/process-guardian` crate are removed. The session writer guard is reimplemented in Node with the already-pinned `proper-lockfile` dependency. The published package becomes pure JavaScript.
- **One process per launch.** The detached per-release supervisor, launch guardian, exit watcher, control SQLite store, control protocol, cohort coordination, and launch-instance containment are removed. `bin/cli.js` verifies the active immutable release and runs its UI entry as one directly attached child with inherited stdio; terminal restoration and the unclean-exit notice stay in-process with a bounded fallback in the launcher. Closing the terminal ends the agent, as upstream Pi behaves.
- **Two update modes.** The `Update` setting offers `Auto` (default) and `No`. `Auto` keeps the existing silent background install on the running channel and shows only the existing `Update installed, restart to update` status; a restart launches the new release. `Notify`, the update-available popup, resident continuity inspection and activation blocking, the `client-connected` status, and the prepared/blocked wording are removed. Stored `notify` migrates to `auto`. Immutable release retention becomes age-based instead of live-instance-based.
- **Specs and docs follow the product.** The `multi-agent-tabs`, `resident-terminal-host`, `resident-tab-reliability`, `agent-supervision`, and `launch-instance-lifecycle` capabilities retire; `a1-shell`, `launch-profiles`, `cli-session-resume`, `cli-self-update`, `cli-uninstall`, `owned-ui-settings`, `owned-pi-ui-foundation`, and `continuous-integration` are amended. No active OpenSpec change exists to archive; resident architecture documents, acceptance runbooks, and README sections are removed or rewritten. Tests, scripts, governance baselines, and workflows that only served the removed parts are deleted.
- **Unchanged.** The owned UI (session shell, custom viewport, settings, prompt history, suggestions, selection, clipboard), the pinned Pi engine/component/TUI adapters, the pinned Pi source ledger and upstream sync, Pi parity tooling, extension package commands, install and uninstall, the immutable release store with atomic activation, and the repository delivery workflow.

**BREAKING CHANGE:** `a1 solo` and `a1 tabs …` are no longer commands; resident tabs created by earlier versions are not restored, but their Pi session files stay resumable with `a1 --session`. The `Update: Notify` choice is gone. Closing the terminal ends the running agent.

## Capabilities

### New Capabilities

- None. The direct single-agent surface already exists as `a1 solo`; this change renames and narrows the product around it.

### Modified Capabilities

- `a1-shell`: bare `a1` is the direct owned UI in one process; help and grammar drop `solo` and `tabs`; platform claims no longer depend on native certification.
- `launch-profiles`: the grammar, concurrency, and rendering-pipeline requirements lose their resident and containment clauses.
- `cli-session-resume`: one session grammar; the resume hint is `a1 --session <id>`.
- `cli-self-update`: `Auto`/`No` modes, no continuity inspection or activation blocking, age-based release retention, quiet outcomes without native host diagnostics.
- `cli-uninstall`: no resident hosts or supervisors to stop.
- `owned-ui-settings`: `Update` offers `Auto` and `No`; the Tab Bar section, resident settings, and `Time format` are removed.
- `custom-session-viewport`: submitted prompts, pinned rows, and compaction headers carry no timestamp.
- `owned-pi-ui-foundation`: the restart-ready status is the only update UI; no popup, blocked status, or resident reconnect semantics.
- `continuous-integration`: no native build, certification, chaos, fidelity, parity, or cross-compilation lanes.

### Removed Capabilities

- `multi-agent-tabs`, `resident-terminal-host`, `resident-tab-reliability`: resident tabs and the native terminal host are gone.
- `agent-supervision`, `launch-instance-lifecycle`: there is no supervisor, cohort coordination, launch guardian, or native containment.

## Impact

- **Removed code:** `native/`, `src/foundation/{resident-tabs,supervision,launch-guardian,process-containment,protocol,storage}`, `src/features/resident-tab`, `src/composition/{resident-tab-bridge,utility-tab}.ts`, `src/cli/{tabs,tabs-request}.ts`, `bin/{supervisor,guardian,tab-launch-context}.js`, and the resident parts of `src/foundation/release`, `src/foundation/launch-context`, `src/foundation/lifecycle`, the session shell, the Pi component adapters, settings declarations, and product-identity environment names.
- **Rewritten code:** the `bin/cli.js` and `bin/ui.js` launch path, `src/foundation/release/bootstrap.ts`, release retention, `src/foundation/session-writer-lock`, update observation, and settings migration.
- **Removed tooling:** terminal-host build/probe/proof/measure/chaos/parity scripts, native CI and publish steps, Rust/Zig toolchain pins, provenance and proof-gate policies, and the size-ratchet and startup-graph baseline entries for removed units.
- **Documentation:** README Launch/Tabs/Update sections, `docs/features/launch-profiles.md`, `docs/architecture/boundaries.md`, `docs/architecture/project-structure.md`; resident, terminal-host, process-guardian, and launch-instance documents are deleted.
- **Users:** one command, one agent per terminal, automatic updates applied on restart, no resident processes left behind.
