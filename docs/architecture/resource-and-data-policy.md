# Resource and data policy

This policy bounds what one A1 process may queue, retain, or persist, and prevents accidental persistence of credentials or terminal content. A1 runs one agent per directly attached process; it keeps no control store, workspace registry, or terminal model of its own.

## Resource budgets

Budgets are minimum defaults, not promises of capacity. An implementation may lower them per feature or platform, but may not silently remove a limit.

| Resource | Default budget | Required outcome on breach |
|---|---:|---|
| Diagnostic payload | 256 KiB | Redact, truncate, and retain enough evidence for the failed operation |
| Fatal-exit records | 10 records of 16 KiB each | Drop the oldest record; never retain prompt or input content |
| Evidence file | 16 MiB | Reject and request summarized evidence |
| Packaged release-note resource | 1 MiB total; 128 KiB per note | Reject the damaged resource and retain the note as unacknowledged |
| Release-note acknowledgement/claim | 4 KiB per profile; one claim; one-hour stale bound | Ignore malformed acknowledgement, recover stale claim, and never acknowledge implicitly |
| Session writer lock | one writer per session file; 10-second stale bound | Refuse a second writer and offer a fork; reclaim a stale lock after the bound |

Every asynchronous consumer must implement a finite queue or window. Backpressure must isolate the offending operation and must not block unrelated sessions or processes.

Stable release-note preparation generates Pi-style Markdown with a
`## [version] - YYYY-MM-DD` heading and applicable categorized `###` sections. Human
editing remains allowed. Approval normalizes and bounds the editable draft GitHub
Release body before hashing it; if that version/date heading remains, its version and
calendar date must be valid. Publication jobs consume only that immutable snapshot;
later draft edits cannot expand or replace the package candidate. The same per-note
and total catalog limits apply when the snapshot is combined with committed history.

## Data classification

| Class | Examples | Storage policy |
|---|---|---|
| Release and update state | Immutable release records, update transaction journal, retention timestamps | May persist in A1's data directory; never stores session content or credentials |
| Release-note state | Last acknowledged stable A1 version and opaque bounded claim token/time | May persist atomically in profile-isolated A1 configuration; never stores note text or Pi settings |
| Session worktree claims | Runtime and agent identity, process ID, canonical worktree path | May persist under A1 state; not terminal content |
| User-authored prompt recall | Canonical interactive input and bounded provenance | May persist only through the profile-isolated prompt-history policy below |
| Terminal content | Terminal bytes, scrollback, selection, rendered cells | Never persist in A1 state or diagnostics |
| Environment values | `PATH`, profile overrides, arbitrary launch environment | Do not persist; treat as potentially sensitive |
| Credentials and tokens | API keys, OAuth tokens, cookies, auth files, passwords | Never copy, log, or persist outside the owning agent/profile |
| Authentication state | Pi profile auth, provider sessions, platform keychains | Owned only by the selected agent/profile |
| Logs and diagnostics | Failure codes, bounded lifecycle evidence, sanitized status | May persist after classification and redaction |

Sanitization must classify before logging or storing. Unknown or untyped values are potentially sensitive by default and must not be persisted. Terminal bytes must never be written to logs as a debugging shortcut.

## Typed prompt-history retention

The `prompt-history` feature owns only reusable interactive user input, not
structured-message archives. It stores one independent profile database under
`<effective-home>/.a1/data/history`, or `<A1_DATA_DIR>/history` when explicitly
overridden, never agent resources or cache/release directories. The default home
follows launch-profile resolution, including `A1_PROFILE_HOME`; other product
data paths are unchanged. Text is unencrypted and potentially sensitive. Retain up to 100 unique entries (configured
10-100), at most 1 MiB per entry and 8 MiB total canonical text. Background queues
are limited to 32 writes/8 MiB per instance; reads are coalesced, lock retries are
bounded to one second off-thread, and graceful shutdown drains for at most two
seconds. SQLite page/journal limits and a 64 MiB maintenance threshold bound
physical growth separately from text retention.

Only typed canonical text, submission identity, recency/timestamp, input kind,
and bounded cwd/session provenance are allowed. No image bytes, transformed
agent prompts, environment/credential copies, tool results, terminal streams, or
private input in diagnostics are permitted. Disabling persistence is next-start
and does not erase data or stop other live instances. Upgrades, ordinary npm
uninstall/reinstall, and cache/release cleanup must not touch history. The new
default starts fresh without probing, importing, or deleting the old platform
store. Any old-store removal is a separate manual operation after its users have
stopped, not startup or cleanup behavior. See [prompt history](../features/prompt-history.md) for
retention, failure semantics, profile identity, and stopped-instance removal.

## Required architectural outcomes

- Agent semantics must not be inferred from ANSI text, terminal timing, or visual content.
- No module may own a pseudoterminal, emulate a terminal, or relay terminal bytes between the user's terminal and the UI.
- `a1 pi` uses the same directly attached pipeline with A1 surfaces withheld and never persists A1-owned state into the Pi profile.
- Persisted records store identity and bounded references, not terminal streams, authentication material, or arbitrary environment values.
- Test automation must not launch, focus, drive, resize, or close terminal applications on an active workstation.

The executable repository policy tests cover these invariants alongside the architecture checker.
