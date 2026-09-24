## Why

Bare `a1` runs exactly one agent, and that agent dies with the terminal window that launched it. Users who want several agents working at once must juggle terminal windows, and closing a window, losing an SSH session, or an A1 crash loses the running turn and forces a manual `a1 --session` to find the work again.

The user has explicitly authorized the multi-agent structured-tab scope that `evolve-bare-a1-into-multi-agent-workspace` held, and has added a requirement that held change never specified: agents must keep running in the background when the terminal closes, and relaunching `a1` must show them again. This change carries that scope as a focused, independently deliverable plan. The composed-terminal, PTY-pane, split-layout, and terminal-host proof scope of the held change remains on hold and is not touched.

The UX reference is the v2 prototype (`D:\Backups\pi\v2`: tab strip, status glyphs, inline rename, overflow menu, detach-on-quit). The process-architecture reference is herdr (`D:\Git\herdr`: one detached per-user server, socket-as-lock single instance, snapshot-then-delta reattach, stable endpoint generation across upgrades, Windows job-object escape). Neither is a dependency.

## What Changes

- Bare `a1` presents a one-row tab strip above the existing custom viewport. Each tab is one independent Pi agent session with its own transcript, editor draft, queue, model, thinking level, working state, and cwd.
- Users can create, switch, jump to, reorder, rename, and close tabs from the keyboard, mouse, and slash commands. Rename is inline and becomes the Pi session name; close asks for confirmation when the agent is busy and stops only that agent, leaving its session resumable.
- Background tabs show structured status (working, needs input, done-unseen, error, crashed, restoring) derived from engine events, never from screen text. Needs-input and done transitions can optionally ring or emit a terminal notification.
- A new per-user, per-profile **resident agent host** owns every tabbed agent. It is started detached from the terminal on Windows, macOS, and Linux (including escape from kill-on-close job objects and the macOS GUI bootstrap namespace), holds a single-instance named-pipe/socket lock, and persists a durable agent registry.
- Each agent runs in its own **agent worker** process that hosts one Pi `AgentSessionRuntime` through the existing public-SDK `PiEngineAdapter` and speaks a versioned structured protocol to the host. A crashing agent cannot take down its siblings, the host, or the UI.
- The foreground `a1` becomes a thin **client** of the host. It renders through the existing owned UI pipeline using a remote engine adapter fed by an authoritative snapshot followed by sequenced events. Quitting `a1` (`/quit`, `Ctrl+C` twice, `Ctrl+D`) detaches; agents keep running. Relaunching `a1`, in the same or another terminal, reattaches and shows every running agent.
- Robustness contract: bounded restart with backoff for crashed workers, host self-healing after its own crash while workers keep running, restore-from-session after reboot, no replay of interrupted tool calls, bounded queues and backpressure, per-agent and global limits, rotated diagnostics, and a stable host protocol generation so `a1 update` never kills running agents.
- New CLI maintenance forms: `a1 agents` (list), `a1 agents stop <id>|--all`, and `a1 agents host status|stop`.

## Capabilities

### New Capabilities

- `multi-agent-tabs`: the bare-A1 tab strip, tab lifecycle and naming, status and attention presentation, input routing between tabs, shortcuts, commands, detach-on-quit, and reattach presentation.
- `resident-agent-host`: the detached host, agent workers, host/worker/client protocols, durable registry, single-instance and ownership rules, crash, reboot, and update recovery, limits, diagnostics, and platform detachment.

### Modified Capabilities

- `a1-shell`: the bare-A1 launch instance owns the foreground UI client only; tabbed agents belong to the explicit resident capability.
- `launch-instance-lifecycle`: names the resident agent host as the separately specified resident capability that survives instance closure, and lets bare `a1` reattach instead of starting fresh.
- `cli-session-resume`: bare `a1` reattaches to resident agents (or starts one fresh tab when none exist); `--session` opens or focuses that session as a tab.
- `owned-pi-ui-foundation`: graceful quit in bare A1 detaches from resident agents instead of stopping them; `a1 pi` keeps stopping its single agent.
- `launch-profiles`: concurrent bare-A1 invocations of one profile share that profile's resident host while their foreground instances stay independent.
- `agent-supervision`: cohort updates and release retention account for resident hosts and workers instead of terminating them.

## Impact

- **Code:** new `src/foundation/agent-host/` (host process, registry, protocol, worker supervision), `src/integrations/pi/engine/` worker entry and remote engine adapter, `src/features/multi-agent-tabs/` (tab model, reducer, strip component, commands), launch routing in `src/cli/` and `src/features/launch/`, new `bin/agent-host.js` and `bin/agent-worker.js`, a `--spawn-resident` mode in `native/process-guardian`, and a per-profile `agent-host.sqlite3` registry kept separate from `control.sqlite3`, so a newer release's migrations never break a running older host.
- **Specs:** two new capabilities and six modified ones, listed above. `evolve-bare-a1-into-multi-agent-workspace` keeps its composed-terminal scope on hold. Its structured-tab and reconnection requirements are superseded by this change and are noted as such there.
- **Governance:** `check-architecture.mjs` gains an agent-host boundary. There is still no PTY, `node-pty`, `@xterm`, or terminal-byte relay in production. A new `agent-host` integration-test owner is added.
- **Unchanged:** `a1 pi` stays a single non-detachable instance. Pi packages are not patched. The owned rendering pipeline stays the only renderer.
- **Rollback:** the setting `agents.resident` set to `false` restores today's in-process single-agent bare A1. Persisted records remain readable.
