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
Each holder SHALL read its pseudoterminal continuously on a dedicated reader so the child never blocks on output, and SHALL write input from a dedicated writer with a bounded queue so a child that stops reading never blocks the holder. When the input queue is full, A1 SHALL reject further input for that tab with a visible `not accepting input` indication and SHALL NOT silently drop, reorder, or truncate accepted input. Keystrokes sent while a tab is starting SHALL be queued in order up to the bound and delivered when it becomes ready, or rejected visibly. A paste SHALL reserve capacity for its complete bounded payload before any prefix is delivered. Admission atomicity SHALL NOT be described as atomic execution by the child: failure after admission SHALL report uncertain delivery and SHALL NOT trigger automatic replay.

#### Scenario: Paste into a stalled child
- **WHEN** the user pastes into a tab whose child is not reading input and the queue lacks capacity for the entire paste
- **THEN** admission SHALL reject the paste with a visible indication before delivering any prefix

#### Scenario: Child fails after paste admission
- **WHEN** a paste was admitted but the child dies after reading only part of it
- **THEN** A1 SHALL report uncertain delivery, SHALL NOT claim transactional child execution, and SHALL NOT replay the paste automatically

### Requirement: Liveness and progress are supervised separately
Each resident role SHALL run an independent watchdog that detects its own event-loop stall, records diagnostics including thread state, and terminates only that process. The server SHALL supervise holders through five-second heartbeats and treat three missed ticks over a healthy supervision path as a holder timeout. Holders SHALL supervise their A1 process through bridge heartbeats emitted from its event loop. Server or bridge transport loss alone SHALL NOT be classified as a child hang or authorize child termination; child liveness SHALL be re-established before destructive recovery. An A1 process that is alive but has missed bridge heartbeats for 30 seconds SHALL be shown as unresponsive; after `tabs.unresponsiveRestartSeconds` (default 120) it SHALL be restarted from its session with its prompt journal and last screen preserved. A tab that is working but has produced no progress event for `tabs.stallNoticeSeconds` (default 300) SHALL be shown as stalled with interrupt and restart actions and SHALL NOT be terminated automatically, because long-running tools are legitimate.

#### Scenario: A1 event loop wedges
- **WHEN** a tab's A1 process stops emitting bridge heartbeats but its process is alive
- **THEN** its chip SHALL show unresponsive within 30 seconds, and after the configured interval the tab SHALL restart from its session with the pending prompt offered back

#### Scenario: Server loss interrupts bridge delivery
- **WHEN** the server dies or the bridge transport fails while a child remains alive
- **THEN** holders SHALL keep the child running, report degraded status, and SHALL NOT apply the child heartbeat restart deadline solely to the transport outage

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

### Requirement: Stale servers and registry writers are fenced out
Exactly one server SHALL hold the owner-only operating-system registry-writer lease. A failed endpoint handshake SHALL NOT by itself authorize replacement: the starter SHALL verify the recorded owner's native process identity, terminate that owner, and acquire the released lease, or fail closed when verification or acquisition is unavailable. Each server start SHALL durably increment the registry epoch while holding the lease before it acts. Every registry mutation SHALL verify that the lease is still held and the durable epoch is current. Holders and bridges SHALL accept commands only from the highest epoch they have observed and SHALL reject lower epochs.

#### Scenario: A hung server resumes after replacement
- **WHEN** a verified hung server was terminated, its lease was acquired by a replacement, and stale work from the old incarnation is later delivered
- **THEN** holders and bridges SHALL reject its epoch and no stale registry mutation SHALL commit

#### Scenario: Timed-out owner cannot be verified
- **WHEN** the endpoint does not answer but the recorded owner cannot be proven and terminated by native identity
- **THEN** A1 SHALL report host recovery blocked and SHALL NOT start a second registry writer

### Requirement: Durable data is guaranteed per class
A1 SHALL uphold these guarantees across forced termination of any process, including all resident processes at once:
- Each submitted prompt SHALL have a stable submission ID bound to its session/incarnation and SHALL be synchronized to an owner-only per-tab journal before agent dispatch. Failed or timed-out journal admission SHALL preserve the editor prompt, report the failure, and dispatch nothing. Asynchronous prompt history SHALL NOT substitute for this barrier. A journal entry SHALL be retired only after the corresponding identified session entry is synchronized; settled completion SHALL also be durably correlated so recovery does not offer a completed submission as unfinished. Recovery SHALL reconcile journal/session records by identity, offer unfinished prompts without automatic resend, and cover the first turn before Pi creates its session file.
- Committed Pi session entries SHALL never be lost on process termination. A1 SHALL synchronize the session file to stable storage after each settled turn and on graceful stop, so settled turns also survive power loss.
- A tab's session identity and file path SHALL be durably recorded in the registry before the tab accepts input.
- The editor draft SHALL be checkpointed periodically with a maximum one-second dirty interval while storage and the event loop are healthy, including continuous typing with no idle interval. A failed or late checkpoint SHALL expose degraded recovery and SHALL NOT silently retain the one-second loss guarantee.
- When a tab's A1 process dies, its holder SHALL keep the last retained screen visible as a read-only snapshot and SHALL write it with bounded scrollback to an owner-only recovery file, retained for seven days, so streamed but uncommitted output remains readable.
- Registry mutations SHALL be synchronized with write access sufficient for the platform's flush semantics, SHALL retry transient rename failures with backoff, and SHALL NOT be acknowledged as committed until their durability barrier succeeds. Persistent failure SHALL reject new durable mutations while retaining live observed state in memory, report degraded health, and never rebuild state from an older file over newer memory. Windows file and replacement/directory metadata durability primitives and supported-filesystem limits SHALL be specified and tested; API-call occurrence alone SHALL NOT certify power-loss survival.

