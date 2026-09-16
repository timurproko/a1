## 1. Graceful Quit Coordination

- [x] 1.1 Add focused owned-session-shell tests that reproduce `/quit`, the second `Ctrl+C`, and overlapping quit requests leaving presentation cleanup outstanding; verify the tests fail against the current lifecycle.
- [x] 1.2 Implement one idempotent shell-level shutdown sequence that completes backend quit, presentation disposal, terminal restoration, and stop settlement without a post-disposal render; verify the focused shell tests pass and existing configured exit output remains single-emission.

## 2. Quit Presentation

- [x] 2.1 Change the built-in quit autocomplete description to exactly `Quit` and update source-traced parity fixtures; verify component/autocomplete tests assert the concise label and no product qualifier.

## 3. Process and Terminal Regression

- [x] 3.1 Add a bounded child-process or PTY regression that drives `/quit` and double `Ctrl+C` through the supported launch boundary; verify each child exits successfully, terminal modes are restored, and a parent-shell continuation marker can run without an extra signal.
- [x] 3.2 Run the focused session-shell, autocomplete, launch/process, and terminal-restoration test scopes plus typechecking; record passing evidence or explicitly disposition every observed gap before finalization.

## 4. Live Acceptance Refinement

- [x] 4.1 Reproduce the live post-cleanup hang with an extension-style active server handle and strengthen the child-process regression so terminal restoration without actual process completion fails.
- [x] 4.2 Add executable-boundary completion only after owned cleanup and bounded output drain; verify both quit routes exit successfully with the retained handle, then rerun focused validation and record the refined evidence.
