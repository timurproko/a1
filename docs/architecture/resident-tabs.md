# Resident tabs — architecture and roadmap

Status: planned. Nothing here is implemented until the milestone change that delivers it merges. This document is the living design for multi-agent tabs; each milestone change cites the decisions it implements and updates this file when a decision changes. The full target behavior is in [`resident-tabs-requirements.md`](resident-tabs-requirements.md); each milestone moves its slice of those requirements into its own OpenSpec change and removes it from that file.

## Context

Today bare `a1` runs as a chain: `bin/cli.js`, then a detached per-release **supervisor**, then the foreground **launch guardian**, then the native **process-guardian**, then `bin/ui.js`. That last process hosts one in-process Pi `AgentSessionRuntime` behind the owned UI. The process-guardian puts the UI in kill-on-close containment, so closing the terminal kills the agent. `launch-instance-lifecycle` requires that behavior and reserves "a separately specified explicit resident capability" for anything that must survive. This design defines that capability.

The user set three product constraints:

1. Agents survive terminal closure, and relaunching reattaches.
2. Extensions work as natively as possible, including extensions that render their own in-process UI.
3. The same tab system must next host arbitrary interactive CLIs.

A structured, message-based agent protocol cannot meet (2), because an extension's custom UI component is code running inside the agent process. It also forces a second, unrelated system for (3). Every tab is therefore a **terminal session**: a pseudoterminal running the complete A1 owned UI in "tab mode". Native extension components retain the declared text-terminal behavior; inline image protocols are explicitly outside the first version and use the existing text fallback.

The first version is deliberately narrower than the eventual product. It is an opt-in preview on Windows x64, macOS, and Linux (the platforms A1 already ships the native process-guardian for), with `tabs.resident=false` by default. It is delivered as six sequenced milestone changes, each merged behind that setting. Restoring tabs after reboot or logout, default enablement, automatic resident-cohort upgrades, arbitrary CLI tabs, and split layouts each require a later change and their own evidence.

Existing assets:

- **`native/terminal-host`** is a working in-terminal host. It uses `libghostty-vt` pinned at `c5a21edf`, `portable-pty` 0.9.0 (ConPTY on Windows, Unix PTYs elsewhere), crossterm 0.29, and an A1-owned damage-aware frame composer. It already has per-pane retained models, focused-input isolation, libghostty mouse and key encoding, host-owned selection with OSC 52 copy, resize, and verified cleanup. Today it is only a fixed 2×2 proof with no resident mode.
- **The supervisor, process-guardian, and launch guardian** provide the patterns for detached spawn, verified process identity (`--inspect-pid`), an endpoint probe with join-the-winner, and atomic metadata. The process-guardian already has Windows, macOS, and Linux implementations.
- **The 2×2 spike evidence** in [`evidence/terminal-host-spike/`](evidence/terminal-host-spike/) is historical. Its verdicts stay pending and are not evidence for this design.

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
- A1's existing prompt history is asynchronous and can skip writes; it is not the durable-before-dispatch journal. The native host is a fixed 2×2 proof, not resident infrastructure. Its historical acceptance record still has pending technical/physical verdicts and must not be relabelled as accepted.
- Before implementation, reconcile current `develop`, including #588's terminal-query/CI ownership and #667's surviving-owner terminal restoration. Update architecture/proof documentation during approved implementation to distinguish this single-pane resident certification from future split certification, preserving historical evidence unchanged.
- herdr's Unix paths (socket bind as lock, Unix detach, the macOS per-user bootstrap port fix in #4100) are references for the macOS and Linux roles, not evidence for them.

### Relation to the in-process prep refactors (2026-10-09/10)

PRs #729–#736 prepared the owned UI for several sessions in one process. This design runs one A1 process per tab, so it does not depend on the shared helper pools (#733), the engine host's multi-session factory (#734), the terminal-host/presenter split (#735), or the per-agent claim dimension (#736). It does use the lifecycle ordering from #732 (bounded quit, clean disposal), which tab detach and restart rely on, and the unique required session ids from #734. Each tab process must get its own launch runtime id so worktree claims (#736) never collide.

## Goals / Non-Goals

**Goals:**

- Several independent A1 agents in opt-in bare `a1` tabs on Windows x64, macOS, and Linux, each running the full A1 UI with its extensions. The user can create, switch, rename, reorder, and close them.
- Tabs keep running through terminal closure, SSH drops, attach-client crashes, and resident-server crashes. Relaunching from any terminal reattaches with exact screen state. A crashed tab restarts into its session without replaying an interrupted prompt.
- One tab's failure never affects another tab, the server, or the client. Package activation retains every immutable release still used by resident processes.
- Status comes from structured engine events, not screen text.
- Terminal bytes, input, and rendering stay native. Node never relays them.
- Security and recovery remain verifiable after server loss: derived credentials re-admit holders, an OS writer lease prevents split-brain registry writers, and every command or mutation is epoch-fenced.
- The tab model is kind-neutral, so arbitrary CLI tabs are a follow-up without redesign.
- The work is testable hermetically, including kill, crash, stale-server, controller-transfer, and reattach interleavings.

**Non-Goals:**

- Enabling resident tabs by default on any platform.
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

### 2. One native binary, three roles, plus the A1 child

```text
 terminal                         (detached, per OS user × profile)
┌──────────────────────────┐     ┌─────────────────────────────────────┐
│ a1  →  guardian  →       │     │ a1-terminal-host server             │
│ a1-terminal-host attach  │◀───▶│  registry (atomic JSON, fsync)      │
│  tab strip + active tab  │ pipe│  topology, client fan-out, restore  │
│  outer terminal I/O      │     └───┬──────────────┬──────────────┬───┘
└──────────────────────────┘         │pipe          │pipe          │pipe
   (launch instance, dies with       ▼              ▼              ▼
    the terminal: harmless)     holder: tab 1   holder: tab 2   holder: tab N
                                PTY/ConPTY      PTY/ConPTY      PTY/ConPTY
                                ghostty model   ghostty model   ghostty model
                                   │                │
                                node ui.js --tab node ui.js --tab …
                                (full A1 UI + Pi + extensions)
                                   └── tab bridge ──▶ server (status, session, name, detach)
```

