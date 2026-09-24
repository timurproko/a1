## Context

See `proposal.md` for motivation. The owned Models dialog receives a muted refresh status as soon as it opens, then receives success or warning outcomes from the shell. Success is already represented as a transient title marker, while the initial in-progress status still renders as a full body sentence.

## Goals / Non-Goals

**Goals:**
- Keep routine catalog-refresh progress compact and adjacent to the Models title.
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

### 2. Preserve the established transition lifecycle

The opening state renders `Models (refreshing)` or `Models (unsaved) (refreshing)`. Success replaces it with the existing success-colored `(refreshed)` marker and dismissal timer. Warning or timeout clears title refresh state and renders its detailed message in the body. Disposal continues to cancel any active success-dismissal timer and suppress late updates.

No timer is needed for `(refreshing)`: its lifetime is controlled by the refresh outcome and the dialog lifecycle. Focused tests will verify the initial state, dirty-state composition, progress-to-success and progress-to-warning transitions, bounded success dismissal, and safe disposal.

## Risks / Trade-offs

- [Users may overlook refresh activity in a busy title] → Keep the marker adjacent to the stable title and preserve the existing muted progress color.
- [Dirty and refresh suffixes may compete at narrow widths] → Retain stable ordering as `Models (unsaved) (refreshing)` and use the existing title truncation behavior.
- [Treating every muted status as refresh progress could hide future detail] → Keep the dialog's refresh-status API scoped to catalog refresh outcomes and cover the mapping explicitly.
- [Removing the body sentence could hide failure context] → Move only in-progress state; warnings and timeout details remain unchanged in the body.

## Migration Plan

No data or configuration migration is required. Deploy the presentation refinement with focused tests. Rollback restores the muted progress sentence in the body without affecting refresh execution or persisted model settings.
