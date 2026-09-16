## Why

In bare A1, the first `Ctrl+V` can silently do nothing even when the clipboard already contains pasteable content; using right-click paste appears to prime the path so later `Ctrl+V` works. The ordinary prompt must handle the first paste shortcut reliably without requiring a mouse action, retry key, focus change, or other warm-up gesture.

## What Changes

- Make the first supported `Ctrl+V` received by the ordinary bare-A1 prompt admit exactly one paste transaction and preserve the shortcut through cold keybinding, input-routing, helper-startup, and clipboard-acquisition states.
- Remove any dependency on right-click paste or a prior successful paste to initialize the keyboard route; keep keyboard and right-click entry points behaviorally equivalent after admission.
- Recover within the existing bounded paste lifetime from safe transient cold-start or clipboard-read failures when the clipboard remains readable, without duplicating content or extending deadlines.
- Add payload-free evidence that distinguishes shortcut receipt/routing from acquisition and insertion, and regression coverage for cold first-use, repeated launches, clipboard contention, terminal-provided bracketed paste, and modal ownership.
- Preserve existing paste reservations, text/path/image preparation, limits, ordering, undo/redo, comparison-profile behavior, and explicit failure handling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Strengthen ordinary-prompt paste behavior so a supported first `Ctrl+V` succeeds from a cold session without right-click priming and remains exactly-once and bounded.

## Impact

The likely implementation surface is the custom viewport pre-input route, owned editor paste admission, keybinding activation/matching, isolated paste executor startup, and system clipboard acquisition/fallback policy, with focused tests in the existing viewport, shell, editor, clipboard, and packaged-helper suites. No public API, stored-data migration, dependency patch, or change to `a1 pi` is intended. The observed failing phase is not yet proven, so implementation must use the existing payload-free diagnostics and controlled cold-start seams before attributing the cause.
