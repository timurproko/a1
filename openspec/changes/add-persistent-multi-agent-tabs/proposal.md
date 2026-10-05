## Why

Bare `a1` runs one foreground agent inside the launch instance, so closing its terminal ends the agent and running several agents means juggling terminal windows. The user has authorized terminal-session tabs: each tab runs the complete A1 owned UI so extension surfaces remain native, the same native host can later support arbitrary CLI sessions, and detached work can be reattached.

This change delivers the first bounded vertical slice on Windows x64. Resident tabs are explicit opt-in through `tabs.resident`, which remains `false` by default; default enablement, macOS/Linux support, arbitrary CLI tabs, and split layouts require separately reviewed follow-up changes and their own certification.

References: the v2 prototype (`E:/Backups/pi/v2`) for UX and failure scenarios, and herdr (`E:/Git/herdr`, inspected at `e5443f07`) for resident terminal-server mechanisms. Neither is a dependency, and archived workspace source is historical evidence only rather than code to restore. Their benchmarks and tests are not A1 acceptance evidence.

This is session hosting, not collaborative task orchestration. Automatic worktree assignment, conflicting-edit prevention, delegation, inter-agent messages/results, and cost/approval coordination require separate planning. Separate processes do not isolate repository writes.

The 2026-10-05 refinement is planning-only: retain draft PR #586, sequence implementation into six evidence-bearing milestones, and resolve ownership and durability contracts before code. It grants no implementation, canonical-spec synchronization, finalization, or merge authority.

## What Changes

- Bare `a1` on Windows x64 can opt into a one-row native tab strip. Every tab is an independent pseudoterminal session running the complete A1 owned UI with its own Pi agent, transcript, editor, extensions, model state, and cwd.
- The native terminal-host gains three isolated roles in one executable:
  - a per-profile resident `server` that owns registry and tab topology;
  - one resident `holder` per tab that owns its ConPTY, process tree, retained libghostty-vt model, and bounded input/output queues; and
  - a foreground `attach` client that owns the outer terminal, tab strip, active surface, shortcuts, and restoration.
- The endpoint remains the discovery rendezvous, while an owner-only operating-system writer lease is the single registry-writer authority. A replacement server must verify and terminate an unresponsive recorded owner before acquiring that lease; every registry commit is made under the lease and current epoch.
- One owner-only profile secret derives per-tab, per-incarnation credentials. The registry stores only derivation inputs and verified process identities, so a replacement server can authenticate surviving holders and bridges without persisting tab secrets.
- Each tab has one input-controller lease. A transfer must establish a causal boundary across buffered terminal input and the semantic bridge, not merely acknowledge a sideband marker. Client-scoped requests retain their originating controller generation; stale or ambiguous requests are rejected without detaching another client.
- Tab status (working, needs input, done, error, crashed, restoring) comes from a structured tab bridge and is never scraped from terminal cells. Status icons are the only attention signal.
- `Ctrl+C` twice detaches the foreground client from any tab. `/quit` and empty-editor `Ctrl+D` detach the current input-controller client while the tab keeps running. Closing a tab remains a separate, confirmed stop operation.
- The resident registry, prompt journal, session lease, last-screen recovery snapshot, epoch fencing, process-incarnation checks, watchdogs, bounded restart policy, and deterministic failure testing provide the reliability baseline for the opt-in preview.
- Windows resident creation uses an authenticated, fixed-role launch path outside ordinary containment; it does not enable job-wide breakaway on launch-instance or tab-child jobs. Verified detachment may use WMI for foreign kill-on-close jobs. If survival cannot be established, A1 uses the direct fallback with one notice rather than claiming persistence.
- Session-writer leases cover Windows A1-owned runtimes, including direct/fallback and Pi-comparison launches, without starting a resident host. Locks follow the actual writer lifetime and canonical file identity, and survive holder loss while a writer remains alive. Unmodified external Pi and arbitrary file writers are outside this cooperative guarantee.
- Submitted prompts require a durable-before-dispatch journal with stable submission IDs; drafts checkpoint periodically with a maximum one-second dirty interval during healthy storage, not only after inactivity. Structured diagnostics are separated from private content-bearing recovery artifacts.
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
- `cli-session-resume`: a selected session opens or focuses a resident tab when the preview is enabled; direct/fallback resume and session switching honor the shared Windows writer lease.
- `owned-pi-ui-foundation`: tab-mode quit routes detach the attributed client instead of stopping the agent.
- `launch-profiles`: concurrent bare-A1 clients of one profile share one resident host while keeping independent viewed tabs; Windows A1-owned runtimes share only the file-writer guard when targeting the same canonical session, including across profiles.
- `agent-supervision`: release retention accounts for live verified resident processes without making them members of a supervisor cohort.

## Impact

- **Native:** `native/terminal-host` evolves from the fixed 2×2 proof into Windows x64 `server`, `holder`, and `attach` roles. The existing terminal-query fix and the Windows CI owner delivered by #588 remain the implementation baseline.
- **Node:** launch routing starts or joins the host only when `tabs.resident` is enabled; `bin/ui.js --tab` adds the structured bridge, prompt journal integration, controller attribution, and tab-mode quit behavior.
- **Security:** owner-only endpoint and lease files, a persisted profile secret, derived ephemeral tab credentials, native process-start identity, and current-epoch checks are all required before adoption, signalling, termination, or registry mutation.
- **Validation:** the opt-in preview requires deterministic simulation, crash-point tests, protocol/surface fuzzing, bounded Windows chaos, and exact-package physical acceptance. The separately authorized isolated-worker 24-hour Windows soak is an additional prerequisite for a later default-on change. Existing pending 2×2 evidence is neither accepted nor a substitute for resident-tab evidence; reconcile its documentation without rewriting historical verdicts.
- **Held plan:** `evolve-bare-a1-into-multi-agent-workspace` is reduced to split-layout/multiplexer scope. Its structured runtime, semantic workspace, single-pane terminal host, arbitrary CLI-tab, and old proof-gate plans are superseded rather than restored.
- **Direct-mode boundary:** `a1 pi` remains direct with no host, holder, strip, or bridge. Direct bare A1 remains available when `tabs.resident` is `false`. Their only shared Windows change is conflict-safe session-file writer admission; unrelated sessions remain concurrent. Pi packages, installed Pi source, and non-Windows runtime paths remain unchanged.
- **Rollback:** setting `tabs.resident: false` restores the direct single-agent path and preserves tab/session records; it does not bypass a live session-writer lease.

## Delivery Milestones

All six milestones belong to this same draft change and begin only after explicit implementation approval. Intermediate demonstrations do not authorize shipping or merge.

1. **Contracts and baseline:** reconcile current `develop`, ownership, recovery, protocol, and certification boundaries; define the Windows launch, lock-lifetime, and controller-barrier proof obligations.
2. **One persistent tab:** full A1 text UI survives terminal/client closure and reattaches with retained screen and working input.
3. **Failure isolation:** two tabs survive server loss; one holder's death or blocked I/O leaves its sibling healthy; recovery cannot create duplicate writers.
4. **Safe recovery:** prove first-turn journal recovery, continuous draft checkpoints, reboot restore, corrupt-state handling, and non-lossy input admission.
5. **Complete UX:** finish controller transfer, status, tab actions, extension text fidelity, then auto-naming, prewarm, and idle suspension without changing their recorded defaults.
6. **Packaged certification:** release retention, maintenance, bounded fault testing, exact-package Windows evidence, direct-mode rollback, and explicit deferred gates.

Detailed tasks and exit evidence are in `tasks.md` and the design's migration plan.
