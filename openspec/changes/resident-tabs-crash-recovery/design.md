# Design

The product design, decisions, and roadmap live in [`docs/architecture/resident-tabs.md`](../../../docs/architecture/resident-tabs.md). This document covers only what milestone 4 builds and how it is proven. It uses the milestone 1 primitives (process and boot identity, owner-only endpoints, fixed-role launch, writer-held session lock, durable atomic replacement, protocol generation 1, sans-IO core) and the milestone 2 and 3 roles, registry, bridge, epochs, and holder supervision without re-specifying them.

## Context

After milestone 3:

- The server, one holder per tab, and the attach client exist on all three platforms. The registry is lease- and epoch-protected. Holder exit and holder hang are detected and isolated (Decision 9, rows "Holder crash" and "Holder hang").
- The A1 child (`node bin/ui.js --tab`) connects the tab bridge and reports status and session identity.
- When a child exits unexpectedly, the tab simply ends. Nothing journals prompts, checkpoints drafts, or synchronizes the session file at settle.
- `bin/ui.js` already installs `installFatalExit` (`src/foundation/terminal-cleanup/fatal-exit.ts`), which writes allowlisted fatal records to `<runtimeDir>/crashes`. `src/features/prompt-history/` is asynchronous and may skip writes, so it is not a durability barrier.
- Prompt submission runs through `SessionShell.#submit` in `src/app/session-shell/session-shell.ts`, which calls `#rememberInput` and then `#execute`.

## Goals / Non-Goals

**Goals:**

- A crashed or unresponsive tab restarts into its session within a bounded budget, then stops in a visible `failed` state.
- Each data class has the guarantee in Decision 16's data-loss envelope, and each guarantee has a crash-point test on every platform.
- Diagnostics survive the failures they describe and never contain recovery content.
- Reboot and logout end tabs predictably, and no session or journaled prompt is lost.

**Non-Goals:**

- Restoring tabs after reboot or logout (a follow-up change).
- Rich chips, status glyph polish, shortcuts beyond the failed-banner actions, auto-naming, prewarm, and idle suspension (milestone 5).
- The `a1 tabs doctor` and `a1 tabs host status` commands, packaging, and cohort retention (milestone 6).
- Separate capture of child stderr on any platform (see Decision 9).
- Automatic replay of any prompt.

## Decisions

### 1. The server decides restarts; the holder executes them

The restart policy lives in the server's sans-IO core (`native/terminal-host/src/core/`): a per-tab start gate (at most one start in flight), the backoff schedule 1 s, 5 s, 30 s, and the budget of three restarts in a ten-minute window. Budget fields (`restarts`, `restartWindowStart`, `lastExit`) are persisted in the registry before the restart is issued, so a server replacement cannot reset the budget. The server sends an additive `holder.respawn{tabId, incarnation, session}` and the holder spawns `node bin/ui.js --tab --session <file>` with the environment it already holds. Unresponsive restarts (Decision 3) and holder-crash recoveries that need a new child count against the same budget. When the budget is spent, the tab becomes `failed` and nothing restarts it until the user chooses `[r] retry` (resets the budget and restarts once), `[f] start fresh` (new Pi session in the same cwd; the old session stays resumable), or `[alt+w] close`.

If the child exits while the server is down, the holder keeps the tab `crashed` with its snapshot until a server re-admits it. Rejected: a holder-local budget, because two authorities could disagree after server replacement and duplicate starts.

### 2. Restarts reuse the session-writer lease rules

A restart starts only after the holder has verified that the previous child and its tree have exited and the writer-held session lock (milestone 1, wired in milestone 3) can be acquired. Graceful stop comes before force so Pi releases its profile locks. Starts honor `tabsMaxConcurrentStarts` (default 2) with spacing; ten simultaneous crashes therefore restart in waves, and each restarted child must report its configured models as available.

### 3. Child liveness is judged only on healthy supervision evidence

The child sends `bridge.heartbeat{seq}` every 5 s from its event loop (a timer in the tab-mode bridge module). The server shows `unresponsive` after 30 s without a heartbeat and restarts the tab at `tabsUnresponsiveRestartSeconds` (default 120). Silence counts only over an interval in which all of these held continuously:

- the bridge connection stayed established, without reconnects;
- the holder's heartbeats were current (milestone 3);
- the holder reports the child process alive with its recorded identity;
- the server's own loop met its tick deadline (no server stall).

Any break resets the silence clock, so a server replacement, bridge reconnect, or server stall can never trigger a child restart. The restart terminates the verified child tree through the holder (graceful request, 5 s, then force), keeps the journal, draft, and last screen, and then follows Decision 1. Rejected: measuring heartbeats in the holder alone, because the bridge terminates at the server (Decision 5) and adding a second channel only for liveness duplicates authentication.

