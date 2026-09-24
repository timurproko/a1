## Purpose

Defines the reliability contract of resident tabs: failure-domain isolation, crash-only recovery, non-blocking execution, progress supervision, the explicit data-durability guarantees, fencing, diagnostics preservation, and the verification program that gates release.

## ADDED Requirements

### Requirement: Failure domains are isolated processes
The attach client, the resident server, each tab's session holder, and each tab's A1 process SHALL be separate operating-system processes. No process SHALL host another tab's pseudoterminal, terminal model, or A1 runtime. Termination or hang of the server SHALL NOT terminate or stall any holder or tab process; termination or hang of one holder or tab process SHALL NOT affect any other tab, the server, or any client; termination of a client SHALL NOT affect any resident process.

#### Scenario: Kill every server process repeatedly
- **WHEN** the server is killed ten times within one minute while five tabs stream
- **THEN** all five tab processes SHALL keep running with unchanged process identities and no lost output in their retained screens

#### Scenario: One tab's process tree hangs
- **WHEN** one tab's child stops responding and stops reading its input
- **THEN** every other tab SHALL keep accepting input and rendering at normal latency

### Requirement: Resident processes are crash-only and fail fast
Every resident process SHALL be safe to terminate forcibly at any instruction. Its startup path SHALL be its recovery path, reconciling durable desired state with verified actual state. A detected internal invariant violation SHALL terminate only the affected process with a diagnostic record, and SHALL NOT be swallowed so that the process continues in an inconsistent state. Code SHALL NOT be hot-swapped into a running resident process; upgrades SHALL replace processes.

#### Scenario: Server invariant violation
- **WHEN** the server detects registry and topology state that contradict each other
- **THEN** it SHALL write a crash record and exit, and its replacement SHALL recover from the durable registry and verified holders without affecting tabs

#### Scenario: Forced termination during a registry write
- **WHEN** the server is killed at any point during a registry commit
- **THEN** the next server SHALL load either the complete prior or the complete new registry and SHALL NOT start empty

### Requirement: Control paths never block on external work
Each resident role's state machine SHALL run on a single event loop that performs no blocking system call. Process spawn, pseudoterminal creation, process termination, identity inspection, file writes, and synchronization SHALL run off the event loop with explicit deadlines, and a missed deadline SHALL become a typed failure event. Pseudoterminal creation SHALL occur only inside that tab's holder, so a creation that never returns SHALL hang only that holder, which the server SHALL terminate and replace after its deadline. Termination of several tabs SHALL proceed concurrently and SHALL NOT delay unrelated operations.

#### Scenario: ConPTY creation never returns
- **WHEN** pseudoterminal creation blocks indefinitely in a new tab's holder
- **THEN** the server SHALL remain responsive, SHALL terminate that holder after the spawn deadline, retry within the restart budget, and every other tab SHALL be unaffected

#### Scenario: Close a group of busy tabs
- **WHEN** the user stops six tabs at once
- **THEN** the server SHALL keep answering clients and heartbeats throughout, and every tab SHALL reach stopped or a reported termination failure within the bounded deadline

### Requirement: Pseudoterminal I/O is flow-controlled and never silently lossy
Each holder SHALL read its pseudoterminal continuously on a dedicated reader so the child never blocks on output, and SHALL write input from a dedicated writer with a bounded queue so a child that stops reading never blocks the holder. When the input queue is full, A1 SHALL reject further input for that tab with a visible `not accepting input` indication and SHALL NOT silently drop, reorder, or truncate accepted input. Keystrokes sent while a tab is starting SHALL be queued in order up to the bound and delivered when it becomes ready, or rejected visibly.

#### Scenario: Paste into a stalled child
- **WHEN** the user pastes into a tab whose child is not reading input and the queue fills
- **THEN** the paste SHALL be rejected with a visible indication and SHALL NOT be partially delivered

