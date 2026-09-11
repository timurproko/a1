## Purpose

Defines durable, profile-isolated recall of user-submitted prompts across bare-A1 sessions, preserving the v2 editor experience while bounding private data, concurrent persistence, and lifecycle failures.

## ADDED Requirements

### Requirement: Prompt history lives in profile-isolated application data
Bare A1 SHALL keep durable prompt history at `<A1 dataDir>/history/<profile-id>.sqlite3`, separately from control metadata and agent resources. The data root SHALL follow existing product-path policy, including `A1_DATA_DIR`, the Windows `%LOCALAPPDATA%/a1` default, and current Unix `$XDG_DATA_HOME/a1` or `~/.local/share/a1` defaults. Profile identity SHALL be stable for the same normalized effective A1 profile root across launches and releases, independent of cwd and session identity. Different effective profile roots SHALL have different history identities.

#### Scenario: Use the default Windows location
- **WHEN** an enabled bare-A1 instance first needs history with no data-directory override
- **THEN** its database and any journal sidecars SHALL live under `%LOCALAPPDATA%/a1/history`
- **AND** no history database SHALL be created under `~/.a1/agent`, `~/.a1/cache`, the repository, or the release payload
- **AND** prompt content SHALL NOT be written into `control.sqlite3`

#### Scenario: Override the application-data root
- **WHEN** A1 starts with `A1_DATA_DIR` set to an isolated directory
- **THEN** all history database and sidecar access SHALL use that directory's `history` child
- **AND** it SHALL NOT read, copy, or mutate history at the default root

#### Scenario: Reuse a profile across projects and launches
- **WHEN** two bare-A1 processes use the same effective profile and data root from different projects or release checkouts
- **THEN** they SHALL address the same durable history without grouping recall by project or prioritizing the current session over committed recency

#### Scenario: Keep overridden profiles separate
- **WHEN** two different effective A1 profile roots share one data directory
- **THEN** each SHALL read and modify only its own history
- **AND** matching prompt text or session labels SHALL NOT merge the profiles

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
A1 SHALL preserve committed history across ordinary restart and transactional crash recovery. A hard termination before asynchronous commit is not guaranteed to preserve pending candidates. Graceful shutdown SHALL attempt a bounded flush without trapping exit. Read, write, corruption, schema, and permission failures SHALL degrade only durable recall, preserve current-session functionality, and report sanitized bounded failures without exposing prompt content. Corrupt or newer-schema databases SHALL NOT be silently erased, overwritten, or downgraded.

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

#### Scenario: Open an unsupported or damaged store
- **WHEN** the history database is corrupt, identifies another profile, or has a newer unsupported schema
- **THEN** A1 SHALL preserve its files, report the bounded failure, and continue with current-session recall
- **AND** it SHALL NOT retry uncertain submissions automatically after losing the storage worker

### Requirement: History is private durable state rather than disposable cache
A1 SHALL protect history files and sidecars with owner-restrictive access where supported and SHALL never include their contents in logs, crash records, or validation evidence. Documentation SHALL identify history as unencrypted potentially sensitive user text, explain retention and next-start opt-out, and describe removal only after all instances using that profile have stopped. Disabling persistence SHALL leave existing records intact. Release rollback, cache cleanup, and conversation deletion SHALL NOT implicitly clear history. No legacy import SHALL occur without a separately declared explicit operation.

#### Scenario: Clean caches or upgrade A1
- **WHEN** cache/dependency/release cleanup, an upgrade, or release rollback runs
- **THEN** the history directory SHALL remain outside those cleanup targets

#### Scenario: Inspect diagnostics after a storage failure
- **WHEN** a storage operation fails on a prompt containing sensitive text
- **THEN** logs and visible failure diagnostics SHALL contain only bounded classified failure information, not prompt text, SQL values, arbitrary exception payloads, or private provenance

#### Scenario: Existing prototype history is present
- **WHEN** A1 starts on a machine containing v2, Pi, or Claude history
- **THEN** it SHALL neither read nor import nor modify those histories automatically