### 4. Progress stall is a notice, detected by the child

The child knows its own engine events. While the session is working, it records the time of the last model or tool progress event (stream deltas, tool start or update, compaction progress). After `tabsStallNoticeSeconds` (default 300) it reports `bridge.status{state: "stalled"}` and shows a notice above the editor: `No progress for 5 min — Esc interrupts · /restart-tab restarts`. `/restart-tab` sends `bridge.request{action: "restart"}`, which the server handles like `[r] retry` without consuming the crash budget. Nothing is killed automatically. Rejected: a server-side stall timer, because the server would have to infer progress from status deltas it does not own.

### 5. The prompt journal is a separate durable append-only file

Path: `<dataDir>/tabs/<profile-token>/<tabId>/journal.jsonl`, owner-only, opened once at tab start. Records:

- `submitted{id, sessionId, sessionFile, incarnation, fileExisted, kind, text, images?, at}`, appended and synchronized (`fs.fsync` on a write handle; libuv issues `F_FULLFSYNC` on macOS and `FlushFileBuffers` on Windows) before `#execute` runs. The id is a random UUID created at admission.
- `correlated{id, entryId}` after Pi appends the user entry.
- `settled{id, entryId}` after the settled turn's session sync (Decision 7).
- `retired{id}`.

Admission is a new step in `SessionShell.#submit`, after `#rememberInput` and before `#execute`. If the append or sync fails or exceeds 2 s, the prompt stays in the editor, a visible failure is shown, and nothing is dispatched. Prompt history continues unchanged and is never consulted by recovery.

Recovery at child start merges journal and session by identity. An entry with a `settled` record, or whose correlated or text-matched session entry is followed by a settled reply, is retired. Otherwise it is unfinished and offered. Retirement is idempotent: repeating it on the same id is a no-op. The journal is compacted by durable atomic replacement only when every entry is retired.

First turn: Pi creates its session file only after the first reply. The registry records the reserved session identity before the tab accepts input (milestone 2), and the journal records `fileExisted: false`. On restart, a missing file with a journal proving it never existed is a first-turn recovery: start the session at the reserved identity and offer the prompt. A missing file whose journal or registry shows it existed is a missing transcript: the tab is `failed` with the path, and nothing is overwritten.

Rejected: reusing `src/features/prompt-history/` with a sync flag, because its worker queue may skip writes and its store mixes reusable history with recovery.

### 6. Draft checkpoints are periodic, not debounced

A tab-mode draft checkpointer marks the editor dirty on every change and, while dirty, writes at most once per 500 ms, so the dirty interval stays at or under one second during uninterrupted typing. It writes `draft.json` by temporary file plus rename, without a flush: the draft guarantee covers process termination, not power loss (Decision 16 envelope). If a write fails, or the oldest unsaved change is older than one second, the editor footer shows `draft recovery degraded` and the bridge status carries a degraded flag. The flag clears after the next successful write. On restart, the recovered draft goes into the editor. If a journaled prompt is also offered, the prompt goes into the editor and the draft goes into editor history, and a notice says so. Rejected: inactivity-only debounce, which never writes during continuous typing; synchronizing every second, which multiplies flushes for a guarantee drafts do not have.

### 7. Settled turns are synchronized by the child

On a settled `agent_end` (`src/integrations/pi/engine/session-events.ts`) and during graceful stop, the child opens the current session file with write access and calls `fs.fsync`, off the input path, before writing the journal `settled` record. A sync failure marks the turn as not power-loss durable and keeps its journal entry unretired.

### 8. Registry failure handling keeps memory authoritative

On load, an unparseable or invalid `registry.json` is renamed to `registry.corrupt-<ts>.json`, the newest valid `registry-history/` generation is loaded, and a notice names both files. If no generation validates, startup fails closed with the files preserved and reports blocked recovery. On write, a transient rename failure (sharing violation, access denied from scanners, `EBUSY`) is retried with backoff of 50 ms doubling to 2 s, for up to 10 s. Persistent failure or disk-full rejects the pending mutation with its reason, rejects later durable mutations, reports degraded health, and leaves running tabs and in-memory observed state untouched. The server never reloads an older file over newer memory.

### 9. Last screen, recovery files, and stderr

When the child exits, the holder freezes its retained model as a read-only snapshot. The attach client shows it under the crash or failed banner and sends no input to it. The holder writes `recovery/last-screen-<incarnation>.txt`: the visible screen plus up to 5,000 scrollback rows as plain text, capped at 2 MiB. It is owner-only, three generations are kept, and files older than seven days are deleted.

