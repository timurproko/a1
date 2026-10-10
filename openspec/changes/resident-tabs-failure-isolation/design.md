# Design

The product design, decisions, and roadmap live in [`docs/architecture/resident-tabs.md`](../../../docs/architecture/resident-tabs.md). This document covers only what milestone 3 builds and how it is proven. It implements parts of Decisions 2, 3, 5, 8, 9, 12, and 16.

## Context

After milestone 2, `native/terminal-host` has three roles: server, holder, and attach. They speak protocol generation 1. There is a minimal registry under the writer lease, a bridge, explicit opt-in, and a direct fallback. Exactly one tab exists. Milestone 1 added the primitives this milestone uses: process and boot identity, owner-only endpoints, fixed-role detached launch, the writer-held session lock, durable atomic replacement, and the sans-IO core with the controller-transfer barrier.

On the Node side, Pi session writers are created or replaced at these points:

- `createPiRuntimeIntegration` in `src/integrations/pi/engine/runtime-integration.ts`, through `SessionManager.create` and `openSelectedPiSession`, which may call `forkFrom`;
- the runtime factory that Pi calls on every replacement;
- `replacePiRuntimeSession`;
- the `new-session` and `resume-session` commands in `adapter.ts`;
- `newSession`, `switchSession`, `fork`, and `importFromJsonl` in `workflow-runner.ts`;
- the picker's `renameSession`, which appends to another session file through `SessionManager.open` in `workflow-contexts.ts`.

None of these takes a writer lock today.

## Goals / Non-Goals

**Goals:**

- Two or more tabs whose failures are isolated, proven on Windows x64, macOS, and Linux.
- Server replacement that leaves holder and child identities unchanged and cannot create split brain.
- No blocking work on any role's control loop.
- Flow-controlled PTY input that never loses or truncates admitted input silently.
- One session-writer guard on every A1 session-writing route, independent of `residentTabs`.

**Non-Goals:**

- Restarting a crashed tab child, the prompt journal, drafts, child heartbeats, the unresponsive and stalled states, last-screen recovery, registry corruption handling, and diagnostics or `a1 tabs doctor`. These belong to milestone 4.
- The tab strip, shortcuts, commands, tab status icons, controller transfer between clients, bridge controller identity, auto-naming, prewarm, and idle suspension. These belong to milestone 5.
- Packaging, release retention, and physical acceptance. These belong to milestone 6.
- Reboot or logout restore. This is a follow-up outside the roadmap.

## Decisions

### 1. A hidden internal route manages extra tabs

The attach client keeps viewing one tab. Extra tabs are managed through a hidden subcommand of the native binary: `a1-terminal-host internal tab-create --cwd <dir>`, `internal tab-list`, and `internal tab-close <tabId> [--force-after <ms>]`. A second view uses `a1-terminal-host attach --view <tabId>`. The subcommand authenticates with the client token, works only when `residentTabs` is on, and is absent from help. Milestone 5 replaces it with the strip, the keys, and the bridge commands, and then removes it. A client that views a tab already controlled by another client gets a read-only surface. Claiming control stays disabled until milestone 5.

Rejected: adding hidden attach-client key chords. They would reserve keys before milestone 5 checks them for conflicts.

### 2. Two lanes per client; surfaces only for viewed tabs

Each client connection has:

- a **control lane**: a reliable FIFO queue bounded to 1024 frames or 4 MiB. It carries topology, status, acknowledgements, and rejections. If the queue overflows, the server closes that connection with the typed reason `client-overrun`, and the client reconnects and resubscribes. Reliable messages are never dropped one at a time.
- a **render lane**: one slot per viewed tab. A new patch set replaces an unsent one and marks the client stale for that tab. When the socket drains, a stale client gets one full surface at the current revision, then patches again.

The server writes to each client with non-blocking sends from its own loop. It never waits for one client before serving a holder, another client, or a registry commit. The server subscribes to a holder's patch stream only while at least one client views that tab. Holders always parse PTY output. Their outgoing patch stream to the server is also a single slot, so a slow server never blocks a holder's reader.

Rejected: a per-client writer thread with an unbounded queue (memory grows without bound); dropping individual control frames (breaks topology revisions).

### 3. Sans-IO cores, a worker pool with deadlines, and watchdogs

The server and holder state machines move into `native/terminal-host/src/core/`, next to milestone 1's controller-transfer barrier. Each core is a pure function `step(state, event, now) -> effects`. Effects are typed: `Spawn`, `CreatePty` (holder only), `InspectIdentity`, `Terminate{graceful_deadline, forced_deadline}`, `Persist`, `Send`, and `ArmTimer`. A shell per role (`src/server/shell.rs` and `src/holder/shell.rs` from milestone 2, reworked) runs blocking effects on a bounded worker pool. Every effect has a deadline. Completion returns a `Completed` event. A missed deadline returns a `DeadlineMissed` event and the late result is discarded. Default deadlines: holder spawn 10 s, PTY creation 5 s, identity check 2 s, registry persist 5 s, graceful stop 5 s, forced stop 5 s. A worker stuck past its deadline is abandoned, and its result is ignored by incarnation (Decision 6). A holder whose PTY creation hangs is a separate process, so the server terminates it and does not wait for its thread.

