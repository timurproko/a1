## 1. Specify mandatory trust resolution

- [x] 1.1 Specify pinned Pi's five trust outcomes, Escape exit, Ctrl+C interruption compatibility, exceptional fail-closed behavior, and pinned comparison compatibility.

## 2. Implement input and interruption semantics

- [x] 2.1 Make Escape the visible bare-A1 exit action and update the selector controls.
- [x] 2.2 Add pinned Pi's current-folder, parent-folder, and session-only trust outcomes and persistence semantics.
- [x] 2.3 Reset terminal input/presentation modes, restore the parent-screen cursor, clear only the stale restored launch row without replay, and propagate Escape as a successful bounded exit while retaining status 130 for Ctrl+C.
- [x] 2.4 Keep unavailable/error paths fail-closed and route their warning through bare A1's prompt-adjacent notice dock.
- [x] 2.5 Preserve pinned `a1 pi` presentation, cancellation, and warning placement.

## 3. Validate behavior

- [x] 3.1 Cover all five trust outcomes, parent/session persistence, mandatory bare-A1 selection, interruption restoration/propagation, runtime warning classification, dock exclusion, and comparison behavior.
- [x] 3.2 Run focused tests, typechecking, startup-graph validation, architecture boundaries, and strict OpenSpec validation.
- [ ] 3.3 Manually confirm Escape clears the stale launch row and returns directly to a clean parent-shell prompt without corrupting earlier rows, starting the shell, or flashing an intermediate restricted session.
