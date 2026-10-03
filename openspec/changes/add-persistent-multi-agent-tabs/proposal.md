## Why

Bare `a1` runs one foreground agent inside the launch instance, so closing its terminal ends the agent and running several agents means juggling terminal windows. The user has authorized terminal-session tabs: each tab runs the complete A1 owned UI so extension surfaces remain native, the same native host can later support arbitrary CLI sessions, and detached work can be reattached.

This change delivers the first bounded vertical slice on Windows x64. Resident tabs are explicit opt-in through `tabs.resident`, which remains `false` by default; default enablement, macOS/Linux support, arbitrary CLI tabs, and split layouts require separately reviewed follow-up changes and their own certification.

References: the v2 prototype (`D:\Backups\pi\v2`) for UX and its child status bridge, and herdr (`D:\Git\herdr`) for resident terminal-server architecture. Neither is a dependency, and archived workspace source is historical evidence only rather than code to restore.

## What Changes

- Bare `a1` on Windows x64 can opt into a one-row native tab strip. Every tab is an independent pseudoterminal session running the complete A1 owned UI with its own Pi agent, transcript, editor, extensions, model state, and cwd.
- The native terminal-host gains three isolated roles in one executable:
  - a per-profile resident `server` that owns registry and tab topology;
  - one resident `holder` per tab that owns its ConPTY, process tree, retained libghostty-vt model, and bounded input/output queues; and
  - a foreground `attach` client that owns the outer terminal, tab strip, active surface, shortcuts, and restoration.
- The endpoint remains the discovery rendezvous, while an owner-only operating-system writer lease is the single registry-writer authority. A replacement server must verify and terminate an unresponsive recorded owner before acquiring that lease; every registry commit is made under the lease and current epoch.
- One owner-only profile secret derives per-tab, per-incarnation credentials. The registry stores only derivation inputs and verified process identities, so a replacement server can authenticate surviving holders and bridges without persisting tab secrets.
- Each tab has one input-controller lease. Holder-ordered sideband ownership markers reach the A1 child before input from a new controller, allowing `/quit`, `Ctrl+D`, and other client-scoped bridge requests to identify the exact client without sending terminal bytes through Node.
- Tab status (working, needs input, done, error, crashed, restoring) comes from a structured tab bridge and is never scraped from terminal cells. Status icons are the only attention signal.
- `Ctrl+C` twice detaches the foreground client from any tab. `/quit` and empty-editor `Ctrl+D` detach the current input-controller client while the tab keeps running. Closing a tab remains a separate, confirmed stop operation.
- The resident registry, prompt journal, session lease, last-screen recovery snapshot, epoch fencing, process-incarnation checks, watchdogs, bounded restart policy, and deterministic failure testing provide the reliability baseline for the opt-in preview.
- Windows process detachment escapes supported kill-on-close jobs only after verified containment checks. If survival cannot be established, A1 reports degraded mode or falls back to the direct single-agent experience instead of claiming persistence.
- Updates retain immutable releases used by resident processes. This slice keeps a compatible resident cohort running until its tabs stop; automatic server handoff, idle release recycling, and default enablement are follow-up work.
- The text-terminal contract includes the keyboard, mouse, paste, clipboard, hyperlink, cursor, Unicode, and extension surfaces certified by the host. Inline terminal image protocols are not supported in this slice; extensions receive the existing text fallback, so the change does not claim image-protocol parity.
- New maintenance forms are `a1 tabs`, `a1 tabs stop <id>|--all`, `a1 tabs host status|stop`, and `a1 tabs doctor`.

## Capabilities

### New Capabilities

- `multi-agent-tabs`: the opt-in bare-A1 tab strip, lifecycle, names, bridge-derived status, controller-attributed commands, shortcuts, detach behavior, and retained reattachment.
- `resident-tab-reliability`: isolated failure domains, non-blocking control loops, flow control, writer and session leases, epoch fencing, durability classes, diagnostics, and the verification required before broader enablement.
- `resident-terminal-host`: the Windows x64 resident server, per-tab holders, attach client, protocols, registry, credentials, ownership checks, detachment, recovery, limits, maintenance commands, and preview certification.

### Modified Capabilities

- `a1-shell`: bare `a1` may enter the resident attach path only when the supported Windows preview is explicitly enabled; direct owned A1 and `a1 pi` remain available.
- `launch-instance-lifecycle`: names the resident terminal host as the only separately specified breakaway capability; attach clients remain launch-instance owned.
- `cli-session-resume`: a selected session opens or focuses a resident tab when the preview is enabled.
- `owned-pi-ui-foundation`: tab-mode quit routes detach the attributed client instead of stopping the agent.
- `launch-profiles`: concurrent bare-A1 clients of one profile share one resident host while keeping independent viewed tabs.
- `agent-supervision`: release retention accounts for live verified resident processes without making them members of a supervisor cohort.

## Impact

- **Native:** `native/terminal-host` evolves from the fixed 2×2 proof into Windows x64 `server`, `holder`, and `attach` roles. The existing terminal-query fix and the Windows CI owner delivered by #588 remain the implementation baseline.
- **Node:** launch routing starts or joins the host only when `tabs.resident` is enabled; `bin/ui.js --tab` adds the structured bridge, prompt journal integration, controller attribution, and tab-mode quit behavior.
- **Security:** owner-only endpoint and lease files, a persisted profile secret, derived ephemeral tab credentials, native process-start identity, and current-epoch checks are all required before adoption, signalling, termination, or registry mutation.
- **Validation:** ordinary PR CI keeps deterministic simulation, crash-point tests, protocol/surface fuzzing, and bounded Windows chaos coverage. A separately authorized isolated-worker 24-hour Windows soak and exact-package physical acceptance are prerequisites for a later default-on change, not hidden work in this opt-in delivery.
- **Held plan:** `evolve-bare-a1-into-multi-agent-workspace` is reduced to split-layout/multiplexer scope. Its structured runtime, semantic workspace, single-pane terminal host, arbitrary CLI-tab, and old proof-gate plans are superseded rather than restored.
- **Unchanged:** `a1 pi`, Pi packages, installed Pi source, non-Windows bare A1, and direct bare A1 while `tabs.resident` is `false`.
- **Rollback:** setting `tabs.resident: false` restores the direct single-agent path and preserves tab/session records.