Each role runs a watchdog thread. The main loop bumps an atomic tick counter on every iteration and at least every 1 s while idle. If the tick does not advance for 15 s, the watchdog writes a minimal crash record and aborts that process only. The record is owner-only, JSON, and holds role, pid, reason code, last tick age, and thread names, in the role's runtime directory. Milestone 4 adds rotation and the doctor bundle. An invariant violation in a core calls the same abort path. It is never logged and ignored.

Holders send a heartbeat every 5 s from their main loop. The server counts a miss only while its own loop is healthy (no gap of more than 2 s since its last tick) and the holder connection is open. After 3 consecutive misses, the server verifies the holder's identity, terminates the holder tree gracefully and then forcibly within the stop deadlines, and marks the tab `holder-lost`. A server loop gap resets the count, so a stalled server never accuses a healthy holder.

Rejected: an async runtime with blocking calls on its executor threads (blocking PTY calls can still starve the executor); a watchdog shared by all roles (one role's stall would kill the others).

### 4. Server replacement under the writer lease

A client sees server EOF and shows a non-blocking `reconnecting` notice. A holder sees server EOF while it serves no attached client. Either one may request replacement through milestone 1's verified `server --detach` recovery path. Starts are serialized by a start-gate lock (`server-start.lock` in the profile's runtime directory, using the milestone-1 OS lock). The starter that holds the gate:

1. Probes the endpoint with a real handshake. If a live server answers, it releases the gate and joins that server.
2. Reads the owner marker and verifies its pid and native start identity. A verified owner that does not answer is terminated: graceful first, then forced within the stop deadlines, and its exit is verified. If the owner cannot be verified, or does not exit, startup fails closed with `host-recovery-blocked`.
3. Acquires the registry-writer lease with a 5 s deadline, or fails closed.
4. Reads `starts.json` (owner-only, atomic replacement). If 3 starts already happened in the last 60 s, startup stops with `host-start-budget-exhausted`. Otherwise it appends this start and commits.
5. Increments the durable epoch, writes the owner marker, and binds the endpoint, in that order. Each step is a separate atomic commit.
6. Starts the server loop. The loop recomputes holder and bridge credentials from the profile secret and the recorded tab and incarnation identities.

Holders reconnect with jittered backoff (100 ms doubling to 2 s). Each sends its tab id, holder incarnation, pid, native start identity, derived credential, child pid and start identity, and the highest epoch it has seen. The server re-admits a holder only when all of these match the registry and the server's epoch is at least the holder's highest epoch. Once a holder sees a higher epoch, it rejects commands from lower epochs, and bridges do the same. Tabs whose recorded holder is gone or unverifiable are marked `holder-lost`. Their session leases stay with whichever process still holds them (Decision 7). No second writer is started. When the start budget is exhausted, clients show `✗ tab host stopped — [r] restart · [q] quit`. `[r]` clears the budget window explicitly and starts again.

Rejected: reclaiming the endpoint after a handshake timeout (allows split brain); storing the start count in the registry (it must be read before the lease is acquired).

### 5. Incarnation-aware, level-triggered reconciliation

Each tab record holds desired state (`desired`, `size`) and observed state (holder incarnation, child incarnation, and the size the holder reports). A holder incarnation is a u64 taken from a registry counter and committed before spawn. The holder assigns child incarnations. Every event carries the incarnation it belongs to, and the core drops events from superseded incarnations. Reconciliation runs on every relevant event and on a 1 s tick, and each run is idempotent. A per-tab start gate allows at most one start in flight. Desired size is re-sent until the holder reports it. A lost resize therefore converges, and the latest desired size wins over reordered resizes.

### 6. Concurrent starts and stops

Child starts across tabs are limited to `tabsMaxConcurrentStarts` (default 2, hard cap 8) and spaced at least 250 ms apart, so concurrent Pi processes do not race on `auth.json` and settings locks. A start that misses its spawn or PTY deadline, or fails with a typed error, is retried twice more. After that the tab is `failed` with the reason. Crash restart of a running child is out of scope and comes in milestone 4. Stops send the child a graceful shutdown: the server sends a shutdown request over the tab bridge, and when there is no bridge the holder closes the PTY input. After the graceful deadline, the holder terminates the verified child tree. Several stops run concurrently on workers and never delay heartbeats or client traffic.

### 7. PTY flow control in the holder

