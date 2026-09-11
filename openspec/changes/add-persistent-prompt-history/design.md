## Context

See `proposal.md` for motivation and scope. The user explicitly selected SQLite under A1's existing application-data root, not `agent/`, `cache/`, or a new home-directory state root.

Source observations informing this design:

- `D:/Backups/pi/v2/history/index.ts` writes one JSON file per prompt and rereads/compacts the directory. Its settings file selects 100 entries; its code fallback is 10. Recall is global across working directories, deduplicates trimmed text, preserves the draft, and defers new snapshots while browsing. `core/editor/history-indicator.ts` numbers the newest entry as `total` and the oldest as 1. `history/cursor.test.ts` independently specifies older-to-end/newer-to-start caret behavior.
- `D:/Git/claude-code-source/src/history.ts` instead uses a locked append-only JSONL file, reverse reads, and a recent 100-entry project-filtered window with current-session priority. `utils/pasteStore.ts` separately retains large pasted text. These are useful persistence references, not the desired A1 UX or source to vendor.
- `src/integrations/pi/session-ui/session-shell.ts` already distinguishes displayed input from prepared prompt text and has multiple history insertions, including submission recovery. `session-shell-root.ts` also seeds history from the loaded transcript. Hooking every `addToHistory` call would incorrectly persist replay/recovery as new submissions.
- `src/foundation/lifecycle/paths.ts` already resolves `dataDir`, including `A1_DATA_DIR`, `%LOCALAPPDATA%/a1` on Windows, and `$XDG_DATA_HOME/a1` or `~/.local/share/a1` on current Unix paths. `ControlStore` uses `node:sqlite` but owns control metadata, not prompt retention.
- The resource/data policy currently forbids arbitrary structured-payload persistence without a typed retention policy. This feature supplies only a narrow user-input recall policy; it does not authorize storing terminal content, engine messages, or credentials elsewhere.

## Goals / Non-Goals

**Goals:**

- Keep durable storage, submission provenance, editor interaction, and presentation as distinct responsibilities.
- Make concurrent sessions converge on one bounded recent-history store without blocking terminal input or moving the entry currently being edited.
- Preserve full reusable user text independently of process-local paste IDs and provider/template expansion.
- Keep storage faults isolated from prompt execution, startup, release lifecycle, and the Pi comparison.

**Non-Goals:**

- This is not session recovery, a conversation archive, an audit log, or model memory.
- No scanning all transcript files, implicit legacy import, cloud synchronization, project filter UI, search index, persistent image attachments, new daemon, or catch-all application database.
- No automatic preservation across a moved/renamed profile root; an explicit future migration can support that case.
- No encryption-at-rest implementation or promise that text submitted by the user cannot contain secrets.

## Decisions

### 1. Store data outside editable agent resources

Resolve the existing product `dataDir` once in composition and supply it to the history owner. The store path is:

```text
<dataDir>/history/<profile-id>.sqlite3
```

SQLite's `-wal` and `-shm` sidecars, when present, live alongside it. Never derive this location from the current repository, release identity, process/session ID, control-database override, or cache root. Cache/dependency/release cleanup must exclude the entire history directory.

Derive `<profile-id>` as `a1-` plus the full SHA-256 hex digest of a versioned identity tuple containing the launch kind and normalized absolute effective agent-profile root. Normalize separators, trailing separators, and ordinary Windows case variants consistently; do not include cwd, selected model, timestamps, or release version. Use the effective profile path actually supplied to the engine, including supported home overrides, not a separately recomputed home. Store the profile key and schema identity in database metadata and reject a mismatch. Document that unresolved symlink aliases can create separate histories rather than attempting to merge them silently.

This yields stable reuse across checkouts, projects, new sessions, and upgrades while separating different profiles under one `A1_DATA_DIR`. Changing `A1_DATA_DIR` selects another store without copying the old one. A default filename such as `a1.sqlite3` was rejected because two overridden profiles could otherwise share private prompts.

An AppData root follows existing product policy. `~/.a1/state` would also be coherent, but would introduce another durable-data resolver; `agent/` mixes ownership, and `cache/` implies eviction safety. None is needed.

