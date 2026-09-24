## Context

Today bare `a1` runs as a chain: `bin/cli.js`, then a detached per-release **supervisor**, then the foreground **launch guardian**, then the native **process-guardian**, then `bin/ui.js`. That last process hosts one in-process Pi `AgentSessionRuntime` behind the owned UI. The process-guardian puts the UI in kill-on-close containment, so closing the terminal kills the agent. `launch-instance-lifecycle` requires that behavior and reserves "a separately specified explicit resident capability" for anything that must survive. This change defines that capability.

The user set three product constraints:

1. Agents survive terminal closure, and relaunching reattaches.
2. Extensions work as natively as possible, including extensions that render their own in-process UI.
3. The same tab system must next host arbitrary interactive CLIs.

A structured, message-based agent protocol cannot meet (2), because an extension's custom UI component is code running inside the agent process. It also forces a second, unrelated system for (3). Every tab is therefore a **terminal session**: a pseudoterminal running the complete, unmodified A1 owned UI in "tab mode".

Existing assets:

- **`native/terminal-host`** (about 3.3k lines of Rust on `develop`) is a working in-terminal host. It uses `libghostty-vt` pinned at `c5a21edf`, `portable-pty` 0.9.0 with ConPTY, crossterm 0.29, and an A1-owned damage-aware frame composer. It already has per-pane retained models, focused-input isolation, libghostty mouse and key encoding, host-owned selection with OSC 52 copy, resize, and verified cleanup. Today it is only a fixed 2×2 proof with no resident mode.
- **The supervisor, process-guardian, and launch guardian** provide the patterns for detached spawn, verified process identity (`--inspect-pid`), an endpoint probe with join-the-winner, and atomic metadata.

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

## Goals / Non-Goals

**Goals:**

- Several independent A1 agents in bare `a1` as tabs, each running the full A1 UI with its extensions. The user can create, switch, rename, reorder, and close them.
- Tabs keep running through terminal closure, SSH drops, attach-client crashes, and resident-server crashes. Relaunching from any terminal reattaches with exact screen state. A reboot never loses a session.
- One tab's failure never affects another tab, the server, or the client. `a1 update` never kills tabs.
- Status comes from structured engine events, not screen text.
- Terminal bytes, input, and rendering stay native. Node never relays them.
- The tab model is kind-neutral, so arbitrary CLI tabs are a follow-up without redesign.
- The work is testable hermetically, including kill, crash, and reattach.

**Non-Goals:**

- Arbitrary CLI tabs in this change (a follow-up), split panes or layouts, and v2-style per-folder workspaces or sidebar.
- Resurrecting processes across reboot. Tabs restore from their Pi sessions.
- Network or remote attach, and multi-user sharing.
- Changing `a1 pi`.
- Automatically replaying an interrupted turn.
- Inline terminal image protocols (kitty graphics, sixel) inside tabs in the first release. Children see a host terminal identity without image support, and Pi's text fallback applies.

## Decisions

### 1. Tabs are terminal sessions running the unmodified A1 UI

Each tab runs `node bin/ui.js --tab` under a pseudoterminal. That child is today's owned UI with its in-process Pi runtime, extensions, and custom extension components, so there is no engine split, no remote adapter, and no extension bridge. Tab mode changes only three things:

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
  Because ConPTY dies with its creating process, each tab has its own creator. A server crash therefore cannot kill a tab, and a holder crash kills only its own tab.
- **Why the server relays surfaces instead of clients connecting to holders directly.** It gives one authenticated endpoint per client, one ordering domain for focus and topology, and simpler multi-client arbitration. The extra local pipe hop costs well under a millisecond. The server forwards encoded patches and does not re-render them.

### 3. Host scope, endpoints, and single instance

- There is **one server per OS user × canonical A1 profile root**, independent of the release cohort. Tabs must outlive release changes, and the supervisor is forbidden from retaining runtime processes.
  - Windows endpoint: `\\.\pipe\a1-tabs-<sha256(profileHome\0runtimeDir)[0:20]>`
  - POSIX endpoint: `<runtimeDir>/a1-tabs-<token>.sock`, with the existing Darwin short-path fallback
  - Holders use `…-h-<tabId>`, authenticated the same way
  - Hermetic override: `A1_TABS_ENDPOINT`, together with the `A1_*_DIR` overrides