- **attach** is the foreground `a1` surface. It runs inside the bare-A1 launch instance and dies with the terminal, which is harmless.
  - It owns raw mode, the alternate screen, outer terminal mode negotiation, the tab strip, composition of the active tab's retained surface, input arbitration, and shortcut interception.
- **server** is resident. It owns:
  - the registry and topology revisions;
  - the list of holders and client sessions;
  - fan-out of the active tab's surface to each client;
  - tab-bridge termination, and restore and restart policy.
  It runs no A1 or Pi code and holds no PTY. That keeps it small and hardens it against the herdr single-point-of-failure problem.
- **holder** is resident, one per tab. It owns:
  - exactly one PTY (ConPTY on Windows) and its child process tree;
  - one libghostty-vt retained model with bounded scrollback;
  - input encoding and the per-tab damage state.
  Because ConPTY belongs to its creating process, each tab has its own creator. A server crash therefore does not destroy a tab's ConPTY; holder failure affects only that tab. Actual child/tree exit and writer-lease release still require verification, not inference from the pseudoconsole closing.
- **Why the server relays surfaces instead of clients connecting to holders directly.** It gives one authenticated endpoint per client, one ordering domain for focus and topology, and simpler multi-client arbitration. Measure the extra local pipe hop in the native hot-path evidence rather than assuming its latency. The server forwards encoded patches and does not re-render them.

### 3. Host scope, endpoints, writer authority, and credentials

