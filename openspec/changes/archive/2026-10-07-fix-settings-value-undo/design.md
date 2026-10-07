## Context

The owned Settings app keeps an optimistic scalar value in `#pending` so a row responds immediately and subsequent steps start from the value the user just chose. The row renderer currently passes that optimistic value to `effectiveDisplay(entry, shown)`, but `entry.effectiveValue` still belongs to the pre-write snapshot until the asynchronous change completes. A live change can therefore paint text such as `fast (effective normal; live)` for an intermediate frame and then collapse to `fast`. This is presentation drift, not a real deferred-application state.

Settings changes already pass through `OwnedSettingsManager.change` or `changeStructured`, which own backend routing, persistence, effect application, refresh, and failure outcomes. Undo must use those same paths rather than mutating the manager, settings files, or engine state directly. The Settings shortcut registry already supplies dispatch, shortcut listings, and footer hints for the list and structured-dialog scopes.

## Goals / Non-Goals

**Goals:**

- Render an unresolved optimistic scalar as only the requested value until the source reports an authoritative stored/effective state.
- Let `Ctrl+Z` restore the value preceding the latest successful scalar or structured edit.
- Support repeated undo in reverse edit order for the lifetime of one Settings screen.
- Route restoration through the original entry's backend and preserve ordinary live/deferred/failure behavior.
- Keep dispatch, listings, and footer guidance derived from active shortcut declarations.

**Non-Goals:**

- Add redo, persistent/cross-session history, or undo outside the owned Settings surface.
- Change settings document formats, manager APIs, application boundaries, choices, or engine ownership.
- Hide legitimate stored-versus-effective text after a deferred save has completed.
- Change editor `Ctrl+Z`, the pinned comparison profile, or search text-editing behavior other than giving the Settings-level undo action precedence while the Settings surface is open.

## Decisions

### 1. Distinguish optimistic presentation from authoritative effective-state presentation

The Settings app will detect when a scalar row is reading from its own pending map. While pending, the value cell will render the requested scalar directly with the existing boolean/string/number formatting. It will not compare that value with the stale entry snapshot or append an effective/application suffix.

After the operation settles, the existing source refresh remains authoritative. A successful live save renders the refreshed value; a successful deferred save may render its legitimate stored/effective distinction and boundary; a failed save removes the optimistic value, restores the source value, and retains the existing failure notice. Delaying all display until persistence completes was rejected because it would make controls lag and would break repeated stepping from the latest visible value.

### 2. Keep a screen-local LIFO history of successful edits

`SettingsApp` will own transient undo records containing the entry identity/backend and an exact copy of the value that preceded the edit. Scalar records store the prior scalar; structured records store the prior whole normalized object. A record becomes undoable only when its forward change succeeds, so rejected writes never create history. Records retain their user-action sequence so asynchronous completion cannot reverse undo order.

Each `Ctrl+Z` pops the newest successful record and restores its prior value through `change` or `changeStructured`. Restoration does not create a redo/undo record. If restoration fails or is unavailable, the visible optimistic restoration is rolled back, the ordinary save failure is shown, and the record remains available for retry. Closing the Settings screen discards its history.

A single original-value slot was rejected because two accidental edits could not be unwound naturally. Persisting history was rejected because stale entries and changed availability/application contracts make cross-session restoration unsafe and exceed the request.

### 3. Make undo available throughout the Settings surface

Declare `ctrl+z` in the main Settings scope and the structured-dialog scope, with `Ctrl+Z to undo` hint metadata. Decode terminal `SUB` (`\u001a`) through the existing key map. The list uses normal registry dispatch; the value menu and search state delegate this chord to the same Settings undo action; the structured dialog resolves its local declaration. An open value menu closes before restoration so its captured entry snapshot cannot remain interactive after the value changes. Search may stay open and immediately reflects the restored value. A structured dialog updates its working whole-object record when its current setting is restored.

Hardcoding the chord only in modal handlers was rejected because it would let dispatch, `/hotkeys`, and footer guidance diverge. Reusing the editor undo action was rejected because Settings history consists of persisted setting transactions, not text snapshots.

### 4. Cover intermediate frames and restoration outcomes at the app boundary

Focused Settings tests will hold a manager change unresolved and inspect the intermediate value cell, proving it contains only the optimistic value and no stale effective suffix. Other tests will complete scalar and structured edits, issue `Ctrl+Z`, and verify reverse-order restoration reaches the correct A1 or agent backend. Failure fixtures will verify failed forward writes add no history and failed restoration keeps the current authoritative value plus a retryable undo record. Hint assertions will cover both the ordinary footer and structured dialog.

App-boundary tests are preferred over renderer-only tests because the defect and undo state are both introduced by Settings orchestration. Manager-format or migration tests are unnecessary because no persistence schema changes.

## Risks / Trade-offs

- **[A deferred setting loses useful application information]** → Suppress decoration only while the app's optimistic value is unresolved; use the refreshed authoritative entry after completion.
- **[Asynchronous saves reorder history]** → Assign edit sequence at admission and order successful records by that sequence rather than callback timing.
- **[Undo bypasses effects or writes the wrong store]** → Retain backend/id in each record and invoke the same manager change method used by the original edit.
- **[A failed restoration loses the only recovery step]** → Reinsert the record and restore the authoritative forward value while reporting the failure.
- **[A stale value menu applies against restored state]** → Close the menu before undo; keep search open because it derives rows afresh.

## Migration Plan

No data migration is required. Implement the pending-value presentation distinction, add declared undo dispatch and transient history, then add focused Settings tests and validate the changed scopes. Rollback removes only transient app behavior; values already restored through normal settings APIs remain valid stored settings.
