## Context

`promptHistoryEnabled` and `promptHistoryMaxItems` already live in the History section and apply on restart. `resolvePromptHistoryPath(dataDir, profileRoot)` currently derives one database and image-sidecar directory from the normalized profile identity. Composition constructs one service and sidecar per agent runtime; submitted prompts already include a session ID, but storage is not partitioned by it. The current profile-wide SQLite path and schema are established user data and must remain readable in Shared mode.

## Goals / Non-Goals

**Goals:** Default new and existing installations without an explicit scope choice to Unique. Isolate distinct agent session IDs across processes and tabs while preserving recall across restart/resume of the same ID. Keep Shared byte-for-byte compatible with the existing profile-wide path and sidecar location. Keep session-local navigation/transcript fallback and history limits intact.

**Non-Goals:** Migrate existing profile-wide history into Unique, merge unique stores when switching to Shared, delete data on scope change, expose the setting to Pi, change the SQLite schema, or make a scope edit alter running agents.

## Decisions

### 1. Use a declared, restart-applied A1 setting

Add `promptHistoryScope` with `unique` and `shared` allowed values and `unique` default. Use the existing owned global settings persistence and History section controls. The persisted non-default `shared` choice retains previous behavior; invalid stored values fall back to Unique. Explain next-start behavior and that changing scope does not transfer entries. An existing profile with no scope value changes effective behavior to Unique; its old shared database remains untouched and becomes visible if Shared is selected.

### 2. Select storage by stable agent session identity

Keep the current profile-root hashing and shared path exactly as is. For Unique, derive a domain-separated, filesystem-safe database/profile identity from the normalized profile root and the stable agent session ID; choose matching per-session image sidecars. Retain the same history data root and profile separation. Do not use PID, tab position, cwd, release path, or a freshly generated value on every restart. Confirm that a resumed session retains its ID and that a fork/new tab receives another before wiring; fail closed rather than silently dropping to the shared path if identity is unavailable or malformed. The worker's profile identity must match its selected database without changing SQLite's schema or the Shared identity.

### 3. Apply scope consistently to reads, writes, and attachments

Composition and the worker must resolve the same selected location, including image sidecars, with no cross-scope reads or implicit fallback. Existing history-limit and failure contracts remain per selected store. A running agent holds its startup scope if Settings is changed elsewhere; only the next agent start uses the saved choice. Disabled persistence and `a1 pi` access neither store. Session-local recall and seeded conversation prompts remain available independently of durable scope.

## Risks / Trade-offs

- Existing users see empty *durable* history after the default changes to Unique until they submit prompts in a session or select Shared; preserve the old database and state this clearly in the setting documentation.
- Unique creates more small databases/sidecar directories over time; do not add implicit garbage collection in this scope, because it could destroy resumable history.
- Session IDs and tab recovery can differ by launch path; cover solo, resident, resume, fork, and concurrent sessions before implementation signoff.
- Scope changes while other agents run create a temporary mix of selected stores; restart boundaries and lack of automatic migration make this explicit, not a source of cross-scope reads.

## Migration Plan

No migration. Shared continues to address exactly the former profile database; Unique creates its per-session store on demand. Returning to Shared restores access to existing shared entries without copying them; returning to a previously used session in Unique restores only that session's entries. Rollback to a version without this setting still sees the untouched shared database.
