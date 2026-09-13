## MODIFIED Requirements

### Requirement: Recalled text is reusable without the originating process
The durable recall value SHALL be the user-authored text before template or extension expansion, with outer whitespace trimmed and internal text preserved. Text-paste, URL, file, folder, and Houdini chip contents SHALL be persisted inline as their resolved value so recall remains reusable without a process-local chip cache. Authored image chip tags SHALL be persisted verbatim; their raw payloads SHALL be persisted in a per-profile image sidecar so recall can rehydrate them into live chips. Template and extension expansions, transformed engine prompts, credential stores, arbitrary environment values, and terminal content SHALL NOT be copied into history.

On recall, the durable value SHALL be rendered through the same semantic chip owner that classifies fresh clipboard content, so that stored patterns become atomic chips again in the editor. Re-rendering SHALL cover text-paste chips (by the same length threshold used at paste time), URL chips, existing-path file and folder chips, Houdini-path chips, and image chips whose tag identifiers match a readable sidecar. Chip identity, `[paste #N]` numbering, and pending-paste registrations MAY be freshly allocated per recall and MUST NOT depend on identifiers from the originating process.

An image chip whose sidecar is missing, unreadable, or malformed SHALL be silently stripped from the recalled text, without a placeholder, notice, or degraded chip. No other rehydration failure mode SHALL block recall or submission.

#### Scenario: Recall a pasted multiline prompt after restart
- **WHEN** the user submits a prompt containing a text-paste chip and starts a fresh process
- **THEN** recall SHALL restore its actual text content with internal whitespace, line breaks, and Unicode intact
- **AND** the recalled text SHALL render as an atomic text-paste chip in the editor whenever the same length threshold used at paste time applies
- **AND** its reusable value SHALL NOT depend on the old chip ID or a process-local paste cache

#### Scenario: Recall a template invocation
- **WHEN** a user submits a template or skill invocation that expands before reaching the agent
- **THEN** recall SHALL restore the user's invocation rather than the expanded system or agent prompt

#### Scenario: Recall text from an image-bearing prompt
- **WHEN** a submitted prompt contains user text and an image chip
- **THEN** persistent recall SHALL retain the authored image chip tag verbatim in the recalled text
- **AND** the editor SHALL render that tag as an atomic image chip whose payload is read from the per-profile image sidecar
- **AND** resubmitting the recalled prompt without editing the chip SHALL deliver the same text and the same image attachment the original submission delivered
- **AND** literal placeholder-looking text authored by the user SHALL remain unchanged

#### Scenario: Recall a URL, file, or folder chip
- **WHEN** a submitted prompt contains a URL, existing file, or existing folder chip and the recall value contains its resolved value
- **THEN** the editor SHALL render an atomic chip of the same kind at that location
- **AND** if the referenced file or folder no longer exists on disk, the recall value SHALL render as its literal path text without a chip

#### Scenario: Recall a Houdini-path chip
- **WHEN** a submitted prompt contains a Houdini-path chip
- **THEN** the recall value SHALL contain the resolved Houdini path
- **AND** the editor SHALL render it as an atomic Houdini chip on recall

#### Scenario: Recall an image chip whose sidecar is unavailable
- **WHEN** an image sidecar is missing, unreadable, truncated, or fails hash validation on recall
- **THEN** the editor SHALL silently strip that image chip tag from the recalled text
- **AND** no notice, placeholder, warning, dead chip, or reattach hint SHALL be shown
- **AND** other chips and surrounding text in the same recall value SHALL remain intact

#### Scenario: Submit an image-only prompt
- **WHEN** removing semantic image attachments leaves no nonempty recall text
- **THEN** the submission SHALL NOT create an empty or unresolved-placeholder durable entry
- **AND** the original image submission behavior SHALL remain unchanged

### Requirement: Unique recent history has atomic bounded retention
Durable recall SHALL retain the most recently committed unique canonical texts, newest first, with a default count of 100 and the configured count limit applied. A repeated explicit submission SHALL refresh that text's recency instead of creating another visible entry. Distinct text SHALL NOT be conflated by case folding, internal-whitespace normalization, or a hash collision. Concurrent updates and pruning SHALL be atomic and ordered independently of wall-clock skew.

