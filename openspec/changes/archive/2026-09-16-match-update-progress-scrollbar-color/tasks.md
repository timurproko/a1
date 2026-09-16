## 1. Progress Presentation

- [x] 1.1 Change the completed self-update progress segment to explicit RGB `#8abeb7` while preserving the existing track, percentage, geometry, and reset sequences; verify the renderer output remains structurally unchanged after stripping ANSI control codes.
- [x] 1.2 Update the table-driven progress-rendering assertions to cover the teal completed run at clamped, partial, and complete values; verify `test/foundation/release/update.test.ts` passes.

## 2. Validation

- [x] 2.1 Run the focused self-update test and project typecheck, and record both successful commands as task evidence. Evidence: `npx vitest run test/foundation/release/update.test.ts` passed 41 tests; `npm run typecheck` passed.
