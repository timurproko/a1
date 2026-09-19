## 1. Keep the suggestion across draft edits

- [ ] 1.1 `prompt-suggestion-controller.ts`: add `abortPending()`, which retires a `generating` request as `cancelled` and leaves `prepared` and `available` state untouched; `invalidate()` keeps its full-reset meaning.
- [ ] 1.2 `session-shell.ts`: call `abortPending()` from `onEditorChange` and `clearOrExit`; every other `invalidate()` site is unchanged.
- [ ] 1.3 `owned-editor.ts`: `setText` no longer nulls the suggestion for nonempty text; presentation, Tab acceptance, and the Enter no-op keep their empty-editor gate.

## 2. Proof

- [ ] 2.1 `prompt-suggestion-controller.test.ts`: `abortPending()` cancels a generating request with one `cancelled` record and discards its late result; it leaves an available suggestion presented without calling `surface.clear()`, and leaves a prepared result to settle.
- [ ] 2.2 `session-shell-suggestions.test.ts`: after a shown suggestion, typing hides it and Tab/Enter act on the draft; deleting the character, and separately the first `Ctrl+C`, repaint `❯ run the tests`; a submit after that clears it; the existing typing-cancels-pending case still passes.
- [ ] 2.3 `shell-components.test.ts`: `setText("draft")` then `setText("")` renders the suggestion again; Tab acceptance still installs the text once.
- [ ] 2.4 Run `npm run typecheck`, `check:architecture`, `check:code-documentation`, the changed-documentation check, the three suites above, and `npx vitest run test/repository-governance test/contracts`; record outcomes.
