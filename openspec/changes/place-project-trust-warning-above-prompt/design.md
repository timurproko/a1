## Context

A cancelled, unavailable, or failed startup trust decision produces a warning on the runtime's generic diagnostic list. The engine adapter currently assigns every runtime diagnostic the `engine-startup` code, and the shell renders that code above the startup banner. Bare A1 already owns a severity-aware transient notice dock immediately above the editor for simple informational, warning, and error messages.

## Goals / Non-Goals

**Goals:**
- Show a trust-preflight warning where the user will next type.
- Keep the warning out of transcript content and its selection, copy, navigation, and persistence surfaces.
- Preserve fail-closed startup and the warning's existing wording and severity.
- Preserve pinned `a1 pi` startup placement.

**Non-Goals:**
- Exiting A1 when trust selection is cancelled.
- Changing trust persistence, defaults, ancestor inheritance, or resource loading.
- Moving ordinary model-scope or service startup diagnostics.
- Changing the shared notice dock lifecycle.

## Decisions

### 1. Give trust-preflight warnings a dedicated diagnostic code

The runtime integration will tag only a non-null trust-preflight diagnostic as `project-trust`. The engine runtime will preserve that known code while continuing to classify every other runtime/service diagnostic as `engine-startup`.

This avoids message-text matching and keeps model-scope and service warnings on their pinned startup path.

### 2. Translate the warning at the shell presentation boundary

Bare A1 will exclude `project-trust` from the transcript document and translate it once into the existing warning notice dock after the TUI runtime is active. The warning will therefore inherit prompt-adjacent placement, warning color, wrapping, replacement, and dismissal behavior without creating another presentation component.

The pinned layout will continue rendering `project-trust` through the startup-diagnostic presenter above the banner.

### 3. Continue in restricted mode

Cancellation still means no saved decision and an untrusted project for the current launch. A1 continues because trust authorizes project-local resources, not the installed application itself; this matches Pi's restricted-session behavior.

## Risks / Trade-offs

- **[The changelog notice and trust warning arrive together]** → Present the trust warning after the changelog notice so the security-relevant explanation is the visible notice.
- **[A diagnostic could be duplicated]** → Exclude `project-trust` from bare A1's document diagnostics and guard dock translation once per shell.
- **[Comparison behavior could drift]** → Cover both custom-viewport dock placement and pinned startup placement.

## Migration Plan

No migration is required. Existing trust records and sessions are unchanged. Rolling back restores top-of-viewport warning placement without changing trust decisions.
