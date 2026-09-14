# persistent-prompt-history Specification

## Purpose

Defines durable, profile-isolated recall of user-submitted prompts across bare-A1 sessions, preserving the v2 editor experience while bounding private data, concurrent persistence, and lifecycle failures.

## Requirements

### Requirement: Prompt history lives in profile-isolated application data
Bare A1 SHALL keep durable prompt history at `<history-root>/history/<profile-id>.sqlite3`, separately from control metadata and agent resources. Without an explicit `A1_DATA_DIR`, the history root SHALL be `<effective-home>/.a1/data` on Windows, Linux, and macOS. The effective home SHALL follow the existing A1 launch-profile home policy, including `A1_PROFILE_HOME`. An explicit `A1_DATA_DIR` SHALL select the history root instead, retaining its existing path-resolution behavior. This history-only default change SHALL NOT relocate other product data, settings, agent resources, releases, runtime files, logs, or caches.

Profile identity SHALL be stable for the same normalized effective A1 profile root across launches and releases, independent of cwd, session identity, and the history storage root. The existing profile identity algorithm and database schema SHALL remain compatible. Different effective profile roots SHALL have different history identities.

Default history access SHALL NOT probe, read, migrate, copy, merge, modify, delete, or fall back to the former platform history locations. If the selected new location has no database, A1 SHALL initialize an empty durable store through its ordinary enabled-history startup. Existing local recall and loaded-conversation fallback SHALL remain unchanged and SHALL NOT import old durable history. Disabled persistence and the Pi comparison SHALL NOT initialize A1 history storage or access either default history location.

#### Scenario: Use the default Windows location
- **WHEN** an enabled bare-A1 instance first needs history with effective home `C:/Users/Example` and no data-directory override
- **THEN** its database and any journal sidecars SHALL live under `C:/Users/Example/.a1/data/history`
- **AND** no history database SHALL be created under `%LOCALAPPDATA%/a1/history`, `~/.a1/agent`, `~/.a1/cache`, the repository, or the release payload
- **AND** prompt content SHALL NOT be written into `control.sqlite3`

#### Scenario: Override the application-data root
- **WHEN** A1 starts with `A1_DATA_DIR` set to an isolated directory
- **THEN** all history database and sidecar access SHALL use that directory's `history` child
- **AND** it SHALL NOT read, copy, or mutate history at the default root
- **AND** the override SHALL take precedence over `A1_PROFILE_HOME` for history storage without changing profile identity

#### Scenario: Reuse a profile across projects and launches
- **WHEN** two bare-A1 processes use the same effective profile and history root from different projects or release checkouts
- **THEN** they SHALL address the same durable history without grouping recall by project or prioritizing the current session over committed recency

#### Scenario: Keep overridden profiles separate
- **WHEN** two different effective A1 profile roots share one history root
- **THEN** each SHALL read and modify only its own history
- **AND** matching prompt text or session labels SHALL NOT merge the profiles

#### Scenario: Use the default Linux or macOS location
- **WHEN** an enabled bare-A1 instance starts on Linux or macOS with effective home `H` and no data-directory override
- **THEN** its database and sidecars SHALL live under `H/.a1/data/history`
- **AND** setting `XDG_DATA_HOME` SHALL NOT relocate default prompt history
- **AND** the existing platform locations for all other product data SHALL remain unchanged

#### Scenario: Respect the effective profile home
- **WHEN** A1 uses `A1_PROFILE_HOME=H` without an explicit data-directory override
- **THEN** its default history root SHALL be `H/.a1/data`
- **AND** it SHALL NOT use the operating-system home or the parent of a separately overridden agent-profile directory as an alternative default history root

#### Scenario: Old default history exists on first launch after the change
- **WHEN** no data-directory override is set, the new profile database is absent, and history exists at the former platform default
- **THEN** A1 SHALL begin with an empty durable history at the new location
- **AND** it SHALL NOT access or alter the old database or its sidecars
- **AND** subsequent launches SHALL NOT perform automatic old-location cleanup or import

#### Scenario: The selected history root is unavailable
- **WHEN** the new default root cannot be opened or written
- **THEN** A1 SHALL record a bounded, sanitized developer-only persistence failure without normal UI or terminal output and retain current-session functionality
- **AND** it SHALL NOT fall back to the former platform root or another directory

