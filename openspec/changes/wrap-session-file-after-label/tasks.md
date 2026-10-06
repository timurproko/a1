## 1. Session file row behavior

- [x] 1.1 Add focused formatter coverage for fitting and overflowing Windows session paths; verify the overflow case starts after `File:`, reconstructs the complete path across adjacent rows, remains within the requested visible width, and keeps ID next.
- [x] 1.2 Pre-wrap the bare-A1 session File identity value against the effective inset content width with Pi TUI display-width utilities; verify the focused component suite passes without changing the pinned in-feed presenter output.

## 2. Validation and handoff

- [x] 2.1 Run focused session presenter tests, source typechecking, strict OpenSpec validation, changed documentation checks, and applicable architecture/customization checks; record concrete results and disposition any gaps in this change.
- [x] 2.2 Build the interactive candidate and provide a `./scripts/dev` manual check that a long Session Info file path begins after `File:`, wraps completely onto following rows, and leaves ID and later sections in order.
