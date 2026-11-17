# integration-api Specification

## Purpose
TBD - created by archiving change unify-integration-api-and-colors. Update Purpose after archive.

## Requirements

### Requirement: One bounded versioned public integration boundary
A1 SHALL expose `a1 api <request-json>` with operation selection only in JSON, protocol version 1, bounded correlation IDs and correlated response envelopes. Every call SHALL emit exactly one bounded LF-terminated JSON response and a success/failure exit status. Unsupported versions, operations, settings, scopes, targets and values SHALL return stable structured error codes before mutation. Discovery SHALL NOT start an interactive session, trust prompt, Core probe, endpoint, Pi RPC child or resident process. Local transport and settings paths SHALL remain private.

#### Scenario: Discover without a live session
- **WHEN** a host invokes the capabilities operation
- **THEN** it receives only implemented operations, startup-color and native-identity support without initializing a live session

#### Scenario: Reject malformed requests
- **WHEN** a host supplies an unknown version, operation, scope, setting or invalid value
- **THEN** it receives a structured failure without changing settings or selecting an implicit session

### Requirement: Supported settings share application authority
The API SHALL expose only deliberately supported setting descriptors and read/update operations: profile Default color and exact-session Current color. Descriptors SHALL derive choices, labels, descriptions, section, scope and application metadata from application-owned definitions. Results SHALL distinguish stored and effective values, origin, and applied/stored/deferred disposition. Profile updates SHALL be atomic per-key assignments preserving unrelated concurrent changes and unknown fields; session writes SHALL remain serialized and acknowledged only after application. Engine-backed settings SHALL retain the existing neutral settings port and adapter authority.

#### Scenario: Keep profile and session changes isolated
- **WHEN** a host updates a selected profile's Default color and one exact runtime/session's Current color
- **THEN** the profile value controls future initialization while only that live session changes immediately
- **AND** the UI and API observe the same authoritative values

#### Scenario: Concurrent independent profile changes
- **WHEN** another writer changes unrelated properties while a profile color update is made
- **THEN** the locked per-key update preserves those properties rather than replacing a stale document snapshot

### Requirement: Consumer validates completion identity
Integration clients SHALL use literal argument arrays and validate version, correlation ID, response type, operation and exact target before acknowledging a write. A failed, malformed, mismatched, expired or unavailable response SHALL NOT authorize replay or success. Herdr SHALL package one reusable client through its supported plugin boundary while retaining color policy and membership checks in its color feature. Native identity SHALL be the only supported discovery binding.

#### Scenario: Mismatched acknowledgement
- **WHEN** a reply has the wrong operation, correlation ID, version or target
- **THEN** the client refuses to acknowledge the update and performs no fallback write

#### Scenario: Coordinated breaking rollout
- **WHEN** the consumer encounters an installation or old runtime without the protocol
- **THEN** it skips unavailable control without restarting agents, changing labels, discovering private endpoints or using retired color commands

### Requirement: Exact live sessions report exit readiness

The version-1 integration protocol SHALL expose a `session.lifecycle` operation for an exact `session` target. The owning runtime SHALL answer with its current lifecycle state, whether the editor is empty, the number of waiting submissions, the number of queued engine inputs, whether an overlay, dialog or selector is open, a computed `exitAdmissible` boolean and an ordered `blockers` list drawn from `session-busy`, `editor-not-empty`, `pending-input`, `overlay-open` and `session-stopping`. The snapshot SHALL be read-only: it SHALL NOT clear drafts or queued input, dismiss overlays, interrupt a turn or change any setting. Whitespace-only draft text SHALL count as a non-empty editor. Before the shell exists or after disposal the operation SHALL fail with `session-unavailable`. Capability discovery SHALL report `lifecycle: true` only when both lifecycle operations are implemented, and SHALL keep every existing operation and flag unchanged.

#### Scenario: Idle session with an empty editor
- **WHEN** a host requests `session.lifecycle` for an exact live session whose lifecycle is ready, editor is empty, nothing is waiting or queued and no overlay is open
- **THEN** the response SHALL report `exitAdmissible: true` with an empty `blockers` list
- **AND** no session state SHALL change

