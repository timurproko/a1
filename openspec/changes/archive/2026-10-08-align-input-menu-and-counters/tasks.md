## 1. Input alignment

- [x] 1.1 Add an opt-in after-row indent to the shared prompt composition boundary and select a one-cell indent for bare-A1 default-editor autocomplete; verify component tests keep prompt text at the two-cell prefix while menu selection markers begin at cell one and rows retain full terminal width.
- [x] 1.2 Move the autocomplete and persistent-history counter labels from the four-cell to the three-cell inset, including fit and history-overflow collision arithmetic; verify focused tests cover ordinary, narrow, and multiline-overflow borders without overlap or truncation errors.

## 2. Presentation regressions

- [x] 2.1 Update autocomplete placement coverage for persistent history enabled and disabled; verify slash, argument, path/resource, and extension rows keep pinned content width, styling, navigation, pagination, and stable prompt coordinates with the declared one-cell outer gutter.
- [x] 2.2 Add shell and terminal-cell assertions for spinner/menu alignment, dim counter alignment, selected-row background bounds, menu close/refresh cleanup, and comparison-profile isolation; verify no stale cells, ANSI leakage, or changed `a1 pi` presentation.

## 3. Validation and handoff

- [x] 3.1 Run typechecking and the focused prompt-input, autocomplete-placement, history-editor, and session-shell suites; record implementation-specific evidence and explicitly disposition any known gap before finalization.
- [x] 3.2 Build the candidate and prepare physical-terminal review through `./scripts/dev`: compare the working spinner with an open `/` menu, navigate an overflowing menu, and recall the newest and oldest history entries to confirm every requested element is one cell left and vertically stable.