- **Reader thread.** It reads the PTY continuously into the libghostty-vt model and never waits on the server. The model is the buffer, so output is never dropped.
- **Writer thread.** It owns PTY input and drains a bounded byte queue with a 1 MiB default capacity, equal to the protocol's input cap.
- **Admission.** Admission in the holder core is atomic per message. A keystroke or encoded event is admitted if it fits. A paste reserves its full encoded length before any byte is queued. If the paste does not fit, it is rejected whole with `input-rejected{reason: "not-accepting-input"}`, which the attach client shows as a one-line notice on the strip row. Input sent while a tab is starting is admitted into the same queue in order and delivered when the PTY is ready, or rejected visibly when the queue is full.
- **Delivery accounting.** After admission, bytes are never reordered, truncated, or retried. If the child or PTY fails while admitted bytes are not yet written, or within one write of a partial paste, the holder reports `input-uncertain{tabId, admittedBytes, writtenBytes}`. The client shows it. Nothing is replayed.

The writer uses blocking writes on its own thread on every platform. A blocked ConPTY or PTY write therefore stalls only that thread, and the core sees the queue fill.

### 8. One session-writer guard on every route

A new Node module, `src/foundation/session-writer-lock/`, wraps the in-process lock binding that milestone 1 pinned. The lock is held by the Node writer process itself. The module exposes `acquireExisting(path)`, `reserveNew(parent, name)`, `bind(reservation, createdPath)`, `release(handle)`, and a typed `SessionWriterConflict`. The routes use it as follows:

- **Startup** (`createPiRuntimeIntegration`): for an explicit selection, acquire before `SessionManager.open` returns a writer. For a new session, reserve the path that `SessionManager.create` assigned before the first append. A `forkFrom` target is reserved the same way.
- **Replacement**: the runtime factory acquires or reserves the target before building services. The old handle is released only after the rebind succeeds. On failure, the old session and its lock are kept. This covers `replacePiRuntimeSession`, the adapter's `new-session` and `resume-session`, and `workflow-runner.ts`'s `newSession`, `switchSession`, `fork`, and `importFromJsonl`. Call sites that know the target path acquire it before calling Pi, so a conflict is reported before Pi changes any state.
- **Picker rename of another session**: take a short-lived lock and append. If the lock is held, refuse with a notice naming the holder kind.
- **Conflict outcomes**:
  - Direct `a1 --session` and `a1 pi` startup: the existing console fork prompt (`createConsoleSessionForkPrompt`) offers an explicit fork. If the user declines, the launch exits nonzero with `session is open in another A1 process`.
  - In-runtime switch: the switch is rejected with a notice, and the original session stays active.
  - Resident tab child: the tab reports a `session-held` conflict and does not start.

The guard never starts a host, holder, or bridge, and it runs whatever `residentTabs` is. A new governance check, `scripts/governance/check-session-writer-guard.mjs` (wired into `check:architecture`), rejects `SessionManager.create`, `.open`, `.forkFrom`, and `.continueRecent` in production code outside the guarded owners.

Rejected: a lock held by the holder or by a helper process. The kernel would release it when the helper exits, not when the writer exits (Decision 8).

### 9. Fault injection and fixtures

Under the cargo feature `fault-injection` (test builds only, refused at runtime in release builds), environment variables let a test:

- hang PTY creation;
- block PTY writes;
- delay identity checks or fsync past their deadlines;
- crash at named points: after lease, after epoch, after marker, after bind, and before and after each registry commit;
- deliver stale epoch or pid events.

A fixture child, `native/terminal-host/tests/fixtures/fake-tab` (a test binary), streams output at a configurable rate. It can also stop reading input, hang, exit, ignore graceful shutdown, or spawn a grandchild. Native suites use it without Node, and a smaller set runs the real `node bin/ui.js --tab`.

## Risks / Trade-offs

- **[Closing a client on control-lane overflow looks like a disconnect]** → The bound is large, the reconnect is automatic, and a resubscribe returns a full snapshot. A typed reason is recorded and tested.
- **[Abandoned blocked workers leak threads]** → The worker pool is bounded. If its abandoned-worker limit (8) is reached, the core fails fast and the role restarts. Blocking PTY creation lives only in holders, which are terminated as whole processes.
- **[The start budget can stop the host during a crash loop the user wants retried]** → `[r]` restarts explicitly. Holders and children keep running in the meantime.
- **[Pi creates fork and import files itself]** → The names are fresh and unique, so another participant cannot hold them before creation. Reserving them in the runtime factory before the first append closes the remaining window. A test asserts that no append happens before the bind.
- **[Graceful stop depends on the A1 child honouring shutdown]** → The forced stop follows a bounded deadline, and the tree is verified gone before the tab's lease is considered released.
- **[Older A1 releases and external Pi do not take the lock]** → This is documented as outside the cooperative guarantee (Decision 8).

## Open Questions

- Which in-process lock binding milestone 1 pins for Node (an N-API addon, or Node's built-in exclusive open on Windows plus descriptor inheritance on Unix). Decision 8 here assumes only that the Node writer process holds the lock itself. If milestone 1 provides only an out-of-process helper, this milestone must add the in-process binding first.
