## Why

A resident tab keeps the pseudoterminal geometry from the last time that tab was viewed. If the outer terminal is resized while another tab is active, switching back can leave the restored content constrained to the old width and height instead of fitting the current terminal.

## What Changes

- Reapply the attach client's current terminal geometry whenever an existing resident tab becomes the requested view, including initial attachment to an already-running tab.
- Preserve per-tab controller authority by targeting the newly viewed tab rather than resizing every hidden tab globally.
- Keep the previous coherent frame visible only until the target holder publishes a complete frame for the current geometry.
- Add focused native regression coverage for resize-then-switch and resized reattachment flows.

## Capabilities

### Modified Capabilities

- `resident-terminal-host`: tab activation converges the selected child to the current controller geometry before its replacement surface commits.

## Impact

Native terminal-host attach and routing behavior (`native/terminal-host`) plus focused native tests. No settings, persistence, or user-facing command changes.
