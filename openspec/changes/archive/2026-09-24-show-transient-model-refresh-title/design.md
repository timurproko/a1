## Context

See `proposal.md` for motivation. The owned Models dialog currently stores every refresh outcome as a body status. Its shell controller starts an abortable 15-second catalog refresh and already suppresses late outcomes after disposal, while the dialog receives a render callback and owns its presentation state. The title independently derives `(unsaved)` from scope state.

## Goals / Non-Goals

**Goals:**
- Make successful refresh acknowledgement compact, transient, and composable with dirty state.
- Preserve body space for progress and actionable warning details.
- Ensure timed presentation work cannot outlive the dialog.

**Non-Goals:**
- Changing refresh execution, timeout duration, catalog authorization, row reconciliation, scope persistence, or model selection.
- Changing CLI model-refresh output or the pinned `a1 pi` comparison profile.
- Auto-hiding timeout or failure details.

## Decisions

### 1. Let the dialog translate a successful refresh outcome into title state

Keep the existing refresh outcome boundary and interpret `success` inside the Models dialog. A successful outcome clears the body status and enables a success-colored `(refreshed)` title marker. Rendering composes title suffixes in stable order as `Models (unsaved) (refreshed)` when both states are active.

This keeps presentation policy with the component that owns the title and avoids teaching the shell controller about title text. Replacing `(unsaved)` or using a body toast was rejected because dirty state is independent and the requested success acknowledgement should not consume a body row.

### 2. Use a one-second component-owned dismissal timer

On each successful outcome, the dialog replaces any prior dismissal timer and starts a one-second timer. The callback verifies that it still owns the active timer, clears `(refreshed)`, and requests a render. A muted in-progress status or warning cancels any previous success marker before rendering its body message.

One second matches the existing bounded copy acknowledgement and keeps the marker observable without making completed work look permanent. Timer ownership remains in the dialog because the marker is dialog-local state; putting it in the shell would split lifecycle cleanup across layers.

### 3. Clear asynchronous presentation state on disposal

`dispose()` marks the component disposed, clears the active dismissal timer, and prevents any later timer callback from requesting a render. Timer handles are unreferenced where supported so the acknowledgement cannot keep the process alive.

Focused tests use controlled timers to verify the title before and after dismissal, composition with `(unsaved)`, retained warning details, timer replacement, and no render request after disposal. Existing refresh-state preservation assertions remain the behavioral guard for query, selection, scope, and dirty state.

## Risks / Trade-offs

- [A one-second marker may be missed during rapid interaction] → Keep the marker adjacent to the stable title and show it immediately on the same refresh completion render.
- [A stale timer could hide a newer marker] → Replace prior timers and require timer identity before clearing state.
- [Success and dirty suffixes could compete for narrow width] → Compose both before the existing width-aware title truncation; dirty state remains first because it is persistent and actionable.
- [Reducing all outcomes to a title word would hide diagnostics] → Apply the compact treatment only to success; progress and warnings remain in the body.

## Migration Plan

No data or configuration migration is required. Deploy the presentation change with its focused tests. Rollback restores the former body success status without affecting catalogs, settings, or persisted scope data.
