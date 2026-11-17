## ADDED Requirements

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