#### Scenario: Persistence is disabled or the comparison is launched
- **WHEN** bare A1 starts with persistence disabled or the user launches the Pi comparison
- **THEN** it SHALL NOT initialize, probe, or clean up A1's home or former default history stores
- **AND** its existing current-session history behavior SHALL remain unchanged

### Requirement: Only classified user submissions enter durable recall
A1 SHALL persist at most one history update per nonempty, successfully prepared interactive user submission, independently of provider completion. Eligible inputs SHALL include ordinary prompts, steering, follow-ups, inputs queued during compaction, nonempty user bash commands, and user-entered skill/template/extension slash inputs routed as prompts. Built-in workflow or owned-app commands that bypass existing history SHALL remain excluded. Durable history SHALL NOT be an event log of engine output, automatic extension messages, transcript replay, recovery callbacks, or unsubmitted suggestions.

#### Scenario: Submit while an agent is working
- **WHEN** a user submits a steering or follow-up input, including during compaction
- **THEN** the reusable user input SHALL become eligible immediately without waiting for a new agent-start event
- **AND** consuming or draining that queued input later SHALL NOT add another durable update

#### Scenario: Dispatch fails after preparation
- **WHEN** a prepared user submission reaches dispatch but the provider rejects it, the agent is interrupted, or delivery is uncertain
- **THEN** the input SHALL remain eligible for recall
- **AND** error-recovery callbacks SHALL NOT record it again or advance its recency a second time

#### Scenario: Preparation fails before a candidate exists
- **WHEN** attachment preparation is canceled or input validation fails before reusable text can be prepared
- **THEN** existing in-memory draft recovery SHALL remain available
- **AND** an incomplete durable entry SHALL NOT be created

#### Scenario: Resume or replay a conversation
- **WHEN** A1 loads, resumes, forks, or rebuilds a conversation containing prior user messages
- **THEN** those messages SHALL remain eligible for existing in-memory transcript seeding
- **AND** loading them SHALL NOT insert, duplicate, or promote durable records

#### Scenario: Distinguish authored and generated input
- **WHEN** an extension generates input or a contextual suggestion is displayed or merely accepted into the editor
- **THEN** it SHALL NOT enter durable history unless the user explicitly submits it
- **AND** assistant/tool output and initial automated input SHALL NOT enter durable recall

### Requirement: Recalled text is reusable without the originating process
The durable recall value SHALL be the user-authored text before template or extension expansion, with outer whitespace trimmed and internal text preserved. Text-paste content SHALL survive independently of ephemeral chip identifiers. Only this typed recall value and bounded submission provenance SHALL be retained; transformed engine prompts, image bytes, credential stores, arbitrary environment values, and terminal content SHALL NOT be copied into history.

#### Scenario: Recall a pasted multiline prompt after restart
- **WHEN** the user submits a prompt containing a text-paste chip and starts a fresh process
- **THEN** recall SHALL restore its actual text content with internal whitespace, line breaks, and Unicode intact
- **AND** its reusable value SHALL NOT depend on the old chip ID or a process-local paste cache

#### Scenario: Recall a template invocation
- **WHEN** a user submits a template or skill invocation that expands before reaching the agent
- **THEN** recall SHALL restore the user's invocation rather than the expanded system or agent prompt

#### Scenario: Recall text from an image-bearing prompt
- **WHEN** a submitted prompt contains user text and an image chip
- **THEN** persistent recall SHALL retain the user text without a live-looking image attachment token or automatic image reattachment
- **AND** literal placeholder-looking text authored by the user SHALL remain unchanged

#### Scenario: Submit an image-only prompt
- **WHEN** removing semantic image attachments leaves no nonempty recall text
- **THEN** the submission SHALL NOT create an empty or unresolved-placeholder durable entry
- **AND** the original image submission behavior SHALL remain unchanged

### Requirement: Unique recent history has atomic bounded retention
Durable recall SHALL retain the most recently committed unique canonical texts, newest first, with a default count of 100 and the configured count limit applied. A repeated explicit submission SHALL refresh that text's recency instead of creating another visible entry. Distinct text SHALL NOT be conflated by case folding, internal-whitespace normalization, or a hash collision. Concurrent updates and pruning SHALL be atomic and ordered independently of wall-clock skew.

