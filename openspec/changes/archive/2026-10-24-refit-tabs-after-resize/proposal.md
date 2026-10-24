## Why

A resident tab can now be fitted before it becomes visible, eliminating switch-time reflow. The active resize curtain also prevents intermediate repaints, but its single-line status does not yet follow the application's established centered empty-state presentation.

## What Changes

- Pre-fit globally hidden, unclaimed resident holders whenever an authoritative controller reports new terminal geometry.
- Carry current geometry with each view request and queue any required target resize before enabling its fresh surface publication.
- Replace the complete active UI with a centered two-line `🖥️` and `Resize <columns> x <rows>` curtain while changed-size outer resize events continue, without flashing it for the unchanged startup size notification.
- Keep the resize curtain for a 220 ms quiet interval after the event burst, bridging brief pauses in continued resizing before revealing the settled UI dimmed and returning it to normal intensity.
- Present the curtain like other centered application states, with `🖥️` above `Resize 81 x 46`, and standardize the lowered Settings empty-result state as `👀` directly above `No settings found` without trailing punctuation.
- Preserve per-tab controller authority by excluding tabs currently viewed or controlled by another client.
- Add focused native regression coverage for background resize, activation ordering, resize-curtain presentation, and resized reattachment flows.

## Capabilities

### Modified Capabilities

- `resident-terminal-host`: authoritative outer resize pre-fits eligible hidden children, stages activation geometry before replacement surfaces publish, and transitions from a centered two-line resize curtain through a brief dimmed reveal instead of flashing the active TUI.
- `owned-ui-settings`: the filtered empty state uses the punctuation-free application message `No settings found`.

## Impact

Native terminal-host attach, wire, presentation, and routing behavior (`native/terminal-host`), the owned Settings empty-state copy, and focused native and TypeScript tests. No persistence or user-facing command changes.
