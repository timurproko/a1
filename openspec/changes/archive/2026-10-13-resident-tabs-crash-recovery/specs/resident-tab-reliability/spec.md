## ADDED Requirements

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