#### Scenario: Power loss after a settled turn
- **WHEN** the machine loses power after a turn has settled
- **THEN** after reboot the restored tab SHALL contain that turn

#### Scenario: Crash during the first turn of a new tab
- **WHEN** a new tab's A1 process is killed before its first reply completes
- **THEN** the restarted tab SHALL offer the original prompt from the journal even though Pi had not created a session file

#### Scenario: Journal admission fails
- **WHEN** a submitted prompt cannot be durably journaled before dispatch
- **THEN** the editor SHALL retain it with a visible failure and the agent SHALL receive no submission

#### Scenario: Crash between session synchronization and journal retirement
- **WHEN** a submission's session entry is synchronized but the journal still contains its submission ID at crash time
- **THEN** recovery SHALL reconcile the records without duplicating the session entry or dispatching the prompt, and SHALL offer it only if the turn remains unfinished

#### Scenario: Continuous typing before a crash
- **WHEN** the user types continuously for thirty seconds with healthy storage and the tab is then killed
- **THEN** recovery SHALL contain all but at most the last second of draft changes without requiring an inactivity interval

#### Scenario: Draft checkpoint stalls
- **WHEN** the draft checkpoint exceeds its dirty-interval bound because storage fails or blocks
- **THEN** A1 SHALL report degraded recovery when observable and SHALL NOT claim the one-second draft-loss bound remains satisfied

#### Scenario: Crash mid-stream
- **WHEN** a tab's A1 process dies while a reply streams
- **THEN** the streamed text SHALL remain visible in the read-only last-screen snapshot and in its recovery file

#### Scenario: Antivirus holds the registry file
- **WHEN** registry rename fails transiently because another process holds the file
- **THEN** the server SHALL retry, keep serving from memory, report degraded health if the failure persists, and SHALL NOT drop or kill any tab

### Requirement: Session exclusivity is enforced by the operating system
Every Windows A1-owned runtime that writes a Pi session, whether resident, direct/fallback, or Pi-comparison, SHALL acquire the same profile-neutral native session-writer lease before opening it for writing, regardless of the resident setting. Direct modes SHALL NOT start a resident host, holder, or bridge to perform this check. Lease identity SHALL resolve case, junction/symlink and existing-file aliases, and SHALL reserve a canonical parent/name for a new file without a gap when binding its created file identity. Lock custody SHALL follow the actual session writer lifetime; death of the holder alone SHALL NOT release exclusivity while the writer remains alive. Replacement SHALL require lease acquisition and verified exit of the previous writer/tree; unavailable proof SHALL block replacement. Session switching SHALL acquire the target before releasing the previous writer lease and preserve the old session on failed admission. Kernel cleanup SHALL release abandoned leases only once no live owner remains. Unmodified external Pi, older nonparticipating releases, and arbitrary file writers are outside this cooperative contract and SHALL NOT be claimed as covered.

#### Scenario: Orphaned child still alive during recovery
- **WHEN** recovery finds a session whose previous A1 process may still be running but cannot be verified
- **THEN** the lease SHALL prevent a second process from appending to that session, and the tab SHALL report the conflict instead of starting

#### Scenario: Holder dies before its writer exits
- **WHEN** a holder is killed but its A1 writer has not yet been proven exited
- **THEN** the writer-bound lease SHALL prevent a replacement from writing the same session, and uncertainty SHALL keep recovery blocked

#### Scenario: Direct fallback targets a held session
- **WHEN** a direct or fallback A1 runtime selects a session held by a resident writer
- **THEN** admission SHALL fail safely or offer an explicit fork, and SHALL NOT start a second writer or silently attach the direct invocation

#### Scenario: Session path alias
- **WHEN** two Windows A1-owned runtimes select aliases of the same session file
- **THEN** both SHALL resolve the same lock authority and at most one SHALL open the session for writing

