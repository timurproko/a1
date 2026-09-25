## 1. Specify mandatory trust resolution

- [x] 1.1 Specify two bare-A1 trust decisions, Escape exit, Ctrl+C interruption compatibility, exceptional fail-closed behavior, and pinned comparison compatibility.

## 2. Implement input and interruption semantics

- [x] 2.1 Make Escape the visible bare-A1 exit action and update the selector controls.
- [x] 2.2 Reset terminal input/presentation modes, restore the parent-screen cursor, finish the restored command row, and propagate Escape or Ctrl+C through the bounded process terminator with conventional exit code 130.
- [x] 2.3 Keep unavailable/error paths fail-closed and route their warning through bare A1's prompt-adjacent notice dock.
- [x] 2.4 Preserve pinned `a1 pi` cancellation and warning placement.

## 3. Validate behavior

- [x] 3.1 Cover mandatory bare-A1 selection, interruption restoration/propagation, runtime warning classification, dock exclusion, and comparison behavior.
- [x] 3.2 Run focused tests, typechecking, startup-graph validation, architecture boundaries, and strict OpenSpec validation.
- [ ] 3.3 Manually confirm Escape returns directly to the parent terminal without starting the shell or flashing an intermediate restricted session.