Durable text SHALL be limited to 1 MiB UTF-8 per entry and 8 MiB per profile in addition to the entry count. Oldest records SHALL be pruned when either retained budget is exceeded. Oversized text SHALL be omitted from persistence rather than silently truncated, without preventing submission or existing local recovery. Background work and physical database/journal growth SHALL have finite documented limits and bounded failure behavior.

Image chip sidecars SHALL follow the retention of their referencing entries. When a history row is pruned, its referenced image sidecars SHALL be removed atomically with that pruning. When any history opener runs, sidecars whose identifiers do not appear in any surviving row SHALL be swept in one bounded pass. No independent count budget, byte budget, or age policy SHALL apply to image sidecars; their lifetime SHALL be transitively determined by history retention.

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

#### Scenario: Prune a row that references image sidecars
- **WHEN** retention removes a history row whose text contains one or more image chip tags
- **THEN** the corresponding sidecar files SHALL be removed as part of the same pruning operation
- **AND** sidecars whose identifiers still appear in another surviving row SHALL be retained

#### Scenario: Sweep orphaned sidecars at store open
- **WHEN** a history opener starts on a profile whose sidecar directory contains files whose identifiers do not appear in any surviving row
- **THEN** those sidecars SHALL be deleted in one bounded pass during startup
- **AND** the sweep SHALL NOT block terminal readiness, typing, rendering, or prompt dispatch

### Requirement: Persistence failures and shutdown preserve honest durability
A1 SHALL preserve committed history across ordinary restart and transactional crash recovery. A hard termination before asynchronous commit is not guaranteed to preserve pending candidates. Graceful shutdown SHALL attempt a bounded flush without trapping exit. Read, write, corruption, schema, and permission failures SHALL degrade only durable recall, preserve current-session functionality, and report sanitized bounded failures without exposing prompt content. Corrupt or newer-schema databases SHALL NOT be silently erased, overwritten, or downgraded.

Image sidecar failures SHALL degrade only image rehydration for the affected chips, without blocking history recall, prompt dispatch, or unrelated chip rendering. A sidecar write failure at submit time SHALL NOT prevent the history row from being committed with its authored text; only the affected image chip SHALL fail to rehydrate on later recall. A sidecar read failure at recall time SHALL be handled as the missing-sidecar case defined in the recall requirement.

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

#### Scenario: Image sidecar write fails at submit
- **WHEN** an image sidecar cannot be written at submit time
- **THEN** the history row SHALL still commit with its authored image chip tag intact
- **AND** later recall of that row SHALL treat the sidecar as missing per the recall requirement
- **AND** a sanitized bounded failure MAY be reported without exposing chip identifiers or image bytes

### Requirement: History is private durable state rather than disposable cache
A1 SHALL protect history files and sidecars with owner-restrictive access where supported and SHALL never include their contents in logs, crash records, or validation evidence. Documentation SHALL identify history as unencrypted potentially sensitive user text and image bytes, explain retention and next-start opt-out, and describe removal only after all instances using that profile have stopped. Disabling persistence SHALL leave existing records intact. Release rollback, cache cleanup, and conversation deletion SHALL NOT implicitly clear history. No legacy import SHALL occur without a separately declared explicit operation.

The per-profile image sidecar directory SHALL live inside the same history directory as the SQLite database, inherit the same owner-restrictive access posture where supported, and be excluded from the same cleanup targets. Its files SHALL be treated as history data, not cache. Sidecar contents SHALL never appear in logs, crash records, or validation evidence.

#### Scenario: Clean caches or upgrade A1
- **WHEN** cache/dependency/release cleanup, an upgrade, or release rollback runs
- **THEN** the history directory, including the image sidecar directory, SHALL remain outside those cleanup targets

#### Scenario: Inspect diagnostics after a storage failure
- **WHEN** a storage operation fails on a prompt containing sensitive text or an image sidecar
- **THEN** logs and visible failure diagnostics SHALL contain only bounded classified failure information, not prompt text, chip identifiers, image bytes, SQL values, arbitrary exception payloads, or private provenance

#### Scenario: Existing prototype history is present
- **WHEN** A1 starts on a machine containing v2, Pi, or Claude history
- **THEN** it SHALL neither read nor import nor modify those histories automatically
