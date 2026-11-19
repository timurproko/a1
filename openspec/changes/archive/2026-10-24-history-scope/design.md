## Context

`promptHistoryEnabled` and `promptHistoryMaxItems` already live in the History section and apply on restart. `resolvePromptHistoryPath(dataDir, profileRoot)` currently derives one database and image-sidecar directory from the normalized profile identity. Composition constructs one service and sidecar per agent runtime; submitted prompts already include a session ID, but storage is not partitioned by it. The current profile-wide SQLite path and schema are established user data and must remain readable in Shared mode.

## Goals / Non-Goals

**Goals:** Default new and existing installations without an explicit scope choice to Unique. Isolate distinct agent session IDs across processes and tabs while preserving recall across restart/resume of the same ID. Keep Shared byte-for-byte compatible with the existing profile-wide path and sidecar location. Keep session-local navigation/transcript fallback and history limits intact.

**Non-Goals:** Migrate existing profile-wide history into Unique, merge unique stores when switching to Shared, delete data on scope change, expose the setting to Pi, change the SQLite schema, or retroactively move already-submitted writes.

## Decisions

### 1. Use a declared, live A1 scope setting

Add `promptHistoryScope` with `unique` and `shared` allowed values and `unique` default. Use the existing owned global settings persistence and History section controls. The persisted non-default `shared` choice retains previous behavior; invalid stored values fall back to Unique. Use the existing live settings propagation to switch all running bare-A1 agents in the profile, including other solo processes and resident tabs, while leaving persistence enablement and history limit restart-applied. Explain that changing scope changes the selected view without transferring entries. An existing profile with no scope value changes effective behavior to Unique; its old shared database remains untouched and becomes visible if Shared is selected.

### 2. Select storage by stable agent session identity

Keep the current profile-root hashing and shared path exactly as is. For Unique, derive a domain-separated, filesystem-safe database/profile identity from the normalized profile root and the stable agent session ID; choose matching per-session image sidecars. Retain the same history data root and profile separation. Do not use PID, tab position, cwd, release path, or a freshly generated value on every restart. Confirm that a resumed session retains its ID and that a fork/new tab receives another before wiring; fail closed rather than silently dropping to the shared path if identity is unavailable or malformed. The worker's profile identity must match its selected database without changing SQLite's schema or the Shared identity.

### 3. Apply scope consistently to reads, writes, and attachments

Composition and the worker must resolve the same selected location, including image sidecars, with no cross-scope reads or implicit fallback. Existing history-limit and failure contracts remain per selected store. A running agent observes scope changes in its own Settings screen and from the shared-settings file watcher. It swaps the history controller, worker store, and image sidecar as one view; closes the previous controller without reassigning its pending writes. Submissions already captured stay on their original controller, while submissions after the switch use the new one. Preserve the editor's unsent draft and browsing reset semantics when the visible store changes. If the durable session ID is unavailable in Unique mode, fall back to transcript-local recall rather than Shared. Disabled persistence remains a next-start boundary. Disabled persistence and `a1 pi` access neither store. Session-local recall and seeded conversation prompts remain available independently of durable scope.

## Risks / Trade-offs

- Existing users see empty *durable* history after the default changes to Unique until they submit prompts in a session or select Shared; preserve the old database and state this clearly in the setting documentation.
- Unique creates more small databases/sidecar directories over time; do not add implicit garbage collection in this scope, because it could destroy resumable history.
- Session IDs and tab recovery can differ by launch path; cover solo, resident, resume, fork, and concurrent sessions before implementation signoff.
- Settings propagation between processes can lag; each agent uses its last applied scope for a submission, and switches on the next accepted settings notification. Never route a pending submission to a different store or share a sidecar across scopes.

## Implementation review

The implementation uses the pinned Pi session manager's durable session ID, not the adapter's process-local session ID. The owned shell replaces its history controller and image sidecar when a different conversation binds, retains them on a same-ID rebind, and uses transcript-only fallback if a durable ID is unavailable. The live scope refinement re-selects the store and sidecar on local changes or shared-file notifications, restores an unsent draft before leaving an active recall browse, and keeps each already-submitted write on its original controller. Solo processes now watch the shared settings document as resident tabs already do. Focused shell, settings, editor, and real SQLite composition tests cover switching in both directions and cross-process propagation. Focused path, shell-rebind, and sidecar tests also retain the original isolation guarantees. Interactive review exposed one development-only gap: separate solo launches isolated all data, including the intended Shared history root. The launcher now provides a stable checkout-wide history root without sharing control state, with path tests for independent solo instances, rebuilds, and explicit overrides. No approved-scope gaps are known; optional interactive review does not gate implementation completion.

## Migration Plan

No migration. Shared continues to address exactly the former profile database; Unique creates its per-session store on demand. Returning to Shared restores access to existing shared entries without copying them; returning to a previously used session in Unique restores only that session's entries. Rollback to a version without this setting still sees the untouched shared database.