### Requirement: Liveness and progress are supervised separately
Each resident role SHALL run an independent watchdog that detects its own event-loop stall, records diagnostics including thread state, and terminates only that process. The server SHALL supervise holders through heartbeats, and holders SHALL supervise their A1 process through bridge heartbeats emitted from its event loop. An A1 process that is alive but has missed bridge heartbeats for 30 seconds SHALL be shown as unresponsive; after `tabs.unresponsiveRestartSeconds` (default 120) it SHALL be restarted from its session with its prompt journal and last screen preserved. A tab that is working but has produced no progress event for `tabs.stallNoticeSeconds` (default 300) SHALL be shown as stalled with interrupt and restart actions and SHALL NOT be terminated automatically, because long-running tools are legitimate.

#### Scenario: A1 event loop wedges
- **WHEN** a tab's A1 process stops emitting bridge heartbeats but its process is alive
- **THEN** its chip SHALL show unresponsive within 30 seconds, and after the configured interval the tab SHALL restart from its session with the pending prompt offered back

#### Scenario: Provider stream stalls
- **WHEN** a working tab receives no model or tool progress for five minutes
- **THEN** its chip SHALL show stalled with interrupt and restart actions, and the tab SHALL NOT be killed automatically

### Requirement: Recovery is level-triggered reconciliation
The server SHALL converge each tab's actual state toward its durable desired state through idempotent reconciliation rather than one-shot event handling. Terminal size, lifecycle, and holder presence SHALL be treated as desired state that is re-applied until observed. Every holder and tab-process incarnation SHALL carry a unique incarnation identity, and events from a superseded incarnation SHALL be discarded. Reconciliation SHALL be gated so that at most one start is in flight per tab.

#### Scenario: Late exit event from a replaced child
- **WHEN** an exit notification for a previous incarnation arrives after the tab was restarted
- **THEN** the server SHALL discard it and the new incarnation SHALL keep running

#### Scenario: Resize lost in transit
- **WHEN** a resize message is lost or reordered
- **THEN** the holder's size SHALL still converge to the latest desired size

### Requirement: Stale servers are fenced out
Each server start SHALL durably increment a registry epoch before it acts. Holders and bridges SHALL accept commands only from the highest epoch they have observed and SHALL reject commands from a lower epoch. A server that observes a higher epoch SHALL stop acting and exit.

#### Scenario: A hung server resumes after replacement
- **WHEN** a server that was suspended resumes after a replacement server has started
- **THEN** holders SHALL reject its commands and it SHALL exit without mutating the registry

### Requirement: Durable data is guaranteed per class
A1 SHALL uphold these guarantees across forced termination of any process, including all resident processes at once:
- A submitted prompt SHALL be written and synchronized to an owner-only per-tab prompt journal before it is delivered to the agent, SHALL be retained until the corresponding session entry is committed, and SHALL be offered back after any crash. This SHALL cover the first turn of a new session before Pi creates its session file.
- Committed Pi session entries SHALL never be lost on process termination. A1 SHALL synchronize the session file to stable storage after each settled turn and on graceful stop, so settled turns also survive power loss.
- A tab's session identity and file path SHALL be durably recorded in the registry before the tab accepts input.
- The editor draft SHALL be snapshotted to the prompt journal after at most one second of inactivity.
- When a tab's A1 process dies, its holder SHALL keep the last retained screen visible as a read-only snapshot and SHALL write it with bounded scrollback to an owner-only recovery file, retained for seven days, so streamed but uncommitted output remains readable.
- Registry mutations SHALL be synchronized with write access sufficient for the platform's flush semantics, SHALL retry transient rename failures with backoff, and on persistent failure SHALL keep in-memory state authoritative, report a degraded health state, and never rebuild state from an older file over newer memory.

#### Scenario: Power loss after a settled turn
- **WHEN** the machine loses power after a turn has settled
- **THEN** after reboot the restored tab SHALL contain that turn

