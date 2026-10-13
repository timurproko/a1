# resident-tab-reliability Specification

## Purpose
TBD - created by archiving change resident-tabs-failure-isolation. Update Purpose after archive.

## Requirements

### Requirement: Failure domains are isolated processes
The attach client, the resident server, each tab's session holder, and each tab's A1 process SHALL be separate operating-system processes. No process SHALL host another tab's pseudoterminal, terminal model, or A1 runtime. Termination or hang of the server SHALL NOT terminate or stall any holder or tab process; termination or hang of one holder or tab process SHALL NOT affect any other tab, the server, or any client; termination of a client SHALL NOT affect any resident process.

#### Scenario: Kill every server process repeatedly
- **WHEN** the server is killed ten times within one minute while five tabs stream
- **THEN** all five tab processes SHALL keep running with unchanged process identities and no lost output in their retained screens
- **AND** after the start budget stops automatic replacement, an explicit restart SHALL reattach all five tabs

#### Scenario: One tab's process tree hangs
- **WHEN** one tab's child stops responding and stops reading its input
- **THEN** every other tab SHALL keep accepting input and rendering at normal latency

#### Scenario: Attach client is killed
- **WHEN** the attach client is killed while two tabs work
- **THEN** both holders and A1 processes SHALL keep running with unchanged process identities

### Requirement: Resident processes are crash-only and fail fast
Every resident process SHALL be safe to terminate forcibly at any instruction. Its startup path SHALL be its recovery path, reconciling durable desired state with verified actual state. A detected internal invariant violation SHALL terminate only the affected process after writing a crash record, and SHALL NOT be swallowed so that the process continues in an inconsistent state. Code SHALL NOT be hot-swapped into a running resident process; upgrades SHALL replace processes.

#### Scenario: Server invariant violation
- **WHEN** the server detects registry and topology state that contradict each other
- **THEN** it SHALL write a crash record and exit, and its replacement SHALL recover from the durable registry and verified holders without affecting tabs

#### Scenario: Forced termination during a registry write
- **WHEN** the server is killed at any point during a registry commit
- **THEN** the next server SHALL load either the complete prior or the complete new registry and SHALL NOT start empty

### Requirement: Control paths never block on external work
Each resident role's state machine SHALL run on a single event loop that performs no blocking system call. Process spawn, pseudoterminal creation, process termination, identity inspection, file writes, and synchronization SHALL run off the event loop with explicit deadlines, and a missed deadline SHALL become a typed failure event. Pseudoterminal creation SHALL occur only inside that tab's holder, so a creation that never returns SHALL hang only that holder, which the server SHALL terminate and replace after its deadline. Termination of several tabs SHALL proceed concurrently and SHALL NOT delay unrelated operations. The server and holder state machines SHALL be deterministic and free of I/O so that simulation can drive them.

#### Scenario: Pseudoterminal creation never returns
- **WHEN** pseudoterminal creation blocks indefinitely in a new tab's holder
- **THEN** the server SHALL remain responsive, SHALL terminate that holder after the spawn deadline, retry within the start-attempt budget, and every other tab SHALL be unaffected

#### Scenario: Close a group of busy tabs
- **WHEN** the user stops six tabs at once
- **THEN** the server SHALL keep answering clients and heartbeats throughout, and every tab SHALL reach stopped or a reported termination failure within the bounded deadline

#### Scenario: Registry synchronization stalls
- **WHEN** a registry flush does not complete within its deadline
- **THEN** the server SHALL reject the pending mutation with a typed failure and SHALL keep serving clients, holders, and heartbeats

### Requirement: Resident roles are supervised by heartbeats and watchdogs
Each resident role (attach client, server, and holder) SHALL run its own watchdog, independent of its event loop, that detects a stall of that loop, writes a crash record, and terminates only that process. The server SHALL supervise each holder through five-second heartbeats emitted from the holder's main loop, SHALL count a missed heartbeat only while its own event loop and the holder connection are healthy, and after three consecutive misses SHALL verify the holder's native identity and terminate only that holder's process tree, gracefully and then forcibly within bounded deadlines. A stall of the server itself SHALL NOT be counted against any holder. Supervision of the A1 child's own event loop and of agent progress is outside this requirement.

