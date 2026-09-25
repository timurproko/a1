## 1. Specify mandatory trust resolution

- [x] 1.1 Specify two normal bare-A1 decisions, inert Escape, Ctrl+C startup interruption, exceptional fail-closed behavior, and pinned comparison compatibility.

## 2. Implement input and interruption semantics

- [x] 2.1 Ignore Escape in the bare-A1 trust selector and update its visible controls.
- [x] 2.2 Restore the terminal and propagate Ctrl+C as an expected startup interruption with conventional exit code 130.
- [x] 2.3 Keep unavailable/error paths fail-closed and route their warning through bare A1's prompt-adjacent notice dock.
- [x] 2.4 Preserve pinned `a1 pi` cancellation and warning placement.

## 3. Validate behavior

- [x] 3.1 Cover mandatory bare-A1 selection, interruption restoration/propagation, runtime warning classification, dock exclusion, and comparison behavior.
- [x] 3.2 Run focused tests, typechecking, startup-graph validation, architecture boundaries, and strict OpenSpec validation.
- [ ] 3.3 Manually confirm Escape leaves the selector stable without a terminal flash and Ctrl+C returns directly to the parent terminal.
