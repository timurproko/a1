## Context

See `proposal.md` for motivation. The bare-A1 Models dialog currently has three title phases for a successful background refresh: muted `(refreshing)`, success-colored `(refreshed)`, and no refresh suffix. The component enforces a one-second minimum for the progress phase and then keeps the completion phase for two more seconds. The requested interaction has only progress and completion: keep `(refreshing)` until the result can be presented, then remove it.

## Goals / Non-Goals

**Goals:**

- Preserve readable progress feedback for at least one second when refresh succeeds quickly.
- Transition successful refresh directly from `(refreshing)` to no refresh suffix.
- Preserve refreshed catalog data and every in-dialog user state across the transition.
- Keep failures and timeouts actionable after the same minimum progress interval.

**Non-Goals:**

- Changing catalog refresh timing, cancellation, timeout, or provider behavior.
- Changing the Models dialog's query, selection, filters, scope editing, saving, or row presentation.
- Removing warning details or changing the pinned comparison-profile model selectors.
- Changing the standalone CLI package-refresh success message.

## Decisions

### 1. Treat success as the end of title progress

A successful outcome will clear the title's progress state after the existing minimum-visible interval. It will not set a second completion state and will not render the backend's success sentence in the dialog body. If the real refresh takes longer than one second, success clears the marker immediately; if it finishes sooner, the existing outcome timer keeps `(refreshing)` visible until the one-second boundary.

Keeping `(refreshing)` for an additional fixed acknowledgement interval after success was rejected because it would imply that work remains active. Replacing the marker with `(refreshed)` was rejected because that is the state the user asked to remove.

### 2. Retain warning outcomes and state preservation

Warnings and timeouts will continue to wait for any remaining minimum progress duration, then clear `(refreshing)` and render their persistent details in the body. Catalog replacement will continue before outcome presentation, preserving query, surviving selection, pending scope and order edits, and `(unsaved)` independently of the title suffix.

Suppressing all outcomes was rejected because failures require actionable feedback. Moving success into the body was rejected because it restores the persistent success text that the existing title treatment intentionally removed.

### 3. Remove completion-only lifecycle state

The Models component will remove the success-only boolean, two-second dismissal timer, and success title rendering. The existing minimum-duration outcome timer remains the sole delayed transition. Disposal and restarted-refresh paths will continue cancelling that timer so a closed or superseded dialog cannot request a late render.

Focused fake-timer tests will assert the exact one-second boundary, direct disappearance beside both clean and `(unsaved)` titles, no success sentence or `(refreshed)` text, warning behavior, replacement, and disposal. Shell coverage will verify the same behavior through the real background refresh path.

## Risks / Trade-offs

- **[Fast success becomes imperceptible]** → Retain the existing one-second minimum for `(refreshing)`.
- **[Users cannot distinguish success from cancellation]** → The dialog stays open with its updated rows on success; close/disposal removes the whole surface, while failures retain explicit details.
- **[A late timer mutates a closed or restarted dialog]** → Keep timer identity checks and cancellation during disposal and refresh replacement.
- **[Dirty state disappears with progress]** → Continue deriving `(unsaved)` independently and cover successful refresh while scope edits are pending.

## Migration Plan

No data or configuration migration is required. Deploy the component and focused regressions together. Rollback restores the transient `(refreshed)` state and its dismissal timer without affecting model catalogs or settings.