#### Scenario: One holder hangs
- **WHEN** one tab's holder stops sending heartbeats while the server is healthy
- **THEN** the server SHALL terminate only that verified holder after three missed heartbeats, and every other tab SHALL be unaffected

#### Scenario: Server loop stalls
- **WHEN** the server's own loop stalls long enough that holder heartbeats go unread
- **THEN** the server SHALL NOT treat the holders as hung once its loop resumes

#### Scenario: Holder event loop stalls
- **WHEN** a holder's main loop stops advancing past its watchdog limit
- **THEN** that holder's watchdog SHALL write a crash record and end that holder only

### Requirement: Pseudoterminal I/O is flow-controlled and never silently lossy
Each holder SHALL read its pseudoterminal continuously on a dedicated reader so the child never blocks on output, and SHALL write input from a dedicated writer with a bounded queue so a child that stops reading never blocks the holder. When the input queue is full, A1 SHALL reject further input for that tab with a visible `not accepting input` indication and SHALL NOT silently drop, reorder, or truncate accepted input. Keystrokes sent while a tab is starting SHALL be queued in order up to the bound and delivered when it becomes ready, or rejected visibly. A paste SHALL reserve capacity for its complete bounded payload before any prefix is delivered. Admission atomicity SHALL NOT be described as atomic execution by the child: failure after admission SHALL report uncertain delivery and SHALL NOT trigger automatic replay.

#### Scenario: Paste into a stalled child
- **WHEN** the user pastes into a tab whose child is not reading input and the queue lacks capacity for the entire paste
- **THEN** admission SHALL reject the paste with a visible indication before delivering any prefix

#### Scenario: Child fails after paste admission
- **WHEN** a paste was admitted but the child dies after reading only part of it
- **THEN** A1 SHALL report uncertain delivery, SHALL NOT claim transactional child execution, and SHALL NOT replay the paste automatically

#### Scenario: Typing while a tab starts
- **WHEN** the user types into a tab whose child has not started yet
- **THEN** the keystrokes SHALL be delivered in order once it is ready, or rejected visibly if the queue fills

### Requirement: Recovery is level-triggered reconciliation
The server SHALL converge each tab's actual state toward its durable desired state through idempotent reconciliation rather than one-shot event handling. Terminal size, lifecycle, and holder presence SHALL be treated as desired state that is re-applied until observed. Every holder and tab-process incarnation SHALL carry a unique incarnation identity, and events from a superseded incarnation SHALL be discarded. Reconciliation SHALL be gated so that at most one start is in flight per tab.

#### Scenario: Late exit event from a replaced holder
- **WHEN** an exit notification for a previous holder incarnation arrives after the tab was started under a new incarnation
- **THEN** the server SHALL discard it and the new incarnation SHALL keep running

#### Scenario: Resize lost in transit
- **WHEN** a resize message is lost or reordered
- **THEN** the holder's size SHALL still converge to the latest desired size

#### Scenario: Duplicate start request
- **WHEN** two start requests for one tab arrive while a start is in flight
- **THEN** exactly one holder incarnation SHALL be started for that tab

### Requirement: Stale servers and registry writers are fenced out
Exactly one server SHALL hold the owner-only operating-system registry-writer lease. A failed endpoint handshake SHALL NOT by itself authorize replacement: the starter SHALL verify the recorded owner's native process identity, terminate that owner, and acquire the released lease, or fail closed when verification or acquisition is unavailable. Each server start SHALL durably increment the registry epoch while holding the lease before it acts. Every registry mutation SHALL verify that the lease is still held and the durable epoch is current. Holders and bridges SHALL accept commands only from the highest epoch they have observed and SHALL reject lower epochs.