Separate child stderr is not captured in this milestone. Windows ConPTY merges it into the terminal stream, and redirecting it on macOS and Linux would hide output that users see today. The holder provides the private sink anyway (`recovery/stderr-<incarnation>.log`, at most three 5 MiB generations, seven days), exercised by a fixture producer, so a later change can enable capture without new rules. Stderr is never scraped from terminal cells.

### 10. Diagnostics are allowlisted and survive failures

- Native logs `terminal-host-server.log` and `terminal-host-holder-<tab>.log` rotate at 5 MiB with three kept, and are never truncated at startup.
- Each crash, watchdog termination, and unrequested child exit writes its own record `crash-<role>-<incarnation>-<ts>.json` with role, incarnation, reason code, recent structured events, and, for native roles, a backtrace. Records are capped at 64 KiB each, 50 records, and 30 days.
- Field names and reason codes come from one allowlist in the native crate. Records never contain prompt or terminal text, environment values, credentials, raw stderr, or exception messages.
- The child keeps using `writeFatalDiagnostic` for its own allowlisted record, written under the tab's diagnostic directory in tab mode. The holder's unrequested-exit record references it by file name only.
- Diagnostics live under `<dataDir>/tabs/<profile-token>/diagnostics/`. Recovery data lives under `<tabId>/journal.jsonl`, `draft.json`, and `<tabId>/recovery/`. A later export command can include the first class wholesale and exclude the second by path.

### 11. Reboot and logout end the tab set

The server compares the registry's `bootId` with the current boot identity, and a recorded OS-session identity with the current one:

- Windows: the logon session id and logon time from the process token.
- macOS: the audit session id.
- Linux: the logind session of the user manager, when available.

If either differs, or if every recorded holder is gone and the OS-session identity is unavailable, the server moves the previous tab set to `registry-history/` as `tabset-<bootId>-<ts>.json`, empties the active set in one durable mutation, and bare `a1` creates one new tab. Per-tab crash restart applies only when both identities match. The OS-session identity is a new platform function in `native/terminal-host/src/platform/`, tested like the milestone 1 boot identity.

Each history tab set records, per tab, `sessionFile`, the reserved identity, and the journal path. When a tab opens a session (picker or `a1 --session`), the server passes the matching unretired journal paths younger than seven days to the child through the fixed startup contract. The child adopts their unfinished entries into its own journal by submission id, records `retired` in the source journal, and offers them idle. A second adoption of the same id is a no-op.

### 12. Protocol additions stay within generation 1

`holder.respawn`, `holder.snapshot`, `bridge.heartbeat`, the status values `unresponsive`, `stalled`, `crashed`, `restarting`, and `failed`, the `restart` request action, and the recovery-journal field of the startup contract are additive. Each gets a frozen fixture, and the fixture digest is updated in the same change. Peers that lack them fall back to process-level status.

### 13. Crash points are named and test-only

Every persistence step has a named failure point:

- journal: before append, after append, after sync, after dispatch, after correlation, after settle-sync, after settled record, during retirement, during compaction;
- draft: during temp write, before rename, after rename;
- session sync;
- registry: quarantine rename, history load, tab-set move, rename retry;
- recovery file: during write, before rename;
- crash record: during write.

Points are enabled only in hermetic test runs, through the existing `A1_*` override family, and are refused otherwise. Tests kill the process at each point and assert the per-class guarantee. They run in the platform matrix from `scripts/release/validation-matrix.mjs`.

## Risks / Trade-offs

- **[A wedged child that still sends heartbeats from a timer while its UI is frozen]** → Heartbeats come from the same loop as input handling, so a heartbeat proves loop turns. A UI stuck in logic is a progress or UX issue, not a liveness issue, and gets the stall notice.
- **[Journal sync adds latency to every submit]** → One small append and flush per prompt. Admission latency is measured on each platform and recorded in evidence; the 2 s timeout makes a blocked disk visible instead of silent.
- **[Windows power-loss durability of the journal and session sync depends on the drive honoring flushes]** → The claim is limited to supported filesystems from milestone 1. Tests assert the flush calls, and power loss is not certified by API calls alone.
- **[OS-session identity is unavailable on some Linux systems]** → Treat "all holders gone with unknown session" as logout. That can turn a rare mass crash into "not restored", which loses no data, because sessions and journals stay resumable.
- **[Forced termination of a wedged child leaves stale Pi locks]** → Graceful first. The ten-tab test restarts after forced kills and asserts models are available.
- **[Recovery files contain conversation content]** → Owner-only, bounded, seven-day expiry, excluded by path from every diagnostic location.
