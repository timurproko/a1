## Context

Today bare `a1` is a chain of four processes: `bin/cli.js`, then the detached per-release **supervisor**, then the foreground **launch guardian**, then the native **process-guardian**, which runs `bin/ui.js`. The UI process hosts exactly one Pi `AgentSessionRuntime` in-process behind `PiEngineAdapter`, and renders it through the owned session shell. The process-guardian puts the UI in a kill-on-close containment (a Windows job object, or a POSIX process group), so closing the terminal kills the agent by design. `launch-instance-lifecycle` requires that behavior and explicitly reserves "a separately specified explicit resident capability" for anything that must survive. This change specifies that capability.

Three references informed this design:

- **v2 prototype** (`D:\Backups\pi\v2`). This is the UX source.
  - A one-row tab strip with 20-column chips and a braille spinner, plus `✓`/`✗` glyphs.
  - Inline F2 rename, an overflow `…` menu and a `+` chip.
  - Quit detaches.
  - A detached user-wide daemon over a named pipe, with a JSON state file and resume from Pi session files.
  - It ran each agent as a full Pi CLI under a PTY, with a headless xterm in the daemon, and pushed rendered frames to the tab.
  - Lessons it recorded: restore without a gate spawned duplicates, painting background frames stalled the foreground, `Ctrl+C` forwarding killed agents, there was no needs-input state, and there was no close confirmation.
