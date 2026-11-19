## Context

See `proposal.md` for motivation. The owned Models dialog receives a muted refresh status as soon as it opens, then receives success or warning outcomes from the shell. Success is already represented as a transient title marker, while the initial in-progress status still renders as a full body sentence.

## Goals / Non-Goals

**Goals:**
- Keep routine catalog-refresh progress compact, readable, and adjacent to the Models title.
- Keep the marker tied to the real background refresh while preventing fast completion from producing an unreadable flash.
- Preserve the existing transient success acknowledgement and actionable warning body details.
- Compose refresh progress and success independently with persistent dirty scope state.

**Non-Goals:**
- Changing refresh timing, cancellation, timeout duration, catalog authority, or row reconciliation.
- Changing engine/CLI refresh status output or pinned comparison-profile presentation.
- Auto-hiding timeout and failure warnings.

## Decisions

### 1. Derive title refresh state from the existing status kind

Interpret a muted dialog refresh status as in-progress title state and render `(refreshing)` after `(unsaved)` when present. Do not render the muted progress message in the body. Keep warnings as body statuses because they contain actionable details, and keep success mapped to the existing `(refreshed)` title state.

This preserves the shell's existing status protocol while localizing presentation policy in the component that owns the title. Adding another shell callback or special progress string was rejected because the status kind already distinguishes progress from warnings and success.

### 2. Give real progress a one-second minimum-visible interval

The opening state renders `Models (refreshing)` or `Models (unsaved) (refreshing)` while the shell immediately starts its existing abortable catalog refresh in the background. The component records when that real progress begins. If the refresh settles in under one second, it queues the success or warning presentation for the remainder of that interval; it does not synthesize a refresh or delay starting the operation.

One second is long enough to read the in-progress state in a terminal. Delaying only presentation completion keeps the refresh functional and concurrent while avoiding decorative flashing. Updated rows may be reconciled when the operation completes, but the progress marker remains until the minimum interval ends.

### 3. Preserve the established outcome lifecycle

After both the real refresh outcome and minimum-visible interval are satisfied, success replaces `(refreshing)` with the success-colored `(refreshed)` marker for two seconds before its dismissal timer clears it. The longer acknowledgement remains bounded while giving the user enough time to read the completed state. Warning or timeout clears title refresh state and renders its detailed message in the body. A restarted progress state supersedes a queued outcome. Disposal cancels queued outcome and success-dismissal timers so a closed dialog cannot request a late render.

Focused tests will verify the initial state, a pending real refresh, minimum-visible quick completion, dirty-state composition, progress-to-success and progress-to-warning transitions, the two-second success dismissal, replacement, and safe disposal.

## Risks / Trade-offs

- [Users may overlook refresh activity in a busy title] → Keep the marker adjacent to the stable title, preserve the existing muted progress color, and enforce a one-second minimum-visible interval.
- [Dirty and refresh suffixes may compete at narrow widths] → Retain stable ordering as `Models (unsaved) (refreshing)` and use the existing title truncation behavior.
- [Treating every muted status as refresh progress could hide future detail] → Keep the dialog's refresh-status API scoped to catalog refresh outcomes and cover the mapping explicitly.
- [A quick failure is held briefly by the minimum interval] → Bound the delay to one second, then retain the actionable warning until the user closes the dialog.
- [Removing the body sentence could hide failure context] → Move only in-progress state; warnings and timeout details remain unchanged in the body.

## Migration Plan

No data or configuration migration is required. Deploy the presentation refinement with focused tests. Rollback restores the muted progress sentence in the body without affecting refresh execution or persisted model settings.
