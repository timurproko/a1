# Resident tabs â€” architecture and roadmap

Status: implemented. Milestones 1–6 deliver resident tabs as the bare-`a1` route on Windows x64, Linux x64, macOS arm64, and macOS x64, with `a1 solo` as the direct single-agent route and `a1 tabs` for maintenance. Every release carries a verified terminal host for each of those platforms. Certification is recorded per platform from exact-package evidence (see [Release state and known gaps](#release-state-and-known-gaps)); it is evidence, not a runtime gate. Discovery or verification failure falls back to the direct path with one notice. This document is the living design for multi-agent tabs; each change cites the decisions it implements and updates this file when a decision changes. The one target requirement no milestone has delivered yet is kept in [`resident-tabs-requirements.md`](resident-tabs-requirements.md).

## Context

Today bare `a1` runs as a chain: `bin/cli.js`, then a detached per-release **supervisor**, then the foreground Node **launch guardian**, then its in-process native **process-guardian addon**, then `bin/ui.js`. That last Node process hosts one in-process Pi `AgentSessionRuntime` behind the owned UI. The addon puts the UI in kill-on-close containment, so closing the terminal kills the agent; no process-guardian executable sits in the chain. `launch-instance-lifecycle` requires that behavior and reserves "a separately specified explicit resident capability" for anything that must survive. This design defines that capability.

The user set three product constraints:

1. Agents survive terminal closure, and relaunching reattaches.
2. Extensions work as natively as possible, including extensions that render their own in-process UI.
3. The same tab system must next host arbitrary interactive CLIs.

A structured, message-based agent protocol cannot meet (2), because an extension's custom UI component is code running inside the agent process. It also forces a second, unrelated system for (3). Every tab is therefore a **terminal session**: a pseudoterminal running the complete A1 owned UI in "tab mode". Native extension components retain the declared text-terminal behavior; inline image protocols are explicitly outside the first version and use the existing text fallback.

The first version is deliberately narrower than the eventual product. It initially targeted Windows x64, Linux x64, and macOS arm64, with macOS x64 added by the later recorded decision; those are the targets A1 packages for the native addons. Resident tabs are the bare-`a1` route and argument-free `a1 solo` is the explicit direct-mode opt-out. Restoring tabs after reboot or logout, another architecture or platform, automatic resident-cohort upgrades, arbitrary CLI tabs, and split layouts each require a later change and their own evidence.

Existing assets:

- **`native/terminal-host`** is a working in-terminal host. It uses `libghostty-vt` pinned at `c5a21edf`, `portable-pty` 0.9.0 (ConPTY on Windows, Unix PTYs elsewhere), crossterm 0.29, and an A1-owned damage-aware frame composer. Its retained model and native encoders came from the fixed 2Ã—2 proof; milestone 2 removed that interactive proof path and moved the model into the resident holder/attach roles. Three-platform certification remains separate from implementation.
- **The supervisor, process-guardian addon, and launch guardian** provide the patterns for detached spawn, addon-backed process-start inspection, an endpoint probe with join-the-winner, and atomic metadata. The process-guardian addon has Windows, macOS, and Linux implementations.
- **The 2Ã—2 spike evidence** in [`evidence/terminal-host-spike/`](evidence/terminal-host-spike/) is historical. Its verdicts stay pending and are not evidence for this design.

References:

- **v2 prototype** (UX, and the child status bridge):
  - A detached daemon owns a PTY per agent and a headless emulator.
  - An in-child bridge reports sequenced work status, session file, and name, and enforces session leases.
  - Quit detaches.
  - Lessons: restore without a gate duplicated agents; painting background frames stalled the foreground; forwarding `Ctrl+C` to the child made `Ctrl+C+C` kill the agent; there was no needs-input state; there was no close confirmation; `ConPTY` dies with the process that created it.
- **herdr** (resident architecture):
  - A single Rust binary with client and server roles.
  - The socket bind is the lock, backed by an ownership marker and an owner-only DACL.
  - `DETACHED_PROCESS` plus a WMI launch to escape SSH kill-on-close jobs (#2008). A macOS per-user bootstrap port (#4100).
  - Server-side libghostty-vt models. Reattach sends a full surface, then patches.
  - A one-slot render lane for slow clients.
  - A stable endpoint generation, so updates keep the server running.
  - A persisted layout, with agents resumed after a crash.
  - Its documented weakness is that one server crash kills every pane (#453, #276).

### Reference audit and evidence boundary (2026-10-05)

The read-only review used A1 `develop` at `b42b3c9e`, PR #586 at `8fdb7361`, `E:/Backups/pi/v2`, and herdr at `e5443f07`. No prototype execution or native certification was performed. PR #586 contains planning artifacts only; its skipped draft checks are not product evidence.

- v2's `agent/multiagent/daemon.ts` owns all PTYs, performs synchronous spawn/tree-kill work, and has a daemon-wide stall watchdog. `daemon-logic.ts` truncates stalled input to the newest 8192 code units. `protocol.ts`/`child-bridge.ts` also carry rendered frames, creating a second screen source. Retain UX and regression scenarios, not these mechanisms or logic hot-swapping.
- v2's `startup-benchmark.md` records warm creation p50 13 ms / p95 41 ms and an outer restart of 6.255 s. Those measure different paths and are not performance promises for A1.
- Current herdr's `src/platform/windows.rs`, `src/server/client_transport.rs`, and `src/server/render_stream.rs` are references for detachment, bounded transport, and surface revisions. `src/pty/actor.rs` uses threads, not one process per PTY. Unix-only descriptor handoff and Unix-gated detach/multi-client tests do not certify Windows survival. `src/persist/writer.rs` synchronizes recovery copies, while ordinary session saving in `src/persist/io.rs` still uses unsynchronized write-and-rename.
- A1's existing prompt history is asynchronous and can skip writes; it is not the durable-before-dispatch journal. The native host is a fixed 2Ã—2 proof, not resident infrastructure. Its historical acceptance record still has pending technical/physical verdicts and must not be relabelled as accepted.
- Before implementation, reconcile current `develop`, including #588's terminal-query/CI ownership and #667's surviving-owner terminal restoration. Update architecture/proof documentation during approved implementation to distinguish this single-pane resident certification from future split certification, preserving historical evidence unchanged.
- herdr's Unix paths (socket bind as lock, Unix detach, the macOS per-user bootstrap port fix in #4100) are references for the macOS and Linux roles, not evidence for them.

### Milestone 2 pinned launch contract (2026-10-11)

- Bare `a1` from a terminal always requests the resident tab route; with piped or redirected standard input or output it runs the direct UI without probing the host, because the attach client needs a terminal to size and own. Tab enablement is not persisted or configurable; host discovery or verification failure uses the bounded direct single-agent fallback.
- The `tabsAutoName` setting lives in the flat `a1` object of the global agent `settings.json`. A stored legacy `tabsMax` value is preserved as unknown compatibility data but never limits creation or appears in Settings.
- The host artifact resolves to `dist/native/<platform>-<arch>/terminal-host.node`, with hermetic `A1_TERMINAL_HOST_PATH` only when `A1_DEV_INSTANCE_ID` is present; the fixed role entry is `dist/foundation/resident-tabs/host-entry.js`, and discovery may use `A1_TABS_ENDPOINT`.
- Tab children consume and erase `A1_TAB_ID`, `A1_TAB_TOKEN`, and `A1_TAB_ENDPOINT` before loading A1, Pi, extensions, or tools.
- Client-scoped bridge detach binds `clientId` and `controllerRevision` captured when the command is admitted. The additive generation-1 `attachment` and `bridge.request` fixtures freeze that shape.
- Launch fallback reasons are bounded to unsupported platform, no interactive terminal, missing artifact, failed probe, incompatible generation, unreadable registry, blocked recovery, unverified launch, and startup timeout. Fallback preserves resident records and presents exactly one direct-session notice.
- Until milestone 4 adds quarantine and history recovery, an unreadable registry fails closed and is left untouched.
- Milestone 2 multiplexes authenticated attach, holder, bridge, and probe roles over the owner endpoint and sends a replaceable full current surface through each client's single-slot render lane. Dedicated holder endpoints and patch deltas remain multi-tab optimizations rather than claims of this one-tab milestone.
- The native server, holder, attach, bridge reconnect, child containment, and role integration fixture are implemented. Milestone 2 records complete Windows x64 terminal-close and OpenSSH-loss evidence; macOS arm64 and Linux x64 physical terminal/SSH evidence remains uncertified and is an explicit milestone-6 gate rather than an inferred milestone-2 result.

### Milestone 3 failure-isolation contract (2026-10-14)

- The native `core/server.rs`, `core/holder.rs`, and `core/attach/` state machines are deterministic and I/O-free; the production holder uses the holder core for bounded input admission and ordered writer effects, the production server uses the server core for heartbeat supervision, and the attach client steps the attach core for every interaction mode (popup, rename, drag), shortcut, deferred input, and server answer while `roles/attach.rs` keeps the connection, outer terminal, encoders, and presentation. Blocking identity/termination work runs through the bounded worker shell with deadlines and stale-incarnation filtering.
- Every attach, server, and holder role has an independent 15-second watchdog. Watchdog records are bounded, timestamped, owner-only metadata under the profile runtime directory; fault-only role freezes are refused by non-test release builds.
- Holders read PTY output continuously, use one bounded input authority, reserve complete pastes before delivery, and emit a typed uncertain-delivery result after an admitted write failure. Each holder independently refreshes the server's latest complete retained surface even while hidden. Server-to-client control lanes are frame/byte bounded, render lanes retain one replaceable full current surface, and only the viewed tab is delivered to each attach client.
- Server replacement is serialized by `server-start.lock` in the profile runtime directory. Recovery verifies the recorded native owner before termination, waits boundedly for the registry-writer lease, increments the durable epoch, derives holder credentials, and re-admits only exact holder/child identities and incarnations. A durable three-start/sixty-second budget stops automatic replacement; explicit `--restart` clears it.
- Registry records now retain holder and child pid/start identities and holder incarnation. Replacement treats unverifiable records as `holder-lost`; it never starts a duplicate writer from uncertain state.
- Concurrent starts use an internal default of 2 and hard cap of 8. The server spaces starts by at least 250 ms and requests graceful tab shutdown before verified forced termination; open-tab count has no user-visible quota.
- All A1-owned Pi runtimes use one profile-neutral session-writer guard regardless of launch mode. A new target is reserved by canonical location, created as an empty owner-only placeholder, bound to stable file identity without a release gap, and only then exposed to Pi for session content. Runtime replacement acquires and binds the target before publishing it or releasing the prior writer; conflict paths preserve the source and may explicitly fork.
- The generation-1 holder transport continues to use the authenticated owner endpoint and replaceable full surfaces. Dedicated holder endpoints and patch deltas remain later optimizations and are not milestone-3 claims.

### Milestone 4 crash-recovery contract (2026-10-12)

- The server persists restart intent and the three-in-ten-minute budget before instructing the surviving holder to respawn its child. The holder verifies prior-writer release, preserves its PTY ownership boundary, rotates incarnation credentials, and resumes the recorded session with 1/5/30-second backoff. User-requested restart is explicit and does not consume the crash budget.
- Child-event-loop heartbeat silence is counted only while server, bridge, holder, and child supervision remains continuously healthy. Transport loss resets the observation window. Progress stalls are advisory and never trigger automatic termination. Milestone 5 retires the `tabsUnresponsiveRestartSeconds` and `tabsStallNoticeSeconds` controls and keeps their 120/300-second behavior internal.
- Tab-mode submission is durably journaled before dispatch, correlated with the session entry, synchronized after settlement, and retired idempotently. Recovery reconciles identity and exact text without collapsing duplicate prompts or automatically replaying work. Periodic draft checkpoints expose a degraded state when the one-second healthy-storage envelope cannot be met.
- Registry replacement retries transient failures, quarantines unreadable state, recovers only from the newest valid bounded history, and fails closed when no valid generation remains. A changed boot or OS-session identity archives the prior tab set instead of restoring it; journals younger than seven days can be adopted when their sessions are explicitly reopened.
- Last-screen and fixture-only stderr files are private bounded recovery artifacts. Structured server, holder, attach, and child crash records use allowlisted fields, rotate without startup truncation, and remain physically separate from recovery content.
- Milestone 4 added the minimal lifecycle states, failed-tab banner, and retry/fresh/close handling needed to expose recovery. Milestone 5 adds the rich strip, shortcuts, mouse interactions, naming, prewarm, no-idle-suspension contract, and two-client UX. `a1 tabs doctor`, packaging, physical terminal/SSH-loss acceptance, and complete certification remain milestone 6.

### Relation to the in-process prep refactors (2026-10-09/10)

PRs #729â€“#736 prepared the owned UI for several sessions in one process. This design runs one A1 process per tab, so it does not depend on the shared helper pools (#733), the engine host's multi-session factory (#734), the terminal-host/presenter split (#735), or the per-agent claim dimension (#736). It does use the lifecycle ordering from #732 (bounded quit, clean disposal), which tab detach and restart rely on, and the unique required session ids from #734. Each tab process must get its own launch runtime id so worktree claims (#736) never collide.

## Goals / Non-Goals

**Goals:**

- Several independent A1 agents in bare `a1` tabs on Windows x64, Linux x64, and macOS arm64, each running the full A1 UI with its extensions. The user can create, switch, rename, reorder, and close them, or run `a1 solo` for direct single-agent mode.
- Tabs keep running through terminal closure, SSH drops, attach-client crashes, and resident-server crashes. Relaunching from any terminal reattaches with exact screen state. A crashed tab restarts into its session without replaying an interrupted prompt.
- One tab's failure never affects another tab, the server, or the client. Package activation retains every immutable release still used by resident processes.
- Status comes from structured engine events, not screen text.
- Terminal bytes, input, and rendering stay native. Node never relays them.
- Security and recovery remain verifiable after server loss: derived credentials re-admit holders, an OS writer lease prevents split-brain registry writers, and every command or mutation is epoch-fenced.
- The tab model is kind-neutral, so arbitrary CLI tabs are a follow-up without redesign.
- The work is testable hermetically, including kill, crash, stale-server, controller-transfer, and reattach interleavings.

**Non-Goals:**

- Restoring tabs after reboot or logout. Resident processes end with the OS session; the sessions stay resumable through the normal session picker (Decision 9).
- Platforms beyond the three above, automatic resident server handoff/recycling, arbitrary CLI tabs, split panes/layouts, and v2-style per-folder workspaces or sidebar.
- Network or remote attach, and multi-user sharing.
- Adding resident behavior or presentation to `a1 pi`. Its only shared change is the session-writer guard described in Decision 8; it must not initialize a resident host or bridge.
- Automatic repository/worktree allocation, conflicting-edit prevention, task delegation, inter-agent messaging/results, shared context, or cost/approval orchestration. Independent sessions may still write the same working directory; tabs are not repository isolation.
- Automatically replaying an interrupted turn.
- Inline terminal image protocols (kitty graphics, sixel). Children see a host terminal identity without image support, Pi's text fallback applies, and the first version does not claim image-protocol extension parity.

## Decisions

### 1. Tabs are terminal sessions running the complete A1 UI

Each tab runs `node bin/ui.js --tab` under a pseudoterminal. That child is today's owned UI with its in-process Pi runtime, extensions, and custom extension components, so there is no engine split, no remote adapter, and no extension rendering bridge. Tab mode adds only resident integration concerns:

- it connects the tab bridge (Decision 7);
- quit routes request a client detach instead of exiting (Decision 11);
- the first-run intro and quit outro are suppressed, because the attach client owns the outer surface.

Alternatives considered:

- **Structured workers with a remote engine adapter.** Rejected by user direction:
  - an extension's in-process custom UI can never cross a process boundary;
  - it doubles the architecture when CLI tabs arrive;
  - it requires splitting the entire shell/engine contract.
- **Node host with `node-pty` and `@xterm/headless`, as in v2.** Rejected:
  - it puts PTY and byte relay into Node, which governance forbids;
  - it duplicates a terminal core that already exists natively;
  - v2 recorded stalls from exactly this design.

### 2. One native addon, three Node-hosted roles, plus the A1 child

```text
 terminal                         (detached, per OS user Ã— profile)
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ a1  â†’  guardian  â†’       â”‚     â”‚ node host-entry server              â”‚
â”‚ node host-entry attach   â”‚â—€â”€â”€â”€â–¶â”‚  registry (atomic JSON, fsync)      â”‚
â”‚  tab strip + active tab  â”‚ pipeâ”‚  topology, client fan-out, restore  â”‚
â”‚  outer terminal I/O      â”‚     â””â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”˜
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚pipe          â”‚pipe          â”‚pipe
   (launch instance, dies with       â–¼              â–¼              â–¼
    the terminal: harmless)     holder: tab 1   holder: tab 2   holder: tab N
                                PTY/ConPTY      PTY/ConPTY      PTY/ConPTY
                                ghostty model   ghostty model   ghostty model
                                   â”‚                â”‚
                                node ui.js --tab node ui.js --tab â€¦
                                (full A1 UI + Pi + extensions)
                                   â””â”€â”€ tab bridge â”€â”€â–¶ server (status, session, name, detach)
```

Every attach, server, and holder role is `process.execPath` running the release's fixed `host-entry.js`; that entry loads the verified `terminal-host.node` addon and blocks in its native role dispatcher. Node carries no terminal bytes—the role remains native for its complete data path.

- **attach** is the foreground `a1` surface. It runs inside the bare-A1 launch instance and dies with the terminal, which is harmless.
  - It owns raw mode, the alternate screen, outer terminal mode negotiation, the tab strip, composition of the active tab's retained surface, input arbitration, and shortcut interception.
- **server** is resident. It owns:
  - the registry and topology revisions;
  - the list of holders and client sessions;
  - fan-out of the active tab's surface to each client;
  - tab-bridge termination, and restore and restart policy.
  It runs no A1 or Pi code and holds no PTY. That keeps it small and hardens it against the herdr single-point-of-failure problem. Generation 1 forwards replaceable full retained surfaces; patch deltas remain a later optimization.
- **holder** is resident, one per tab. It owns:
  - exactly one PTY (ConPTY on Windows) and its child process tree;
  - one libghostty-vt retained model with bounded scrollback;
  - input encoding and the per-tab damage state.
  Because ConPTY belongs to its creating process, each tab has its own creator. A server crash therefore does not destroy a tab's ConPTY; holder failure affects only that tab. Actual child/tree exit and writer-lease release still require verification, not inference from the pseudoconsole closing. The 2026-10-17 Windows x64 migration measurement put an idle Node-hosted holder at approximately 30–40 MiB of resident memory, versus a few MiB for the former native-executable holder; allocator and shared-page accounting make this a range rather than a per-tab budget. The separate holder process is retained for certified crash isolation, and latency budgets were not raised to absorb Node startup.
- **Why the server relays surfaces instead of clients connecting to holders directly.** It gives one authenticated endpoint per client, one ordering domain for focus and topology, and simpler multi-client arbitration. Measure the extra local pipe hop in the native hot-path evidence rather than assuming its latency. The server forwards encoded holder surfaces and does not re-render them.

### 3. Host scope, endpoints, writer authority, and credentials

- There is **one server per OS user Ã— canonical A1 profile root**, independent of the release cohort. Tabs must outlive release changes, and the supervisor is forbidden from retaining runtime processes.
  - Windows endpoint: `\\.\pipe\a1-tabs-<sha256(canonicalProfileHome)[0:20]>`.
  - macOS and Linux endpoint: a Unix domain socket `a1-tabs-<same profile hash>.sock` inside an owner-only (`0700`) per-user runtime directory (`$XDG_RUNTIME_DIR` when set, otherwise a private directory under the profile's runtime dir), kept short enough for the platform's socket path limit.
  - Generation 1 admits holders over the authenticated owner endpoint. Dedicated `â€¦-h-<tabId>` endpoints remain an optional later optimization.
  - Hermetic override: `A1_TABS_ENDPOINT`, together with the `A1_*_DIR` overrides.
- **The endpoint is discovery; the writer lease is authority.** A starting server probes with a real handshake. If a live server answers, it exits as `already-running` and joins the winner. A failed probe does not authorize blind endpoint reclaim: the starter reads the owner marker, verifies pid and native start identity, requests termination, and waits for the owner-only OS-exclusive registry-writer lease. If the owner cannot be verified or the lease cannot be acquired, startup fails closed instead of creating split brain.
- The ownership marker `{serverId, pid, startIdentity, bootNonce, generation, build}` is written atomically under the writer lease. Every registry mutation rechecks the held lease and current epoch before commit. A server removes an endpoint or marker only while both still identify it.
- **Access and authentication:**
  - The endpoint, token files, secret file, registry, and writer lease are owner-only: Windows ACLs on the named pipe and files, `0700` directories and `0600` files on macOS and Linux, plus a peer-credential check (`SO_PEERCRED` / `getpeereid`) on every Unix socket connection.
  - Clients present a random 32-byte client token from an owner-only file.
  - One random owner-only profile secret persists outside the registry. Per-tab/per-incarnation holder and bridge credentials are derived from that secret and the non-secret tab/incarnation identity, so a replacement server can authenticate surviving processes without storing tab credentials.
  - Holders and bridges also present pid and native start identity. Nothing unverifiable is adopted, signalled, terminated, or allowed to mutate state.

### 4. Detached start

- **Server start.** The server is started from the Node pre-guardian bootstrap (`ensureTerminalHost()` beside `ensureSupervisor()`), through `process.execPath host-entry.js server --detach` with the verified addon path supplied to the entry.
- **No general escape from containment.** On Windows, ordinary launch-instance jobs and holder-owned child jobs retain kill-on-close containment without `JOB_OBJECT_LIMIT_BREAKAWAY_OK` or silent breakaway; a job flag cannot allowlist an executable. On every platform, resident creation is a distinct authenticated fixed-role operation, not an arbitrary executable/argv spawn service.
- **Authorized launch and recovery.** Initial creation runs before the launch guardian. A contained attach client or surviving holder invokes the addon's verified `server --detach` recovery path; there is no arbitrary-spawn IPC method. When `runRole` first enters, it records one immutable host command: the current Node executable and the release's fixed role entry. The native routine accepts only a typed `server` or `holder` role and canonical profile, opens its own addon artifact, constructs the fixed role grammar, uses an allowlisted environment/cwd with handle inheritance disabled, and starts that recorded Node-and-entry pair. It verifies the resulting pid/start identity and containment before success. On Windows, a contained caller uses the fixed WMI escape, while the holder's fixed recovery invocation launches directly from its already-detached resident boundary; recursively invoking WMI from a detached service can fail in non-interactive sessions. Native tests may compile one feature-gated fixture role, but production accepts no caller-supplied executable or free-form argv. Owner-only credentials prevent cross-user access; this is not a sandbox against arbitrary malicious code already running as the same OS user.
- **Windows:**
  - Select valid platform creation flags for detached, console-free startup; do not assume combining `DETACHED_PROCESS` and `CREATE_NO_WINDOW` adds a guarantee. Verify resulting process identity and job containment before reporting resident readiness.
  - For a caller in a foreign kill-on-close job that denies breakaway (Windows OpenSSH, some IDE terminals), use WMI `Win32_Process.Create` with an explicit environment block and cwd, bounded startup, and post-launch verification (herdr reference).
  - Milestone 1 must pin the concrete authorized recovery transport and handle-inheritance rules and prove them with containment fixtures before milestone 2 relies on survival.
- **Every platform** records the observed detachment mode and any failed verification reason.
- **macOS and Linux:**
  - Start resident roles in a new session (`setsid`) with no controlling terminal, standard streams on `/dev/null`, and an explicit environment and cwd, so terminal close and SSH hang-up (`SIGHUP`) do not reach them. Verify the resulting session, process group, and identity before reporting readiness.
  - The process-guardian addon's kill-on-close tree tracking must not adopt resident roles, and ordinary descendants must not gain a way to leave their tree.
  - macOS: keep the resident roles in the user's per-user bootstrap namespace, so clipboard, keychain, and other per-user services keep working after the launching terminal closes (herdr #4100 is the reference). Linux: a session manager that kills user processes at logout (systemd `KillUserProcesses`) ends tabs at logout; that is the documented logout behavior, not a failure.
  - Milestone 1 proves these with fixtures on each platform before any milestone relies on survival.
- **Holders** are spawned by the server through the same platform detach routine.
- **Unverified survival** uses the direct single-agent fallback with one notice, not a purported resident tab that remains contained. Reject or clean up only the exact verified incomplete resident start; never terminate an unverifiable process. Existing resident records and session leases remain intact.

### 5. Protocols

The channels carry bounded generation-1 frames: a u32 little-endian length followed by one MessagePack named-map envelope with stable `type`, optional `requestId`, and typed `body` fields. There is a 2 MiB cap per frame, 1 MiB per input-bearing message, bounded nesting and collection lengths, and a 4 s handshake timeout. Length and structural bounds are checked before corresponding allocation or recursion.

- **Handshake:** `hello{role, generation, build, features[], token}` â†’ `welcome{â€¦, limits}`.
  - `generation` is the stable compatibility number. Within a generation, named maps change only additively: unknown fields are ignored, new fields are optional with defaults, enums carry an explicit `unknown` fallback, and a missing method disables only that action.
  - A mismatched generation yields a typed `incompatible-generation` outcome.
  - A pinned canonical encoder emits exact-byte fixtures. A manifest sorted by fixture name records each SHA-256 and one digest over ordered names and bytes; later additions regenerate it rather than merging digest text by hand.
- **Client â†” server:**
  - **Topology.** `tabs.subscribe` returns a snapshot with a revision, followed by changes. Mutations are `tab.create{kind:"a1", cwd, env, session?}`, `tab.rename`, `tab.reorder{expectedRevision}`, `tab.close`, `tab.retry`, `tab.fresh`, and `tabs.stopAll`. A stale revision is rejected atomically.
  - **Surface.** `tab.view{tabId, size}` returns a full retained surface (cells, attributes, hyperlinks, cursor, modes), then patches against its revision. `tab.unview` ends it. Only the tab a client is viewing streams surfaces to that client (v2 lesson).
  - **Controller.** `tab.claimInput{tabId, clientId, expectedControllerRevision}` transfers one controller lease through a fenced input-admission boundary. The sans-IO state moves through active, frozen, draining, awaiting-boundary, then active for the new generation. After every accepted old item enters the shared PTY writer, the holder writes a versioned DCS marker carrying the target generation and a 128-bit nonce through that same queue. When a pseudoterminal reserves raw DCS input syntax, a fixed printable envelope carries the exact marker bytes and the child parser reconstructs them only after earlier queue bytes arrive. Tab-mode input handling consumes it and acknowledges `{generation, nonce}` over the authenticated bridge only after earlier bytes have been admitted by the child parser; a sideband acknowledgement without that PTY ordering is insufficient. Milestone 1 freezes the marker and proves the state machine plus a native fixture; milestone 5 wires the production tab-mode parser and bridge. Requests bind an immutable origin controller generation at command admission, not execution; stale or ambiguous requests are rejected, never relabelled. If the bridge or proven boundary is unavailable, terminal input remains usable with client-scoped child commands disabled; attach-local double-`Ctrl+C` remains available.
  - **Input.** `tab.input{tabId, controllerRevision, bytes|keyEvent|mouseEvent|paste|focus}` is accepted only from the current controller and encoded by the holder with libghostty-vt against the child's current modes.
  - **Resize.** `tab.resize{tabId, controllerRevision, cols, rows}`. The PTY size follows the current input controller; read-only viewers cannot resize the child.
  - **Attention.** Status and attention events arrive for all tabs, even unviewed ones.
- **Server â†” holder:** `holder.ready{tabId, token, pid, startIdentity, childPid, childStartIdentity, release}`, then surface patches, `holder.exit{code, signal}`, and heartbeats. The server forwards input and resizes.
- **Tab bridge (A1 child â†” server):**
  - The child receives `A1_TAB_ID`, `A1_TAB_TOKEN`, and the endpoint through the fixed startup contract. The child consumes credentials before loading extensions or spawning tools and removes them from inherited environments; holders cannot sanitize grandchildren by themselves. Reconnect credentials remain in child-private memory and are never restored to `process.env`.
  - The child sends `bridge.status{seq, state}` derived from engine events: `agent_start`, `turn_start`, tool execution, settled idle, `stopReason`, pending extension UI or trust requests, and compaction.
  - It also sends `bridge.session{file, name}`, `bridge.request{action, clientId, controllerRevision}`, and `bridge.prompt{interrupted?}` metadata. Client-scoped requests are honored only when their controller generation is current. Prompt text and terminal input are never sent through the bridge.
  - The server sends `bridge.visibility{visible}`, so a hidden A1 throttles animation, and `bridge.rename`, so a strip rename sets the Pi session name.
  - The bridge is advisory. A missing or broken bridge degrades that tab to process-level status and never breaks the tab.
- **Backpressure:**
  - Each client connection has a reliable, bounded control lane and a **single-slot render lane**. A newer full current surface replaces an unsent one, so a client that drains never depends on a dropped intermediate revision. Structured surfaces are immutable `Arc` values while routed; encoding happens outside the routing mutex, decoded structured state is capped at 8 MiB, and a superseded holder socket cannot publish into a newer incarnation.
  - The server never blocks a holder, another client, or registry writes on a slow client. Attach and holder hot loops yield after bounded frame, byte, and two-millisecond work quanta; completed outer writes, rather than offers, advance the presentation baseline.
  - Holders parse their PTY continuously, whether or not the tab is viewed, so a PTY is never throttled and a child never blocks on output.

### 6. Rendering, input, and outer-terminal fidelity

- **Composition.** The attach client composes row 0 (the strip) and rows `1..N` (the viewed tab's surface). The tab PTY is sized `cols Ã— (rows âˆ’ 1)`. Ghostty remains the sole child-terminal parser. Its stream parser reports synchronized-output begin/end/reset boundaries to the holder, which keeps mutable parser state separate from an immutable committed surface and never publishes an open transaction. A non-renewable 250 ms deadline publishes one typed recovery commit for a malformed transaction. On Windows, ConPTY re-renders the child's cells on its own schedule and relays the DEC 2026 markers when it parses them, so a render pass can land between a frame's markers and the rest of its cells can arrive after the end marker; the holder therefore treats a relayed end marker as "frame parsed", keeps the state private until the following render pass has arrived and settled for 2 ms, and publishes anyway after a 40 ms bound. A begin marker that arrives while that pass is still pending does not publish the torn state. Unix PTYs relay bytes verbatim, so their markers still delimit frames exactly. The outer composer owns the only synchronized envelope and falls back to a full repaint only when identity, geometry generation, dimensions, or the structured base changes.
- **Outer modes.** The client negotiates the outer terminal's modes: raw mode, alternate screen, bracketed paste, focus events, SGR mouse, kitty keyboard protocol where available, and synchronized output.
  - Child-requested modes are tracked in the holder's model. Input is re-encoded per child mode by libghostty-vt, which the proof already does.
  - Mouse rows are offset by the strip. Row 0 belongs to the client.
  - When the child has not requested mouse reporting, selection is host-owned and scoped to the pane, as in the proof.
- **Passthrough and intercepts:**
  - OSC 52 clipboard writes, OSC 8 hyperlinks as cell attributes, OSC 0/2 titles as tab metadata, and cursor shape pass through. A bell (BEL) from the child is never forwarded to the outer terminal; icons are the only attention signal (Decision 7).
  - Queries the child sends, such as DA and cursor position, are answered by the holder's model, never by the outer terminal.
  - Image protocols are not forwarded in the first version; the terminal identity the child sees disables them and existing text fallback applies. Extension parity is claimed only for the certified text-terminal contract.
- **Detach.** On detach the client restores the outer terminal's keyboard and mouse modes exactly. Enhanced keyboard sequences must not leak into the parent shell (herdr CHANGELOG lesson). Preserve A1's surviving-owner restoration for a killed attach process; an in-process panic/fatal hook cannot run after forced termination. The outer bootstrap/exit-notice owner performs bounded emergency restoration without giving either guardian terminal-byte relay authority.

### 6a. Solo interaction parity (2026-10-17)

Direct `a1 solo` is the behavioural oracle for every viewed resident child. Only the tab strip row and its tab actions, detach instead of exit, the hidden session name, process residency, and the text fallback for unsupported image protocols may differ.

- **Semantic input.** Attach resolves tab actions first, then names every other outer event as a bounded generation-1 `input.event`: key identity from the libghostty key table, `MOD_*` modifiers, produced text, repeat, focus, or a pointer gesture already translated to child rows. The server validates and fences it like byte input. The holder encodes it with libghostty against the child's live key, mouse, focus, and bracketed-paste modes, and falls back to the CSI u bytes direct terminals send for modified Enter, Tab, Backspace, and Escape. Double `Ctrl+C` is recognized from the key identity before any encoding; a paste or pointer activation completes another input sequence and resets the chord.
- **Compatibility.** `semantic-input` and `terminal-effects` are advertised features. A same-generation holder without semantic encoding answers `legacy-holder`; attach re-sends the refused event as bytes and keeps the byte path. That fallback is not certified against the parity contract.
- **Typed effects.** The holder registers libghostty's clipboard-write callback, which normalizes OSC 52 and OSC 1337. A write from the viewed tab crosses as one bounded `terminal.effect`; attach writes one OSC 52 for it. A hidden tab's write is dropped, never replayed into a later view. Payloads are never logged.
- **Modes and cursor.** Each surface carries the child's cursor cell and modes. Attach mirrors a cursor shape the child chose and resets it on detach or failure; a default block cursor is left to the outer terminal, as direct A1 leaves it.
- **Shortcut projection.** The owned child projects the effective A1 keybindings plus `keybindings.json` into one assignment per tab action: a key an A1 action holds never becomes a tab shortcut, and the earlier declaration keeps a duplicated key. It publishes the projection as `bridge.shortcuts`; the server relays it as `tabs.shortcuts`, and attach dispatches and labels exactly that projection. `/hotkeys` renders the same projection. A shared case file is replayed by both resolvers.
- **Committed presentation.** A requested view commits only with a topology that lists it and a complete target surface. Retained rows, palette/default colors, modes, and cursor are captured atomically; equal captures do not invent a revision. Surfaces of the committed view apply in revision order, and revisions rise across holder incarnations. A retained re-offer is marked stale from the request start and parks for at most 120 ms while the fresh frame arrives. One compositor writes strip, body, overlay, modes, and the viewport-clipped final cursor inside a single synchronized update. It erases suffix cells when a complete replacement row becomes shorter and restores the newest underlying surface when an overlay leaves. Clock, hover, and title-animation damage repaints only the strip and restores the child's cursor.
- **Evidence.** One interaction matrix drives three layers: an owned-shell oracle that records content-free observations, role fixtures that drive real server, holder, and attach processes with a certified parity child, and exact-artifact harnesses. `verify-interaction-parity.mjs` compares the bytes the same child observes directly and through the built host. `verify-resident-parallel-progress.mjs` configures the real engine against a bounded loopback streaming provider and crosses all six first-response orders with all three initial views while every turn remains unfinished behind a completion barrier. At matching 100×29 child geometry, the same real-A1 prompt also runs through isolated direct-solo and resident profiles; the native Ghostty oracle compares a content-free digest of the intermediate fixture cells and their resolved styles together with normalized cursor and mode state. It advances only at parser-reported synchronized-output boundaries, rejects unbalanced transactions or disappearing intermediate cells, and excludes only the resident strip row rather than normalizing terminal semantics. Opt-in per-process JSONL observations identify engine delivery, completed child writes, PTY ingestion, distinct holder commits, attach receipt, and completed outer paint by run/tab/incarnation/process-instance/sequence without recording terminal or conversation content; queue loss, clock faults, duplicates, stale order, and missing stages fail the report. Named pressure variants keep all turns unfinished while exercising hidden progress, repeated switching, navigation input, rename overlays, tab-local resize, a bounded 35 ms attach-receipt delay, and a 900 ms paused outer sink; every tab must retain partial animation/progress before settlement and then present its final output. A detached/reconnect variant releases all three unfinished turns after terminating the authenticated attach and exact self-reported server identity; child writes, PTY ingestion, and holder commits must continue before a replacement server and attach present every retained final output. Separate isolated exact-artifact control markers stop one target tab at engine delivery, physical child rendering, holder commit, or outer paint; each control requires its upstream stages and the other tabs to advance, then removes the stop and requires final output from all three tabs. A fifth control fragments a real owned-shell synchronized write into at most 64 physical writes without changing its bytes, records the DEC private mode 2026 transaction classification, and requires ordinary complete holder commits without deadline recovery before final output. This characterizes the built PTY/ConPTY coherence path; a passing fragmented run does not by itself assign the historical stall to that path without a failing live reproduction. The marker path is absent in ordinary sessions and is scrubbed before extensions or tools inherit the child environment, while observation callbacks remain passive and cannot select a control. CI runs the vendored Ghostty VT tests and both exact-artifact harnesses on Windows x64, Linux x64, and macOS arm64. Each platform's verdict stands alone.

### 7. Status and attention come from the tab bridge

Tab status is an A1-owned state machine fed by `bridge.status`:

| Status | Source | Glyph |
|---|---|---|
| `starting` / `restoring` | holder spawned, bridge not ready | dim progress frames |
| `idle` | settled idle | none |
| `working` | agent or turn start, tool execution, compaction | shared progress frames |
| `needs-input` | an extension UI, trust, or permission request is pending | yellow `?` (warning) |
| `done` | the last turn finished successfully | green `✓` success |
| `aborted` | the last turn was aborted | red `✗` error |
| `error` | the last turn ended with an error | red `✗` error |
| `crashed` / `restarting` / `failed` | holder or child exit, or a failed tab lifecycle (never a failed turn) | `âœ—` error plus a banner |

- A `done`, `aborted`, or `error` marker stays on the chip, including after any client views the tab, until that tab's next turn starts.
- A tab with a broken bridge shows only process-level states.
- Future CLI tabs will derive status from process state, and may use BEL or OSC 9/777 from the program as an attention input.
- The glyph set is the same in every client. A working spinner uses the resolved A1 accent reported by that specific tab.
- **Icons are the only attention signal (user decision).** There is no bell, sound, terminal notification, or OS notification. The status icon is the signal: accent spinner = working, `âœ“` = finished, red `âœ—` = failed, yellow `?` = needs you.

### 8. Durable state

- **Pi's session JSONL**, written by the child, is the authoritative transcript.
- **The registry** is `<dataDir>/tabs/<profile-token>/registry.json`:
  - It is written only while the server holds the OS-exclusive writer lease and current epoch: to a temporary file, then write-capable `fsync(file)`, rename, and `fsync(dir)`, on every mutation before acknowledgement.
  - Up to 20 rotated generations are kept in `registry-history/`, at most one per 15 minutes.
  - An unparseable file is quarantined as `registry.corrupt-<ts>.json`, and the last good history generation is loaded. A notice names both. If existing state has no valid recoverable generation, fail recovery closed with preserved files rather than initialize an empty registry.
  - JSON with explicit synchronization is chosen over sqlite to keep the native server dependency-light. Milestone 1 pins the write-handle, atomic replacement, and directory/metadata synchronization sequence and supported local filesystems: on Windows a write-capable flush plus write-through replacement; on Linux `fsync` of file and parent directory; on macOS `F_FULLFSYNC` of the file plus the strongest declared supported parent-directory synchronization. A failed or unsupported required barrier is reported rather than ignored. Kill-at-step tests establish process-crash old-or-new content and instrumented API ordering; they do not stand in for milestone-6 physical power-loss evidence.
  - A durable mutation is acknowledged only after its commit barrier. On failed persistence, reject new durable mutations; retain live observed process state in memory without claiming it is committed or rebuilding it from older disk state. Retry bounded writes; never kill a live tab solely because persistence failed.
- **Per-tab fields:**
  - identity: `tabId`, `kind`, `createdAt`
  - naming: `displayName`, `nameSource` (`default|auto|user`)
  - placement: `order`, `cwd`
  - session: `sessionFile`, `sessionDir`
  - lifecycle: `desired` (`running|stopped`), `lifecycle`, `attentionSeq`, `seenSeq` (volatile status is rebuilt from the bridge and is never persisted)
  - holder: `holderPid`, `holderStartIdentity`, `childPid`, `childStartIdentity`, `incarnation`, `release`
  - restarts: `restarts`, `restartWindowStart`, `lastExit`
  - `registryRevision`, `epoch`, and `bootId`
- **No per-tab credential is persisted in the registry.** The owner-only profile secret is stored separately and derives per-tab/per-incarnation credentials from recorded non-secret identities. The environment sent with `tab.create` is kept in holder memory only; a tab restarted after a crash reuses its holder's environment.
- **Session-writer lease.** All A1-owned session writers (resident, solo/fallback, and Pi-comparison) on the supported platforms use one profile-neutral native lock primitive before opening a session for writing, independent of launch mode. It does not start a host, holder, or bridge for direct modes. The primitive is an OS lock held by the writer process itself (`LockFileEx` on Windows, an open-file-description `fcntl` lock on Linux, `flock` on macOS), so the kernel releases it only when the writer is gone. Node writers take it in-process through the same Node-API 9 `terminal-host.node` addon that exports the resident roles; there is no separate lock artifact, and a helper process cannot hold a lock on their behalf. Existing files are opened, identified by stable volume/device plus file identity, locked through that identity, and revalidated so case, junction/symlink, and hard-link aliases converge. A new file first holds a canonical-parent/name reservation, creates/opens without writing session content, acquires and revalidates file-identity authority while the reservation remains held, and only then admits writing; losing that race writes nothing. The writer routes include startup, `--session`, in-runtime switches, fork, import, new session, and the picker rename. The registry and holder coordinate admission, but a holder-only lock is insufficient: native lease custody must remain valid for the actual writer's lifetime, including any interval after holder death. Pin and prove the writer-bound lock/handle design on each platform in milestone 1; do not infer child death from pseudoterminal loss. Replacement requires lease acquisition and verified prior-writer/tree exit; uncertainty blocks it. Session switching acquires the target before relinquishing the old writer lease, and failed switches preserve the original session. Resident selection focuses an existing tab; direct-mode conflicts fail safely or offer an explicit fork, never silently attach or overwrite. Unmodified external Pi, older nonparticipating builds, and arbitrary file writers are outside this cooperative guarantee; document that limitation rather than claiming an OS sandbox.
- **Prompt journal.** `<dataDir>/tabs/<profile-token>/<tabId>/journal.jsonl` is an owner-only child-owned recovery journal, separate from asynchronous prompt history. Each submission has a stable ID and session/incarnation identity. Admission durably records bounded identity and recoverable editor text, never duplicate attachment payload bytes, before dispatch; timeout/failure leaves the prompt in the editor with a visible failure and dispatches nothing. The actual engine command retains every validated attachment. Correlate the record with the committed session entry, and retire it only after the corresponding session data is synchronized, including when command completion observes that the lifecycle already returned to ready; a settled turn's durable completion also records its submission ID so recovery never offers a completed prompt as unfinished. Recovery merges journal/session evidence by identity and never automatically resends, including when a crash occurs between dispatch, session append, sync, and journal retirement. It rehydrates image chips only from validated profile sidecars and removes unavailable tokens rather than presenting inert attachment labels. Preserve the first-turn journal and reserved session identity if Pi has not created its file yet; distinguish that from an unexpectedly missing existing transcript.
- **Draft checkpoint.** Use a periodic dirty checkpoint with a maximum one-second dirty interval while storage is healthy, including uninterrupted typing, rather than inactivity-only debounce. Expose failed/late checkpoints as degraded recovery; never continue claiming the one-second bound during a blocked disk or event-loop stall. Drafts and submitted prompts have different guarantees.

### 9. Failure and recovery

| Failure | Detection | Outcome |
|---|---|---|
| Tab child exits or crashes | holder sees the child exit | If the exit was not requested: `crashed`. The holder respawns `ui.js --tab --session <file>` with backoff 1 s, 5 s, 30 s. After 3 restarts in 10 min: `failed`, with a banner `âœ— <reason> â€” [r] retry Â· [f] start fresh Â· [alt+w] close`. An interrupted prompt (reported via the bridge, or detected as a trailing user entry) is offered back into the editor and never resent. Child stderr, if separately available, is a private content-bearing recovery artifact, never an ordinary diagnostic log. |
| Holder crash | pipe EOF plus verified process identity/exit | Pseudoterminal loss is not proof that every descendant exited. Verify the old writer/tree is gone and acquire its writer lease before resuming in a new holder; otherwise keep the tab blocked without duplicate writers. |
| Holder hang | holder control heartbeat every 5 s, 3 missed over a healthy supervision path, then one heartbeat of grace for the holder-local watchdog record | Terminate only the verified holder/tree within bounded deadlines, then follow the lease-gated recovery path. |
| A1 child hang | missing child event-loop heartbeat over a healthy bridge path | Record `unresponsive` at 30 s without changing the chip or painting a notice; restart at `tabsUnresponsiveRestartSeconds` (default 120), preserving journal/screen. A server/bridge transport outage alone is not proof of a child hang. |
| Server crash | clients and holders see the pipe EOF | Holders keep running. A client or holder starts a replacement, which acquires the released writer lease, increments the epoch, derives expected credentials, and re-admits identity-verified holders. A live but unresponsive recorded owner is terminated only after native identity verification; an unverifiable owner blocks replacement. After 3 starts in 60 s, clients show `âœ— tab host stopped â€” [r] restart Â· [q] quit`. |
| Attach client crash or terminal close | the server sees the pipe EOF | Nothing happens to tabs. Pending requests stay `needs-input`. |
| Reboot or logout | the platform boot identity differs, or no verified holders exist for a new OS session | Tabs are not restored in this version. The server moves the previous tab set to registry history, and bare `a1` starts with one new tab. Every previous session stays resumable through the normal session picker or `a1 --session`. A pending journaled prompt is offered when its session is next opened in a tab, for up to seven days. Restoring tabs after reboot is a follow-up change. |
| Missing cwd or session on crash restart | stat or open fails | The tab is `failed` with the reason and path. It is never moved elsewhere, and the file is never overwritten. A reserved first-turn identity with a journal and no previously created transcript follows journal recovery instead. |
| Registry corrupt | parse or validation fails | The file is quarantined, the last good generation is loaded, and a notice is shown. |
| PID reuse | start-identity mismatch | The process is never adopted or killed, and the record is treated as having a dead holder. |
| Disk full | write fails | The mutation is rejected with its reason, and running tabs are unaffected. |
| libghostty or parser panic in a holder | the Rust panic hook | The holder logs, exits, and follows the holder-crash path. Other tabs are unaffected; the per-tab processes exist for exactly this (the herdr #453 lesson). |

### 10. Updates and version skew

- **Artifacts and process images.** The server and holders are Node runtimes that load the addon and fixed entry from immutable release directories, never from the mutable npm prefix. Activation therefore never overwrites a loaded addon or entry, and release retention keeps every release used by a verified resident process.
- **Same generation, newer client.** The client attaches normally, and features the server lacks are disabled per method.
- **No automatic handoff in the first version.** A compatible resident cohort remains on its immutable release until all of its tabs stop. A newer same-generation client may attach with unsupported optional operations disabled.
- **Retention.** Release collection keeps the server's, every holder's, and every tab child's release while native identities verify. Package activation does not terminate or overwrite them.
- **Incompatibility.** A generation mismatch never kills resident processes. The client reports that the resident host must be stopped explicitly before the preview can restart on the newer generation. Automatic server handoff and idle tab recycling require a follow-up change.

### 11. Foreground UX

- **Strip.** Row 0, drawn by the attach client, reproduces the approved v2 default appearance:
  - normal chips use RGB background `38,38,38` with foreground `170,170,170`, hover uses `48,48,48`, and the viewed chip uses `55,55,55` with white text, plus v2's palette fallback;
  - the empty state keeps the hoverable `+` control and the clock beside the landing, with no cursor;
  - chips are at most 20 columns, clipped with `â€¦` by grapheme width, with no separators or close glyph;
  - a `â€¦` overflow menu holds tabs that do not fit, and `+` is always reserved;
  - these presentation choices are fixed, not settings, while each working spinner uses that tab's reported A1 accent.
- **Keys.** These are intercepted by the attach client before input encoding. They are configurable through a keybindings file and conflict-checked against A1's registry at launch.

  | Key | Action |
  |---|---|
  | `Alt+A` | new tab |
  | `Alt+W` | close |
  | `F2` | rename |
  | `Alt+,` | open the global Settings tab, or close it while it is viewed |
  | `Alt+/` | open the command palette, or close it while it is open |
  | unbound (`tabs.changelog`) | open the Changelog tab |
  | `Alt+1`â€¦`Alt+9`, `Alt+0` | jump to a tab |
  | unbound (`tabs.next` / `tabs.previous`) | next / previous, wrapping |
  | unbound (`tabs.moveRight` / `tabs.moveLeft`) | move the tab right / left |
  | `Ctrl+C` `Ctrl+C` | detach (leave `a1`; tabs keep running) |

  - `Alt+[` and `Alt+]` are avoided because `ESC [` is the CSI introducer in legacy encodings.
  - `Alt+â†` and `Alt+â†’` are avoided because A1 uses them for word motion.
  - **`Ctrl+C` twice leaves, in every tab (user decision).** The client forwards the first `Ctrl+C` to the tab unchanged, so a single press still clears, copies, or interrupts. It consumes the second press within the existing clear/exit interval as the detach request and does not forward it. The tab therefore never receives a second `Ctrl+C` from the chord, which removes v2's bug where `Ctrl+C+C` killed the agent. The trade-off: a future CLI tab cannot receive two quick `Ctrl+C`s. Pressing them more slowly than the interval still reaches the program.
- **Mouse on row 0:**
  - click activates a tab;
  - right-click opens `Rename`/`Close` (`Close` only for Settings and Changelog);
  - right-click on `+` opens a one-row `Configure` menu that opens the `Plus Menu` dialog over the dimmed active tab, without switching tabs;
  - dragging reorders, with a `â”‚` drop marker, after 250 ms or once the pointer moves;
  - `+` follows the plus menu: with only Agent enabled it adds an Agent at once; with other kinds it opens a persistent dark v2 menu of the enabled kinds, `+ Agent` first and a separator before the `Settings` and `Changelog` toggles, each `✓` while its tab is open; with none the strip hides `+`. Hover and click remain active through the opening release.
- **Settings.** The strip owns one profile-global `Settings` tab. The grouped launcher creates or activates it; `Alt+,` does the same from another tab and closes it while it is viewed. Esc does not close the Settings tab; closing the tab removes it. Resident Agent autocomplete omits `/settings`, and manually entering it does not open a per-Agent screen. `a1 solo` and `a1 pi` retain their existing Settings routes.
- **Commands inside A1 tabs:** a tab's name and its session's name stay in sync. `/name <name>` publishes the session view at once, so the tab takes the name as a user name; a strip rename or an automatic name sets the session name through the bridge; and a resumed session's name becomes the tab name. An automatic name never replaces a user name. Resident Agents also omit and refuse `/changelog`, which opens as its own tab. Milestone 5 adds no tab-management slash commands: `/new-tab`, `/close`, `/tabs`, `/quit-all`, and `/restart-tab` are not exposed.
- **Naming:**
  - Default names are `agent` or `agent N`.
  - When `tabsAutoName` is on (the default, by user decision), the tab's model proposes a hyphenated lowercase name of at most 16 characters after the first settled turn. It uses a small budget and one retry, with a fallback derived from the first prompt, and it runs inside the child.
  - A user rename sets `nameSource=user`, and auto-naming never overrides it.
  - An automatic rename uses v2's title transition: 600 ms moving rainbow, typing at 45 ms per character, then a 300 ms settle. Manual renames do not animate.
  - Rename is inline in the chip: `Enter` commits, `Esc` or a click elsewhere cancels, and `Ctrl+Left` / `Ctrl+Right` move by word. The name is trimmed, must not be empty, is at most 64 characters, and has control characters stripped.
- **Plus menu.** The A1 setting `tabBarPlusMenu`, shown as `Plus menu` in the `Tab Bar` Settings section, holds the kinds `+` offers, Agent and every utility kind, as comma-joined keys in that order and defaults to `agent`. The `Plus Menu` dialog lists every kind with `●` when enabled and `○` when not under `Choose what the + button in the tab bar can add.`, with `Space` to toggle, Up and Down to move, typing to filter, and `Esc` to close. `+`'s `Configure` opens it in the attach client as a modal over the dimmed active tab or landing, built on the command palette's list and renderer, with a reversed white search caret like owned inputs. The Settings `configure` entry opens the same modal: the Settings child sends a `configure-plus` bridge request as the tab's controlling client, which the server forwards to that client as `plus.configure`; only without a bridge does Settings open its own equivalent dialog. Each toggle is written at once: the attach client takes the `settings.json.lock` directory lock the TypeScript writer takes through `proper-lockfile`, rereads the document, replaces only `a1.tabBarPlusMenu` (removed at the default), and renames a temporary file over it. A refused write restores the stored menu. The attach client reads the setting live, and with no kind enabled the strip hides `+`. Because a modal's overlay saves and restores the cursor while faint is active, the strip starts every frame from reset attributes, so no chip stays faint after a modal closes.
- **Command palette.** `Alt+/` (`tabs.commands`) opens a centered box over the whole frame in the owned list style: an accent `Commands` title, a `> ` search row, `Agent`, `Settings`, and `Changelog` with their effective shortcuts right-aligned, and a key hint. Typing or pasting filters it, Up and Down move, `Enter` runs the selected entry through its shortcut action, and `Esc` or `Alt+/` closes it; another tab shortcut closes it and runs. While it is open no key, paste, or pointer event reaches the strip or a child, the cursor is hidden, and the composer redraws the strip and body with faint re-asserted after every SGR beneath the bright overlay.
- **Changelog.** The changelog opens as a singleton `changelog-` utility tab titled `Changelog`, from the palette or the unbound `tabs.changelog` action. The tab registry accepts the `agent`, `settings`, and `changelog` kinds. Like Settings it is never renamed, offers only `Close`, is placed last, does not count as an Agent, and is prewarmed and hidden: the attach client starts it with `tab.prewarm-changelog` once Settings is ready, and again after a Changelog tab closes, so opening it shows the running tab at once. Like a hidden Settings tab, a hidden Changelog never takes the view when the viewed tab closes, so closing the last Agent shows the landing. Its screen is the tab: it shows no `Esc close` hint, and neither `Esc` nor one `Ctrl+C` closes it.
- **Utility tab rules.** Settings and Changelog are kinds in one table, `UtilityKind` in the attach core and `UTILITY_KINDS` on the server, and every rule follows the kind rather than a per-kind path: a kind's toggle shows a tab already in the strip in its slot, reveals a hidden or absent one through `tab.open-<kind>`, which the server answers by starting it or placing the running one last, and hides the viewed one while its process keeps running; the client prewarms each kind with `tab.prewarm-<kind>` once the kind before it runs; and a hidden one never takes the view when another tab closes. In the child, the route matching a resident tab's id is that tab's pinned screen. Adding a kind is a table entry, its prewarm state, and its route.
- **Reveal.** New content enters through one reveal (`roles/reveal.rs`): it draws faint for one fade interval, then at full intensity, with one treatment for every use. After a resize the whole frame fades in once the curtain lifts. A newly created tab shows its chip as the active tab at once, provisionally until the registry lists it, over an empty content area; when its first frame commits, only its content fades in and the strip stays at full intensity. A tab created from the landing keeps the landing's wipe.
- **Rename selection.** The inline rename draws a selection on the prompt editor's selection background (RGB `38,79,120`, palette `24`) and keeps the chip's text color, restoring the chip's background after it; only the caret is a reversed cell.
- **Close.** `Alt+W` and the right-click menu close a tab directly, including while it is working. Closing removes the chip without a confirmation, stopping/read-only frame, or close glyph, then gracefully stops the child under the existing bounded termination policy. Its session stays resumable. Closing the last tab leaves `+` and the clock beside the landing.
- **Landing.** While the attach client has no tab to show, the attach role renders the a1 landing as the frame's body. The launch cwd sits where an Agent tab's footer shows it, flush left on the second-to-last body row with the same `~` formatting and `dim` color, so the folder does not move when a tab opens or closes; `v<version>`, read once from the release root's `package.json`, sits below it and the three-row half-block `a1` wordmark in the profile's accent above it (omitted in Apple Terminal). The accent colors are a native table pinned by `landing_accents.json`, which a TypeScript test checks against `derivePiAccentProjection`. The body is painted with the canvas `backgroundStyle` gives Agent tabs. The landing holds no input: tab shortcuts, the launcher, strip mouse, and double-`Ctrl+C` behave as with tabs, and no cursor shows. A hidden Settings tab is prewarmed and kept running beside the landing, as beside Agents, so Settings opens without a start; it closes when the client detaches, and an attach treats a registry holding only Settings as empty, so it starts and views its first Agent. Starting an Agent from the landing wipes the wordmark from the right over 180 ms into a white cell where the Agent's caret appears, held until its first frame commits.
- **Detach.**
  - `Ctrl+C` twice detaches from any tab and is handled by the attach client, so it works even when the bridge is down. Inside an A1 tab, `/quit` and empty-editor `Ctrl+D` send a detach request carrying the immutable command-origin controller identity and revision; stale, ambiguous or unavailable attribution keeps the tab running and directs the user to `Ctrl+C` twice.
  - The client restores the terminal. When agents are still running, it prints `1 agent still running run a1 to return.` or `N agents still running run a1 to return.`; otherwise it prints the resume hint.
- **Launch and reattach:**
  - Bare `a1` ensures the server and attaches.
  - With zero tabs, it creates one A1 tab in the launch cwd; a registry holding only the hidden Settings tab counts as zero.
  - Otherwise it views the last active tab from its retained surface without byte-history replay. Every holder keeps draining its PTY and updating its retained terminal independently while hidden; selecting a working tab requests its newest complete partial-response surface immediately and then continues live delivery. Measure retained first paint and first input separately from bootstrap; status for the remaining tabs arrives without subscribing to their surfaces.
  - `a1 --session X` opens X in a new tab, or focuses the tab holding it.
  - A new tab's cwd is the client's launch cwd.
  - One internal prewarmed standby keeps the startup graph loaded in a hidden A1 process after a trusted tab has reported its session. Before promotion it owns no session or writer lease and has no registry/tab-strip entry. Creation promotes it only for an exact cwd, release, Node executable, and environment match; the server durably commits the new tab before exposing it to input. A mismatch discards it and normal creation retargets the next standby from the newly trusted tab. Standby launch or loss never changes visible tab state. It is not a setting. Measure A1 warm promotion directly; v2's tens-of-milliseconds result is reference evidence only.
- **Several terminals.** Each client has its own active tab, but each tab has one explicit input controller. Focus gain automatically claims the viewed tab through Decision 5's causal input barrier; if focus reporting is unavailable, first input starts the claim and is held until acknowledgement. There is no `Enter` takeover or persistent view-only banner. Only the current controller may send input or set PTY size. Delayed `/quit` and empty-editor `Ctrl+D` preserve their submission origin; stale or unprovable attribution affects neither client and falls back to attach-local double-`Ctrl+C`.
- **Background attention.** Only the chip icon changes. There is no bell, sound, or notification, and no setting for one.

### 12. Limits and resources

Internal resources remain bounded without imposing a user-visible tab-count quota.

- The only user-facing Tabs setting during resident launches is `tabsAutoName` (default on). Legacy `tabsMax` data is preserved but ignored. Tab enablement is not a setting. Direct `a1 solo` and `a1 pi` launches omit the Tabs section entirely.
- Unresponsive restart timing is internal fixed behavior at 120 seconds; there is no progress-stall notice; concurrent starts use internal default 2/hard cap 8 and prewarm uses internal count/hard cap 1.
- Every open tab keeps its holder and A1 process until explicit close. There is no idle-suspension setting, timer, lifecycle, or glyph.
- Scrollback is capped at 10 MiB per holder, and the replay after a server restart is the retained model itself.
- The server exits after 10 minutes with no attached client and no live user tab; the prewarmed standby does not keep it alive and is stopped first.
- Structured diagnostic logs are `terminal-host-server.log` and `terminal-host-holder-<tab>.log`, rotated at 5 MiB with three kept. Use allowlisted fields/reason codes, not arbitrary exception strings, prompt text, terminal content, or credentials.
- Raw child stderr cannot be declared sanitized: when available separately from ConPTY's combined terminal stream, store it only under the owner-only per-tab recovery area, at 5 MiB with three generations and a seven-day maximum age, alongside bounded last-screen files. Do not scrape stderr back out of terminal cells. These private artifacts may contain conversation or sensitive content and are excluded from `a1 tabs doctor`; neither their contents nor arbitrary extension errors enter structured crash records.
- `a1 tabs host status` prints the server pid, build, release, generation, epoch, uptime, detachment mode, tab count by status, client count, internal resource limits, volatile health counters since server start, and log paths.

#### Hard bounds (milestone 6 audit)

Every queue, buffer, file, and collection the resident roles keep has a declared cap. Each row names where the cap is enforced and the test that pushes past it.

| Bound | Cap | Enforced in | Test |
|---|---|---|---|
| Protocol frame | 2 MiB, nesting 64, 65,536 collection items | `native/terminal-host/src/protocol.rs`, `src/foundation/resident-tabs/protocol.ts` | `refuses_oversized_header_before_payload`; `refuses a frame header past 2 MiB before buffering its payload`, `refuses nesting past 64 levels`, `refuses a collection past 65,536 items` |
| Structured complete surface | 512 × 256 geometry, 65,536 cells, 4,096 styles, 4,096 links, and 8 MiB decoded state | `protocol.rs` `StructuredSurface::validate` | `structured_surfaces_fail_closed_on_dimensions_indexes_and_control_injection` |
| Input per message and holder input queue | 1 MiB | `protocol.rs`, `core/holder.rs`, `roles/holder.rs` | `over_capacity_paste_delivers_no_prefix` |
| Holder PTY ingress and work round | 64 × 16 KiB lossless chunks; at most 256 KiB or 2 ms before yielding | `roles/holder.rs` | `verify-resident-parallel-progress.mjs` concurrent and stopped-stage cases |
| Per-client control lane | 1,024 frames and 4 MiB | `roles/server/mod.rs` | `control_lane_is_bounded_by_frames_and_bytes` |
| Per-client render slot | one pending full surface; a newer one replaces it | `roles/server/mod.rs` `Peer::offer_surface` | `stalled_client_gets_one_full_current_surface` |
| Concurrent endpoint connections | 128 | `roles/server/mod.rs` `admit_connection` | `connections_beyond_the_cap_are_refused_and_released_slots_are_reused` |
| Attached viewing clients | 16 | `roles/server/mod.rs` `client_slot_available` | `attached_clients_are_capped` |
| Concurrent holder starts | default 2, hard 8 | `core/server.rs` | `limits_starts_and_drops_stale_completion` |
| Stopped tab records | 16, oldest dropped first | `roles/server/mod.rs` `prune_stopped_records` | `stopped_records_are_bounded_oldest_first_and_live_tabs_are_kept` |
| Prior tab-set archives | bounded history | `roles/registry.rs` | `prior_tab_sets_are_bounded` |
| Abandoned blocking workers | 8 | `shell/workers.rs` | `fails_fast_after_eight_abandoned_workers` |
| Diagnostic logs | 5 MiB × 3 generations per role | `roles/diagnostics.rs` | `logs_rotate_at_their_cap_and_keep_a_bounded_number_of_generations` |
| Crash records | 64 KiB each, 50 records, 30 days | `roles/diagnostics.rs`, `shell/watchdog.rs` | `crash_records_are_distinct_bounded_and_allowlisted`, `crash_record_is_bounded_and_owner_only` |
| Last screen and private stderr sink | 2 MiB; 5 MiB × 3 generations, 7 days | `roles/recovery_artifacts.rs` | `recovery_files_are_plain_bounded_private_and_rotated`, `fixture_stderr_sink_caps_content` |
| Prompt journal | 8 MiB, 2 MiB per bounded metadata/text record; attachment payloads excluded | `src/foundation/resident-tabs/prompt-journal.ts` | `bounds append size`; `keeps a legal multi-image payload out of bounded journal admission and sends every image` |
| Session reconciliation read | 64 MiB | `src/foundation/resident-tabs/recovery.ts` | `refuses to scan a session past the 64 MiB reconciliation cap` |
| Release-hold report | 32 uncertainty reasons; 1 MiB read | `roles/release_holds.rs`, `release-holds.ts`, `bounded-host-command.ts` | `uncertainty_reasons_stay_within_their_cap`; `fails a release-hold report that pushes past its byte cap without returning a prefix` |
| Maintenance exchange | 5 s reads, 60 s stops, 4 MiB report | `roles/maintain.rs`, `maintenance.ts`, `bounded-host-command.ts` | `fails a maintenance report that pushes past its byte cap without returning a prefix`, `kills and rejects a command that outlives its deadline` |
| Attach server ingress | reader queue 64 frames/4 MiB; execution queue 8 frames/4 MiB; at most 64 KiB or 2 ms before yielding | `roles/attach.rs` | `verify-resident-parallel-progress.mjs` slow-receipt and switching cases |
| Attach input | 1,024 parsed events; semantic input is emitted in at most 1 MiB chunks and target-bound while a view/create is pending | `roles/attach.rs` | `deferred_input_is_atomic_bounded_and_bound_to_the_requested_tab` |
| Outer presentation writer | one replaceable complete desired state, 8 control/effect frames, and 4 MiB effect bytes | `roles/attach.rs` `OuterWriter` | `presentation_is_one_ordered_synchronized_write`; `verify-resident-parallel-progress.mjs` paused-sink case |
| Doctor bundle | 25 MiB, oldest log generations dropped first | `src/foundation/resident-tabs/doctor.ts` | `drops the oldest log generations first to stay within its cap` |

### 13. Packaging and certification

- `terminal-host.node` and the fixed `dist/foundation/resident-tabs/host-entry.js` are built and packaged for Windows x64, Linux x64, macOS arm64, and macOS x64 (see the 2026-10-14 decision), extending the impact-selected Windows CI owner introduced by #588 to that exact target matrix, with Zig 0.15.2 for pinned libghostty-vt. One addon carries both every role and the session-writer lock; there is no terminal-host executable or separate lock addon. It ships in the immutable release with the v2 addon manifest, hash verification, provenance, licenses, and notices.
- Acceptance requires exact-package hermetic suites on each platform plus manual or isolated-worker evidence per platform for terminal close, SSH/session loss, reattach, input fidelity, extension text UI, failure recovery, rollback, and render smoothness. Evidence is never inferred from one platform to another.
- An authorized isolated-worker 24-hour soak remains required certification evidence on each platform; a miss blocks certification without silently changing the approved default or weakening fallback.

### 14. Security

- Endpoints, the registry-writer lease, profile secret, client token, registry, journals, and recovery snapshots are owner-only.
- Tab creation takes a cwd and an environment map. The child argv is fixed by A1, and clients never supply command lines.
- Holder and bridge credentials are derived per tab and process incarnation from the profile secret, are stripped from grandchild environments, and are never written to the registry or logs.
- The registry and structured logs contain no credentials, environment values, prompt text, or terminal content. Journals, retained screens, and optional raw stderr are explicitly sensitive recovery data with owner-only access, bounds, expiry, and no automatic diagnostic export.
- Everything runs as the invoking user.

### 15. Rollback

- `a1 solo` starts the direct single-agent A1 UI without starting the server; the registry is preserved. The shared session-writer guard remains active, so solo or fallback cannot write into a live tab's session.
- If the server cannot start, bare A1 falls back to the direct single-agent launch with one notice, instead of failing.

### 16. Reliability engineering

The v2 daemon was unreliable for structural reasons, and a forensic pass over its source established them. This design treats reliability as architecture rather than as patches, and proves it with release-gating tests. The full normative contract is the `resident-tab-reliability` section of [`resident-tabs-requirements.md`](resident-tabs-requirements.md).

**Principles:**

1. **Failure domains are processes.** The client, the server, one holder per tab, and one A1 process per tab are separate processes. Nothing shares an event loop across tabs.
2. **Crash-only.** Every resident process may be killed at any instruction, and its startup path is its recovery path. Internal invariant violations fail fast: that process crashes with a record, instead of being swallowed. Because the failure domains are small, failing fast is cheap.
3. **The control loop never blocks.** Each Rust role keeps its state machine I/O-free, a "sans-IO core". A thin shell runs blocking work (spawn, pseudoterminal creation, kill, identity inspection, fsync) on workers with deadlines. A missed deadline becomes a typed event, never a stall.
4. **Level-triggered reconciliation.** Desired state (lifecycle, holder presence, size) is continuously reconciled against observed state. Every process incarnation carries an ID, and stale events are dropped.
5. **Fencing.** The server must hold the OS-exclusive registry-writer lease; each start increments the durable epoch under that lease, each mutation verifies both lease and epoch, and holders and bridges obey only the highest epoch they have seen. A timed-out endpoint alone never authorizes a second writer.
6. **Explicit durability per data class.** There is no "best effort". Each class of data has a stated guarantee, and each guarantee has a test.
7. **Evidence survives failure.** Logs rotate but are never truncated at startup. Each crash produces its own record.
8. **Prove it in stages.** Deterministic simulation, crash-point injection, fuzzing, bounded CI chaos on each platform, and exact-package physical evidence per platform gate certification. A separately authorized isolated-worker 24-hour soak remains required platform evidence; evidence is never inferred across platforms. Every named crash point exists only in the `fault-injection` test build, and `A1_TABS_FAULT_CRASH_MARK` names the directory where a kill-at-point test reads the breadcrumb a crashed role leaves.

**How each v2 failure is closed:**

| v2 failure (forensic finding) | Root cause | Countermeasure here |
|---|---|---|
| A ConPTY spawn blocked forever, the hung daemon kept the pipe, and every window lost its agents | Synchronous `pty.spawn` on the shared loop | The PTY is created only inside that tab's holder, and the server kills that holder after a deadline and retries. Other tabs and the server are unaffected. |
| The watchdog SIGKILLed the daemon after a 60 s stall, and every agent died | Agents were children of the daemon | Holders and children survive a server death. The watchdog kills only the stalled process. |
| Synchronous `taskkill` loops blocked the daemon for 30â€“60 s | Blocking kills on the event loop | Kills run asynchronously and concurrently, with deadlines. The loop keeps answering heartbeats. |
| Blocked ConPTY writes stalled the loop, and keystrokes or pastes were silently dropped ("newest wins") | No flow control | A dedicated writer per holder with a bounded queue. Reserve capacity for a complete paste before delivery; reject an over-capacity paste visibly without delivering a prefix. After admission, preserve byte order and report delivery uncertainty if a child or process fails; never silently truncate or retry accepted bytes. |
| Terminal queries (DA/DSR/CPR) were answered by the busy shared emulator, so children stalled | One emulator loop for all agents | Each holder answers its own tab's queries from its own model. |
| Repaints arrived in fragments ("ghost frames"), patched with timing heuristics and two screen sources | Emulation reconciled with bridge surfaces by timers | One source of truth, the holder model. Frames are published at synchronized-output boundaries, with a bounded coalescing window; where ConPTY relays those boundaries ahead of the cells it re-renders, publication waits for the render pass instead of the marker. |
| A late exit event poisoned the replacement child | Events were not tied to an incarnation | Incarnation IDs on every event. Stale events are discarded. |
| Resizes were lost in transit | Edge-triggered resize | Size is desired state, reconciled until observed. |
| Restore spawned duplicate agents | No restore gate | A single start gate for crash restarts, at most one start in flight per tab, and conditional revisions. The duplicate-start invariant is checked in simulation. |
| A fresh agent whose session file was never reported could not be recovered | Session identity was learned after spawn | Session identity is committed to the registry before the tab accepts input. The prompt journal covers Pi's no-file-until-first-reply behavior. |
| A corrupt state file was treated as a fresh boot and wiped every record | Parse failure fell through to an empty state | Quarantine, then load the last good history generation, with a notice. The server never starts empty over existing data. |
| A failed persist plus a hot-swap re-read old state from disk and killed live agents as orphans | Rebuilding from disk over newer memory; the persist result was ignored | Memory stays authoritative on write failure: retry with backoff and report degraded health. There is no hot-swap, and processes are never killed because a registry read came back short. |
| fsync was probably a no-op on Windows (file opened read-only), and the directory was never synced | Wrong handle access | Files are synced with write access and the directory is synced too. A test asserts the platform flush calls. |
| Two processes appended to one session JSONL | Leases lived only in daemon memory | A canonical session-writer lock shared by every A1-owned launch mode, held by the writer process itself so the kernel releases it only when the writer is gone. |
| Boot-identity rounding misclassified a crash as a reboot | `now âˆ’ uptime` rounded to minutes | Each platform reads an exact native boot identity (Windows boot sequence/`LastBootUpTime`, Linux `/proc/sys/kernel/random/boot_id`, macOS `kern.boottime`) and always verifies process identity by pid plus native start time. |
| A persist storm: a synchronous pretty-printed JSON write on every status change | Status was persisted with lifecycle | Only lifecycle and identity mutations are persisted. Status is volatile and rebuilt from the bridge. Writes run off-loop. |
| Hot-swapping the logic bundle caused generation bugs, lost deferred callbacks, and memory growth; kernel updates never applied | In-process code replacement, needed because restarts killed agents | No logic hot-swap. Crash recovery replaces a server while retaining its compatible cohort. Automatic upgrade handoff and release recycling remain deferred; idle suspension is not a cohort upgrade. |
| Crash evidence was deleted: the log was removed at boot, crash logs truncated on respawn, a 256-line queue dropped lines | Log handling | Size-rotated generations that are never truncated at boot. A distinct crash record per incident with a backtrace. `a1 tabs doctor` produces a redacted bundle. |
| Crash text was wiped by the alternate-screen clear | The child cleared the screen before printing | The holder freezes the last screen as a read-only snapshot and writes a recovery file. Separately available stderr goes only to private bounded recovery storage, never the doctor bundle. |
| Concurrent starts hit the `auth.json` lock ("No models available"), and `taskkill /F` left stale locks | Start storms and forced kills | Starts are capped and spaced. Graceful stop comes before force, so Pi releases its locks. A ten-tab concurrent start test asserts models are available. |
| A mid-edit extension reload crashed children | Children loaded a tree that was being edited | This is handled like any other crash: the bounded restart budget, the prompt journal, and the last-screen snapshot. The restart is visible and never silent. |
| The v1 daemon churned: slow replies were read as an outdated build | Timing used as a version signal | The version is carried by the explicit handshake generation, never inferred from timing. |

**Agents that stop making progress.** Liveness and progress are separate signals:

- Holder heartbeat: a Rust main-loop tick every 5 s seen by the server; three missed ticks over an otherwise healthy supervision path plus one heartbeat of grace trigger verified holder recovery. The grace keeps external termination behind the holder's 15-second process-local watchdog so its own crash evidence wins despite scheduler jitter.
- A1 heartbeat: the child's Node event loop, seen through the bridge. After 30 s the server records `unresponsive` in the registry and counters, without changing the presented status, chip glyph, or colour and without a notice row or restart key; after `tabsUnresponsiveRestartSeconds` (default 120) the tab restarts from its session with its journal and last screen preserved. A missing server or bridge transport degrades status, not proof of a child event-loop stall; reacquire liveness evidence before destructive recovery.
- Agent progress: not supervised. A working tab without model or tool events keeps its working status indefinitely, gains no transcript notice, and is never auto-killed, because a legitimate tool can run for a long time.

**Data-loss envelope.** Distinguish process termination, power loss, and loss of both holder and child:

- Committed session entries: never lost (Pi appends synchronously per entry).
- Settled turns: survive power loss (fsync at settle).
- Submitted prompts: never lost (journal fsynced before dispatch).
- Drafts: at most one second of typing lost while periodic checkpoints and storage remain healthy; expose a degraded bound on checkpoint failure or stall.
- A streaming reply at the moment of a tab crash: readable from the last-screen snapshot and recovery file, but not resumable as a model turn. That is Pi's semantics.
- The only unrecoverable case is a streaming reply when the holder *and* its child die together, for example a machine crash, because it was never persisted.

**Verification program.** It runs incrementally across milestones 1â€“6 and gates the complete resident slice:

- Deterministic simulation and property tests of the sans-IO server core over death, loss, reordering, delay, stale epochs, controller transfer, churn, and mutation. Invariants include no lost committed mutation, one registry writer, one live incarnation per tab/session, attributable client-scoped requests, and convergence to running or failed.
- Failure points at every persistence and IPC step, with kill-at-each-point crash tests.
- `cargo-fuzz` targets for the protocol decoder and surface patch encoder.
- Bounded CI chaos on each platform with high-rate fake agents, random process death, resize/attach churn, controller transfer, blocked writes, pseudoterminal creation hang, rename denial, and containment escape attempts.
- Exact-package manual or isolated-worker physical acceptance on each platform. Certification must additionally supply an authorized 24-hour soak on that platform with zero lost journaled prompts/committed entries, zero orphans/duplicates, bounded memory/handles, reattach p95 under 300 ms, tab restart under 3 s, and server recovery under 2 s.

**Local native iteration.** Zig never runs on a developer workstation, but native tests can, by linking the terminal library a CI lane built:

1. `node scripts/development/fetch-terminal-vt.mjs [--branch <name>]` downloads this platform's `terminal-vt-<platform>-<architecture>` artifact from the branch's newest run that published one (default: the current branch) into `.artifacts/terminal-vt/`. If none exists, dispatch `gh workflow run ci.yml --ref <branch>`; native lanes keep it for 14 days.
2. With `TERMINAL_HOST_LOCAL_BUILD=1` and `TERMINAL_HOST_PREBUILT_VT` naming that directory, `build.rs` verifies `terminal-vt.manifest.json` against the vendored `VERSION`, the Ghostty commit, the Cargo and Zig targets, and each file's SHA-256, then links it and skips Zig. A mismatch fails the build in one line and never falls back. Builds with `CI` set ignore the variable.
3. Run one test: `cargo test --manifest-path native/terminal-host/Cargo.toml --features resident-fixtures --test role_integration <name>`.

Every chaos run prints its seed and records its executed action schedule in its report; `--seed <n>` fixes the seed, and `--replay <report.json>` re-executes a recorded schedule and reports actions it could not apply as divergence. With the verified prebuilt terminal library selected, `--build` builds the release addon and the feature-gated `fake-tab` fixture; otherwise pass `--host <terminal-host.node>` and `--fake-tab <fixture>` explicitly. Product builds never emit a role executable; the `role-host` and `fake-tab` binaries are test fixtures only.

Known limit (2026-10-15): on a Windows desktop whose shells already run inside a job, a server started by a role test cannot leave that job, `verify_detached` rejects it, and tests that expect `started` fail locally while passing in CI; the release retention integration test, which runs whenever a debug host addon exists, fails the same way, and local chaos reports servers that holders did not replace. A separate change addresses this.

**Milestone 5 preview performance budgets (p95 on each exact platform build):** cold launch to first input is the direct startup budget plus 800 ms; matching-standby creation to first input is 250 ms; reattach first paint is 300 ms and first accepted input is 400 ms; input-to-process is 16 ms; output-to-present is 33 ms. Each result or miss is recorded independently for Windows x64, macOS arm64, and Linux x64. The platform-native validation lanes run `measure-resident-tabs.mjs` against their built host: its instrumented child reports process-admission timestamps through a real resident holder, while the outer test PTY records presentation, standby promotion, and retained-surface reattach timestamps.

## Risks / Trade-offs

- **[A server crash interrupts the display for everyone]** â†’ Holders keep processes and screens alive. The server holds no VT, Pi, or extension code. It is auto-respawned by any client or holder, and reattach restores exact surfaces.
- **[Terminal fidelity in a composed surface]** (keyboard protocols, mouse, paste, IME, Unicode width, hyperlinks) â†’ Reuse libghostty-vt encoding and the proof's input work, and add fidelity suites on each platform. Claims cover only the certified text-terminal contract; image protocols remain an explicit gap.
- **[Per-tab memory multiplies with holder and A1 processes; measured working sets are observations, not A1 bounds]** â†’ The 2026-10-17 Windows x64 measurement shows Node hosting raising an idle holder from a few MiB to approximately 30–40 MiB resident. One internal prewarmed standby, bounded concurrent starts, and throttled hidden delivery limit avoidable multiplication. Every open tab keeps its process until explicit close; there is no idle suspension or count quota. Merging holders into the server would discard the certified per-tab crash boundary and requires a separate change.
- **[Detachment is platform-specific and fragile]** (Windows jobs and SSH, macOS bootstrap namespaces, Linux logout policies) â†’ Detection and escape live in the native addon per platform, while the process image is Node running the fixed role entry. The mode is reported, never assumed, and unverifiable survival falls back instead of claiming persistence.
- **[Three platforms multiply native and certification work]** â†’ Platform code is confined to the thin I/O shell around one shared sans-IO core, and milestone 1 proves every platform primitive before later milestones build on it.
- **[The Zig and libghostty toolchain in CI and release]** â†’ It is pinned already. Extend the #588 Windows owner and provenance gate to a macOS and Linux build matrix.
- **[No image protocol in tabs at first]** â†’ Pi's text fallback applies and the gap is documented. Forwarding is a follow-up.
- **[Stale or duplicate processes after races]** â†’ An OS-exclusive writer lease, current-epoch commits, one start gate, conditional registry revisions, derived credentials, and adoption only after identity verification.
- **[Two clients type into one tab or a delayed slash command detaches the wrong terminal]** â†’ One controller lease, a proven cross-channel input-admission barrier, immutable command-origin generations, and fail-closed ambiguous requests. A sideband acknowledgement alone is not sufficient.
- **[Physical close, logout, and reboot cannot be tested hermetically]** â†’ Owner-tree kills stand in for terminal close. Exact-artifact manual or isolated-worker records are required, and nothing is automated on an active workstation.

## Milestone 1 implementation record

The contract package keeps the existing proof binary and adds one shared Rust library plus a feature-gated Node-API 9 lock artifact. Process identity uses native process-start data together with Windows boot/logon LUIDs, Linux boot ID/session ID, and macOS boot time/audit session. Endpoints use a first-instance owner-only named pipe with client-token comparison on Windows and protected Unix sockets with per-accept peer credentials on Linux/macOS. Fixed resident roles use detached breakaway creation with a fixed WMI fallback on Windows and double-fork plus `setsid` on Unix; no public executable/argv launch input was added.

Writer locks converge on Windows file IDs or Unix device/inode identities while retaining a canonical location gate through new-file bind. Durable replacement rejects detected remote filesystems, uses write-capable flush and write-through replacement on Windows, file/parent `fsync` on Linux, and `F_FULLFSYNC` plus parent synchronization on macOS; macOS records the explicit directory capability fallback when that call rejects a directory descriptor. Hosted abort-at-step and call-order fixtures prove only complete old-or-new process-crash behavior, not physical power-loss survival.

Generation 1 is the bounded little-endian named-map MessagePack contract in this document. Its exact fixture manifest, decoder fuzz target, controller simulator, and nonce-bearing same-PTY-queue fixture are package artifacts. The only implementation-boundary deviation is intentional: the addon, roles, and primitives remain test artifacts with no product route or release packaging in milestone 1.

## Roadmap

Each milestone is its own OpenSpec change and pull request. Milestones 1â€“4 merged behind `residentTabs: false`; milestone 5 removes the toggle, makes tabs the bare-`a1` route, and adds `a1 solo` as the direct path. A milestone starts only after the previous one merges, moves its requirements from [`resident-tabs-requirements.md`](resident-tabs-requirements.md) into its own spec delta, and covers Windows x64, Linux x64, and macOS arm64 together unless its change says otherwise.

| # | Change | Deliverable and exit evidence |
|---|---|---|
| 1 | `resident-tabs-contracts` (PR #586) | Native platform primitives on Windows x64, Linux x64, and macOS arm64: fixed-role detached start and containment checks, process/boot/OS-session identity, owner-only endpoints, the writer-bound lock through Rust and a test-only Node-API artifact, and durable atomic replacement with bounded evidence claims. Freeze named-map MessagePack generation 1 with fixtures/fuzzing, prove controller generations in the sans-IO core, and exercise the nonce-bearing child-observed PTY marker with a native fixture. No product wiring or release packaging. |
| 2 | `resident-tabs-persistent-tab` (PR #746) | The three native roles with one full A1 text UI, minimal authenticated registry and bridge, bounded I/O, explicit opt-in and direct fallback. Terminal and client closure, detached output, retained reattach, input, and surviving-owner terminal restoration. |
| 3 | `resident-tabs-failure-isolation` (PR #747) | Two tabs, server replacement with unchanged holder/child identities, isolated holder/child failure and hang, slow client and blocked writer isolation, exclusive registry epochs, the session-writer lock wired into every A1 launch mode, and no duplicate starts. |
| 4 | `resident-tabs-crash-recovery` (PR #748) | Crash restart into the session, durable-before-dispatch journaling, periodic drafts during continuous typing, correlation/retirement crash points, missing first-turn versus missing existing session, corruption/rename/disk failures, last-screen recovery, and sensitive-recovery/diagnostic separation. After reboot, previous sessions stay resumable, with no tab restore. |
| 5 | `resident-tabs-tab-ux` (PR #749) | Approved v2-style strip with always-visible close buttons, per-agent accent status and needs-input, mouse, assignable shortcuts with unbound navigation/reorder actions, rename/reorder/close, local detach/resume, automatic two-terminal controller transfer, and extension text fidelity. Then animated auto-naming, `tabsMax`, and one internal prewarmed tab; open tabs are never idle-suspended. |
| 6 | `resident-tabs-certification` (PR #750) | Packaging and release retention on every platform, maintenance commands, bounded resources, deterministic/property/crash/fuzz/chaos evidence and exact-package physical acceptance per platform, including SSH loss, forced attach death, conflict-safe direct rollback, and performance measured separately for cold launch, warm tab creation, reattach, and recovery. |

A failed milestone keeps its pull request open until fixed and preserves safe direct fallback. Each milestone 2â€“6 PR is a draft that holds its full plan (proposal, design, tasks, spec deltas) and starts implementation only after the previous milestone merges.

### Release state and known gaps

Per-platform state is recorded in `docs/architecture/evidence/resident-tabs/` using [the acceptance checklist](../manual-resident-tabs-acceptance.md). A platform is `CI-verified` until every physical item has a recorded pass on a published candidate, then `certified`.

| Platform | State | Automated evidence | Physical record |
|---|---|---|---|
| Windows x64 | CI-verified | terminal-host and resident-chaos lanes; publication build | [windows-x64](evidence/resident-tabs/windows-x64.md) |
| Linux x64 | CI-verified | terminal-host and resident-chaos lanes, bounded fuzzing; publication build | [linux-x64](evidence/resident-tabs/linux-x64.md) |
| macOS arm64 | CI-verified | terminal-host and resident-chaos lanes; publication build | [macos-arm64](evidence/resident-tabs/macos-arm64.md) |
| macOS x64 | CI-verified (build only) | publication build and identity check | [macos-x64](evidence/resident-tabs/macos-x64.md) |

Known gaps:

- Physical acceptance is pending on every platform; the user runs the macOS checks after milestone 6.
- The 24-hour soak per platform has not run and remains a separate authorization.
- Intel macOS has no automated behavior suite of its own: modular validation outcomes are keyed by platform without architecture, so the pull-request suites run on macOS arm64 only.
- Reboot and logout restore, CLI tabs, split layouts, remote attach, worktree isolation, agent coordination, automatic cohort handoff, and image protocols are follow-ups.
- Raw child stderr is not captured separately on any platform; milestone 4 provides only a tested private sink.
- Arbitrary child VT output is not fuzzed, because the fuzz crate cannot link the Zig-built `libghostty-vt`; the probe and terminal-fidelity steps cover that path.
- Downgrading to a release without the session-writer guard while tabs run is unsupported; stop the host first.
- A maintenance stop of an unresponsive host uses an ordinary replacement server that is told to stop every tab at once, rather than a dedicated maintenance-only server mode.
- Revisioned, atomic topology mutations remain a target requirement in [`resident-tabs-requirements.md`](resident-tabs-requirements.md).
### Follow-ups outside this roadmap

- **Reboot and logout restore:** reopen the previous tab set after a new OS session.
- **Work isolation:** explicit task-to-repository/worktree ownership, dirty-tree policy, concurrent-edit conflicts, and review/integration ownership. A tab's cwd is not an isolation guarantee.
- **Coordination:** task identities, delegation, prompt/result exchange, cancellation, permission and cost limits, and parent/child lifecycle. Herdr's agent start/prompt/read/wait API is a reference, not functionality included here.
- **Presentation and lifecycle:** generic CLI tabs, split layouts, remote attachment, and automatic cohort handoff.

Each follow-up needs its own approved change.

## Recorded User Decisions

The user made these decisions on 2026-09-24:

- Every tab is a terminal session running the full A1 UI, so extensions stay native and CLI tabs can follow. This replaces the structured-worker design.
- There is one tab set per profile.
- LLM auto-naming is on by default.
- Icons are the only attention signal, with no bell, sound, or notification: spinner = working, `âœ“` = finished, red `âœ—` = failed, yellow `?` = needs the user.
- `Ctrl+C` twice leaves `a1` from any tab while tabs keep running. There is no separate detach key.
- Reliability is a first-class, release-gating requirement (Decision 16).

On 2026-10-24 the user refined the tab bar:

- `+` adds an Agent by default; what it offers, Agent, Settings, and Changelog, is configurable from a right-click `Configure` modal over the active tab and from `Tab Bar` › `Plus menu` in Settings, where the `Tabs` section is renamed `Tab Bar`. With nothing enabled, `+` is hidden.
- `Alt+/` opens a keyboard-only command palette over a dimmed frame: `Agent`, `Settings`, and `Changelog`.
- The changelog opens at once as its own prewarmed singleton tab that `Esc` does not close, and leaves resident Agents' commands.
- A new tab appears in the strip at once and its content fades in with the same fade a resize uses; a resize fades the whole frame and a new tab only its content.
- The tab rename selection matches the editor's selection style, and a tab's name and its session's name stay in sync.

On 2026-10-16 the `ci-critical-path` change replaced the Intel runner for the release builds:

- The macOS x64 process guardian and terminal host are cross-compiled on the `macos-15` arm64 runner (`npm run build:terminal-host -- --target x86_64-apple-darwin`, same for the guardian) and uploaded beside the arm64 artifacts; the Intel runner took 6 to 11 minutes for builds the arm64 runner finishes in about 4, and it gated packing in every publication. The x64 executable's `--version` identity is read by executing it through Rosetta 2 when the runner can; otherwise the manifest records a Mach-O architecture check as `provenance.identityCheck: "mach-o-header"` instead of a report nobody observed. Intel macOS stays certified separately and its physical acceptance record is unchanged; no publication lane ran the x64 bytes beyond that identity check before either, because the published-pair smoke matrix has no Intel lane.

On 2026-10-14 the user resolved the milestone-6 `darwin-x64` question:

- Add an Intel macOS runner (`macos-15-intel`) for both the process guardian and the terminal host, so every release carries `darwin-x64` binaries beside `darwin-arm64`. Intel macOS is certified separately from Apple silicon: it needs its own physical acceptance record, and the chaos group runs on macOS arm64 only.

On 2026-10-13 the user refined milestone 5:

- Match the v2 default strip appearance, add an always-visible `Ã—`, and color each working spinner with that tab's resolved A1 accent.
- Keep `Alt+A`, `Alt+W`, `F2`, and numbered jumps; leave next/previous and move actions unbound but assignable.
- Add no tab-management slash commands; retain existing `/name`, `/quit`, and empty-editor `Ctrl+D` semantics.
- Automatically transfer control to the active terminal through the causal barrier without an `Enter` takeover or view-only banner.
- Remove the tab enable/disable setting, always show `tabsMax` and `tabsAutoName` under Tabs during resident launches, and add `a1 solo` for direct single-agent launches with no tab strip or Tabs settings section. Keep unresponsive-restart/stall timing, concurrent starts, and one prewarm internal.
- Keep every open tab process running until explicit close; remove idle suspension and its `â—Œ` glyph.
- Use `1 agent still running run a1 to return.` / `N agents still running run a1 to return.` after local detach.

On 2026-10-10 the user confirmed this resident design over in-process tabs and set the first version's scope:

- Deliver as six milestone pull requests; milestones 1â€“4 merge behind `residentTabs: false`, while the later milestone-5 decision above removes that setting and makes resident tabs the bare-A1 route.
- Target Windows x64, Linux x64, and macOS arm64 in the first version; every additional target requires its own approved plan and evidence.
- Keep crash recovery (restart into the session, prompt journal, drafts); drop reboot and logout restore to a follow-up.
- Keep auto-naming, one prewarmed standby, and two attached clients.
- Hosting only: worktree isolation and agent coordination are separate follow-ups.
- Retire the earlier `evolve-bare-a1-into-multi-agent-workspace` plan (#745); split layouts are a follow-up idea.
