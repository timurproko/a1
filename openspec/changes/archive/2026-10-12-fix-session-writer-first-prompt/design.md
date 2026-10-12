## Context

Resident-tabs milestone 3 added a process-held native session-writer lease. For a new `SessionManager`, the coordinator reserves the canonical parent/name, creates an empty owner-only file, binds the native lock from location authority to stable file identity, and then gives the manager to Pi. Pi keeps fresh sessions in memory until the first user or assistant message and opens the target with `wx` when that conversation begins. Because A1 has already created the empty file, the first prompt fails with `EEXIST`; the observed failed file is zero bytes.

## Goals / Non-Goals

**Goals:**
- Preserve reserve-create-bind ordering and stable identity authority before session content is writable.
- Hand Pi a manager whose target is already a valid initialized session rather than an unexpected empty file.
- Cover initial startup and every fresh manager created by runtime replacement.

**Non-Goals:**
- Recover or delete zero-byte files left by failed development launches.
- Change existing-session conflict/fork behavior, native lock primitives, resident-tab UX, or Pi package code.
- Send a real provider request in the regression test.

## Decisions

### 1. Initialize the reserved file only after native identity binding

When the coordinator receives an unbound fresh manager, it will create the target as an empty owner-only file, bind the native lease to that exact file identity while retaining location authority through the transition, then write the manager's existing session header. It will ask the same manager to load that initialized file before runtime creation continues. Pi therefore sees a valid persisted session and appends instead of attempting a second exclusive create.

The original header is used so the session id, timestamp-derived filename, cwd, and optional parent-session metadata remain unchanged. Writing a replacement header or constructing a second manager was rejected because either can desynchronize identity from the generated path or lose replacement metadata.

### 2. Keep one coordinator path for startup and replacements

The repair remains in `SessionWriterCoordinator.prepare`, which is called by the runtime factory for initial startup and Pi-created managers used by `/new` and root forks. Existing selected/imported/resumed sessions remain bound by their existing-file path and are not rewritten. Acquire-before-release ordering remains in `activate`.

### 3. Regress the first persistence boundary directly

Focused runtime-integration tests will append a representative first user message through each fresh manager, rather than stopping after runtime construction. They will assert that no `EEXIST` is thrown, the file contains one valid session header and the submitted message, and the writer lease remains exclusive. The replacement test will repeat the assertion after `runtime.newSession()` and confirm the prior lease is released only after the new target is active.

A provider-backed prompt is unnecessary: `SessionManager.appendMessage` is the exact synchronous persistence boundary that produced the reported error and avoids network credentials or nondeterministic model execution.

## Risks / Trade-offs

- **[Fresh sessions become visible on disk before the first conversation]** → Milestone 3 already creates the placeholder to bind stable identity; this repair makes that required placeholder valid rather than zero-byte. Session listing remains able to parse it.
- **[Header identity changes during handoff]** → Persist the manager's existing header and assert the generated session id and path remain unchanged.
- **[Only startup is repaired]** → Exercise both initial runtime creation and `runtime.newSession()` through the shared coordinator path.

## Migration Plan

No data migration or automatic deletion is required. Failed zero-byte development artifacts contain no conversation content and may remain ignored by normal new-session generation. Rollback restores the broken empty-placeholder behavior and is therefore not a safe operational remedy; a corrective follow-up would retain the native lock contract.