### 2. Give the feature one owner and inject a neutral port

Create a focused `src/features/prompt-history/` owner with public entry, tests, profile-key/path policy, history service, and worker/store implementation. Do not expand the control-storage owner or create a generic database abstraction for a single consumer.

The neutral history submission/snapshot/status port belongs in the existing owned-UI contracts owner. Composition wires the feature into the Pi session UI only for bare A1 with persistence enabled. Pi integration interprets user input, prompt chips, and vendor session identity and sends already-classified values through that port. It neither chooses storage paths nor imports the feature's private store. The editor adapter handles vendor-specific navigation via explicit owned, typed operations, not reflection on private Pi members or global decorator patches.

```text
resolved A1 paths/settings
          |
          v
     composition ------> prompt-history feature ------> SQLite worker
          |                        |
          v                        | snapshots / bounded status
     session shell <---------------+
          |
          v
     history controller --> editor state --> semantic border renderer
```

Keep browsing latches, revisions, draft state, and refresh coordination in a focused controller, not the shell render root. Use an explicit semantic border slot/property for the history indicator rather than recognizing and replacing rendered border strings. Keep the currently accepted input/editor pipeline as the sole terminal authority.

### 3. Retain reusable user input, not engine output

Capture exactly once at the semantic point where a non-empty user submission becomes local recall input, before long-running provider completion. Record failed provider requests too: this is input recall, not a delivery-success ledger. If validation fails before preparation, preserve existing in-memory recovery but do not persist an incomplete candidate.

Eligible sources are ordinary interactive prompts, steering, follow-ups (including compaction queues), nonempty `!`/`!!` user commands, and user-entered skill/template/extension slash inputs that enter the prompt route. Built-in workflow/owned-app commands that currently bypass history remain excluded. Programmatically generated extension prompts, initial automation, tool calls, assistant messages, and suggestions not explicitly submitted by the user are not durable recall entries. Queue drain, retry, transcript load, resume/fork, and recovery callbacks never count as a new user submission. A user explicitly submitting the same text later does refresh recency.

The Pi adapter constructs a canonical recall text before template or extension transformation: trim outer whitespace as v2 does, preserve internal whitespace/newlines/Unicode, expand text-paste chips to their actual user text, preserve literal commands, and omit image-chip tokens using their semantic identity. Never remove placeholder-looking user text through a regex. Empty/image-only candidates are not persisted. Image-bearing prompts retain their text only, without implying reattachment; current-process image recovery remains owned by the existing input pipeline. Long text can be represented by freshly reconstructed text chips on recall, using the existing editor paste presentation rather than reviving stale IDs.

Store canonical text once, with last-submission UUID, timestamp, cwd, session ID, input kind, byte length, and an increasing database recency sequence. Do not duplicate raw text and transformed agent prompt, store credentials/environment, copy session files, retain image bytes, or add a second paste-cache dependency. Optional provenance fields are individually bounded; missing or overlong optional provenance can be omitted without truncating prompt text. Deduplication uses exact canonical text (binary comparison); no case folding or internal whitespace normalization.

### 4. Use bounded SQLite transactions rather than a custom append-log protocol

Use built-in `node:sqlite` in a dedicated worker thread, a versioned independent schema identity, WAL journaling, and FULL synchronous commit semantics. Start with one metadata row (schema/profile identity, current recency sequence, active retention limit) and one bounded unique-text history table. The sequence is the sort authority; timestamps are for provenance only, so clock skew cannot reorder committed entries. Uniqueness must verify the full text; a hash alone must not equate distinct prompts.

Within a short `BEGIN IMMEDIATE` transaction, allocate the next recency sequence, upsert the candidate, remove least-recent entries beyond the active count/byte budgets, and commit. Atomicity prevents one process's stale cleanup snapshot from deleting another process's newly written data. Readers take short materialized snapshots ordered by sequence descending and release the transaction immediately; there is no reader held while the user browses.

