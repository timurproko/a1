## Why

The live working indicator now scrolls, but while short output still fits it follows the growing transcript instead of remaining directly above the input, producing the visible jump shown in the reported terminal capture. Pending `Steering:` rows also remain pinned during detached reading, unlike the earlier v2 viewport behavior the user wants restored.

## What Changes

- Keep the live working, retrying, compacting, and extension-working surface directly above the pinned input group while transcript content fits, without moving already visible transcript rows when that surface appears or animates.
- Once content overflows, let the same working surface occupy the transient scrollable tail so it remains visible while following and scrolls out only when the user scrolls toward older content.
- Move pending `Steering:` rows and their edit hint out of the dock and into non-persistent, non-selectable scrollable viewport content, preserving their current wording, order, lifecycle, and input actions.
- Keep the editor or replacement input, extension widgets, and footer pinned; preserve detached position, follow-tail navigation, scrollbar and jump-control geometry, pointer suppression, copy boundaries, and status cleanup.
- Reconcile the active `stabilize-streaming-rendering` planning artifacts before implementation so their queue ownership and fit-boundary rules no longer contradict this accepted placement model.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Restore v2-visible transient placement: bottom-align live working status above the input while content fits, let it scroll after overflow, and make pending steering rows scrollable rather than docked.

## Impact

- Expected implementation areas: `src/integrations/pi/session-ui/session-shell-root.ts`, `src/integrations/pi/session-ui/session-viewport-controller.ts`, `src/ui/components/transcript-viewport.ts`, status/queued-input composition, and focused shell, viewport, pointer, and rendering-evidence tests.
- The `stabilize-streaming-rendering` OpenSpec change must be updated in a separate OpenSpec-only reconciliation before implementation consumes its contradictory transient-ownership clauses.
- No backend queue semantics, persistence format, editor command, extension API, dependency, or pinned `a1 pi` comparison behavior changes are intended.
- This proposal restores the user-visible v2 behavior through the owned shell rather than restoring v2's private Pi child-tree inspection.