- **The bind is the lock.** A starting server probes with a real handshake:
  - if a live server answers, it exits as `already-running` and the caller joins the winner;
  - if the endpoint refuses, is missing, or times out, it is stale and gets reclaimed.
  An ownership marker `{serverId, pid, startIdentity, bootNonce, generation, build}` is written atomically, and the server removes the endpoint only while that marker is still its own.
- **Access and authentication:**
  - The pipe gets the owner-only SDDL `D:P(A;;GA;;;SY)(A;;GA;;;OW)`, and the socket gets a 0700 directory and mode 0600.
  - Clients present a 32-byte token from an owner-only file.
  - Holders and tab bridges present per-tab tokens, and their pid and native start identity are verified before adoption. Nothing unverifiable is adopted or signalled.

### 4. Detached start on every platform

- **Server start.** The server is started from the Node pre-guardian bootstrap (`ensureTerminalHost()` beside `ensureSupervisor()`), through `a1-terminal-host server --detach`.
- **Breakaway from the guardian's job.** The attach client runs inside the guardian's job. When it, or a holder, must restart a lost server, it uses the same `--detach` path. `process-guardian` adds `JOB_OBJECT_LIMIT_BREAKAWAY_OK` to its job. Ordinary descendants remain contained; only an explicit `CREATE_BREAKAWAY_FROM_JOB` request from the terminal-host binary escapes. This keeps `launch-instance-lifecycle`'s "no implicit detachment" rule intact.
- **Windows:**
  - Start with `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW`.
  - If the caller is inside a foreign kill-on-close job that denies breakaway (Windows OpenSSH, some IDE terminals), launch through WMI `Win32_Process.Create` with an explicit environment block and cwd (herdr #2008).
  - The mode used (`console-detached`, `breakaway`, `wmi`, or `contained`) is recorded.
- **macOS:** `setsid`, then adopt the per-user bootstrap namespace (`bootstrap_look_up_per_user` and `task_set_special_port`) before any threads start (herdr #4100).
- **Linux:** `setsid` with null stdio. Detect systemd-logind `KillUserProcesses=yes` without linger, and report `degraded: logout-kills-user-processes` with the `loginctl enable-linger` hint.
- **Holders** are spawned by the server through the same routine.
- **`contained`** means survival cannot be proven. A one-time notice says tabs stop when this session ends. The product never claims survival it cannot deliver.

### 5. Protocols

The channels carry bounded, length-prefixed binary frames: a u32 length followed by a typed payload. There is a 2 MiB cap per frame, 1 MiB per input message, and a 4 s handshake timeout.

- **Handshake:** `hello{role, generation, build, features[], token}` → `welcome{…, limits}`.
  - `generation` is the stable compatibility number. Within a generation, messages change only additively: new fields are optional, enums carry an `unknown` fallback, and a missing method disables only that action.
  - A mismatched generation yields a typed `incompatible-generation` outcome.
  - Frozen fixtures and digests guard each generation's shapes (herdr pattern).
- **Client ↔ server:**
  - **Topology.** `tabs.subscribe` returns a snapshot with a revision, followed by changes. Mutations are `tab.create{kind:"a1", cwd, env, session?}`, `tab.rename`, `tab.reorder{expectedRevision}`, `tab.close`, `tab.retry`, `tab.fresh`, and `tabs.stopAll`. A stale revision is rejected atomically.
  - **Surface.** `tab.view{tabId, size}` returns a full retained surface (cells, attributes, hyperlinks, cursor, modes), then patches against its revision. `tab.unview` ends it. Only the tab a client is viewing streams surfaces to that client (v2 lesson).
  - **Input.** `tab.input{tabId, bytes|keyEvent|mouseEvent|paste|focus}` is encoded by the holder with libghostty-vt against the child's current modes.
  - **Resize.** `tab.resize{tabId, cols, rows}`. When several clients view one tab, the PTY size follows the client that most recently sent input to it (herdr).
  - **Attention.** Status and attention events arrive for all tabs, even unviewed ones.
- **Server ↔ holder:** `holder.ready{tabId, token, pid, startIdentity, childPid, childStartIdentity, release}`, then surface patches, `holder.exit{code, signal}`, and heartbeats. The server forwards input and resizes.
- **Tab bridge (A1 child ↔ server):**
  - The child receives `A1_TAB_ID`, `A1_TAB_TOKEN`, and the endpoint in its environment. Holders never pass these on to grandchildren.
  - The child sends `bridge.status{seq, state}` derived from engine events: `agent_start`, `turn_start`, tool execution, settled idle, `stopReason`, pending extension UI or trust requests, and compaction.
  - It also sends `bridge.session{file, name}`, `bridge.request{detach|newTab|close|rename}`, and `bridge.prompt{interrupted?}` metadata. Prompt text is never sent.
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
  - OSC 52 clipboard writes, OSC 8 hyperlinks as cell attributes, OSC 0/2 titles as tab metadata, cursor shape, and bells pass through as attention events.
  - Queries the child sends, such as DA and cursor position, are answered by the holder's model, never by the outer terminal.
  - Image protocols are not forwarded in this release; the terminal identity the child sees disables them.
- **Detach.** On detach the client restores the outer terminal's keyboard and mouse modes exactly. Enhanced keyboard sequences must not leak into the parent shell (herdr CHANGELOG lesson).

### 7. Status and attention come from the tab bridge

Tab status is an A1-owned state machine fed by `bridge.status`:

| Status | Source | Glyph |
|---|---|---|
| `starting` / `restoring` | holder spawned, bridge not ready | dim progress frames |
| `idle` | settled idle | none |
| `working` | agent or turn start, tool execution, compaction | shared progress frames |
| `needs-input` | an extension UI, trust, or permission request is pending | `●` warning |
| `done-unseen` | the turn settled while no client viewed the tab | `✓` success |
| `error` | the last turn's `stopReason` was error | `✗` error |
| `crashed` / `restarting` / `failed` | holder or child exit | `✗` error plus a banner |
| `suspended` | idle suspension | dim `◌` |

- `seen` is tracked server-side, so viewing a tab in any client clears `✓` everywhere.
- A tab with a broken bridge shows only process-level states.
- Future CLI tabs will use process state, BEL, and OSC 9/777 for attention.
- The glyph set is the same in every client.

### 8. Durable state

- **Pi's session JSONL**, written by the child, is the authoritative transcript.
- **The registry** is `<dataDir>/tabs/<profile-token>/registry.json`:
  - It is written by the server only: to a temporary file, then `fsync(file)`, rename, and `fsync(dir)`, on every mutation, before the mutation is acknowledged.
  - Up to 20 rotated generations are kept in `registry-history/`, at most one per 15 minutes.
  - An unparseable file is quarantined as `registry.corrupt-<ts>.json`, and the last good history generation is loaded. A notice names both.
  - JSON with fsync was chosen over sqlite to keep the native server dependency-light, and it is stronger than herdr's non-fsynced writes.
- **Per-tab fields:**
  - identity: `tabId`, `kind`, `createdAt`
  - naming: `displayName`, `nameSource` (`default|auto|user`)
  - placement: `order`, `cwd`
  - session: `sessionFile`, `sessionDir`
  - lifecycle: `desired` (`running|stopped`), `lifecycle`, `status`, `attentionSeq`, `seenSeq`
  - holder: `holderPid`, `holderStartIdentity`, `release`
  - restarts: `restarts`, `restartWindowStart`, `lastExit`
  - `registryRevision` and `bootNonce`
- **No secrets are persisted.** The environment sent with `tab.create` is kept in holder memory only. A restore after reboot uses the restoring client's environment and notes that once in the tab.
- **Session lease.** At most one live tab per session file. `a1 --session X` or `/resume X` on a held file focuses that tab.

### 9. Failure and recovery

| Failure | Detection | Outcome |
|---|---|---|
| Tab child exits or crashes | holder sees the child exit | If the exit was not requested: `crashed`. The holder respawns `ui.js --tab --session <file>` with backoff 1 s, 5 s, 30 s. After 3 restarts in 10 min: `failed`, with a banner `✗ <reason> — [r] retry · [f] start fresh · [alt+w] close`. An interrupted prompt (reported via the bridge, or detected as a trailing user entry) is offered back into the editor and never resent. The child's stderr is teed to a rotated log, because the alternate screen hides it. |
| Holder crash | server sees the pipe EOF and an identity check fails | The PTY and child died with it. The server spawns a new holder and resumes the session with the same budget. |
| Holder or child hang | heartbeat every 5 s, 3 missed | The verified tree is terminated gracefully, then forcibly, and follows the crash path. |
| Server crash | clients and holders see the pipe EOF | Holders keep running: their PTYs, children, and models are untouched. Clients show a non-blocking `reconnecting…` on the strip. Any client or holder runs `server --detach`. The new server loads the registry and re-admits verified holders; a dead holder follows the crash path. After 3 server starts in 60 s, clients show `✗ tab host stopped — [r] restart · [q] quit`. |
| Attach client crash or terminal close | the server sees the pipe EOF | Nothing happens to tabs. Pending requests stay `needs-input`. |
| Reboot or logout | `bootNonce` differs and no verified holders exist | Every `desired=running` tab restores under one restore gate, which prevents the duplicate-spawn bug v2 hit, at most `maxConcurrentStarts` at a time: `restoring`, then resumed from its session, idle, with no turn resumed. |
| Missing cwd or session on restore | stat or open fails | The tab is `failed` with the reason and path. It is never moved elsewhere, and the file is never overwritten. |
| Registry corrupt | parse or validation fails | The file is quarantined, the last good generation is loaded, and a notice is shown. |
| PID reuse | start-identity mismatch | The process is never adopted or killed, and the record is treated as having a dead holder. |
| Disk full | write fails | The mutation is rejected with its reason, and running tabs are unaffected. |
| libghostty or parser panic in a holder | the Rust panic hook | The holder logs, exits, and follows the holder-crash path. Other tabs are unaffected; the per-tab processes exist for exactly this (the herdr #453 lesson). |

### 10. Updates and version skew

- **Binaries.** The server and holders run from immutable release directories, never from the mutable npm prefix, so no running binary is ever overwritten.
- **Retention.** Release retention treats the server's, each holder's, and each tab child's `release` as live ownership.
- **Same generation, newer client.** The client attaches normally, and features the server lacks are disabled per method.
- **Server upgrade.** A server older than the active release hands off when the registry is quiescent. It starts its successor detached, releases the endpoint, and the successor binds it with retries for 10 s. Holders reconnect, so tabs keep running throughout. On a generation mismatch the client never kills tabs: it waits for that handoff and shows `tab host upgrading…`.
- **Holder upgrade.** A holder cannot hand off its ConPTY. Old holders therefore keep serving until their tab is next recycled. They speak the older generation, and the server keeps accepting it for one prior generation.
- **Tab child upgrade.** With `tabs.autoRecycle` (default on), a tab running an older A1 release is restarted at an idle boundary, with no request pending and no client viewing it: `ui.js --tab --session <file>` runs on the active release. The transcript is restored from the session, and only ephemeral UI state such as the scroll position resets. A tab is never recycled mid-turn.

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
  | `Alt+Q` | detach |

  - `Alt+[` and `Alt+]` are avoided because `ESC [` is the CSI introducer in legacy encodings.
  - `Alt+←` and `Alt+→` are avoided because A1 uses them for word motion.
  - `Ctrl+C` is never intercepted by the client. It belongs to the child (v2 lesson).
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
  - Inside an A1 tab, `/quit`, `Ctrl+C` twice, and `Ctrl+D` send `bridge.request{detach}` for the client that sent the input. `Alt+Q` detaches from any tab.
  - The client restores the terminal. When tabs are still running, it prints `N tabs still running · run a1 to return`; otherwise it prints the resume hint.
  - `/quit-all` stops every tab, with confirmation if any is busy.
- **Launch and reattach:**
  - Bare `a1` ensures the server and attaches.
  - With zero tabs, it creates one A1 tab in the launch cwd.
  - Otherwise it views the last active tab from its retained surface, which is instant because the holder has the state. Status for the rest arrives immediately.
  - `a1 --session X` opens X in a new tab, or focuses the tab holding it.
  - A new tab's cwd is the client's launch cwd.
  - Prewarm (`tabs.prewarm`, default 1) keeps one hidden standby A1 tab ready, so `Alt+A` appears in tens of milliseconds, as v2 measured.
- **Several terminals.** Each client has its own active tab. The server serializes input per tab. The PTY size follows the most recent client to send input.
- **Background notification.** The `tabs.notify` setting (`off|bell|notification`, default `off`) controls it. A background tab entering `needs-input` or `done-unseen` rings the terminal bell or sends an OSC 9 notification once per transition, and never for the viewed tab.

### 12. Limits and resources

The settings live in the owned settings screen, each with a hard cap.

- `tabs.max` defaults to 10, with a hard cap of 50. `tabs.maxConcurrentStarts` defaults to 2.
- `tabs.suspendIdleAfterMinutes` defaults to 60, by user decision. An idle tab with no pending request, no queued input, and no viewer stops its child after that interval and shows `◌`. Focusing or prompting it resumes the session. Extension in-memory state is lost, which the settings text says.
- Scrollback is capped at 10 MiB per holder, and the replay after a server restart is the retained model itself.
- The server exits after 10 minutes with no running tabs and no clients.
- Logs are `terminal-host-server.log`, `terminal-host-holder-<tab>.log`, and `tab-<id>.stderr.log`, rotated at 5 MiB with three kept. They contain no terminal content and no prompt text.
- `a1 tabs host status` prints the server id, build, generation, detachment mode, tab count, and log paths.

### 13. Packaging and certification

- `a1-terminal-host` is built for win32-x64, darwin-arm64, darwin-x64, linux-x64, and linux-arm64 (Rust with Zig 0.15.2 for libghostty-vt). It ships in `dist/native/<plat>-<arch>/` with the artifact manifest, hash verification, pinned-source provenance, licenses, and notices. `check-terminal-host-provenance.mjs` and the existing artifact checks are extended accordingly.
- Before the `tabs.resident` default flips to `true` on a platform, that platform needs exact-package hermetic suites plus a manual or isolated-worker physical acceptance record. The record covers terminal close, SSH drop, logout, reboot, input fidelity, and render smoothness.

### 14. Security

- Endpoints are owner-only and token-authenticated.
- Tab creation takes a cwd and an environment map. The child argv is fixed by A1, and clients never supply command lines.
- Bridge tokens are per tab and are stripped from grandchild environments.
- The registry and logs contain no credentials, environment values, prompt text, or terminal content.
- Everything runs as the invoking user.

### 15. Rollback

- `tabs.resident: false` restores today's direct bare-A1 launch. The server is not started, and the registry is preserved.
- If the server cannot start, bare A1 falls back to the direct single-agent launch with one notice, instead of failing.

## Risks / Trade-offs

- **[A server crash interrupts the display for everyone]** → Holders keep processes and screens alive. The server holds no VT, Pi, or extension code. It is auto-respawned by any client or holder, and reattach restores exact surfaces.
- **[Terminal fidelity in a composed surface]** (keyboard protocols, mouse, paste, IME, Unicode width, hyperlinks) → Reuse libghostty-vt encoding and the proof's input work, and add fidelity suites. Physical acceptance per platform comes before the default flip.
- **[Memory: one holder of about 5 MB plus one A1 child of about 150 MB per tab]** → `tabs.max`, idle suspension on by default, and throttled rendering while hidden via `bridge.visibility`.
- **[Platform detachment is fragile]** → Detection and escape live in the native binary. The mode is reported, never assumed, and degraded survival is announced.
- **[The Zig and libghostty toolchain in CI and release]** → It is pinned already. Extend the CI build matrix and provenance checks before integration.
- **[No image protocol in tabs at first]** → Pi's text fallback applies and the gap is documented. Forwarding is a follow-up.
- **[Stale or duplicate processes after races]** → A single restore gate, conditional registry revisions, and adoption only after identity verification.
- **[Physical close, logout, and reboot cannot be tested hermetically]** → Owner-tree kills stand in for terminal close. Exact-artifact manual or isolated-worker records are required, and nothing is automated on an active workstation.

## Migration Plan

1. Evolve `native/terminal-host` into the `server`, `holder`, and `attach` roles, with the protocol, registry, detachment, and hermetic kill and reattach suites, behind `tabs.resident=false`. Remove the fixed 2×2 proof presentation.
2. Add A1 tab mode (bridge, detach routing, visibility throttling) and bare-A1 launch routing behind the flag. Publish uncertified `-dev.N` previews under `next`.
3. Add the tab UX, the CLI maintenance commands, settings, updates, and retention. Record per-platform physical acceptance.
4. Flip `tabs.resident` to `true` per certified platform. `false` remains the rollback.
5. Follow-up change: arbitrary CLI tabs (`tab.create{kind:"cli", argv}`), with process-level, BEL, and OSC attention and host scrollback UX. Split layouts stay held in `evolve-bare-a1-into-multi-agent-workspace`.

## Open Questions

1. `tabs.notify` default: `off` (current) or `bell`?
2. Is `Alt+Q` acceptable as the universal detach key, alongside the A1-tab quit routes?