The newest successfully initialized process applies the current configured retention limit transactionally. Existing processes use the limit stored in the database for subsequent writes rather than reasserting their startup copy. Raising a limit cannot recover pruned rows. Older browsing snapshots can remain stable until browsing ends. Settings are not stored authoritatively in SQLite: A1's settings document remains the source; the metadata value coordinates writers after the declared next-start application boundary.

Initial resource policy:

| Resource | Bound / action |
|---|---|
| Unique retained entries | Configured 10-100, default 100 |
| Canonical prompt text | 1 MiB UTF-8 per entry; skip durable capture, never silently truncate |
| Retained canonical text | 8 MiB per profile; prune oldest first even below the count limit |
| Queued writes, including in flight | 32 candidates and 8 MiB of text per process; reject new durable enqueue on overflow, keep local recall |
| Optional provenance | 8 KiB cwd, 256-byte session identity; omit invalid/overlong optional fields |
| Lock contention | Short worker-side waits and asynchronous retry of definitely uncommitted work, at most 1 second per operation |
| Graceful close | Drain queued writes and close the worker within 2 seconds; report an incomplete flush without trapping exit |
| Cross-process refresh | At most one read in flight and one coalesced pending refresh; background poll no more frequently than once per second |

These bounds apply separately from the existing editor's own input limits. Materialized durable snapshots are at most 8 MiB; local pending entries are merged under a finite window. SQLite overhead and transient journal bytes are not falsely advertised as part of the 8 MiB text budget: configure bounded WAL checkpointing, reuse freed pages, cap database growth conservatively, and verify a 64 MiB database/WAL maintenance threshold under workload. If the threshold cannot be restored without blocking or data loss, degrade persistence and report a bounded storage condition instead of permitting unbounded growth or deleting the database. Do not run `VACUUM` on every prompt or keep long-lived read transactions.

Retry only errors proving the transaction did not commit, such as lock acquisition failure. If a worker dies or commit outcome is ambiguous, do not replay its outstanding submissions automatically; local recall still contains them. A session-level submission identity and enqueue guard prevent multiple controller callbacks from inserting the same submission. This is not a permanent receipt ledger.

Alternative: JSONL is entirely adequate for a small single-writer list and is human-readable, but concurrent append/compaction would need an application lock protocol, atomic rewrite/recovery rules, and custom query/retention logic. The user preferred SQLite; existing runtime support avoids a new native dependency or ORM. Per-message files reproduce v2's directory scanning and concurrent cleanup problems.

### 5. Preserve v2 interaction through immutable browsing snapshots

Seed local current-conversation history through its existing read-only path, then merge the asynchronously loaded durable snapshot without persisting or promoting transcript entries. Merge order is current-process submissions not yet reflected by a durable commit, durable records in database recency order, then current-conversation fallback entries absent from both, deduplicated and capped. A successful write acknowledgment replaces the provisional local ordering with committed recency. Local recovery-only entries remain available in memory but are never mistaken for new durable submissions.

Use the configured recall count while persistence is enabled; byte-limited durable storage can yield fewer saved entries. With persistence disabled, keep existing current-session recall behavior rather than loading saved data. No current-session-first grouping or project filtering is borrowed from Claude Code.

Entering browse mode freezes the selected snapshot and captures the draft. Up toward older entries places the caret at the end of the recalled text; Down toward newer entries places it at the beginning. Returning to draft delegates normal draft restoration. Keep pinned navigation boundaries, multiline movement outside them, autocomplete priority, selection, undo, keybindings, and suggestion invalidation. Recalled text is real draft text and is never submitted automatically.

Show `History position/total` in the editor's existing top border, with `position = total - newestFirstIndex`. Newest is `total/total`; oldest is `1/total`. Preserve the v2 overflow suffix when applicable, theme border role, and width clipping. Hide the indicator outside browsing. This must work with A1's prompt prefix and current editor layout without increasing dock height.

A replacement editor receives the latest completed snapshot regardless of whether construction or initial loading wins the race. Async updates during browsing are coalesced and applied only after returning to draft; reads completing after disposal or a profile/session-generation change are ignored. A timer can prefetch committed changes without file watching SQLite sidecars. A new browse cycle requests a refresh but never blocks the first key on I/O; a newer snapshot becomes available at a safe boundary, never mid-browse.

