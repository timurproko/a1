## 1. Add the prompted naming flow

- [ ] 1.1 Add focused session-shell coverage proving bare `/name` opens the compact `Session Name` input with the shared Enter-submit and Escape-cancel hints while `/name <name>` bypasses the input and `a1 pi` keeps its pinned behavior.
- [ ] 1.2 Route argument-free bare-A1 `/name` through the existing single-line input bridge, pass non-empty submissions back through the direct naming workflow, and verify the shell restores its ordinary prompt after every settlement path.
- [ ] 1.3 Add interaction coverage for typed submission, normalized-name reporting, Escape cancellation, whitespace-only dismissal, existing-name preservation, and absence of warning or completion messages on dismissal.

## 2. Validate the delivered behavior

- [ ] 2.1 Run the focused session-shell, extension-input, and workflow-runner tests plus source typechecking and strict OpenSpec validation; verify direct naming, dialog rendering, lifecycle cleanup, and comparison-profile behavior remain covered.
- [ ] 2.2 Build the interactive candidate and record manual review of `/name <name>`, argument-free `/name`, Enter submission, Escape cancellation, and compact title/input/shortcut presentation in `implementation-evidence.md`, including any explicit known gap.
