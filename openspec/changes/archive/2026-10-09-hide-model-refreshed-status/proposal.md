## Why

The Models dialog currently changes `(refreshing)` to a green `(refreshed)` acknowledgement after catalog refresh succeeds. That extra completed state is unnecessary because the refreshed catalog is already visible; the progress marker should simply disappear once refresh completion may be shown.

## What Changes

- Keep the muted `(refreshing)` title marker visible while catalog refresh is active and for the existing one-second minimum when completion is fast.
- On successful completion, remove `(refreshing)` without showing a replacement `(refreshed)` marker or success sentence.
- Preserve query, selection, pending scope edits, dirty state, refreshed rows, and actionable failure/timeout messages.
- Update controlled-timer component and shell coverage so success transitions directly from `(refreshing)` to no refresh suffix.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Simplify successful Models catalog refresh feedback so the minimum-duration progress marker disappears directly instead of transitioning to `(refreshed)`.

## Impact

The change affects the bare-A1 Models dialog's success-state presentation and focused refresh-flow tests. It changes no catalog refresh operation, minimum progress duration, model/scope behavior, warning details, comparison-profile selector, CLI refresh output, dependency, or persisted setting.