- There is **one server per OS user × canonical A1 profile root**, independent of the release cohort. Tabs must outlive release changes, and the supervisor is forbidden from retaining runtime processes.
  - Windows endpoint: `\\.\pipe\a1-tabs-<sha256(profileHome\0runtimeDir)[0:20]>`.
  - macOS and Linux endpoint: a Unix domain socket `a1-tabs-<same hash>.sock` inside an owner-only (`0700`) per-user runtime directory (`$XDG_RUNTIME_DIR` when set, otherwise a private directory under the profile's runtime dir), kept short enough for the platform's socket path limit.
  - Holders use `…-h-<tabId>` endpoints.
  - Hermetic override: `A1_TABS_ENDPOINT`, together with the `A1_*_DIR` overrides.
- **The endpoint is discovery; the writer lease is authority.** A starting server probes with a real handshake. If a live server answers, it exits as `already-running` and joins the winner. A failed probe does not authorize blind endpoint reclaim: the starter reads the owner marker, verifies pid and native start identity, requests termination, and waits for the owner-only OS-exclusive registry-writer lease. If the owner cannot be verified or the lease cannot be acquired, startup fails closed instead of creating split brain.
- The ownership marker `{serverId, pid, startIdentity, bootNonce, generation, build}` is written atomically under the writer lease. Every registry mutation rechecks the held lease and current epoch before commit. A server removes an endpoint or marker only while both still identify it.
- **Access and authentication:**
  - The endpoint, token files, secret file, registry, and writer lease are owner-only: Windows ACLs on the named pipe and files, `0700` directories and `0600` files on macOS and Linux, plus a peer-credential check (`SO_PEERCRED` / `getpeereid`) on every Unix socket connection.
  - Clients present a random 32-byte client token from an owner-only file.
  - One random owner-only profile secret persists outside the registry. Per-tab/per-incarnation holder and bridge credentials are derived from that secret and the non-secret tab/incarnation identity, so a replacement server can authenticate surviving processes without storing tab credentials.
  - Holders and bridges also present pid and native start identity. Nothing unverifiable is adopted, signalled, terminated, or allowed to mutate state.

### 4. Detached start

- **Server start.** The server is started from the Node pre-guardian bootstrap (`ensureTerminalHost()` beside `ensureSupervisor()`), through `a1-terminal-host server --detach`.
- **No general escape from containment.** On Windows, ordinary launch-instance jobs and holder-owned child jobs retain kill-on-close containment without `JOB_OBJECT_LIMIT_BREAKAWAY_OK` or silent breakaway; a job flag cannot allowlist an executable. On every platform, resident creation is a distinct authenticated fixed-role operation, not an arbitrary executable/argv spawn service.
- **Authorized launch and recovery.** Initial creation runs before the launch guardian. A contained attach client or surviving holder can request the native verified `server --detach` recovery path; the native routine verifies the immutable terminal-host artifact, role, canonical profile, and request authority before spawning outside containment. It exposes no generic escape API to tool/extension descendants. Owner-only credentials prevent cross-user access; this is not a sandbox against arbitrary malicious code already running as the same OS user.
- **Windows:**
  - Select valid platform creation flags for detached, console-free startup; do not assume combining `DETACHED_PROCESS` and `CREATE_NO_WINDOW` adds a guarantee. Verify resulting process identity and job containment before reporting resident readiness.
  - For a caller in a foreign kill-on-close job that denies breakaway (Windows OpenSSH, some IDE terminals), use WMI `Win32_Process.Create` with an explicit environment block and cwd, bounded startup, and post-launch verification (herdr reference).
  - Milestone 1 must pin the concrete authorized recovery transport and handle-inheritance rules and prove them with containment fixtures before milestone 2 relies on survival.
- **Every platform** records the observed detachment mode and any failed verification reason.
- **macOS and Linux:**
  - Start resident roles in a new session (`setsid`) with no controlling terminal, standard streams on `/dev/null`, and an explicit environment and cwd, so terminal close and SSH hang-up (`SIGHUP`) do not reach them. Verify the resulting session, process group, and identity before reporting readiness.
  - The process-guardian's kill-on-close tree tracking must not adopt resident roles, and ordinary descendants must not gain a way to leave their tree.
  - macOS: keep the resident roles in the user's per-user bootstrap namespace, so clipboard, keychain, and other per-user services keep working after the launching terminal closes (herdr #4100 is the reference). Linux: a session manager that kills user processes at logout (systemd `KillUserProcesses`) ends tabs at logout; that is the documented logout behavior, not a failure.
  - Milestone 1 proves these with fixtures on each platform before any milestone relies on survival.
- **Holders** are spawned by the server through the same platform detach routine.
- **Unverified survival** uses the direct single-agent fallback with one notice, not a purported resident tab that remains contained. Reject or clean up only the exact verified incomplete resident start; never terminate an unverifiable process. Existing resident records and session leases remain intact.

### 5. Protocols

The channels carry bounded, length-prefixed binary frames: a u32 length followed by a typed payload. There is a 2 MiB cap per frame, 1 MiB per input message, and a 4 s handshake timeout.

- **Handshake:** `hello{role, generation, build, features[], token}` → `welcome{…, limits}`.
  - `generation` is the stable compatibility number. Within a generation, messages change only additively: new fields are optional, enums carry an `unknown` fallback, and a missing method disables only that action.
  - A mismatched generation yields a typed `incompatible-generation` outcome.
  - Frozen fixtures and digests guard each generation's shapes (herdr pattern).
- **Client ↔ server:**
  - **Topology.** `tabs.subscribe` returns a snapshot with a revision, followed by changes. Mutations are `tab.create{kind:"a1", cwd, env, session?}`, `tab.rename`, `tab.reorder{expectedRevision}`, `tab.close`, `tab.retry`, `tab.fresh`, and `tabs.stopAll`. A stale revision is rejected atomically.
  - **Surface.** `tab.view{tabId, size}` returns a full retained surface (cells, attributes, hyperlinks, cursor, modes), then patches against its revision. `tab.unview` ends it. Only the tab a client is viewing streams surfaces to that client (v2 lesson).
  - **Controller.** `tab.claimInput{tabId, clientId, expectedControllerRevision}` transfers one controller lease through a fenced input-admission boundary. Freeze old-controller admission; account for all already accepted input, including PTY and child buffers; establish a child-observed causal boundary; then acknowledge the new owner and admit new input. A sideband `bridge.inputOwner` acknowledgement alone does not order an independent PTY stream. The concrete barrier is a milestone-1 protocol proof obligation and must pass delayed-buffer tests before multi-client commands are enabled. Requests bind an immutable origin controller generation at command admission, not execution; stale or ambiguous requests are rejected, never relabelled. If the bridge or proven boundary is unavailable, terminal input remains usable with client-scoped child commands disabled; attach-local double-`Ctrl+C` remains available.
  - **Input.** `tab.input{tabId, controllerRevision, bytes|keyEvent|mouseEvent|paste|focus}` is accepted only from the current controller and encoded by the holder with libghostty-vt against the child's current modes.
  - **Resize.** `tab.resize{tabId, controllerRevision, cols, rows}`. The PTY size follows the current input controller; read-only viewers cannot resize the child.
  - **Attention.** Status and attention events arrive for all tabs, even unviewed ones.
- **Server ↔ holder:** `holder.ready{tabId, token, pid, startIdentity, childPid, childStartIdentity, release}`, then surface patches, `holder.exit{code, signal}`, and heartbeats. The server forwards input and resizes.
- **Tab bridge (A1 child ↔ server):**
  - The child receives `A1_TAB_ID`, `A1_TAB_TOKEN`, and the endpoint through the fixed startup contract. The child consumes credentials before loading extensions or spawning tools and removes them from inherited environments; holders cannot sanitize grandchildren by themselves. Reconnect credentials remain in child-private memory and are never restored to `process.env`.
  - The child sends `bridge.status{seq, state}` derived from engine events: `agent_start`, `turn_start`, tool execution, settled idle, `stopReason`, pending extension UI or trust requests, and compaction.
  - It also sends `bridge.session{file, name}`, `bridge.request{action, clientId, controllerRevision}`, and `bridge.prompt{interrupted?}` metadata. Client-scoped requests are honored only when their controller generation is current. Prompt text and terminal input are never sent through the bridge.
  - The server sends `bridge.visibility{visible}`, so a hidden A1 throttles animation, and `bridge.rename`, so a strip rename sets the Pi session name.
  - The bridge is advisory. A missing or broken bridge degrades that tab to process-level status and never breaks the tab.
- **Backpressure:**
  - Each client connection has a reliable, bounded control lane and a **single-slot render lane**. A newer patch set replaces an unsent one. A client that falls behind is re-sent a full surface once it drains.
  - The server never blocks a holder, another client, or registry writes on a slow client.
  - Holders parse their PTY continuously, whether or not the tab is viewed, so a PTY is never throttled and a child never blocks on output.

### 6. Rendering, input, and outer-terminal fidelity

- **Composition.** The attach client composes row 0 (the strip) and rows `1..N` (the viewed tab's surface). The tab PTY is sized `cols × (rows − 1)`. Composition reuses the proof's damage-aware composer and synchronized-output support, and falls back to a full repaint only when the layout changes.
- **Outer modes.** The client negotiates the outer terminal's modes: raw mode, alternate screen, bracketed paste, focus events, SGR mouse, kitty keyboard protocol where available, and synchronized output.
  - Child-requested modes are tracked in the holder's model. Input is re-encoded per child mode by libghostty-vt, which the proof already does.
  - Mouse rows are offset by the strip. Row 0 belongs to the client.
  - When the child has not requested mouse reporting, selection is host-owned and scoped to the pane, as in the proof.
- **Passthrough and intercepts:**
  - OSC 52 clipboard writes, OSC 8 hyperlinks as cell attributes, OSC 0/2 titles as tab metadata, and cursor shape pass through. A bell (BEL) from the child is never forwarded to the outer terminal; icons are the only attention signal (Decision 7).
  - Queries the child sends, such as DA and cursor position, are answered by the holder's model, never by the outer terminal.
  - Image protocols are not forwarded in the first version; the terminal identity the child sees disables them and existing text fallback applies. Extension parity is claimed only for the certified text-terminal contract.
- **Detach.** On detach the client restores the outer terminal's keyboard and mouse modes exactly. Enhanced keyboard sequences must not leak into the parent shell (herdr CHANGELOG lesson). Preserve A1's surviving-owner restoration for a killed attach process; an in-process panic/fatal hook cannot run after forced termination. The outer bootstrap/exit-notice owner performs bounded emergency restoration without giving either guardian terminal-byte relay authority.

### 7. Status and attention come from the tab bridge

Tab status is an A1-owned state machine fed by `bridge.status`:

| Status | Source | Glyph |
|---|---|---|
| `starting` / `restoring` | holder spawned, bridge not ready | dim progress frames |
| `idle` | settled idle | none |
| `working` | agent or turn start, tool execution, compaction | shared progress frames |
| `needs-input` | an extension UI, trust, or permission request is pending | yellow `?` (warning) |
| `done-unseen` | the turn settled while no client viewed the tab | `✓` success |
| `error` | the last turn's `stopReason` was error | `✗` error |
| `crashed` / `restarting` / `failed` | holder or child exit | `✗` error plus a banner |
| `suspended` | idle suspension | dim `◌` |

- `seen` is tracked server-side, so viewing a tab in any client clears `✓` everywhere.
- A tab with a broken bridge shows only process-level states.
- Future CLI tabs will derive status from process state, and may use BEL or OSC 9/777 from the program as an attention input.
- The glyph set is the same in every client.
- **Icons are the only attention signal (user decision).** There is no bell, sound, terminal notification, or OS notification. The status icon is the signal: spinner = working, `✓` = finished, red `✗` = failed, yellow `?` = needs you.

### 8. Durable state

- **Pi's session JSONL**, written by the child, is the authoritative transcript.
- **The registry** is `<dataDir>/tabs/<profile-token>/registry.json`:
  - It is written only while the server holds the OS-exclusive writer lease and current epoch: to a temporary file, then write-capable `fsync(file)`, rename, and `fsync(dir)`, on every mutation before acknowledgement.
  - Up to 20 rotated generations are kept in `registry-history/`, at most one per 15 minutes.
  - An unparseable file is quarantined as `registry.corrupt-<ts>.json`, and the last good history generation is loaded. A notice names both. If existing state has no valid recoverable generation, fail recovery closed with preserved files rather than initialize an empty registry.
  - JSON with explicit synchronization is chosen over sqlite to keep the native server dependency-light. Milestone 1 must specify, per platform, the write-handle, atomic replacement, and directory/metadata durability semantics and their supported-filesystem limits: on Windows a write-capable flush plus write-through replacement, because a POSIX-shaped `fsync(dir)` is not evidence of a Windows power-loss guarantee; on Linux `fsync` of file and parent directory; on macOS `F_FULLFSYNC`, because plain `fsync` does not flush the drive cache.
  - A durable mutation is acknowledged only after its commit barrier. On failed persistence, reject new durable mutations; retain live observed process state in memory without claiming it is committed or rebuilding it from older disk state. Retry bounded writes; never kill a live tab solely because persistence failed.
- **Per-tab fields:**
  - identity: `tabId`, `kind`, `createdAt`
  - naming: `displayName`, `nameSource` (`default|auto|user`)
  - placement: `order`, `cwd`
  - session: `sessionFile`, `sessionDir`
  - lifecycle: `desired` (`running|stopped`), `lifecycle`, `attentionSeq`, `seenSeq` (volatile status is rebuilt from the bridge and is never persisted)
  - holder: `holderPid`, `holderStartIdentity`, `release`
  - restarts: `restarts`, `restartWindowStart`, `lastExit`
  - `registryRevision`, `epoch`, and `bootId`
- **No per-tab credential is persisted in the registry.** The owner-only profile secret is stored separately and derives per-tab/per-incarnation credentials from recorded non-secret identities. The environment sent with `tab.create` is kept in holder memory only; a tab restarted after a crash reuses its holder's environment.
- **Session-writer lease.** All A1-owned session writers (resident, direct/fallback, and Pi-comparison) on the supported platforms use one profile-neutral native lock primitive before opening a session for writing, independent of `tabs.resident`. It does not start a host, holder, or bridge for direct modes. The primitive is an OS lock held by the writer process itself (`LockFileEx` on Windows, an open-file-description `fcntl` lock on Linux, `flock` on macOS), so the kernel releases it only when the writer is gone. Resolve canonical filesystem identity, including case, junction/symlink, hard-link and existing-file aliases; reserve the canonical parent/name for a not-yet-created session and bind it to the created file identity without an admission gap. The registry and holder coordinate admission, but a holder-only lock is insufficient: native lease custody must remain valid for the actual writer's lifetime, including any interval after holder death. Pin and prove the writer-bound lock/handle design on each platform in milestone 1; do not infer child death from pseudoterminal loss. Replacement requires lease acquisition and verified prior-writer/tree exit; uncertainty blocks it. Session switching acquires the target before relinquishing the old writer lease, and failed switches preserve the original session. Resident selection focuses an existing tab; direct-mode conflicts fail safely or offer an explicit fork, never silently attach or overwrite. Unmodified external Pi, older nonparticipating builds, and arbitrary file writers are outside this cooperative guarantee; document that limitation rather than claiming an OS sandbox.
- **Prompt journal.** `<dataDir>/tabs/<profile-token>/<tabId>/journal.jsonl` is an owner-only child-owned recovery journal, separate from asynchronous prompt history. Each submission has a stable ID and session/incarnation identity. Admission awaits a successful durable journal commit before dispatch; timeout/failure leaves the prompt in the editor with a visible failure and dispatches nothing. Correlate it with the committed session entry, and retire it only after the corresponding session data is synchronized; a settled turn's durable completion also records its submission ID so recovery never offers a completed prompt as unfinished. Recovery merges journal/session evidence by identity and never automatically resends, including when a crash occurs between dispatch, session append, sync, and journal retirement. Preserve the first-turn journal and reserved session identity if Pi has not created its file yet; distinguish that from an unexpectedly missing existing transcript.
- **Draft checkpoint.** Use a periodic dirty checkpoint with a maximum one-second dirty interval while storage is healthy, including uninterrupted typing, rather than inactivity-only debounce. Expose failed/late checkpoints as degraded recovery; never continue claiming the one-second bound during a blocked disk or event-loop stall. Drafts and submitted prompts have different guarantees.

### 9. Failure and recovery

| Failure | Detection | Outcome |
|---|---|---|
| Tab child exits or crashes | holder sees the child exit | If the exit was not requested: `crashed`. The holder respawns `ui.js --tab --session <file>` with backoff 1 s, 5 s, 30 s. After 3 restarts in 10 min: `failed`, with a banner `✗ <reason> — [r] retry · [f] start fresh · [alt+w] close`. An interrupted prompt (reported via the bridge, or detected as a trailing user entry) is offered back into the editor and never resent. Child stderr, if separately available, is a private content-bearing recovery artifact, never an ordinary diagnostic log. |
| Holder crash | pipe EOF plus verified process identity/exit | Pseudoterminal loss is not proof that every descendant exited. Verify the old writer/tree is gone and acquire its writer lease before resuming in a new holder; otherwise keep the tab blocked without duplicate writers. |
| Holder hang | holder control heartbeat every 5 s, 3 missed over a healthy supervision path | Terminate only the verified holder/tree within bounded deadlines, then follow the lease-gated recovery path. |
| A1 child hang | missing child event-loop heartbeat over a healthy bridge path | Warn at 30 s; restart at `tabs.unresponsiveRestartSeconds` (default 120), preserving journal/screen. A server/bridge transport outage alone is not proof of a child hang. |
| Server crash | clients and holders see the pipe EOF | Holders keep running. A client or holder starts a replacement, which acquires the released writer lease, increments the epoch, derives expected credentials, and re-admits identity-verified holders. A live but unresponsive recorded owner is terminated only after native identity verification; an unverifiable owner blocks replacement. After 3 starts in 60 s, clients show `✗ tab host stopped — [r] restart · [q] quit`. |
| Attach client crash or terminal close | the server sees the pipe EOF | Nothing happens to tabs. Pending requests stay `needs-input`. |
| Reboot or logout | the platform boot identity differs, or no verified holders exist for a new OS session | Tabs are not restored in this version. The server moves the previous tab set to registry history, and bare `a1` starts with one new tab. Every previous session stays resumable through the normal session picker or `a1 --session`. A pending journaled prompt is offered when its session is next opened in a tab, for up to seven days. Restoring tabs after reboot is a follow-up change. |
| Missing cwd or session on crash restart | stat or open fails | The tab is `failed` with the reason and path. It is never moved elsewhere, and the file is never overwritten. A reserved first-turn identity with a journal and no previously created transcript follows journal recovery instead. |
| Registry corrupt | parse or validation fails | The file is quarantined, the last good generation is loaded, and a notice is shown. |
| PID reuse | start-identity mismatch | The process is never adopted or killed, and the record is treated as having a dead holder. |
| Disk full | write fails | The mutation is rejected with its reason, and running tabs are unaffected. |
| libghostty or parser panic in a holder | the Rust panic hook | The holder logs, exits, and follows the holder-crash path. Other tabs are unaffected; the per-tab processes exist for exactly this (the herdr #453 lesson). |

### 10. Updates and version skew

- **Binaries.** The server and holders run from immutable release directories, never from the mutable npm prefix, so no running binary is ever overwritten.
- **Same generation, newer client.** The client attaches normally, and features the server lacks are disabled per method.
- **No automatic handoff in the first version.** A compatible resident cohort remains on its immutable release until all of its tabs stop. A newer same-generation client may attach with unsupported optional operations disabled.
- **Retention.** Release collection keeps the server's, every holder's, and every tab child's release while native identities verify. Package activation does not terminate or overwrite them.
- **Incompatibility.** A generation mismatch never kills resident processes. The client reports that the resident host must be stopped explicitly before the preview can restart on the newer generation. Automatic server handoff and idle tab recycling require a follow-up change.

### 11. Foreground UX

- **Strip.** Row 0, drawn by the attach client:
  - Chips are at most 20 columns, clipped with `…` by grapheme width (fixing v2's UTF-16 bug), with no separators.
  - A `…` overflow menu holds tabs that do not fit, and `+` is always reserved.
  - Theme roles are resolved by Node at launch from A1 settings and passed to the client, so the colors follow the A1 theme.
- **Keys.** These are intercepted by the attach client before input encoding. They are configurable through a keybindings file and conflict-checked against A1's registry at launch.

  | Key | Action |
  |---|---|
  | `Alt+A` | new tab |
  | `Alt+W` | close |
  | `F2` | rename |
  | `Alt+1`…`Alt+9`, `Alt+0` | jump to a tab |
  | `Alt+.` / `Alt+,` | next / previous, wrapping |
  | `Alt+>` / `Alt+<` | move the tab right / left |
  | `Ctrl+C` `Ctrl+C` | detach (leave `a1`; tabs keep running) |

  - `Alt+[` and `Alt+]` are avoided because `ESC [` is the CSI introducer in legacy encodings.
  - `Alt+←` and `Alt+→` are avoided because A1 uses them for word motion.
  - **`Ctrl+C` twice leaves, in every tab (user decision).** The client forwards the first `Ctrl+C` to the tab unchanged, so a single press still clears, copies, or interrupts. It consumes the second press within the existing clear/exit interval as the detach request and does not forward it. The tab therefore never receives a second `Ctrl+C` from the chord, which removes v2's bug where `Ctrl+C+C` killed the agent. The trade-off: a future CLI tab cannot receive two quick `Ctrl+C`s. Pressing them more slowly than the interval still reaches the program.
- **Mouse on row 0:**
  - click activates a tab;
  - right-click opens `Rename`/`Close`;
  - dragging reorders, with a `│` drop marker, after 250 ms or once the pointer moves;
  - `+` creates a tab.
- **Commands inside A1 tabs** travel through the bridge:
  - `/new-tab [name]`
  - `/close`
  - `/name <name>` (existing; it also renames the tab)
  - `/tabs` (a picker with status and cwd)
  - `/quit-all`
- **Naming:**
  - Default names are `agent` or `agent N`.
  - When `tabs.autoName` is on (the default, by user decision), the tab's model proposes a hyphenated lowercase name of at most 16 characters after the first settled turn. It uses a small budget and one retry, with a fallback derived from the first prompt, and it runs inside the child.
  - A user rename sets `nameSource=user`, and auto-naming never overrides it.
  - Rename is inline in the chip: `Enter` commits, and `Esc` or a click elsewhere cancels. The name is trimmed, must not be empty, is at most 64 characters, and has control characters stripped.
- **Close.** When a tab is `working` or `needs-input`, or its bridge reports queued input, the strip asks `Stop "<name>"? Enter stop · Esc cancel` before closing. Closing sends the child a graceful shutdown, waits a bounded time, terminates the tree, and removes the tab. Its session stays resumable. Closing the last tab leaves the strip with `+` and a hint.
- **Detach.**
  - `Ctrl+C` twice detaches from any tab and is handled by the attach client, so it works even when the bridge is down. Inside an A1 tab, `/quit` and empty-editor `Ctrl+D` send a detach request carrying the immutable command-origin controller identity and revision; stale, ambiguous or unavailable attribution keeps the tab running and directs the user to `Ctrl+C` twice.
  - The client restores the terminal. When tabs are still running, it prints `N tabs still running · run a1 to return`; otherwise it prints the resume hint.
  - `/quit-all` stops every tab, with confirmation if any is busy.
- **Launch and reattach:**
  - Bare `a1` ensures the server and attaches.
  - With zero tabs, it creates one A1 tab in the launch cwd.
  - Otherwise it views the last active tab from its retained surface without byte-history replay. Measure retained first paint and first input separately from bootstrap; status for the remaining tabs arrives without subscribing to their surfaces.
  - `a1 --session X` opens X in a new tab, or focuses the tab holding it.
  - A new tab's cwd is the client's launch cwd.
  - Prewarm (`tabs.prewarm`, default 1) keeps one hidden standby A1 tab ready after the survival/recovery milestones. Measure A1 warm promotion directly; v2's tens-of-milliseconds result is reference evidence only.
- **Several terminals.** Each client has its own active tab, but each tab has one explicit input controller. A second client may view read-only or claim control through Decision 5's causal input barrier. Only the controller may send input or set PTY size. Delayed slash commands preserve their submission origin; stale or unprovable attribution affects neither client and falls back to attach-local actions.
- **Background attention.** Only the chip icon changes. There is no bell, sound, or notification, and no setting for one.

### 12. Limits and resources

The settings live in the owned settings screen, each with a hard cap.

- `tabs.max` defaults to 10, with a hard cap of 50. `tabs.maxConcurrentStarts` defaults to 2.
- `tabs.suspendIdleAfterMinutes` defaults to 60, by user decision. An idle tab with no pending request, no queued input, and no viewer stops its child after that interval and shows `◌`. Focusing or prompting it resumes the session. Extension in-memory state is lost, which the settings text says.
- Scrollback is capped at 10 MiB per holder, and the replay after a server restart is the retained model itself.
- The server exits after 10 minutes with no running tabs and no clients.
- Structured diagnostic logs are `terminal-host-server.log` and `terminal-host-holder-<tab>.log`, rotated at 5 MiB with three kept. Use allowlisted fields/reason codes, not arbitrary exception strings, prompt text, terminal content, or credentials.
- Raw child stderr cannot be declared sanitized: when available separately from ConPTY's combined terminal stream, store it only under the owner-only per-tab recovery area, at 5 MiB with three generations and a seven-day maximum age, alongside bounded last-screen files. Do not scrape stderr back out of terminal cells. These private artifacts may contain conversation or sensitive content and are excluded from `a1 tabs doctor`; neither their contents nor arbitrary extension errors enter structured crash records.
- `a1 tabs host status` prints the server id, build, generation, detachment mode, tab count, and log paths.

### 13. Packaging and certification

- `a1-terminal-host` is built and packaged for every platform A1 ships the process-guardian for (Windows x64, macOS, Linux), extending the impact-selected Windows CI owner introduced by #588 to a platform matrix, with Zig 0.15.2 for pinned libghostty-vt. It ships in the immutable release with artifact manifest, hash verification, provenance, licenses, and notices.
- Opt-in acceptance requires exact-package hermetic suites on each platform plus manual or isolated-worker evidence per platform for terminal close, SSH/session loss, reattach, input fidelity, extension text UI, failure recovery, rollback, and render smoothness. Evidence is never inferred from one platform to another.
- Default-on support on any platform requires a later change with an authorized isolated-worker 24-hour soak on that platform.

### 14. Security

- Endpoints, the registry-writer lease, profile secret, client token, registry, journals, and recovery snapshots are owner-only.
- Tab creation takes a cwd and an environment map. The child argv is fixed by A1, and clients never supply command lines.
- Holder and bridge credentials are derived per tab and process incarnation from the profile secret, are stripped from grandchild environments, and are never written to the registry or logs.
- The registry and structured logs contain no credentials, environment values, prompt text, or terminal content. Journals, retained screens, and optional raw stderr are explicitly sensitive recovery data with owner-only access, bounds, expiry, and no automatic diagnostic export.
- Everything runs as the invoking user.

### 15. Rollback

- `tabs.resident: false` restores direct bare-A1 launch. The server is not started, and the registry is preserved. The shared session-writer guard remains active, so fallback cannot write into a live tab's session.
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
8. **Prove it in stages.** Deterministic simulation, crash-point injection, fuzzing, bounded CI chaos on each platform, and exact-package physical evidence per platform gate this opt-in preview. A separately authorized isolated-worker 24-hour soak on a platform gates default-on for that platform; evidence is never inferred across platforms.

**How each v2 failure is closed:**

| v2 failure (forensic finding) | Root cause | Countermeasure here |
|---|---|---|
| A ConPTY spawn blocked forever, the hung daemon kept the pipe, and every window lost its agents | Synchronous `pty.spawn` on the shared loop | The PTY is created only inside that tab's holder, and the server kills that holder after a deadline and retries. Other tabs and the server are unaffected. |
| The watchdog SIGKILLed the daemon after a 60 s stall, and every agent died | Agents were children of the daemon | Holders and children survive a server death. The watchdog kills only the stalled process. |
| Synchronous `taskkill` loops blocked the daemon for 30–60 s | Blocking kills on the event loop | Kills run asynchronously and concurrently, with deadlines. The loop keeps answering heartbeats. |
| Blocked ConPTY writes stalled the loop, and keystrokes or pastes were silently dropped ("newest wins") | No flow control | A dedicated writer per holder with a bounded queue. Reserve capacity for a complete paste before delivery; reject an over-capacity paste visibly without delivering a prefix. After admission, preserve byte order and report delivery uncertainty if a child or process fails; never silently truncate or retry accepted bytes. |
| Terminal queries (DA/DSR/CPR) were answered by the busy shared emulator, so children stalled | One emulator loop for all agents | Each holder answers its own tab's queries from its own model. |
| Repaints arrived in fragments ("ghost frames"), patched with timing heuristics and two screen sources | Emulation reconciled with bridge surfaces by timers | One source of truth, the holder model. Frames are published at synchronized-output boundaries, with a bounded coalescing window. |
| A late exit event poisoned the replacement child | Events were not tied to an incarnation | Incarnation IDs on every event. Stale events are discarded. |
| Resizes were lost in transit | Edge-triggered resize | Size is desired state, reconciled until observed. |
| Restore spawned duplicate agents | No restore gate | A single start gate for crash restarts, at most one start in flight per tab, and conditional revisions. The duplicate-start invariant is checked in simulation. |
| A fresh agent whose session file was never reported could not be recovered | Session identity was learned after spawn | Session identity is committed to the registry before the tab accepts input. The prompt journal covers Pi's no-file-until-first-reply behavior. |
| A corrupt state file was treated as a fresh boot and wiped every record | Parse failure fell through to an empty state | Quarantine, then load the last good history generation, with a notice. The server never starts empty over existing data. |
| A failed persist plus a hot-swap re-read old state from disk and killed live agents as orphans | Rebuilding from disk over newer memory; the persist result was ignored | Memory stays authoritative on write failure: retry with backoff and report degraded health. There is no hot-swap, and processes are never killed because a registry read came back short. |
| fsync was probably a no-op on Windows (file opened read-only), and the directory was never synced | Wrong handle access | Files are synced with write access and the directory is synced too. A test asserts the platform flush calls. |
| Two processes appended to one session JSONL | Leases lived only in daemon memory | A canonical session-writer lock shared by every A1-owned launch mode, held by the writer process itself so the kernel releases it only when the writer is gone. |
| Boot-identity rounding misclassified a crash as a reboot | `now − uptime` rounded to minutes | Each platform reads an exact native boot identity (Windows boot sequence/`LastBootUpTime`, Linux `/proc/sys/kernel/random/boot_id`, macOS `kern.boottime`) and always verifies process identity by pid plus native start time. |
| A persist storm: a synchronous pretty-printed JSON write on every status change | Status was persisted with lifecycle | Only lifecycle and identity mutations are persisted. Status is volatile and rebuilt from the bridge. Writes run off-loop. |
| Hot-swapping the logic bundle caused generation bugs, lost deferred callbacks, and memory growth; kernel updates never applied | In-process code replacement, needed because restarts killed agents | No logic hot-swap. Crash recovery replaces a server while retaining its compatible cohort. Automatic upgrade handoff and release recycling remain deferred; idle suspension is not a cohort upgrade. |
| Crash evidence was deleted: the log was removed at boot, crash logs truncated on respawn, a 256-line queue dropped lines | Log handling | Size-rotated generations that are never truncated at boot. A distinct crash record per incident with a backtrace. `a1 tabs doctor` produces a redacted bundle. |
| Crash text was wiped by the alternate-screen clear | The child cleared the screen before printing | The holder freezes the last screen as a read-only snapshot and writes a recovery file. Separately available stderr goes only to private bounded recovery storage, never the doctor bundle. |
| Concurrent starts hit the `auth.json` lock ("No models available"), and `taskkill /F` left stale locks | Start storms and forced kills | Starts are capped and spaced. Graceful stop comes before force, so Pi releases its locks. A ten-tab concurrent start test asserts models are available. |
| A mid-edit extension reload crashed children | Children loaded a tree that was being edited | This is handled like any other crash: the bounded restart budget, the prompt journal, and the last-screen snapshot. The restart is visible and never silent. |
| The v1 daemon churned: slow replies were read as an outdated build | Timing used as a version signal | The version is carried by the explicit handshake generation, never inferred from timing. |

**Agents that stop making progress.** Liveness and progress are separate signals:

- Holder heartbeat: a Rust main-loop tick every 5 s seen by the server; three missed ticks over an otherwise healthy supervision path trigger verified holder recovery.
- A1 heartbeat: the child's Node event loop, seen through the bridge. After 30 s it shows `unresponsive`; after `tabs.unresponsiveRestartSeconds` (default 120) the tab restarts from its session with its journal and last screen preserved. A missing server or bridge transport degrades status, not proof of a child event-loop stall; reacquire liveness evidence before destructive recovery.
- Agent progress: model or tool events. After `tabs.stallNoticeSeconds` (default 300) it shows `stalled` with interrupt and restart actions. It is never auto-killed, because a legitimate tool can run for a long time.

**Data-loss envelope.** Distinguish process termination, power loss, and loss of both holder and child:

- Committed session entries: never lost (Pi appends synchronously per entry).
- Settled turns: survive power loss (fsync at settle).
- Submitted prompts: never lost (journal fsynced before dispatch).
- Drafts: at most one second of typing lost while periodic checkpoints and storage remain healthy; expose a degraded bound on checkpoint failure or stall.
- A streaming reply at the moment of a tab crash: readable from the last-screen snapshot and recovery file, but not resumable as a model turn. That is Pi's semantics.
- The only unrecoverable case is a streaming reply when the holder *and* its child die together, for example a machine crash, because it was never persisted.

**Verification program.** It runs incrementally across milestones 1–6 and gates the complete opt-in slice:

- Deterministic simulation and property tests of the sans-IO server core over death, loss, reordering, delay, stale epochs, controller transfer, churn, and mutation. Invariants include no lost committed mutation, one registry writer, one live incarnation per tab/session, attributable client-scoped requests, and convergence to running or failed.
- Failure points at every persistence and IPC step, with kill-at-each-point crash tests.
- `cargo-fuzz` targets for the protocol decoder and surface patch encoder.
- Bounded CI chaos on each platform with high-rate fake agents, random process death, resize/attach churn, controller transfer, blocked writes, pseudoterminal creation hang, rename denial, and containment escape attempts.
- Exact-package manual or isolated-worker physical acceptance on each platform. A later default-on proposal must additionally supply an authorized 24-hour soak on that platform with zero lost journaled prompts/committed entries, zero orphans/duplicates, bounded memory/handles, reattach p95 under 300 ms, tab restart under 3 s, and server recovery under 2 s.

## Risks / Trade-offs

- **[A server crash interrupts the display for everyone]** → Holders keep processes and screens alive. The server holds no VT, Pi, or extension code. It is auto-respawned by any client or holder, and reattach restores exact surfaces.
- **[Terminal fidelity in a composed surface]** (keyboard protocols, mouse, paste, IME, Unicode width, hyperlinks) → Reuse libghostty-vt encoding and the proof's input work, and add fidelity suites on each platform. Claims cover only the certified text-terminal contract; image protocols remain an explicit gap.
- **[Per-tab memory multiplies with holder and A1 processes; historical estimates are not measured A1 bounds]** → `tabs.max`, idle suspension on by default, and throttled rendering while hidden via `bridge.visibility`.
- **[Detachment is platform-specific and fragile]** (Windows jobs and SSH, macOS bootstrap namespaces, Linux logout policies) → Detection and escape live in the native binary per platform. The mode is reported, never assumed, and unverifiable survival falls back instead of claiming persistence.
- **[Three platforms multiply native and certification work]** → Platform code is confined to the thin I/O shell around one shared sans-IO core, and milestone 1 proves every platform primitive before later milestones build on it.
- **[The Zig and libghostty toolchain in CI and release]** → It is pinned already. Extend the #588 Windows owner and provenance gate to a macOS and Linux build matrix.
- **[No image protocol in tabs at first]** → Pi's text fallback applies and the gap is documented. Forwarding is a follow-up.
- **[Stale or duplicate processes after races]** → An OS-exclusive writer lease, current-epoch commits, one start gate, conditional registry revisions, derived credentials, and adoption only after identity verification.
- **[Two clients type into one tab or a delayed slash command detaches the wrong terminal]** → One controller lease, a proven cross-channel input-admission barrier, immutable command-origin generations, and fail-closed ambiguous requests. A sideband acknowledgement alone is not sufficient.
- **[Physical close, logout, and reboot cannot be tested hermetically]** → Owner-tree kills stand in for terminal close. Exact-artifact manual or isolated-worker records are required, and nothing is automated on an active workstation.

## Roadmap

Each milestone is its own OpenSpec change and pull request, merged to `develop` behind `tabs.resident: false`, so nothing user-visible changes until the preview is certified. A milestone starts only after the previous one merges, moves its requirements from [`resident-tabs-requirements.md`](resident-tabs-requirements.md) into its own spec delta, and covers Windows x64, macOS, and Linux together unless its change says otherwise.

| # | Change | Deliverable and exit evidence |
|---|---|---|
| 1 | `resident-tabs-contracts` (PR #586) | Native platform primitives with tests on every platform: fixed-role detached start and containment checks, process identity, owner-only endpoints, the writer-bound session lock, durable atomic file replacement, and boot identity. The frozen protocol generation 1 with fixtures, and the controller-transfer barrier proven in the sans-IO core. No product wiring. |
| 2 | `resident-tabs-persistent-tab` | The three native roles with one full A1 text UI, minimal authenticated registry and bridge, bounded I/O, explicit opt-in and direct fallback. Terminal and client closure, detached output, retained reattach, input, and surviving-owner terminal restoration. |
| 3 | `resident-tabs-failure-isolation` | Two tabs, server replacement with unchanged holder/child identities, isolated holder/child failure and hang, slow client and blocked writer isolation, exclusive registry epochs, the session-writer lock wired into every A1 launch mode, and no duplicate starts. |
| 4 | `resident-tabs-crash-recovery` | Crash restart into the session, durable-before-dispatch journaling, periodic drafts during continuous typing, correlation/retirement crash points, missing first-turn versus missing existing session, corruption/rename/disk failures, last-screen recovery, and sensitive-recovery/diagnostic separation. After reboot, previous sessions stay resumable, with no tab restore. |
| 5 | `resident-tabs-tab-ux` | Strip, shortcuts, mouse, commands, rename/reorder/close, status and needs-input, detach and resume, two attached clients with the controller-transfer barrier, and extension text fidelity. Then auto-naming, one prewarmed tab, and 60-minute idle suspension with the recorded defaults. |
| 6 | `resident-tabs-certification` | Packaging and release retention on every platform, maintenance commands, bounded resources, deterministic/property/crash/fuzz/chaos evidence and exact-package physical acceptance per platform, including SSH loss, forced attach death, conflict-safe direct rollback, and performance measured separately for cold launch, warm tab creation, reattach, and recovery. |

A failed milestone keeps the preview disabled and its pull request open until fixed. Change names for milestones 2–6 are working names and may change when each is planned.

### Follow-ups outside this roadmap

- **Reboot and logout restore:** reopen the previous tab set after a new OS session.
- **Work isolation:** explicit task-to-repository/worktree ownership, dirty-tree policy, concurrent-edit conflicts, and review/integration ownership. A tab's cwd is not an isolation guarantee.
- **Coordination:** task identities, delegation, prompt/result exchange, cancellation, permission and cost limits, and parent/child lifecycle. Herdr's agent start/prompt/read/wait API is a reference, not functionality included here.
- **Presentation and enablement:** generic CLI tabs, split layouts, remote attachment, automatic cohort handoff, and default enablement after a 24-hour soak per platform.

Each follow-up needs its own approved change.

## Recorded User Decisions

The user made these decisions on 2026-09-24:

- Every tab is a terminal session running the full A1 UI, so extensions stay native and CLI tabs can follow. This replaces the structured-worker design.
- There is one tab set per profile.
- LLM auto-naming is on by default.
- Idle suspension is on after 60 minutes.
- Icons are the only attention signal, with no bell, sound, or notification: spinner = working, `✓` = finished, red `✗` = failed, yellow `?` = needs the user.
- `Ctrl+C` twice leaves `a1` from any tab while tabs keep running. There is no separate detach key.
- Reliability is a first-class, release-gating requirement (Decision 16).

On 2026-10-10 the user confirmed this resident design over in-process tabs and set the first version's scope:

- Deliver as six milestone pull requests, each merged behind `tabs.resident: false`; PR #586 carries this roadmap and milestone 1.
- Target Windows x64, macOS, and Linux in the first version.
- Keep crash recovery (restart into the session, prompt journal, drafts); drop reboot and logout restore to a follow-up.
- Keep auto-naming, idle suspension with prewarm, and two attached clients.
- Hosting only: worktree isolation and agent coordination are separate follow-ups.
- Retire the earlier `evolve-bare-a1-into-multi-agent-workspace` plan (#745); split layouts are a follow-up idea.