#### Scenario: Session switch conflicts
- **WHEN** a running session attempts to switch to a session already held elsewhere
- **THEN** the switch SHALL be rejected without losing the old session or its lease

### Requirement: Concurrent tab starts do not corrupt shared profile state
Tab starts SHALL be limited by `tabs.maxConcurrentStarts` and spaced so that concurrent Pi processes do not contend on profile authentication or settings locks beyond Pi's retry budget. Tab stops SHALL request graceful shutdown before forced termination so profile locks are released normally.

#### Scenario: Restore ten tabs after reboot
- **WHEN** ten tabs are restored at once
- **THEN** every restored tab SHALL start with its configured models available

### Requirement: Diagnostics survive the failures they describe
Resident logs SHALL rotate by size into bounded retained generations and SHALL never be deleted or truncated at startup. Every crash, watchdog termination, and unrequested child exit SHALL produce a distinct timestamped record containing role, incarnation, reason, recent structured events, and, for native processes, a backtrace, bounded in total size and age. Structured logs and crash records SHALL use allowlisted metadata and SHALL exclude credentials, prompt/transcript/terminal content, raw stderr, and arbitrary exception messages. Journals, last-screen snapshots, and optional separately captured child stderr SHALL be classified as sensitive recovery artifacts rather than sanitized diagnostics, restricted to the owner and bounded by size and age. Optional stderr SHALL retain at most three 5 MiB generations for at most seven days and SHALL NOT be inferred by scraping terminal cells. `a1 tabs doctor` SHALL export only allowlisted diagnostic data with host status, recent structured records, counters for restarts, stalls, resyncs, and degraded states, and platform detachment details; it SHALL exclude recovery content.

#### Scenario: Two crashes in a row
- **WHEN** a tab crashes, restarts, and crashes again
- **THEN** both crash records SHALL be preserved and distinguishable

#### Scenario: Extension writes sensitive stderr
- **WHEN** a child extension writes a prompt, credential-like text, or terminal control sequence to stderr
- **THEN** that raw content SHALL NOT appear in structured logs, crash records, or the doctor bundle, and any separately captured copy SHALL remain private bounded recovery data

### Requirement: Reliability evidence matches the enablement stage
The server state machine SHALL be implemented independently of I/O and SHALL be exercised by deterministic simulation and property tests that inject arbitrary interleavings of process death, message loss, reordering, delay, stale epochs, controller transfer, client churn, and mutations, asserting that no committed mutation is lost, only one registry writer exists, no session gains two live tabs, client-scoped requests remain attributable, and every desired-running tab converges to running or failed. Every persistence and IPC step SHALL expose a failure-injection point exercised by crash-point tests. Protocol decoders and surface encoders SHALL be fuzzed, and bounded Windows chaos/fault-injection suites SHALL gate the opt-in slice. Implementation SHALL progress through contracts/baseline, one persistent tab, failure isolation, safe recovery, complete UX, and packaged certification, with evidence at each milestone before dependent behavior is enabled. Intermediate demonstrations SHALL NOT count as shipping acceptance. Historical v2/herdr results, Unix-only tests, and pending 2×2 proof records SHALL NOT substitute for exact-package Windows resident evidence.

Before resident tabs may default on for Windows, a separately authorized isolated-worker soak of at least 24 hours SHALL exercise ten tabs under high-rate output and random termination of servers, holders, tab processes, and clients, controller and resize churn, blocked writes, ConPTY creation hangs, and rename denial. It SHALL assert zero lost journaled prompts, zero lost committed entries, zero orphaned processes, zero duplicate tabs, bounded memory and handle growth, reattach p95 under 300 ms, tab restart under 3 s, and server recovery under 2 s. Each later platform SHALL earn equivalent implementation and exact-package evidence before enablement; evidence SHALL NOT be inferred across platforms.

#### Scenario: Opt-in preview changes resident code
- **WHEN** the Windows preview remains disabled by default
- **THEN** deterministic, crash-point, fuzz, bounded chaos, and exact-package physical evidence SHALL be required without claiming that the later 24-hour default-on gate has passed

#### Scenario: Prototype evidence is available
- **WHEN** a reference prototype has a passing benchmark or another platform's detach tests pass
- **THEN** A1's Windows resident milestone and physical verdict SHALL remain unproven until its own exact-artifact evidence is recorded

#### Scenario: Default-on soak detects a leak
- **WHEN** the authorized 24-hour soak observes handle or memory growth beyond the declared bound
- **THEN** default enablement SHALL remain blocked until the growth is fixed or the bound is explicitly re-justified in a later approved plan

#### Scenario: Simulation finds a duplicate start
- **WHEN** a simulated interleaving produces two live incarnations for one tab
- **THEN** the test SHALL fail with the minimized event sequence