#### Scenario: Busy session with a draft and queued input
- **WHEN** a host requests `session.lifecycle` while a model turn runs, the editor holds text and a follow-up is queued
- **THEN** the response SHALL report `exitAdmissible: false` with `session-busy`, `editor-not-empty` and `pending-input` in that order
- **AND** the draft, queue and turn SHALL remain untouched

#### Scenario: Discovery stays additive
- **WHEN** a host invokes `capabilities` on an installation with these operations
- **THEN** it SHALL receive the existing operations and flags plus `session.lifecycle`, `session.exit` and `lifecycle: true`

### Requirement: Graceful exit is admitted atomically and acknowledged once

The protocol SHALL expose a `session.exit` operation for an exact `session` target. Inside the runtime's serialized request handler, with no asynchronous gap between the check and the admission, the runtime SHALL re-evaluate readiness and admit the exit only when no blocker is present. Admission SHALL run the same shutdown path as `/quit`, SHALL be acknowledged with `status: "admitted"` and `lifecycle: "stopping"` before shutdown proceeds far enough to close the transport, and SHALL happen at most once per session. A refused request SHALL return the first blocker as its error code and SHALL NOT clear drafts, discard queued input, dismiss overlays, interrupt a turn or terminate the process. A request arriving after admission SHALL fail with `session-stopping`. Requests on a disposed, stopped, replaced or mismatched target SHALL fail with the existing transport errors. This change SHALL provide no forced-exit option.

#### Scenario: Supervisor retires an idle worker
- **WHEN** a host requests `session.exit` for an exact live session that is ready with an empty editor and nothing pending
- **THEN** the response SHALL acknowledge `status: "admitted"` and `lifecycle: "stopping"`
- **AND** the session SHALL stop through the ordinary quit path as if the person had used `/quit`

#### Scenario: Refuse while anything would be lost
- **WHEN** a host requests `session.exit` while the editor holds text, a submission is waiting, input is queued, an overlay is open or a turn is running
- **THEN** the response SHALL fail with the corresponding blocker code
- **AND** the session SHALL remain exactly as it was

#### Scenario: Concurrent exit requests admit once
- **WHEN** two hosts request `session.exit` for the same admissible session at the same time
- **THEN** exactly one request SHALL be acknowledged as admitted
- **AND** the other SHALL fail with `session-stopping`

#### Scenario: Lost acknowledgement is not retried blindly
- **WHEN** a host's `session.exit` request times out or the connection closes before a response
- **THEN** the host SHALL treat the outcome as unknown and read `session.lifecycle` or its own host facts
- **AND** the runtime SHALL NOT apply the expired request to a later or replacement session

### Requirement: Exit acknowledgement is admission, not exit proof

Documentation and the acknowledgement shape SHALL state that an admitted exit means shutdown has started in the exact runtime, not that the process has exited, the terminal is free or any worktree is released. Supervisors SHALL verify exit through their own host facts, such as Herdr Core terminal state, before archiving, replacing or tearing down resources. The documented consumer flow SHALL use the native `a1.session` and `a1.runtime` labels as the exact target and a literal argument array for `a1 api`.

#### Scenario: Supervisor verifies exit independently
- **WHEN** Firstmate receives an admitted `session.exit` acknowledgement for a worker terminal
- **THEN** it SHALL wait for the terminal's program to exit according to Core before treating the worker as stopped
- **AND** a surviving program after the bounded wait SHALL be reported as unknown rather than stopped

### Requirement: Stale discovery records do not block live session control

A1 SHALL remove private control discovery records whose owning process is provably gone, both when a session starts its control endpoint and opportunistically while resolving a lookup, within bounded time and count budgets. It SHALL NOT remove records whose owner process exists, records it cannot parse, or records of unknown format. The `control-limit` refusal SHALL bound live candidate records and a much larger raw directory ceiling, so a machine with many abruptly ended sessions keeps a working API while a flooded directory still fails closed. Pruning SHALL NOT change identity, nonce, deadline or serialization checks and SHALL NOT select a session.