#### Scenario: Crash during the first turn of a new tab
- **WHEN** a new tab's A1 process is killed before its first reply completes
- **THEN** the restarted tab SHALL offer the original prompt from the journal even though Pi had not created a session file

#### Scenario: Crash mid-stream
- **WHEN** a tab's A1 process dies while a reply streams
- **THEN** the streamed text SHALL remain visible in the read-only last-screen snapshot and in its recovery file

#### Scenario: Antivirus holds the registry file
- **WHEN** registry rename fails transiently because another process holds the file
- **THEN** the server SHALL retry, keep serving from memory, report degraded health if the failure persists, and SHALL NOT drop or kill any tab

### Requirement: Session exclusivity is enforced by the operating system
A holder SHALL acquire an operating-system exclusive lock on a lease file bound to its tab's session file before starting its A1 process, and SHALL hold it until the process tree has exited. A tab SHALL NOT start when the lease is held elsewhere. Process termination SHALL release the lease through the operating system without cleanup code.

#### Scenario: Orphaned child still alive during recovery
- **WHEN** recovery finds a session whose previous A1 process may still be running but cannot be verified
- **THEN** the lease SHALL prevent a second process from appending to that session, and the tab SHALL report the conflict instead of starting

### Requirement: Concurrent tab starts do not corrupt shared profile state
Tab starts SHALL be limited by `tabs.maxConcurrentStarts` and spaced so that concurrent Pi processes do not contend on profile authentication or settings locks beyond Pi's retry budget. Tab stops SHALL request graceful shutdown before forced termination so profile locks are released normally.

#### Scenario: Restore ten tabs after reboot
- **WHEN** ten tabs are restored at once
- **THEN** every restored tab SHALL start with its configured models available

### Requirement: Diagnostics survive the failures they describe
Resident logs SHALL rotate by size into bounded retained generations and SHALL never be deleted or truncated at startup. Every crash, watchdog termination, and unrequested child exit SHALL produce a distinct timestamped record containing role, incarnation, reason, recent structured events, and, for native processes, a backtrace, bounded in total size and age. Logs and crash records SHALL exclude credentials and prompt text. `a1 tabs doctor` SHALL produce a redacted diagnostic bundle with host status, recent records, counters for restarts, stalls, resyncs, and degraded states, and platform detachment details.

#### Scenario: Two crashes in a row
- **WHEN** a tab crashes, restarts, and crashes again
- **THEN** both crash records SHALL be preserved and distinguishable

### Requirement: Reliability is proven before release
The server state machine SHALL be implemented independently of I/O and SHALL be exercised by deterministic simulation and property tests that inject arbitrary interleavings of process death, message loss, reordering, delay, client churn, and mutations, asserting that no committed mutation is lost, no session gains two live tabs, and every desired-running tab converges to running or failed. Every persistence and IPC step SHALL expose a failure-injection point exercised by crash-point tests. Protocol decoders and surface encoders SHALL be fuzzed. A soak of at least 24 hours with ten tabs under high-rate output and random termination of servers, holders, tab processes, and clients, random resizes, and attach churn SHALL run on Windows, macOS, and Linux before each release that changes resident code, and SHALL assert zero lost journaled prompts, zero lost committed entries, zero orphaned processes, zero duplicate tabs, bounded memory and handle growth, and the declared latency objectives: reattach first paint at the 95th percentile under 300 ms, tab restart after crash under 3 s, and server recovery under 2 s. A failed objective SHALL block release of resident changes.

#### Scenario: Soak detects a leak
- **WHEN** the soak observes handle or memory growth beyond the declared bound
- **THEN** the release of resident changes SHALL be blocked until the growth is fixed or the bound is explicitly re-justified

#### Scenario: Simulation finds a duplicate start
- **WHEN** a simulated interleaving produces two live incarnations for one tab
- **THEN** the test SHALL fail with the minimized event sequence
