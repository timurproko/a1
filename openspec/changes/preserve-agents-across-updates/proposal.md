## Why

After self-update, bare A1 launches the activated release's independent resident namespace. Agents from the previous release may still be working, but the new workspace does not expose them. Following the installed-update restart instruction therefore appears to lose every running agent and can leave those processes inaccessible from the ordinary UI.

## What Changes

- Give the canonical A1 profile a durable workspace that references its release-scoped tabs without replacing their separate host, credential, registry, and process authorities.
- On ordinary relaunch, show the updated workspace with all previously open resident Agent tabs, their names, order, selection, sessions, and live control, including agents still executing on retained releases.
- Add an explicit verified source-cohort routing path rather than allowing arbitrary cross-release attachment or pretending an old process runs new code. New Agents and utilities execute on the selected release.
- Move supported idle Agents to that release through a durable, fenced, single-writer handoff. Busy Agents remain running and controllable until an atomic safe boundary permits migration; no active turn is killed to satisfy an update.
- Preserve drafts, pending-input identity, session configuration, and private recovery artifacts through the handoff without replaying an already dispatched prompt.
- Recover interrupted handoffs idempotently, keep blocked tabs visible, and retain all source/target artifacts until their process and recovery obligations end.
- Recover access to supported already-running release-scoped predecessors on the first fixed launch. A predecessor lacking safe-handoff support remains accessible and visibly pending rather than being terminated or silently omitted.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `resident-terminal-host`: Add profile-workspace continuity, explicitly scoped source-cohort routing, safe per-Agent migration, crash recovery, and retention while retaining release-local host authority.
- `cli-self-update`: Require ordinary post-update relaunch to preserve access to the profile's existing resident Agents instead of opening an unrelated empty workspace.
- `owned-pi-ui-foundation`: Present accurate per-Agent upgrade and recovery states without confusing UI version with the version of a still-running Agent.

## Impact

- Native resident scope, attach routing, registry/lifecycle, bridge/controller boundaries, role protocol and release retention under `native/terminal-host/`.
- Resident launch, private recovery, session writer admission, release selection and update integration under `src/foundation/`, `src/composition/`, and the owned shell/engine bridge.
- Targeted deterministic and process-crash tests plus exact-package source-to-target update/relaunch coverage on Windows x64, Linux x64, and macOS arm64, including real published predecessors rather than candidate-only copies.
- Architecture documentation currently declaring automatic handoff out of scope must be reconciled during implementation. No user configuration, credentials, or session storage roots move, and no production process or state is changed during investigation.

## Scope Boundaries

This change covers resident Agent continuity across application update/relaunch in the same OS login session. It does not hot-swap running code, migrate arbitrary tool process memory, interrupt an unfinished turn, absorb `a1 solo` or external Pi writers into resident tabs, restore tabs after reboot/logout, or enable execution of obsolete private-launch contracts. Existing solo processes remain unaffected and their persisted sessions remain normally resumable.