#### Scenario: A hung server resumes after replacement
- **WHEN** a verified hung server was terminated, its lease was acquired by a replacement, and stale work from the old incarnation is later delivered
- **THEN** holders and bridges SHALL reject its epoch and no stale registry mutation SHALL commit

#### Scenario: Timed-out owner cannot be verified
- **WHEN** the endpoint does not answer but the recorded owner cannot be proven and terminated by native identity
- **THEN** A1 SHALL report host recovery blocked and SHALL NOT start a second registry writer

#### Scenario: Recorded pid now names another process
- **WHEN** a holder or owner record names a pid whose native start identity no longer matches
- **THEN** the server SHALL neither adopt nor terminate that process

### Requirement: Session exclusivity is enforced by the operating system
Every A1-owned runtime that writes a Pi session on a supported platform, whether resident, direct/fallback, or Pi-comparison, SHALL acquire the same profile-neutral native session-writer lease before opening it for writing, regardless of the resident setting. This SHALL cover startup with or without explicit session selection and every in-runtime replacement, including new, resume, fork, and import, and appends to another session's metadata. Direct modes SHALL NOT start a resident host, holder, or bridge to perform this check. The lease SHALL be an operating-system lock held by the writer process itself. Lease identity SHALL resolve case, junction/symlink, hard-link and existing-file aliases, and SHALL reserve a canonical parent/name for a new file without a gap when binding its created file identity. A newly reserved file SHALL remain compatible with Pi's first-message persistence: binding stable identity SHALL NOT cause the first user message to fail exclusive creation, duplicate the session header, change the generated session identity, or leave the runtime unable to respond. Lock custody SHALL follow the actual session writer lifetime; death of the holder alone SHALL NOT release exclusivity while the writer remains alive. Replacement SHALL require lease acquisition and verified exit of the previous writer/tree; unavailable proof SHALL block replacement. Session switching SHALL acquire the target before releasing the previous writer lease and preserve the old session on failed admission. Kernel cleanup SHALL release abandoned leases only once no live owner remains. Unmodified external Pi, older nonparticipating releases, and arbitrary file writers are outside this cooperative contract and SHALL NOT be claimed as covered.

#### Scenario: Orphaned child still alive during recovery
- **WHEN** server replacement finds a tab whose previous A1 process may still be running but cannot be verified
- **THEN** the lease SHALL prevent a second process from appending to that session, and the tab SHALL report the conflict instead of starting

#### Scenario: Holder dies before its writer exits
- **WHEN** a holder is killed but its A1 writer has not yet been proven exited
- **THEN** the writer-bound lease SHALL prevent a replacement from writing the same session, and uncertainty SHALL keep recovery blocked

#### Scenario: Direct fallback targets a held session
- **WHEN** a direct or fallback A1 runtime selects a session held by a resident writer
- **THEN** admission SHALL fail safely or offer an explicit fork, and SHALL NOT start a second writer or silently attach the direct invocation

#### Scenario: Session path alias
- **WHEN** two A1-owned runtimes select aliases of the same session file
- **THEN** both SHALL resolve the same lock authority and at most one SHALL open the session for writing

#### Scenario: Session switch conflicts
- **WHEN** a running session attempts to switch to a session already held elsewhere
- **THEN** the switch SHALL be rejected without losing the old session or its lease

#### Scenario: Resident tabs disabled
- **WHEN** `residentTabs` is off and two direct `a1 --session` launches select the same session
- **THEN** exactly one SHALL write it, and no resident host, holder, or bridge SHALL start

#### Scenario: First prompt in a fresh session
- **WHEN** an A1-owned runtime reserves a new session and submits its first user message
- **THEN** the message SHALL persist without `EEXIST` after the lease binds the created file identity
- **AND** the session file SHALL contain one valid header with the originally generated identity followed by the submitted message
- **AND** the runtime SHALL retain exclusive writer authority and continue the turn

