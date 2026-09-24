## Why

Bare `a1` runs exactly one agent, and that agent dies with the terminal window that launched it. To run several agents at once, users have to juggle terminal windows. Closing a window, losing an SSH session, or an A1 crash loses the running turn, and the user then has to find the work again with `a1 --session`.

The user has authorized multi-agent tabs with three requirements:

- agents keep running in the background when the terminal closes, and relaunching `a1` shows them again;
- extensions keep working exactly as they do natively;
- the same tab system must later host any interactive CLI.

A structured, message-based design would satisfy none of the last two. It needs a second system for CLI tabs, and it can never carry an extension's own in-process UI. This change therefore makes every tab a real terminal session: a pseudoterminal that runs the complete, unmodified A1 UI. The session is held by A1's native terminal host, which extends the existing `native/terminal-host` proof (libghostty-vt, portable-pty/ConPTY, crossterm).

References: the v2 prototype (`D:\Backups\pi\v2`) for UX and its child status bridge, and herdr (`D:\Git\herdr`) for resident terminal-server architecture. Neither is a dependency.

## What Changes

- Bare `a1` presents a one-row tab strip. Every tab is an independent terminal session running the full A1 owned UI with its own Pi agent, so every Pi extension, custom extension UI, and A1 feature behaves exactly as in single-agent A1 today.
- Users can create, switch, jump to, reorder, rename, and close tabs by keyboard, mouse, and slash command. Rename is inline and becomes the Pi session name. Closing a busy tab asks for confirmation. A closed tab's session stays resumable.
- Tab status (working, needs input, done-unseen, error, crashed, restoring) comes from a structured **tab bridge**: A1 running inside the tab reports engine state to the host. It is never scraped from the screen. Optional bell or terminal notifications signal background attention.
- The native terminal-host binary gains three roles:
  - **Resident server:** a per-user, per-profile daemon. It owns the tab registry, topology, and client fan-out.
  - **Session holder:** one small native process per tab. It owns that tab's pseudoterminal, child process tree, and retained terminal model, so a server crash never kills a tab.
  - **Attach client:** the foreground `a1` surface. It draws the tab strip and the active tab's retained screen, and routes input.
- Terminal bytes, input, and rendering stay entirely in native code. Node never relays them.
- Quitting `a1` (`/quit`, `Ctrl+C` twice, `Ctrl+D`, or `Alt+Q`) detaches, and every tab keeps running. Relaunching `a1` in any terminal reattaches from retained screen state, including output produced while detached.
- Robustness:
  - The resident processes are started detached on Windows, macOS, and Linux. This includes escaping kill-on-close jobs and the macOS GUI bootstrap namespace.
  - The endpoint bind acts as a single-instance lock, and the endpoint is owner-only and token-authenticated.
  - The registry is durable and fsynced.
  - The server self-heals while holders keep running. Crashed tabs restart within a bounded budget from their Pi session.
  - After a reboot, tabs are restored from their sessions. Interrupted prompts are never resent.
  - Protocol generations are stable, so `a1 update` never kills tabs.
  - Limits and rotated diagnostics are bounded.
- New CLI maintenance forms: `a1 tabs` (list), `a1 tabs stop <id>|--all`, and `a1 tabs host status|stop`.
- The architecture is tab-kind neutral. Arbitrary CLI tabs become a small follow-up change, without redesign.

## Capabilities

### New Capabilities

- `multi-agent-tabs`: the bare-A1 tab strip, tab lifecycle and naming, bridge-derived status and attention, input routing and shortcuts, commands, detach-on-quit, and reattach presentation.
- `resident-tab-reliability`: the reliability contract. It covers:
  - one process per failure domain, crash-only fail-fast processes, and control loops that never block;
  - flow-controlled, never-silently-lossy terminal I/O;
  - supervision of liveness separate from progress, with unresponsive and stalled states;
  - level-triggered reconciliation, and epoch fencing of stale servers;
  - per-class durability guarantees: a fsynced prompt journal, fsync of settled turns, session identity recorded before input, a last-screen snapshot, and OS-enforced session leases;
  - diagnostics that survive the failures they describe;
  - release-gating simulation, crash-point, fuzz, and 24-hour chaos-soak verification against latency objectives.
  Each requirement answers a failure mode found in the v2 prototype.
- `resident-terminal-host`: the native resident server, per-tab session holders, and attach client. It also covers their protocols, the tab bridge, the durable registry, ownership and authentication, platform detachment, crash, reboot, and update recovery, limits, diagnostics, and certification.

### Modified Capabilities

- `a1-shell`: bare `a1` becomes the native attach client over resident A1 tabs, while `a1 pi` keeps the direct owned pipeline. The bare-A1 launch instance owns only the foreground client.
- `launch-instance-lifecycle`: names the resident terminal host as the separately specified resident capability. Bare `a1` reattaches instead of starting fresh.
- `cli-session-resume`: bare `a1` reattaches, or starts one fresh tab when none exist. `--session` opens or focuses that session as a tab.
- `owned-pi-ui-foundation`: graceful quit inside a resident tab detaches the client instead of stopping the agent. `a1 pi` is unchanged.
- `launch-profiles`: concurrent bare-A1 invocations of one profile share that profile's resident host.
- `agent-supervision`: cohort updates and release retention account for resident host, holder, and tab processes.

## Impact

- **Native:**
  - `native/terminal-host` grows from a 2×2 proof into `server`, `holder`, and `attach` roles in one binary. The fixed 2×2 proof layout is removed.
  - It is packaged per platform with hash verification and provenance, like `process-guardian`.
  - `process-guardian` job limits allow only explicit resident breakaway.
- **Node:**
  - Launch routing (`src/cli`, `src/features/launch`) starts the resident host from the pre-guardian bootstrap and runs the attach client as the bare-A1 UI root.
  - A new tab-mode entry for `bin/ui.js` adds the tab bridge (status, session identity, name, detach, new-tab, and visibility messages).
  - Tab settings are added.
- **Specs:** two new capabilities and six modified ones.
  - `evolve-bare-a1-into-multi-agent-workspace` is superseded for structured tabs and for single-pane composed terminal tabs. Only split layouts and the multiplexer presentation remain held there.
- **Governance:**
  - The terminal-host boundary becomes production code: PTY, VT, and input authority are native-only.
  - Node still carries no PTY, `node-pty`, `@xterm`, or byte relay.
  - A new `terminal-host` integration-test owner is added.
- **Unchanged:** `a1 pi`, Pi packages (unpatched), and the owned UI as the only A1 renderer inside every tab.
- **Rollback:** `tabs.resident: false` restores today's direct single-agent bare A1. Records are kept.
