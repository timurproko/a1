## Why

A resident tab can now be fitted before it becomes visible, eliminating switch-time reflow. The active tab still repaints repeatedly while the user drags the terminal boundary, however, so its TUI can visibly flash and jump through intermediate geometries.

## What Changes

- Pre-fit globally hidden, unclaimed resident holders whenever an authoritative controller reports new terminal geometry.
- Carry current geometry with each view request and queue any required target resize before enabling its fresh surface publication.
- Replace the complete active UI with a centered `Resize <columns> × <rows>` curtain while outer resize events continue.
- Restore the complete UI in one synchronized repaint only after resize events settle and a current-geometry surface is available, with a bounded recovery fallback.
- Preserve per-tab controller authority by excluding tabs currently viewed or controlled by another client.
- Add focused native regression coverage for background resize, activation ordering, resize-curtain presentation, and resized reattachment flows.

## Capabilities

### Modified Capabilities

- `resident-terminal-host`: authoritative outer resize pre-fits eligible hidden children, stages activation geometry before replacement surfaces publish, and presents a stable resize curtain instead of intermediate active-TUI reflows.

## Impact

Native terminal-host attach, wire, presentation, and routing behavior (`native/terminal-host`) plus focused native tests. No settings, persistence, or user-facing command changes.