#### Scenario: First prompt after new-session replacement
- **WHEN** a running A1-owned runtime creates a new session and submits that session's first user message
- **THEN** the new target SHALL persist without `EEXIST` under its bound writer lease
- **AND** the previous writer lease SHALL be released only after the new target is active

### Requirement: Concurrent tab starts do not corrupt shared profile state
Tab starts SHALL be limited by `tabsMaxConcurrentStarts` and spaced so that concurrent Pi processes do not contend on profile authentication or settings locks beyond Pi's retry budget. Tab stops SHALL request graceful shutdown before forced termination so profile locks are released normally.

#### Scenario: Start ten tabs at once
- **WHEN** ten tabs start at once
- **THEN** every tab SHALL start with its configured models available

#### Scenario: Stop a tab that honours shutdown
- **WHEN** a tab whose A1 process honours graceful shutdown is stopped
- **THEN** it SHALL exit without forced termination and leave no stale profile lock behind

### Requirement: Liveness and progress are supervised separately
Each resident tab's A1 process SHALL emit bridge heartbeats from its event loop. The server SHALL measure heartbeat silence only over intervals in which the bridge connection stayed established, the holder's own supervision heartbeats were current, the holder reported the child alive with its recorded identity, and the server's own loop met its deadline; any break SHALL reset the measurement. Server or bridge transport loss alone SHALL NOT be classified as a child hang or authorize child termination. An A1 process that has missed heartbeats for 30 seconds of healthy observation SHALL be shown as unresponsive; after `tabsUnresponsiveRestartSeconds` (default 120) it SHALL be terminated as a verified tree, gracefully then forcibly, and restarted from its session under the restart budget with its prompt journal, draft, and last screen preserved. A tab that is working but has produced no model or tool progress event for `tabsStallNoticeSeconds` (default 300) SHALL be shown as stalled with interrupt and restart actions and SHALL NOT be terminated automatically, because long-running tools are legitimate.

#### Scenario: A1 event loop wedges
- **WHEN** a tab's A1 process stops emitting bridge heartbeats while its process is alive and supervision is healthy
- **THEN** the tab SHALL show unresponsive within 30 seconds, and after the configured interval it SHALL restart from its session with the pending prompt offered back

#### Scenario: Server loss interrupts bridge delivery
- **WHEN** the server dies or the bridge transport fails while a child remains alive
- **THEN** holders SHALL keep the child running, status SHALL degrade, and the heartbeat restart deadline SHALL NOT be applied to the outage

#### Scenario: Provider stream stalls
- **WHEN** a working tab receives no model or tool progress for five minutes
- **THEN** the tab SHALL show stalled with interrupt and restart actions, and SHALL NOT be killed automatically

### Requirement: Durable data is guaranteed per class
A1 SHALL uphold these guarantees for resident tabs across forced termination of any process, including all resident processes at once:
- Each submitted prompt SHALL have a stable submission ID bound to its session and incarnation and SHALL be synchronized to an owner-only per-tab journal before agent dispatch. Failed or timed-out journal admission SHALL preserve the editor prompt, report the failure, and dispatch nothing. Asynchronous prompt history SHALL NOT substitute for this barrier. A journal entry SHALL be retired only after the corresponding session entry is synchronized, retirement SHALL be idempotent, and settled completion SHALL be durably correlated so recovery never offers a completed submission as unfinished. Recovery SHALL reconcile journal and session records by identity, offer unfinished prompts without automatic resend, and cover the first turn before Pi creates its session file.
- Committed Pi session entries SHALL never be lost on process termination. A1 SHALL synchronize the session file to stable storage after each settled turn and on graceful stop, so settled turns also survive power loss.
- The editor draft SHALL be checkpointed periodically with a maximum one-second dirty interval while storage and the event loop are healthy, including continuous typing with no idle interval. A failed or late checkpoint SHALL show degraded recovery and SHALL NOT silently retain the one-second loss guarantee.
- When a tab's A1 process dies, its holder SHALL keep the last retained screen visible as a read-only snapshot and SHALL write it with bounded scrollback to an owner-only recovery file retained for seven days.
- An unreadable registry SHALL be quarantined and the last good history generation loaded with a notice naming both; if no generation is valid, recovery SHALL fail closed with the files preserved. Transient registry rename failures SHALL be retried with backoff. Persistent failure or a full disk SHALL reject the mutation with its reason and reject later durable mutations, report degraded health, keep live observed state in memory, and SHALL NOT rebuild state from an older file or affect running tabs.
- Every persistence step for these classes SHALL have a failure-injection point exercised by crash tests on Windows x64, macOS, and Linux.