Durable text SHALL be limited to 1 MiB UTF-8 per entry and 8 MiB per profile in addition to the entry count. Oldest records SHALL be pruned when either retained budget is exceeded. Oversized text SHALL be omitted from persistence rather than silently truncated, without preventing submission or existing local recovery. Background work and physical database/journal growth SHALL have finite documented limits and bounded failure behavior.

#### Scenario: Repeat a prompt
- **WHEN** the user explicitly submits A, then B, then A again
- **THEN** committed recall SHALL list A followed by B with one visible A

#### Scenario: Two sessions update concurrently
- **WHEN** two enabled processes commit different prompts to the same profile while retention cleanup runs
- **THEN** every successful commit SHALL participate in one consistent recency order
- **AND** a stale cleanup snapshot SHALL NOT remove a newer entry except as required by that order and the retention budgets

#### Scenario: Exceed the configured retention count
- **WHEN** an update would exceed the effective retention count
- **THEN** the resulting committed snapshot SHALL contain only the newest permitted unique entries
- **AND** increasing the setting later SHALL NOT fabricate or restore pruned records

#### Scenario: Exceed the byte budget
- **WHEN** eligible entries collectively exceed 8 MiB of canonical UTF-8 text
- **THEN** retention SHALL remove oldest entries even if fewer than the configured count remain
- **WHEN** one candidate exceeds 1 MiB
- **THEN** it SHALL be skipped durably without truncation and a bounded persistence condition SHALL be reported without its content

### Requirement: Bare A1 preserves v2 history navigation
With persistent history enabled, bare A1's default editor SHALL offer a bounded, deduplicated recall list incorporating current-process input, saved history, and existing loaded-conversation fallback without persisting fallback reads. At history-navigation boundaries, Up toward older entries SHALL place the caret at the end of the recalled prompt; Down toward newer entries SHALL place it at the beginning. Leaving browsing SHALL restore the pre-navigation draft. Pinned multiline movement outside those boundaries, autocomplete priority, keybindings, selection, undo, and unrelated editor behavior SHALL remain intact.

#### Scenario: Recall older multiline text
- **WHEN** Up crosses the history boundary into an older multiline prompt
- **THEN** that prompt SHALL replace the editor value and the caret SHALL land after the last character on its last line

#### Scenario: Recall newer text or leave history
- **WHEN** Down crosses the history boundary into a newer prompt
- **THEN** the caret SHALL land at the beginning of its first line
- **WHEN** Down leaves history past the newest entry
- **THEN** normal draft restoration SHALL recover the pre-navigation draft rather than losing it to a refresh

#### Scenario: Reach the end of history
- **WHEN** navigation cannot move beyond the oldest entry
- **THEN** neither selection nor caret position SHALL change and no unavailable-action message SHALL appear

#### Scenario: Browse without adding an undo step for every recalled entry
- **WHEN** the user enters history and steps through several prompts
- **THEN** entering history SHALL preserve the source-derived single draft undo boundary
- **AND** intermediate navigation SHALL NOT create the additional undo snapshots of ordinary programmatic text replacement
- **AND** subsequent editing and undo SHALL retain the pinned grouping behavior apart from the explicitly declared caret placement

#### Scenario: Restore a draft with live pasted content
- **WHEN** the pre-navigation draft contains live paste markers and a nonterminal cursor position, and the user browses away and returns
- **THEN** its text, cursor, and live paste backing SHALL be restored intact
- **AND** history navigation SHALL NOT clear its paste store or re-normalize its contents as an ordinary set-text operation would

#### Scenario: Type or submit recalled input
- **WHEN** a prompt is recalled
- **THEN** it SHALL become editable real input, not a ghost suggestion
- **AND** it SHALL NOT execute until the user explicitly submits it

### Requirement: History position is shown in the existing editor border
During history browsing, bare A1 SHALL show `History position/total` in the existing top editor border using its semantic border styling, without adding dock rows. The newest entry SHALL be numbered `total/total` and the oldest `1/total`. The indicator SHALL be absent outside browsing, retain applicable v2 overflow information, and fit the available terminal width.

