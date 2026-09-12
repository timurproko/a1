## MODIFIED Requirements

### Requirement: Persistence failures and shutdown preserve honest durability
A1 SHALL preserve committed history across ordinary restart and transactional crash recovery. A hard termination before asynchronous commit is not guaranteed to preserve pending candidates. Graceful shutdown SHALL attempt a bounded flush without trapping exit. Read, write, corruption, schema, and permission failures SHALL degrade only durable recall and preserve current-session functionality. Background-history failure and recovery diagnostics SHALL be sanitized, bounded, developer-only evidence and SHALL NOT appear in normal user-facing notifications, status text, transcript, stdout, stderr, or post-exit terminal output. Corrupt or newer-schema databases SHALL NOT be silently erased, overwritten, or downgraded. Silence SHALL NOT be presented as proof that an uncertain or skipped write was committed.

#### Scenario: Restart after committed input
- **WHEN** an eligible prompt has committed and A1 restarts or creates a fresh session in the same profile
- **THEN** the prompt SHALL remain recallable unless subsequently evicted by retention

#### Scenario: Crash during a transaction
- **WHEN** a process terminates during a history update or first-time schema creation
- **THEN** the next compatible opener SHALL see a complete valid previous or committed state rather than a partially pruned authoritative snapshot

#### Scenario: Graceful close cannot flush
- **WHEN** shutdown begins with pending writes
- **THEN** A1 SHALL attempt to flush and close within two seconds
- **AND** a failed or timed-out flush SHALL NOT prevent exit or be described as successfully persisted
- **AND** background-history warnings SHALL NOT be printed before or after terminal restoration

#### Scenario: Open an unsupported or damaged store
- **WHEN** the history database is corrupt, identifies another profile, or has a newer unsupported schema
- **THEN** A1 SHALL preserve its files, record only bounded developer diagnostics, and continue with current-session recall
- **AND** it SHALL NOT retry uncertain submissions automatically after losing the storage worker

## ADDED Requirements

### Requirement: Transient history failures recover automatically within bounded resources
A1 SHALL distinguish transient database contention and recoverable worker failures from incompatible or corrupt storage. A transient failure SHALL NOT permanently disable durable recall for an otherwise live UI instance. Once storage becomes available, eligible bounded pending work whose non-commit is known, new submissions, and cross-process refresh SHALL resume automatically without user action. Recovery SHALL NOT block input or dispatch, mutate an active browsing snapshot or draft, create overlapping writers, or replay an uncertain write as a fresh submission. Retry delays, per-operation retention, queued count/bytes, timers, and workers SHALL remain bounded.

#### Scenario: A competing process holds the history database
- **WHEN** the same-profile database remains busy beyond the current short retry window and becomes available before the documented pending-write retention deadline
- **THEN** confirmed-uncommitted eligible pending submissions SHALL commit in their original local order, subject to the existing shared commit ordering and retention rules
- **AND** refresh and persistence SHALL resume in the same UI instance without a warning or restart

#### Scenario: A reply arrives later than the ordinary operation deadline
- **WHEN** a history operation is delayed but its worker can still report the definitive result
- **THEN** A1 SHALL match the result to that operation and worker generation rather than duplicating the write or failing all future history work
- **AND** only a confirmed commit SHALL count as persisted

#### Scenario: A worker is lost during a possible commit
- **WHEN** a worker is terminated or stops responding after a write was sent and before its commit result is known
- **THEN** A1 SHALL keep that prompt available locally without blindly resubmitting the uncertain operation or advancing its durable recency again
- **AND** after the old worker is confirmed stopped, a replacement SHALL restore compatible storage access for future work and reconcile confirmed saved entries
- **AND** late messages from the old worker SHALL NOT mutate the replacement service or editor

#### Scenario: Contention persists or recovery capacity is exhausted
- **WHEN** bounded retry or pending-work limits are reached
- **THEN** A1 SHALL retain the existing bounded local recall, settle affected persistence operations truthfully, and keep future recovery probes bounded
- **AND** submission and exit SHALL remain responsive with no background-history warning text

#### Scenario: Dispose or replace the UI during recovery
- **WHEN** shutdown, profile replacement, or service disposal begins with a recovery timer or worker transition pending
- **THEN** obsolete work SHALL NOT spawn another worker, attach another polling loop, modify the new profile, or overwrite its editor state
- **AND** all admitted persistence promises SHALL settle within the applicable operation or shutdown bound

### Requirement: History resilience is verified independently of diagnostic visibility
Acceptance SHALL demonstrate actual same-instance recovery, safe commit accounting, and bounded resource use as well as absence of background-history messages. Removing or renaming the warning alone SHALL NOT satisfy the change.

#### Scenario: Exercise contention while using the editor
- **WHEN** isolated concurrent-process validation holds and releases a database lock while the user types, browses, and submits
- **THEN** eligible confirmed-uncommitted prompts SHALL become recallable after recovery and a subsequent launch
- **AND** draft, browse ordering, cursor behavior, input responsiveness, and configured retention SHALL remain intact
- **AND** captured notifications, status, transcript, stdout, stderr, and exit output SHALL contain no prompt-history failure or recovery notices