### 6. Make persistence optional and failures honest

Add A1 settings `promptHistoryEnabled` (boolean, default true) and `promptHistoryMaxItems` (10 through 100 in steps of 10, default 100), grouped under History with next-start application. Do not write Pi settings or invent a separate history settings file. A disabled process does not create/open/read/write/poll a history database, and a comparison launch does not initialize the feature at all. Disabling is not deletion and does not remotely stop already-running enabled instances; the setting's description and documentation must say so. Removing retained data initially requires stopping every instance using the profile and deleting only its database and sidecars; no live SQLite file deletion is supported.

History is potentially sensitive user content. Create owned directories/files with restrictive permissions where supported, respect Windows account ACLs, and protect sidecars too. The database is not encrypted; permissions do not justify logging payloads. Bound and sanitize status by known error category, never arbitrary SQL/worker exception text or prompt/cwd/session content. Report a persistence failure once per episode through existing failure presentation; no success spinner, standing history status, or repeated per-prompt warning.

Open/migration/read/write failures fall back to local recall and never suppress prompt dispatch. Unsupported/newer schemas or corrupt databases are preserved rather than silently recreated, downgraded, or quarantined by rename while other processes could still use them. Retry transient contention within the bound; a persistent fault disables the store for that process until a fresh launch. Maintain current-session functionality even if the history worker cannot start.

Graceful shutdown drains accepted queued writes up to its deadline. A committed transaction survives restart; a hard kill before asynchronous commit may lose the newest queued entries. Do not claim stronger durability than that. Cancellation of an agent turn does not undo the user's submission-history entry. Cache clearing, release garbage collection, and deleting a conversation do not clear durable recall.

## Risks / Trade-offs

- [Private content remains beyond a conversation] -> Explain retention/location and plaintext storage, provide next-start opt-out, document closed-instance removal, exclude all payloads from logs and evidence.
- [Asynchronous writes can lose the newest prompt on hard termination] -> Commit promptly off-thread and drain on graceful exit; explicitly distinguish committed and queued durability.
- [Many windows contend on one database] -> Short transactions, bounded worker-side busy handling, materialized snapshots, and real multi-process tests; no UI-thread waiting.
- [Different launches apply different retention settings] -> A newly initialized store applies the saved next-start limit once; all writers use that database limit, and active browsing retains its snapshot until exit.
- [Large pastes exhaust memory or disk despite a small count] -> Enforce byte, queue, snapshot, and database/WAL thresholds and skip rather than truncate a reusable prompt.
- [Profile aliases or relocation select another history] -> Use a documented stable path-derived profile identity; no implicit cross-profile migration.
- [Editor history hooks include replay and recovery] -> Capture once at classified user-submission points; independently test replay, queue drains, failures, and unsubmitted suggestions.
- [The prototype patched editor internals] -> Transfer behavior into owned typed seams and semantic presentation, not global patches, reflection, or rendered-string replacement.
- [Mixed releases access one durable schema] -> Version/identity checks, transactional migrations, concurrent-open tests, and preserve-newer-schema fallback.

## Migration Plan

1. Integrate this plan before implementation. Add the feature owner and neutral contract, declarations, and documentation/governance for the narrowly typed retention policy in the separate implementation stream.
2. Create schema version 1 lazily in the selected application-data root only for enabled bare-A1 runtime use. Test concurrent first creation and migration before enabling it by default.
3. Do not inspect or import v2, `.pi`, Claude, or existing session history on disk. Existing loaded-transcript seeding remains in-memory only.
4. Ship with default-enabled persistence and 100 entries as declared. Verify the isolated-profile and application-data override paths on Windows and supported Unix environments.
5. Rollback by disabling the setting for future launches or reverting to a release without this feature. Leave database files intact; never make release rollback depend on erasing history. Future schema upgrades require explicit ordered migrations, and older readers must decline unsupported schemas without rewriting them.
