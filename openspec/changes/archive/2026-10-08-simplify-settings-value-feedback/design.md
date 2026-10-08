# Design

## Context

`SettingsApp` already separates the selected/stored scalar (`#shownValue`) from an entry's effective value. Its row renderer adds effective/application text when those values differ, while successful deferred writes and undo restorations also place application notices in `#notice`; `#footerLines` then uses that notice instead of the declared shortcut guidance. Failed operations use the same notice channel and must remain visible.

Structured-setting dialogs are rendered as a fixed footer panel beneath the Settings list. Pointer routing currently returns early whenever such a dialog is open, so wheel reports never reach the existing list-scroll path even when the pointer is over the list content.

## Goals / Non-Goals

**Goals:**

- Make the selected/stored scalar the only text rendered in a Settings value cell.
- Reserve the transient notice channel for failures and interrupt warnings, not successful setting operations.
- Route wheel input over Settings content to the existing scrolling policy while a structured dialog remains open and unchanged.
- Retain optimistic updates, backend ownership, application timing, undo, error rollback, and declared keyboard actions.

**Non-Goals:**

- Change stored/effective state in the settings model or alter when deferred values take effect.
- Remove effective-state checkmarks from scalar choice menus.
- Add pointer editing to structured dialogs or allow clicks through to Settings rows.
- Scroll the list when the pointer is over the structured dialog itself.

## Decisions

### 1. Render scalar rows from the selected/stored value only

`#viewRow` will format every non-structured scalar through the existing `displayValue` path, regardless of whether it comes from the pending map or the refreshed entry. The effective value remains in the model for application semantics and menu checkmarks but no longer expands the row text.

Conditionally hiding the suffix only after a user change was rejected because reopening Settings could reproduce the same unwanted text. Changing `effectiveValue` itself was rejected because it would conflate persistence with runtime effect.

### 2. Keep successful operations out of the notice channel

Successful scalar writes, structured writes, and undo restorations will clear any stale notice and otherwise leave `#notice` empty. The existing footer logic will therefore continue to render declaration-derived shortcut guidance. Failed writes/restorations keep their current messages and rollback behavior.

A timed success message was rejected because it still replaces the shortcuts and creates the visual churn the change removes. Removing notices wholesale was rejected because failures need actionable feedback.

### 3. Admit content-wheel input before the structured-dialog pointer barrier

The existing wheel branch will run before the structured-dialog early return and retain its body-bound check and configured `scrollbarSpeed`. Thus wheel input over list content adjusts `#scroll`, while wheel input over the footer dialog and all non-wheel pointer reports remain consumed by the dialog barrier. The dialog state is untouched.

Allowing all pointer events through was rejected because clicks could mutate rows behind the dialog. Treating wheel input over the dialog as background scrolling was rejected because the pointer would no longer describe the surface being acted on.

### 4. Verify behavior at the Settings app boundary

Focused tests will cover an initially mismatched deferred entry, pending and completed changes, successful undo, retained failure notices, and wheel scrolling with a structured dialog open. App-level tests are preferred because the unwanted strings and blocked wheel input are introduced by Settings orchestration rather than the shared row or scrollbar components.

## Risks / Trade-offs

- **[Users cannot see the currently effective deferred value in the row]** → The selected value is intentionally authoritative for this screen; application timing and backend semantics remain unchanged.
- **[A successful callback leaves an older failure notice visible]** → Successful completion clears stale operation notices before the footer returns to shortcut guidance.
- **[Wheel input accidentally edits or closes the dialog]** → Route only through the existing scroll calculation and leave structured state untouched.
- **[Wheel input over the footer acts at a distance]** → Preserve the existing content boundary so only wheel reports over the list scroll it.

## Migration Plan

No data migration is required. The change is a presentation and input-routing adjustment. Rollback restores the prior row decoration, success notices, and structured-dialog wheel barrier without changing persisted values.
