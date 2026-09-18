## 1. Grouping

- [x] 1.1 In `session-shell-root.ts`, replace the flat `OwnedUiSessionShellOptions` with `engine`, `presentation`, `history`, `suggestions`, and `diagnostics` groups (`OwnedUiShellEngineOptions`, `OwnedUiShellPresentationOptions`, `OwnedUiShellHistoryOptions`, `OwnedUiShellSuggestionOptions`, `OwnedUiShellDiagnosticOptions`), exported through `session-shell.ts`.
- [x] 1.2 In `session-shell.ts`, destructure the groups at the top of the constructor into the former field names and leave the body unchanged.
- [x] 1.3 In `composition/owned-ui.ts`, build the five groups from the existing composition decisions.

## 2. Proof

- [x] 2.1 Update `session-shell-fixture.ts` (typed from the group interfaces), the composition tests that observe the options, and the other shell constructions in tests and workers to the grouped shape.
- [x] 2.2 Re-pin `config/startup-graph-baseline.json`; run `npm run typecheck`, `check:architecture`, `check:code-documentation`, the changed-documentation check, and the session-shell, composition, TUI runtime, and owned-UI feature suites; record outcomes: all checks OK, 1,087 passed.