- **herdr** (`D:\Git\herdr`). This is the process-architecture source.
  - One detached server per user session, where the socket bind is the single-instance lock.
  - An ownership marker and an owner-only DACL.
  - Detachment through `DETACHED_PROCESS`, plus a WMI launch to escape SSH kill-on-close jobs (#2008) and the macOS per-user bootstrap port (#4100).
  - Snapshot then delta on reattach.
  - A one-slot render lane for slow clients.
  - A stable *endpoint generation*, separate from the private protocol version, so updates don't kill agents.
  - A persisted layout plus agent session IDs, relaunched with `--resume` after a crash or reboot.
  - Its documented weakness: the server is a single point of failure for every pane (#453, #276).
- **The held change** `evolve-bare-a1-into-multi-agent-workspace`, together with the archived workspace branch (`origin/archive/multi-agent-workspace`). This is the requirements source.
  - Structured SDK tabs, durable identities, capability negotiation, correlated commands, bounded backpressure, and reconnection with an ownership proof.
  - No PTY for structured tabs.
  - None of it was wired to a real process, and there was never a resident daemon.

## Goals / Non-Goals

**Goals:**

- Several independent Pi agents in bare `a1`, presented as tabs that the user can create, switch, rename, reorder and close.
- Agents keep working when the terminal closes, SSH drops, or the A1 UI crashes. Relaunching `a1` from any terminal shows every agent again, with its transcript, live streaming state, pending prompts, queue and draft.
- A failure in one agent never affects another agent, the host, or the UI. A host failure never kills running agents. A reboot never loses a session.
- `a1 update` never kills agents.
- Presentation and input stay in the single owned rendering pipeline. There is no second renderer, no terminal-byte relay, and no screen scraping.
- The design is testable in hermetic instances, including crash, kill, and reattach.

**Non-Goals:**

- Arbitrary CLI panes, PTYs, split layouts, and the terminal-host proof. These stay held in `evolve-bare-a1-into-multi-agent-workspace`.
- Workspaces or sidebar grouping as in v2. All agents of a profile appear as one tab set. Grouping is a later change.
- Surviving a reboot *with processes alive*. After a reboot, agents are restored from their sessions, not resurrected mid-turn.
- Remote attach over the network, or multi-user sharing.
- Changing `a1 pi`, which stays one non-detachable agent.
- Replaying an interrupted turn automatically. Tool side effects are never re-executed on the user's behalf.

## Decisions

### 1. Structured agent processes, not PTY frame relay

Each agent runs in its own **agent worker** process. The worker hosts one Pi `AgentSessionRuntime` through the existing public-SDK `PiEngineAdapter` and exchanges typed commands, events, and snapshots. The foreground UI renders those through a **remote engine adapter** that satisfies the same A1-owned engine contract the in-process adapter satisfies today.

The alternatives, and why they were rejected:

- **PTY per agent with a headless terminal emulator, shipping frames (v2, herdr).**
  - It gives instant visual parity, because the child is the full UI.
  - But it puts a second renderer and a terminal-byte relay into production. `launch-instance-lifecycle` ("Terminal behavior remains owned by the shared UI runtime"), `terminal-agent-runtime`, and `check-architecture.mjs` all forbid that.
  - It makes status detection a screen-scraping problem (herdr's manifests).
  - v2 recorded that it stalled the foreground when painting background frames.
- **Many runtimes inside one process.** The Pi and pi-tui process globals make this unsafe: keybindings, theme, undici dispatcher, `PI_CODING_AGENT_DIR`, clipboard singletons. It would also let one agent's crash or event-loop stall take down all of them.
- **Worker = the stock `pi --mode rpc` CLI.** The pinned package exports `runRpcMode`, `RpcClient`, and `RpcExtensionUIRequest`, and those are the reference for the command and extension-UI vocabulary. But A1 needs A1-owned engine behavior that stock RPC mode does not carry: A1 profile roots, trust flow, compaction progress, the history and suggestion additions, and repository footer context. So the worker runs A1's own adapter and reuses Pi's public RPC *types* wherever they fit.

**Consequence:** `PiEngineAdapter` must be split. The part consumed by the shell becomes a transport-neutral contract of commands, events, snapshots and view models. That contract then gets two implementations: the in-process one (for `a1 pi` and the rollback path) and the remote one. This is the largest implementation risk, and it is phased first (tasks 2.x).

### 2. Topology

```text
 terminal A                terminal B                 (detached, per OS user × profile)
┌───────────────┐         ┌───────────────┐          ┌────────────────────────────────┐
│ a1 (client)   │◀──pipe─▶│               │          │ agent host                     │
│ owned UI      │         │ a1 (client)   │◀──pipe──▶│  registry (sqlite, WAL, FULL)  │
│ tab strip     │         │ owned UI      │          │  client sessions / fan-out     │
│ remote engine │         └───────────────┘          │  worker supervisor             │
└──────┬────────┘                                    └──────┬─────────┬─────────┬─────┘
       │ launch-instance (kill-on-close)                    │pipe     │pipe     │pipe
       ▼                                                    ▼         ▼         ▼
  guardian + UI only                                   worker 1   worker 2   worker N
                                                       Pi runtime Pi runtime Pi runtime
                                                       session.jsonl (durable transcript)
```

- The **client** is today's UI process with a remote engine. It stays inside its launch instance and dies with its terminal, which is harmless.
- The **host** is resident. It owns the registry, fans events out to clients, and supervises workers. It holds no Pi runtime, so it has no Pi globals and no extension code, and it stays small and boring.
- **Workers** are resident. Each one owns one runtime and its session file. They are started detached, *not* as kill-on-exit children of the host, so a host crash does not take them down.

### 3. Host scope, identity, and endpoint

- There is **one host per OS user and per A1 profile root**, and the endpoint is derived from the canonical profile home and runtime dir:
  - Windows: `\\.\pipe\a1-agents-<sha256(profileHome\0runtimeDir)[0:20]>`
  - POSIX: `<runtimeDir>/a1-agents-<token>.sock`, with the existing short `/tmp` fallback on Darwin.
- The host is deliberately **not per release cohort**, unlike the supervisor. Agents must outlive release changes, and the supervisor's own requirements forbid it to retain runtime processes. The host is a sibling of the supervisor, not a child of it.
- **Hermeticity:** `A1_AGENT_HOST_ENDPOINT` and the existing `A1_*_DIR` overrides isolate tests, following the `resolveCohortEndpoint` pattern.
- **Registry location:** `<dataDir>/agents/<profile-token>/agent-host.sqlite3`. This is separate from `control.sqlite3`, for two reasons:
  - A newer release's control-store migration can never break a running older host.
  - The host is the registry's single writer.

### 4. Single instance, ownership, and authentication

- **The bind is the lock** (herdr). Before binding, the host probes the endpoint:
  - If a live host answers the handshake, the new process exits with `already-running`, and the caller joins the winner. This is the existing `ensureSupervisor` rule for `EADDRINUSE`.
  - If the endpoint refuses, is missing, or times out, it is stale and gets reclaimed.
- The host atomically writes an **ownership marker**: `{hostId, pid, startIdentity, bootNonce, generation, build, endpoint}`. It removes the endpoint on exit only if the marker is still its own, so an exiting old host never deletes a newer host's socket.
- **Access control:**
  - The Windows pipe gets the owner-only SDDL `D:P(A;;GA;;;SY)(A;;GA;;;OW)`.
  - The POSIX socket is created in a 0700 directory and chmodded to 0600.
- **Authentication:**
  - Clients authenticate with a random 32-byte token read from an owner-only file.
  - Each worker gets its own per-agent token at spawn time, and has to present it together with its `agentId`, pid, and native `startIdentity`.
  - Identity is verified with `process-guardian --inspect-pid`, which is safe against pid reuse. The host adopts no process it cannot prove it owns.

### 5. Detached start on every platform

The host and workers must be started **outside** the guardian's kill-on-close containment, and outside any containment inherited from the terminal or SSH session.

- **Who starts the host.** The pre-guardian bootstrap (`runBootstrap`) calls `ensureAgentHost()` beside `ensureSupervisor()`. It is never started from inside the UI's job.
- **Windows.**
  - `native/process-guardian --spawn-resident -- <exe args>` starts the child with `DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW`.
  - If the caller is in a job with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` (Windows OpenSSH, some IDE terminals), it first tries `CREATE_BREAKAWAY_FROM_JOB` when the job permits breakaway. Otherwise it launches through WMI `Win32_Process.Create` with an explicit environment block and cwd (herdr #2008).
  - The mode it used (`console-detached`, `breakaway`, `wmi`, or `contained`) is reported in the host status.
- **macOS.**
  - `setsid`, and before exec, adopt the per-user bootstrap namespace. That is `bootstrap_look_up_per_user` followed by `task_set_special_port`, the same APIs tmux uses (herdr #4100). Without it, a daemon started from a GUI terminal loses DNS and user lookup after logout.
- **Linux.**
  - `setsid`, with stdio set to `/dev/null`.
  - If systemd-logind `KillUserProcesses=yes` applies, survival past logout is not possible without `loginctl enable-linger`. The host detects this and reports the status `degraded: logout-kills-user-processes`, with that hint.
- **When detachment cannot be proven** (`contained`), agents still run, but the tab strip shows a one-time notice that agents will stop when this session ends. The product never claims a survival it cannot deliver.
- **Workers** are started by the host through the same `--spawn-resident` path. The host is already detached, so this is only about avoiding console windows and parent-death coupling.

### 6. Protocols

There are three logical channels. They share the existing NDJSON `LineFrameDecoder` (4 MiB frame cap) and the feature-negotiation pattern in `src/foundation/protocol/messages.ts`.

- **Handshake, on every connection:** `hello{role, generation, build, features[], token}` → `welcome{hostId, generation, build, features[], limits}`.
  - `generation` is the stable compatibility number (herdr's endpoint generation). Within one generation, fields and methods are only ever added: new fields are optional, enums carry an `unknown` fallback, and a method the peer lacks disables only that action.
  - `build` is informational.
  - A mismatched generation fails the handshake with a typed `incompatible-generation` outcome. It never degrades silently.
- **Client ↔ host**
  - **Registry.**
    - `registry.subscribe` returns `registry.snapshot{revision, agents[]}` and then `registry.changed{revision, …}`.
    - Mutations: `agent.create{cwd, name?, session?, env}`, `agent.rename`, `agent.reorder{expectedRevision}`, `agent.close{mode: stop}`, `agent.retry`, `agent.fresh`, and `agents.stopAll`.
    - A stale revision is rejected; there is no partial apply.
  - **Agent view.**
    - `agent.attach{agentId, fromSeq?}` returns either the events after `fromSeq`, if they are still in the bounded replay window, or `agent.snapshot{seq, state}` followed by `agent.event{seq, …}`.
    - `agent.detach` ends the view.
  - **Commands.** Every command is correlated: `agent.command{agentId, correlationId, kind, payload}` for prompt, steer, follow-up, abort, dequeue, model, thinking, compact, new, switch, fork, and similar. It gets exactly one terminal outcome: `accepted|rejected|completed|failed|timed-out|cancelled`.
  - **Extension UI.** `agent.uiRequest` / `agent.uiResponse` follow the vocabulary of Pi's public `RpcExtensionUIRequest` and `RpcExtensionUIResponse`. The first client to answer wins, and the other clients receive `uiRequest.resolved`.
  - **Draft.** `agent.draft.put` / `agent.draft.get` persist the editor draft per agent, so a reattach restores it.
- **Worker ↔ host:** `worker.ready{agentId, token, pid, startIdentity, release, sessionFile}`, `worker.event{seq}`, `worker.status`, `worker.heartbeat`, and `worker.exit{reason}`. The host forwards commands and UI responses as-is.
- **Backpressure** (from herdr, and from the owned UI's existing bounded-delivery rules):
  - Every client connection has a reliable, bounded control lane.
  - Streaming deltas are *replaceable*: a newer delta for the same message supersedes one that is still queued.
  - A client that exceeds its window gets `agent.resync-required` and a fresh snapshot, instead of an unbounded queue.
  - The host never blocks a worker on a slow client.
  - Workers keep a bounded outbound buffer of unacknowledged events. On overflow they mark themselves `snapshot-only` until the next attach.
- **Snapshots are authoritative.** A snapshot contains:
  - the committed transcript entries, read from the session through the Pi `SessionManager` and never from the screen;
  - the in-flight assistant or tool state;
  - queue, model, thinking level, and compaction state;
  - any pending UI request;
  - status, and the draft.
  Logs are never used to reconstruct state.

### 7. Durable state

- **Pi's session JSONL** is the authoritative transcript. It is already appended per entry by `SessionManager`, and nothing else persists transcript content.
- **The registry** (`agent-host.sqlite3`, WAL, `synchronous=FULL`, single writer, `BEGIN IMMEDIATE`, conditional updates) holds:

  | column | purpose |
  |---|---|
  | `agent_id` (uuid), `created_at` | durable identity |
  | `display_name`, `name_source` (`default\|auto\|user`) | tab label; a user name is never overwritten by auto-naming |
  | `tab_order`, `registry_revision` | ordering with expected-revision mutation |
  | `cwd`, `session_file`, `session_dir` | where to resume from |
  | `desired_state` (`running\|stopped`) | what recovery should converge to |
  | `lifecycle`, `status`, `attention_seq`, `seen_seq` | presentation and done-unseen |
  | `worker_pid`, `worker_start_identity`, `worker_release`, `worker_token_hash` | verified ownership |
  | `restart_count`, `restart_window_start`, `last_exit` | restart budget and diagnostics |
  | `draft` (bounded, 64 KiB) | editor draft restored on reattach |

- Before any other effect, the registry is **written on every mutation** (create, rename, reorder, close, lifecycle transition). A registry that cannot be read is moved aside as `agent-host.sqlite3.corrupt-<ts>`. The host then starts empty and shows a notice naming that path; the sessions are still reachable through `/resume`.
- **Environment and secrets:**
  - Neither the environment nor credentials are ever persisted. A worker inherits the environment that the creating client sends with `agent.create`, and keeps it in memory only.
  - An agent restored after a reboot uses the environment of the client that triggers the restore. Its tab says so once.
  - Authentication stays in the profile's normal Pi auth storage.
- **Session lease:** one live worker per session file, enforced in the registry. `a1 --session X`, or `/resume X` onto a file held by a live agent, focuses that tab and does not open the file twice. v2 offered a fork option in that case; here the fork is `/fork`.

### 8. Agent lifecycle and status

```text
            create/restore
                 │
                 ▼
  ┌────────▶ starting ──ready──▶ idle ◀──────── turn end ───────┐
  │              │                 │ prompt                     │
  │         spawn fails            ▼                            │
  │              │              working ──ui request──▶ needs-input
  │              ▼                 │  ▲                      │
  │           crashed ◀──exit/hang─┘  └────── ui response ◀──┘
  │              │ budget left: restarting (backoff)            
  └──────────────┘ budget spent: failed ──[retry|fresh|close]  
  close / stopAll: stopping ──▶ stopped (record removed; session stays resumable)
  idle suspension (optional): idle ──▶ suspended ──focus/prompt──▶ starting
```

- **Where status comes from.** Status comes only from engine events: `agent_start`, `turn_start`, `tool_execution_start`, a settled idle state, `stopReason`, extension UI requests, and compaction. There is no screen text, no timing heuristic, and no scraping.
- **Needs-input** is set when a worker has an unanswered extension UI request (confirm, select, input, editor), or a trust or permission prompt. This is the state v2 lacked.
- **Done-unseen.** A finished turn (`attention_seq` advances) on an agent that no client is currently viewing shows `✓` until a client views the tab. `seen_seq` is shared across clients: seeing it in any terminal clears it everywhere.

### 9. Failure and recovery matrix

| Failure | Detection | Outcome |
|---|---|---|
| Worker crash (exit, OOM, uncaught error) | Child exit, or pipe EOF plus an identity check | The agent becomes `crashed`. It is restarted with `session_file` resumed, backing off 1 s, 5 s, 30 s. After 3 restarts within 10 min it becomes `failed`, and the pane shows `✗ <reason> — [r] retry · [f] start fresh · [alt+w] close`. The interrupted user prompt is offered back into the editor, and nothing is re-sent automatically. |
| Worker hang | Heartbeat every 5 s; missing 3 means hung | The host kills the verified worker tree with a bounded graceful-then-forced sequence, then follows the crash path. |
| Host crash | Clients: pipe EOF plus a failed handshake. Workers: pipe EOF. | Workers keep running their turns and buffer events up to the bound. Clients show a non-blocking `reconnecting…` in the strip. Any client, **or any worker**, calls `ensureAgentHost()`. The new host loads the registry, and workers re-register with token, pid, and `startIdentity`. Verified workers are adopted. A record whose worker is dead goes down the crash path. A process that cannot be verified is left alone and reported. |
| Host repeatedly failing | 3 host starts within 60 s | The client shows `✗ Agent host stopped — [r] restart · [q] quit to single-agent mode` and writes host diagnostics. Workers stay alive until they can reconnect or the user stops them. |
| Client crash or terminal close | Pipe EOF | Nothing changes for the agents. Pending UI requests stay `needs-input`. |
| Reboot or logout | Registry `bootNonce` differs from the current boot | Every `desired_state=running` agent is restored as `restoring`, then resumed from its session at no more than `maxConcurrentStarts` at a time. No turn is resumed. A turn that was interrupted (the last entry is a user prompt with no settled reply) gets a notice, and the prompt is offered back into the editor. |
| Missing cwd on restore | stat fails | The tab stays, in `failed(cwd-missing)`, with the path shown. It is never silently moved to the home directory (herdr lesson). |
| Session file missing or corrupt | `SessionManager` open fails | `failed(session-unreadable)`, offering `[f] start fresh` in the same cwd. The damaged file is never overwritten. |
| Registry corrupt | Open or integrity check fails | The file is moved aside, the host starts empty, and a notice points to the moved file and to `/resume`. |
| Duplicate spawn race | Registry conditional update on `lifecycle` | Only one `starting` transition wins. Restore runs under a host-wide `restoring` gate (v2 lesson: restore without a gate duplicated agents). |
| PID reuse | `startIdentity` mismatch | The process is never adopted or killed. The record is treated as having a dead worker. |
| Disk full | Write fails | The registry transaction fails and the mutation is rejected with a visible reason. Running agents continue. |

### 10. Updates and version skew

- **Client newer than host, same generation.** The client attaches normally, and features the host lacks are disabled per method.
- **Generation mismatch.** The client never kills agents on its own. If every agent is idle and has no pending UI, it offers `restart agent host` (and restarts automatically when `agents.autoUpgradeHost` is on). Workers then re-register with the new host, which is the same path as host-crash recovery. While any agent is busy, the client runs in a clearly labelled compatibility state that uses only the generation-independent `registry.snapshot` and `agent.stop`, and the host upgrades at the next all-idle boundary.
- **Host self-upgrade.** A host whose `build` is older than the active release drains at an all-idle boundary. It starts its successor via `--spawn-resident`, hands the endpoint over (the successor binds only after the old host releases it, retrying within 10 s), and exits. Workers reconnect to the successor.
- **Worker recycling.** A worker running an older release is recycled at its next idle boundary: stop gracefully, then resume the session on the active release. It is never recycled mid-turn or while a UI request is pending.
- **Release retention.** `agent-supervision` retention counts the host's and each worker's `release` as live ownership. A release in use is never collected.
- **Windows file locks.** Hosts and workers always run from their immutable release directory, never from the mutable npm prefix. An update therefore never has to overwrite a running executable (herdr lesson).

### 11. Limits and resource policy

The defaults are settings in the owned settings screen. Each has a hard cap.

- `agents.max` defaults to 10, with a hard cap of 50. When full, `+` and `Alt+A` are disabled and explain why.
- `agents.maxConcurrentStarts` defaults to 2.
- `agents.suspendIdleAfterMinutes` defaults to `0` (off). When enabled, an agent that has been idle, with no pending UI, no queued input, and no viewing client, for that many minutes stops its worker and becomes `suspended`. Focusing the tab or prompting it resumes the session transparently. Extensions that hold in-memory state lose it, which is why it is off by default.
- Per-client queue: 1 MiB control lane and one replaceable delta slot per streaming message. Per-agent replay window: 2,048 events or 8 MiB.
- The host has no idle-exit while any agent is `desired_state=running`. With zero agents and zero clients it exits after 10 minutes.
- Logs are `<dataDir>/logs/agent-host.log` and `agent-worker-<id>.log`, rotated at 5 MiB with three kept, and they contain no prompt content. Worker stderr is teed into the worker log, because the alternate screen loses it (v2 lesson).

### 12. Foreground presentation

- **Tab strip.** One row at the top of the fixed fullscreen surface. The custom viewport and the dock keep their current contracts inside the remaining rows. Chip layout and overflow follow v2: at most 20 columns per chip, `…` clipping measured with grapheme width (fixing v2's UTF-16 bug), no separators, a `…` overflow menu for tabs that don't fit, and a trailing `+`. Colors come from existing theme tokens, not literal RGB.
- **Glyphs:**
  - working: the shared progress-indicator frames
  - needs input: `●` in the warning color
  - done-unseen: `✓` in success
  - error or failed: `✗` in error
  - restoring or starting: dim progress frames
  - suspended: dim `◌`
  - idle: no glyph
- **Keys.** Declared through the `ShortcutRegistry` and conflict-checked, so they show up in `/hotkeys`.
  - `Alt+A` new tab
  - `Alt+W` close
  - `F2` rename
  - `Alt+1`…`Alt+9` jump to that tab, `Alt+0` jump to the 10th
  - `Alt+]` / `Alt+[` next and previous, wrapping
  - `Alt+}` / `Alt+{` move the tab right or left
  - v2's `Alt+←`/`Alt+→` are not reused, because A1 binds them to word motion.
- **Mouse.** Click activates. Right-click opens `Rename`/`Close`. Dragging reorders, with a `│` drop marker; a drag starts after 250 ms or after the pointer moves. `+` opens a new tab. The strip claims its pointer region from the single selection owner.
- **Commands:**
  - `/new-tab [name]`
  - `/close`
  - `/name <name>`, the existing Pi command, which now also renames the tab
  - `/agents`, a picker listing every agent with its status and cwd
  - `/quit-all`, which stops every agent and quits
- **Naming.**
  - A new tab is `agent`, or `agent 2`, `agent 3` and so on while the base name is taken.
  - Auto-naming is controlled by `tabs.autoName` (default on). After the first prompt settles, the tab's own model is asked for a lowercase hyphenated name of two words or at most 16 characters, with a small budget and one retry. If that fails, the name is derived from the first prompt's words.
  - Rename and `/name` set `name_source=user`. Auto-naming never overrides that.
  - Rename is inline in the chip: `Enter` commits, `Esc` cancels, and clicking elsewhere cancels. The name is trimmed, must not be empty, is at most 64 characters, and has control characters stripped.
- **Close.** When the agent is `working`, `needs-input`, or has queued input, the dock asks `Stop agent "<name>"? Enter stop · Esc cancel`. Otherwise the tab closes immediately. Closing stops the worker gracefully (abort, flush, exit) and removes the tab. The session stays in `/resume`.
- **Quit = detach.** `/quit`, `Ctrl+C` twice, and `Ctrl+D` play the existing outro and restore the terminal. If agents are still running, the resume hint is replaced by a dim `N agents still running · run a1 to return`. `Ctrl+C` is never forwarded to an agent (v2 lesson); `Esc` remains the interrupt.
- **Launch and reattach.**
  - Bare `a1` ensures the host, then attaches.
  - With zero agents, it creates one fresh agent in the launch cwd, which looks exactly like today's startup.
  - Otherwise every agent is shown, and the last active tab is selected. That tab's snapshot is fetched first and rendered within the existing first-paint budgets. The other tabs fill in lazily.
  - `a1 --session X` opens X as a new tab, or focuses the tab that holds it.
  - A new tab's cwd is the client's launch cwd.
- **Several terminals.** Each client has its own active tab. Input from any client is serialized by the host per agent. Drafts are synced when the user switches tabs or detaches, not on every keystroke: last writer wins.

### 13. Security

- Endpoints are owner-only, and connections use token authentication.
- Workers verify the host token before executing any command.
- The protocol never carries shell strings: `agent.create` carries a cwd and an environment map, never argv from the client.
- The registry and logs contain no prompt text beyond the bounded draft, which lives in an owner-only directory, and no credentials.
- The host and workers run as the invoking user with no elevation.

### 14. Rollback

The setting `agents.resident` controls the feature:

- **`true`** (the default once accepted): the architecture described above.
- **`false`**: today's in-process single-agent bare A1. The host is not started. Registry records are kept, and are offered through `/resume`.
- The in-process engine adapter stays a first-class implementation behind the same contract.
- If the host cannot start at all, bare A1 falls back to in-process single-agent mode with a one-line notice, rather than failing to launch.

## Risks / Trade-offs

- **[Remote engine parity is large]** Everything the shell reads from `AgentSession` today must cross a process boundary. → Split the contract first (tasks 2.x). Run the existing shell test suites against both adapters. Gate the cutover on the full owned-UI regression passing in remote mode.
- **[Extension custom TUI components cannot cross processes]** A `ctx.ui.custom()` component renders in-process. → Proxy the typed dialog vocabulary (confirm, select, input, editor, notify, status, widgets expressed as text). An extension that needs a live custom component gets a bounded explicit notice that the surface is unavailable in resident tabs, with a suggestion to run `a1 --session <id>` with `agents.resident=false`. This is recorded as a known gap and an open question.
- **[Memory: one Node process per agent]** Roughly 100–250 MB per idle agent. → `agents.max`, optional idle suspension, and lazy restore.
- **[Detachment is platform-fragile]** Job objects, bootstrap namespaces, logind. → The native helper owns detection. The detachment mode is reported, never assumed. When survival is impossible, it is reported as degraded.
- **[The host is a new single point of coordination]** → The host carries no Pi or extension code, workers survive its death, self-healing re-registration is covered by automated kill tests, and the protocol is generation-stable.
- **[Stale or duplicate workers after races]** → Conditional registry transitions, a restore gate, and adoption only after identity verification.
- **[Auto-naming spends tokens]** → Small budget, a setting to turn it off, and a deterministic fallback.
- **[Physical terminal-close and reboot cannot be tested hermetically]** → Owner-tree kill tests stand in for terminal close. Reboot and logout get exact-artifact manual or isolated-worker verification, never automation on the active workstation.

## Migration Plan

1. Ship the contract split and the in-process adapter refactor with no behavior change.
2. Ship the host, workers, registry, and the native `--spawn-resident` mode behind `agents.resident=false`, with hermetic crash and reattach suites.
3. Ship the remote adapter and the tab UI behind the flag, and publish uncertified `-dev.N` previews under `next` for manual acceptance.
4. Flip the default to `true` once the acceptance list passes. `agents.resident=false` remains the rollback.
5. `evolve-bare-a1-into-multi-agent-workspace` keeps only its composed-terminal scope on hold. A future composed-terminal change will build on this host rather than on a separate daemon.

## Open Questions

1. **Structured workers rather than PTY frames.** This design deliberately departs from v2 and herdr (Decision 1). Confirm before implementation.
2. **Idle suspension default:** off (the current choice, safest for extensions) or on after 60 min (lower memory)?
3. **LLM auto-naming:** keep it on by default?
4. **Extension custom components** in resident tabs: accept the known gap for now, or block the cutover until an A1 bridge exists?
5. **Grouping:** one tab set per profile (this design), or v2-style per-cwd workspaces as part of this change?