#### Scenario: Many abruptly ended sessions
- **WHEN** the discovery directory holds more than 256 records of dead processes and one live session is targeted
- **THEN** the lookup SHALL resolve the live session
- **AND** the dead records examined SHALL be removed

#### Scenario: Live and unreadable records are preserved
- **WHEN** a starting session sweeps the directory
- **THEN** records whose owner process exists and records that cannot be parsed SHALL remain

#### Scenario: Flooded directory still fails closed
- **WHEN** the directory holds more records than the raw ceiling, or more than 256 live candidates
- **THEN** the lookup SHALL fail with `control-limit` without selecting any session

### Requirement: Windows liveness probes do not mistake thread ids for live sessions

On Windows, A1 SHALL NOT treat a permission-refused signal probe as proof that a session-control record's owner process exists. It SHALL confirm such a pid against the live process table and SHALL report the record's owner dead when the pid is absent, so stale-record pruning and lookup bounds see only real processes. When the process table cannot be read, A1 SHALL keep the conservative answer and SHALL NOT invent a dead process. Unix semantics SHALL remain unchanged.

#### Scenario: A dead session's pid is reused by a thread
- **WHEN** a record's owner pid answers access denied but no process with that id is listed
- **THEN** the record SHALL be judged dead and become eligible for pruning

#### Scenario: A live process the caller cannot open
- **WHEN** a record's owner pid answers access denied and a process with that id is listed
- **THEN** the record SHALL remain a live candidate

#### Scenario: Process table unavailable
- **WHEN** the process table cannot be read
- **THEN** a permission-refused pid SHALL remain alive as before

### Requirement: Exact-session authoritative name snapshots

The version-1 `session.get` operation SHALL return the exact target, its authoritative `name` as a string or null, and a bounded opaque `nameRevision` string. The snapshot SHALL NOT expose session paths, transcripts, credentials or private transport records. Capability discovery SHALL add `session.rename` only when implemented and SHALL preserve existing operations and flags.

#### Scenario: Read one bound session name
- **WHEN** a client reads an exact active runtime/session
- **THEN** it receives that session's current durable name and revision
- **AND** no session state is changed

#### Scenario: Replaced target is unavailable
- **WHEN** the runtime no longer owns the requested session
- **THEN** name reads fail through the existing exact-target boundary without selecting a replacement

### Requirement: External manual renames use the session owner

The API SHALL expose `session.rename` with an exact session/runtime target, a `name` and mandatory `expectedNameRevision`. Names SHALL be trimmed, nonempty, single-line, at most 256 Unicode code points and within existing protocol byte limits. C0/C1 controls and Unicode line/paragraph separators SHALL be rejected. Rename SHALL compare the captured revision and apply through the same owning persistence and name-change notification authority as manual A1 naming. External edits SHALL have manual ownership and SHALL NOT be overwritten by automatic naming. The API SHALL acknowledge `status: "applied"`, canonical `name`, resulting `nameRevision` and exact `target` only after application. It SHALL NOT write transcripts directly or rename a profile, tab or space. Existing vanilla A1 → Herdr name reporting SHALL remain unchanged; API renames SHALL use its ordinary name-change notifications, not a second reporting or display path.

#### Scenario: Rename from an external host
- **WHEN** a valid rename has the current name revision for the exact active session
- **THEN** the durable session name changes and A1 UI/program reporting observe that same name
- **AND** the response acknowledges the applied name and resulting revision

#### Scenario: Refuse concurrent name overwrite
- **WHEN** a session name changes after the client's snapshot and before its rename
- **THEN** the rename fails with `name-conflict` without changing the newer name

#### Scenario: Same-name request is idempotent
- **WHEN** a rename supplies the already-current name and current revision
- **THEN** it acknowledges that name without appending a duplicate name entry

#### Scenario: Reject invalid names before mutation
- **WHEN** a name is empty, control-bearing, multiline or oversized
- **THEN** the API fails with `invalid-value` and preserves current naming state

#### Scenario: Acknowledgement is not available
- **WHEN** a rename times out or returns a malformed, mismatched or unavailable acknowledgement
- **THEN** the client treats completion as unknown or failed and may read authoritative state
- **AND** it does not replay the mutation automatically or apply it to a later session