#### Scenario: Power loss after a settled turn
- **WHEN** the machine loses power after a turn has settled
- **THEN** after reboot that session SHALL contain that turn when it is resumed

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
- **THEN** A1 SHALL show degraded recovery when observable and SHALL NOT claim the one-second draft-loss bound remains satisfied

#### Scenario: Crash mid-stream
- **WHEN** a tab's A1 process dies while a reply streams
- **THEN** the streamed text SHALL remain visible in the read-only last-screen snapshot and in its recovery file

#### Scenario: Corrupt registry
- **WHEN** the registry cannot be parsed at server start
- **THEN** the server SHALL quarantine it, load the last good generation, and name both files in a notice

#### Scenario: No valid registry history remains
- **WHEN** the registry and all retained generations fail validation
- **THEN** startup SHALL report blocked recovery, preserve the files, and SHALL NOT write an empty tab set

#### Scenario: Antivirus holds the registry file
- **WHEN** registry rename fails transiently because another process holds the file
- **THEN** the server SHALL retry, keep serving from memory, report degraded health if the failure persists, and SHALL NOT drop or kill any tab

#### Scenario: Disk full during a mutation
- **WHEN** a registry write fails because the disk is full
- **THEN** the mutation SHALL be rejected with its reason and running tabs SHALL be unaffected

#### Scenario: Ten tabs restart at once
- **WHEN** ten tabs crash together and restart under the start limit
- **THEN** every restarted tab SHALL report its configured models as available

### Requirement: Diagnostics survive the failures they describe
Resident logs SHALL rotate by size into bounded retained generations and SHALL never be deleted or truncated at startup. Every crash, watchdog termination, and unrequested child exit SHALL produce a distinct timestamped record containing role, incarnation, reason, recent structured events, and, for native processes, a backtrace, bounded in size, count, and age. Structured logs and crash records SHALL use allowlisted fields and reason codes and SHALL exclude credentials, environment values, prompt, transcript, and terminal content, raw stderr, and arbitrary exception messages. Journals, drafts, last-screen snapshots, and any separately captured child stderr SHALL be classified as sensitive recovery artifacts rather than diagnostics, restricted to the owner, bounded by size and age, and stored apart from diagnostics so that any diagnostic export can exclude them by location. Separately captured stderr SHALL retain at most three 5 MiB generations for at most seven days and SHALL NOT be inferred by scraping terminal cells.

#### Scenario: Two crashes in a row
- **WHEN** a tab crashes, restarts, and crashes again
- **THEN** both crash records SHALL be preserved and distinguishable

#### Scenario: Extension writes sensitive stderr
- **WHEN** a child extension writes a prompt, credential-like text, or terminal control sequence to stderr
- **THEN** that raw content SHALL NOT appear in structured logs or crash records, and any copy SHALL exist only in owner-only recovery artifacts

#### Scenario: Diagnostic location holds only allowlisted data
- **WHEN** the diagnostic directory is collected after crashes, watchdog terminations, and unrequested exits on any platform
- **THEN** every file in it SHALL validate against the diagnostic allowlist, and no recovery artifact SHALL be stored there, so the later `a1 tabs doctor` export can include it without recovery content