#### Scenario: Browse three prompts
- **WHEN** the user recalls the newest of three entries
- **THEN** the border SHALL show `History 3/3`
- **WHEN** the user reaches the oldest
- **THEN** it SHALL show `History 1/3`
- **WHEN** the draft is restored
- **THEN** the ordinary editor border SHALL return

#### Scenario: Render a narrow or scrolled editor
- **WHEN** the editor is narrow, uses the A1 prompt prefix, or has hidden lines above the visible text
- **THEN** history presentation SHALL retain the existing border geometry and applicable overflow information without exceeding width or changing cursor layout

### Requirement: Refresh does not destabilize browsing or startup
History loading and cross-process refresh SHALL be asynchronous and SHALL NOT block terminal readiness, typing, rendering, or prompt dispatch on storage. An active browse cycle SHALL retain an immutable entry ordering and draft until it ends. New snapshots SHALL be coalesced and applied only at a safe non-browsing boundary. Editor replacement and lifecycle changes SHALL not allow stale asynchronous callbacks to overwrite newer state.

#### Scenario: Another process submits during browsing
- **WHEN** one process commits a prompt while another is browsing an older snapshot
- **THEN** the browsing process SHALL keep its selected entry, total, and draft unchanged
- **AND** the new committed snapshot SHALL become available after refresh at a non-browsing boundary without restarting the process

#### Scenario: Initial history load finishes after editing starts
- **WHEN** loading finishes after the editor has been constructed and the user has typed a draft
- **THEN** history SHALL be attached without replacing that draft or changing its cursor, selection, paste backing, or undo state
- **AND** a rebuilt default editor SHALL receive the most recent completed snapshot without another disk load being required

#### Scenario: A refresh finishes after lifecycle replacement
- **WHEN** a history read completes after disposal or a profile/session-generation change
- **THEN** the obsolete callback SHALL NOT mutate the current editor or revive its old browse state

#### Scenario: Storage stalls or background queues fill
- **WHEN** storage contends, a worker stalls, or the bounded write queue cannot accept another candidate
- **THEN** input, rendering, and dispatch SHALL continue with local recall
- **AND** background waits, retries, queued bytes, and refresh requests SHALL remain bounded rather than growing indefinitely

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

### Requirement: History is private durable state rather than disposable cache
A1 SHALL protect history files and sidecars with owner-restrictive access where supported and SHALL never include their contents in logs, crash records, or validation evidence. These protections SHALL apply at the home-based default as well as explicitly overridden roots. Documentation SHALL identify history as unencrypted potentially sensitive user text, state its default and override locations, explain retention and next-start opt-out, and describe removal only after all instances using that profile have stopped. Documentation SHALL explain that the default-location change starts fresh without importing or deleting the old history.

Disabling persistence SHALL leave existing records intact. Upgrades, ordinary npm uninstall/reinstall, release rollback, cache cleanup, and conversation deletion SHALL NOT implicitly clear history. A1 SHALL NOT add automatic old-location deletion as part of the default-location change. No legacy import SHALL occur without a separately declared explicit operation.

#### Scenario: Clean caches or upgrade A1
- **WHEN** cache/dependency/release cleanup, an upgrade, or release rollback runs
- **THEN** the history directory SHALL remain outside those cleanup targets

#### Scenario: Inspect diagnostics after a storage failure
- **WHEN** a storage operation fails on a prompt containing sensitive text
- **THEN** bounded developer-only diagnostics SHALL contain only bounded classified failure information, not prompt text, SQL values, arbitrary exception payloads, or private provenance; background-history failures SHALL NOT appear in normal UI or terminal output

#### Scenario: Existing prototype history is present
- **WHEN** A1 starts on a machine containing v2, Pi, or Claude history
- **THEN** it SHALL neither read nor import nor modify those histories automatically

#### Scenario: Uninstall and reinstall the package
- **WHEN** the user performs an ordinary npm uninstall and reinstall without explicitly deleting user data
- **THEN** existing history files and sidecars SHALL remain untouched
- **AND** a compatible version using the same profile and history root SHALL recall the retained prompts

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
