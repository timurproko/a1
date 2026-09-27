## 1. Specify mandatory trust resolution

- [x] 1.1 Specify pinned Pi's five trust outcomes, Escape-only bare exit, exceptional fail-closed behavior, and pinned comparison compatibility.

## 2. Implement input and interruption semantics

- [x] 2.1 Make Escape the visible bare-A1 exit action and update the selector controls.
- [x] 2.2 Add pinned Pi's current-folder, parent-folder, and session-only trust outcomes and persistence semantics.
- [x] 2.3 Reset terminal input/presentation modes while preserving parent-screen cursor and rows, propagate Escape as a successful bounded exit, and keep Ctrl+C from dismissing the bare selector.
- [x] 2.4 Keep unavailable/error paths fail-closed and route their warning through bare A1's prompt-adjacent notice dock.
- [x] 2.5 Preserve pinned `a1 pi` presentation, cancellation, and warning placement.

## 3. Validate behavior

- [x] 3.1 Cover all five trust outcomes, parent/session persistence, mandatory bare-A1 selection, interruption restoration/propagation, runtime warning classification, dock exclusion, and comparison behavior.
- [x] 3.2 Run focused tests, typechecking, startup-graph validation, architecture boundaries, and strict OpenSpec validation.
- [ ] 3.3 Manually confirm Escape preserves every prior parent row and returns directly to a new empty shell prompt without starting the shell or flashing an intermediate restricted session.
