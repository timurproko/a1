## 1. Correct wheel-axis decoding

- [x] 1.1 Restrict the shared SGR decoder to vertical wheel codes 64 and 65 while consuming codes 66 and 67 without emitting pane events; verify decoder tests cover all four codes and preserve coordinates.
- [x] 1.2 Preserve mixed input behavior when horizontal wheel reports share a chunk with vertical reports or keyboard text; verify parser and router tests retain vertical event order and keyboard bytes without leaking horizontal reports.

## 2. Verify transcript behavior

- [x] 2.1 Add session viewport routing coverage for downward and upward vertical reports interleaved with horizontal touchpad-style reports; verify only vertical reports change scroll position, follow state, and control activity.
- [x] 2.2 Run the focused mouse component and session viewport test files plus typechecking; verify the corrected input behavior passes without changing scrollbar speed or pinned comparison behavior.

## 3. Physical touchpad validation

- [ ] 3.1 Build and launch the exact candidate in bare A1 and exercise sustained upward and downward touchpad gestures, including slight diagonal movement; verify the transcript never reverses because of horizontal wheel noise and record terminal/device observations in `design.md`.
