## Why

A1 promises that agents continue working when their terminal closes and that reopening reconnects to the same workspace. Self-update currently breaks that promise: the new release opens its own resident namespace while previous agents can remain running but inaccessible from the new UI. Update must preserve the running processes, their work, their data and live control, not replace them after waiting for idle.

## What Changes

- Separate the replaceable terminal client/control plane from a minimal persistent Agent execution host. Keep only autonomous work, process/state custody and the stable runtime API in the long-lived component; terminal UI, update orchestration and replaceable workspace policy must not share its lifetime. Installing and reopening an updated A1 client must not restart, stop, suspend or recreate either busy or idle Agents.
- Give the canonical profile one durable workspace independent of client release, preserving Agent/session identities, tab names/order, selection and private recovery references.
- Reconnect the updated client to the same live Agents, holders, tools, retained terminal state, drafts, queued input and outstanding interactions, including work that progressed while the terminal was closed.
- Define a small versioned runtime-control API with a backward-compatible mandatory core, additive optional capabilities, authenticated reconnect, ordered/idempotent command handling and exact process/session identities. Use explicit source-runtime adapters rather than collapsing release isolation or treating matching protocol generations as release equality. New Agents use the selected new release; existing live execution keeps its originating immutable code and process state.
- Make a compatible control path to all affected live runtimes a prerequisite for activation/restart readiness. If it cannot be established, retain a verified usable client and do not announce a completed/restart-ready update that would strand Agents.
- Keep process/recovery artifacts retained across client and coordinator replacement. Concurrent relaunch and interrupted control-plane handoff must not duplicate Agents, replay work or commit an empty workspace.
- Exercise the first fixed launch against actual supported already-running published predecessors, not only candidate-created fixtures. An error tile or inaccessible tab does not satisfy seamless restoration.
- Preserve predictable tab-bar transitions across that workspace: every newly visible tab appends after existing tabs, including initializing Agents; existing visible utilities activate in place; utility toggles hide/reveal without unintended order, focus or blank-frame flashes. Keep the already delivered slim Settings/Changelog views unchanged and cover source aggregation plus presentation with automated regression sequences.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `resident-terminal-host`: Add a durable profile workspace and explicit cross-release client routing while keeping live Agent execution and release-local authority unchanged.
- `cli-self-update`: Require continuity-compatible activation and ordinary relaunch, preserving the same live processes rather than migrating them when idle.
- `owned-pi-ui-foundation`: Preserve the existing interactive state after reconnect and base client restart readiness on the actual compatible client activation.

## Impact

- Native resident workspace authority, discovery, attach/controller routing, protocol compatibility and release holds under `native/terminal-host/`.
- Launch/release selection, activation readiness, retained-client recovery and owned client update presentation under `src/foundation/`, `src/composition/`, and the owned shell/engine boundary.
- Targeted workspace, compatibility, process-identity, reconnect and exact-package update tests on Windows x64, Linux x64 and macOS arm64.
- Architecture documentation currently equating client release with the only visible workspace must be reconciled during implementation. User configuration, credentials and session-storage roots do not move.

## Scope Boundaries

This refinement removes automatic per-Agent process migration, idle-boundary restarts, quiescence/checkpoint transfer and pending-Agent-upgrade UI from the original proposal. Migration means transferring client access/control to the existing live workspace, not replacing running execution or copying its memory. Applying new engine code inside an existing Agent process is not promised; doing so would contradict preservation of that process's live state. Existing Agents keep their execution until they are explicitly closed or undergo their ordinary independent crash recovery, not until they merely become idle.

The change covers application update/reconnect in the same OS login session. It does not add reboot/logout restoration, adopt direct solo/external writers into resident tabs, execute obsolete private-launch contracts, or make arbitrary historical protocols compatible by assertion. Unsupported compatibility is an activation blocker, never permission to lose control or data.
