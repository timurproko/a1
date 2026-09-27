## Why

Bare A1 can fall back to the plain `Compacting…` label even though the bound Pi session still exposes an observable summary stream. The runtime disposes its compaction observer when event delivery is suspended, but resuming the same session restores only the event subscription, so later compactions lose the percentage for the remainder of that session. A related command-result defect marks failed manual compaction as silent, so a too-small session appears to ignore `/compact` instead of showing Pi's `Nothing to compact (session too small)` error.

## What Changes

- Restore compaction-stream observation whenever a suspended current session resumes.
- Preserve one observer wrapper per bound session and restore the original stream function during suspension, replacement, and disposal.
- Add focused lifecycle coverage proving compaction progress still starts at 0%, advances, and clears after a suspend/resume cycle.
- Preserve visible Pi-compatible feedback when manual compaction fails before summary streaming starts.
- Keep successful manual-compaction completion, the unobservable-session fallback, and the `a1 pi` comparison presentation unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: observable compaction progress remains available after the engine temporarily suspends and resumes delivery for the same session, and failed manual compaction remains visibly actionable.

## Impact

The change affects compaction-observer lifecycle wiring in `src/integrations/pi/engine/session-runtime.ts`, manual-compaction workflow results in `src/integrations/pi/engine/workflow-runner.ts`, and focused engine/shell tests. It does not change compaction generation, progress estimation, event-overload recovery policy, successful completion presentation, or pinned comparison rendering.
